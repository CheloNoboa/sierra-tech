/**
 * =============================================================================
 * 📡 API Route: Admin Home
 * Path: src/app/api/admin/home/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para consultar y actualizar la configuración
 *   estructurada de la página de inicio pública.
 *
 *   Métodos:
 *   - GET: devuelve la configuración Home actual
 *   - PUT: actualiza o crea la configuración Home global
 *
 *   Seguridad:
 *   - Acceso permitido solo para admin y superadmin
 *
 *   Reglas:
 *   - Se maneja una sola entidad global de Home.
 *   - GET garantiza existencia de documento global.
 *   - PUT normaliza estructura y persiste el payload completo.
 *   - La respuesta siempre mantiene contrato estable para la UI admin.
 *
 * EN:
 *   Administrative endpoint for reading and updating the structured public
 *   home page configuration.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import HomeSettings from "@/models/HomeSettings";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AllowedRole = "admin" | "superadmin";

interface LocalizedText {
  es: string;
  en: string;
}

interface HomeCta {
  label: LocalizedText;
  href: string;
  enabled: boolean;
}

interface HomeFeaturedCard {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  order: number;
  enabled: boolean;
}

interface HomePayload {
  hero: {
    badge: {
      text: LocalizedText;
      enabled: boolean;
    };
    title: LocalizedText;
    subtitle: LocalizedText;
    primaryCta: HomeCta;
    secondaryCta: HomeCta;
  };

  highlightPanel: {
    coverageLabel: LocalizedText;
    enabled: boolean;
  };

  featuredCards: HomeFeaturedCard[];

  coverageSection: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    note: LocalizedText;
    openMapsLabel: LocalizedText;
    enabled: boolean;
  };

  mapSection: {
    enabled: boolean;
    useBrowserGeolocation: boolean;
    fallbackLat: number | null;
    fallbackLng: number | null;
    zoom: number;
  };

  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

type AdminGuardResult =
  | { ok: true; role: AllowedRole; userName: string; userEmail: string }
  | { ok: false; response: NextResponse };

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const HOME_DEFAULTS: HomePayload = {
  hero: {
    badge: {
      text: { es: "", en: "" },
      enabled: true,
    },
    title: { es: "", en: "" },
    subtitle: { es: "", en: "" },
    primaryCta: {
      label: { es: "", en: "" },
      href: "",
      enabled: true,
    },
    secondaryCta: {
      label: { es: "", en: "" },
      href: "",
      enabled: true,
    },
  },

  highlightPanel: {
    coverageLabel: { es: "", en: "" },
    enabled: true,
  },

  featuredCards: [],

  coverageSection: {
    eyebrow: { es: "", en: "" },
    title: { es: "", en: "" },
    description: { es: "", en: "" },
    note: { es: "", en: "" },
    openMapsLabel: { es: "", en: "" },
    enabled: true,
  },

  mapSection: {
    enabled: true,
    useBrowserGeolocation: true,
    fallbackLat: -0.1807,
    fallbackLng: -78.4678,
    zoom: 7,
  },

  updatedAt: "",
  updatedBy: "",
  updatedByEmail: "",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
  return role === "admin" || role === "superadmin";
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback: number | null
): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

function normalizeLocalizedText(value: unknown): LocalizedText {
  if (!value || typeof value !== "object") {
    return { es: "", en: "" };
  }

  const record = value as Record<string, unknown>;

  return {
    es: normalizeString(record.es),
    en: normalizeString(record.en),
  };
}

function normalizeCta(value: unknown, fallbackEnabled = true): HomeCta {
  if (!value || typeof value !== "object") {
    return {
      label: { es: "", en: "" },
      href: "",
      enabled: fallbackEnabled,
    };
  }

  const record = value as Record<string, unknown>;

  return {
    label: normalizeLocalizedText(record.label),
    href: normalizeString(record.href),
    enabled: normalizeBoolean(record.enabled, fallbackEnabled),
  };
}

function normalizeFeaturedCards(value: unknown): HomeFeaturedCard[] {
  if (!Array.isArray(value)) return [];

  const normalized = value
    .map((item, index): HomeFeaturedCard | null => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;

      const id =
        typeof record.id === "string" && record.id.trim().length > 0
          ? record.id.trim()
          : `card-${index + 1}`;

      return {
        id,
        title: normalizeLocalizedText(record.title),
        description: normalizeLocalizedText(record.description),
        order:
          typeof record.order === "number" && Number.isFinite(record.order)
            ? record.order
            : index + 1,
        enabled: normalizeBoolean(record.enabled, true),
      };
    })
    .filter((item): item is HomeFeaturedCard => item !== null)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index + 1,
    }));

  return normalized;
}

function normalizeHomePayload(value: unknown): HomePayload {
  if (!value || typeof value !== "object") {
    return structuredClone(HOME_DEFAULTS);
  }

  const record = value as Record<string, unknown>;
  const hero = (record.hero ?? {}) as Record<string, unknown>;
  const badge = (hero.badge ?? {}) as Record<string, unknown>;
  const highlightPanel = (record.highlightPanel ?? {}) as Record<string, unknown>;
  const coverageSection = (record.coverageSection ?? {}) as Record<
    string,
    unknown
  >;
  const mapSection = (record.mapSection ?? {}) as Record<string, unknown>;

  return {
    hero: {
      badge: {
        text: normalizeLocalizedText(badge.text),
        enabled: normalizeBoolean(
          badge.enabled,
          HOME_DEFAULTS.hero.badge.enabled
        ),
      },
      title: normalizeLocalizedText(hero.title),
      subtitle: normalizeLocalizedText(hero.subtitle),
      primaryCta: normalizeCta(hero.primaryCta, true),
      secondaryCta: normalizeCta(hero.secondaryCta, true),
    },

    highlightPanel: {
      coverageLabel: normalizeLocalizedText(highlightPanel.coverageLabel),
      enabled: normalizeBoolean(
        highlightPanel.enabled,
        HOME_DEFAULTS.highlightPanel.enabled
      ),
    },

    featuredCards: normalizeFeaturedCards(record.featuredCards),

    coverageSection: {
      eyebrow: normalizeLocalizedText(coverageSection.eyebrow),
      title: normalizeLocalizedText(coverageSection.title),
      description: normalizeLocalizedText(coverageSection.description),
      note: normalizeLocalizedText(coverageSection.note),
      openMapsLabel: normalizeLocalizedText(coverageSection.openMapsLabel),
      enabled: normalizeBoolean(
        coverageSection.enabled,
        HOME_DEFAULTS.coverageSection.enabled
      ),
    },

    mapSection: {
      enabled: normalizeBoolean(
        mapSection.enabled,
        HOME_DEFAULTS.mapSection.enabled
      ),
      useBrowserGeolocation: normalizeBoolean(
        mapSection.useBrowserGeolocation,
        HOME_DEFAULTS.mapSection.useBrowserGeolocation
      ),
      fallbackLat: normalizeNumber(
        mapSection.fallbackLat,
        HOME_DEFAULTS.mapSection.fallbackLat
      ),
      fallbackLng: normalizeNumber(
        mapSection.fallbackLng,
        HOME_DEFAULTS.mapSection.fallbackLng
      ),
      zoom:
        typeof mapSection.zoom === "number" &&
        Number.isFinite(mapSection.zoom) &&
        mapSection.zoom >= 1 &&
        mapSection.zoom <= 20
          ? mapSection.zoom
          : HOME_DEFAULTS.mapSection.zoom,
    },

    updatedAt: normalizeString(record.updatedAt),
    updatedBy: normalizeString(record.updatedBy),
    updatedByEmail: normalizeString(record.updatedByEmail),
  };
}

function toResponsePayload(doc: {
  hero?: unknown;
  highlightPanel?: unknown;
  featuredCards?: unknown;
  coverageSection?: unknown;
  mapSection?: unknown;
  updatedAt?: Date | string;
  updatedBy?: string;
  updatedByEmail?: string;
} | null): HomePayload {
  if (!doc) return structuredClone(HOME_DEFAULTS);

  return normalizeHomePayload({
    hero: doc.hero,
    highlightPanel: doc.highlightPanel,
    featuredCards: doc.featuredCards,
    coverageSection: doc.coverageSection,
    mapSection: doc.mapSection,
    updatedBy: doc.updatedBy ?? "",
    updatedByEmail: doc.updatedByEmail ?? "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  });
}

async function requireAdmin(): Promise<AdminGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error_es: "Sesión no válida o expirada.",
          error_en: "Invalid or expired session.",
        },
        { status: 401 }
      ),
    };
  }

  const role = session.user.role;

  if (!isAllowedRole(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error_es: "No tienes permisos para acceder a este recurso.",
          error_en: "You do not have permission to access this resource.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    role,
    userName: normalizeString(session.user.name),
    userEmail: normalizeString(session.user.email),
  };
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    await connectToDB();

    let doc = await HomeSettings.findOne({});

    if (!doc) {
      doc = await HomeSettings.create({
        hero: HOME_DEFAULTS.hero,
        highlightPanel: HOME_DEFAULTS.highlightPanel,
        featuredCards: HOME_DEFAULTS.featuredCards,
        coverageSection: HOME_DEFAULTS.coverageSection,
        mapSection: HOME_DEFAULTS.mapSection,
        updatedBy: "",
        updatedByEmail: "",
      });
    }

    const payload = toResponsePayload(doc.toObject());

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error fetching admin home config:", error);

    return NextResponse.json(
      {
        error_es: "Error interno al obtener la configuración de Home.",
        error_en: "Internal error while fetching Home configuration.",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    await connectToDB();

    const body: unknown = await request.json().catch(() => null);
    const normalized = normalizeHomePayload(body);

    const update = {
      hero: normalized.hero,
      highlightPanel: normalized.highlightPanel,
      featuredCards: normalized.featuredCards,
      coverageSection: normalized.coverageSection,
      mapSection: normalized.mapSection,
      updatedBy: guard.userName,
      updatedByEmail: guard.userEmail,
    };

    const doc = await HomeSettings.findOneAndUpdate(
      {},
      { $set: update },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    const payload = toResponsePayload(doc);

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error saving admin home config:", error);

    return NextResponse.json(
      {
        error_es: "Error interno al guardar la configuración de Home.",
        error_en: "Internal error while saving Home configuration.",
      },
      { status: 500 }
    );
  }
}