/**
 * =============================================================================
 * 📄 Types: Home
 * Path: src/types/home.ts
 * =============================================================================
 *
 * ES:
 *   Contrato tipado compartido del módulo Home de Sierra Tech.
 *
 *   Objetivo:
 *   - centralizar tipos usados por:
 *     - admin Home
 *     - API admin Home
 *     - API pública Home
 *     - página pública Home
 *   - evitar duplicación
 *   - mantener una sola fuente de verdad
 *
 * EN:
 *   Shared typed contract for Sierra Tech Home module.
 * =============================================================================
 */

export type Locale = "es" | "en";
export type AllowedRole = "admin" | "superadmin";
export type UploadKind = "partner-logo" | "partner-document";

export interface LocalizedText {
  es: string;
  en: string;
}

export interface HomeCta {
  label: LocalizedText;
  href: string;
  enabled: boolean;
}

export interface HomeFeaturedCard {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  order: number;
  enabled: boolean;
}

export interface WhyChooseUsItem {
  title: LocalizedText;
  description: LocalizedText;
}

export interface PartnerAsset {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface PartnerDocument {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  label: LocalizedText;
  file: PartnerAsset;
  order: number;
  enabled: boolean;
}

export interface PartnerItem {
  id: string;
  name: string;
  shortName: string;
  badgeLabel: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  logo: PartnerAsset;
  coverageItems: LocalizedText[];
  tags: LocalizedText[];
  ctaLabel: LocalizedText;
  ctaHref: string;
  documents: PartnerDocument[];
  order: number;
  enabled: boolean;
}

export interface PartnerSection {
  enabled: boolean;
  eyebrow: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  badgeLabel: LocalizedText;
  ctaLabel: LocalizedText;
  ctaHref: string;
  items: PartnerItem[];
}

export interface HomePayload {
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
  partnerSection: PartnerSection;
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
  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

export interface UploadResponseItem {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface UploadResponse {
  ok: boolean;
  item?: UploadResponseItem;
  error?: string;
}