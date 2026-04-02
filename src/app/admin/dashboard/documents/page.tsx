"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Documents Library
 * Path: src/app/admin/dashboard/documents/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página administrativa para gestionar la biblioteca documental del sistema.
 *
 *   Responsabilidades:
 *   - Consultar documentos desde el endpoint administrativo.
 *   - Renderizar listado estable con búsqueda y filtros.
 *   - Normalizar respuestas del backend de forma defensiva.
 *   - Mostrar estados de carga, error y vacío sin romper la UI.
 *   - Preparar una base sólida para acciones posteriores:
 *     crear, editar, abrir archivo y eliminar.
 *
 *   Decisiones de implementación:
 *   - La carga inicial y los refetch por filtros usan el mismo flujo.
 *   - Se evita doble ejecución inicial innecesaria.
 *   - Se cancela la petición anterior cuando cambia el criterio de búsqueda.
 *   - La UI no depende de que todos los campos del backend vengan perfectos.
 *
 * EN:
 *   Administrative page for managing the system document library.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Globe,
  Lock,
  Shield,
  ExternalLink,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type DocumentVisibility = "public" | "private" | "internal";
type DocumentStatus = "draft" | "published" | "archived";
type DocumentLanguage = "es" | "en" | "both" | "other";
type StatusFilter = "all" | DocumentStatus;
type VisibilityFilter = "all" | DocumentVisibility;

interface LocalizedText {
  es: string;
  en: string;
}

interface AdminDocument {
  _id: string;
  title: LocalizedText;
  description: LocalizedText;
  type: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  thumbnailUrl: string;
  language: DocumentLanguage;
  category: string;
  relatedModule: string;
  relatedEntityId: string | null;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  order: number;
  featured: boolean;
  uploadedAt: string;
  updatedBy: string;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsApiResponse {
  ok: boolean;
  data?: unknown;
  message?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeLocalizedText(value: unknown): LocalizedText {
  if (!value || typeof value !== "object") {
    return { es: "", en: "" };
  }

  const record = value as Record<string, unknown>;

  return {
    es: normalizeString(record.es),
    en: normalizeString(record.en),
  };
}

function normalizeDocumentLanguage(value: unknown): DocumentLanguage {
  return value === "en" || value === "both" || value === "other" ? value : "es";
}

function normalizeDocumentVisibility(value: unknown): DocumentVisibility {
  return value === "private" || value === "internal" ? value : "public";
}

function normalizeDocumentStatus(value: unknown): DocumentStatus {
  return value === "draft" || value === "archived" ? value : "published";
}

function normalizeDocument(value: unknown): AdminDocument {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const rawId = record._id;
  const rawRelatedEntityId = record.relatedEntityId;

  return {
    _id:
      typeof rawId === "string"
        ? rawId
        : rawId && typeof rawId === "object" && "toString" in rawId
          ? String(rawId)
          : "",
    title: normalizeLocalizedText(record.title),
    description: normalizeLocalizedText(record.description),
    type: normalizeString(record.type, "pdf"),
    fileUrl: normalizeString(record.fileUrl),
    fileName: normalizeString(record.fileName),
    mimeType: normalizeString(record.mimeType),
    fileSizeBytes: Math.max(0, normalizeNumber(record.fileSizeBytes, 0)),
    thumbnailUrl: normalizeString(record.thumbnailUrl),
    language: normalizeDocumentLanguage(record.language),
    category: normalizeString(record.category, "general"),
    relatedModule: normalizeString(record.relatedModule, "general"),
    relatedEntityId:
      typeof rawRelatedEntityId === "string"
        ? rawRelatedEntityId
        : rawRelatedEntityId && typeof rawRelatedEntityId === "object"
          ? String(rawRelatedEntityId)
          : null,
    visibility: normalizeDocumentVisibility(record.visibility),
    status: normalizeDocumentStatus(record.status),
    order: Math.max(1, Math.floor(normalizeNumber(record.order, 1))),
    featured: normalizeBoolean(record.featured, false),
    uploadedAt: normalizeString(record.uploadedAt),
    updatedBy: normalizeString(record.updatedBy),
    updatedByEmail: normalizeString(record.updatedByEmail),
    createdAt: normalizeString(record.createdAt),
    updatedAt: normalizeString(record.updatedAt),
  };
}

function normalizeDocuments(value: unknown): AdminDocument[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeDocument)
    .filter((document) => Boolean(document._id || document.fileUrl || document.fileName));
}

function getLocalizedText(value: LocalizedText, locale: Locale): string {
  return locale === "es"
    ? value.es || value.en || ""
    : value.en || value.es || "";
}

function formatDate(value: string, locale: Locale): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) {
    return "—";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getVisibilityMeta(
  visibility: DocumentVisibility,
  locale: Locale
): { label: string; icon: typeof Globe } {
  switch (visibility) {
    case "private":
      return {
        label: locale === "es" ? "Privado" : "Private",
        icon: Lock,
      };

    case "internal":
      return {
        label: locale === "es" ? "Interno" : "Internal",
        icon: Shield,
      };

    default:
      return {
        label: locale === "es" ? "Público" : "Public",
        icon: Globe,
      };
  }
}

function getStatusLabel(status: DocumentStatus, locale: Locale): string {
  if (status === "draft") {
    return locale === "es" ? "Borrador" : "Draft";
  }

  if (status === "archived") {
    return locale === "es" ? "Archivado" : "Archived";
  }

  return locale === "es" ? "Publicado" : "Published";
}

function getLanguageLabel(language: DocumentLanguage, locale: Locale): string {
  switch (language) {
    case "en":
      return "EN";
    case "both":
      return locale === "es" ? "ES / EN" : "EN / ES";
    case "other":
      return locale === "es" ? "Otro" : "Other";
    default:
      return "ES";
  }
}

function getStatusBadgeClass(status: DocumentStatus): string {
  switch (status) {
    case "draft":
      return "bg-amber-100 text-amber-700";
    case "archived":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminDocumentsPage() {
  const locale: Locale = "es";

  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");

  const initialLoadDoneRef = useRef<boolean>(false);

  /* ------------------------------------------------------------------------ */
  /* Copy                                                                     */
  /* ------------------------------------------------------------------------ */

  const copy = useMemo(() => {
    return {
      eyebrow: locale === "es" ? "Biblioteca documental" : "Documents library",
      title: locale === "es" ? "Documentos" : "Documents",
      subtitle:
        locale === "es"
          ? "Gestiona documentos reutilizables para servicios, proyectos y portal de clientes."
          : "Manage reusable documents for services, projects, and client portal.",

      create: locale === "es" ? "Nuevo documento" : "New document",
      refresh: locale === "es" ? "Actualizar" : "Refresh",
      searchPlaceholder:
        locale === "es"
          ? "Buscar por título, categoría, tipo o archivo..."
          : "Search by title, category, type, or file...",

      allStatuses: locale === "es" ? "Todos los estados" : "All statuses",
      draft: locale === "es" ? "Borrador" : "Draft",
      published: locale === "es" ? "Publicado" : "Published",
      archived: locale === "es" ? "Archivado" : "Archived",

      allVisibility:
        locale === "es" ? "Todas las visibilidades" : "All visibilities",
      visibilityPublic: locale === "es" ? "Público" : "Public",
      visibilityPrivate: locale === "es" ? "Privado" : "Private",
      visibilityInternal: locale === "es" ? "Interno" : "Internal",

      emptyTitle:
        locale === "es" ? "No hay documentos" : "No documents available",
      emptyText:
        locale === "es"
          ? "Cuando agregues documentos, aparecerán aquí."
          : "Once you add documents, they will appear here.",

      loading:
        locale === "es" ? "Cargando documentos..." : "Loading documents...",
      errorTitle:
        locale === "es"
          ? "No fue posible cargar los documentos"
          : "Unable to load documents",

      colTitle: locale === "es" ? "Documento" : "Document",
      colType: locale === "es" ? "Tipo" : "Type",
      colModule: locale === "es" ? "Módulo" : "Module",
      colVisibility: locale === "es" ? "Visibilidad" : "Visibility",
      colStatus: locale === "es" ? "Estado" : "Status",
      colDate: locale === "es" ? "Fecha" : "Date",
      colActions: locale === "es" ? "Acciones" : "Actions",

      edit: locale === "es" ? "Editar" : "Edit",
      remove: locale === "es" ? "Eliminar" : "Delete",
      openFile: locale === "es" ? "Abrir archivo" : "Open file",
      untitled: locale === "es" ? "Sin título" : "Untitled",
      general: locale === "es" ? "general" : "general",
      noFile: locale === "es" ? "Sin archivo" : "No file",
    };
  }, [locale]);

  /* ------------------------------------------------------------------------ */
  /* Data load                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const controller = new AbortController();
    const isInitialLoad = !initialLoadDoneRef.current;

    const run = async () => {
      try {
        if (isInitialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        setErrorMessage("");

        const searchParams = new URLSearchParams();

        if (query.trim()) {
          searchParams.set("q", query.trim());
        }

        if (statusFilter !== "all") {
          searchParams.set("status", statusFilter);
        }

        if (visibilityFilter !== "all") {
          searchParams.set("visibility", visibilityFilter);
        }

        const queryString = searchParams.toString();
        const endpoint = queryString
          ? `/api/admin/documents?${queryString}`
          : "/api/admin/documents";

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const json: DocumentsApiResponse = await response.json().catch(() => ({
          ok: false,
          data: [],
          message:
            locale === "es"
              ? "Respuesta inválida del servidor"
              : "Invalid server response",
        }));

        if (!response.ok || !json.ok) {
          throw new Error(
            json.message ||
              (locale === "es"
                ? "No fue posible cargar los documentos"
                : "Unable to load documents")
          );
        }

        setDocuments(normalizeDocuments(json.data));
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("[AdminDocumentsPage] loadDocuments error:", error);

        setDocuments([]);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : locale === "es"
              ? "Error inesperado al cargar documentos"
              : "Unexpected error loading documents"
        );
      } finally {
        if (!controller.signal.aborted) {
          initialLoadDoneRef.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    const timeoutId = window.setTimeout(run, isInitialLoad ? 0 : 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [locale, query, statusFilter, visibilityFilter]);

  /* ------------------------------------------------------------------------ */
  /* Manual refresh                                                           */
  /* ------------------------------------------------------------------------ */

  const refreshKey = `${query}|${statusFilter}|${visibilityFilter}`;

  /* ------------------------------------------------------------------------ */
  /* Render states                                                            */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mb-3 h-12 w-80 animate-pulse rounded bg-slate-200" />
          <div className="mb-8 h-5 w-[520px] max-w-full animate-pulse rounded bg-slate-200" />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`documents-skeleton-${index}`}
                  className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 p-4 md:grid-cols-[2.4fr_1fr_1fr_1fr_1fr_140px]"
                >
                  <div className="h-6 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 animate-pulse rounded bg-slate-200" />
                  <div className="h-6 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-500">{copy.loading}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-lime-700">
                {copy.eyebrow}
              </p>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-900 p-3 text-lime-400">
                  <FileText className="h-6 w-6" />
                </div>

                <h1 className="text-3xl font-semibold text-slate-950 md:text-4xl">
                  {copy.title}
                </h1>
              </div>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                {copy.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                key={refreshKey}
                type="button"
                onClick={() => {
                  initialLoadDoneRef.current = true;
                  setRefreshing(true);

                  const nextQuery = query.trim();
                  const nextStatus = statusFilter;
                  const nextVisibility = visibilityFilter;

                  setQuery(nextQuery);
                  setStatusFilter(nextStatus);
                  setVisibilityFilter(nextVisibility);
                }}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                {copy.refresh}
              </button>

              <Link
                href="/admin/dashboard/documents/new"
                className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-lime-400"
              >
                <Plus className="h-4 w-4" />
                {copy.create}
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(280px,1.4fr)_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
            >
              <option value="all">{copy.allStatuses}</option>
              <option value="draft">{copy.draft}</option>
              <option value="published">{copy.published}</option>
              <option value="archived">{copy.archived}</option>
            </select>

            <select
              value={visibilityFilter}
              onChange={(event) =>
                setVisibilityFilter(event.target.value as VisibilityFilter)
              }
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
            >
              <option value="all">{copy.allVisibility}</option>
              <option value="public">{copy.visibilityPublic}</option>
              <option value="private">{copy.visibilityPrivate}</option>
              <option value="internal">{copy.visibilityInternal}</option>
            </select>
          </div>
        </section>

        {errorMessage ? (
          <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-700">
              {copy.errorTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-600">
              {errorMessage}
            </p>
          </section>
        ) : null}

        {!errorMessage && documents.length === 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lime-400">
              <FileText className="h-8 w-8" />
            </div>

            <h2 className="mt-5 text-2xl font-semibold text-slate-950">
              {copy.emptyTitle}
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              {copy.emptyText}
            </p>

            <div className="mt-8">
              <Link
                href="/admin/dashboard/documents/new"
                className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-lime-400"
              >
                <Plus className="h-4 w-4" />
                {copy.create}
              </Link>
            </div>
          </section>
        ) : null}

        {!errorMessage && documents.length > 0 ? (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden border-b border-slate-200 bg-slate-50 px-6 py-4 md:grid md:grid-cols-[2.4fr_1fr_1fr_1fr_1fr_140px] md:gap-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.colTitle}
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.colType}
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.colModule}
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.colVisibility}
              </div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.colStatus}
              </div>
              <div className="text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.colActions}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {documents.map((document) => {
                const title =
                  getLocalizedText(document.title, locale) || copy.untitled;

                const visibilityMeta = getVisibilityMeta(
                  document.visibility,
                  locale
                );

                const VisibilityIcon = visibilityMeta.icon;

                return (
                  <article
                    key={document._id || `${document.fileUrl}-${document.order}`}
                    className="px-6 py-5"
                  >
                    <div className="grid gap-4 md:grid-cols-[2.4fr_1fr_1fr_1fr_1fr_140px] md:items-center">
                      <div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-2xl bg-slate-900 p-2.5 text-lime-400">
                            <FileText className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {title}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {document.fileName || document.fileUrl || copy.noFile}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {document.featured ? (
                                <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-semibold text-lime-700">
                                  Featured
                                </span>
                              ) : null}

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                {document.category || copy.general}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                {getLanguageLabel(document.language, locale)}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 md:hidden">
                                {formatFileSize(document.fileSizeBytes)}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 md:hidden">
                                {formatDate(
                                  document.uploadedAt || document.createdAt || document.updatedAt,
                                  locale
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-slate-700">
                        {document.type || "—"}
                      </div>

                      <div className="text-sm text-slate-700">
                        {document.relatedModule || copy.general}
                      </div>

                      <div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                          <VisibilityIcon className="h-3.5 w-3.5" />
                          {visibilityMeta.label}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${getStatusBadgeClass(document.status)}`}
                        >
                          {getStatusLabel(document.status, locale)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/dashboard/documents/${document._id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                          title={copy.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>

                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title={copy.openFile}
                          disabled={!document.fileUrl}
                          onClick={() => {
                            if (!document.fileUrl) {
                              return;
                            }

                            window.open(
                              document.fileUrl,
                              "_blank",
                              "noopener,noreferrer"
                            );
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                          title={copy.remove}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 md:hidden">
                      <span>
                        {copy.colDate}:{" "}
                        {formatDate(
                          document.uploadedAt || document.createdAt || document.updatedAt,
                          locale
                        )}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}