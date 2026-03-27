"use client";

/**
 * =============================================================================
 * 📄 Component: ServicesPageClient
 * Path: src/components/services/ServicesPageClient.tsx
 * =============================================================================
 *
 * ES:
 *   Capa cliente mínima para la página pública de servicios.
 *   Recibe datos ya resueltos desde servidor y conserva:
 *   - idioma activo
 *   - scroll al bloque de servicios
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

function getLocalizedText(
  value: LocalizedText | undefined,
  locale: Locale
): string {
  if (!value) return "";
  return locale === "es" ? value.es : value.en;
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
      fallbackTitle:
        locale === "es"
          ? "Servicios especializados para infraestructura, tratamiento y sostenibilidad"
          : "Specialized services for infrastructure, treatment, and sustainability",

      fallbackSubtitle:
        locale === "es"
          ? "Integramos soluciones confiables para tratamiento de agua, control de olores, biorremediación, procesos microbiológicos y sistemas de energía limpia."
          : "We integrate reliable solutions for water treatment, odor control, bioremediation, microbiological processes, and clean energy systems.",

      sectionEyebrow: "Sierra Tech",
      sectionTitle: locale === "es" ? "Nuestros servicios" : "Our services",
      sectionText:
        locale === "es"
          ? "Cada servicio responde a una necesidad técnica concreta, con enfoque en desempeño operativo, implementación ordenada y continuidad de funcionamiento."
          : "Each service addresses a concrete technical need, with a focus on operational performance, structured implementation, and continuity.",

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

      finalTitle:
        locale === "es"
          ? "¿Necesitas una solución a la medida?"
          : "Need a tailored solution?",

      finalText:
        locale === "es"
          ? "Podemos ayudarte a evaluar requerimientos técnicos, condiciones de instalación y alcance del proyecto."
          : "We can help you evaluate technical requirements, installation conditions, and project scope.",

      quote: locale === "es" ? "Solicitar cotización" : "Request a quote",
      contact: locale === "es" ? "Ir a contacto" : "Go to contact",
    };
  }, [locale]);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-lime-50/70">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-24 md:px-10 md:pb-16 md:pt-28 lg:pb-20 lg:pt-32">
          <div className="max-w-4xl">
            {getLocalizedText(pageHeader.eyebrow, locale) ? (
              <span className="inline-flex rounded-full border border-lime-200 bg-lime-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">
                {getLocalizedText(pageHeader.eyebrow, locale)}
              </span>
            ) : null}

            <h1 className="mt-6 text-4xl font-semibold leading-tight text-slate-950 md:text-5xl xl:text-6xl">
              {getLocalizedText(pageHeader.title, locale) || copy.fallbackTitle}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              {getLocalizedText(pageHeader.subtitle, locale) ||
                copy.fallbackSubtitle}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href={pageHeader.primaryCtaHref || "/contact"}
                className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-400"
              >
                {getLocalizedText(pageHeader.primaryCtaLabel, locale) ||
                  copy.quote}
                <ArrowRight className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={handleExploreServices}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                {getLocalizedText(pageHeader.secondaryCtaLabel, locale) ||
                  copy.exploreServices}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {featuredCards.length ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredCards.map((card) => {
                const title = getLocalizedText(card.title, locale);
                const description = getLocalizedText(card.description, locale);

                return (
                  <article
                    key={card.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                  >
                    <h2 className="text-base font-semibold text-slate-900">
                      {title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {description}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </section>

      <section
        ref={servicesSectionRef}
        className="mx-auto max-w-7xl px-6 py-14 md:px-10"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-700">
          {copy.sectionEyebrow}
        </p>

        <h2 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">
          {copy.sectionTitle}
        </h2>

        <p className="mt-4 text-base leading-8 text-slate-600">
          {copy.sectionText}
        </p>
      </section>

      {!services.length ? (
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
        <section className="mx-auto max-w-7xl px-6 pt-8 pb-20 md:px-10">
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => {
              const title = getLocalizedText(service.title, locale);
              const summary = getLocalizedText(service.summary, locale);

              return (
                <article
                  key={service._id || service.slug}
                  className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-lime-300 hover:shadow-xl"
                >
                  <Link href={`/services/${service.slug}`} className="block">
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      {service.coverImage ? (
                        <Image
                          src={service.coverImage}
                          alt={title || "Service image"}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-200" />
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/35 to-transparent" />

                      {service.category ? (
                        <span className="absolute left-4 top-4 inline-flex rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
                          {service.category}
                        </span>
                      ) : null}
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-semibold leading-snug text-slate-950 transition group-hover:text-lime-700">
                        {title}
                      </h3>

                      <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">
                        {summary}
                      </p>

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
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-400">
              Sierra Tech
            </p>

            <h2 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
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
              {copy.quote}
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