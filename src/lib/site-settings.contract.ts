/**
 * =============================================================================
 * 📘 Site Settings Contract
 * Path: src/lib/site-settings.contract.ts
 * =============================================================================
 *
 * ES:
 *   Contrato tipado y defaults estables del módulo SiteSettings.
 *
 *   Propósito:
 *   - Centralizar la forma oficial del payload.
 *   - Evitar duplicación entre página admin, API y helpers.
 *   - Mantener una única fuente de verdad para tipos y defaults.
 *
 * EN:
 *   Typed contract and stable defaults for the SiteSettings module.
 * =============================================================================
 */

export type Locale = "es" | "en";
export type AllowedRole = "admin" | "superadmin";

export interface LocalizedText {
  es: string;
  en: string;
}

export interface SiteSettingsPayload {
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

  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

export const SITE_SETTINGS_DEFAULTS: SiteSettingsPayload = {
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
    enabled: true,
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

  updatedAt: "",
  updatedBy: "",
  updatedByEmail: "",
};