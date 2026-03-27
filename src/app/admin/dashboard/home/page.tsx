"use client";

/**
 * =============================================================================
 * ✅ Page: Admin Home Configuration
 * Path: src/app/admin/dashboard/home/page.tsx
 * =============================================================================
 *
 * ES:
 *   Pantalla administrativa para configurar la portada pública de Sierra Tech.
 *   Trabaja sobre una estructura fija y administrable, sin editor libre.
 *
 *   Alcance:
 *   - Hero principal
 *   - Panel destacado lateral
 *   - Cards destacadas
 *   - Cobertura / capacidad operativa
 *   - Mapa
 *   - Guardado / restauración
 *
 * EN:
 *   Administrative page used to configure Sierra Tech's public home page.
 *   It works on a fixed, structured layout without a free-form editor.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Home as HomeIcon, Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { useToast } from "@/components/ui/GlobalToastProvider";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
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
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULTS: HomePayload = {
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
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
  return role === "admin" || role === "superadmin";
}

function createEmptyCard(nextOrder: number): HomeFeaturedCard {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `card-${Date.now()}-${nextOrder}`;

  return {
    id,
    title: { es: "", en: "" },
    description: { es: "", en: "" },
    order: nextOrder,
    enabled: true,
  };
}

function sortCards(cards: HomeFeaturedCard[]): HomeFeaturedCard[] {
  return [...cards].sort((a, b) => a.order - b.order);
}

function normalizeCards(cards: HomeFeaturedCard[]): HomeFeaturedCard[] {
  return sortCards(cards).map((card, index) => ({
    ...card,
    order: index + 1,
  }));
}

function normalizeHomePayload(payload: Partial<HomePayload> | null | undefined): HomePayload {
  const merged: HomePayload = {
    ...DEFAULTS,
    ...payload,
    hero: {
      ...DEFAULTS.hero,
      ...payload?.hero,
      badge: {
        ...DEFAULTS.hero.badge,
        ...payload?.hero?.badge,
        text: {
          ...DEFAULTS.hero.badge.text,
          ...payload?.hero?.badge?.text,
        },
      },
      title: {
        ...DEFAULTS.hero.title,
        ...payload?.hero?.title,
      },
      subtitle: {
        ...DEFAULTS.hero.subtitle,
        ...payload?.hero?.subtitle,
      },
      primaryCta: {
        ...DEFAULTS.hero.primaryCta,
        ...payload?.hero?.primaryCta,
        label: {
          ...DEFAULTS.hero.primaryCta.label,
          ...payload?.hero?.primaryCta?.label,
        },
      },
      secondaryCta: {
        ...DEFAULTS.hero.secondaryCta,
        ...payload?.hero?.secondaryCta,
        label: {
          ...DEFAULTS.hero.secondaryCta.label,
          ...payload?.hero?.secondaryCta?.label,
        },
      },
    },
    highlightPanel: {
      ...DEFAULTS.highlightPanel,
      ...payload?.highlightPanel,
      coverageLabel: {
        ...DEFAULTS.highlightPanel.coverageLabel,
        ...payload?.highlightPanel?.coverageLabel,
      },
    },
    featuredCards: normalizeCards(payload?.featuredCards ?? DEFAULTS.featuredCards),
    coverageSection: {
      ...DEFAULTS.coverageSection,
      ...payload?.coverageSection,
      eyebrow: {
        ...DEFAULTS.coverageSection.eyebrow,
        ...payload?.coverageSection?.eyebrow,
      },
      title: {
        ...DEFAULTS.coverageSection.title,
        ...payload?.coverageSection?.title,
      },
      description: {
        ...DEFAULTS.coverageSection.description,
        ...payload?.coverageSection?.description,
      },
      note: {
        ...DEFAULTS.coverageSection.note,
        ...payload?.coverageSection?.note,
      },
      openMapsLabel: {
        ...DEFAULTS.coverageSection.openMapsLabel,
        ...payload?.coverageSection?.openMapsLabel,
      },
    },
    mapSection: {
      ...DEFAULTS.mapSection,
      ...payload?.mapSection,
    },
  };

  return merged;
}

function safeNumberFromInput(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/* -------------------------------------------------------------------------- */
/* Small UI helpers                                                           */
/* -------------------------------------------------------------------------- */

function SectionCard(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-text-primary">{props.title}</h2>
        {props.subtitle ? (
          <p className="mt-1 text-sm text-text-secondary">{props.subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-5">{props.children}</div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-text-primary">{children}</h3>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-text-primary">{children}</label>;
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
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-text-primary">
      <input
        type="checkbox"
        checked={props.checked}
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

export default function HomeAdminPage() {
  const { locale } = useTranslation();
  const lang: Locale = locale === "es" ? "es" : "en";
  const { data: session, status } = useSession();
  const toast = useToast();

  const [form, setForm] = useState<HomePayload>(DEFAULTS);
  const [initialData, setInitialData] = useState<HomePayload>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const role = session?.user?.role;
  const hasAccess = isAllowedRole(role);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialData);
  }, [form, initialData]);

  useEffect(() => {
    async function loadHome() {
      try {
        const response = await fetch("/api/admin/home", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP_${response.status}`);
        }

        const payload: Partial<HomePayload> | null = await response.json().catch(() => null);
        const normalized = normalizeHomePayload(payload);

        setForm(normalized);
        setInitialData(normalized);
      } catch (error) {
        console.error("[HomeAdminPage] Error loading home config:", error);
        toast.error(
          lang === "es"
            ? "No se pudo cargar la configuración de Home."
            : "Could not load Home configuration."
        );
      } finally {
        setLoading(false);
      }
    }

    if (status !== "authenticated" || !hasAccess) {
      setLoading(false);
      return;
    }

    void loadHome();
  }, [status, hasAccess, toast, lang]);

  async function handleSave(): Promise<void> {
    try {
      setSaving(true);

      const response = await fetch("/api/admin/home", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const payload: Partial<HomePayload> | null = await response.json().catch(() => form);
      const normalized = normalizeHomePayload(payload ?? form);

      setForm(normalized);
      setInitialData(normalized);

      toast.success(
        lang === "es" ? "Home guardado correctamente." : "Home saved successfully."
      );
    } catch (error) {
      console.error("[HomeAdminPage] Error saving home config:", error);
      toast.error(lang === "es" ? "Error al guardar Home." : "Error saving Home.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset(): void {
    setForm(initialData);
  }

  function updateHeroLocalized(
    field: "title" | "subtitle",
    localeKey: Locale,
    value: string
  ): void {
    setForm((prev) => ({
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

  function updateHeroBadge(localeKey: Locale, value: string): void {
    setForm((prev) => ({
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

  function updateHeroCta(
    ctaKey: "primaryCta" | "secondaryCta",
    field: "href" | "enabled",
    value: string | boolean
  ): void {
    setForm((prev) => ({
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

  function updateHeroCtaLabel(
    ctaKey: "primaryCta" | "secondaryCta",
    localeKey: Locale,
    value: string
  ): void {
    setForm((prev) => ({
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

  function updateHighlightCoverageLabel(localeKey: Locale, value: string): void {
    setForm((prev) => ({
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

  function addCard(): void {
    setForm((prev) => ({
      ...prev,
      featuredCards: [
        ...prev.featuredCards,
        createEmptyCard(prev.featuredCards.length + 1),
      ],
    }));
  }

  function updateCardLocalized(
    cardId: string,
    field: "title" | "description",
    localeKey: Locale,
    value: string
  ): void {
    setForm((prev) => ({
      ...prev,
      featuredCards: prev.featuredCards.map((card) =>
        card.id === cardId
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

  function updateCardEnabled(cardId: string, value: boolean): void {
    setForm((prev) => ({
      ...prev,
      featuredCards: prev.featuredCards.map((card) =>
        card.id === cardId ? { ...card, enabled: value } : card
      ),
    }));
  }

  function removeCard(cardId: string): void {
    setForm((prev) => ({
      ...prev,
      featuredCards: normalizeCards(
        prev.featuredCards.filter((card) => card.id !== cardId)
      ),
    }));
  }

  function moveCard(cardId: string, direction: "up" | "down"): void {
    const sorted = sortCards(form.featuredCards);
    const index = sorted.findIndex((card) => card.id === cardId);

    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sorted.length - 1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const copy = [...sorted];

    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];

    setForm((prev) => ({
      ...prev,
      featuredCards: normalizeCards(copy),
    }));
  }

  function updateCoverageLocalized(
    field: "eyebrow" | "title" | "description" | "note" | "openMapsLabel",
    localeKey: Locale,
    value: string
  ): void {
    setForm((prev) => ({
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

  function updateMapField(
    field: "enabled" | "useBrowserGeolocation" | "fallbackLat" | "fallbackLng" | "zoom",
    value: boolean | number | null
  ): void {
    setForm((prev) => ({
      ...prev,
      mapSection: {
        ...prev.mapSection,
        [field]: value,
      },
    }));
  }

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
          {lang === "es" ? "Cargando configuración..." : "Loading configuration..."}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <AdminPageHeader
        icon={<HomeIcon className="h-6 w-6 text-brand-primaryStrong" />}
        title={lang === "es" ? "Página de Inicio" : "Home"}
        subtitle={
          lang === "es"
            ? "Administra el contenido visible de la portada pública."
            : "Manage the visible content of the public landing page."
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton disabled={!hasUnsavedChanges || saving} onClick={handleSave}>
          {saving
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
            ? "Guardar cambios"
            : "Save changes"}
        </PrimaryButton>

        <ActionButton disabled={!hasUnsavedChanges || saving} onClick={handleReset}>
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

      <SectionCard
        title={lang === "es" ? "Hero principal" : "Main hero"}
        subtitle={
          lang === "es"
            ? "Controla el mensaje principal y los CTAs de la portada."
            : "Controls the main message and CTAs of the landing page."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>Badge ES</FieldLabel>
            <TextInput
              value={form.hero.badge.text.es}
              onChange={(e) => updateHeroBadge("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>Badge EN</FieldLabel>
            <TextInput
              value={form.hero.badge.text.en}
              onChange={(e) => updateHeroBadge("en", e.target.value)}
            />
          </div>
        </div>

        <Toggle
          label={lang === "es" ? "Mostrar badge" : "Show badge"}
          checked={form.hero.badge.enabled}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              hero: {
                ...prev.hero,
                badge: {
                  ...prev.hero.badge,
                  enabled: value,
                },
              },
            }))
          }
        />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Título principal ES" : "Main title ES"}</FieldLabel>
            <TextArea
              value={form.hero.title.es}
              onChange={(e) => updateHeroLocalized("title", "es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "Título principal EN" : "Main title EN"}</FieldLabel>
            <TextArea
              value={form.hero.title.en}
              onChange={(e) => updateHeroLocalized("title", "en", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Subtítulo ES" : "Subtitle ES"}</FieldLabel>
            <TextArea
              value={form.hero.subtitle.es}
              onChange={(e) => updateHeroLocalized("subtitle", "es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "Subtítulo EN" : "Subtitle EN"}</FieldLabel>
            <TextArea
              value={form.hero.subtitle.en}
              onChange={(e) => updateHeroLocalized("subtitle", "en", e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <SectionTitle>{lang === "es" ? "CTA primario" : "Primary CTA"}</SectionTitle>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Label ES</FieldLabel>
              <TextInput
                value={form.hero.primaryCta.label.es}
                onChange={(e) =>
                  updateHeroCtaLabel("primaryCta", "es", e.target.value)
                }
              />
            </div>

            <div>
              <FieldLabel>Label EN</FieldLabel>
              <TextInput
                value={form.hero.primaryCta.label.en}
                onChange={(e) =>
                  updateHeroCtaLabel("primaryCta", "en", e.target.value)
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>Href</FieldLabel>
            <TextInput
              value={form.hero.primaryCta.href}
              onChange={(e) => updateHeroCta("primaryCta", "href", e.target.value)}
            />
          </div>

          <div className="mt-4">
            <Toggle
              label={lang === "es" ? "CTA primario activo" : "Primary CTA enabled"}
              checked={form.hero.primaryCta.enabled}
              onChange={(value) => updateHeroCta("primaryCta", "enabled", value)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <SectionTitle>{lang === "es" ? "CTA secundario" : "Secondary CTA"}</SectionTitle>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <div>
              <FieldLabel>Label ES</FieldLabel>
              <TextInput
                value={form.hero.secondaryCta.label.es}
                onChange={(e) =>
                  updateHeroCtaLabel("secondaryCta", "es", e.target.value)
                }
              />
            </div>

            <div>
              <FieldLabel>Label EN</FieldLabel>
              <TextInput
                value={form.hero.secondaryCta.label.en}
                onChange={(e) =>
                  updateHeroCtaLabel("secondaryCta", "en", e.target.value)
                }
              />
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel>Href</FieldLabel>
            <TextInput
              value={form.hero.secondaryCta.href}
              onChange={(e) => updateHeroCta("secondaryCta", "href", e.target.value)}
            />
          </div>

          <div className="mt-4">
            <Toggle
              label={lang === "es" ? "CTA secundario activo" : "Secondary CTA enabled"}
              checked={form.hero.secondaryCta.enabled}
              onChange={(value) => updateHeroCta("secondaryCta", "enabled", value)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Panel destacado lateral" : "Highlight side panel"}
        subtitle={
          lang === "es"
            ? "Controla la etiqueta visual del panel complementario."
            : "Controls the visual label of the complementary panel."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Coverage Label ES" : "Coverage Label ES"}</FieldLabel>
            <TextInput
              value={form.highlightPanel.coverageLabel.es}
              onChange={(e) => updateHighlightCoverageLabel("es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "Coverage Label EN" : "Coverage Label EN"}</FieldLabel>
            <TextInput
              value={form.highlightPanel.coverageLabel.en}
              onChange={(e) => updateHighlightCoverageLabel("en", e.target.value)}
            />
          </div>
        </div>

        <Toggle
          label={lang === "es" ? "Mostrar panel destacado" : "Show highlight panel"}
          checked={form.highlightPanel.enabled}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              highlightPanel: {
                ...prev.highlightPanel,
                enabled: value,
              },
            }))
          }
        />
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Cards destacadas" : "Featured cards"}
        subtitle={
          lang === "es"
            ? "Administra las tarjetas informativas de la portada."
            : "Manage the informational cards displayed on the landing page."
        }
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">
            {lang === "es"
              ? "Puedes crear, editar, eliminar y reordenar cards."
              : "You can create, edit, remove and reorder cards."}
          </p>

          <ActionButton onClick={addCard}>
            <Plus className="mr-2 h-4 w-4" />
            {lang === "es" ? "Agregar card" : "Add card"}
          </ActionButton>
        </div>

        {form.featuredCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-text-secondary">
            {lang === "es"
              ? "No hay cards creadas todavía."
              : "No cards have been created yet."}
          </div>
        ) : (
          <div className="space-y-4">
            {sortCards(form.featuredCards).map((card, index, list) => (
              <div
                key={card.id}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {lang === "es" ? "Card" : "Card"} #{card.order}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {card.enabled
                        ? lang === "es"
                          ? "Activa"
                          : "Enabled"
                        : lang === "es"
                        ? "Inactiva"
                        : "Disabled"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton
                      onClick={() => moveCard(card.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </ActionButton>

                    <ActionButton
                      onClick={() => moveCard(card.id, "down")}
                      disabled={index === list.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </ActionButton>

                    <ActionButton
                      onClick={() => removeCard(card.id)}
                      className="text-status-error hover:text-status-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </ActionButton>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>{lang === "es" ? "Título ES" : "Title ES"}</FieldLabel>
                    <TextInput
                      value={card.title.es}
                      onChange={(e) =>
                        updateCardLocalized(card.id, "title", "es", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel>{lang === "es" ? "Título EN" : "Title EN"}</FieldLabel>
                    <TextInput
                      value={card.title.en}
                      onChange={(e) =>
                        updateCardLocalized(card.id, "title", "en", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <FieldLabel>
                      {lang === "es" ? "Descripción ES" : "Description ES"}
                    </FieldLabel>
                    <TextArea
                      value={card.description.es}
                      onChange={(e) =>
                        updateCardLocalized(
                          card.id,
                          "description",
                          "es",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div>
                    <FieldLabel>
                      {lang === "es" ? "Descripción EN" : "Description EN"}
                    </FieldLabel>
                    <TextArea
                      value={card.description.en}
                      onChange={(e) =>
                        updateCardLocalized(
                          card.id,
                          "description",
                          "en",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <Toggle
                    label={lang === "es" ? "Card activa" : "Card enabled"}
                    checked={card.enabled}
                    onChange={(value) => updateCardEnabled(card.id, value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Cobertura / capacidad operativa" : "Coverage / operational capability"}
        subtitle={
          lang === "es"
            ? "Controla el bloque informativo institucional junto al mapa."
            : "Controls the institutional content block displayed next to the map."
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Eyebrow ES" : "Eyebrow ES"}</FieldLabel>
            <TextInput
              value={form.coverageSection.eyebrow.es}
              onChange={(e) =>
                updateCoverageLocalized("eyebrow", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "Eyebrow EN" : "Eyebrow EN"}</FieldLabel>
            <TextInput
              value={form.coverageSection.eyebrow.en}
              onChange={(e) =>
                updateCoverageLocalized("eyebrow", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Título ES" : "Title ES"}</FieldLabel>
            <TextInput
              value={form.coverageSection.title.es}
              onChange={(e) => updateCoverageLocalized("title", "es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "Título EN" : "Title EN"}</FieldLabel>
            <TextInput
              value={form.coverageSection.title.en}
              onChange={(e) => updateCoverageLocalized("title", "en", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Descripción ES" : "Description ES"}</FieldLabel>
            <TextArea
              value={form.coverageSection.description.es}
              onChange={(e) =>
                updateCoverageLocalized("description", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "Descripción EN" : "Description EN"}</FieldLabel>
            <TextArea
              value={form.coverageSection.description.en}
              onChange={(e) =>
                updateCoverageLocalized("description", "en", e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>{lang === "es" ? "Nota ES" : "Note ES"}</FieldLabel>
            <TextArea
              value={form.coverageSection.note.es}
              onChange={(e) => updateCoverageLocalized("note", "es", e.target.value)}
            />
          </div>

          <div>
            <FieldLabel>{lang === "es" ? "Nota EN" : "Note EN"}</FieldLabel>
            <TextArea
              value={form.coverageSection.note.en}
              onChange={(e) => updateCoverageLocalized("note", "en", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <FieldLabel>
              {lang === "es" ? "Botón abrir mapas ES" : "Open maps button ES"}
            </FieldLabel>
            <TextInput
              value={form.coverageSection.openMapsLabel.es}
              onChange={(e) =>
                updateCoverageLocalized("openMapsLabel", "es", e.target.value)
              }
            />
          </div>

          <div>
            <FieldLabel>
              {lang === "es" ? "Botón abrir mapas EN" : "Open maps button EN"}
            </FieldLabel>
            <TextInput
              value={form.coverageSection.openMapsLabel.en}
              onChange={(e) =>
                updateCoverageLocalized("openMapsLabel", "en", e.target.value)
              }
            />
          </div>
        </div>

        <Toggle
          label={lang === "es" ? "Mostrar bloque de cobertura" : "Show coverage block"}
          checked={form.coverageSection.enabled}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              coverageSection: {
                ...prev.coverageSection,
                enabled: value,
              },
            }))
          }
        />
      </SectionCard>

      <SectionCard
        title={lang === "es" ? "Mapa" : "Map"}
        subtitle={
          lang === "es"
            ? "Configura la referencia geográfica y el fallback del mapa."
            : "Configure the geographic reference and fallback map values."
        }
      >
        <Toggle
          label={lang === "es" ? "Mostrar mapa" : "Show map"}
          checked={form.mapSection.enabled}
          onChange={(value) => updateMapField("enabled", value)}
        />

        <Toggle
          label={
            lang === "es"
              ? "Usar geolocalización del navegador"
              : "Use browser geolocation"
          }
          checked={form.mapSection.useBrowserGeolocation}
          onChange={(value) => updateMapField("useBrowserGeolocation", value)}
        />

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <FieldLabel>Latitude</FieldLabel>
            <TextInput
              type="number"
              step="any"
              value={form.mapSection.fallbackLat ?? ""}
              onChange={(e) =>
                updateMapField("fallbackLat", safeNumberFromInput(e.target.value))
              }
            />
          </div>

          <div>
            <FieldLabel>Longitude</FieldLabel>
            <TextInput
              type="number"
              step="any"
              value={form.mapSection.fallbackLng ?? ""}
              onChange={(e) =>
                updateMapField("fallbackLng", safeNumberFromInput(e.target.value))
              }
            />
          </div>

          <div>
            <FieldLabel>Zoom</FieldLabel>
            <TextInput
              type="number"
              min={1}
              max={20}
              value={form.mapSection.zoom}
              onChange={(e) =>
                updateMapField("zoom", Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 7)
              }
            />
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 pb-6">
        <PrimaryButton disabled={!hasUnsavedChanges || saving} onClick={handleSave}>
          {saving
            ? lang === "es"
              ? "Guardando..."
              : "Saving..."
            : lang === "es"
            ? "Guardar cambios"
            : "Save changes"}
        </PrimaryButton>

        <ActionButton disabled={!hasUnsavedChanges || saving} onClick={handleReset}>
          {lang === "es" ? "Restaurar" : "Reset"}
        </ActionButton>
      </div>
    </main>
  );
}