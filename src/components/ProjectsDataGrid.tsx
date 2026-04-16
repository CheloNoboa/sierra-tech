"use client";

/**
 * =============================================================================
 * 📄 Component: ProjectsDataGrid
 * Path: src/components/ProjectsDataGrid.tsx
 * =============================================================================
 *
 * ES:
 * Grilla administrativa para gestión completa de proyectos.
 *
 * Patrón UX:
 * - carga inicial estable
 * - refresh manual suave
 * - creación/edición con upsert local
 * - eliminación local sin recarga global
 * - control de selección, filtros y paginación sin parpadeo
 *
 * Responsabilidades:
 * - Obtener proyectos desde la API administrativa.
 * - Mantener filtros, paginación, selección y estado del modal.
 * - Resolver etiquetas bilingües según locale actual.
 * - Sincronizar cambios locales después de crear, editar o eliminar.
 *
 * Reglas:
 * - El listado usa estado local como fuente de verdad visual.
 * - No depende de refresh global para reflejar create/edit/delete.
 * - El modal devuelve el proyecto persistido para upsert local.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Edit3,
  Globe,
  FolderKanban,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";

import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import GlobalDataGridShell from "@/components/ui/GlobalDataGridShell";
import { useToast } from "@/components/ui/GlobalToastProvider";
import ProjectModal from "@/components/ProjectModal";

import { useTranslation } from "@/hooks/useTranslation";

import type { LocalizedText, ProjectEntity } from "@/types/project";

/* -------------------------------------------------------------------------- */
/* Safe helpers                                                               */
/* -------------------------------------------------------------------------- */

function isObj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function safeJson(res: Response): Promise<unknown> {
  return (await res.json().catch(() => null)) as unknown;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    isObj(value) &&
    typeof value.es === "string" &&
    typeof value.en === "string"
  );
}

function isProjectEntity(value: unknown): value is ProjectEntity {
  if (!isObj(value)) return false;

  return (
    typeof value._id === "string" &&
    typeof value.slug === "string" &&
    isLocalizedText(value.title) &&
    isLocalizedText(value.summary) &&
    isLocalizedText(value.description) &&
    isLocalizedText(value.technicalOverview) &&
    typeof value.clientDisplayName === "string" &&
    (typeof value.primaryClientId === "string" || value.primaryClientId === null) &&
    typeof value.visibility === "string" &&
    typeof value.featured === "boolean" &&
    typeof value.sortOrder === "number" &&
    typeof value.status === "string" &&
    (
      typeof value.systemType === "string" ||
      isLocalizedText(value.systemType)
    ) &&
    (
      typeof value.treatedMedium === "string" ||
      isLocalizedText(value.treatedMedium)
    ) &&
    (
      Array.isArray(value.technologyUsed) ||
      isLocalizedText(value.technologyUsed) ||
      (
        isObj(value.technologyUsed) &&
        Array.isArray(value.technologyUsed.es) &&
        Array.isArray(value.technologyUsed.en)
      )
    ) &&
    Array.isArray(value.documents) &&
    Array.isArray(value.maintenanceItems) &&
    typeof value.operationalNotes === "string" &&
    typeof value.internalNotes === "string" &&
    typeof value.locationLabel === "string" &&
    typeof value.isPublicLocationVisible === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function extractProjects(raw: unknown): ProjectEntity[] {
  if (!isObj(raw)) return [];

  const source = Array.isArray(raw.items)
    ? raw.items
    : Array.isArray(raw.data)
      ? raw.data
      : [];

  return source.filter(isProjectEntity);
}

function getLocalizedText(value: LocalizedText, locale: "es" | "en"): string {
  const primary = locale === "es" ? value.es : value.en;
  const fallback = locale === "es" ? value.en : value.es;

  return normalizeString(primary) || normalizeString(fallback) || "—";
}

function getMixedText(
  value:
    | string
    | LocalizedText
    | null
    | undefined,
  locale: "es" | "en"
): string {
  if (typeof value === "string") {
    return normalizeString(value) || "—";
  }

  if (isLocalizedText(value)) {
    return getLocalizedText(value, locale);
  }

  return "—";
}

function getTechnologySearchText(value: unknown, locale: "es" | "en"): string {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(item)).filter(Boolean).join(" ");
  }

  if (isLocalizedText(value)) {
    return getLocalizedText(value, locale);
  }

  if (
    isObj(value) &&
    Array.isArray(value.es) &&
    Array.isArray(value.en)
  ) {
    const source = locale === "es" ? value.es : value.en;
    const fallback = locale === "es" ? value.en : value.es;

    return [...source, ...fallback]
      .map((item) => normalizeString(item))
      .filter(Boolean)
      .join(" ");
  }

  return "";
}

function formatProjectDate(
  value: string | null,
  locale: "es" | "en"
): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function upsertProject(
  prev: ProjectEntity[],
  saved: ProjectEntity
): ProjectEntity[] {
  const exists = prev.some((item) => item._id === saved._id);

  const next = exists
    ? prev.map((item) => (item._id === saved._id ? saved : item))
    : [saved, ...prev];

  return [...next].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;

    const aUpdated = new Date(a.updatedAt).getTime();
    const bUpdated = new Date(b.updatedAt).getTime();

    return bUpdated - aUpdated;
  });
}

function isPublishedToSite(project: ProjectEntity): boolean {
  return Boolean(project.publicSiteSettings?.enabled);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ProjectsDataGrid() {
  const { locale } = useTranslation();
  const safeLocale: "es" | "en" = locale === "en" ? "en" : "es";
  const toast = useToast();

  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const t = useMemo(
    () => ({
      title:
        safeLocale === "es"
          ? "Gestión de Proyectos"
          : "Projects Management",
      subtitle:
        safeLocale === "es"
          ? "Crea y administra proyectos documentales públicos y privados."
          : "Create and manage public and private documentary projects.",

      newProject: safeLocale === "es" ? "Nuevo Proyecto" : "New Project",
      refresh: safeLocale === "es" ? "Refrescar" : "Refresh",
      deleteSelected:
        safeLocale === "es" ? "Eliminar seleccionados" : "Delete selected",

      filterText:
        safeLocale === "es"
          ? "Buscar por título, slug, organización, sistema o medio tratado..."
          : "Search by title, slug, organization, system or treated medium...",

      allVisibility:
        safeLocale === "es"
          ? "Todas las visibilidades"
          : "All visibility",
      allStatuses:
        safeLocale === "es" ? "Todos los estados" : "All statuses",
      allFeatured: safeLocale === "es" ? "Todos" : "All",

      featuredOnly:
        safeLocale === "es" ? "Solo destacados" : "Featured only",
      notFeaturedOnly:
        safeLocale === "es" ? "No destacados" : "Not featured",

      publishedToSite:
        safeLocale === "es" ? "Publicado en sitio" : "Published to site",
      notPublishedToSite:
        safeLocale === "es" ? "No publicado" : "Not published",

      titleCol: safeLocale === "es" ? "Proyecto" : "Project",
      slug: "Slug",
      client: safeLocale === "es" ? "Organización" : "Organization",
      publication: safeLocale === "es" ? "Publicación" : "Publication",
      featured: safeLocale === "es" ? "Destacado" : "Featured",
      date: safeLocale === "es" ? "Actualizado" : "Updated",
      docs: "Docs",
      actions: safeLocale === "es" ? "Acciones" : "Actions",

      noResults: safeLocale === "es" ? "Sin resultados." : "No results.",
      loading:
        safeLocale === "es"
          ? "Cargando proyectos..."
          : "Loading projects...",

      resultsShort: (n: number) =>
        n === 0
          ? safeLocale === "es"
            ? "Sin resultados."
            : "No results."
          : safeLocale === "es"
            ? `Resultados: ${n}`
            : `Results: ${n}`,

      resultsLabel: (from: number, to: number, total: number) =>
        total === 0
          ? safeLocale === "es"
            ? "Sin resultados."
            : "No results."
          : safeLocale === "es"
            ? `Mostrando ${from}–${to} de ${total}`
            : `Showing ${from}–${to} of ${total}`,

      pageLabel: (page: number, total: number) =>
        safeLocale === "es"
          ? `Página ${page} de ${total}`
          : `Page ${page} of ${total}`,

      loadError:
        safeLocale === "es"
          ? "Error cargando proyectos."
          : "Error loading projects.",
      deleteSuccess:
        safeLocale === "es"
          ? "Proyectos eliminados correctamente."
          : "Projects deleted successfully.",
      deleteError:
        safeLocale === "es"
          ? "Error eliminando proyectos."
          : "Error deleting projects.",
      bulkSummary: (ok: number, fail: number) =>
        safeLocale === "es"
          ? `Se eliminaron ${ok} proyecto(s), pero ${fail} fallaron.`
          : `${ok} project(s) deleted, but ${fail} failed.`,

      confirmDeleteTitle:
        safeLocale === "es" ? "Confirmar eliminación" : "Confirm deletion",
      confirmDeleteMessage:
        safeLocale === "es"
          ? "¿Eliminar los proyectos seleccionados? Esta acción no se puede deshacer."
          : "Delete selected projects? This action cannot be undone.",
      cancel: safeLocale === "es" ? "Cancelar" : "Cancel",
      delete: safeLocale === "es" ? "Eliminar" : "Delete",

      noClient: safeLocale === "es" ? "Sin organización" : "No organization",
      yes: safeLocale === "es" ? "Sí" : "Yes",
      no: safeLocale === "es" ? "No" : "No",
    }),
    [safeLocale]
  );

  const [projects, setProjects] = useState<ProjectEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [featuredFilter, setFeaturedFilter] = useState<
    "all" | "featured" | "not_featured"
  >("all");

  const [page, setPage] = useState(1);
  const [recordsPerPage] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (hasLoadedOnceRef.current || isFetchingRef.current) return;

    hasLoadedOnceRef.current = true;
    isFetchingRef.current = true;

    async function loadInitial() {
      try {
        setLoading(true);

        const res = await fetch("/api/admin/projects", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("API error");
        }

        const raw = await safeJson(res);
        const list = extractProjects(raw);

        setProjects(list);
        setPage(1);
        setSelectedIds([]);
      } catch {
        toastRef.current.error("Error loading projects.");
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }

    void loadInitial();
  }, []);

  async function refreshProjects() {
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setRefreshing(true);

      const res = await fetch("/api/admin/projects", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Projects refresh failed");
      }

      const raw = await safeJson(res);
      const nextProjects = extractProjects(raw);

      setProjects(nextProjects);
    } catch {
      toast.error(t.loadError);
    } finally {
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    setPage(1);
  }, [searchText, featuredFilter]);

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const query = searchText.trim().toLowerCase();

      const titleEs = normalizeString(project.title.es).toLowerCase();
      const titleEn = normalizeString(project.title.en).toLowerCase();
      const summaryEs = normalizeString(project.summary.es).toLowerCase();
      const summaryEn = normalizeString(project.summary.en).toLowerCase();
      const slug = normalizeString(project.slug).toLowerCase();
      const clientDisplayName = normalizeString(
        project.clientDisplayName
      ).toLowerCase();
      const systemType = getMixedText(project.systemType, safeLocale).toLowerCase();
      const treatedMedium = getMixedText(project.treatedMedium, safeLocale).toLowerCase();
      const technologyUsed = getTechnologySearchText(
        project.technologyUsed,
        safeLocale
      ).toLowerCase();
      const technicalOverviewEs = normalizeString(
        project.technicalOverview.es
      ).toLowerCase();
      const technicalOverviewEn = normalizeString(
        project.technicalOverview.en
      ).toLowerCase();

      const matchText =
        !query ||
        titleEs.includes(query) ||
        titleEn.includes(query) ||
        summaryEs.includes(query) ||
        summaryEn.includes(query) ||
        slug.includes(query) ||
        clientDisplayName.includes(query) ||
        systemType.includes(query) ||
        treatedMedium.includes(query) ||
        technologyUsed.includes(query) ||
        technicalOverviewEs.includes(query) ||
        technicalOverviewEn.includes(query);

      const matchFeatured =
        featuredFilter === "all" ||
        (featuredFilter === "featured" && project.featured) ||
        (featuredFilter === "not_featured" && !project.featured);

      return matchText && matchFeatured;
    });
  }, [projects, searchText, featuredFilter, safeLocale]);

  const total = filtered.length;
  const totalPages = total > 0 ? Math.ceil(total / recordsPerPage) : 1;
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    return filtered.slice(
      (currentPage - 1) * recordsPerPage,
      currentPage * recordsPerPage
    );
  }, [currentPage, filtered, recordsPerPage]);

  const from = total === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
  const to = Math.min(total, currentPage * recordsPerPage);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const validIds = new Set(projects.map((project) => project._id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [projects]);

  const pageIds = paginated.map((project) => project._id);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  function handleEdit(projectId: string) {
    setEditingId(projectId);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditingId(null);
  }

  function handleProjectSaved(savedProject: ProjectEntity) {
    setProjects((prev) => upsertProject(prev, savedProject));
    setModalOpen(false);
    setEditingId(null);
  }

  async function deleteOneRequest(id: string): Promise<boolean> {
    const res = await fetch(`/api/admin/projects/${id}`, {
      method: "DELETE",
    });

    return res.ok;
  }

  async function deleteSelectedProjects() {
    if (selectedIds.length === 0) return;

    setBulkDeleting(true);

    try {
      let ok = 0;
      let fail = 0;
      const idsToDelete = [...selectedIds];
      const deletedIds: string[] = [];

      for (const id of idsToDelete) {
        const deleted = await deleteOneRequest(id);

        if (deleted) {
          ok += 1;
          deletedIds.push(id);
        } else {
          fail += 1;
        }
      }

      if (deletedIds.length > 0) {
        const deletedSet = new Set(deletedIds);

        setProjects((prev) =>
          prev.filter((project) => !deletedSet.has(project._id))
        );

        setSelectedIds((prev) => prev.filter((id) => !deletedSet.has(id)));
      }

      if (fail === 0) {
        toast.success(t.deleteSuccess);
      } else {
        toast.error(t.bulkSummary(ok, fail));
      }

      setShowDeleteModal(false);
    } catch {
      toast.error(t.deleteError);
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <>
      <GlobalDataGridShell
        title={t.title}
        subtitle={t.subtitle}
        icon={<FolderKanban className="h-7 w-7 text-brand-primaryStrong" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <GlobalButton
              variant="secondary"
              size="sm"
              loading={refreshing}
              leftIcon={<RefreshCw size={14} />}
              className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
              onClick={() => void refreshProjects()}
            >
              {t.refresh}
            </GlobalButton>

            <GlobalButton
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              disabled={selectedIds.length === 0}
              className="border border-status-error bg-surface text-status-error hover:bg-surface-soft disabled:border-border disabled:text-text-muted"
              onClick={() => setShowDeleteModal(true)}
            >
              {t.deleteSelected}
            </GlobalButton>

            <GlobalButton
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
              onClick={handleCreate}
            >
              {t.newProject}
            </GlobalButton>
          </div>
        }
        filters={
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 xl:grid-cols-3">
              <div className="flex flex-col xl:col-span-2">
                <label
                  htmlFor="project-filter-text"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.titleCol}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
                  <input
                    id="project-filter-text"
                    name="project-filter-text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.currentTarget.value)}
                    placeholder={t.filterText}
                    autoComplete="off"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="project-filter-featured"
                  className="mb-1 text-[11px] text-text-secondary"
                >
                  {t.featured}
                </label>
                <select
                  id="project-filter-featured"
                  name="project-filter-featured"
                  value={featuredFilter}
                  onChange={(e) =>
                    setFeaturedFilter(
                      e.currentTarget.value as "all" | "featured" | "not_featured"
                    )
                  }
                  className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
                >
                  <option value="all">{t.allFeatured}</option>
                  <option value="featured">{t.featuredOnly}</option>
                  <option value="not_featured">{t.notFeaturedOnly}</option>
                </select>
              </div>
            </div>

            <span className="text-[11px] text-text-muted">
              {t.resultsShort(total)}
            </span>
          </div>
        }
        footer={
          <div className="flex w-full items-center justify-between text-xs text-text-secondary">
            <span>{t.resultsLabel(from, to, total)}</span>

            <div className="flex items-center gap-2">
              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === 1}
                onClick={() => setPage(1)}
              >
                «
              </GlobalButton>

              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </GlobalButton>

              <span>{t.pageLabel(currentPage, totalPages)}</span>

              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === totalPages || total === 0}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </GlobalButton>

              <GlobalButton
                variant="secondary"
                size="sm"
                className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
                disabled={currentPage === totalPages || total === 0}
                onClick={() => setPage(totalPages)}
              >
                »
              </GlobalButton>
            </div>
          </div>
        }
      >
        <table className="w-full border-collapse text-left text-sm text-text-secondary">
          <thead>
            <tr className="border-b border-border bg-surface-soft text-text-primary">
              <th className="w-10 px-3 py-3">#</th>

              <th className="w-10 px-3 py-3 text-center">
                <input
                  id="projects-select-all"
                  name="projects-select-all"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                <label htmlFor="projects-select-all" className="sr-only">
                  Select all
                </label>
              </th>

              <th className="px-3 py-3">{t.titleCol}</th>
              <th className="px-3 py-3">{t.slug}</th>
              <th className="px-3 py-3">{t.client}</th>
              <th className="px-3 py-3">{t.publication}</th>
              <th className="px-3 py-3 text-center">{t.featured}</th>
              <th className="px-3 py-3">{t.date}</th>
              <th className="px-3 py-3 text-center">{t.docs}</th>
              <th className="px-3 py-3 text-right">{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-5 text-center text-text-secondary"
                >
                  {t.loading}
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-5 text-center text-text-muted">
                  {t.noResults}
                </td>
              </tr>
            ) : (
              paginated.map((project, idx) => {
                const checked = selectedIds.includes(project._id);
                const projectTitle = getLocalizedText(project.title, safeLocale);

                return (
                  <tr
                    key={project._id}
                    className={`border-b border-border transition ${
                      checked ? "bg-surface-soft" : "bg-surface"
                    } hover:bg-surface-soft`}
                  >
                    <td className="px-3 py-3 text-text-secondary">
                      {(currentPage - 1) * recordsPerPage + idx + 1}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <input
                        id={`projects-row-${project._id}`}
                        name={`projects-row-${project._id}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleOne(project._id)}
                      />
                      <label
                        htmlFor={`projects-row-${project._id}`}
                        className="sr-only"
                      >
                        Select project {projectTitle}
                      </label>
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-brand-primaryStrong">
                          {projectTitle}
                        </span>
                        <span className="line-clamp-2 text-xs text-text-secondary">
                          {getLocalizedText(project.summary, safeLocale)}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-text-primary">
                      {project.slug}
                    </td>

                    <td className="px-3 py-3 text-text-primary">
                      {project.clientDisplayName || t.noClient}
                    </td>

                    <td className="px-3 py-3 text-text-primary">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                          isPublishedToSite(project)
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-slate-200 bg-slate-50 text-slate-500",
                        ].join(" ")}
                      >
                        <Globe size={12} />
                        {isPublishedToSite(project)
                          ? t.publishedToSite
                          : t.notPublishedToSite}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center text-text-primary">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                          project.featured
                            ? "border border-amber-200 bg-amber-50 text-amber-700"
                            : "border border-slate-200 bg-slate-50 text-slate-500",
                        ].join(" ")}
                      >
                        <Star size={12} />
                        {project.featured ? t.yes : t.no}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-text-secondary">
                      {formatProjectDate(project.updatedAt, safeLocale)}
                    </td>

                    <td className="px-3 py-3 text-center text-text-primary">
                      {project.documents.length}
                    </td>

                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          aria-label={`Editar proyecto ${projectTitle}`}
                          className="rounded-md border border-border bg-surface p-1.5 text-text-primary transition hover:bg-surface-soft"
                          onClick={() => handleEdit(project._id)}
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          aria-label={`Eliminar proyecto ${projectTitle}`}
                          className="rounded-md border border-status-error bg-surface p-1.5 text-status-error transition hover:bg-surface-soft"
                          onClick={() => {
                            setSelectedIds([project._id]);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </GlobalDataGridShell>

      <GlobalConfirm
        open={showDeleteModal}
        title={t.confirmDeleteTitle}
        message={t.confirmDeleteMessage}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        loading={bulkDeleting}
        onCancel={() => {
          if (!bulkDeleting) setShowDeleteModal(false);
        }}
        onConfirm={() => void deleteSelectedProjects()}
      />

      <ProjectModal
        isOpen={modalOpen}
        projectId={editingId}
        onClose={handleModalClose}
        onSaved={handleProjectSaved}
      />
    </>
  );
}