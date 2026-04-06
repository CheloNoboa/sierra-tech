/**
 * =============================================================================
 * 📄 Page: Public Services Listing (SERVER)
 * Path: src/app/services/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página pública de servicios renderizada en servidor.
 *
 *   Objetivo:
 *   - Eliminar fetch en cliente para mejorar tiempo de entrada y retorno
 *   - Entregar HTML ya resuelto
 *   - Mantener la UI interactiva en un componente cliente mínimo
 *
 *   Responsabilidad real de este archivo:
 *   - Cargar datos públicos requeridos para /services
 *   - Normalizar respuestas de Mongo/lean
 *   - Pasar al componente cliente solo datos serializables y seguros
 *
 *   Regla:
 *   - Este archivo NO construye la UI visual final.
 *   - La presentación vive en ServicesPageClient.
 *
 * EN:
 *   Public services page rendered on the server.
 * =============================================================================
 */

import { connectToDB } from "@/lib/connectToDB";
import Service from "@/models/Service";
import ServicesPageModel from "@/models/ServicesPage";
import HomeSettings from "@/models/HomeSettings";
import ServicesPageClient, {
  type FeaturedCard,
  type LocalizedText,
  type PublicService,
  type ServicesPageHeader,
} from "@/components/services/ServicesPageClient";

export const revalidate = 300;

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = { es: "", en: "" };

const EMPTY_PAGE_HEADER: ServicesPageHeader = {
  eyebrow: { es: "", en: "" },
  title: { es: "", en: "" },
  subtitle: { es: "", en: "" },
  primaryCtaLabel: { es: "", en: "" },
  primaryCtaHref: "",
  secondaryCtaLabel: { es: "", en: "" },
  secondaryCtaHref: "",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeLocalizedText(
  value: unknown,
  fallback: LocalizedText = EMPTY_LOCALIZED_TEXT
): LocalizedText {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }

  const record = value as Record<string, unknown>;

  return {
    es: normalizeString(record.es, fallback.es),
    en: normalizeString(record.en, fallback.en),
  };
}

function resolvePublicAssetUrl(value: unknown): string {
  const raw = normalizeString(value);

  if (!raw) return "";

  if (raw.startsWith("admin/")) {
    return `/api/admin/uploads/view?key=${encodeURIComponent(raw)}`;
  }

  return raw;
}

function normalizePageHeader(value: unknown): ServicesPageHeader {
  if (!value || typeof value !== "object") {
    return structuredClone(EMPTY_PAGE_HEADER);
  }

  const record = value as Record<string, unknown>;

  return {
    eyebrow: normalizeLocalizedText(record.eyebrow),
    title: normalizeLocalizedText(record.title),
    subtitle: normalizeLocalizedText(record.subtitle),
    primaryCtaLabel: normalizeLocalizedText(record.primaryCtaLabel),
    primaryCtaHref: normalizeString(record.primaryCtaHref),
    secondaryCtaLabel: normalizeLocalizedText(record.secondaryCtaLabel),
    secondaryCtaHref: normalizeString(record.secondaryCtaHref),
  };
}

function normalizeFeaturedCards(value: unknown): FeaturedCard[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : null;

      return {
        id: normalizeString(record?.id),
        title: normalizeLocalizedText(record?.title),
        description: normalizeLocalizedText(record?.description),
        order: normalizeNumber(record?.order, index + 1),
        enabled: normalizeBoolean(record?.enabled, false),
      };
    })
    .filter((card) => card.enabled && card.id.length > 0)
    .sort((a, b) => a.order - b.order);
}

function normalizeServices(value: unknown): PublicService[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : null;

      const rawId = record?._id;

      return {
        _id:
          typeof rawId === "string"
            ? rawId
            : rawId && typeof rawId === "object" && "toString" in rawId
              ? String(rawId)
              : "",
        slug: normalizeString(record?.slug),
        title: normalizeLocalizedText(record?.title),
        summary: normalizeLocalizedText(record?.summary),
        description: normalizeLocalizedText(record?.description),
        coverImage: resolvePublicAssetUrl(record?.coverImage),
        category: normalizeString(record?.category),
        order: normalizeNumber(record?.order, index + 1),
      };
    })
    .filter((service) => service.slug.length > 0)
    .sort((a, b) => a.order - b.order);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function ServicesPage() {
  await connectToDB();

  const [services, page, homeSettings] = await Promise.all([
    Service.find({ status: "published" }).sort({ order: 1, createdAt: -1 }).lean(),
    ServicesPageModel.findOne().lean(),
    HomeSettings.findOne().lean(),
  ]);

  const normalizedPageHeader = normalizePageHeader(page?.header);
  const normalizedFeaturedCards = normalizeFeaturedCards(
    homeSettings?.featuredCards
  );
  const normalizedServices = normalizeServices(services);

  return (
    <ServicesPageClient
      pageHeader={normalizedPageHeader}
      featuredCards={normalizedFeaturedCards}
      services={normalizedServices}
    />
  );
}