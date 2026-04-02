/**
 * =============================================================================
 * 📡 API Route: Public Home
 * Path: src/app/api/home/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint público para exponer el contenido visible de la portada.
 *
 *   Responsabilidad:
 *   - Entregar únicamente contenido del módulo Home.
 *   - Reflejar lo persistido en HomeSettings.
 *   - No inventar contenido visible cuando la base aún no tiene datos.
 *
 *   Reglas:
 *   - Solo lectura pública.
 *   - No usar textos demo como contenido real.
 *   - Si no existe configuración, devuelve estructura vacía estable.
 *   - No modifica datos.
 *   - La visibilidad del botón de ubicación se expone como bandera explícita.
 *   - Los bloques institucionales adicionales se exponen con contrato estable.
 *
 * EN:
 *   Public endpoint used to expose visible home-page content.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import HomeSettings from "@/models/HomeSettings";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

interface WhyChooseUsItem {
  title: LocalizedText;
  description: LocalizedText;
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
    showOpenMapsLink: boolean;
    enabled: boolean;
  };
  aboutSection: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    highlights: LocalizedText[];
    enabled: boolean;
  };
  leadershipSection: {
    name: string;
    role: LocalizedText;
    message: LocalizedText;
    imageUrl: string;
    enabled: boolean;
  };
  whyChooseUs: {
    title: LocalizedText;
    items: WhyChooseUsItem[];
    enabled: boolean;
  };
  mapSection: {
    enabled: boolean;
    useBrowserGeolocation: boolean;
    fallbackLat: number | null;
    fallbackLng: number | null;
    zoom: number;
  };
}

/* -------------------------------------------------------------------------- */
/* Empty payload                                                              */
/* -------------------------------------------------------------------------- */

const EMPTY_HOME_PAYLOAD: HomePayload = {
  hero: {
    badge: {
      text: { es: "", en: "" },
      enabled: false,
    },
    title: { es: "", en: "" },
    subtitle: { es: "", en: "" },
    primaryCta: {
      label: { es: "", en: "" },
      href: "",
      enabled: false,
    },
    secondaryCta: {
      label: { es: "", en: "" },
      href: "",
      enabled: false,
    },
  },
  highlightPanel: {
    coverageLabel: { es: "", en: "" },
    enabled: false,
  },
  featuredCards: [],
  coverageSection: {
    eyebrow: { es: "", en: "" },
    title: { es: "", en: "" },
    description: { es: "", en: "" },
    note: { es: "", en: "" },
    openMapsLabel: { es: "", en: "" },
    showOpenMapsLink: false,
    enabled: false,
  },
  aboutSection: {
    eyebrow: { es: "", en: "" },
    title: { es: "", en: "" },
    description: { es: "", en: "" },
    highlights: [],
    enabled: false,
  },
  leadershipSection: {
    name: "",
    role: { es: "", en: "" },
    message: { es: "", en: "" },
    imageUrl: "",
    enabled: false,
  },
  whyChooseUs: {
    title: { es: "", en: "" },
    items: [],
    enabled: false,
  },
  mapSection: {
    enabled: false,
    useBrowserGeolocation: true,
    fallbackLat: null,
    fallbackLng: null,
    zoom: 7,
  },
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLocalizedText(
  value: unknown,
  fallback: LocalizedText
): LocalizedText {
  if (!value || typeof value !== "object") return fallback;

  const record = value as Record<string, unknown>;

  return {
    es: normalizeString(record.es, fallback.es),
    en: normalizeString(record.en, fallback.en),
  };
}

function normalizeLocalizedTextArray(value: unknown): LocalizedText[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): LocalizedText | null => {
      if (!item || typeof item !== "object") return null;
      return normalizeLocalizedText(item, { es: "", en: "" });
    })
    .filter((item): item is LocalizedText => item !== null);
}

function normalizeCta(value: unknown, fallback: HomeCta): HomeCta {
  if (!value || typeof value !== "object") return fallback;

  const record = value as Record<string, unknown>;

  return {
    label: normalizeLocalizedText(record.label, fallback.label),
    href: normalizeString(record.href, fallback.href),
    enabled: normalizeBoolean(record.enabled, fallback.enabled),
  };
}

function normalizeFeaturedCards(value: unknown): HomeFeaturedCard[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index): HomeFeaturedCard | null => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const fallbackOrder = index + 1;

      return {
        id: normalizeString(record.id, `card-${fallbackOrder}`),
        title: normalizeLocalizedText(record.title, { es: "", en: "" }),
        description: normalizeLocalizedText(record.description, {
          es: "",
          en: "",
        }),
        order:
          typeof record.order === "number" && Number.isFinite(record.order)
            ? record.order
            : fallbackOrder,
        enabled: normalizeBoolean(record.enabled, true),
      };
    })
    .filter((item): item is HomeFeaturedCard => item !== null)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index + 1,
    }));
}

function normalizeWhyChooseUsItems(value: unknown): WhyChooseUsItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): WhyChooseUsItem | null => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;

      return {
        title: normalizeLocalizedText(record.title, { es: "", en: "" }),
        description: normalizeLocalizedText(record.description, {
          es: "",
          en: "",
        }),
      };
    })
    .filter((item): item is WhyChooseUsItem => item !== null);
}

function toPublicPayload(
  doc: {
    hero?: unknown;
    highlightPanel?: unknown;
    featuredCards?: unknown;
    coverageSection?: unknown;
    aboutSection?: unknown;
    leadershipSection?: unknown;
    whyChooseUs?: unknown;
    mapSection?: unknown;
  } | null
): HomePayload {
  if (!doc) return EMPTY_HOME_PAYLOAD;

  const hero = (doc.hero ?? {}) as Record<string, unknown>;
  const heroBadge = (hero.badge ?? {}) as Record<string, unknown>;
  const highlightPanel = (doc.highlightPanel ?? {}) as Record<string, unknown>;
  const coverageSection = (doc.coverageSection ?? {}) as Record<
    string,
    unknown
  >;
  const aboutSection = (doc.aboutSection ?? {}) as Record<string, unknown>;
  const leadershipSection = (doc.leadershipSection ?? {}) as Record<
    string,
    unknown
  >;
  const whyChooseUs = (doc.whyChooseUs ?? {}) as Record<string, unknown>;
  const mapSection = (doc.mapSection ?? {}) as Record<string, unknown>;

  return {
    hero: {
      badge: {
        text: normalizeLocalizedText(
          heroBadge.text,
          EMPTY_HOME_PAYLOAD.hero.badge.text
        ),
        enabled: normalizeBoolean(
          heroBadge.enabled,
          EMPTY_HOME_PAYLOAD.hero.badge.enabled
        ),
      },
      title: normalizeLocalizedText(hero.title, EMPTY_HOME_PAYLOAD.hero.title),
      subtitle: normalizeLocalizedText(
        hero.subtitle,
        EMPTY_HOME_PAYLOAD.hero.subtitle
      ),
      primaryCta: normalizeCta(
        hero.primaryCta,
        EMPTY_HOME_PAYLOAD.hero.primaryCta
      ),
      secondaryCta: normalizeCta(
        hero.secondaryCta,
        EMPTY_HOME_PAYLOAD.hero.secondaryCta
      ),
    },

    highlightPanel: {
      coverageLabel: normalizeLocalizedText(
        highlightPanel.coverageLabel,
        EMPTY_HOME_PAYLOAD.highlightPanel.coverageLabel
      ),
      enabled: normalizeBoolean(
        highlightPanel.enabled,
        EMPTY_HOME_PAYLOAD.highlightPanel.enabled
      ),
    },

    featuredCards: normalizeFeaturedCards(doc.featuredCards),

    coverageSection: {
      eyebrow: normalizeLocalizedText(
        coverageSection.eyebrow,
        EMPTY_HOME_PAYLOAD.coverageSection.eyebrow
      ),
      title: normalizeLocalizedText(
        coverageSection.title,
        EMPTY_HOME_PAYLOAD.coverageSection.title
      ),
      description: normalizeLocalizedText(
        coverageSection.description,
        EMPTY_HOME_PAYLOAD.coverageSection.description
      ),
      note: normalizeLocalizedText(
        coverageSection.note,
        EMPTY_HOME_PAYLOAD.coverageSection.note
      ),
      openMapsLabel: normalizeLocalizedText(
        coverageSection.openMapsLabel,
        EMPTY_HOME_PAYLOAD.coverageSection.openMapsLabel
      ),
      showOpenMapsLink: normalizeBoolean(
        coverageSection.showOpenMapsLink,
        EMPTY_HOME_PAYLOAD.coverageSection.showOpenMapsLink
      ),
      enabled: normalizeBoolean(
        coverageSection.enabled,
        EMPTY_HOME_PAYLOAD.coverageSection.enabled
      ),
    },

    aboutSection: {
      eyebrow: normalizeLocalizedText(
        aboutSection.eyebrow,
        EMPTY_HOME_PAYLOAD.aboutSection.eyebrow
      ),
      title: normalizeLocalizedText(
        aboutSection.title,
        EMPTY_HOME_PAYLOAD.aboutSection.title
      ),
      description: normalizeLocalizedText(
        aboutSection.description,
        EMPTY_HOME_PAYLOAD.aboutSection.description
      ),
      highlights: normalizeLocalizedTextArray(aboutSection.highlights),
      enabled: normalizeBoolean(
        aboutSection.enabled,
        EMPTY_HOME_PAYLOAD.aboutSection.enabled
      ),
    },

    leadershipSection: {
      name: normalizeString(
        leadershipSection.name,
        EMPTY_HOME_PAYLOAD.leadershipSection.name
      ),
      role: normalizeLocalizedText(
        leadershipSection.role,
        EMPTY_HOME_PAYLOAD.leadershipSection.role
      ),
      message: normalizeLocalizedText(
        leadershipSection.message,
        EMPTY_HOME_PAYLOAD.leadershipSection.message
      ),
      imageUrl: normalizeString(
        leadershipSection.imageUrl,
        EMPTY_HOME_PAYLOAD.leadershipSection.imageUrl
      ),
      enabled: normalizeBoolean(
        leadershipSection.enabled,
        EMPTY_HOME_PAYLOAD.leadershipSection.enabled
      ),
    },

    whyChooseUs: {
      title: normalizeLocalizedText(
        whyChooseUs.title,
        EMPTY_HOME_PAYLOAD.whyChooseUs.title
      ),
      items: normalizeWhyChooseUsItems(whyChooseUs.items),
      enabled: normalizeBoolean(
        whyChooseUs.enabled,
        EMPTY_HOME_PAYLOAD.whyChooseUs.enabled
      ),
    },

    mapSection: {
      enabled: normalizeBoolean(
        mapSection.enabled,
        EMPTY_HOME_PAYLOAD.mapSection.enabled
      ),
      useBrowserGeolocation: normalizeBoolean(
        mapSection.useBrowserGeolocation,
        EMPTY_HOME_PAYLOAD.mapSection.useBrowserGeolocation
      ),
      fallbackLat: normalizeNumber(
        mapSection.fallbackLat,
        EMPTY_HOME_PAYLOAD.mapSection.fallbackLat
      ),
      fallbackLng: normalizeNumber(
        mapSection.fallbackLng,
        EMPTY_HOME_PAYLOAD.mapSection.fallbackLng
      ),
      zoom:
        typeof mapSection.zoom === "number" &&
        Number.isFinite(mapSection.zoom) &&
        mapSection.zoom >= 1 &&
        mapSection.zoom <= 20
          ? mapSection.zoom
          : EMPTY_HOME_PAYLOAD.mapSection.zoom,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    await connectToDB();

    const doc = await HomeSettings.findOne({}).lean();
    const payload = toPublicPayload(doc);

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error fetching public home content:", error);
    return NextResponse.json(EMPTY_HOME_PAYLOAD, { status: 200 });
  }
}