/**
 * =============================================================================
 * 📄 Page: Public Project Detail
 * Path: src/app/projects/[slug]/page.tsx
 * =============================================================================
 *
 * ES:
 * Página pública de detalle para un proyecto autorizado por el cliente.
 *
 * Objetivo:
 * - consumir el endpoint público GET /api/public/projects/[slug]
 * - mostrar identidad pública del proyecto
 * - presentar portada principal
 * - presentar resumen público
 * - presentar la galería en un carrusel pequeño y limpio
 *
 * Reglas:
 * - esta página NO expone documentos internos
 * - esta página NO expone mantenimientos
 * - solo usa el contrato público permitido por el endpoint
 * - debe mantenerse coherente con el estilo público de Sierra Tech
 *
 * Decisiones:
 * - la carga usa URL absoluta construida desde headers para evitar problemas
 *   de fetch en Server Components
 * - las imágenes públicas resuelven tanto URL completa como storageKey
 * - el idioma visible queda estable en español por ahora
 * =============================================================================
 */

import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ProjectGalleryCarousel from "@/components/public/ProjectGalleryCarousel";

type LocalizedText = {
  es: string;
  en: string;
};

type ProjectImage = {
  url: string;
  alt: string;
  storageKey: string;
};

type PublicProjectResponseItem = {
  _id: string;
  slug: string;
  title: LocalizedText;
  summary: LocalizedText;
  coverImage: ProjectImage | null;
  gallery: ProjectImage[];
  featured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type PublicProjectResponse =
  | {
      ok: true;
      item: PublicProjectResponseItem;
    }
  | {
      ok: false;
      error: string;
    };

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveText(value: LocalizedText, locale: "es" | "en"): string {
  return locale === "en"
    ? normalizeString(value.en) || normalizeString(value.es)
    : normalizeString(value.es) || normalizeString(value.en);
}

function resolveBaseUrl(
  host: string,
  forwardedProto: string | null
): string {
  const safeHost = normalizeString(host);
  const safeProto = normalizeString(forwardedProto) || "http";

  if (!safeHost) {
    return "http://localhost:3000";
  }

  return `${safeProto}://${safeHost}`;
}

function resolveImageUrl(
  image: ProjectImage | null,
  baseUrl: string
): string {
  if (!image) return "";

  const directUrl = normalizeString(image.url);
  const storageKey = normalizeString(image.storageKey);
  const raw = directUrl || storageKey;

  if (!raw) {
    return "";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${baseUrl}${raw}`;
  }

  if (raw.startsWith("admin/")) {
    return `${baseUrl}/api/admin/uploads/view?key=${encodeURIComponent(raw)}`;
  }

  return "";
}

async function getProjectBySlug(
  slug: string,
  baseUrl: string
): Promise<PublicProjectResponseItem | null> {
  try {
    const response = await fetch(
      `${baseUrl}/api/public/projects/${encodeURIComponent(slug)}`,
      {
        cache: "no-store",
      }
    );

    const json = (await response.json().catch(() => null)) as
      | PublicProjectResponse
      | null;

    if (!response.ok || !json || !json.ok) {
      return null;
    }

    return json.item;
  } catch {
    return null;
  }
}

export default async function PublicProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const locale: "es" | "en" = "es";

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const forwardedProto = headersList.get("x-forwarded-proto");
  const baseUrl = resolveBaseUrl(host, forwardedProto);

  const project = await getProjectBySlug(slug, baseUrl);

  if (!project) {
    notFound();
  }

  const title = resolveText(project.title, locale);
  const summary = resolveText(project.summary, locale);
  const coverImageUrl = resolveImageUrl(project.coverImage, baseUrl);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-lime-50">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-24 md:px-10 md:pb-14 md:pt-28 lg:pb-16 lg:pt-32">
          <div className="mb-8">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 hover:text-lime-700"
            >
              ← Volver a proyectos
            </Link>
          </div>

          <div className="grid items-center gap-12 xl:grid-cols-[1.05fr_0.95fr] xl:gap-16">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">
                {project.featured ? "Proyecto destacado" : "Proyecto autorizado"}
              </span>

              <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] text-slate-950 md:text-5xl xl:text-[4rem]">
                {title || "Proyecto sin título"}
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-slate-600 md:text-lg md:leading-9">
                {summary || "Este proyecto no tiene resumen público."}
              </p>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="aspect-[16/10] bg-slate-100">
                {coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImageUrl}
                    alt={project.coverImage?.alt || title || "Proyecto"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                    Sin portada disponible
                  </div>
                )}
              </div>

              {project.coverImage?.alt?.trim() ? (
                <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Imagen principal
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {project.coverImage.alt.trim()}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-12">
        <div className="grid grid-cols-1 gap-8">
          <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-9">
            <h2 className="text-3xl font-semibold text-slate-950 md:text-[2.2rem]">
              Resumen del proyecto
            </h2>
            <p className="mt-5 max-w-4xl text-base leading-8 text-slate-600 md:text-lg md:leading-9">
              {summary || "Este proyecto no tiene resumen público."}
            </p>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-9">
            <ProjectGalleryCarousel
              items={project.gallery}
              projectTitle={title}
              baseUrl={baseUrl}
            />
          </section>
        </div>
      </section>
    </main>
  );
}