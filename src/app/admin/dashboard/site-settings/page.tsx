"use client";

/**
 * =============================================================================
 * ✅ Page: Admin Site Settings
 * Path: src/app/admin/dashboard/site-settings/page.tsx
 * =============================================================================
 *
 * ES:
 *   Pantalla administrativa unificada del sitio público Sierra Tech.
 *
 *   Responsabilidad:
 *   - Cargar y editar SiteSettings y HomeSettings desde una sola pantalla.
 *   - Mantener separación clara entre configuración global y contenido editorial.
 *   - Guardar cada módulo en su endpoint correspondiente.
 *
 *   Estructura:
 *   - Bloque 1: Configuración global del sitio (SiteSettings)
 *   - Bloque 2: Contenido de portada (HomeSettings)
 *
 *   Reglas:
 *   - El bloque de cobertura, el botón de ubicación y el mapa son controles
 *     independientes.
 *   - Los labels del botón de ubicación se conservan aunque el botón esté
 *     oculto, para permitir reutilización futura sin perder contenido cargado.
 *   - La geolocalización del navegador solo tiene sentido si el mapa está
 *     habilitado.
 *   - Los bloques institucionales del Home deben permanecer completamente
 *     administrables desde esta pantalla.
 *
 * EN:
 *   Unified administrative screen for the Sierra Tech public website.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { Home as HomeIcon, Settings as SettingsIcon } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { useToast } from "@/components/ui/GlobalToastProvider";
import Image from "next/image";

import type {
  Locale,
  SiteSettingsPayload,
} from "@/lib/site-settings.contract";

import { SITE_SETTINGS_DEFAULTS } from "@/lib/site-settings.contract";
import {
  isAllowedRole,
  normalizeSiteSettingsPayload,
  safeNumberFromInput,
} from "@/lib/site-settings.normalize";

import {
  uploadAdminFile,
  type UploadedAdminFile,
} from "@/lib/adminUploadsClient";

import { notifyBrandingUpdated } from "@/lib/publicBranding";

/* -------------------------------------------------------------------------- */
/* Home contract                                                              */
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
  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

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

/* -------------------------------------------------------------------------- */
/* Home normalization                                                         */
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
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value;
}

function normalizeLocalizedText(
  value: unknown,
  fallback: LocalizedText = { es: "", en: "" }
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
      return normalizeLocalizedText(item);
    })
    .filter((item): item is LocalizedText => item !== null);
}

function normalizeHomeCta(value: unknown, fallbackEnabled = true): HomeCta {
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

  return value
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
}

function normalizeWhyChooseUsItems(value: unknown): WhyChooseUsItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): WhyChooseUsItem | null => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;

      return {
        title: normalizeLocalizedText(record.title),
        description: normalizeLocalizedText(record.description),
      };
    })
    .filter((item): item is WhyChooseUsItem => item !== null);
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
  const aboutSection = (record.aboutSection ?? {}) as Record<string, unknown>;
  const leadershipSection = (record.leadershipSection ?? {}) as Record<
    string,
    unknown
  >;
  const whyChooseUs = (record.whyChooseUs ?? {}) as Record<string, unknown>;
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
      primaryCta: normalizeHomeCta(hero.primaryCta, true),
      secondaryCta: normalizeHomeCta(hero.secondaryCta, true),
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
      showOpenMapsLink: normalizeBoolean(
        coverageSection.showOpenMapsLink,
        HOME_DEFAULTS.coverageSection.showOpenMapsLink
      ),
      enabled: normalizeBoolean(
        coverageSection.enabled,
        HOME_DEFAULTS.coverageSection.enabled
      ),
    },
    aboutSection: {
      eyebrow: normalizeLocalizedText(aboutSection.eyebrow),
      title: normalizeLocalizedText(aboutSection.title),
      description: normalizeLocalizedText(aboutSection.description),
      highlights: normalizeLocalizedTextArray(aboutSection.highlights),
      enabled: normalizeBoolean(
        aboutSection.enabled,
        HOME_DEFAULTS.aboutSection.enabled
      ),
    },
    leadershipSection: {
      name: normalizeString(leadershipSection.name),
      role: normalizeLocalizedText(leadershipSection.role),
      message: normalizeLocalizedText(leadershipSection.message),
      imageUrl: normalizeString(leadershipSection.imageUrl),
      enabled: normalizeBoolean(
        leadershipSection.enabled,
        HOME_DEFAULTS.leadershipSection.enabled
      ),
    },
    whyChooseUs: {
      title: normalizeLocalizedText(whyChooseUs.title),
      items: normalizeWhyChooseUsItems(whyChooseUs.items),
      enabled: normalizeBoolean(
        whyChooseUs.enabled,
        HOME_DEFAULTS.whyChooseUs.enabled
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

/* -------------------------------------------------------------------------- */
/* Small UI helpers                                                           */
/* -------------------------------------------------------------------------- */

function SectionDivider(props: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-6 py-5 shadow-sm">
      <div className="flex items-start gap-4">
        {props.icon ? <div className="mt-0.5 shrink-0">{props.icon}</div> : null}

        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            {props.title}
          </h2>
          {props.subtitle ? (
            <p className="mt-1 text-sm text-text-secondary">{props.subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionCard(props: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-text-primary">
          {props.title}
        </h3>
        {props.subtitle ? (
          <p className="mt-1 text-sm text-text-secondary">{props.subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-5">{props.children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-text-primary">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${
        props.className ?? ""
      }`}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${
        props.className ?? ""
      }`}
    />
  );
}

function Toggle(props: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`inline-flex items-center gap-3 text-sm ${
        props.disabled
          ? "cursor-not-allowed text-text-secondary opacity-60"
          : "cursor-pointer text-text-primary"
      }`}
    >
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border"
      />
      <span>{props.label}</span>
    </label>
  );
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50 ${
        props.className ?? ""
      }`}
    />
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${
        props.className ?? ""
      }`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SiteSettingsPage() {
  const { locale } = useTranslation();
  const lang: Locale = locale === "es" ? "es" : "en";

  const { data: session, status } = useSession();
  const toast = useToast();

  const [siteForm, setSiteForm] =
    useState<SiteSettingsPayload>(SITE_SETTINGS_DEFAULTS);
  const [siteInitialData, setSiteInitialData] =
    useState<SiteSettingsPayload>(SITE_SETTINGS_DEFAULTS);

  const [homeForm, setHomeForm] = useState<HomePayload>(HOME_DEFAULTS);
  const [homeInitialData, setHomeInitialData] =
    useState<HomePayload>(HOME_DEFAULTS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [uploadingLeadershipImage, setUploadingLeadershipImage] = useState(false);

  const hasLoadedInitialDataRef = useRef(false);

  const [uploadingLogoLight, setUploadingLogoLight] = useState(false);

  const role = session?.user?.role;
  const hasAccess = isAllowedRole(role);

  const hasUnsavedChanges = useMemo(() => {
    return (
      JSON.stringify(siteForm) !== JSON.stringify(siteInitialData) ||
      JSON.stringify(homeForm) !== JSON.stringify(homeInitialData)
    );
  }, [siteForm, siteInitialData, homeForm, homeInitialData]);

  useEffect(() => {
    async function loadAll() {
      try {
        const [siteResponse, homeResponse] = await Promise.all([
          fetch("/api/admin/site-settings", {
            method: "GET",
            cache: "no-store",
          }),
          fetch("/api/admin/home", {
            method: "GET",
            cache: "no-store",
          }),
        ]);

        if (!siteResponse.ok) {
          throw new Error(`SITE_HTTP_${siteResponse.status}`);
        }

        if (!homeResponse.ok) {
          throw new Error(`HOME_HTTP_${homeResponse.status}`);
        }

        const sitePayload: unknown = await siteResponse.json().catch(() => null);
        const homePayload: unknown = await homeResponse.json().catch(() => null);

        const normalizedSite = normalizeSiteSettingsPayload(sitePayload);
        const normalizedHome = normalizeHomePayload(homePayload);

        setSiteForm(normalizedSite);
        setSiteInitialData(normalizedSite);

        setHomeForm(normalizedHome);
        setHomeInitialData(normalizedHome);

        hasLoadedInitialDataRef.current = true;
      } catch (error) {
        console.error("[SiteSettingsPage] Error loading configuration:", error);
        toast.error(
          lang === "es"
            ? "No se pudo cargar la configuración."
            : "Could not load configuration."
        );
      } finally {
        setLoading(false);
      }
    }

    if (status !== "authenticated" || !hasAccess) {
      setLoading(false);
      return;
    }

    if (hasLoadedInitialDataRef.current) {
      return;
    }

    void loadAll();
  }, [status, hasAccess, lang, toast]);

  async function handleSave(): Promise<void> {
    try {
      setSaving(true);

      const [siteResponse, homeResponse] = await Promise.all([
        fetch("/api/admin/site-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(siteForm),
        }),
        fetch("/api/admin/home", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(homeForm),
        }),
      ]);

      if (!siteResponse.ok) {
        throw new Error(`SITE_SAVE_HTTP_${siteResponse.status}`);
      }

      if (!homeResponse.ok) {
        throw new Error(`HOME_SAVE_HTTP_${homeResponse.status}`);
      }

      const sitePayload: unknown = await siteResponse.json().catch(() => siteForm);
      const homePayload: unknown = await homeResponse.json().catch(() => homeForm);

      const normalizedSite = normalizeSiteSettingsPayload(sitePayload);
      const normalizedHome = normalizeHomePayload(homePayload);

      setSiteForm(normalizedSite);
      setSiteInitialData(normalizedSite);

      setHomeForm(normalizedHome);
      setHomeInitialData(normalizedHome);

      notifyBrandingUpdated();

      toast.success(
        lang === "es"
          ? "Configuración guardada correctamente."
          : "Configuration saved successfully."
      );
    } catch (error) {
      console.error("[SiteSettingsPage] Error saving configuration:", error);
      toast.error(
        lang === "es"
          ? "Error al guardar la configuración."
          : "Error saving configuration."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleReset(): void {
    setSiteForm(siteInitialData);
    setHomeForm(homeInitialData);
  }

  /* ---------------------------------------------------------------------- */
  /* Site form updaters                                                     */
  /* ---------------------------------------------------------------------- */

  function updateIdentityField(
    field: "siteName" | "siteNameShort" | "logoLight" | "logoDark" | "favicon",
    value: string
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        [field]: value,
      },
    }));
  }

  function updateIdentityTagline(localeKey: Locale, value: string): void {
    setSiteForm((prev) => ({
      ...prev,
      identity: {
        ...prev.identity,
        tagline: {
          ...prev.identity.tagline,
          [localeKey]: value,
        },
      },
    }));
  }

  async function handleLogoLightUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      return;
    }

    try {
      setUploadingLogoLight(true);

      const result = await uploadAdminFile(
        selectedFile,
        "site-settings/logos"
      );

      if (!result.ok || !result.file) {
        toast.error(
          lang === "es"
            ? result.message || "No se pudo subir el logo."
            : result.message || "Could not upload the logo."
        );
        return;
      }

      const uploadedFile: UploadedAdminFile = result.file;

      updateIdentityField("logoLight", uploadedFile.fileKey);

      toast.success(
        lang === "es"
          ? "Logo Light subido correctamente."
          : "Logo Light uploaded successfully."
      );
    } catch (error) {
      console.error("[SiteSettingsPage] Logo Light upload error:", error);

      toast.error(
        lang === "es"
          ? "Ocurrió un error al subir el logo."
          : "An error occurred while uploading the logo."
      );
    } finally {
      setUploadingLogoLight(false);
      event.target.value = "";
    }
  }

  function updateContactField(
    field:
      | "primaryEmail"
      | "secondaryEmail"
      | "phonePrimary"
      | "phoneSecondary"
      | "whatsapp"
      | "addressLine1"
      | "addressLine2"
      | "city"
      | "country",
    value: string
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value,
      },
    }));
  }

  function updateSocialLinkField(
    field: "facebook" | "instagram" | "linkedin" | "youtube" | "x",
    value: string
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [field]: value,
      },
    }));
  }

  function updateGlobalCtaLabel(localeKey: Locale, value: string): void {
    setSiteForm((prev) => ({
      ...prev,
      globalPrimaryCta: {
        ...prev.globalPrimaryCta,
        label: {
          ...prev.globalPrimaryCta.label,
          [localeKey]: value,
        },
      },
    }));
  }

  function updateGlobalCtaField(
    field: "href" | "enabled",
    value: string | boolean
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      globalPrimaryCta: {
        ...prev.globalPrimaryCta,
        [field]: value,
      },
    }));
  }

  function updateFooterAboutText(localeKey: Locale, value: string): void {
    setSiteForm((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        aboutText: {
          ...prev.footer.aboutText,
          [localeKey]: value,
        },
      },
    }));
  }

  function updateFooterField(
    field: "copyrightText" | "legalLinksEnabled",
    value: string | boolean
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      footer: {
        ...prev.footer,
        [field]: value,
      },
    }));
  }

  function updateSeoLocalizedField(
    field: "defaultTitle" | "defaultDescription",
    localeKey: Locale,
    value: string
  ): void {
    setSiteForm((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: {
          ...prev.seo[field],
          [localeKey]: value,
        },
      },
    }));
  }

  function updateSeoField(field: "defaultOgImage", value: string): void {
    setSiteForm((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        [field]: value,
      },
    }));
  }

  function updateI18nDefaultLocale(value: Locale): void {
    setSiteForm((prev) => ({
      ...prev,
      i18n: {
        ...prev.i18n,
        defaultLocale: value,
      },
    }));
  }

  function updateI18nSupportedLocales(value: Locale[]): void {
    setSiteForm((prev) => ({
      ...prev,
      i18n: {
        ...prev.i18n,
        supportedLocales: value,
        defaultLocale: value.includes(prev.i18n.defaultLocale)
          ? prev.i18n.defaultLocale
          : value[0] ?? "es",
      },
    }));
  }

  /* ---------------------------------------------------------------------- */
  /* Home form updaters                                                     */
  /* ---------------------------------------------------------------------- */

  function updateHomeHeroBadge(localeKey: Locale, value: string): void {
    setHomeForm((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        badge: {
          ...prev.hero.badge,
          text: {
            ...prev.hero.badge.text,
            [localeKey]: value,
          },
        },
      },
    }));
  }

  function updateHomeHeroBadgeEnabled(value: boolean): void {
    setHomeForm((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        badge: {
          ...prev.hero.badge,
          enabled: value,
        },
      },
    }));
  }

  function updateHomeHeroField(
    field: "title" | "subtitle",
    localeKey: Locale,
    value: string
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [field]: {
          ...prev.hero[field],
          [localeKey]: value,
        },
      },
    }));
  }

  function updateHomeCtaLabel(
    ctaKey: "primaryCta" | "secondaryCta",
    localeKey: Locale,
    value: string
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [ctaKey]: {
          ...prev.hero[ctaKey],
          label: {
            ...prev.hero[ctaKey].label,
            [localeKey]: value,
          },
        },
      },
    }));
  }

  function updateHomeCtaField(
    ctaKey: "primaryCta" | "secondaryCta",
    field: "href" | "enabled",
    value: string | boolean
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [ctaKey]: {
          ...prev.hero[ctaKey],
          [field]: value,
        },
      },
    }));
  }

  function updateHighlightPanelLabel(localeKey: Locale, value: string): void {
    setHomeForm((prev) => ({
      ...prev,
      highlightPanel: {
        ...prev.highlightPanel,
        coverageLabel: {
          ...prev.highlightPanel.coverageLabel,
          [localeKey]: value,
        },
      },
    }));
  }

  function updateHighlightPanelEnabled(value: boolean): void {
    setHomeForm((prev) => ({
      ...prev,
      highlightPanel: {
        ...prev.highlightPanel,
        enabled: value,
      },
    }));
  }

  function updateCoverageSectionField(
    field: "eyebrow" | "title" | "description" | "note" | "openMapsLabel",
    localeKey: Locale,
    value: string
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      coverageSection: {
        ...prev.coverageSection,
        [field]: {
          ...prev.coverageSection[field],
          [localeKey]: value,
        },
      },
    }));
  }

  function updateCoverageSectionEnabled(value: boolean): void {
    setHomeForm((prev) => ({
      ...prev,
      coverageSection: {
        ...prev.coverageSection,
        enabled: value,
      },
    }));
  }

  function updateCoverageSectionShowOpenMapsLink(value: boolean): void {
    setHomeForm((prev) => ({
      ...prev,
      coverageSection: {
        ...prev.coverageSection,
        showOpenMapsLink: value,
      },
    }));
  }

  function updateAboutSectionField(
    field: "eyebrow" | "title" | "description",
    localeKey: Locale,
    value: string
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      aboutSection: {
        ...prev.aboutSection,
        [field]: {
          ...prev.aboutSection[field],
          [localeKey]: value,
        },
      },
    }));
  }

  function updateAboutSectionEnabled(value: boolean): void {
    setHomeForm((prev) => ({
      ...prev,
      aboutSection: {
        ...prev.aboutSection,
        enabled: value,
      },
    }));
  }

  function addAboutHighlight(): void {
    setHomeForm((prev) => ({
      ...prev,
      aboutSection: {
        ...prev.aboutSection,
        highlights: [
          ...prev.aboutSection.highlights,
          { es: "", en: "" },
        ],
      },
    }));
  }

  function removeAboutHighlight(index: number): void {
    setHomeForm((prev) => ({
      ...prev,
      aboutSection: {
        ...prev.aboutSection,
        highlights: prev.aboutSection.highlights.filter(
          (_, idx) => idx !== index
        ),
      },
    }));
  }

  function updateAboutHighlight(
    index: number,
    localeKey: Locale,
    value: string
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      aboutSection: {
        ...prev.aboutSection,
        highlights: prev.aboutSection.highlights.map((item, idx) =>
          idx === index
            ? {
                ...item,
                [localeKey]: value,
              }
            : item
        ),
      },
    }));
  }

  function updateLeadershipName(value: string): void {
    setHomeForm((prev) => ({
      ...prev,
      leadershipSection: {
        ...prev.leadershipSection,
        name: value,
      },
    }));
  }

  function updateLeadershipField(
    field: "role" | "message",
    localeKey: Locale,
    value: string
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      leadershipSection: {
        ...prev.leadershipSection,
        [field]: {
          ...prev.leadershipSection[field],
          [localeKey]: value,
        },
      },
    }));
  }

  function updateLeadershipEnabled(value: boolean): void {
    setHomeForm((prev) => ({
      ...prev,
      leadershipSection: {
        ...prev.leadershipSection,
        enabled: value,
      },
    }));
  }

  function updateWhyChooseUsTitle(localeKey: Locale, value: string): void {
    setHomeForm((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        title: {
          ...prev.whyChooseUs.title,
          [localeKey]: value,
        },
      },
    }));
  }

  function updateWhyChooseUsEnabled(value: boolean): void {
    setHomeForm((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        enabled: value,
      },
    }));
  }

  function addWhyChooseUsItem(): void {
    setHomeForm((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        items: [
          ...prev.whyChooseUs.items,
          {
            title: { es: "", en: "" },
            description: { es: "", en: "" },
          },
        ],
      },
    }));
  }

  function removeWhyChooseUsItem(index: number): void {
    setHomeForm((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        items: prev.whyChooseUs.items.filter((_, idx) => idx !== index),
      },
    }));
  }

  function updateWhyChooseUsItemField(
    index: number,
    field: "title" | "description",
    localeKey: Locale,
    value: string
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      whyChooseUs: {
        ...prev.whyChooseUs,
        items: prev.whyChooseUs.items.map((item, idx) =>
          idx === index
            ? {
                ...item,
                [field]: {
                  ...item[field],
                  [localeKey]: value,
                },
              }
            : item
        ),
      },
    }));
  }

  function updateMapSectionField(
    field: "enabled" | "useBrowserGeolocation" | "zoom",
    value: boolean | number
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      mapSection: {
        ...prev.mapSection,
        [field]: value,
      },
    }));
  }

  function updateMapSectionCoordinate(
    field: "fallbackLat" | "fallbackLng",
    value: number | null
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      mapSection: {
        ...prev.mapSection,
        [field]: value,
      },
    }));
  }

  function addFeaturedCard(): void {
    setHomeForm((prev) => ({
      ...prev,
      featuredCards: [
        ...prev.featuredCards,
        {
          id: `card-${prev.featuredCards.length + 1}`,
          title: { es: "", en: "" },
          description: { es: "", en: "" },
          order: prev.featuredCards.length + 1,
          enabled: true,
        },
      ],
    }));
  }

  function removeFeaturedCard(index: number): void {
    setHomeForm((prev) => {
      const next = prev.featuredCards
        .filter((_, idx) => idx !== index)
        .map((card, idx) => ({
          ...card,
          order: idx + 1,
        }));

      return {
        ...prev,
        featuredCards: next,
      };
    });
  }

  function updateFeaturedCardField(
    index: number,
    field: "enabled",
    value: boolean
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      featuredCards: prev.featuredCards.map((card, idx) =>
        idx === index
          ? {
              ...card,
              [field]: value,
            }
          : card
      ),
    }));
  }

  function updateFeaturedCardText(
    index: number,
    field: "title" | "description",
    localeKey: Locale,
    value: string
  ): void {
    setHomeForm((prev) => ({
      ...prev,
      featuredCards: prev.featuredCards.map((card, idx) =>
        idx === index
          ? {
              ...card,
              [field]: {
                ...card[field],
                [localeKey]: value,
              },
            }
          : card
      ),
    }));
  }

  /* ---------------------------------------------------------------------- */
  /* Guards                                                                  */
  /* ---------------------------------------------------------------------- */

  if (status === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {lang === "es" ? "Cargando sesión..." : "Loading session..."}
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
          {lang === "es"
            ? "Acceso restringido a administradores."
            : "Admin access only."}
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
          {lang === "es"
            ? "Cargando configuración..."
            : "Loading configuration..."}
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <main className="space-y-6">
      <AdminPageHeader
        icon={<SettingsIcon className="h-6 w-6 text-brand-primaryStrong" />}
        title={lang === "es" ? "Sitio Público" : "Public Website"}
        subtitle={
          lang === "es"
            ? "Administra la configuración global y el contenido de portada desde una sola pantalla."
            : "Manage global settings and homepage content from a single screen."
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton
          disabled={!hasUnsavedChanges || saving}
          onClick={handleSave}
        >
          {saving
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
              ? "Guardar cambios"
              : "Save changes"}
        </PrimaryButton>

        <ActionButton
          disabled={!hasUnsavedChanges || saving}
          onClick={handleReset}
        >
          {lang === "es" ? "Restaurar" : "Reset"}
        </ActionButton>

        <span className="text-sm text-text-secondary">
          {hasUnsavedChanges
            ? lang === "es"
              ? "Hay cambios sin guardar."
              : "There are unsaved changes."
            : lang === "es"
              ? "Sin cambios pendientes."
              : "No pending changes."}
        </span>
      </div>

      <SectionDivider
        icon={<SettingsIcon className="h-6 w-6 text-brand-primaryStrong" />}
        title={
          lang === "es"
            ? "Configuración global del sitio"
            : "Global site configuration"
        }
        subtitle={
          lang === "es"
            ? "Identidad, contacto, cobertura global, redes, footer, SEO e idioma."
            : "Identity, contact, global coverage, social links, footer, SEO and language."
        }
      />

      <SectionCard
        title={lang === "es" ? "Identidad del sitio" : "Site identity"}
        subtitle={
          lang === "es"
            ? "Define nombre comercial, slogans y assets principales."
            : "Define the business name, slogans and primary assets."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Nombre del sitio" : "Site name"}
            </FieldLabel>
            <TextInput
              value={siteForm.identity.siteName}
              onChange={(e) => updateIdentityField("siteName", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Nombre corto" : "Short name"}
            </FieldLabel>
            <TextInput
              value={siteForm.identity.siteNameShort}
              onChange={(e) =>
                updateIdentityField("siteNameShort", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Slogan ES</FieldLabel>
            <TextArea
              value={siteForm.identity.tagline.es}
              onChange={(e) => updateIdentityTagline("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Slogan EN</FieldLabel>
            <TextArea
              value={siteForm.identity.tagline.en}
              onChange={(e) => updateIdentityTagline("en", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <FieldLabel>Logo Light</FieldLabel>

            <div className="space-y-3">
              <TextInput
                value={siteForm.identity.logoLight}
                onChange={(e) => updateIdentityField("logoLight", e.target.value)}
                placeholder="admin/site-settings/logos/..."
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    className="hidden"
                    onChange={handleLogoLightUpload}
                    disabled={uploadingLogoLight || saving}
                  />
                  {uploadingLogoLight
                    ? lang === "es"
                      ? "Subiendo..."
                      : "Uploading..."
                    : lang === "es"
                      ? "Subir Logo Light"
                      : "Upload Logo Light"}
                </label>

                {siteForm.identity.logoLight ? (
                  <span className="text-xs text-text-secondary">
                    {siteForm.identity.logoLight}
                  </span>
                ) : null}
              </div>

              {siteForm.identity.logoLight ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                    {lang === "es" ? "Vista previa" : "Preview"}
                  </div>

                  <Image
                    src={`/api/admin/uploads/view?key=${encodeURIComponent(
                      siteForm.identity.logoLight
                    )}`}
                    alt="Logo Light Preview"
                    width={240}
                    height={96}
                    unoptimized
                    className="max-h-24 w-auto object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <FieldLabel>Logo Dark</FieldLabel>

            <div className="space-y-3">
              <TextInput
                value={siteForm.identity.logoDark}
                onChange={(e) => updateIdentityField("logoDark", e.target.value)}
                placeholder="admin/site-settings/logos/..."
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;

                      try {
                        const result = await uploadAdminFile(
                          file,
                          "site-settings/logos"
                        );

                        if (!result.ok || !result.file) {
                          toast.error(
                            lang === "es"
                              ? result.message || "No se pudo subir el logo."
                              : result.message || "Could not upload the logo."
                          );
                          return;
                        }

                        updateIdentityField("logoDark", result.file.fileKey);

                        toast.success(
                          lang === "es"
                            ? "Logo Dark subido correctamente."
                            : "Logo Dark uploaded successfully."
                        );
                      } catch (error) {
                        console.error("Logo Dark upload error:", error);

                        toast.error(
                          lang === "es"
                            ? "Error al subir el logo."
                            : "Upload error."
                        );
                      } finally {
                        e.target.value = "";
                      }
                    }}
                    disabled={saving}
                  />
                  {lang === "es" ? "Subir Logo Dark" : "Upload Logo Dark"}
                </label>

                {siteForm.identity.logoDark ? (
                  <span className="text-xs text-text-secondary">
                    {siteForm.identity.logoDark}
                  </span>
                ) : null}
              </div>

              {siteForm.identity.logoDark ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                    {lang === "es" ? "Vista previa" : "Preview"}
                  </div>

                  <Image
                    src={`/api/admin/uploads/view?key=${encodeURIComponent(
                      siteForm.identity.logoDark
                    )}`}
                    alt="Logo Dark Preview"
                    width={240}
                    height={96}
                    unoptimized
                    className="max-h-24 w-auto object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <FieldLabel>Favicon</FieldLabel>

            <div className="space-y-3">
              <TextInput
                value={siteForm.identity.favicon}
                onChange={(e) => updateIdentityField("favicon", e.target.value)}
                placeholder="admin/site-settings/favicons/..."
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                  <input
                    type="file"
                    accept=".png,.ico,.svg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;

                      try {
                        const result = await uploadAdminFile(
                          file,
                          "site-settings/favicons"
                        );

                        if (!result.ok || !result.file) {
                          toast.error(
                            lang === "es"
                              ? result.message || "No se pudo subir el favicon."
                              : result.message || "Could not upload the favicon."
                          );
                          return;
                        }

                        updateIdentityField("favicon", result.file.fileKey);

                        toast.success(
                          lang === "es"
                            ? "Favicon subido correctamente."
                            : "Favicon uploaded successfully."
                        );
                      } catch (error) {
                        console.error("Favicon upload error:", error);

                        toast.error(
                          lang === "es"
                            ? "Error al subir el favicon."
                            : "Upload error."
                        );
                      } finally {
                        e.target.value = "";
                      }
                    }}
                    disabled={saving}
                  />
                  {lang === "es" ? "Subir Favicon" : "Upload Favicon"}
                </label>

                {siteForm.identity.favicon ? (
                  <span className="text-xs text-text-secondary">
                    {siteForm.identity.favicon}
                  </span>
                ) : null}
              </div>

              {siteForm.identity.favicon ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                    {lang === "es" ? "Vista previa" : "Preview"}
                  </div>

                  <Image
                    src={`/api/admin/uploads/view?key=${encodeURIComponent(
                      siteForm.identity.favicon
                    )}`}
                    alt="Favicon Preview"
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Contacto" : "Contact"}
        subtitle={
          lang === "es"
            ? "Configura correos, teléfonos y dirección visible del sitio."
            : "Configure public email, phone and address information."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Correo principal" : "Primary email"}
            </FieldLabel>
            <TextInput
              type="email"
              value={siteForm.contact.primaryEmail}
              onChange={(e) =>
                updateContactField("primaryEmail", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Correo secundario" : "Secondary email"}
            </FieldLabel>
            <TextInput
              type="email"
              value={siteForm.contact.secondaryEmail}
              onChange={(e) =>
                updateContactField("secondaryEmail", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <FieldLabel>
              {lang === "es" ? "Teléfono principal" : "Primary phone"}
            </FieldLabel>
            <TextInput
              value={siteForm.contact.phonePrimary}
              onChange={(e) =>
                updateContactField("phonePrimary", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Teléfono secundario" : "Secondary phone"}
            </FieldLabel>
            <TextInput
              value={siteForm.contact.phoneSecondary}
              onChange={(e) =>
                updateContactField("phoneSecondary", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>WhatsApp</FieldLabel>
            <TextInput
              value={siteForm.contact.whatsapp}
              onChange={(e) => updateContactField("whatsapp", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Dirección línea 1" : "Address line 1"}
            </FieldLabel>
            <TextInput
              value={siteForm.contact.addressLine1}
              onChange={(e) =>
                updateContactField("addressLine1", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Dirección línea 2" : "Address line 2"}
            </FieldLabel>
            <TextInput
              value={siteForm.contact.addressLine2}
              onChange={(e) =>
                updateContactField("addressLine2", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Ciudad" : "City"}</FieldLabel>
            <TextInput
              value={siteForm.contact.city}
              onChange={(e) => updateContactField("city", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "País" : "Country"}</FieldLabel>
            <TextInput
              value={siteForm.contact.country}
              onChange={(e) => updateContactField("country", e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Redes sociales" : "Social links"}
        subtitle={
          lang === "es"
            ? "Enlaces públicos a redes y canales corporativos."
            : "Public links to social and corporate channels."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Facebook</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.facebook}
              onChange={(e) => updateSocialLinkField("facebook", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Instagram</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.instagram}
              onChange={(e) =>
                updateSocialLinkField("instagram", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>LinkedIn</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.linkedin}
              onChange={(e) => updateSocialLinkField("linkedin", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>YouTube</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.youtube}
              onChange={(e) => updateSocialLinkField("youtube", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>X / Twitter</FieldLabel>
            <TextInput
              value={siteForm.socialLinks.x}
              onChange={(e) => updateSocialLinkField("x", e.target.value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "CTA global" : "Global CTA"}
        subtitle={
          lang === "es"
            ? "Botón principal reutilizable a nivel global del sitio."
            : "Reusable primary button across the website."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Label ES</FieldLabel>
            <TextInput
              value={siteForm.globalPrimaryCta.label.es}
              onChange={(e) => updateGlobalCtaLabel("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Label EN</FieldLabel>
            <TextInput
              value={siteForm.globalPrimaryCta.label.en}
              onChange={(e) => updateGlobalCtaLabel("en", e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Href</FieldLabel>
          <TextInput
            value={siteForm.globalPrimaryCta.href}
            onChange={(e) => updateGlobalCtaField("href", e.target.value)}
          />
        </div>

        <Toggle
          label={lang === "es" ? "CTA global activo" : "Global CTA enabled"}
          checked={siteForm.globalPrimaryCta.enabled}
          onChange={(value) => updateGlobalCtaField("enabled", value)}
        />
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Footer" : "Footer"}
        subtitle={
          lang === "es"
            ? "Configura el texto institucional y opciones del pie de página."
            : "Configure institutional text and footer options."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es"
                ? "Texto institucional ES"
                : "Institutional text ES"}
            </FieldLabel>
            <TextArea
              value={siteForm.footer.aboutText.es}
              onChange={(e) => updateFooterAboutText("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es"
                ? "Texto institucional EN"
                : "Institutional text EN"}
            </FieldLabel>
            <TextArea
              value={siteForm.footer.aboutText.en}
              onChange={(e) => updateFooterAboutText("en", e.target.value)}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Copyright</FieldLabel>
          <TextInput
            value={siteForm.footer.copyrightText}
            onChange={(e) => updateFooterField("copyrightText", e.target.value)}
          />
        </div>

        <Toggle
          label={lang === "es" ? "Mostrar links legales" : "Show legal links"}
          checked={siteForm.footer.legalLinksEnabled}
          onChange={(value) => updateFooterField("legalLinksEnabled", value)}
        />
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "SEO global" : "Global SEO"}
        subtitle={
          lang === "es"
            ? "Metadatos por defecto del sitio."
            : "Default metadata for the website."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Title ES</FieldLabel>
            <TextInput
              value={siteForm.seo.defaultTitle.es}
              onChange={(e) =>
                updateSeoLocalizedField("defaultTitle", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Title EN</FieldLabel>
            <TextInput
              value={siteForm.seo.defaultTitle.en}
              onChange={(e) =>
                updateSeoLocalizedField("defaultTitle", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Description ES</FieldLabel>
            <TextArea
              value={siteForm.seo.defaultDescription.es}
              onChange={(e) =>
                updateSeoLocalizedField(
                  "defaultDescription",
                  "es",
                  e.target.value
                )
              }
            />
          </div>

          <div>
            <FieldLabel>Description EN</FieldLabel>
            <TextArea
              value={siteForm.seo.defaultDescription.en}
              onChange={(e) =>
                updateSeoLocalizedField(
                  "defaultDescription",
                  "en",
                  e.target.value
                )
              }
            />
          </div>
        </div>

        <div>
          <FieldLabel>OG Image</FieldLabel>

          <div className="space-y-3">
            <TextInput
              value={siteForm.seo.defaultOgImage}
              onChange={(e) => updateSeoField("defaultOgImage", e.target.value)}
              placeholder="admin/home/sections/... o /assets/..."
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.svg"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) return;

                    try {
                      setUploadingOgImage(true);

                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("scope", "home/sections");

                      const res = await fetch("/api/admin/uploads", {
                        method: "POST",
                        body: formData,
                      });

                      const data = await res.json().catch(() => null);

                      if (!res.ok || !data?.ok || !data?.file?.fileKey) {
                        throw new Error("Upload failed");
                      }

                      updateSeoField("defaultOgImage", data.file.fileKey);
                    } catch (error) {
                      console.error("Error uploading OG image:", error);
                    } finally {
                      setUploadingOgImage(false);
                      e.target.value = "";
                    }
                  }}
                  disabled={uploadingOgImage || saving}
                />
                {uploadingOgImage
                  ? lang === "es"
                    ? "Subiendo..."
                    : "Uploading..."
                  : "Subir OG Image"}
              </label>

              {siteForm.seo.defaultOgImage ? (
                <span className="text-xs text-text-secondary">
                  {siteForm.seo.defaultOgImage}
                </span>
              ) : null}
            </div>

            {siteForm.seo.defaultOgImage ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                  {lang === "es" ? "Vista previa" : "Preview"}
                </div>

                <Image
                  src={
                    siteForm.seo.defaultOgImage.startsWith("admin/")
                      ? `/api/admin/uploads/view?key=${encodeURIComponent(
                          siteForm.seo.defaultOgImage
                        )}`
                      : siteForm.seo.defaultOgImage
                  }
                  alt="OG Image Preview"
                  width={320}
                  height={180}
                  unoptimized
                  className="max-h-40 w-auto object-contain"
                />
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Idioma" : "Language"}
        subtitle={
          lang === "es"
            ? "Configura idioma por defecto y locales soportados."
            : "Configure default locale and supported locales."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Idioma por defecto" : "Default locale"}
            </FieldLabel>
            <select
              value={siteForm.i18n.defaultLocale}
              onChange={(e) => updateI18nDefaultLocale(e.target.value as Locale)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
            >
              <option value="es">ES</option>
              <option value="en">EN</option>
            </select>
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Locales soportados" : "Supported locales"}
            </FieldLabel>
            <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-background px-3 py-3">
              <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={siteForm.i18n.supportedLocales.includes("es")}
                  onChange={(e) => {
                    const next: Locale[] = e.target.checked
                      ? Array.from(
                          new Set<Locale>([
                            ...siteForm.i18n.supportedLocales,
                            "es",
                          ])
                        )
                      : siteForm.i18n.supportedLocales.filter(
                          (item): item is Locale => item !== "es"
                        );

                    updateI18nSupportedLocales(next);
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                ES
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={siteForm.i18n.supportedLocales.includes("en")}
                  onChange={(e) => {
                    const next: Locale[] = e.target.checked
                      ? Array.from(
                          new Set<Locale>([
                            ...siteForm.i18n.supportedLocales,
                            "en",
                          ])
                        )
                      : siteForm.i18n.supportedLocales.filter(
                          (item): item is Locale => item !== "en"
                        );

                    updateI18nSupportedLocales(next);
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                EN
              </label>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionDivider
        icon={<HomeIcon className="h-6 w-6 text-brand-primaryStrong" />}
        title={lang === "es" ? "Contenido de portada" : "Homepage content"}
        subtitle={
          lang === "es"
            ? "Hero principal, destaque, cards, cobertura, bloques institucionales y mapa del Home."
            : "Main hero, highlight panel, cards, coverage, institutional blocks and homepage map."
        }
      />

      <SectionCard
        title={lang === "es" ? "Hero principal" : "Main hero"}
        subtitle={
          lang === "es"
            ? "Contenido principal visible en la portada."
            : "Main content visible on the public homepage."
        }
      >
        <Toggle
          label={lang === "es" ? "Mostrar badge" : "Show badge"}
          checked={homeForm.hero.badge.enabled}
          onChange={updateHomeHeroBadgeEnabled}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Badge ES</FieldLabel>
            <TextInput
              value={homeForm.hero.badge.text.es}
              onChange={(e) => updateHomeHeroBadge("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Badge EN</FieldLabel>
            <TextInput
              value={homeForm.hero.badge.text.en}
              onChange={(e) => updateHomeHeroBadge("en", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Título ES</FieldLabel>
            <TextArea
              value={homeForm.hero.title.es}
              onChange={(e) =>
                updateHomeHeroField("title", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Title EN</FieldLabel>
            <TextArea
              value={homeForm.hero.title.en}
              onChange={(e) =>
                updateHomeHeroField("title", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Subtítulo ES</FieldLabel>
            <TextArea
              value={homeForm.hero.subtitle.es}
              onChange={(e) =>
                updateHomeHeroField("subtitle", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Subtitle EN</FieldLabel>
            <TextArea
              value={homeForm.hero.subtitle.en}
              onChange={(e) =>
                updateHomeHeroField("subtitle", "en", e.target.value)
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "CTAs del hero" : "Hero CTAs"}
        subtitle={
          lang === "es"
            ? "Botones principales del bloque hero."
            : "Primary buttons shown in the hero section."
        }
      >
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-4 text-sm font-semibold text-text-primary">
            {lang === "es" ? "CTA principal" : "Primary CTA"}
          </div>

          <Toggle
            label={lang === "es" ? "Activo" : "Enabled"}
            checked={homeForm.hero.primaryCta.enabled}
            onChange={(value) =>
              updateHomeCtaField("primaryCta", "enabled", value)
            }
          />

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Label ES</FieldLabel>
              <TextInput
                value={homeForm.hero.primaryCta.label.es}
                onChange={(e) =>
                  updateHomeCtaLabel("primaryCta", "es", e.target.value)
                }
              />
            </div>

            <div>
              <FieldLabel>Label EN</FieldLabel>
              <TextInput
                value={homeForm.hero.primaryCta.label.en}
                onChange={(e) =>
                  updateHomeCtaLabel("primaryCta", "en", e.target.value)
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>Href</FieldLabel>
            <TextInput
              value={homeForm.hero.primaryCta.href}
              onChange={(e) =>
                updateHomeCtaField("primaryCta", "href", e.target.value)
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-4">
          <div className="mb-4 text-sm font-semibold text-text-primary">
            {lang === "es" ? "CTA secundario" : "Secondary CTA"}
          </div>

          <Toggle
            label={lang === "es" ? "Activo" : "Enabled"}
            checked={homeForm.hero.secondaryCta.enabled}
            onChange={(value) =>
              updateHomeCtaField("secondaryCta", "enabled", value)
            }
          />

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Label ES</FieldLabel>
              <TextInput
                value={homeForm.hero.secondaryCta.label.es}
                onChange={(e) =>
                  updateHomeCtaLabel("secondaryCta", "es", e.target.value)
                }
              />
            </div>

            <div>
              <FieldLabel>Label EN</FieldLabel>
              <TextInput
                value={homeForm.hero.secondaryCta.label.en}
                onChange={(e) =>
                  updateHomeCtaLabel("secondaryCta", "en", e.target.value)
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>Href</FieldLabel>
            <TextInput
              value={homeForm.hero.secondaryCta.href}
              onChange={(e) =>
                updateHomeCtaField("secondaryCta", "href", e.target.value)
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Panel destacado lateral" : "Highlight panel"}
        subtitle={
          lang === "es"
            ? "Texto corto destacado junto al hero."
            : "Short highlighted text shown next to the hero."
        }
      >
        <Toggle
          label={lang === "es" ? "Mostrar panel" : "Show panel"}
          checked={homeForm.highlightPanel.enabled}
          onChange={updateHighlightPanelEnabled}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Label ES</FieldLabel>
            <TextInput
              value={homeForm.highlightPanel.coverageLabel.es}
              onChange={(e) =>
                updateHighlightPanelLabel("es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Label EN</FieldLabel>
            <TextInput
              value={homeForm.highlightPanel.coverageLabel.en}
              onChange={(e) =>
                updateHighlightPanelLabel("en", e.target.value)
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Cards destacadas" : "Featured cards"}
        subtitle={
          lang === "es"
            ? "Bloques breves destacados en la portada."
            : "Short featured blocks displayed on the homepage."
        }
      >
        <div className="flex justify-start">
          <ActionButton onClick={addFeaturedCard}>
            {lang === "es" ? "Agregar card" : "Add card"}
          </ActionButton>
        </div>

        {homeForm.featuredCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-secondary">
            {lang === "es"
              ? "Aún no hay cards destacadas."
              : "There are no featured cards yet."}
          </div>
        ) : (
          <div className="space-y-5">
            {homeForm.featuredCards.map((card, index) => (
              <div
                key={card.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-text-primary">
                    {lang === "es" ? `Card ${index + 1}` : `Card ${index + 1}`}
                  </div>

                  <div className="flex items-center gap-3">
                    <Toggle
                      label={lang === "es" ? "Activa" : "Enabled"}
                      checked={card.enabled}
                      onChange={(value) =>
                        updateFeaturedCardField(index, "enabled", value)
                      }
                    />

                    <ActionButton onClick={() => removeFeaturedCard(index)}>
                      {lang === "es" ? "Eliminar" : "Remove"}
                    </ActionButton>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>Título ES</FieldLabel>
                    <TextInput
                      value={card.title.es}
                      onChange={(e) =>
                        updateFeaturedCardText(
                          index,
                          "title",
                          "es",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel>Title EN</FieldLabel>
                    <TextInput
                      value={card.title.en}
                      onChange={(e) =>
                        updateFeaturedCardText(
                          index,
                          "title",
                          "en",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>Descripción ES</FieldLabel>
                    <TextArea
                      value={card.description.es}
                      onChange={(e) =>
                        updateFeaturedCardText(
                          index,
                          "description",
                          "es",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel>Description EN</FieldLabel>
                    <TextArea
                      value={card.description.en}
                      onChange={(e) =>
                        updateFeaturedCardText(
                          index,
                          "description",
                          "en",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Bloque de cobertura" : "Coverage block"}
        subtitle={
          lang === "es"
            ? "Contenido editorial del bloque de cobertura de portada."
            : "Editorial content for the homepage coverage block."
        }
      >
        <div className="flex flex-wrap gap-6">
          <Toggle
            label={lang === "es" ? "Mostrar bloque" : "Show section"}
            checked={homeForm.coverageSection.enabled}
            onChange={updateCoverageSectionEnabled}
          />

          <Toggle
            label={
              lang === "es"
                ? "Mostrar botón de ubicación"
                : "Show location button"
            }
            checked={homeForm.coverageSection.showOpenMapsLink}
            onChange={updateCoverageSectionShowOpenMapsLink}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Eyebrow ES</FieldLabel>
            <TextInput
              value={homeForm.coverageSection.eyebrow.es}
              onChange={(e) =>
                updateCoverageSectionField("eyebrow", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Eyebrow EN</FieldLabel>
            <TextInput
              value={homeForm.coverageSection.eyebrow.en}
              onChange={(e) =>
                updateCoverageSectionField("eyebrow", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Título ES</FieldLabel>
            <TextArea
              value={homeForm.coverageSection.title.es}
              onChange={(e) =>
                updateCoverageSectionField("title", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Title EN</FieldLabel>
            <TextArea
              value={homeForm.coverageSection.title.en}
              onChange={(e) =>
                updateCoverageSectionField("title", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Descripción ES</FieldLabel>
            <TextArea
              value={homeForm.coverageSection.description.es}
              onChange={(e) =>
                updateCoverageSectionField("description", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Description EN</FieldLabel>
            <TextArea
              value={homeForm.coverageSection.description.en}
              onChange={(e) =>
                updateCoverageSectionField("description", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Nota ES</FieldLabel>
            <TextArea
              value={homeForm.coverageSection.note.es}
              onChange={(e) =>
                updateCoverageSectionField("note", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Note EN</FieldLabel>
            <TextArea
              value={homeForm.coverageSection.note.en}
              onChange={(e) =>
                updateCoverageSectionField("note", "en", e.target.value)
              }
            />
          </div>
        </div>

        {homeForm.coverageSection.showOpenMapsLink ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Open Maps Label ES</FieldLabel>
              <TextInput
                value={homeForm.coverageSection.openMapsLabel.es}
                onChange={(e) =>
                  updateCoverageSectionField(
                    "openMapsLabel",
                    "es",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <FieldLabel>Open Maps Label EN</FieldLabel>
              <TextInput
                value={homeForm.coverageSection.openMapsLabel.en}
                onChange={(e) =>
                  updateCoverageSectionField(
                    "openMapsLabel",
                    "en",
                    e.target.value
                  )
                }
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-text-secondary">
            {lang === "es"
              ? "El botón de ubicación está oculto. Los labels se conservan internamente para uso futuro."
              : "The location button is hidden. Labels are preserved internally for future use."}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Nosotros" : "About us"}
        subtitle={
          lang === "es"
            ? "Bloque institucional para explicar quiénes son y qué hacen."
            : "Institutional block to explain who they are and what they do."
        }
      >
        <Toggle
          label={lang === "es" ? "Mostrar sección" : "Show section"}
          checked={homeForm.aboutSection.enabled}
          onChange={updateAboutSectionEnabled}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Eyebrow ES</FieldLabel>
            <TextInput
              value={homeForm.aboutSection.eyebrow.es}
              onChange={(e) =>
                updateAboutSectionField("eyebrow", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Eyebrow EN</FieldLabel>
            <TextInput
              value={homeForm.aboutSection.eyebrow.en}
              onChange={(e) =>
                updateAboutSectionField("eyebrow", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Título ES</FieldLabel>
            <TextArea
              value={homeForm.aboutSection.title.es}
              onChange={(e) =>
                updateAboutSectionField("title", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Title EN</FieldLabel>
            <TextArea
              value={homeForm.aboutSection.title.en}
              onChange={(e) =>
                updateAboutSectionField("title", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Descripción ES</FieldLabel>
            <TextArea
              value={homeForm.aboutSection.description.es}
              onChange={(e) =>
                updateAboutSectionField("description", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>Description EN</FieldLabel>
            <TextArea
              value={homeForm.aboutSection.description.en}
              onChange={(e) =>
                updateAboutSectionField("description", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="flex justify-start">
          <ActionButton onClick={addAboutHighlight}>
            {lang === "es" ? "Agregar highlight" : "Add highlight"}
          </ActionButton>
        </div>

        {homeForm.aboutSection.highlights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-secondary">
            {lang === "es"
              ? "Aún no hay highlights en Nosotros."
              : "There are no highlights in About yet."}
          </div>
        ) : (
          <div className="space-y-5">
            {homeForm.aboutSection.highlights.map((item, index) => (
              <div
                key={`about-highlight-${index}`}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-text-primary">
                    {lang === "es"
                      ? `Highlight ${index + 1}`
                      : `Highlight ${index + 1}`}
                  </div>

                  <ActionButton onClick={() => removeAboutHighlight(index)}>
                    {lang === "es" ? "Eliminar" : "Remove"}
                  </ActionButton>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>Texto ES</FieldLabel>
                    <TextArea
                      value={item.es}
                      onChange={(e) =>
                        updateAboutHighlight(index, "es", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel>Text EN</FieldLabel>
                    <TextArea
                      value={item.en}
                      onChange={(e) =>
                        updateAboutHighlight(index, "en", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Liderazgo / Visión" : "Leadership / Vision"}
        subtitle={
          lang === "es"
            ? "Bloque para presentar liderazgo institucional y mensaje directivo."
            : "Block to present institutional leadership and executive message."
        }
      >
        <Toggle
          label={lang === "es" ? "Mostrar sección" : "Show section"}
          checked={homeForm.leadershipSection.enabled}
          onChange={updateLeadershipEnabled}
        />

        <div>
          <FieldLabel>{lang === "es" ? "Nombre" : "Name"}</FieldLabel>
          <TextInput
            value={homeForm.leadershipSection.name}
            onChange={(e) => updateLeadershipName(e.target.value)}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Cargo ES" : "Role ES"}</FieldLabel>
            <TextInput
              value={homeForm.leadershipSection.role.es}
              onChange={(e) =>
                updateLeadershipField("role", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "Cargo EN" : "Role EN"}</FieldLabel>
            <TextInput
              value={homeForm.leadershipSection.role.en}
              onChange={(e) =>
                updateLeadershipField("role", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Mensaje ES" : "Message ES"}
            </FieldLabel>
            <TextArea
              value={homeForm.leadershipSection.message.es}
              onChange={(e) =>
                updateLeadershipField("message", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Mensaje EN" : "Message EN"}
            </FieldLabel>
            <TextArea
              value={homeForm.leadershipSection.message.en}
              onChange={(e) =>
                updateLeadershipField("message", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div>
          <FieldLabel>
            {lang === "es" ? "Imagen liderazgo" : "Leadership image"}
          </FieldLabel>

          <div className="space-y-3">
            <TextInput
              value={homeForm.leadershipSection.imageUrl}
              onChange={(e) =>
                setHomeForm((prev) => ({
                  ...prev,
                  leadershipSection: {
                    ...prev.leadershipSection,
                    imageUrl: e.target.value,
                  },
                }))
              }
              placeholder="admin/home/leadership/... o URL pública"
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) return;

                    try {
                      setUploadingLeadershipImage(true);

                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("scope", "home/leadership");

                      const res = await fetch("/api/admin/uploads", {
                        method: "POST",
                        body: formData,
                      });

                      const data = await res.json().catch(() => null);

                      if (!res.ok || !data?.ok || !data?.file?.fileKey) {
                        throw new Error("Upload failed");
                      }

                      setHomeForm((prev) => ({
                        ...prev,
                        leadershipSection: {
                          ...prev.leadershipSection,
                          imageUrl: data.file.fileKey,
                        },
                      }));
                    } catch (error) {
                      console.error("Error uploading leadership image:", error);
                    } finally {
                      setUploadingLeadershipImage(false);
                      e.target.value = "";
                    }
                  }}
                  disabled={uploadingLeadershipImage || saving}
                />

                {uploadingLeadershipImage
                  ? lang === "es"
                    ? "Subiendo..."
                    : "Uploading..."
                  : lang === "es"
                    ? "Subir imagen"
                    : "Upload image"}
              </label>

              {homeForm.leadershipSection.imageUrl ? (
                <span className="text-xs text-text-secondary">
                  {homeForm.leadershipSection.imageUrl}
                </span>
              ) : null}
            </div>

            {homeForm.leadershipSection.imageUrl ? (
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
                  {lang === "es" ? "Vista previa" : "Preview"}
                </div>

                <Image
                  src={
                    homeForm.leadershipSection.imageUrl.startsWith("admin/")
                      ? `/api/admin/uploads/view?key=${encodeURIComponent(
                          homeForm.leadershipSection.imageUrl
                        )}`
                      : homeForm.leadershipSection.imageUrl
                  }
                  alt="Leadership preview"
                  width={320}
                  height={400}
                  unoptimized
                  className="max-h-80 w-auto object-cover rounded-lg"
                />
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Por qué elegirnos" : "Why choose us"}
        subtitle={
          lang === "es"
            ? "Razones estructuradas para reforzar confianza y diferenciación."
            : "Structured reasons to reinforce trust and differentiation."
        }
      >
        <Toggle
          label={lang === "es" ? "Mostrar sección" : "Show section"}
          checked={homeForm.whyChooseUs.enabled}
          onChange={updateWhyChooseUsEnabled}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Título ES</FieldLabel>
            <TextInput
              value={homeForm.whyChooseUs.title.es}
              onChange={(e) => updateWhyChooseUsTitle("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Title EN</FieldLabel>
            <TextInput
              value={homeForm.whyChooseUs.title.en}
              onChange={(e) => updateWhyChooseUsTitle("en", e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-start">
          <ActionButton onClick={addWhyChooseUsItem}>
            {lang === "es" ? "Agregar razón" : "Add reason"}
          </ActionButton>
        </div>

        {homeForm.whyChooseUs.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-secondary">
            {lang === "es"
              ? "Aún no hay razones configuradas."
              : "There are no configured reasons yet."}
          </div>
        ) : (
          <div className="space-y-5">
            {homeForm.whyChooseUs.items.map((item, index) => (
              <div
                key={`why-choose-us-${index}`}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-text-primary">
                    {lang === "es"
                      ? `Razón ${index + 1}`
                      : `Reason ${index + 1}`}
                  </div>

                  <ActionButton onClick={() => removeWhyChooseUsItem(index)}>
                    {lang === "es" ? "Eliminar" : "Remove"}
                  </ActionButton>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>Título ES</FieldLabel>
                    <TextInput
                      value={item.title.es}
                      onChange={(e) =>
                        updateWhyChooseUsItemField(
                          index,
                          "title",
                          "es",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel>Title EN</FieldLabel>
                    <TextInput
                      value={item.title.en}
                      onChange={(e) =>
                        updateWhyChooseUsItemField(
                          index,
                          "title",
                          "en",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>Descripción ES</FieldLabel>
                    <TextArea
                      value={item.description.es}
                      onChange={(e) =>
                        updateWhyChooseUsItemField(
                          index,
                          "description",
                          "es",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel>Description EN</FieldLabel>
                    <TextArea
                      value={item.description.en}
                      onChange={(e) =>
                        updateWhyChooseUsItemField(
                          index,
                          "description",
                          "en",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Mapa de portada" : "Homepage map"}
        subtitle={
          lang === "es"
            ? "Configura comportamiento y coordenadas base del mapa."
            : "Configure behavior and base coordinates of the homepage map."
        }
      >
        <div className="flex flex-wrap gap-6">
          <Toggle
            label={lang === "es" ? "Mostrar mapa" : "Show map"}
            checked={homeForm.mapSection.enabled}
            onChange={(value) => updateMapSectionField("enabled", value)}
          />

          <Toggle
            label={
              lang === "es"
                ? "Usar geolocalización del navegador"
                : "Use browser geolocation"
            }
            checked={homeForm.mapSection.useBrowserGeolocation}
            disabled={!homeForm.mapSection.enabled}
            onChange={(value) =>
              updateMapSectionField("useBrowserGeolocation", value)
            }
          />
        </div>

        {!homeForm.mapSection.enabled ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-4 text-sm text-text-secondary">
            {lang === "es"
              ? "El mapa está oculto. La geolocalización del navegador no tendrá efecto mientras esta sección permanezca desactivada."
              : "The map is hidden. Browser geolocation will have no effect while this section remains disabled."}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <FieldLabel>Fallback Lat</FieldLabel>
            <TextInput
              type="number"
              step="any"
              value={homeForm.mapSection.fallbackLat ?? ""}
              onChange={(e) =>
                updateMapSectionCoordinate(
                  "fallbackLat",
                  safeNumberFromInput(e.target.value)
                )
              }
            />
          </div>

          <div>
            <FieldLabel>Fallback Lng</FieldLabel>
            <TextInput
              type="number"
              step="any"
              value={homeForm.mapSection.fallbackLng ?? ""}
              onChange={(e) =>
                updateMapSectionCoordinate(
                  "fallbackLng",
                  safeNumberFromInput(e.target.value)
                )
              }
            />
          </div>

          <div>
            <FieldLabel>Zoom</FieldLabel>
            <TextInput
              type="number"
              min={1}
              max={20}
              value={homeForm.mapSection.zoom}
              onChange={(e) =>
                updateMapSectionField(
                  "zoom",
                  Number.isFinite(Number(e.target.value))
                    ? Number(e.target.value)
                    : 7
                )
              }
            />
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 pb-6">
        <PrimaryButton
          disabled={!hasUnsavedChanges || saving}
          onClick={handleSave}
        >
          {saving
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
              ? "Guardar cambios"
              : "Save changes"}
        </PrimaryButton>

        <ActionButton
          disabled={!hasUnsavedChanges || saving}
          onClick={handleReset}
        >
          {lang === "es" ? "Restaurar" : "Reset"}
        </ActionButton>
      </div>
    </main>
  );
}