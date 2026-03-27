/**
 * =============================================================================
 * 📌 File: src/lib/siteSettings.ts
 * =============================================================================
 *
 * ES:
 * - Helper servidor para obtener SiteSettings desde MongoDB.
 * - Evita duplicar lógica de lectura en layout y futuras páginas públicas.
 *
 * EN:
 * - Server helper to fetch SiteSettings from MongoDB.
 * =============================================================================
 */

import { connectToDB } from "@/lib/connectToDB";
import SiteSettings from "@/models/SiteSettings";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Locale = "es" | "en";

export interface LocalizedText {
  es: string;
  en: string;
}

export interface PublicSiteSettings {
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
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULTS: PublicSiteSettings = {
  identity: {
    siteName: "Sierra Tech",
    siteNameShort: "Sierra Tech",
    tagline: {
      es: "",
      en: "",
    },
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
    label: {
      es: "",
      en: "",
    },
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
    label: {
      es: "",
      en: "",
    },
    href: "",
    enabled: true,
  },

  footer: {
    aboutText: {
      es: "",
      en: "",
    },
    copyrightText: "",
    legalLinksEnabled: true,
  },

  seo: {
    defaultTitle: {
      es: "Sierra Tech",
      en: "Sierra Tech",
    },
    defaultDescription: {
      es: "",
      en: "",
    },
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
  if (typeof value !== "string") return fallback;
  return value.trim().replace(/\\/g, "/");
}

function normalizeLocalizedText(
  value: unknown,
  fallback: LocalizedText
): LocalizedText {
  if (!value || typeof value !== "object") return fallback;

  const record = value as Record<string, unknown>;

  return {
    es: typeof record.es === "string" ? record.es : fallback.es,
    en: typeof record.en === "string" ? record.en : fallback.en,
  };
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number | null): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

function normalizeSupportedLocales(value: unknown): Locale[] {
  if (!Array.isArray(value)) return ["es", "en"];

  const locales = value.filter(
    (item): item is Locale => item === "es" || item === "en"
  );

  return locales.length > 0 ? Array.from(new Set(locales)) : ["es", "en"];
}

function normalizeSiteSettings(doc: unknown): PublicSiteSettings {
  if (!doc || typeof doc !== "object") return DEFAULTS;

  const record = doc as Record<string, unknown>;
  const identity = (record.identity ?? {}) as Record<string, unknown>;
  const contact = (record.contact ?? {}) as Record<string, unknown>;
  const coverage = (record.coverage ?? {}) as Record<string, unknown>;
  const socialLinks = (record.socialLinks ?? {}) as Record<string, unknown>;
  const globalPrimaryCta = (record.globalPrimaryCta ?? {}) as Record<string, unknown>;
  const footer = (record.footer ?? {}) as Record<string, unknown>;
  const seo = (record.seo ?? {}) as Record<string, unknown>;
  const i18n = (record.i18n ?? {}) as Record<string, unknown>;

  const supportedLocales = normalizeSupportedLocales(i18n.supportedLocales);
  const defaultLocale =
    i18n.defaultLocale === "es" || i18n.defaultLocale === "en"
      ? i18n.defaultLocale
      : "es";

  return {
    identity: {
      siteName: normalizeString(identity.siteName, DEFAULTS.identity.siteName),
      siteNameShort: normalizeString(
        identity.siteNameShort,
        DEFAULTS.identity.siteNameShort
      ),
      tagline: normalizeLocalizedText(identity.tagline, DEFAULTS.identity.tagline),
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
      label: normalizeLocalizedText(coverage.label, DEFAULTS.coverage.label),
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
        DEFAULTS.globalPrimaryCta.label
      ),
      href: normalizeString(globalPrimaryCta.href),
      enabled: normalizeBoolean(globalPrimaryCta.enabled, true),
    },

    footer: {
      aboutText: normalizeLocalizedText(footer.aboutText, DEFAULTS.footer.aboutText),
      copyrightText: normalizeString(footer.copyrightText),
      legalLinksEnabled: normalizeBoolean(footer.legalLinksEnabled, true),
    },

    seo: {
      defaultTitle: normalizeLocalizedText(
        seo.defaultTitle,
        DEFAULTS.seo.defaultTitle
      ),
      defaultDescription: normalizeLocalizedText(
        seo.defaultDescription,
        DEFAULTS.seo.defaultDescription
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
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
  try {
    await connectToDB();
    const doc = await SiteSettings.findOne({}).lean();
    return normalizeSiteSettings(doc);
  } catch (error) {
    console.error("[getPublicSiteSettings] failed:", error);
    return DEFAULTS;
  }
}