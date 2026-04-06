"use client";

/**
 * =============================================================================
 * 📄 Component: ServicesPageClient
 * Path: src/components/services/ServicesPageClient.tsx
 * =============================================================================
 *
 * ES:
 *   Capa cliente mínima para la página pública de servicios.
 *
 *   Responsabilidad:
 *   - Recibir datos ya resueltos desde servidor
 *   - Resolver idioma activo en cliente
 *   - Gestionar scroll al bloque de servicios
 *   - Pintar la UI pública final sin inventar contenido
 *
 *   Reglas:
 *   - No usar copy comercial ficticio como contenido principal
 *   - Dar prioridad absoluta a pageHeader y servicios reales
 *   - Mantener fallback bilingüe seguro ES / EN
 *   - Mantener branding neutral sin hardcodear nombre de empresa
 *
 * EN:
 *   Minimal client layer for the public services page.
 * =============================================================================
 */

import { useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Locale = "es" | "en";

export interface LocalizedText {
  es: string;
  en: string;
}

export interface PublicService {
  _id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  description?: LocalizedText;
  coverImage: string;
  category?: string;
  order: number;
}

export interface ServicesPageHeader {
  eyebrow: LocalizedText;
  title: LocalizedText;
  subtitle: LocalizedText;
  primaryCtaLabel: LocalizedText;
  primaryCtaHref: string;
  secondaryCtaLabel: LocalizedText;
  secondaryCtaHref: string;
}

export interface FeaturedCard {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  order: number;
  enabled: boolean;
}

interface ServicesPageClientProps {
  pageHeader: ServicesPageHeader;
  featuredCards: FeaturedCard[];
  services: PublicService[];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function getLocalizedText(
  value: LocalizedText | undefined,
  locale: Locale
): string {
  if (!value) return "";

  const preferred = locale === "es" ? normalizeString(value.es) : normalizeString(value.en);
  const fallback = locale === "es" ? normalizeString(value.en) : normalizeString(value.es);

  return preferred || fallback || "";
}

function getScrollableParent(element: HTMLElement | null): HTMLElement | null {
  if (!element) return null;

  let parent: HTMLElement | null = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const canScroll =
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight;

    if (canScroll) return parent;
    parent = parent.parentElement;
  }

  return null;
}

function scrollToSectionStart(target: HTMLElement | null, offset = 96): void {
  if (!target) return;

  const scrollParent = getScrollableParent(target);

  if (scrollParent) {
    const parentRect = scrollParent.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const top =
      scrollParent.scrollTop + (targetRect.top - parentRect.top) - offset;

    scrollParent.scrollTo({
      top,
      behavior: "smooth",
    });

    return;
  }

  const top = target.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({
    top,
    behavior: "smooth",
  });
}

function formatCategoryLabel(value: string | undefined): string {
  const raw = normalizeString(value);
  if (!raw) return "";

  return raw
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveImageSrc(value: string | undefined): string {
  const normalized = normalizeString(value);

  if (!normalized) return "";

  if (normalized.startsWith("admin/")) {
    return `/api/admin/uploads/view?key=${encodeURIComponent(normalized)}`;
  }

  return normalized;
}

function getServiceExcerpt(service: PublicService, locale: Locale): string {
  const summary = getLocalizedText(service.summary, locale);
  const description = getLocalizedText(service.description, locale);

  return summary || description || "";
}

function isServicesScrollHref(value: string): boolean {
  const normalized = normalizeString(value).toLowerCase();

  return (
    normalized === "#services" ||
    normalized === "/services#services" ||
    normalized === "/services"
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ServicesPageClient({
  pageHeader,
  featuredCards,
  services,
}: ServicesPageClientProps) {
  const { locale } = useTranslation() as { locale: Locale };

  const servicesSectionRef = useRef<HTMLElement | null>(null);

  const handleExploreServices = (): void => {
    scrollToSectionStart(servicesSectionRef.current, 96);
  };

  const copy = useMemo(() => {
    return {
      sectionTitle: locale === "es" ? "Servicios" : "Services",
      emptyTitle:
        locale === "es"
          ? "No hay servicios publicados"
          : "No published services available",
      emptyText:
        locale === "es"
          ? "Cuando existan servicios activos en el administrador, se mostrarán aquí."
          : "Once active services are published from the admin panel, they will appear here.",
      viewDetail: locale === "es" ? "Ver detalle" : "View details",
      exploreServices:
        locale === "es" ? "Explorar servicios" : "Explore services",
      requestQuote:
        locale === "es" ? "Solicitar cotización" : "Request a quote",
      contact: locale === "es" ? "Ir a contacto" : "Go to contact",
      finalTitle:
        locale === "es"
          ? "¿Necesitas una solución para tu proyecto?"
          : "Need a solution for your project?",
      finalText:
        locale === "es"
          ? "Podemos ayudarte a revisar requerimientos, alcance técnico y condiciones de implementación."
          : "We can help you review requirements, technical scope, and implementation conditions.",
    };
  }, [locale]);

  const heroEyebrow = getLocalizedText(pageHeader.eyebrow, locale);
  const heroTitle = getLocalizedText(pageHeader.title, locale);
  const heroSubtitle = getLocalizedText(pageHeader.subtitle, locale);

  const primaryCtaLabel =
    getLocalizedText(pageHeader.primaryCtaLabel, locale) || copy.requestQuote;

  const secondaryCtaLabel =
    getLocalizedText(pageHeader.secondaryCtaLabel, locale) || copy.exploreServices;

  const primaryCtaHref = normalizeString(pageHeader.primaryCtaHref) || "/contact";
  const secondaryCtaHref = normalizeString(pageHeader.secondaryCtaHref);
  const secondaryCtaShouldScroll =
    !secondaryCtaHref || isServicesScrollHref(secondaryCtaHref);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-lime-50/70">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-24 md:px-10 md:pb-16 md:pt-28 lg:pb-20 lg:pt-32">
          <div className="max-w-4xl">
            {heroEyebrow ? (
              <span className="inline-flex rounded-full border border-lime-200 bg-lime-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">
                {heroEyebrow}
              </span>
            ) : null}

            {heroTitle ? (
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-950 md:text-5xl xl:text-6xl">
                {heroTitle}
              </h1>
            ) : null}

            {heroSubtitle ? (
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                {heroSubtitle}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-400"
              >
                {primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>

              {secondaryCtaShouldScroll ? (
                <button
                  type="button"
                  onClick={handleExploreServices}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  {secondaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  href={secondaryCtaHref}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  {secondaryCtaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {featuredCards.length > 0 ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredCards.map((card) => {
                const title = getLocalizedText(card.title, locale);
                const description = getLocalizedText(card.description, locale);

                if (!title && !description) return null;

                return (
                  <article
                    key={card.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    {title ? (
                      <h2 className="text-base font-semibold text-slate-900">
                        {title}
                      </h2>
                    ) : null}

                    {description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {description}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section
        id="services"
        ref={servicesSectionRef}
        className="mx-auto max-w-7xl scroll-mt-28 px-6 py-14 md:px-10"
      >
        <h2 className="text-3xl font-semibold text-slate-950 md:text-4xl">
          {copy.sectionTitle}
        </h2>
      </section>

      {services.length === 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-20 md:px-10">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
            <h3 className="text-2xl font-semibold text-slate-950">
              {copy.emptyTitle}
            </h3>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {copy.emptyText}
            </p>
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-6 pb-20 pt-2 md:px-10">
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => {
              const title = getLocalizedText(service.title, locale);
              const excerpt = getServiceExcerpt(service, locale);
              const categoryLabel = formatCategoryLabel(service.category);

              return (
                <article
                  key={service._id || service.slug}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-lime-300 hover:shadow-xl"
                >
                  <Link href={`/services/${service.slug}`} className="block h-full">
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      {resolveImageSrc(service.coverImage) ? (
                        <Image
                          src={resolveImageSrc(service.coverImage)}
                          alt={title || "Service image"}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          unoptimized
                          className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-200" />
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/35 to-transparent" />

                      {categoryLabel ? (
                        <span className="absolute left-4 top-4 inline-flex rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                          {categoryLabel}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex h-[calc(100%-theme(spacing.0))] flex-col p-6">
                      <h3 className="text-xl font-semibold leading-snug text-slate-950 transition group-hover:text-lime-700">
                        {title || service.slug}
                      </h3>

                      {excerpt ? (
                        <p className="mt-4 line-clamp-5 text-sm leading-7 text-slate-600">
                          {excerpt}
                        </p>
                      ) : null}

                      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lime-700">
                        {copy.viewDetail}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="border-t border-slate-200 bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:px-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              {copy.finalTitle}
            </h2>

            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              {copy.finalText}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-400"
            >
              {copy.requestQuote}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {copy.contact}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}