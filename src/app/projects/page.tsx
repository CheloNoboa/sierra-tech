/**
 * =============================================================================
 * 📄 Page: Public Projects Listing
 * Path: src/app/projects/page.tsx
 * =============================================================================
 *
 * ES:
 * Página pública para listar los proyectos publicados de Sierra Tech.
 *
 * Objetivo:
 * - consumir el endpoint público GET /api/public/projects
 * - mostrar únicamente proyectos autorizados para el sitio público
 * - renderizar portada, título y resumen en una grilla pública estable
 * - permitir navegación al detalle público del proyecto por slug
 *
 * Reglas:
 * - esta página NO expone datos internos
 * - solo usa el contrato público del endpoint
 * - debe mantenerse visualmente coherente con el sitio público Sierra Tech
 * - no contiene lógica administrativa
 *
 * Decisiones:
 * - la carga usa URL absoluta construida desde headers para evitar problemas
 *   de fetch en Server Components
 * - las imágenes públicas resuelven tanto URL completa como storageKey
 * - el idioma visible queda estable en español por ahora, hasta conectar i18n
 *   público real para esta ruta
 * - los proyectos destacados se presentan primero en un bloque visual propio
 * =============================================================================
 */

import Link from "next/link";
import { cookies, headers } from "next/headers";

type LocalizedText = {
  es: string;
  en: string;
};

type ProjectImage = {
  url: string;
  alt: LocalizedText;
  storageKey: string;
};

type PublicProjectListItem = {
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

type PublicProjectsResponse =
  | {
      ok: true;
      items: PublicProjectListItem[];
    }
  | {
      ok: false;
      error: string;
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

  if (directUrl.startsWith("http://") || directUrl.startsWith("https://")) {
    return directUrl;
  }

  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }

  if (directUrl.startsWith("/")) {
    return `${baseUrl}${directUrl}`;
  }

  if (storageKey.startsWith("/")) {
    return `${baseUrl}${storageKey}`;
  }

  if (directUrl.startsWith("admin/")) {
    return `${baseUrl}/api/admin/uploads/view?key=${encodeURIComponent(
      directUrl
    )}`;
  }

  if (storageKey.startsWith("admin/")) {
    return `${baseUrl}/api/admin/uploads/view?key=${encodeURIComponent(
      storageKey
    )}`;
  }

  if (directUrl) {
    return `${baseUrl}/${directUrl}`;
  }

  if (storageKey) {
    return `${baseUrl}/${storageKey}`;
  }

  return "";
}

async function getProjects(baseUrl: string): Promise<PublicProjectListItem[]> {
  try {
    const response = await fetch(`${baseUrl}/api/public/projects`, {
      cache: "no-store",
    });

    const json = (await response.json().catch(() => null)) as
      | PublicProjectsResponse
      | null;

    if (!response.ok || !json || !json.ok) {
      return [];
    }

    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  }
}

function ProjectCard({
  project,
  locale,
  baseUrl,
  compact = false,
}: {
  project: PublicProjectListItem;
  locale: "es" | "en";
  baseUrl: string;
  compact?: boolean;
}) {
  const title = resolveText(project.title, locale);
  const summary = resolveText(project.summary, locale);
  const imageUrl = resolveImageUrl(project.coverImage, baseUrl);

  const ui = {
    noImage: locale === "en" ? "No image" : "Sin imagen",
    featured: locale === "en" ? "Featured" : "Destacado",
    noTitle: locale === "en" ? "Untitled project" : "Proyecto sin título",
    noSummary:
      locale === "en"
        ? "This project does not have a public summary."
        : "Este proyecto no tiene resumen público.",
    viewProject: locale === "en" ? "View project" : "Ver proyecto",
    projectAlt: locale === "en" ? "Project" : "Proyecto",
  };

  return (
    <article
      className={[
        "group flex h-full flex-col overflow-hidden border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        compact ? "rounded-[28px]" : "rounded-[30px]",
      ].join(" ")}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={
              resolveText(project.coverImage?.alt ?? { es: "", en: "" }, locale) ||
              title ||
              ui.projectAlt
            }
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
            {ui.noImage}
          </div>
        )}

        {project.featured ? (
          <span className="absolute left-4 top-4 inline-flex rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700 shadow-sm">
            {ui.featured}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h2
          className={[
            "font-semibold leading-snug text-slate-900",
            compact ? "text-2xl" : "text-[1.75rem]",
          ].join(" ")}
        >
          {title || ui.noTitle}
        </h2>

        <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">
          {summary || ui.noSummary}
        </p>

        <div className="mt-6 pt-2">
          <Link
            href={`/projects/${project.slug}`}
            className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-lime-600"
          >
            {ui.viewProject}
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function PublicProjectsPage() {
  const headersList = await headers();

  const host = headersList.get("host") || "localhost:3000";
  const forwardedProto = headersList.get("x-forwarded-proto");
  const baseUrl = resolveBaseUrl(host, forwardedProto);

  const projects = await getProjects(baseUrl);
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale")?.value;
  const locale: "es" | "en" = localeCookie === "en" ? "en" : "es";

  const ui = {
    badge: locale === "en" ? "Projects" : "Proyectos",
    heroTitle:
      locale === "en"
        ? "Projects executed by Sierra Tech"
        : "Proyectos ejecutados por Sierra Tech",
    heroDescription:
      locale === "en"
        ? "We present projects authorized by our clients, with a public view focused on results, technical scope, and the visual identity of the executed work."
        : "Presentamos proyectos autorizados por nuestros clientes, con una vista pública enfocada en resultados, alcance técnico e identidad visual del trabajo ejecutado.",

    noProjectsTitle:
      locale === "en"
        ? "No public projects available"
        : "No hay proyectos públicos disponibles",
    noProjectsDescription:
      locale === "en"
        ? "When published and authorized projects exist, they will appear in this section."
        : "Cuando existan proyectos publicados y autorizados, aparecerán en esta sección.",

    featuredBadge:
      locale === "en" ? "Featured selection" : "Selección destacada",
    featuredTitle:
      locale === "en" ? "Featured projects" : "Proyectos destacados",
    featuredDescription:
      locale === "en"
        ? "A selection of relevant projects authorized for public publication."
        : "Una selección de proyectos relevantes autorizados para publicación pública.",

    catalogBadge:
      locale === "en" ? "Public catalog" : "Catálogo público",
    catalogTitle:
      locale === "en" ? "All projects" : "Todos los proyectos",
    catalogDescription:
      locale === "en"
        ? "Explore the projects currently published and authorized on the site."
        : "Explora los proyectos publicados y autorizados actualmente en el sitio.",
  };

  const featuredProjects = projects.filter((project) => project.featured);
  const regularProjects = projects.filter((project) => !project.featured);

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-lime-50">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:pb-16 lg:pt-32">
          <div className="max-w-4xl">
            <span className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-lime-700">
              {ui.badge}
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              {ui.heroTitle}
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              {ui.heroDescription}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-14 md:px-10 lg:py-16">
        {projects.length === 0 ? (
          <div className="rounded-[30px] border border-slate-200 bg-slate-50 px-6 py-14 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              {ui.noProjectsTitle}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              {ui.noProjectsDescription}
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            {featuredProjects.length > 0 ? (
              <section className="space-y-6">
                <div className="max-w-3xl">
                  <span className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-lime-700">
                    {ui.featuredBadge}
                  </span>

                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {ui.featuredTitle}
                  </h2>

                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {ui.featuredDescription}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                  {featuredProjects.map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      locale={locale}
                      baseUrl={baseUrl}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {regularProjects.length > 0 ? (
              <section className="space-y-6">
                <div className="max-w-3xl">
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {ui.catalogBadge}
                  </span>

                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {ui.catalogTitle}
                  </h2>

                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {ui.catalogDescription}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 2xl:grid-cols-3">
                  {regularProjects.map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      locale={locale}
                      baseUrl={baseUrl}
                      compact
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}