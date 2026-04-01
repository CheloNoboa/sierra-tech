"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Documents Library
 * Path: src/app/admin/dashboard/documents/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página administrativa para gestionar la biblioteca de documentos.
 *
 *   Objetivo:
 *   - Listar documentos administrables
 *   - Filtrar por estado y visibilidad
 *   - Buscar por texto
 *   - Preparar base estable para crear, editar y eliminar documentos
 *
 *   Alcance de esta versión:
 *   - GET de documentos
 *   - render administrativo inicial
 *   - estructura lista para conectar modales y formularios
 *
 * EN:
 *   Administrative page for managing the documents library.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type DocumentVisibility = "public" | "private" | "internal";
type DocumentStatus = "draft" | "published" | "archived";
type DocumentLanguage = "es" | "en" | "both" | "other";

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
  createdAt?: string;
  updatedAt?: string;
}

interface DocumentsApiResponse {
  ok: boolean;
  data?: AdminDocument[];
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

function normalizeDocument(value: unknown): AdminDocument {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    _id:
      typeof record._id === "string"
        ? record._id
        : record._id && typeof record._id === "object" && "toString" in record._id
          ? String(record._id)
          : "",
    title: normalizeLocalizedText(record.title),
    description: normalizeLocalizedText(record.description),
    type: normalizeString(record.type, "pdf"),
    fileUrl: normalizeString(record.fileUrl),
    fileName: normalizeString(record.fileName),
    mimeType: normalizeString(record.mimeType),
    fileSizeBytes: Math.max(0, normalizeNumber(record.fileSizeBytes, 0)),
    thumbnailUrl: normalizeString(record.thumbnailUrl),
    language:
      record.language === "en" ||
      record.language === "both" ||
      record.language === "other"
        ? record.language
        : "es",
    category: normalizeString(record.category, "general"),
    relatedModule: normalizeString(record.relatedModule, "general"),
    relatedEntityId:
      typeof record.relatedEntityId === "string"
        ? record.relatedEntityId
        : record.relatedEntityId && typeof record.relatedEntityId === "object"
          ? String(record.relatedEntityId)
          : null,
    visibility:
      record.visibility === "private" || record.visibility === "internal"
        ? record.visibility
        : "public",
    status:
      record.status === "draft" || record.status === "archived"
        ? record.status
        : "published",
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
  if (!Array.isArray(value)) return [];
  return value.map(normalizeDocument);
}

function getLocalizedTitle(title: LocalizedText, locale: Locale): string {
  return locale === "es"
    ? title.es || title.en || ""
    : title.en || title.es || "";
}

function formatDate(value: string, locale: Locale): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | DocumentStatus
  >("all");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | DocumentVisibility
  >("all");

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

      emptyTitle:
        locale === "es"
          ? "No hay documentos"
          : "No documents available",
      emptyText:
        locale === "es"
          ? "Cuando agregues documentos, aparecerán aquí."
          : "Once you add documents, they will appear here.",

      loading: locale === "es" ? "Cargando documentos..." : "Loading documents...",
      errorTitle:
        locale === "es"
          ? "No fue posible cargar los documentos"
          : "Unable to load documents",

      colTitle: locale === "es" ? "Documento" : "Document",
      colType: locale === "es" ? "Tipo" : "Type",
      colModule: locale === "es" ? "Módulo" : "Module",
      colVisibility: locale === "es" ? "Visibilidad" : "Visibility",
      colStatus: locale === "es" ? "Estado" : "Status",
      colSize: locale === "es" ? "Tamaño" : "Size",
      colDate: locale === "es" ? "Fecha" : "Date",
      colActions: locale === "es" ? "Acciones" : "Actions",

      edit: locale === "es" ? "Editar" : "Edit",
      remove: locale === "es" ? "Eliminar" : "Delete",
      openFile: locale === "es" ? "Abrir archivo" : "Open file",
      untitled: locale === "es" ? "Sin título" : "Untitled",
    };
  }, [locale]);

  /* ------------------------------------------------------------------------ */
  /* Data load                                                                */
  /* ------------------------------------------------------------------------ */

  const loadDocuments = async (mode: "initial" | "refresh" = "initial") => {
    try {
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage("");

      const searchParams = new URLSearchParams();

      if (query.trim()) searchParams.set("q", query.trim());
      if (statusFilter !== "all") searchParams.set("status", statusFilter);
      if (visibilityFilter !== "all") {
        searchParams.set("visibility", visibilityFilter);
      }

      const response = await fetch(
        `/api/admin/documents?${searchParams.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const json: DocumentsApiResponse = await response.json().catch(() => ({
        ok: false,
        data: [],
      }));

      if (!response.ok || !json.ok) {
        throw new Error(json.message || "Error loading documents");
      }

      setDocuments(normalizeDocuments(json.data));
    } catch (error) {
      console.error("[AdminDocumentsPage] loadDocuments error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === "es"
            ? "Error inesperado al cargar documentos"
            : "Unexpected error loading documents"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDocuments("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Filters                                                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadDocuments("refresh");
    }, 250);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter, visibilityFilter]);

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
                  className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]"
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
        {/* ------------------------------------------------------------------ */}
        {/* Header                                                             */}
        {/* ------------------------------------------------------------------ */}
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
                type="button"
                onClick={() => void loadDocuments("refresh")}
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

        {/* ------------------------------------------------------------------ */}
        {/* Filters                                                            */}
        {/* ------------------------------------------------------------------ */}
        <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(280px,1.4fr)_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | DocumentStatus)
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
              onChange={(e) =>
                setVisibilityFilter(
                  e.target.value as "all" | DocumentVisibility
                )
              }
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
            >
              <option value="all">{copy.allVisibility}</option>
              <option value="public">Público</option>
              <option value="private">Privado</option>
              <option value="internal">Interno</option>
            </select>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* Error                                                              */}
        {/* ------------------------------------------------------------------ */}
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

        {/* ------------------------------------------------------------------ */}
        {/* Empty                                                              */}
        {/* ------------------------------------------------------------------ */}
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

        {/* ------------------------------------------------------------------ */}
        {/* Table                                                              */}
        {/* ------------------------------------------------------------------ */}
        {!errorMessage && documents.length > 0 ? (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden border-b border-slate-200 bg-slate-50 px-6 py-4 md:grid md:grid-cols-[2.4fr_1fr_1fr_1fr_1fr_1fr_140px] md:gap-4">
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
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.colDate}
              </div>
              <div className="text-right text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                {copy.colActions}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {documents.map((document) => {
                const title =
                  getLocalizedTitle(document.title, locale) || copy.untitled;
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
                    <div className="grid gap-4 md:grid-cols-[2.4fr_1fr_1fr_1fr_1fr_1fr_140px] md:items-center">
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
                              {document.fileName || document.fileUrl || "—"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {document.featured ? (
                                <span className="rounded-full bg-lime-100 px-2.5 py-1 text-[11px] font-semibold text-lime-700">
                                  Featured
                                </span>
                              ) : null}

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                {document.category || "general"}
                              </span>

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                {document.language}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-slate-700">
                        {document.type || "—"}
                      </div>

                      <div className="text-sm text-slate-700">
                        {document.relatedModule || "general"}
                      </div>

                      <div>
                        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                          <VisibilityIcon className="h-3.5 w-3.5" />
                          {visibilityMeta.label}
                        </span>
                      </div>

                      <div>
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                          {document.status}
                        </span>
                      </div>

                      <div className="text-sm text-slate-700">
                        {formatDate(document.uploadedAt, locale)}
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
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                          title={copy.openFile}
                          onClick={() => {
                            if (document.fileUrl) {
                              window.open(document.fileUrl, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          <FileText className="h-4 w-4" />
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
                      <span>{copy.colSize}: {formatFileSize(document.fileSizeBytes)}</span>
                      <span>{copy.colDate}: {formatDate(document.uploadedAt, locale)}</span>
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