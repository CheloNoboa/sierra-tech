"use client";

/**
 * =============================================================================
 * 📄 Component: ProjectFormPage
 * Path: src/components/projects/ProjectFormPage.tsx
 * =============================================================================
 *
 * ES:
 * Formulario oficial unificado para crear y editar proyectos.
 *
 * Uso:
 * - mode="create" para /admin/dashboard/projects/new
 * - mode="edit"   para /admin/dashboard/projects/[id]
 *
 * Decisiones:
 * - una sola UI para NEW y EDIT
 * - misma estructura visual que la pantalla actual de edición
 * - create usa payload vacío y POST
 * - edit carga por id y usa PUT
 * - sin modal
 * - sin any
 * - sin alert()
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";

import ProjectGalleryUploader from "@/components/ProjectGalleryUploader";
import ProjectImageUploader from "@/components/ProjectImageUploader";
import { uploadAdminFile } from "@/lib/adminUploadsClient";

import { useTranslation } from "@/hooks/useTranslation";

import {
	createEmptyProjectPayload,
	normalizeProjectEntity,
} from "@/lib/projects/projectPayload";

import type {
	ProjectDocumentLink,
	ProjectDocumentType,
	ProjectDocumentVisibility,
	ProjectEntity,
	ProjectImage,
	ProjectPayload,
	ProjectStatus,
} from "@/types/project";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

export type ProjectFormMode = "create" | "edit";

export type ProjectFormPageProps = {
	mode: ProjectFormMode;
	projectId?: string;
};

/* -------------------------------------------------------------------------- */
/* Local types                                                                */
/* -------------------------------------------------------------------------- */

type RawOrganization = {
	_id?: string;
	name?: string;
	companyName?: string;
	commercialName?: string;
	legalName?: string;
	email?: string;
	primaryEmail?: string;
};

type OrganizationsResponse =
	| {
		ok: true;
		items?: RawOrganization[];
		organizations?: RawOrganization[];
		data?: RawOrganization[];
	}
	| {
		ok: false;
		error: string;
	};

type OrganizationOption = {
	id: string;
	label: string;
	email: string;
};

type ProjectUploadResponse =
	| {
		ok: true;
		item: {
			url: string;
			storageKey: string;
		};
	}
	| {
		ok: false;
		error: string;
	};

type ProjectSaveResponse =
	| {
		ok: true;
		item?: ProjectEntity;
		data?: ProjectEntity;
	}
	| {
		ok: false;
		error: string;
		details?: string[];
	};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function serializeForm(values: ProjectPayload): string {
	return JSON.stringify(values);
}

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function safeArray<T>(value: T[] | null | undefined): T[] {
	return Array.isArray(value) ? value : [];
}

function parseCommaSeparatedValues(value: string): string[] {
	return Array.from(
		new Set(
			value
				.split(",")
				.map((item) => normalizeString(item))
				.filter(Boolean),
		),
	);
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

function extractIsoDateOnly(value: string | null): string {
	if (!value) return "";
	if (value.includes("T")) return value.slice(0, 10);
	return value.slice(0, 10);
}

function parseDateOnly(value: string | null): Date | null {
	const dateOnly = extractIsoDateOnly(value);
	if (!dateOnly) return null;

	const [yearText, monthText, dayText] = dateOnly.split("-");
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);

	if (!year || !month || !day) return null;

	const date = new Date(year, month - 1, day);
	return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date: Date): string {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

function toDateInputValue(value: string | null): string {
	return extractIsoDateOnly(value);
}

function toNullableIsoDate(value: string): string | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	const date = parseDateOnly(trimmed);
	return date ? formatDateOnly(date) : null;
}

function toNullableNumber(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function addMonthsToIsoDate(
	startDate: string | null,
	durationMonths: number | null,
): string | null {
	if (!startDate || !durationMonths || durationMonths <= 0) return null;

	const date = parseDateOnly(startDate);
	if (!date) return null;

	const next = new Date(date);
	next.setMonth(next.getMonth() + durationMonths);

	return formatDateOnly(next);
}

function mapOrganizationLabel(item: RawOrganization): string {
	return (
		normalizeString(item.commercialName) ||
		normalizeString(item.legalName) ||
		normalizeString(item.companyName) ||
		normalizeString(item.name) ||
		normalizeString(item.primaryEmail) ||
		normalizeString(item.email) ||
		"Sin nombre"
	);
}

function createLocalDocumentId(): string {
	return `project-doc-${Date.now()}-${Math.random()
		.toString(36)
		.slice(2, 10)}`;
}

function inferTitleFromFileName(fileName: string): string {
	const clean = normalizeString(fileName);
	if (!clean) return "";

	const withoutExtension = clean.replace(/\.[^/.]+$/, "");
	return withoutExtension.replace(/[-_]+/g, " ").trim();
}

function createEmptyDocumentLink(): ProjectDocumentLink {
	return {
		documentId: createLocalDocumentId(),
		title: "",
		documentType: "other",
		description: "",
		visibility: "private",
		language: "none",
		documentDate: new Date().toISOString(),

		fileName: "",
		fileUrl: "",
		storageKey: "",
		mimeType: "",
		size: null,

		version: "",
		isPublic: false,
		visibleInPortal: true,
		visibleInPublicSite: false,
		visibleToInternalOnly: false,
		requiresAlert: false,
		alertDate: null,
		nextDueDate: null,
		maintenanceFrequency: null,
		isCritical: false,
		sortOrder: 0,
		notes: "",
	};
}

function getProjectStatusTone(
	status: ProjectStatus,
): "neutral" | "warning" | "success" {
	if (status === "published") return "success";
	if (status === "archived") return "neutral";
	return "warning";
}

function getProjectStatusLabel(
	status: ProjectStatus,
	locale: "es" | "en",
): string {
	if (locale === "en") {
		if (status === "published") return "Published";
		if (status === "archived") return "Archived";
		return "Draft";
	}

	if (status === "published") return "Publicado";
	if (status === "archived") return "Archivado";
	return "Borrador";
}

function getBadgeClasses(tone: "neutral" | "warning" | "success"): string {
	if (tone === "success") {
		return "border border-emerald-200 bg-emerald-50 text-emerald-700";
	}

	if (tone === "warning") {
		return "border border-amber-200 bg-amber-50 text-amber-700";
	}

	return "border border-border bg-surface text-text-secondary";
}

function resolveDocumentTypeLabel(
	value: ProjectDocumentType,
	locale: "es" | "en",
): string {
	const mapEs: Record<ProjectDocumentType, string> = {
		contract: "Contrato",
		planning: "Planificación",
		schedule: "Cronograma",
		technical_design: "Diseño técnico",
		plan: "Plano",
		technical_report: "Informe técnico",
		technical_sheet: "Ficha técnica",
		operation_manual: "Manual de operación",
		maintenance_manual: "Manual de mantenimiento",
		inspection_report: "Informe de inspección",
		maintenance_report: "Informe de mantenimiento",
		delivery_record: "Acta de entrega",
		certificate: "Certificado",
		warranty: "Garantía",
		invoice: "Factura",
		permit: "Permiso",
		photo_evidence: "Evidencia fotográfica",
		other: "Otro",
	};

	const mapEn: Record<ProjectDocumentType, string> = {
		contract: "Contract",
		planning: "Planning",
		schedule: "Schedule",
		technical_design: "Technical design",
		plan: "Plan",
		technical_report: "Technical report",
		technical_sheet: "Technical sheet",
		operation_manual: "Operation manual",
		maintenance_manual: "Maintenance manual",
		inspection_report: "Inspection report",
		maintenance_report: "Maintenance report",
		delivery_record: "Delivery record",
		certificate: "Certificate",
		warranty: "Warranty",
		invoice: "Invoice",
		permit: "Permit",
		photo_evidence: "Photo evidence",
		other: "Other",
	};

	return locale === "en" ? mapEn[value] : mapEs[value];
}

function formatHumanDate(value: string | null, locale: "es" | "en"): string {
	if (!value) return locale === "es" ? "Sin fecha" : "No date";

	const date = parseDateOnly(value);
	if (!date) return locale === "es" ? "Sin fecha" : "No date";

	return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	}).format(date);
}

function resolveStoredFileUrl(
	value: string | null | undefined,
	storageKey?: string | null,
): string {
	const directUrl = normalizeString(value);

	if (directUrl) {
		if (
			directUrl.startsWith("http://") ||
			directUrl.startsWith("https://") ||
			directUrl.startsWith("/")
		) {
			return directUrl;
		}

		if (directUrl.startsWith("admin/") || directUrl.includes("/")) {
			return `/api/admin/uploads/view?key=${encodeURIComponent(directUrl)}`;
		}
	}

	const safeStorageKey = normalizeString(storageKey);

	if (safeStorageKey) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(safeStorageKey)}`;
	}

	return "";
}

/* -------------------------------------------------------------------------- */
/* Small UI blocks                                                            */
/* -------------------------------------------------------------------------- */

function FieldLabel({
	children,
	hint,
}: {
	children: ReactNode;
	hint?: string;
}) {
	return (
		<div className="mb-1.5 flex items-center justify-between gap-3">
			<label className="text-xs font-medium text-text-secondary">
				{children}
			</label>
			{hint ? (
				<span className="text-[11px] text-text-muted">{hint}</span>
			) : null}
		</div>
	);
}

function SectionCard({
	title,
	subtitle,
	children,
	actions,
}: {
	title: string;
	subtitle?: string;
	children: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border bg-surface-soft p-5 shadow-sm">
			<div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
				<div className="min-w-0">
					<h3 className="text-sm font-semibold text-text-primary">{title}</h3>
					{subtitle ? (
						<p className="mt-1 text-xs text-text-muted">{subtitle}</p>
					) : null}
				</div>

				{actions ? <div className="shrink-0">{actions}</div> : null}
			</div>

			{children}
		</section>
	);
}
/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProjectFormPage({
	mode,
	projectId,
}: ProjectFormPageProps) {
	const router = useRouter();

	const isEditMode = mode === "edit";
	const isCreateMode = mode === "create";

	const { locale } = useTranslation();
	const safeLocale: "es" | "en" = locale === "en" ? "en" : "es";

	const toast = useToast();
	const toastRef = useRef(toast);

	useEffect(() => {
		toastRef.current = toast;
	}, [toast]);

	const initialData = useMemo(
		() => sanitizeProjectPayload(createEmptyProjectPayload()),
		[],
	);

	const [form, setForm] = useState<ProjectPayload>(initialData);
	const [initialSnapshot, setInitialSnapshot] = useState(
		serializeForm(initialData),
	);
	const [loading, setLoading] = useState(isEditMode);
	const [saving, setSaving] = useState(false);
	const [showUnsaved, setShowUnsaved] = useState(false);
	const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
	const [organizationsLoading, setOrganizationsLoading] = useState(false);
	const [organizationsError, setOrganizationsError] = useState("");
	const [uploadingDocumentIndex, setUploadingDocumentIndex] = useState<
		number | null
	>(null);

	const t = useMemo(
		() => ({
			pageTitle:
				isCreateMode
					? safeLocale === "es"
						? "Nuevo proyecto"
						: "New project"
					: safeLocale === "es"
						? "Editar proyecto"
						: "Edit project",
			subtitle:
				isCreateMode
					? safeLocale === "es"
						? "Crea un proyecto documental-operativo con publicación controlada."
						: "Create a document-operational project with controlled publication."
					: safeLocale === "es"
						? "Gestión documental y publicación controlada del proyecto."
						: "Document management and controlled project publication.",
			loadingProject:
				safeLocale === "es" ? "Cargando proyecto..." : "Loading project...",
			back: safeLocale === "es" ? "Volver" : "Back",
			cancel: safeLocale === "es" ? "Cancelar" : "Cancel",
			save: safeLocale === "es" ? "Guardar" : "Save",
			saving: safeLocale === "es" ? "Guardando..." : "Saving...",
			identity:
				safeLocale === "es" ? "Identidad del proyecto" : "Project identity",
			identityNote:
				safeLocale === "es"
					? "Datos base del proyecto, organización asociada y estado administrativo."
					: "Base project data, linked organization and administrative status.",
			description:
				safeLocale === "es" ? "Descripción del proyecto" : "Project description",
			descriptionNote:
				safeLocale === "es"
					? "Contexto descriptivo completo del proyecto en ambos idiomas."
					: "Full descriptive project context in both languages.",
			portalCategory:
				safeLocale === "es"
					? "Clasificación visible en portal"
					: "Portal visible classification",
			portalCategoryNote:
				safeLocale === "es"
					? "Define la clasificación técnica visible del proyecto en ambos idiomas. El portal resolverá esta categoría usando tipo de sistema, medio tratado y tecnologías."
					: "Define the visible technical classification of the project in both languages. The portal will resolve this category using system type, treated medium and technologies.",
			systemTypeEs:
				safeLocale === "es" ? "Tipo de sistema (ES)" : "System type (ES)",
			systemTypeEn:
				safeLocale === "es" ? "Tipo de sistema (EN)" : "System type (EN)",
			treatedMediumEs:
				safeLocale === "es" ? "Medio tratado (ES)" : "Treated medium (ES)",
			treatedMediumEn:
				safeLocale === "es" ? "Medio tratado (EN)" : "Treated medium (EN)",
			technologyUsedEs:
				safeLocale === "es"
					? "Tecnologías usadas (ES)"
					: "Technologies used (ES)",
			technologyUsedEn:
				safeLocale === "es"
					? "Tecnologías usadas (EN)"
					: "Technologies used (EN)",
			technologyUsedHint:
				safeLocale === "es" ? "Separadas por coma" : "Comma separated",
			media: safeLocale === "es" ? "Portada y galería" : "Cover and gallery",
			mediaNote:
				safeLocale === "es"
					? "Activos visuales administrados por upload real."
					: "Visual assets handled through real uploads.",
			publication:
				safeLocale === "es" ? "Publicación pública" : "Public publication",
			publicationNote:
				safeLocale === "es"
					? "La salida pública se limita a nombre, resumen, portada y galería."
					: "Public output is limited to name, summary, cover and gallery.",
			documents:
				safeLocale === "es" ? "Documentos del proyecto" : "Project documents",
			documentsNote:
				safeLocale === "es"
					? "Carga directa de documentos del proyecto con metadata mínima y clara."
					: "Direct upload of project documents with a minimal and clear metadata set.",
			legacyMaintenance:
				safeLocale === "es"
					? "Mantenimientos heredados"
					: "Legacy maintenance",
			legacyMaintenanceNote:
				safeLocale === "es"
					? "Solo lectura. El schedule y operación de mantenimientos se gestionan ahora en el módulo Maintenance."
					: "Read-only. Schedule and maintenance operations now belong to the Maintenance module.",
			notes: safeLocale === "es" ? "Notas y ubicación" : "Notes and location",
			notesNote:
				safeLocale === "es"
					? "Notas internas, operativas y control de ubicación pública."
					: "Internal notes, operational notes and public location control.",
			addDocument: safeLocale === "es" ? "Agregar documento" : "Add document",
			remove: safeLocale === "es" ? "Quitar" : "Remove",
			uploadDocument:
				safeLocale === "es" ? "Subir documento" : "Upload document",
			replaceDocument:
				safeLocale === "es" ? "Reemplazar documento" : "Replace document",
			openDocument: safeLocale === "es" ? "Abrir archivo" : "Open file",
			currentFile: safeLocale === "es" ? "Archivo actual" : "Current file",
			noFileLoaded:
				safeLocale === "es"
					? "No hay archivo cargado."
					: "No file uploaded yet.",
			noDocuments:
				safeLocale === "es"
					? "No hay documentos asociados."
					: "There are no linked documents.",
			noMaintenance:
				safeLocale === "es"
					? "No hay mantenimientos heredados en este proyecto."
					: "There are no legacy maintenance records in this project.",
			loadError:
				safeLocale === "es"
					? "No se pudo cargar el proyecto."
					: "Could not load project.",
			createdOk:
				safeLocale === "es"
					? "Proyecto creado correctamente."
					: "Project created successfully.",
			updatedOk:
				safeLocale === "es"
					? "Proyecto actualizado correctamente."
					: "Project updated successfully.",
			genericError: safeLocale === "es" ? "Error al guardar." : "Error saving.",
			uploadError:
				safeLocale === "es"
					? "No se pudo subir el archivo."
					: "Could not upload the file.",
			organizationsLoadError:
				safeLocale === "es"
					? "No se pudieron cargar las organizaciones."
					: "Could not load organizations.",
			unsavedTitle:
				safeLocale === "es" ? "Cambios sin guardar" : "Unsaved changes",
			unsavedMessage:
				safeLocale === "es"
					? "Tienes cambios sin guardar. Si sales ahora, perderás los cambios realizados."
					: "You have unsaved changes. If you leave now, your changes will be lost.",
			unsavedCancel: safeLocale === "es" ? "Seguir editando" : "Keep editing",
			unsavedConfirm:
				safeLocale === "es" ? "Salir sin guardar" : "Leave without saving",
			contractStartDate:
				safeLocale === "es" ? "Inicio del contrato" : "Contract start date",
			contractDurationMonths:
				safeLocale === "es" ? "Duración en meses" : "Duration in months",
			contractEndDate:
				safeLocale === "es" ? "Fin calculado" : "Calculated end date",
		}),
		[isCreateMode, safeLocale],
	);

	const hasChanges = useMemo(
		() => serializeForm(form) !== initialSnapshot,
		[form, initialSnapshot],
	);

	const selectedOrganization = useMemo(
		() =>
			organizations.find((item) => item.id === form.primaryClientId) ?? null,
		[organizations, form.primaryClientId],
	);

	function sanitizeProjectPayload(nextValue: ProjectPayload): ProjectPayload {
		const isPublic = Boolean(nextValue.publicSiteSettings?.enabled);

		return {
			...nextValue,
			publicSiteSettings: {
				enabled: isPublic,
				showTitle: nextValue.publicSiteSettings?.showTitle ?? true,
				showSummary: nextValue.publicSiteSettings?.showSummary ?? true,
				showCoverImage: nextValue.publicSiteSettings?.showCoverImage ?? true,
				showGallery: nextValue.publicSiteSettings?.showGallery ?? true,
			},
			status: isPublic ? "published" : "draft",
			visibility: isPublic ? "public" : "private",
			featured: Boolean(nextValue.featured),
			contractEndDate: addMonthsToIsoDate(
				nextValue.contractStartDate,
				nextValue.contractDurationMonths,
			),
		};
	}

	function patch<K extends keyof ProjectPayload>(
		key: K,
		value: ProjectPayload[K],
	) {
		setForm((current) =>
			sanitizeProjectPayload({
				...current,
				[key]: value,
			}),
		);
	}

	function isFormValid(): boolean {
		return (
			form.slug.trim().length > 0 &&
			form.title.es.trim().length > 0 &&
			form.title.en.trim().length > 0 &&
			form.summary.es.trim().length > 0 &&
			form.summary.en.trim().length > 0 &&
			form.description.es.trim().length > 0 &&
			form.description.en.trim().length > 0 &&
			form.contractStartDate !== null &&
			form.contractDurationMonths !== null &&
			form.contractDurationMonths > 0 &&
			form.contractEndDate !== null &&
			normalizeString(form.primaryClientId).length > 0
		);
	}

	const canSave = !saving && !loading && hasChanges && isFormValid();

	useEffect(() => {
		if (isCreateMode) return;
		if (!projectId) {
			setLoading(false);
			toastRef.current.error(t.loadError);
			return;
		}

		let cancelled = false;

		async function loadProject() {
			try {
				setLoading(true);

				const response = await fetch(`/api/admin/projects/${projectId}`, {
					method: "GET",
					cache: "no-store",
				});

				const json = (await response.json().catch(() => null)) as
					| { ok: true; item: ProjectEntity }
					| { ok: false; error: string }
					| null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					toastRef.current.error(
						json && !json.ok ? json.error : t.loadError,
					);
					return;
				}

				const normalized = sanitizeProjectPayload(
					normalizeProjectEntity(json.item),
				);

				setForm(normalized);
				setInitialSnapshot(serializeForm(normalized));
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void loadProject();

		return () => {
			cancelled = true;
		};
	}, [isCreateMode, projectId, t.loadError]);

	useEffect(() => {
		let cancelled = false;

		async function loadOrganizations() {
			try {
				setOrganizationsLoading(true);
				setOrganizationsError("");

				const response = await fetch("/api/admin/organizations", {
					method: "GET",
					cache: "no-store",
				});

				const json = (await response
					.json()
					.catch(() => null)) as OrganizationsResponse | null;

				if (!response.ok || !json || !json.ok) {
					throw new Error(
						json && !json.ok ? json.error : t.organizationsLoadError,
					);
				}

				if (cancelled) return;

				const source = safeArray(json.items ?? json.organizations ?? json.data);

				const mapped = source
					.map((item) => ({
						id: normalizeString(item._id),
						label: mapOrganizationLabel(item),
						email:
							normalizeString(item.primaryEmail) ||
							normalizeString(item.email),
					}))
					.filter((item) => item.id.length > 0);

				setOrganizations(
					Array.from(new Map(mapped.map((item) => [item.id, item])).values()),
				);
			} catch (error) {
				if (cancelled) return;

				setOrganizations([]);
				setOrganizationsError(
					error instanceof Error ? error.message : t.organizationsLoadError,
				);
			} finally {
				if (!cancelled) setOrganizationsLoading(false);
			}
		}

		void loadOrganizations();

		return () => {
			cancelled = true;
		};
	}, [t.organizationsLoadError]);

	useEffect(() => {
		if (!hasChanges) return;

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasChanges]);

	async function uploadProjectAsset(
		file: File,
		scope: "projects/covers" | "projects/gallery" = "projects/covers",
	): Promise<{
		url: string;
		alt?: {
			es: string;
			en: string;
		};
		storageKey?: string;
	}> {
		const result = await uploadAdminFile(file, scope);

		if (!result.ok || !result.file) {
			throw new Error(result.message || t.uploadError);
		}

		return {
			url: "",
			storageKey: result.file.fileKey,
			alt: {
				es: "",
				en: "",
			},
		};
	}

	async function uploadProjectDocument(file: File): Promise<{
		fileUrl: string;
		storageKey: string;
		fileName: string;
		mimeType: string;
		size: number;
	}> {
		const formData = new FormData();
		formData.append("file", file);

		const response = await fetch("/api/admin/projects/upload", {
			method: "POST",
			body: formData,
		});

		const json = (await response
			.json()
			.catch(() => null)) as ProjectUploadResponse | null;

		if (!response.ok || !json || !json.ok) {
			throw new Error(json && !json.ok ? json.error : t.uploadError);
		}

		return {
			fileUrl: json.item.url,
			storageKey: json.item.storageKey,
			fileName: file.name,
			mimeType: file.type || "application/octet-stream",
			size: file.size,
		};
	}

	async function handleSave() {
		if (saving || loading || !canSave) return;
		if (isEditMode && !projectId) return;

		const prepared = sanitizeProjectPayload({
			...form,
			clientDisplayName:
				normalizeString(form.clientDisplayName) ||
				normalizeString(selectedOrganization?.label) ||
				"",
			clientEmail:
				normalizeString(form.clientEmail) ||
				normalizeString(selectedOrganization?.email) ||
				"",
		});

		try {
			setSaving(true);

			const response = await fetch(
				isEditMode
					? `/api/admin/projects/${projectId}`
					: "/api/admin/projects",
				{
					method: isEditMode ? "PUT" : "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(prepared),
				},
			);

			const json = (await response.json().catch(() => null)) as
				| ProjectSaveResponse
				| null;

			if (!response.ok || !json || !json.ok) {
				const detailText =
					json &&
						!json.ok &&
						Array.isArray(json.details) &&
						json.details.length > 0
						? ` ${json.details.join(" ")}`
						: "";

				toastRef.current.error(
					json && !json.ok
						? `${json.error}${detailText}`.trim()
						: t.genericError,
				);

				return;
			}

			const entity = json.item ?? json.data;

			if (!entity) {
				toastRef.current.error(t.genericError);
				return;
			}

			const normalizedSaved = sanitizeProjectPayload(
				normalizeProjectEntity(entity),
			);

			setForm(normalizedSaved);
			setInitialSnapshot(serializeForm(normalizedSaved));

			toastRef.current.success(isEditMode ? t.updatedOk : t.createdOk);

			if (isCreateMode) {
				router.push("/admin/dashboard/projects");
			}
		} finally {
			setSaving(false);
		}
	}

	function requestBack() {
		if (hasChanges && !saving) {
			setShowUnsaved(true);
			return;
		}

		router.push("/admin/dashboard/projects");
	}

	function addDocument() {
		patch("documents", [
			...form.documents,
			{
				...createEmptyDocumentLink(),
				sortOrder: form.documents.length,
			},
		]);
	}

	function removeDocument(index: number) {
		patch(
			"documents",
			form.documents
				.filter((_, itemIndex) => itemIndex !== index)
				.map((item, itemIndex) => ({
					...item,
					sortOrder: itemIndex,
				})),
		);
	}

	function patchDocument<K extends keyof ProjectDocumentLink>(
		index: number,
		key: K,
		value: ProjectDocumentLink[K],
	) {
		patch(
			"documents",
			form.documents.map((item, itemIndex) =>
				itemIndex === index ? { ...item, [key]: value } : item,
			),
		);
	}

	async function handleDocumentFileSelected(
		index: number,
		file: File | null,
	): Promise<void> {
		if (!file) return;

		try {
			setUploadingDocumentIndex(index);

			const uploaded = await uploadProjectDocument(file);

			patch(
				"documents",
				form.documents.map((item, itemIndex) => {
					if (itemIndex !== index) return item;

					const nextTitle = item.title.trim()
						? item.title
						: inferTitleFromFileName(uploaded.fileName);

					return {
						...item,
						title: nextTitle,
						fileName: uploaded.fileName,
						fileUrl: uploaded.fileUrl,
						storageKey: uploaded.storageKey,
						mimeType: uploaded.mimeType,
						size: uploaded.size,
						documentDate: item.documentDate ?? new Date().toISOString(),
					};
				}),
			);
		} catch (error) {
			toastRef.current.error(
				error instanceof Error ? error.message : t.uploadError,
			);
		} finally {
			setUploadingDocumentIndex(null);
		}
	}

	const projectStatusTone = getProjectStatusTone(form.status);
	const projectStatusLabel = getProjectStatusLabel(form.status, safeLocale);

	return (
		<div className="space-y-6 pb-24">
			<section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
				<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
					<div className="min-w-0">
						<button
							type="button"
							onClick={requestBack}
							className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:bg-surface-soft"
						>
							<ArrowLeft className="h-4 w-4" />
							{t.back}
						</button>

						<div className="flex flex-wrap items-center gap-3">
							<h2 className="text-xl font-semibold text-text-primary">
								{t.pageTitle}
							</h2>

							<span
								className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClasses(
									projectStatusTone,
								)}`}
							>
								{projectStatusLabel}
							</span>
						</div>

						<p className="mt-2 max-w-3xl text-sm text-text-secondary">
							{t.subtitle}
						</p>
					</div>

					<div className="flex flex-wrap gap-3 xl:justify-end">
						<GlobalButton
							variant="primary"
							size="sm"
							className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
							disabled={!canSave}
							onClick={() => void handleSave()}
						>
							{saving ? t.saving : t.save}
						</GlobalButton>

						<GlobalButton
							variant="secondary"
							size="sm"
							className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
							onClick={requestBack}
						>
							{t.cancel}
						</GlobalButton>
					</div>
				</div>
			</section>

			{loading ? (
				<section className="rounded-2xl border border-border bg-surface-soft p-5 shadow-sm">
					<p className="text-sm text-text-secondary">{t.loadingProject}</p>
				</section>
			) : (
				<>
					<SectionCard title={t.identity} subtitle={t.identityNote}>
						<div className="space-y-5">
							<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
								<div>
									<FieldLabel>Slug</FieldLabel>
									<div className="flex gap-2">
										<input
											value={form.slug}
											onBlur={() => patch("slug", slugify(form.slug))}
											onChange={(event) =>
												patch("slug", slugify(event.currentTarget.value))
											}
											className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
										/>

										<button
											type="button"
											onClick={() =>
												patch(
													"slug",
													slugify(form.title.es || form.title.en || form.slug),
												)
											}
											className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-text-primary hover:bg-surface-soft"
										>
											{safeLocale === "es" ? "Generar" : "Generate"}
										</button>
									</div>
								</div>

								<div>
									<FieldLabel>
										{safeLocale === "es" ? "Organización" : "Organization"}
									</FieldLabel>

									<select
										value={form.primaryClientId || ""}
										onChange={(event) => {
											const nextId = event.currentTarget.value;
											const selected =
												organizations.find((item) => item.id === nextId) ?? null;

											patch("primaryClientId", nextId);
											patch(
												"clientDisplayName",
												selected?.label || form.clientDisplayName || "",
											);
											patch(
												"clientEmail",
												selected?.email || form.clientEmail || "",
											);
										}}
										className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									>
										<option value="">
											{safeLocale === "es"
												? "Seleccionar organización"
												: "Select organization"}
										</option>

										{organizations.map((item) => (
											<option key={item.id} value={item.id}>
												{item.label}
											</option>
										))}
									</select>

									{organizationsLoading ? (
										<p className="mt-1.5 text-xs text-text-muted">
											{safeLocale === "es"
												? "Cargando organizaciones..."
												: "Loading organizations..."}
										</p>
									) : organizationsError ? (
										<p className="mt-1.5 text-xs text-status-error">
											{organizationsError}
										</p>
									) : selectedOrganization ? (
										<p className="mt-1.5 text-xs text-text-muted">
											{selectedOrganization.email || selectedOrganization.id}
										</p>
									) : null}
								</div>
							</div>

							<div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
								<div>
									<FieldLabel>{t.contractStartDate}</FieldLabel>
									<input
										type="date"
										value={toDateInputValue(form.contractStartDate)}
										onChange={(event) =>
											patch(
												"contractStartDate",
												toNullableIsoDate(event.currentTarget.value),
											)
										}
										className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									/>
								</div>

								<div>
									<FieldLabel>{t.contractDurationMonths}</FieldLabel>
									<input
										type="number"
										min={1}
										value={form.contractDurationMonths ?? ""}
										onChange={(event) =>
											patch(
												"contractDurationMonths",
												toNullableNumber(event.currentTarget.value),
											)
										}
										className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									/>
								</div>

								<div>
									<FieldLabel>{t.contractEndDate}</FieldLabel>
									<input
										type="date"
										value={toDateInputValue(form.contractEndDate)}
										disabled
										className="w-full rounded-xl border border-border bg-surface-soft px-3 py-2.5 text-sm text-text-muted outline-none"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
								<div>
									<FieldLabel>Título (ES)</FieldLabel>
									<input
										value={form.title.es}
										onChange={(event) =>
											patch("title", {
												...form.title,
												es: event.currentTarget.value,
											})
										}
										className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									/>
								</div>

								<div>
									<FieldLabel>Title (EN)</FieldLabel>
									<input
										value={form.title.en}
										onChange={(event) =>
											patch("title", {
												...form.title,
												en: event.currentTarget.value,
											})
										}
										className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
								<div>
									<FieldLabel>Resumen (ES)</FieldLabel>
									<textarea
										rows={4}
										value={form.summary.es}
										onChange={(event) =>
											patch("summary", {
												...form.summary,
												es: event.currentTarget.value,
											})
										}
										className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									/>
								</div>

								<div>
									<FieldLabel>Summary (EN)</FieldLabel>
									<textarea
										rows={4}
										value={form.summary.en}
										onChange={(event) =>
											patch("summary", {
												...form.summary,
												en: event.currentTarget.value,
											})
										}
										className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									/>
								</div>
							</div>
						</div>
					</SectionCard>

					<SectionCard title={t.description} subtitle={t.descriptionNote}>
						<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
							<div>
								<FieldLabel>Descripción (ES)</FieldLabel>
								<textarea
									rows={9}
									value={form.description.es}
									onChange={(event) =>
										patch("description", {
											...form.description,
											es: event.currentTarget.value,
										})
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<div>
								<FieldLabel>Description (EN)</FieldLabel>
								<textarea
									rows={9}
									value={form.description.en}
									onChange={(event) =>
										patch("description", {
											...form.description,
											en: event.currentTarget.value,
										})
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>
						</div>
					</SectionCard>

					<SectionCard title={t.portalCategory} subtitle={t.portalCategoryNote}>
						<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
							<div>
								<FieldLabel>{t.systemTypeEs}</FieldLabel>
								<input
									value={form.systemType.es}
									onChange={(event) =>
										patch("systemType", {
											...form.systemType,
											es: event.currentTarget.value,
										})
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<div>
								<FieldLabel>{t.systemTypeEn}</FieldLabel>
								<input
									value={form.systemType.en}
									onChange={(event) =>
										patch("systemType", {
											...form.systemType,
											en: event.currentTarget.value,
										})
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<div>
								<FieldLabel>{t.treatedMediumEs}</FieldLabel>
								<input
									value={form.treatedMedium.es}
									onChange={(event) =>
										patch("treatedMedium", {
											...form.treatedMedium,
											es: event.currentTarget.value,
										})
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<div>
								<FieldLabel>{t.treatedMediumEn}</FieldLabel>
								<input
									value={form.treatedMedium.en}
									onChange={(event) =>
										patch("treatedMedium", {
											...form.treatedMedium,
											en: event.currentTarget.value,
										})
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<div>
								<FieldLabel hint={t.technologyUsedHint}>
									{t.technologyUsedEs}
								</FieldLabel>
								<input
									value={
										Array.isArray(form.technologyUsed?.es)
											? form.technologyUsed.es.join(", ")
											: ""
									}
									onChange={(event) =>
										patch("technologyUsed", {
											es: parseCommaSeparatedValues(event.currentTarget.value),
											en: Array.isArray(form.technologyUsed?.en)
												? form.technologyUsed.en
												: [],
										})
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<div>
								<FieldLabel hint={t.technologyUsedHint}>
									{t.technologyUsedEn}
								</FieldLabel>
								<input
									value={
										Array.isArray(form.technologyUsed?.en)
											? form.technologyUsed.en.join(", ")
											: ""
									}
									onChange={(event) =>
										patch("technologyUsed", {
											es: Array.isArray(form.technologyUsed?.es)
												? form.technologyUsed.es
												: [],
											en: parseCommaSeparatedValues(event.currentTarget.value),
										})
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<div className="xl:col-span-2 rounded-2xl border border-border bg-surface px-4 py-4">
								<p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
									{safeLocale === "es"
										? "Resolución visible en portal"
										: "Portal visible resolution"}
								</p>

								<p className="mt-2 text-sm text-text-secondary">
									{safeLocale === "es"
										? "El portal resuelve la categoría visible por idioma usando este orden: tipo de sistema, medio tratado y primera tecnología disponible."
										: "The portal resolves the visible category by locale using this order: system type, treated medium, and first available technology."}
								</p>

								<div className="mt-4 grid gap-4 xl:grid-cols-2">
									<div className="rounded-xl border border-border bg-white px-4 py-4">
										<p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
											Español
										</p>

										<div className="mt-3 flex flex-wrap gap-2">
											{form.systemType.es.trim() ? (
												<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary">
													{`Sistema: ${form.systemType.es.trim()}`}
												</span>
											) : null}

											{form.treatedMedium.es.trim() ? (
												<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary">
													{`Medio: ${form.treatedMedium.es.trim()}`}
												</span>
											) : null}

											{form.technologyUsed.es.map((technology) => (
												<span
													key={`es-${technology}`}
													className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary"
												>
													{technology}
												</span>
											))}
										</div>
									</div>

									<div className="rounded-xl border border-border bg-white px-4 py-4">
										<p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
											English
										</p>

										<div className="mt-3 flex flex-wrap gap-2">
											{form.systemType.en.trim() ? (
												<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary">
													{`System: ${form.systemType.en.trim()}`}
												</span>
											) : null}

											{form.treatedMedium.en.trim() ? (
												<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary">
													{`Medium: ${form.treatedMedium.en.trim()}`}
												</span>
											) : null}

											{form.technologyUsed.en.map((technology) => (
												<span
													key={`en-${technology}`}
													className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-primary"
												>
													{technology}
												</span>
											))}
										</div>
									</div>
								</div>
							</div>
						</div>
					</SectionCard>

					<SectionCard title={t.media} subtitle={t.mediaNote}>
						<div className="grid gap-6 xl:grid-cols-2">
							<ProjectImageUploader
								label={safeLocale === "es" ? "Portada principal" : "Main cover"}
								value={form.coverImage}
								onChange={(nextValue: ProjectImage | null) =>
									patch("coverImage", nextValue)
								}
								onUpload={(file) => uploadProjectAsset(file, "projects/covers")}
							/>

							<ProjectGalleryUploader
								label={safeLocale === "es" ? "Galería" : "Gallery"}
								value={form.gallery}
								onChange={(nextValue: ProjectImage[]) =>
									patch("gallery", nextValue)
								}
								onUpload={(file) => uploadProjectAsset(file, "projects/gallery")}
							/>
						</div>
					</SectionCard>

					<SectionCard title={t.publication} subtitle={t.publicationNote}>
						<div className="space-y-4">
							<div className="flex flex-wrap gap-3">
								<label className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
									<input
										type="checkbox"
										checked={form.publicSiteSettings.enabled}
										onChange={(event) =>
											patch("publicSiteSettings", {
												...form.publicSiteSettings,
												enabled: event.currentTarget.checked,
											})
										}
										className="h-4 w-4"
									/>
									<span>
										{safeLocale === "es"
											? "Este proyecto podrá mostrarse en el sitio público"
											: "This project can be shown on the public website"}
									</span>
								</label>

								<label className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
									<input
										type="checkbox"
										checked={form.featured}
										onChange={(event) =>
											patch("featured", event.currentTarget.checked)
										}
										className="h-4 w-4"
									/>
									<span>
										{safeLocale === "es"
											? "Marcar como proyecto destacado"
											: "Mark as featured project"}
									</span>
								</label>
							</div>

							{form.publicSiteSettings.enabled ? (
								<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
									<p className="text-sm font-semibold text-emerald-700">
										{safeLocale === "es"
											? "Contenido público habilitado"
											: "Public content enabled"}
									</p>

									<div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
										{[
											[
												"showTitle",
												safeLocale === "es"
													? "Nombre del proyecto"
													: "Project name",
											],
											[
												"showSummary",
												safeLocale === "es" ? "Resumen" : "Summary",
											],
											[
												"showCoverImage",
												safeLocale === "es" ? "Portada" : "Cover image",
											],
											[
												"showGallery",
												safeLocale === "es" ? "Galería" : "Gallery",
											],
										].map(([key, label]) => (
											<label
												key={key}
												className="inline-flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-800"
											>
												<input
													type="checkbox"
													checked={Boolean(
														form.publicSiteSettings[
														key as keyof typeof form.publicSiteSettings
														],
													)}
													onChange={(event) =>
														patch("publicSiteSettings", {
															...form.publicSiteSettings,
															[key]: event.currentTarget.checked,
														})
													}
													className="h-4 w-4"
												/>
												<span>{label}</span>
											</label>
										))}
									</div>

									<p className="mt-3 text-xs text-emerald-700">
										{safeLocale === "es"
											? "Esta versión pública no expone descripción larga, organización, documentos internos ni mantenimientos."
											: "This public version does not expose long description, organization, internal documents or maintenance data."}
									</p>
								</div>
							) : (
								<div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
									{safeLocale === "es"
										? "La publicación pública está desactivada."
										: "Public publication is disabled."}
								</div>
							)}
						</div>
					</SectionCard>

					<SectionCard
						title={t.documents}
						subtitle={t.documentsNote}
						actions={
							<GlobalButton
								variant="secondary"
								size="sm"
								className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
								onClick={addDocument}
							>
								{t.addDocument}
							</GlobalButton>
						}
					>
						<div className="space-y-4">
							{form.documents.length === 0 ? (
								<div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
									{t.noDocuments}
								</div>
							) : (
								form.documents.map((item, index) => {
									const isUploadingThisDocument =
										uploadingDocumentIndex === index;

									const resolvedDocumentHref = resolveStoredFileUrl(
										item.fileUrl,
										item.storageKey,
									);

									return (
										<div
											key={item.documentId}
											className="rounded-2xl border border-border bg-surface p-4"
										>
											<div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
												<div className="min-w-0">
													<p className="text-sm font-semibold text-text-primary">
														{safeLocale === "es"
															? `Documento #${index + 1}`
															: `Document #${index + 1}`}
													</p>
													<p className="mt-1 text-xs text-text-muted">
														{item.title ||
															(safeLocale === "es" ? "Sin título" : "Untitled")}
													</p>
												</div>

												<button
													type="button"
													onClick={() => removeDocument(index)}
													className="rounded-xl border border-status-error bg-surface px-3 py-2 text-xs text-status-error hover:bg-surface-soft"
												>
													{t.remove}
												</button>
											</div>

											<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
												<div className="xl:col-span-2 rounded-xl border border-border bg-surface-soft p-4">
													<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
														<div className="min-w-0">
															<p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted">
																{t.currentFile}
															</p>
															<div className="mt-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary">
																{item.fileName ||
																	item.storageKey ||
																	item.fileUrl ||
																	t.noFileLoaded}
															</div>
														</div>

														<div className="flex flex-wrap gap-2">
															<label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
																<input
																	type="file"
																	accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.svg"
																	className="hidden"
																	disabled={isUploadingThisDocument}
																	onChange={async (event) => {
																		const input = event.currentTarget;
																		const file = input.files?.[0] ?? null;

																		try {
																			await handleDocumentFileSelected(index, file);
																		} finally {
																			input.value = "";
																		}
																	}}
																/>
																{isUploadingThisDocument
																	? t.saving
																	: item.fileUrl || item.storageKey
																		? t.replaceDocument
																		: t.uploadDocument}
															</label>

															{resolvedDocumentHref ? (
																<a
																	href={resolvedDocumentHref}
																	target="_blank"
																	rel="noreferrer"
																	className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft"
																>
																	{t.openDocument}
																</a>
															) : null}
														</div>
													</div>
												</div>

												<div>
													<FieldLabel>
														{safeLocale === "es" ? "Título" : "Title"}
													</FieldLabel>
													<input
														value={item.title}
														onChange={(event) =>
															patchDocument(
																index,
																"title",
																event.currentTarget.value,
															)
														}
														className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
													/>
												</div>

												<div>
													<FieldLabel>
														{safeLocale === "es"
															? "Tipo documental"
															: "Document type"}
													</FieldLabel>
													<select
														value={item.documentType}
														onChange={(event) =>
															patchDocument(
																index,
																"documentType",
																event.currentTarget.value as ProjectDocumentType,
															)
														}
														className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
													>
														{(
															[
																"contract",
																"planning",
																"schedule",
																"technical_design",
																"plan",
																"technical_report",
																"technical_sheet",
																"operation_manual",
																"maintenance_manual",
																"inspection_report",
																"maintenance_report",
																"delivery_record",
																"certificate",
																"warranty",
																"invoice",
																"permit",
																"photo_evidence",
																"other",
															] as ProjectDocumentType[]
														).map((option) => (
															<option key={option} value={option}>
																{resolveDocumentTypeLabel(option, safeLocale)}
															</option>
														))}
													</select>
												</div>

												<div>
													<FieldLabel>
														{safeLocale === "es" ? "Visibilidad" : "Visibility"}
													</FieldLabel>
													<select
														value={item.visibility}
														onChange={(event) =>
															patchDocument(
																index,
																"visibility",
																event.currentTarget
																	.value as ProjectDocumentVisibility,
															)
														}
														className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
													>
														<option value="public">
															{safeLocale === "es" ? "Público" : "Public"}
														</option>
														<option value="private">
															{safeLocale === "es" ? "Privado" : "Private"}
														</option>
														<option value="internal">
															{safeLocale === "es" ? "Interno" : "Internal"}
														</option>
													</select>
												</div>

												<div>
													<FieldLabel>
														{safeLocale === "es" ? "Idioma" : "Language"}
													</FieldLabel>
													<select
														value={item.language}
														onChange={(event) =>
															patchDocument(
																index,
																"language",
																event.currentTarget
																	.value as ProjectDocumentLink["language"],
															)
														}
														className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
													>
														<option value="none">
															{safeLocale === "es" ? "No aplica" : "N/A"}
														</option>
														<option value="es">ES</option>
														<option value="en">EN</option>
														<option value="both">
															{safeLocale === "es" ? "Ambos" : "Both"}
														</option>
													</select>
												</div>

												<div>
													<FieldLabel>
														{safeLocale === "es"
															? "Fecha del documento"
															: "Document date"}
													</FieldLabel>
													<input
														type="date"
														value={toDateInputValue(item.documentDate)}
														onChange={(event) =>
															patchDocument(
																index,
																"documentDate",
																toNullableIsoDate(event.currentTarget.value),
															)
														}
														className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
													/>
												</div>

												<div>
													<FieldLabel>
														{safeLocale === "es" ? "Versión" : "Version"}
													</FieldLabel>
													<input
														value={item.version}
														onChange={(event) =>
															patchDocument(
																index,
																"version",
																event.currentTarget.value,
															)
														}
														className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
													/>
												</div>

												<div className="xl:col-span-2">
													<FieldLabel>
														{safeLocale === "es" ? "Descripción" : "Description"}
													</FieldLabel>
													<textarea
														rows={3}
														value={item.description}
														onChange={(event) =>
															patchDocument(
																index,
																"description",
																event.currentTarget.value,
															)
														}
														className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
													/>
												</div>

												<div className="xl:col-span-2 grid grid-cols-1 gap-3 md:grid-cols-3">
													<label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary">
														<input
															type="checkbox"
															checked={item.visibleInPortal}
															onChange={(event) =>
																patchDocument(
																	index,
																	"visibleInPortal",
																	event.currentTarget.checked,
																)
															}
															className="h-4 w-4"
														/>
														<span>
															{safeLocale === "es"
																? "Visible en portal"
																: "Visible in portal"}
														</span>
													</label>

													<label
														className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${form.publicSiteSettings.enabled
																? "border-border bg-surface-soft text-text-primary"
																: "border-border bg-surface text-text-muted opacity-60"
															}`}
													>
														<input
															type="checkbox"
															checked={item.visibleInPublicSite}
															disabled={!form.publicSiteSettings.enabled}
															onChange={(event) => {
																const checked = event.currentTarget.checked;

																patch(
																	"documents",
																	form.documents.map((doc, docIndex) =>
																		docIndex === index
																			? {
																				...doc,
																				visibleInPublicSite: checked,
																				isPublic: checked,
																			}
																			: doc,
																	),
																);
															}}
															className="h-4 w-4"
														/>
														<span>
															{safeLocale === "es"
																? "Visible en sitio público"
																: "Visible in public site"}
														</span>
													</label>

													<label className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2 text-sm text-text-primary">
														<input
															type="checkbox"
															checked={item.isCritical}
															onChange={(event) =>
																patchDocument(
																	index,
																	"isCritical",
																	event.currentTarget.checked,
																)
															}
															className="h-4 w-4"
														/>
														<span>
															{safeLocale === "es"
																? "Documento crítico"
																: "Critical document"}
														</span>
													</label>
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>
					</SectionCard>

					<SectionCard title={t.notes} subtitle={t.notesNote}>
						<div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
							<div>
								<FieldLabel>
									{safeLocale === "es" ? "Ubicación" : "Location"}
								</FieldLabel>
								<input
									value={form.locationLabel}
									onChange={(event) =>
										patch("locationLabel", event.currentTarget.value)
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<label className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
								<input
									type="checkbox"
									checked={form.isPublicLocationVisible}
									onChange={(event) =>
										patch("isPublicLocationVisible", event.currentTarget.checked)
									}
									className="h-4 w-4"
								/>
								<span>
									{safeLocale === "es"
										? "Mostrar ubicación públicamente"
										: "Show location publicly"}
								</span>
							</label>

							<div>
								<FieldLabel>
									{safeLocale === "es" ? "Notas operativas" : "Operational notes"}
								</FieldLabel>
								<textarea
									rows={5}
									value={form.operationalNotes}
									onChange={(event) =>
										patch("operationalNotes", event.currentTarget.value)
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>

							<div>
								<FieldLabel>
									{safeLocale === "es" ? "Notas internas" : "Internal notes"}
								</FieldLabel>
								<textarea
									rows={5}
									value={form.internalNotes}
									onChange={(event) =>
										patch("internalNotes", event.currentTarget.value)
									}
									className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								/>
							</div>
						</div>
					</SectionCard>

					<SectionCard title={t.legacyMaintenance} subtitle={t.legacyMaintenanceNote}>
						{form.maintenanceItems.length === 0 ? (
							<div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-muted">
								{t.noMaintenance}
							</div>
						) : (
							<div className="space-y-3">
								{form.maintenanceItems.map((item, index) => (
									<div
										key={`legacy-maintenance-${index}`}
										className="rounded-2xl border border-border bg-surface p-4"
									>
										<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
											<div>
												<p className="text-sm font-semibold text-text-primary">
													{item.title ||
														(safeLocale === "es"
															? `Mantenimiento #${index + 1}`
															: `Maintenance #${index + 1}`)}
												</p>
												<p className="mt-1 text-xs text-text-muted">
													{item.description}
												</p>
											</div>

											<span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs text-text-secondary">
												{item.status}
											</span>
										</div>

										<div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
											<span className="rounded-full border border-border bg-surface-soft px-3 py-1">
												{safeLocale === "es" ? "Frecuencia:" : "Frequency:"}{" "}
												{item.frequencyValue ?? "—"} {item.frequencyUnit}
											</span>
											<span className="rounded-full border border-border bg-surface-soft px-3 py-1">
												{safeLocale === "es" ? "Próximo:" : "Next:"}{" "}
												{formatHumanDate(item.nextDueDate, safeLocale)}
											</span>
											<span className="rounded-full border border-border bg-surface-soft px-3 py-1">
												Schedule: {item.schedule.length}
											</span>
											<span className="rounded-full border border-border bg-surface-soft px-3 py-1">
												Attachments: {item.attachments.length}
											</span>
										</div>
									</div>
								))}
							</div>
						)}
					</SectionCard>
				</>
			)}

			<div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-xl">
				<span className="text-xs font-semibold text-text-secondary">
					{projectStatusLabel}
				</span>

				<GlobalButton
					variant="primary"
					size="sm"
					className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
					disabled={!canSave}
					onClick={() => void handleSave()}
				>
					{saving ? t.saving : t.save}
					<ArrowRight className="h-4 w-4" />
				</GlobalButton>
			</div>

			<GlobalConfirm
				open={showUnsaved}
				title={t.unsavedTitle}
				message={t.unsavedMessage}
				cancelLabel={t.unsavedCancel}
				confirmLabel={t.unsavedConfirm}
				loading={false}
				onCancel={() => setShowUnsaved(false)}
				onConfirm={() => {
					setShowUnsaved(false);
					router.push("/admin/dashboard/projects");
				}}
			/>
		</div>
	);
}