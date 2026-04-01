"use client";

/**
 * =============================================================================
 * 📄 Page: Admin New Document
 * Path: src/app/admin/dashboard/documents/new/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página administrativa para crear un nuevo documento reutilizable.
 *
 *   Objetivo:
 *   - Crear documentos para la biblioteca documental
 *   - Mantener un contrato estable con /api/admin/documents
 *   - Preparar documentos reutilizables para Services, Projects y Client Portal
 *   - Exponer solo campos de negocio relevantes para el usuario
 *
 *   Decisiones UX:
 *   - Se eliminan campos técnicos y de auditoría del formulario:
 *     - mimeType
 *     - fileSizeBytes
 *     - uploadedAt
 *     - updatedBy
 *     - updatedByEmail
 *   - relatedModule se preconfigura desde la URL cuando aplica
 *   - category y type son catálogos controlados
 *
 * EN:
 *   Administrative page for creating a new reusable document.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Save,
  Loader2,
  ExternalLink,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type DocumentVisibility = "public" | "private" | "internal";
type DocumentStatus = "draft" | "published" | "archived";
type DocumentLanguage = "es" | "en" | "both" | "other";
type DocumentType =
  | "pdf"
  | "brochure"
  | "datasheet"
  | "manual"
  | "certificate"
  | "image";

type DocumentCategory =
  | "general"
  | "tratamiento-agua"
  | "control-olores"
  | "biorremediacion"
  | "energia-solar"
  | "procesos-microbiologicos"
  | "corporativo"
  | "certificaciones";

interface LocalizedText {
  es: string;
  en: string;
}

interface DocumentFormState {
  title: LocalizedText;
  description: LocalizedText;
  type: DocumentType;
  fileUrl: string;
  fileName: string;
  thumbnailUrl: string;
  language: DocumentLanguage;
  category: DocumentCategory;
  relatedModule: string;
  relatedEntityId: string;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  order: string;
  featured: boolean;
}

interface DocumentCreateApiResponse {
  ok: boolean;
  data?: {
    _id?: string;
  };
  message?: string;
}

interface FieldErrors {
  titleEs?: string;
  titleEn?: string;
  fileUrl?: string;
  order?: string;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const INITIAL_FORM: DocumentFormState = {
  title: { es: "", en: "" },
  description: { es: "", en: "" },
  type: "pdf",
  fileUrl: "",
  fileName: "",
  thumbnailUrl: "",
  language: "es",
  category: "general",
  relatedModule: "general",
  relatedEntityId: "",
  visibility: "public",
  status: "published",
  order: "1",
  featured: false,
};

const ALLOWED_RELATED_MODULES = new Set([
  "general",
  "services",
  "projects",
  "policies",
  "client-portal",
]);

const DOCUMENT_TYPE_OPTIONS: Array<{
  value: DocumentType;
  labelEs: string;
  labelEn: string;
}> = [
  { value: "pdf", labelEs: "PDF", labelEn: "PDF" },
  { value: "brochure", labelEs: "Brochure", labelEn: "Brochure" },
  { value: "datasheet", labelEs: "Ficha técnica", labelEn: "Datasheet" },
  { value: "manual", labelEs: "Manual", labelEn: "Manual" },
  { value: "certificate", labelEs: "Certificado", labelEn: "Certificate" },
  { value: "image", labelEs: "Imagen", labelEn: "Image" },
];

const DOCUMENT_CATEGORY_OPTIONS: Array<{
  value: DocumentCategory;
  labelEs: string;
  labelEn: string;
}> = [
  { value: "general", labelEs: "General", labelEn: "General" },
  {
    value: "tratamiento-agua",
    labelEs: "Tratamiento de agua",
    labelEn: "Water treatment",
  },
  {
    value: "control-olores",
    labelEs: "Control de olores",
    labelEn: "Odor control",
  },
  {
    value: "biorremediacion",
    labelEs: "Biorremediación",
    labelEn: "Bioremediation",
  },
  {
    value: "energia-solar",
    labelEs: "Energía solar",
    labelEn: "Solar energy",
  },
  {
    value: "procesos-microbiologicos",
    labelEs: "Procesos microbiológicos",
    labelEn: "Microbiological processes",
  },
  {
    value: "corporativo",
    labelEs: "Corporativo",
    labelEn: "Corporate",
  },
  {
    value: "certificaciones",
    labelEs: "Certificaciones",
    labelEn: "Certifications",
  },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: string): string {
  return value.trim();
}

function normalizeModuleParam(value: string | null): string {
  const normalized = normalizeString(value ?? "").toLowerCase();
  return ALLOWED_RELATED_MODULES.has(normalized) ? normalized : "general";
}

function normalizeReturnTo(value: string | null): string {
  const normalized = normalizeString(value ?? "");
  return normalized.startsWith("/") ? normalized : "/admin/dashboard/documents";
}

function isValidPositiveInteger(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1;
}

function isLikelyUrlOrPublicPath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/")) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildPayload(form: DocumentFormState) {
  return {
    title: {
      es: normalizeString(form.title.es),
      en: normalizeString(form.title.en),
    },
    description: {
      es: normalizeString(form.description.es),
      en: normalizeString(form.description.en),
    },
    type: form.type,
    fileUrl: normalizeString(form.fileUrl),
    fileName: normalizeString(form.fileName),
    thumbnailUrl: normalizeString(form.thumbnailUrl),
    language: form.language,
    category: form.category,
    relatedModule:
      normalizeString(form.relatedModule).toLowerCase() || "general",
    relatedEntityId: normalizeString(form.relatedEntityId) || null,
    visibility: form.visibility,
    status: form.status,
    order: Number(form.order),
    featured: form.featured,
  };
}

function validateForm(form: DocumentFormState, locale: Locale): FieldErrors {
  const errors: FieldErrors = {};

  const titleEs = normalizeString(form.title.es);
  const titleEn = normalizeString(form.title.en);

  if (!titleEs && !titleEn) {
    errors.titleEs =
      locale === "es"
        ? "Debes ingresar al menos un título en ES o EN."
        : "You must provide at least one title in ES or EN.";
    errors.titleEn = errors.titleEs;
  }

  if (!normalizeString(form.fileUrl)) {
    errors.fileUrl =
      locale === "es"
        ? "La URL o ruta del archivo es obligatoria."
        : "The document URL or path is required.";
  } else if (!isLikelyUrlOrPublicPath(form.fileUrl)) {
    errors.fileUrl =
      locale === "es"
        ? "Usa una URL válida o una ruta pública como /assets/documents/archivo.pdf."
        : "Use a valid URL or a public path such as /assets/documents/file.pdf.";
  }

  if (!isValidPositiveInteger(form.order)) {
    errors.order =
      locale === "es"
        ? "El orden debe ser un entero mayor o igual a 1."
        : "Order must be an integer greater than or equal to 1.";
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminNewDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale: Locale = "es";

  const relatedModuleFromUrl = normalizeModuleParam(
    searchParams.get("relatedModule")
  );
  const returnTo = normalizeReturnTo(searchParams.get("returnTo"));

  const [form, setForm] = useState<DocumentFormState>(() => ({
    ...INITIAL_FORM,
    relatedModule: relatedModuleFromUrl,
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    setForm((prev) => {
      if (prev.relatedModule === relatedModuleFromUrl) {
        return prev;
      }

      return {
        ...prev,
        relatedModule: relatedModuleFromUrl,
      };
    });
  }, [relatedModuleFromUrl]);

  const copy = useMemo(() => {
    return {
      eyebrow: locale === "es" ? "Biblioteca documental" : "Documents library",
      title: locale === "es" ? "Nuevo documento" : "New document",
      subtitle:
        locale === "es"
          ? "Crea un documento reutilizable para servicios, proyectos o portal de clientes."
          : "Create a reusable document for services, projects, or client portal.",

      back: locale === "es" ? "Volver" : "Back",
      save: locale === "es" ? "Guardar documento" : "Save document",
      saving: locale === "es" ? "Guardando..." : "Saving...",

      basicInfo: locale === "es" ? "Información base" : "Basic information",
      fileInfo: locale === "es" ? "Archivo y recursos" : "File and assets",
      organization:
        locale === "es" ? "Organización y acceso" : "Organization and access",

      titleEs: locale === "es" ? "Título (ES)" : "Title (ES)",
      titleEn: locale === "es" ? "Título (EN)" : "Title (EN)",
      descriptionEs:
        locale === "es" ? "Descripción (ES)" : "Description (ES)",
      descriptionEn:
        locale === "es" ? "Descripción (EN)" : "Description (EN)",

      type: locale === "es" ? "Tipo" : "Type",
      fileUrl: locale === "es" ? "URL / ruta del archivo" : "File URL / path",
      fileName: locale === "es" ? "Nombre de archivo" : "File name",
      thumbnailUrl:
        locale === "es"
          ? "URL / ruta de miniatura"
          : "Thumbnail URL / path",

      language: locale === "es" ? "Idioma" : "Language",
      category: locale === "es" ? "Categoría" : "Category",
      relatedModule:
        locale === "es" ? "Módulo relacionado" : "Related module",
      relatedEntityId:
        locale === "es" ? "ID entidad relacionada" : "Related entity ID",
      visibility: locale === "es" ? "Visibilidad" : "Visibility",
      status: locale === "es" ? "Estado" : "Status",
      order: locale === "es" ? "Orden" : "Order",
      featured: locale === "es" ? "Destacado" : "Featured",

      placeholderFileUrl:
        locale === "es"
          ? "/assets/documents/ficha-tecnica-paneles-solares.pdf o https://..."
          : "/assets/documents/solar-datasheet.pdf or https://...",
      placeholderThumb:
        locale === "es"
          ? "/assets/documents/miniatura.jpg"
          : "/assets/documents/thumbnail.jpg",

      saveSuccess:
        locale === "es"
          ? "Documento creado correctamente."
          : "Document created successfully.",
    };
  }, [locale]);

  const handleChange = <K extends keyof DocumentFormState>(
    key: K,
    value: DocumentFormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLocalizedChange = (
    key: "title" | "description",
    lang: Locale,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [lang]: value,
      },
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const validationErrors = validateForm(form, locale);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/admin/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(form)),
      });

      const json: DocumentCreateApiResponse = await response
        .json()
        .catch(() => ({
          ok: false,
          message: "Unexpected response",
        }));

      if (!response.ok || !json.ok) {
        throw new Error(json.message || "Error creating document");
      }

      setSuccessMessage(copy.saveSuccess);

      const newId = json.data?._id;

      if (newId) {
        router.push(`/admin/dashboard/documents/${newId}`);
        return;
      }

      router.push(returnTo);
      router.refresh();
    } catch (error) {
      console.error("[AdminNewDocumentPage] save error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === "es"
            ? "Error inesperado al guardar el documento."
            : "Unexpected error while saving the document."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="mb-8">
          <Link
            href={returnTo}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.back}
          </Link>

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
        </section>

        {errorMessage ? (
          <section className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-medium text-red-700">{errorMessage}</p>
          </section>
        ) : null}

        {successMessage ? (
          <section className="mb-6 rounded-3xl border border-lime-200 bg-lime-50 p-5">
            <p className="text-sm font-medium text-lime-700">
              {successMessage}
            </p>
          </section>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-semibold text-slate-950">
              {copy.basicInfo}
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.titleEs}
                </label>
                <input
                  value={form.title.es}
                  onChange={(e) =>
                    handleLocalizedChange("title", "es", e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
                {errors.titleEs ? (
                  <p className="mt-2 text-xs text-red-600">{errors.titleEs}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.titleEn}
                </label>
                <input
                  value={form.title.en}
                  onChange={(e) =>
                    handleLocalizedChange("title", "en", e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
                {errors.titleEn ? (
                  <p className="mt-2 text-xs text-red-600">{errors.titleEn}</p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.descriptionEs}
                </label>
                <textarea
                  value={form.description.es}
                  onChange={(e) =>
                    handleLocalizedChange("description", "es", e.target.value)
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.descriptionEn}
                </label>
                <textarea
                  value={form.description.en}
                  onChange={(e) =>
                    handleLocalizedChange("description", "en", e.target.value)
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-semibold text-slate-950">
              {copy.fileInfo}
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.type}
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    handleChange("type", e.target.value as DocumentType)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {locale === "es" ? option.labelEs : option.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.fileName}
                </label>
                <input
                  value={form.fileName}
                  onChange={(e) => handleChange("fileName", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.fileUrl}
                </label>
                <div className="flex gap-3">
                  <input
                    value={form.fileUrl}
                    onChange={(e) => handleChange("fileUrl", e.target.value)}
                    placeholder={copy.placeholderFileUrl}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                  />
                  {form.fileUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          form.fileUrl,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                      title={locale === "es" ? "Abrir" : "Open"}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                {errors.fileUrl ? (
                  <p className="mt-2 text-xs text-red-600">{errors.fileUrl}</p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.thumbnailUrl}
                </label>
                <input
                  value={form.thumbnailUrl}
                  onChange={(e) =>
                    handleChange("thumbnailUrl", e.target.value)
                  }
                  placeholder={copy.placeholderThumb}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-xl font-semibold text-slate-950">
              {copy.organization}
            </h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.language}
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    handleChange("language", e.target.value as DocumentLanguage)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                >
                  <option value="es">es</option>
                  <option value="en">en</option>
                  <option value="both">both</option>
                  <option value="other">other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.category}
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    handleChange("category", e.target.value as DocumentCategory)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                >
                  {DOCUMENT_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {locale === "es" ? option.labelEs : option.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.relatedModule}
                </label>
                <input
                  value={form.relatedModule}
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.relatedEntityId}
                </label>
                <input
                  value={form.relatedEntityId}
                  onChange={(e) =>
                    handleChange("relatedEntityId", e.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.visibility}
                </label>
                <select
                  value={form.visibility}
                  onChange={(e) =>
                    handleChange(
                      "visibility",
                      e.target.value as DocumentVisibility
                    )
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                >
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="internal">internal</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.status}
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    handleChange("status", e.target.value as DocumentStatus)
                  }
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {copy.order}
                </label>
                <input
                  value={form.order}
                  onChange={(e) => handleChange("order", e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
                />
                {errors.order ? (
                  <p className="mt-2 text-xs text-red-600">{errors.order}</p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => handleChange("featured", e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {copy.featured}
                </label>
              </div>
            </div>
          </section>

          <section className="flex flex-wrap justify-end gap-3 pb-8">
            <Link
              href={returnTo}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.back}
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? copy.saving : copy.save}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}