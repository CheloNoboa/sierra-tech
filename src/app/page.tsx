"use client";

/**
 * =============================================================================
 * 📄 Page: Public Home
 * Path: src/app/page.tsx
 * =============================================================================
 *
 * ES:
 *   Portada pública principal de Sierra Tech.
 *
 *   Responsabilidades:
 *   - Consumir SiteSettings para branding global mínimo.
 *   - Consumir HomeSettings para el contenido editorial de portada.
 *   - Mantener coherencia visual con la página pública de Servicios.
 *   - Dirigir al usuario hacia la navegación principal del sitio.
 *
 *   Decisiones de UI:
 *   - Home y Services comparten la misma base visual:
 *     ancho, espaciados, jerarquía tipográfica y estilo de botones.
 *   - El CTA secundario del hero dirige a /services.
 *   - Las cards destacadas de Home muestran solo títulos.
 *   - El detalle completo de servicios vive en la página /services.
 *
 *   Reglas:
 *   - SiteSettings solo aporta branding global.
 *   - HomeSettings controla el contenido editorial de portada.
 *   - No inventar contenido si HomeSettings está vacío.
 *   - No duplicar en Home el nivel de detalle que corresponde a /services.
 *
 * EN:
 *   Main public landing page for Sierra Tech.
 * =============================================================================
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";

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
}

interface SiteSettingsPublic {
  identity: {
    siteName: string;
    siteNameShort: string;
    tagline: LocalizedText;
    logoLight: string;
    logoDark: string;
    favicon: string;
  };
}

interface Coordinates {
  lat: number;
  lng: number;
}

/* -------------------------------------------------------------------------- */
/* Empty payloads                                                             */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED: LocalizedText = { es: "", en: "" };

const EMPTY_HOME: HomePayload = {
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

const EMPTY_SITE_SETTINGS: SiteSettingsPublic = {
  identity: {
    siteName: "",
    siteNameShort: "",
    tagline: { es: "", en: "" },
    logoLight: "",
    logoDark: "",
    favicon: "",
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
  fallback: LocalizedText = EMPTY_LOCALIZED
): LocalizedText {
  if (!value || typeof value !== "object") return fallback;

  const record = value as Record<string, unknown>;

  return {
    es: normalizeString(record.es, fallback.es),
    en: normalizeString(record.en, fallback.en),
  };
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
        title: normalizeLocalizedText(record.title),
        description: normalizeLocalizedText(record.description),
        order:
          typeof record.order === "number" && Number.isFinite(record.order)
            ? record.order
            : fallbackOrder,
        enabled: normalizeBoolean(record.enabled, true),
      };
    })
    .filter((item): item is HomeFeaturedCard => item !== null)
    .sort((a, b) => a.order - b.order);
}

function normalizeHomePayload(payload: unknown): HomePayload {
  if (!payload || typeof payload !== "object") return EMPTY_HOME;

  const record = payload as Record<string, unknown>;
  const hero = (record.hero ?? {}) as Record<string, unknown>;
  const heroBadge = (hero.badge ?? {}) as Record<string, unknown>;
  const highlightPanel = (record.highlightPanel ?? {}) as Record<string, unknown>;
  const coverageSection = (record.coverageSection ?? {}) as Record<string, unknown>;
  const mapSection = (record.mapSection ?? {}) as Record<string, unknown>;

  return {
    hero: {
      badge: {
        text: normalizeLocalizedText(heroBadge.text),
        enabled: normalizeBoolean(heroBadge.enabled, false),
      },
      title: normalizeLocalizedText(hero.title),
      subtitle: normalizeLocalizedText(hero.subtitle),
      primaryCta: normalizeCta(hero.primaryCta, EMPTY_HOME.hero.primaryCta),
      secondaryCta: normalizeCta(
        hero.secondaryCta,
        EMPTY_HOME.hero.secondaryCta
      ),
    },
    highlightPanel: {
      coverageLabel: normalizeLocalizedText(highlightPanel.coverageLabel),
      enabled: normalizeBoolean(highlightPanel.enabled, false),
    },
    featuredCards: normalizeFeaturedCards(record.featuredCards),
    coverageSection: {
      eyebrow: normalizeLocalizedText(coverageSection.eyebrow),
      title: normalizeLocalizedText(coverageSection.title),
      description: normalizeLocalizedText(coverageSection.description),
      note: normalizeLocalizedText(coverageSection.note),
      openMapsLabel: normalizeLocalizedText(coverageSection.openMapsLabel),
      enabled: normalizeBoolean(coverageSection.enabled, false),
    },
    mapSection: {
      enabled: normalizeBoolean(mapSection.enabled, false),
      useBrowserGeolocation: normalizeBoolean(
        mapSection.useBrowserGeolocation,
        true
      ),
      fallbackLat: normalizeNumber(mapSection.fallbackLat, null),
      fallbackLng: normalizeNumber(mapSection.fallbackLng, null),
      zoom:
        typeof mapSection.zoom === "number" &&
        Number.isFinite(mapSection.zoom) &&
        mapSection.zoom >= 1 &&
        mapSection.zoom <= 20
          ? mapSection.zoom
          : 7,
    },
  };
}

function normalizeSiteSettings(payload: unknown): SiteSettingsPublic {
  if (!payload || typeof payload !== "object") return EMPTY_SITE_SETTINGS;

  const record = payload as Record<string, unknown>;
  const identity = (record.identity ?? {}) as Record<string, unknown>;

  return {
    identity: {
      siteName: normalizeString(identity.siteName),
      siteNameShort: normalizeString(identity.siteNameShort),
      tagline: normalizeLocalizedText(identity.tagline),
      logoLight: normalizeString(identity.logoLight),
      logoDark: normalizeString(identity.logoDark),
      favicon: normalizeString(identity.favicon),
    },
  };
}

function normalizeImageSrc(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";

  if (trimmed.startsWith("/")) return trimmed;

  try {
    return new URL(trimmed).toString();
  } catch {
    return "";
  }
}

function getLocalizedText(value: LocalizedText, locale: Locale): string {
  return locale === "es" ? value.es : value.en;
}

function hasLocalizedText(value: LocalizedText | undefined | null): boolean {
  if (!value) return false;
  return value.es.trim().length > 0 || value.en.trim().length > 0;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  const { locale } = useTranslation();
  const lang: Locale = locale === "es" ? "es" : "en";

  const [homeContent, setHomeContent] = useState<HomePayload>(EMPTY_HOME);
  const [siteSettings, setSiteSettings] =
    useState<SiteSettingsPublic>(EMPTY_SITE_SETTINGS);

  const [coords, setCoords] = useState<Coordinates>({
    lat: -0.1807,
    lng: -78.4678,
  });

  /* ---------------------------------------------------------------------- */
  /* Data loading                                                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    async function loadHomeContent() {
      try {
        const response = await fetch("/api/home", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const payload: unknown = await response.json().catch(() => null);
        const normalized = normalizeHomePayload(payload);

        setHomeContent(normalized);
        setCoords((prev) => ({
          lat: normalized.mapSection.fallbackLat ?? prev.lat,
          lng: normalized.mapSection.fallbackLng ?? prev.lng,
        }));
      } catch (error) {
        console.error("[HomePage] Error loading home content:", error);
        setHomeContent(EMPTY_HOME);
      }
    }

    async function loadSiteSettings() {
      try {
        const response = await fetch("/api/site-settings", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const payload: unknown = await response.json().catch(() => null);
        const normalized = normalizeSiteSettings(payload);

        setSiteSettings(normalized);
      } catch (error) {
        console.error("[HomePage] Error loading site settings:", error);
        setSiteSettings(EMPTY_SITE_SETTINGS);
      }
    }

    void loadHomeContent();
    void loadSiteSettings();
  }, []);

  useEffect(() => {
    if (!homeContent.mapSection.enabled) return;
    if (!homeContent.mapSection.useBrowserGeolocation) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
      },
      () => {
        /* Keep fallback coordinates */
      }
    );
  }, [
    homeContent.mapSection.enabled,
    homeContent.mapSection.useBrowserGeolocation,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Derived values                                                          */
  /* ---------------------------------------------------------------------- */

  const businessName = siteSettings.identity.siteName.trim() || "Sierra Tech";
  const businessLogotipo = normalizeImageSrc(siteSettings.identity.logoLight);

  const featuredCards = useMemo(() => {
    return homeContent.featuredCards
      .filter((card) => card.enabled)
      .sort((a, b) => a.order - b.order);
  }, [homeContent.featuredCards]);

  const showHeroBadge =
    homeContent.hero.badge.enabled &&
    hasLocalizedText(homeContent.hero.badge.text);

  const showHeroTitle = hasLocalizedText(homeContent.hero.title);
  const showHeroSubtitle = hasLocalizedText(homeContent.hero.subtitle);

  const showPrimaryCta =
    homeContent.hero.primaryCta.enabled &&
    hasLocalizedText(homeContent.hero.primaryCta.label);

  const showHighlightPanel =
    homeContent.highlightPanel.enabled &&
    hasLocalizedText(homeContent.highlightPanel.coverageLabel);

  const showCoverageSection = homeContent.coverageSection.enabled;
  const showCoverageEyebrow = hasLocalizedText(
    homeContent.coverageSection.eyebrow
  );
  const showCoverageTitle = hasLocalizedText(homeContent.coverageSection.title);
  const showCoverageDescription = hasLocalizedText(
    homeContent.coverageSection.description
  );
  const showCoverageNote = hasLocalizedText(homeContent.coverageSection.note);
  const showOpenMapsLabel = hasLocalizedText(
    homeContent.coverageSection.openMapsLabel
  );

  const showMapSection = homeContent.mapSection.enabled;

  const googleLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  const mapEmbedSrc = `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=${homeContent.mapSection.zoom}&output=embed`;

  const primaryCtaHref = homeContent.hero.primaryCta.href.trim() || "/contact";
  const primaryCtaLabel =
    getLocalizedText(homeContent.hero.primaryCta.label, lang).trim() ||
    (lang === "es" ? "Solicitar cotización" : "Request a quote");

  const servicesCtaLabel = lang === "es" ? "Ver servicios" : "View services";

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* ------------------------------------------------------------------- */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------- */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-lime-50/70">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-24 md:px-10 md:pb-16 md:pt-28 lg:pb-20 lg:pt-32">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-4xl">
              {showHeroBadge ? (
                <span className="inline-flex rounded-full border border-lime-200 bg-lime-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">
                  {getLocalizedText(homeContent.hero.badge.text, lang)}
                </span>
              ) : null}

              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-lime-700">
                {businessName}
              </p>

              {showHeroTitle ? (
                <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 md:text-5xl xl:text-6xl">
                  {getLocalizedText(homeContent.hero.title, lang)}
                </h1>
              ) : null}

              {showHeroSubtitle ? (
                <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                  {getLocalizedText(homeContent.hero.subtitle, lang)}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-4">
                {showPrimaryCta ? (
                  <Link
                    href={primaryCtaHref}
                    className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-400"
                  >
                    {primaryCtaLabel}
                  </Link>
                ) : null}

                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  {servicesCtaLabel}
                </Link>
              </div>

              {featuredCards.length > 0 ? (
                <div className="mt-12 grid gap-4 sm:grid-cols-2">
                  {featuredCards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-lime-300 hover:shadow-md"
                    >
                      <h2 className="text-base font-semibold text-slate-900 md:text-lg">
                        {getLocalizedText(card.title, lang)}
                      </h2>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col items-center text-center">
                  {businessLogotipo ? (
                    <Image
                      src={businessLogotipo}
                      alt={businessName ? `${businessName} logo` : "Business logo"}
                      width={320}
                      height={320}
                      priority
                      className="h-[320px] w-full object-contain"
                    />
                  ) : (
                    <div
                      className="h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50"
                      aria-label="Logo placeholder"
                    />
                  )}

                  <div className="mt-5 text-lg font-semibold text-slate-900">
                    {businessName}
                  </div>

                  {showHighlightPanel ? (
                    <div className="mt-3 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                      {getLocalizedText(
                        homeContent.highlightPanel.coverageLabel,
                        lang
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* Coverage + Map                                                      */}
      {/* ------------------------------------------------------------------- */}
      {showCoverageSection || showMapSection ? (
        <section className="mx-auto max-w-7xl px-6 py-14 md:px-10">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            {showCoverageSection ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                {showCoverageEyebrow ? (
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-700">
                    {getLocalizedText(homeContent.coverageSection.eyebrow, lang)}
                  </p>
                ) : null}

                {showCoverageTitle ? (
                  <h2 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">
                    {getLocalizedText(homeContent.coverageSection.title, lang)}
                  </h2>
                ) : null}

                {showCoverageDescription ? (
                  <p className="mt-4 text-base leading-8 text-slate-600">
                    {getLocalizedText(
                      homeContent.coverageSection.description,
                      lang
                    )}
                  </p>
                ) : null}

                {showCoverageNote ? (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    {getLocalizedText(homeContent.coverageSection.note, lang)}
                  </div>
                ) : null}

                {showOpenMapsLabel ? (
                  <button
                    type="button"
                    onClick={() =>
                      window.open(googleLink, "_blank", "noopener,noreferrer")
                    }
                    className="mt-6 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    {getLocalizedText(
                      homeContent.coverageSection.openMapsLabel,
                      lang
                    )}
                  </button>
                ) : null}
              </div>
            ) : (
              <div />
            )}

            {showMapSection ? (
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <iframe
                  src={mapEmbedSrc}
                  width="100%"
                  height="360"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  className="rounded-2xl"
                  title="Sierra Tech map reference"
                />
              </div>
            ) : (
              <div />
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}