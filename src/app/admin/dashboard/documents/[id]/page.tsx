"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Edit Document
 * Path: src/app/admin/dashboard/documents/[id]/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página administrativa para editar un documento existente.
 *
 *   Objetivo:
 *   - Leer un documento por id
 *   - Editarlo con contrato estable
 *   - Actualizarlo vía PUT
 *   - Permitir eliminación controlada vía DELETE
 *
 *   Alcance:
 *   - Carga inicial desde /api/admin/documents/[id]
 *   - Validación básica por campo
 *   - Guardado completo
 *   - Eliminación con confirmación nativa
 *
 * EN:
 *   Administrative page for editing an existing document.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	FileText,
	Save,
	Loader2,
	ExternalLink,
	Trash2,
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

interface DocumentFormState {
	title: LocalizedText;
	description: LocalizedText;
	type: string;
	fileUrl: string;
	fileName: string;
	mimeType: string;
	fileSizeBytes: string;
	thumbnailUrl: string;
	language: DocumentLanguage;
	category: string;
	relatedModule: string;
	relatedEntityId: string;
	visibility: DocumentVisibility;
	status: DocumentStatus;
	order: string;
	featured: boolean;
	uploadedAt: string;
	updatedBy: string;
	updatedByEmail: string;
}

interface DocumentApiResponse {
	ok: boolean;
	data?: AdminDocument;
	message?: string;
}

interface FieldErrors {
	titleEs?: string;
	titleEn?: string;
	fileUrl?: string;
	order?: string;
	fileSizeBytes?: string;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = {
	es: "",
	en: "",
};

const INITIAL_FORM: DocumentFormState = {
	title: { es: "", en: "" },
	description: { es: "", en: "" },
	type: "pdf",
	fileUrl: "",
	fileName: "",
	mimeType: "",
	fileSizeBytes: "",
	thumbnailUrl: "",
	language: "es",
	category: "general",
	relatedModule: "general",
	relatedEntityId: "",
	visibility: "public",
	status: "published",
	order: "1",
	featured: false,
	uploadedAt: "",
	updatedBy: "",
	updatedByEmail: "",
};

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
		return { ...EMPTY_LOCALIZED_TEXT };
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

function toDatetimeLocal(value: string): string {
	if (!value) return "";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";

	const year = date.getFullYear();
	const month = `${date.getMonth() + 1}`.padStart(2, "0");
	const day = `${date.getDate()}`.padStart(2, "0");
	const hours = `${date.getHours()}`.padStart(2, "0");
	const minutes = `${date.getMinutes()}`.padStart(2, "0");

	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildFormFromDocument(document: AdminDocument): DocumentFormState {
	return {
		title: {
			es: document.title.es || "",
			en: document.title.en || "",
		},
		description: {
			es: document.description.es || "",
			en: document.description.en || "",
		},
		type: document.type || "pdf",
		fileUrl: document.fileUrl || "",
		fileName: document.fileName || "",
		mimeType: document.mimeType || "",
		fileSizeBytes:
			document.fileSizeBytes > 0 ? String(document.fileSizeBytes) : "",
		thumbnailUrl: document.thumbnailUrl || "",
		language: document.language || "es",
		category: document.category || "general",
		relatedModule: document.relatedModule || "general",
		relatedEntityId: document.relatedEntityId || "",
		visibility: document.visibility || "public",
		status: document.status || "published",
		order: String(document.order || 1),
		featured: document.featured || false,
		uploadedAt: toDatetimeLocal(document.uploadedAt),
		updatedBy: document.updatedBy || "",
		updatedByEmail: document.updatedByEmail || "",
	};
}

function normalizeTrimmed(value: string): string {
	return value.trim();
}

function isValidPositiveInteger(value: string): boolean {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= 1;
}

function isValidNonNegativeInteger(value: string): boolean {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= 0;
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
			es: normalizeTrimmed(form.title.es),
			en: normalizeTrimmed(form.title.en),
		},
		description: {
			es: normalizeTrimmed(form.description.es),
			en: normalizeTrimmed(form.description.en),
		},
		type: normalizeTrimmed(form.type).toLowerCase() || "pdf",
		fileUrl: normalizeTrimmed(form.fileUrl),
		fileName: normalizeTrimmed(form.fileName),
		mimeType: normalizeTrimmed(form.mimeType).toLowerCase(),
		fileSizeBytes: form.fileSizeBytes.trim() ? Number(form.fileSizeBytes) : 0,
		thumbnailUrl: normalizeTrimmed(form.thumbnailUrl),
		language: form.language,
		category: normalizeTrimmed(form.category).toLowerCase() || "general",
		relatedModule:
			normalizeTrimmed(form.relatedModule).toLowerCase() || "general",
		relatedEntityId: normalizeTrimmed(form.relatedEntityId) || null,
		visibility: form.visibility,
		status: form.status,
		order: Number(form.order),
		featured: form.featured,
		uploadedAt: form.uploadedAt
			? new Date(form.uploadedAt).toISOString()
			: new Date().toISOString(),
		updatedBy: normalizeTrimmed(form.updatedBy),
		updatedByEmail: normalizeTrimmed(form.updatedByEmail).toLowerCase(),
	};
}

function validateForm(form: DocumentFormState, locale: Locale): FieldErrors {
	const errors: FieldErrors = {};

	const titleEs = normalizeTrimmed(form.title.es);
	const titleEn = normalizeTrimmed(form.title.en);

	if (!titleEs && !titleEn) {
		errors.titleEs =
			locale === "es"
				? "Debes ingresar al menos un título en ES o EN."
				: "You must provide at least one title in ES or EN.";
		errors.titleEn = errors.titleEs;
	}

	if (!normalizeTrimmed(form.fileUrl)) {
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

	if (
		form.fileSizeBytes.trim() &&
		!isValidNonNegativeInteger(form.fileSizeBytes)
	) {
		errors.fileSizeBytes =
			locale === "es"
				? "El tamaño del archivo debe ser un entero mayor o igual a 0."
				: "File size must be an integer greater than or equal to 0.";
	}

	return errors;
}

function formatDate(value: string, locale: Locale): string {
	if (!value) return "—";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";

	return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminEditDocumentPage() {
	const router = useRouter();
	const params = useParams();
	const locale: Locale = "es";

	const id =
		typeof params?.id === "string"
			? params.id
			: Array.isArray(params?.id)
				? params.id[0]
				: "";

	const [form, setForm] = useState<DocumentFormState>(INITIAL_FORM);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [loading, setLoading] = useState<boolean>(true);
	const [saving, setSaving] = useState<boolean>(false);
	const [deleting, setDeleting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [successMessage, setSuccessMessage] = useState<string>("");
	const [documentMeta, setDocumentMeta] = useState<AdminDocument | null>(null);

	const copy = useMemo(() => {
		return {
			eyebrow: locale === "es" ? "Biblioteca documental" : "Documents library",
			title: locale === "es" ? "Editar documento" : "Edit document",
			subtitle:
				locale === "es"
					? "Actualiza un documento reutilizable y mantén su contrato estable para el resto del sistema."
					: "Update a reusable document and keep a stable contract for the rest of the system.",

			back: locale === "es" ? "Volver a documentos" : "Back to documents",
			save: locale === "es" ? "Guardar cambios" : "Save changes",
			saving: locale === "es" ? "Guardando..." : "Saving...",
			deleting: locale === "es" ? "Eliminando..." : "Deleting...",
			delete: locale === "es" ? "Eliminar documento" : "Delete document",

			basicInfo: locale === "es" ? "Información base" : "Basic information",
			fileInfo: locale === "es" ? "Archivo y recursos" : "File and assets",
			organization:
				locale === "es" ? "Organización y acceso" : "Organization and access",
			audit: locale === "es" ? "Auditoría" : "Audit",

			titleEs: locale === "es" ? "Título (ES)" : "Title (ES)",
			titleEn: locale === "es" ? "Título (EN)" : "Title (EN)",
			descriptionEs: locale === "es" ? "Descripción (ES)" : "Description (ES)",
			descriptionEn: locale === "es" ? "Descripción (EN)" : "Description (EN)",

			type: locale === "es" ? "Tipo" : "Type",
			fileUrl: locale === "es" ? "URL / ruta del archivo" : "File URL / path",
			fileName: locale === "es" ? "Nombre de archivo" : "File name",
			mimeType: locale === "es" ? "MIME type" : "MIME type",
			fileSizeBytes: locale === "es" ? "Tamaño (bytes)" : "Size (bytes)",
			thumbnailUrl:
				locale === "es" ? "URL / ruta de miniatura" : "Thumbnail URL / path",

			language: locale === "es" ? "Idioma" : "Language",
			category: locale === "es" ? "Categoría" : "Category",
			relatedModule: locale === "es" ? "Módulo relacionado" : "Related module",
			relatedEntityId:
				locale === "es" ? "ID entidad relacionada" : "Related entity ID",
			visibility: locale === "es" ? "Visibilidad" : "Visibility",
			status: locale === "es" ? "Estado" : "Status",
			order: locale === "es" ? "Orden" : "Order",
			featured: locale === "es" ? "Destacado" : "Featured",
			uploadedAt: locale === "es" ? "Fecha de carga" : "Upload date",

			updatedBy: locale === "es" ? "Actualizado por" : "Updated by",
			updatedByEmail:
				locale === "es" ? "Email de actualización" : "Update email",

			createdAt: locale === "es" ? "Creado" : "Created",
			lastUpdated: locale === "es" ? "Última actualización" : "Last updated",

			placeholderFileUrl:
				locale === "es"
					? "/assets/documents/ficha-tecnica.pdf o https://..."
					: "/assets/documents/datasheet.pdf or https://...",
			placeholderThumb:
				locale === "es"
					? "/assets/documents/miniatura.jpg"
					: "/assets/documents/thumbnail.jpg",

			saveSuccess:
				locale === "es"
					? "Documento actualizado correctamente."
					: "Document updated successfully.",
			deleteConfirm:
				locale === "es"
					? "¿Seguro que deseas eliminar este documento? Esta acción no se puede deshacer."
					: "Are you sure you want to delete this document? This action cannot be undone.",
			loadError:
				locale === "es"
					? "No fue posible cargar el documento."
					: "Unable to load the document.",
			notFound:
				locale === "es" ? "Documento no encontrado." : "Document not found.",
		};
	}, [locale]);

	/* ------------------------------------------------------------------------ */
	/* Data load                                                                */
	/* ------------------------------------------------------------------------ */

	useEffect(() => {
		const loadDocument = async (): Promise<void> => {
			if (!id) {
				setLoading(false);
				setErrorMessage(copy.notFound);
				return;
			}

			try {
				setLoading(true);
				setErrorMessage("");
				setSuccessMessage("");

				const response = await fetch(`/api/admin/documents/${id}`, {
					method: "GET",
					cache: "no-store",
				});

				const json: DocumentApiResponse = await response.json().catch(() => ({
					ok: false,
					message: copy.loadError,
				}));

				if (!response.ok || !json.ok || !json.data) {
					throw new Error(json.message || copy.loadError);
				}

				const document = normalizeDocument(json.data);

				setDocumentMeta(document);
				setForm(buildFormFromDocument(document));
			} catch (error) {
				console.error("[AdminEditDocumentPage] load error:", error);

				setErrorMessage(
					error instanceof Error ? error.message : copy.loadError,
				);
			} finally {
				setLoading(false);
			}
		};

		void loadDocument();
	}, [id, copy.loadError, copy.notFound]);

	/* ------------------------------------------------------------------------ */
	/* Actions                                                                  */
	/* ------------------------------------------------------------------------ */

	const handleChange = <K extends keyof DocumentFormState>(
		key: K,
		value: DocumentFormState[K],
	) => {
		setForm((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const handleLocalizedChange = (
		key: "title" | "description",
		lang: Locale,
		value: string,
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
		event: React.FormEvent<HTMLFormElement>,
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

			const response = await fetch(`/api/admin/documents/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(buildPayload(form)),
			});

			const json: DocumentApiResponse = await response.json().catch(() => ({
				ok: false,
				message: "Unexpected response",
			}));

			if (!response.ok || !json.ok) {
				throw new Error(json.message || "Error updating document");
			}

			if (json.data) {
				setDocumentMeta(normalizeDocument(json.data));
			}

			setSuccessMessage(copy.saveSuccess);
			router.refresh();
		} catch (error) {
			console.error("[AdminEditDocumentPage] save error:", error);

			setErrorMessage(
				error instanceof Error
					? error.message
					: locale === "es"
						? "Error inesperado al guardar."
						: "Unexpected error while saving.",
			);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (): Promise<void> => {
		const confirmed = window.confirm(copy.deleteConfirm);
		if (!confirmed) return;

		try {
			setDeleting(true);
			setErrorMessage("");
			setSuccessMessage("");

			const response = await fetch(`/api/admin/documents/${id}`, {
				method: "DELETE",
			});

			const json: DocumentApiResponse = await response.json().catch(() => ({
				ok: false,
				message: "Unexpected response",
			}));

			if (!response.ok || !json.ok) {
				throw new Error(json.message || "Error deleting document");
			}

			router.push("/admin/dashboard/documents");
			router.refresh();
		} catch (error) {
			console.error("[AdminEditDocumentPage] delete error:", error);

			setErrorMessage(
				error instanceof Error
					? error.message
					: locale === "es"
						? "Error inesperado al eliminar."
						: "Unexpected error while deleting.",
			);
		} finally {
			setDeleting(false);
		}
	};

	/* ------------------------------------------------------------------------ */
	/* Render states                                                            */
	/* ------------------------------------------------------------------------ */

	if (loading) {
		return (
			<main className="min-h-screen bg-slate-50 px-6 py-8 md:px-8">
				<div className="mx-auto max-w-5xl">
					<div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-200" />
					<div className="mb-3 h-11 w-72 animate-pulse rounded bg-slate-200" />
					<div className="h-5 w-[520px] max-w-full animate-pulse rounded bg-slate-200" />

					<div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
						<div className="space-y-4">
							{Array.from({ length: 8 }).map((_, index) => (
								<div
									key={`edit-doc-skeleton-${index}`}
									className="h-12 animate-pulse rounded-2xl bg-slate-200"
								/>
							))}
						</div>
					</div>
				</div>
			</main>
		);
	}

	if (!loading && errorMessage && !documentMeta) {
		return (
			<main className="min-h-screen bg-slate-50 px-6 py-8 md:px-8">
				<div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
					<Link
						href="/admin/dashboard/documents"
						className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
					>
						<ArrowLeft className="h-4 w-4" />
						{copy.back}
					</Link>

					<h1 className="text-2xl font-semibold text-slate-950">
						{copy.title}
					</h1>

					<p className="mt-4 text-sm leading-7 text-red-600">{errorMessage}</p>
				</div>
			</main>
		);
	}

	/* ------------------------------------------------------------------------ */
	/* Main render                                                              */
	/* ------------------------------------------------------------------------ */

	return (
		<main className="min-h-screen bg-slate-50 px-6 py-8 md:px-8">
			<div className="mx-auto max-w-5xl">
				{/* ------------------------------------------------------------------ */}
				{/* Header                                                             */}
				{/* ------------------------------------------------------------------ */}
				<section className="mb-8">
					<Link
						href="/admin/dashboard/documents"
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

				{/* ------------------------------------------------------------------ */}
				{/* Alerts                                                             */}
				{/* ------------------------------------------------------------------ */}
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

				{/* ------------------------------------------------------------------ */}
				{/* Form                                                               */}
				{/* ------------------------------------------------------------------ */}
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Basic info */}
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

					{/* File and assets */}
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
						<h2 className="text-xl font-semibold text-slate-950">
							{copy.fileInfo}
						</h2>

						<div className="mt-6 grid gap-5 md:grid-cols-2">
							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.type}
								</label>
								<input
									value={form.type}
									onChange={(e) => handleChange("type", e.target.value)}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
								/>
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
													"noopener,noreferrer",
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

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.mimeType}
								</label>
								<input
									value={form.mimeType}
									onChange={(e) => handleChange("mimeType", e.target.value)}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.fileSizeBytes}
								</label>
								<input
									value={form.fileSizeBytes}
									onChange={(e) =>
										handleChange("fileSizeBytes", e.target.value)
									}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
								/>
								{errors.fileSizeBytes ? (
									<p className="mt-2 text-xs text-red-600">
										{errors.fileSizeBytes}
									</p>
								) : null}
							</div>

							<div className="md:col-span-2">
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.thumbnailUrl}
								</label>
								<input
									value={form.thumbnailUrl}
									onChange={(e) => handleChange("thumbnailUrl", e.target.value)}
									placeholder={copy.placeholderThumb}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
								/>
							</div>
						</div>
					</section>

					{/* Organization and access */}
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
								<input
									value={form.category}
									onChange={(e) => handleChange("category", e.target.value)}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.relatedModule}
								</label>
								<input
									value={form.relatedModule}
									onChange={(e) =>
										handleChange("relatedModule", e.target.value)
									}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
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
											e.target.value as DocumentVisibility,
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

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.uploadedAt}
								</label>
								<input
									type="datetime-local"
									value={form.uploadedAt}
									onChange={(e) => handleChange("uploadedAt", e.target.value)}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
								/>
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

					{/* Audit */}
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
						<h2 className="text-xl font-semibold text-slate-950">
							{copy.audit}
						</h2>

						<div className="mt-6 grid gap-5 md:grid-cols-2">
							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.updatedBy}
								</label>
								<input
									value={form.updatedBy}
									onChange={(e) => handleChange("updatedBy", e.target.value)}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.updatedByEmail}
								</label>
								<input
									value={form.updatedByEmail}
									onChange={(e) =>
										handleChange("updatedByEmail", e.target.value)
									}
									className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-lime-500"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.createdAt}
								</label>
								<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
									{formatDate(documentMeta?.createdAt || "", locale)}
								</div>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									{copy.lastUpdated}
								</label>
								<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
									{formatDate(documentMeta?.updatedAt || "", locale)}
								</div>
							</div>
						</div>
					</section>

					{/* Actions */}
					<section className="flex flex-wrap items-center justify-between gap-3 pb-8">
						<button
							type="button"
							onClick={() => void handleDelete()}
							disabled={deleting}
							className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
						>
							{deleting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="h-4 w-4" />
							)}
							{deleting ? copy.deleting : copy.delete}
						</button>

						<div className="flex flex-wrap gap-3">
							<Link
								href="/admin/dashboard/documents"
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
						</div>
					</section>
				</form>
			</div>
		</main>
	);
}
