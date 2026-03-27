/**
 * =============================================================================
 * 📄 Page: Public Service Detail (SERVER)
 * Path: src/app/services/[slug]/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página pública de detalle de servicio renderizada en servidor.
 *
 *   Objetivo:
 *   - Eliminar fetch en cliente para mejorar acceso y retorno
 *   - Entregar HTML ya resuelto
 *   - Resolver idioma desde cookie para soportar ES / EN
 *
 * EN:
 *   Public service detail page rendered on the server.
 * =============================================================================
 */

import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft, ArrowRight, FileText } from "lucide-react";

import { connectToDB } from "@/lib/connectToDB";
import Service from "@/models/Service";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";

interface LocalizedText {
  es: string;
  en: string;
}

interface ServiceGalleryItem {
  url: string;
  alt: LocalizedText;
  order: number;
}

interface ServiceAttachmentRef {
  documentId: string;
  title: string;
}

interface ServiceTechnicalSpecs {
  capacity: LocalizedText;
  flowRate: LocalizedText;
  material: LocalizedText;
  application: LocalizedText;
  technology: LocalizedText;
}

interface ServiceDetail {
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  description: LocalizedText;
  coverImage: string;
  category: string;
  gallery: ServiceGalleryItem[];
  technicalSpecs: ServiceTechnicalSpecs;
  attachments: ServiceAttachmentRef[];
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

interface SpecItem {
  key: string;
  label: string;
  value: string;
}

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

export const revalidate = 300;

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = {
  es: "",
  en: "",
};

const EMPTY_SERVICE: ServiceDetail = {
  slug: "",
  title: { es: "", en: "" },
  summary: { es: "", en: "" },
  description: { es: "", en: "" },
  coverImage: "",
  category: "",
  gallery: [],
  technicalSpecs: {
    capacity: { es: "", en: "" },
    flowRate: { es: "", en: "" },
    material: { es: "", en: "" },
    application: { es: "", en: "" },
    technology: { es: "", en: "" },
  },
  attachments: [],
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function resolveServerLocale(value: string | undefined): Locale {
  return value === "en" ? "en" : "es";
}

function getLocalizedText(
  value: LocalizedText | undefined,
  locale: Locale
): string {
  if (!value) return "";
  return locale === "es" ? value.es : value.en;
}

function normalizeLocalizedText(value: unknown): LocalizedText {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_LOCALIZED_TEXT };
  }

  const record = value as Record<string, unknown>;

  return {
    es: typeof record.es === "string" ? record.es : "",
    en: typeof record.en === "string" ? record.en : "",
  };
}

function normalizeGallery(value: unknown): ServiceGalleryItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record =
        item && typeof item === "object"
          ? (item as Record<string, unknown>)
          : null;

      return {
        url: typeof record?.url === "string" ? record.url : "",
        alt: normalizeLocalizedText(record?.alt),
        order:
          typeof record?.order === "number" && Number.isFinite(record.order)
            ? record.order
            : 0,
      };
    })
    .filter((item) => item.url.trim().length > 0)
    .sort((a, b) => a.order - b.order);
}

function normalizeAttachments(value: unknown): ServiceAttachmentRef[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const record =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : null;

    const rawDocumentId = record?.documentId;

    return {
      documentId:
        typeof rawDocumentId === "string"
          ? rawDocumentId
          : rawDocumentId &&
              typeof rawDocumentId === "object" &&
              "toString" in rawDocumentId
            ? String(rawDocumentId)
            : "",
      title: typeof record?.title === "string" ? record.title : "",
    };
  });
}

function normalizeService(value: unknown): ServiceDetail {
  if (!value || typeof value !== "object") {
    return structuredClone(EMPTY_SERVICE);
  }

  const record = value as Record<string, unknown>;
  const technicalSpecs =
    record.technicalSpecs && typeof record.technicalSpecs === "object"
      ? (record.technicalSpecs as Record<string, unknown>)
      : {};

  return {
    slug: typeof record.slug === "string" ? record.slug : "",
    title: normalizeLocalizedText(record.title),
    summary: normalizeLocalizedText(record.summary),
    description: normalizeLocalizedText(record.description),
    coverImage: typeof record.coverImage === "string" ? record.coverImage : "",
    category: typeof record.category === "string" ? record.category : "",
    gallery: normalizeGallery(record.gallery),
    technicalSpecs: {
      capacity: normalizeLocalizedText(technicalSpecs.capacity),
      flowRate: normalizeLocalizedText(technicalSpecs.flowRate),
      material: normalizeLocalizedText(technicalSpecs.material),
      application: normalizeLocalizedText(technicalSpecs.application),
      technology: normalizeLocalizedText(technicalSpecs.technology),
    },
    attachments: normalizeAttachments(record.attachments),
  };
}

function hasLocalizedContent(value: LocalizedText | undefined): boolean {
  if (!value) return false;
  return value.es.trim().length > 0 || value.en.trim().length > 0;
}

function hasTechnicalSpecs(specs: ServiceTechnicalSpecs): boolean {
  return (
    hasLocalizedContent(specs.capacity) ||
    hasLocalizedContent(specs.flowRate) ||
    hasLocalizedContent(specs.material) ||
    hasLocalizedContent(specs.application) ||
    hasLocalizedContent(specs.technology)
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function ServiceDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug?.trim().toLowerCase() || "";

  const cookieStore = await cookies();
  const locale = resolveServerLocale(
    cookieStore.get("locale")?.value || cookieStore.get("NEXT_LOCALE")?.value
  );

  const text = {
    notFoundTitle:
      locale === "es" ? "Servicio no encontrado" : "Service not found",
    notFoundText:
      locale === "es"
        ? "No fue posible encontrar el servicio solicitado."
        : "The requested service could not be found.",
    back: locale === "es" ? "Volver a servicios" : "Back to services",
    descriptionTitle:
      locale === "es" ? "Descripción del servicio" : "Service description",
    specsTitle:
      locale === "es"
        ? "Especificaciones técnicas"
        : "Technical specifications",
    galleryTitle: locale === "es" ? "Galería" : "Gallery",
    attachmentsTitle:
      locale === "es" ? "Documentos relacionados" : "Related documents",
    capacity: locale === "es" ? "Capacidad" : "Capacity",
    flowRate: locale === "es" ? "Caudal" : "Flow rate",
    material: locale === "es" ? "Material" : "Material",
    application: locale === "es" ? "Aplicación" : "Application",
    technology: locale === "es" ? "Tecnología" : "Technology",
    document: locale === "es" ? "Documento" : "Document",
    finalTitle:
      locale === "es"
        ? "¿Necesitas este servicio para tu proyecto?"
        : "Need this service for your project?",
    finalText:
      locale === "es"
        ? "Podemos ayudarte a revisar requerimientos, alcance técnico y condiciones de implementación."
        : "We can help you review requirements, technical scope, and implementation conditions.",
    quote: locale === "es" ? "Solicitar cotización" : "Request a quote",
  };

  if (!slug) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-slate-900 md:px-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
          <h1 className="text-2xl font-semibold text-slate-950 md:text-3xl">
            {text.notFoundTitle}
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            {text.notFoundText}
          </p>

          <div className="mt-8">
            <Link
              href="/services"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {text.back}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  await connectToDB();

  const rawService = await Service.findOne({
    slug,
    status: "published",
  }).lean();

  const service = rawService ? normalizeService(rawService) : null;

  if (!service) {
    return (
      <main className="min-h-screen bg-white px-6 py-16 text-slate-900 md:px-10">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
          <h1 className="text-2xl font-semibold text-slate-950 md:text-3xl">
            {text.notFoundTitle}
          </h1>

          <p className="mt-4 text-base leading-7 text-slate-600">
            {text.notFoundText}
          </p>

          <div className="mt-8">
            <Link
              href="/services"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {text.back}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const title = getLocalizedText(service.title, locale);
  const summary = getLocalizedText(service.summary, locale);
  const description = getLocalizedText(service.description, locale);
  const hasSpecs = hasTechnicalSpecs(service.technicalSpecs);

  const specItems: SpecItem[] = [
    {
      key: "capacity",
      label: text.capacity,
      value: getLocalizedText(service.technicalSpecs.capacity, locale),
    },
    {
      key: "flowRate",
      label: text.flowRate,
      value: getLocalizedText(service.technicalSpecs.flowRate, locale),
    },
    {
      key: "material",
      label: text.material,
      value: getLocalizedText(service.technicalSpecs.material, locale),
    },
    {
      key: "application",
      label: text.application,
      value: getLocalizedText(service.technicalSpecs.application, locale),
    },
    {
      key: "technology",
      label: text.technology,
      value: getLocalizedText(service.technicalSpecs.technology, locale),
    },
  ].filter((item) => item.value.trim().length > 0);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-lime-50/70">
        <div className="mx-auto max-w-6xl px-6 pt-28 pb-14 md:px-10 md:pt-32 lg:pt-36 lg:pb-18">
          <div className="max-w-4xl">
            <Link
              href="/services"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {text.back}
            </Link>

            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-700">
              {service.category || "Sierra Tech"}
            </p>

            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950 md:text-5xl">
              {title}
            </h1>

            {summary ? (
              <p className="mt-6 text-base leading-8 text-slate-600 md:text-lg">
                {summary}
              </p>
            ) : null}
          </div>

          <div className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-sm">
            <div className="relative aspect-[16/8] w-full">
              {service.coverImage ? (
                <Image
                  src={service.coverImage}
                  alt={title || "Service image"}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="h-full w-full bg-slate-200" />
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-14 md:px-10">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">
            {text.descriptionTitle}
          </h2>

          <p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-700">
            {description}
          </p>
        </div>
      </section>

      {hasSpecs ? (
        <section className="mx-auto max-w-6xl px-6 pb-14 md:px-10">
          <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">
            {text.specsTitle}
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {specItems.map((item) => (
              <article
                key={item.key}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lime-700">
                  {item.label}
                </p>

                <p className="mt-3 text-base leading-7 text-slate-700">
                  {item.value}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {service.gallery.length ? (
        <section className="mx-auto max-w-6xl px-6 pb-14 md:px-10">
          <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">
            {text.galleryTitle}
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {service.gallery.map((item) => (
              <article
                key={`${item.url}-${item.order}`}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
              >
                <div className="relative aspect-[16/11] bg-slate-100">
                  <Image
                    src={item.url}
                    alt={
                      getLocalizedText(item.alt, locale) ||
                      title ||
                      "Gallery image"
                    }
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {service.attachments.length ? (
        <section className="mx-auto max-w-4xl px-6 pb-16 md:px-10">
          <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">
            {text.attachmentsTitle}
          </h2>

          <div className="mt-8 space-y-4">
            {service.attachments.map((attachment, index) => (
              <div
                key={`${attachment.documentId || "attachment"}-${index}`}
                className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-slate-900 p-3 text-lime-400">
                    <FileText className="h-5 w-5" />
                  </div>

                  <p className="text-base font-semibold text-slate-900">
                    {attachment.title || text.document}
                  </p>
                </div>

                <span className="text-sm font-medium text-slate-400">
                  {attachment.documentId || "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="border-t border-slate-200 bg-slate-950">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:px-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              {text.finalTitle}
            </h2>

            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
              {text.finalText}
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-lime-400"
            >
              {text.quote}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}