"use client";

/**
 * =============================================================================
 * 📄 Component: DocumentAttachmentSelector
 * Path: src/components/admin/documents/DocumentAttachmentSelector.tsx
 * =============================================================================
 *
 * ES:
 *   Selector reutilizable para asociar documentos existentes a otra entidad.
 *
 *   Responsabilidades:
 *   - Consultar documentos desde /api/admin/documents
 *   - Permitir asociación múltiple sin duplicados
 *   - Permitir reordenamiento local de adjuntos seleccionados
 *   - Permitir creación rápida de documentos sin salir del flujo actual
 *   - Permitir edición rápida de documentos dentro de la misma submodal
 *   - Mantener el contrato mínimo esperado por Service.attachments:
 *     [{ documentId, title }]
 *
 *   Decisiones de interfaz:
 *   - La creación y edición rápida exponen únicamente campos de negocio
 *   - Los metadatos técnicos y de auditoría se resuelven en backend
 *   - relatedModule se fija por el contexto que consume el selector
 *   - La edición reutiliza la misma submodal para no romper el flujo del módulo padre
 *   - Los valores internos del idioma del documento se presentan en UI
 *     con etiquetas localizadas legibles para el usuario
 *
 * EN:
 *   Reusable selector for attaching existing documents to another entity.
 * =============================================================================
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FileText,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  ExternalLink,
  RefreshCw,
  X,
  Save,
  Pencil,
} from "lucide-react";
import {
  uploadAdminFile,
  type UploadedAdminFile,
} from "@/lib/adminUploadsClient";
import { resolveAssetUrl } from "@/lib/resolveAssetUrl";

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

type QuickModalMode = "create" | "edit";

export interface ServiceAttachmentItem {
  documentId: string;
  title: string;
}

interface LocalizedText {
  es: string;
  en: string;
}

interface AdminDocumentListItem {
  _id: string;
  title: LocalizedText;
  description?: LocalizedText;
  type: string;
  fileUrl: string;
  fileName?: string;
  thumbnailUrl?: string;
  category: string;
  language: DocumentLanguage;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  order?: number;
  featured?: boolean;
}

interface DocumentsApiResponse {
  ok: boolean;
  data?: AdminDocumentListItem[];
  message?: string;
}

interface DocumentMutationApiResponse {
  ok: boolean;
  data?: {
    _id?: string;
    title?: LocalizedText;
    description?: LocalizedText;
    type?: string;
    fileUrl?: string;
    fileName?: string;
    thumbnailUrl?: string;
    category?: string;
    language?: DocumentLanguage;
    visibility?: DocumentVisibility;
    status?: DocumentStatus;
    order?: number;
    featured?: boolean;
  };
  message?: string;
}

interface QuickDocumentFormState {
  title: LocalizedText;
  description: LocalizedText;
  type: DocumentType;
  fileUrl: string;
  fileName: string;
  thumbnailUrl: string;
  language: DocumentLanguage;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  order: string;
  featured: boolean;
}

interface QuickDocumentErrors {
  titleEs?: string;
  titleEn?: string;
  fileUrl?: string;
  order?: string;
}

interface DocumentAttachmentSelectorProps {
  value: ServiceAttachmentItem[];
  onChange: (nextValue: ServiceAttachmentItem[]) => void;
  locale?: Locale;
  relatedModule?: string;
  title?: string;
  description?: string;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const INITIAL_QUICK_DOCUMENT_FORM: QuickDocumentFormState = {
  title: { es: "", en: "" },
  description: { es: "", en: "" },
  type: "pdf",
  fileUrl: "",
  fileName: "",
  thumbnailUrl: "",
  language: "es",
  category: "general",
  visibility: "public",
  status: "published",
  order: "1",
  featured: false,
};

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

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeNumber(value: unknown, fallback = 1): number {
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

function normalizeDocumentType(value: unknown): DocumentType {
  return value === "brochure" ||
    value === "datasheet" ||
    value === "manual" ||
    value === "certificate" ||
    value === "image"
    ? value
    : "pdf";
}

function normalizeDocumentCategory(value: unknown): DocumentCategory {
  return value === "tratamiento-agua" ||
    value === "control-olores" ||
    value === "biorremediacion" ||
    value === "energia-solar" ||
    value === "procesos-microbiologicos" ||
    value === "corporativo" ||
    value === "certificaciones"
    ? value
    : "general";
}

function normalizeDocument(value: unknown): AdminDocumentListItem {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    _id:
      typeof record._id === "string"
        ? record._id
        : record._id &&
            typeof record._id === "object" &&
            "toString" in record._id
          ? String(record._id)
          : "",
    title: normalizeLocalizedText(record.title),
    description: normalizeLocalizedText(record.description),
    type: normalizeString(record.type, "pdf"),
    fileUrl: normalizeString(record.fileUrl),
    fileName: normalizeString(record.fileName),
    thumbnailUrl: normalizeString(record.thumbnailUrl),
    category: normalizeString(record.category, "general"),
    language:
      record.language === "en" ||
      record.language === "both" ||
      record.language === "other"
        ? record.language
        : "es",
    visibility:
      record.visibility === "private" || record.visibility === "internal"
        ? record.visibility
        : "public",
    status:
      record.status === "draft" || record.status === "archived"
        ? record.status
        : "published",
    order: Math.max(1, normalizeNumber(record.order, 1)),
    featured: normalizeBoolean(record.featured, false),
  };
}

function normalizeDocuments(value: unknown): AdminDocumentListItem[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeDocument);
}

function getDocumentTitle(
  title: LocalizedText,
  locale: Locale = "es"
): string {
  if (locale === "en") {
    return title.en.trim() || title.es.trim() || "";
  }

  return title.es.trim() || title.en.trim() || "";
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const clone = [...items];
  const [moved] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, moved);
  return clone;
}

function formatChipLabel(value: string): string {
  return value.trim() || "—";
}

function isValidPositiveInteger(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1;
}

function isLikelyUrlOrPublicPath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("admin/")) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildQuickDocumentPayload(
  form: QuickDocumentFormState,
  relatedModule: string
) {
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
    relatedModule: normalizeString(relatedModule).toLowerCase() || "general",
    relatedEntityId: null,
    visibility: form.visibility,
    status: form.status,
    order: Number(form.order),
    featured: form.featured,
  };
}

function validateQuickDocumentForm(
  form: QuickDocumentFormState,
  locale: Locale
): QuickDocumentErrors {
  const errors: QuickDocumentErrors = {};

  const titleEs = normalizeString(form.title.es);
  const titleEn = normalizeString(form.title.en);

  if (!titleEs && !titleEn) {
    const message =
      locale === "es"
        ? "Debes ingresar al menos un título en ES o EN."
        : "You must provide at least one title in ES or EN.";

    errors.titleEs = message;
    errors.titleEn = message;
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

function toQuickFormState(document: AdminDocumentListItem): QuickDocumentFormState {
  return {
    title: {
      es: document.title.es ?? "",
      en: document.title.en ?? "",
    },
    description: {
      es: document.description?.es ?? "",
      en: document.description?.en ?? "",
    },
    type: normalizeDocumentType(document.type),
    fileUrl: document.fileUrl ?? "",
    fileName: document.fileName ?? "",
    thumbnailUrl: document.thumbnailUrl ?? "",
    language: document.language,
    category: normalizeDocumentCategory(document.category),
    visibility: document.visibility,
    status: document.status,
    order: String(Math.max(1, document.order ?? 1)),
    featured: Boolean(document.featured),
  };
}

function inferDocumentTypeFromUploadedFile(
  file: UploadedAdminFile
): DocumentType {
  const mime = file.mimeType.toLowerCase();
  const extension = file.extension.toLowerCase();

  if (
    mime === "image/png" ||
    mime === "image/jpeg" ||
    mime === "image/webp" ||
    mime === "image/svg+xml" ||
    extension === "png" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "webp" ||
    extension === "svg"
  ) {
    return "image";
  }

  return "pdf";
}

function getDocumentLanguageLabel(
  value: DocumentLanguage,
  locale: Locale
): string {
  if (locale === "es") {
    switch (value) {
      case "es":
        return "Español";
      case "en":
        return "Inglés";
      case "both":
        return "Bilingüe";
      case "other":
        return "Otro";
      default:
        return "Español";
    }
  }

  switch (value) {
    case "es":
      return "Spanish";
    case "en":
      return "English";
    case "both":
      return "Bilingual";
    case "other":
      return "Other";
    default:
      return "Spanish";
  }
}

/* -------------------------------------------------------------------------- */
/* Small UI                                                                   */
/* -------------------------------------------------------------------------- */

function QuickModal(props: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-950">{props.title}</h3>

          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">{props.children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function DocumentAttachmentSelector({
  value,
  onChange,
  locale = "es",
  relatedModule = "services",
  title,
  description,
}: DocumentAttachmentSelectorProps) {
  const [documents, setDocuments] = useState<AdminDocumentListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [quickModalOpen, setQuickModalOpen] = useState<boolean>(false);
  const [quickMode, setQuickMode] = useState<QuickModalMode>("create");
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [quickSaving, setQuickSaving] = useState<boolean>(false);
  const [quickForm, setQuickForm] = useState<QuickDocumentFormState>(
    INITIAL_QUICK_DOCUMENT_FORM
  );
  const [quickErrors, setQuickErrors] = useState<QuickDocumentErrors>({});
  const [quickErrorMessage, setQuickErrorMessage] = useState<string>("");

  const [uploadingDocumentFile, setUploadingDocumentFile] = useState(false);
  const [uploadingThumbnailFile, setUploadingThumbnailFile] = useState(false);

  const copy = useMemo(() => {
    return {
      title:
        title ||
        (locale === "es" ? "Documentos relacionados" : "Related documents"),
      description:
        description ||
        (locale === "es"
          ? "Busca documentos existentes y asígnalos a esta entidad."
          : "Search existing documents and attach them to this entity."),
      searchPlaceholder:
        locale === "es"
          ? "Buscar documentos por título, tipo o categoría..."
          : "Search documents by title, type, or category...",
      loading:
        locale === "es" ? "Cargando documentos..." : "Loading documents...",
      emptyResults:
        locale === "es"
          ? "No se encontraron documentos."
          : "No documents found.",
      selectedEmpty:
        locale === "es"
          ? "No hay documentos asociados."
          : "No attached documents.",
      add: locale === "es" ? "Agregar" : "Add",
      remove: locale === "es" ? "Quitar" : "Remove",
      edit: locale === "es" ? "Editar" : "Edit",
      selected:
        locale === "es"
          ? "Documentos asociados"
          : "Attached documents",
      available:
        locale === "es"
          ? "Documentos disponibles"
          : "Available documents",
      duplicate:
        locale === "es"
          ? "Este documento ya está asociado."
          : "This document is already attached.",
      createNew:
        locale === "es" ? "Nuevo documento rápido" : "Quick new document",
      createNewHint:
        locale === "es"
          ? "Si el documento todavía no existe, créalo aquí mismo y se asociará sin salir del servicio."
          : "If the document does not exist yet, create it here and attach it without leaving the service.",
      openDocument:
        locale === "es" ? "Abrir documento" : "Open document",
      editDocument:
        locale === "es" ? "Editar documento" : "Edit document",
      untitled: locale === "es" ? "Sin título" : "Untitled",
      refresh:
        locale === "es" ? "Recargar documentos" : "Refresh documents",
      quickCreateModalTitle:
        locale === "es" ? "Nuevo documento rápido" : "Quick new document",
      quickEditModalTitle:
        locale === "es" ? "Editar documento" : "Edit document",
      quickCreateSave:
        locale === "es" ? "Guardar y asociar" : "Save and attach",
      quickEditSave:
        locale === "es" ? "Guardar cambios" : "Save changes",
      quickSaving:
        locale === "es" ? "Guardando..." : "Saving...",
      cancel: locale === "es" ? "Cancelar" : "Cancel",
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
      languageOptionEs: locale === "es" ? "Español" : "Spanish",
      languageOptionEn: locale === "es" ? "Inglés" : "English",
      languageOptionBoth: locale === "es" ? "Bilingüe" : "Bilingual",
      languageOptionOther: locale === "es" ? "Otro" : "Other",
    };
  }, [description, locale, title]);

  const loadDocuments = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setErrorMessage("");

      const searchParams = new URLSearchParams();
      searchParams.set("status", "published");
      searchParams.set("limit", "100");
      searchParams.set("relatedModule", relatedModule);

      if (query.trim()) {
        searchParams.set("q", query.trim());
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
      console.error("[DocumentAttachmentSelector] load error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : locale === "es"
            ? "Error cargando documentos."
            : "Error loading documents."
      );
    } finally {
      setLoading(false);
    }
  }, [locale, query, relatedModule]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadDocuments();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadDocuments]);

  const selectedIds = useMemo(() => {
    return new Set(value.map((item) => item.documentId));
  }, [value]);

  const availableDocuments = useMemo(() => {
    return documents.filter((document) => !selectedIds.has(document._id));
  }, [documents, selectedIds]);

  const handleAdd = (document: AdminDocumentListItem): void => {
    if (selectedIds.has(document._id)) {
      setErrorMessage(copy.duplicate);
      return;
    }

    const documentTitle = getDocumentTitle(document.title, locale);

    onChange([
      ...value,
      {
        documentId: document._id,
        title: documentTitle,
      },
    ]);
  };

  const handleRemove = (documentId: string): void => {
    onChange(value.filter((item) => item.documentId !== documentId));
  };

  const handleMoveUp = (index: number): void => {
    onChange(moveItem(value, index, index - 1));
  };

  const handleMoveDown = (index: number): void => {
    onChange(moveItem(value, index, index + 1));
  };

  const openQuickCreate = (): void => {
    setQuickMode("create");
    setEditingDocumentId(null);
    setQuickForm(INITIAL_QUICK_DOCUMENT_FORM);
    setQuickErrors({});
    setQuickErrorMessage("");
    setQuickModalOpen(true);
  };

  const openQuickEdit = (document: AdminDocumentListItem): void => {
    setQuickMode("edit");
    setEditingDocumentId(document._id);
    setQuickForm(toQuickFormState(document));
    setQuickErrors({});
    setQuickErrorMessage("");
    setQuickModalOpen(true);
  };

  const closeQuickModal = (): void => {
    if (quickSaving) return;
    setQuickModalOpen(false);
    setQuickErrors({});
    setQuickErrorMessage("");
    setEditingDocumentId(null);
    setQuickMode("create");
  };

  const handleQuickChange = <K extends keyof QuickDocumentFormState>(
    key: K,
    value: QuickDocumentFormState[K]
  ): void => {
    setQuickForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleQuickLocalizedChange = (
    key: "title" | "description",
    lang: Locale,
    value: string
  ): void => {
    setQuickForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [lang]: value,
      },
    }));
  };

  async function handleQuickDocumentFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      return;
    }

    try {
      setUploadingDocumentFile(true);
      setQuickErrorMessage("");

      const result = await uploadAdminFile(selectedFile, "documents/files");

      if (!result.ok || !result.file) {
        setQuickErrorMessage(
          result.message ||
            (locale === "es"
              ? "No se pudo subir el documento."
              : "Could not upload the document.")
        );
        return;
      }

      const uploadedFile = result.file;

      setQuickForm((prev) => ({
        ...prev,
        fileUrl: uploadedFile.fileKey,
        fileName: uploadedFile.originalName || uploadedFile.fileName,
        type: inferDocumentTypeFromUploadedFile(uploadedFile),
      }));
    } catch (error) {
      console.error("[DocumentAttachmentSelector] document upload error:", error);

      setQuickErrorMessage(
        locale === "es"
          ? "Ocurrió un error al subir el documento."
          : "An error occurred while uploading the document."
      );
    } finally {
      setUploadingDocumentFile(false);
      event.target.value = "";
    }
  }

  async function handleQuickThumbnailUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      return;
    }

    try {
      setUploadingThumbnailFile(true);
      setQuickErrorMessage("");

      const result = await uploadAdminFile(selectedFile, "documents/thumbnails");

      if (!result.ok || !result.file) {
        setQuickErrorMessage(
          result.message ||
            (locale === "es"
              ? "No se pudo subir la miniatura."
              : "Could not upload the thumbnail.")
        );
        return;
      }

      const uploadedFile = result.file;

      setQuickForm((prev) => ({
        ...prev,
        thumbnailUrl: uploadedFile.fileKey,
      }));
    } catch (error) {
      console.error("[DocumentAttachmentSelector] thumbnail upload error:", error);

      setQuickErrorMessage(
        locale === "es"
          ? "Ocurrió un error al subir la miniatura."
          : "An error occurred while uploading the thumbnail."
      );
    } finally {
      setUploadingThumbnailFile(false);
      event.target.value = "";
    }
  }

  const handleQuickSave = async (): Promise<void> => {
    setQuickErrorMessage("");
    const validationErrors = validateQuickDocumentForm(quickForm, locale);
    setQuickErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setQuickSaving(true);

      const isEdit = quickMode === "edit" && Boolean(editingDocumentId);
      const url = isEdit
        ? `/api/admin/documents/${editingDocumentId}`
        : "/api/admin/documents";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildQuickDocumentPayload(quickForm, relatedModule)),
      });

      const json: DocumentMutationApiResponse = await response.json().catch(() => ({
        ok: false,
        message: "Unexpected response",
      }));

      if (!response.ok || !json.ok || !json.data?._id) {
        throw new Error(
          json.message ||
            (locale === "es"
              ? "No se pudo guardar el documento."
              : "Could not save document.")
        );
      }

      const savedDocument: AdminDocumentListItem = normalizeDocument(json.data);
      const savedTitle =
        getDocumentTitle(savedDocument.title, locale) || copy.untitled;

      if (isEdit) {
        const existsInSelection = value.some(
          (item) => item.documentId === savedDocument._id
        );

        if (existsInSelection) {
          onChange(
            value.map((item) =>
              item.documentId === savedDocument._id
                ? {
                    ...item,
                    title: savedTitle,
                  }
                : item
            )
          );
        }
      } else {
        onChange([
          ...value,
          {
            documentId: savedDocument._id,
            title: savedTitle,
          },
        ]);
      }

      await loadDocuments();
      closeQuickModal();
    } catch (error) {
      console.error("[DocumentAttachmentSelector] quick save error:", error);

      setQuickErrorMessage(
        error instanceof Error
          ? error.message
          : locale === "es"
            ? "Error inesperado al guardar el documento."
            : "Unexpected error while saving document."
      );
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-slate-950">{copy.title}</h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              {copy.description}
            </p>

            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">
              {copy.createNewHint}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadDocuments()}
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {copy.refresh}
            </button>

            <button
              type="button"
              onClick={openQuickCreate}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              {copy.createNew}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                {copy.available}
              </h3>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={copy.searchPlaceholder}
                className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
            </div>

            {errorMessage ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.loading}
              </div>
            ) : null}

            {!loading && availableDocuments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                {copy.emptyResults}
              </div>
            ) : null}

            {!loading && availableDocuments.length > 0 ? (
              <div className="space-y-3">
                {availableDocuments.map((document) => {
                  const documentTitle =
                    getDocumentTitle(document.title, locale) || copy.untitled;

                  return (
                    <article
                      key={document._id || `${document.fileUrl}-${document.type}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-slate-900 p-2.5 text-lime-400">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {documentTitle}
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                  {formatChipLabel(document.type)}
                                </span>

                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                  {formatChipLabel(document.category)}
                                </span>

                                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                                  {getDocumentLanguageLabel(document.language, locale)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openQuickEdit(document)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                            title={copy.editDocument}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          {document.fileUrl ? (
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                              title={copy.openDocument}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleAdd(document)}
                            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-lime-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-lime-400"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {copy.add}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
              {copy.selected}
            </h3>

            {value.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                {copy.selectedEmpty}
              </div>
            ) : (
              <div className="space-y-3">
                {value.map((attachment, index) => {
                  const selectedDocument = documents.find(
                    (document) => document._id === attachment.documentId
                  );

                  return (
                    <article
                      key={`${attachment.documentId}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-slate-900 p-2.5 text-lime-400">
                              <FileText className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {attachment.title || copy.untitled}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {attachment.documentId}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {selectedDocument ? (
                            <button
                              type="button"
                              onClick={() => openQuickEdit(selectedDocument)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                              title={copy.editDocument}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === value.length - 1}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemove(attachment.documentId)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <QuickModal
        open={quickModalOpen}
        title={
          quickMode === "edit"
            ? copy.quickEditModalTitle
            : copy.quickCreateModalTitle
        }
        onClose={closeQuickModal}
      >
        <div className="space-y-6">
          {quickErrorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {quickErrorMessage}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.titleEs}
              </label>
              <input
                value={quickForm.title.es}
                onChange={(e) =>
                  handleQuickLocalizedChange("title", "es", e.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
              {quickErrors.titleEs ? (
                <p className="mt-2 text-xs text-red-600">{quickErrors.titleEs}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.titleEn}
              </label>
              <input
                value={quickForm.title.en}
                onChange={(e) =>
                  handleQuickLocalizedChange("title", "en", e.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
              {quickErrors.titleEn ? (
                <p className="mt-2 text-xs text-red-600">{quickErrors.titleEn}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.descriptionEs}
              </label>
              <textarea
                rows={3}
                value={quickForm.description.es}
                onChange={(e) =>
                  handleQuickLocalizedChange("description", "es", e.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.descriptionEn}
              </label>
              <textarea
                rows={3}
                value={quickForm.description.en}
                onChange={(e) =>
                  handleQuickLocalizedChange("description", "en", e.target.value)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.type}
              </label>
              <select
                value={quickForm.type}
                onChange={(e) =>
                  handleQuickChange("type", e.target.value as DocumentType)
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
                value={quickForm.fileName}
                onChange={(e) => handleQuickChange("fileName", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {copy.fileUrl}
            </label>

            <div className="space-y-3">
              <input
                value={quickForm.fileUrl}
                onChange={(e) => handleQuickChange("fileUrl", e.target.value)}
                placeholder={copy.placeholderFileUrl}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.svg"
                    className="hidden"
                    onChange={(e) => void handleQuickDocumentFileUpload(e)}
                    disabled={quickSaving || uploadingDocumentFile}
                  />
                  {uploadingDocumentFile
                    ? locale === "es"
                      ? "Subiendo documento..."
                      : "Uploading document..."
                    : locale === "es"
                      ? "Subir documento"
                      : "Upload document"}
                </label>

                {quickForm.fileUrl ? (
                  <span className="text-xs text-slate-500">{quickForm.fileUrl}</span>
                ) : null}
              </div>

              {quickErrors.fileUrl ? (
                <p className="text-xs text-red-600">{quickErrors.fileUrl}</p>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {copy.thumbnailUrl}
            </label>

            <div className="space-y-3">
              <input
                value={quickForm.thumbnailUrl}
                onChange={(e) => handleQuickChange("thumbnailUrl", e.target.value)}
                placeholder={copy.placeholderThumb}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50">
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp,.svg"
                    className="hidden"
                    onChange={(e) => void handleQuickThumbnailUpload(e)}
                    disabled={quickSaving || uploadingThumbnailFile}
                  />
                  {uploadingThumbnailFile
                    ? locale === "es"
                      ? "Subiendo miniatura..."
                      : "Uploading thumbnail..."
                    : locale === "es"
                      ? "Subir miniatura"
                      : "Upload thumbnail"}
                </label>

                {quickForm.thumbnailUrl ? (
                  <span className="text-xs text-slate-500">
                    {quickForm.thumbnailUrl}
                  </span>
                ) : null}
              </div>

              {quickForm.thumbnailUrl ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                    {locale === "es" ? "Vista previa" : "Preview"}
                  </div>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveAssetUrl(quickForm.thumbnailUrl)}
                    alt="Document thumbnail preview"
                    className="max-h-40 w-auto rounded-lg object-contain"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.language}
              </label>
              <select
                value={quickForm.language}
                onChange={(e) =>
                  handleQuickChange("language", e.target.value as DocumentLanguage)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              >
                <option value="es">{copy.languageOptionEs}</option>
                <option value="en">{copy.languageOptionEn}</option>
                <option value="both">{copy.languageOptionBoth}</option>
                <option value="other">{copy.languageOptionOther}</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.category}
              </label>
              <select
                value={quickForm.category}
                onChange={(e) =>
                  handleQuickChange("category", e.target.value as DocumentCategory)
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
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.visibility}
              </label>
              <select
                value={quickForm.visibility}
                onChange={(e) =>
                  handleQuickChange(
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
                value={quickForm.status}
                onChange={(e) =>
                  handleQuickChange("status", e.target.value as DocumentStatus)
                }
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {copy.order}
              </label>
              <input
                value={quickForm.order}
                onChange={(e) => handleQuickChange("order", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
              />
              {quickErrors.order ? (
                <p className="mt-2 text-xs text-red-600">{quickErrors.order}</p>
              ) : null}
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={quickForm.featured}
                  onChange={(e) => handleQuickChange("featured", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {copy.featured}
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleQuickSave()}
              disabled={quickSaving}
              className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {quickSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {quickSaving
                ? copy.quickSaving
                : quickMode === "edit"
                  ? copy.quickEditSave
                  : copy.quickCreateSave}
            </button>

            <button
              type="button"
              disabled={quickSaving}
              onClick={closeQuickModal}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <X className="h-4 w-4" />
              {copy.cancel}
            </button>
          </div>
        </div>
      </QuickModal>
    </>
  );
}