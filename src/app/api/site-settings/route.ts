/**
 * =============================================================================
 * 📡 API Route: Public Site Settings
 * Path: src/app/api/site-settings/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint público para exponer la configuración global visible del sitio.
 *
 *   Responsabilidad:
 *   - Entregar SiteSettings al frontend público.
 *   - Unificar branding, contacto, footer, SEO base y CTA global.
 *
 *   Reglas:
 *   - Solo lectura pública.
 *   - Devuelve estructura estable desde base.
 *   - Si la entidad global no existe todavía, la crea con valores vacíos seguros.
 *
 * EN:
 *   Public endpoint used to expose visible global site settings.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import SiteSettings from "@/models/SiteSettings";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";

interface LocalizedText {
  es: string;
  en: string;
}

interface PublicSiteSettingsPayload {
  identity: {
    siteName: string;
    siteNameShort: string;
    tagline: LocalizedText;
    logoLight: string;
    logoDark: string;
    favicon: string;
  };
  contact: {
    primaryEmail: string;
    secondaryEmail: string;
    phonePrimary: string;
    phoneSecondary: string;
    whatsapp: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    country: string;
  };
  coverage: {
    label: LocalizedText;
    googleMapsUrl: string;
    googleMapsEmbedUrl: string;
    lat: number | null;
    lng: number | null;
  };
  socialLinks: {
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
    x: string;
  };
  globalPrimaryCta: {
    label: LocalizedText;
    href: string;
    enabled: boolean;
  };
  footer: {
    aboutText: LocalizedText;
    copyrightText: string;
    legalLinksEnabled: boolean;
  };
  seo: {
    defaultTitle: LocalizedText;
    defaultDescription: LocalizedText;
    defaultOgImage: string;
  };
  i18n: {
    defaultLocale: Locale;
    supportedLocales: Locale[];
  };
}

/* -------------------------------------------------------------------------- */
/* Empty payload                                                              */
/* -------------------------------------------------------------------------- */

const EMPTY_SITE_SETTINGS: PublicSiteSettingsPayload = {
  identity: {
    siteName: "",
    siteNameShort: "",
    tagline: { es: "", en: "" },
    logoLight: "",
    logoDark: "",
    favicon: "",
  },
  contact: {
    primaryEmail: "",
    secondaryEmail: "",
    phonePrimary: "",
    phoneSecondary: "",
    whatsapp: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "",
  },
  coverage: {
    label: { es: "", en: "" },
    googleMapsUrl: "",
    googleMapsEmbedUrl: "",
    lat: null,
    lng: null,
  },
  socialLinks: {
    facebook: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    x: "",
  },
  globalPrimaryCta: {
    label: { es: "", en: "" },
    href: "",
    enabled: false,
  },
  footer: {
    aboutText: { es: "", en: "" },
    copyrightText: "",
    legalLinksEnabled: true,
  },
  seo: {
    defaultTitle: { es: "", en: "" },
    defaultDescription: { es: "", en: "" },
    defaultOgImage: "",
  },
  i18n: {
    defaultLocale: "es",
    supportedLocales: ["es", "en"],
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

function normalizeNumber(value: unknown, fallback: number | null): number | null {
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

function normalizeSupportedLocales(value: unknown): Locale[] {
  if (!Array.isArray(value)) return ["es", "en"];

  const locales = value.filter(
    (item): item is Locale => item === "es" || item === "en"
  );

  return locales.length > 0 ? Array.from(new Set(locales)) : ["es", "en"];
}

function toPublicPayload(doc: {
  identity?: unknown;
  contact?: unknown;
  coverage?: unknown;
  socialLinks?: unknown;
  globalPrimaryCta?: unknown;
  footer?: unknown;
  seo?: unknown;
  i18n?: unknown;
} | null): PublicSiteSettingsPayload {
  if (!doc) return EMPTY_SITE_SETTINGS;

  const identity = (doc.identity ?? {}) as Record<string, unknown>;
  const contact = (doc.contact ?? {}) as Record<string, unknown>;
  const coverage = (doc.coverage ?? {}) as Record<string, unknown>;
  const socialLinks = (doc.socialLinks ?? {}) as Record<string, unknown>;
  const globalPrimaryCta = (doc.globalPrimaryCta ?? {}) as Record<string, unknown>;
  const footer = (doc.footer ?? {}) as Record<string, unknown>;
  const seo = (doc.seo ?? {}) as Record<string, unknown>;
  const i18n = (doc.i18n ?? {}) as Record<string, unknown>;

  const supportedLocales = normalizeSupportedLocales(i18n.supportedLocales);
  const defaultLocale =
    i18n.defaultLocale === "en" || i18n.defaultLocale === "es"
      ? i18n.defaultLocale
      : "es";

  return {
    identity: {
      siteName: normalizeString(identity.siteName),
      siteNameShort: normalizeString(identity.siteNameShort),
      tagline: normalizeLocalizedText(
        identity.tagline,
        EMPTY_SITE_SETTINGS.identity.tagline
      ),
      logoLight: normalizeString(identity.logoLight),
      logoDark: normalizeString(identity.logoDark),
      favicon: normalizeString(identity.favicon),
    },
    contact: {
      primaryEmail: normalizeString(contact.primaryEmail),
      secondaryEmail: normalizeString(contact.secondaryEmail),
      phonePrimary: normalizeString(contact.phonePrimary),
      phoneSecondary: normalizeString(contact.phoneSecondary),
      whatsapp: normalizeString(contact.whatsapp),
      addressLine1: normalizeString(contact.addressLine1),
      addressLine2: normalizeString(contact.addressLine2),
      city: normalizeString(contact.city),
      country: normalizeString(contact.country),
    },
    coverage: {
      label: normalizeLocalizedText(
        coverage.label,
        EMPTY_SITE_SETTINGS.coverage.label
      ),
      googleMapsUrl: normalizeString(coverage.googleMapsUrl),
      googleMapsEmbedUrl: normalizeString(coverage.googleMapsEmbedUrl),
      lat: normalizeNumber(coverage.lat, null),
      lng: normalizeNumber(coverage.lng, null),
    },
    socialLinks: {
      facebook: normalizeString(socialLinks.facebook),
      instagram: normalizeString(socialLinks.instagram),
      linkedin: normalizeString(socialLinks.linkedin),
      youtube: normalizeString(socialLinks.youtube),
      x: normalizeString(socialLinks.x),
    },
    globalPrimaryCta: {
      label: normalizeLocalizedText(
        globalPrimaryCta.label,
        EMPTY_SITE_SETTINGS.globalPrimaryCta.label
      ),
      href: normalizeString(globalPrimaryCta.href),
      enabled: normalizeBoolean(globalPrimaryCta.enabled, false),
    },
    footer: {
      aboutText: normalizeLocalizedText(
        footer.aboutText,
        EMPTY_SITE_SETTINGS.footer.aboutText
      ),
      copyrightText: normalizeString(footer.copyrightText),
      legalLinksEnabled: normalizeBoolean(footer.legalLinksEnabled, true),
    },
    seo: {
      defaultTitle: normalizeLocalizedText(
        seo.defaultTitle,
        EMPTY_SITE_SETTINGS.seo.defaultTitle
      ),
      defaultDescription: normalizeLocalizedText(
        seo.defaultDescription,
        EMPTY_SITE_SETTINGS.seo.defaultDescription
      ),
      defaultOgImage: normalizeString(seo.defaultOgImage),
    },
    i18n: {
      defaultLocale: supportedLocales.includes(defaultLocale)
        ? defaultLocale
        : supportedLocales[0],
      supportedLocales,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    await connectToDB();

    let doc = await SiteSettings.findOne({});

    if (!doc) {
      doc = await SiteSettings.create({
        identity: EMPTY_SITE_SETTINGS.identity,
        contact: EMPTY_SITE_SETTINGS.contact,
        coverage: EMPTY_SITE_SETTINGS.coverage,
        socialLinks: EMPTY_SITE_SETTINGS.socialLinks,
        globalPrimaryCta: EMPTY_SITE_SETTINGS.globalPrimaryCta,
        footer: EMPTY_SITE_SETTINGS.footer,
        seo: EMPTY_SITE_SETTINGS.seo,
        i18n: EMPTY_SITE_SETTINGS.i18n,
      });
    }

    const payload = toPublicPayload(doc.toObject());

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error fetching public site settings:", error);
    return NextResponse.json(EMPTY_SITE_SETTINGS, { status: 200 });
  }
}