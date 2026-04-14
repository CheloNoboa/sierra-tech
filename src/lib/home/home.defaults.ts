/**
 * =============================================================================
 * 📄 Home Defaults
 * Path: src/lib/home/home.defaults.ts
 * =============================================================================
 *
 * ES:
 *   Defaults compartidos del módulo Home.
 *
 *   Objetivo:
 *   - evitar duplicación de estructuras vacías
 *   - mantener consistencia entre admin, API y frontend público
 *
 * EN:
 *   Shared defaults for the Home module.
 * =============================================================================
 */

import type {
  HomePayload,
  LocalizedText,
  PartnerAsset,
  PartnerDocument,
  PartnerItem,
  PartnerSection,
} from "@/types/home";

export const EMPTY_LOCALIZED_TEXT: LocalizedText = {
  es: "",
  en: "",
};

export const DEFAULT_PARTNER_ASSET: PartnerAsset = {
  url: "",
  fileName: "",
  mimeType: "",
  sizeBytes: 0,
  storageKey: "",
};

export const DEFAULT_PARTNER_DOCUMENT: PartnerDocument = {
  id: "",
  title: { es: "", en: "" },
  description: { es: "", en: "" },
  label: { es: "", en: "" },
  file: { ...DEFAULT_PARTNER_ASSET },
  order: 1,
  enabled: true,
};

export const DEFAULT_PARTNER_ITEM: PartnerItem = {
  id: "",
  name: "",
  shortName: "",
  badgeLabel: { es: "", en: "" },
  summary: { es: "", en: "" },
  description: { es: "", en: "" },
  logo: { ...DEFAULT_PARTNER_ASSET },
  coverageItems: [],
  tags: [],
  ctaLabel: { es: "", en: "" },
  ctaHref: "",
  documents: [],
  order: 1,
  enabled: true,
};

export const DEFAULT_PARTNER_SECTION: PartnerSection = {
  enabled: true,
  eyebrow: { ...EMPTY_LOCALIZED_TEXT },
  title: { ...EMPTY_LOCALIZED_TEXT },
  description: { ...EMPTY_LOCALIZED_TEXT },
  badgeLabel: { ...EMPTY_LOCALIZED_TEXT },
  ctaLabel: { ...EMPTY_LOCALIZED_TEXT },
  ctaHref: "",
  items: [],
};

export const HOME_DEFAULTS: HomePayload = {
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
    showOpenMapsLink: false,
    enabled: true,
  },

  aboutSection: {
    eyebrow: { es: "", en: "" },
    title: { es: "", en: "" },
    description: { es: "", en: "" },
    highlights: [],
    enabled: true,
  },

  partnerSection: { ...DEFAULT_PARTNER_SECTION },

  leadershipSection: {
    name: "",
    role: { es: "", en: "" },
    message: { es: "", en: "" },
    imageUrl: "",
    enabled: true,
  },

  whyChooseUs: {
    title: { es: "", en: "" },
    items: [],
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

export const EMPTY_HOME_PAYLOAD: HomePayload = {
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
  partnerSection: {
    enabled: true,
    eyebrow: { es: "", en: "" },
    title: { es: "", en: "" },
    description: { es: "", en: "" },
    badgeLabel: { es: "", en: "" },
    ctaLabel: { es: "", en: "" },
    ctaHref: "",
    items: [],
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