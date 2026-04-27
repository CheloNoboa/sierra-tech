"use client";

/**
 * =============================================================================
 * 📄 Component: ServiceFormPage
 * Path: src/components/services/ServiceFormPage.tsx
 * =============================================================================
 *
 * ES:
 * Formulario administrativo unificado para la gestión completa de servicios
 * del sitio público de Sierra Tech.
 *
 * -----------------------------------------------------------------------------
 * 🎯 PROPÓSITO
 * -----------------------------------------------------------------------------
 * Centralizar en una sola pantalla toda la lógica de creación y edición de
 * servicios, garantizando consistencia visual, funcional y de contrato con API.
 *
 * Este componente reemplaza cualquier implementación basada en modales o
 * formularios fragmentados, estableciendo un flujo claro, escalable y mantenible.
 *
 * -----------------------------------------------------------------------------
 * 🧠 DECISIÓN ARQUITECTURAL CLAVE
 * -----------------------------------------------------------------------------
 * Unificación total de flujos:
 *
 * - mode="create" → crea servicio
 * - mode="edit"   → edita servicio existente
 *
 * Ambos flujos comparten:
 * - misma UI
 * - mismo estado
 * - misma validación
 * - mismo payload base
 *
 * 👉 Esto elimina duplicación, reduce errores y asegura coherencia en UX.
 *
 * -----------------------------------------------------------------------------
 * 🔌 INTEGRACIÓN CON API
 * -----------------------------------------------------------------------------
 * - CREATE → POST   /api/admin/services
 * - UPDATE → PUT    /api/admin/services/[id]
 * - READ   → GET    /api/admin/services/[id]
 *
 * El componente NO asume estructura perfecta del backend:
 * → siempre normaliza datos antes de usarlos (defensive programming)
 *
 * -----------------------------------------------------------------------------
 * 🧱 ESTRUCTURA DEL FORMULARIO
 * -----------------------------------------------------------------------------
 * El formulario está dividido en bloques funcionales independientes:
 *
 * 1. Identidad del servicio
 *    - título (ES/EN)
 *    - slug
 *    - categoría
 *    - orden
 *    - estado (draft/published)
 *    - destacado
 *
 * 2. Contenido principal
 *    - summary (ES/EN)
 *    - description (ES/EN)
 *    - cover image (R2)
 *
 * 3. Galería
 *    - múltiples imágenes
 *    - orden manual (reordenamiento)
 *    - alt bilingüe
 *
 * 4. Especificaciones técnicas
 *    - estructura tipada (NO libre)
 *    - contenido bilingüe
 *
 * 5. Documentos relacionados
 *    - integración con Document Library
 *    - referencias por documentId
 *
 * 6. SEO
 *    - meta title / description (ES/EN)
 *    - imagen SEO manual
 *    - generación automática vía API
 *
 * -----------------------------------------------------------------------------
 * 📦 MANEJO DE ESTADO
 * -----------------------------------------------------------------------------
 * - form      → estado editable actual
 * - snapshot  → estado persistido (baseline)
 *
 * 👉 Comparación:
 * serialize(form) !== snapshot → hay cambios
 *
 * Beneficios:
 * - detección precisa de cambios
 * - prevención de pérdida de datos
 * - control real de botón "Guardar"
 *
 * -----------------------------------------------------------------------------
 * ⚠️ PROTECCIÓN DE CAMBIOS
 * -----------------------------------------------------------------------------
 * - beforeunload → evita cerrar pestaña con cambios
 * - GlobalConfirm → evita salir accidentalmente
 *
 * 👉 Regla: nunca perder datos silenciosamente
 *
 * -----------------------------------------------------------------------------
 * 🖼️ MANEJO DE ARCHIVOS (R2)
 * -----------------------------------------------------------------------------
 * Toda subida se hace vía:
 * → uploadAdminFile()
 *
 * Tipos:
 * - cover image
 * - gallery images
 * - SEO image
 *
 * Decisión:
 * - el formulario SOLO guarda fileKey
 * - la resolución real se hace con resolveAssetUrl()
 *
 * 👉 Esto desacopla UI de infraestructura de almacenamiento
 *
 * -----------------------------------------------------------------------------
 * ⚙️ GENERACIÓN AUTOMÁTICA SEO
 * -----------------------------------------------------------------------------
 * Endpoint:
 * → POST /api/admin/services/generate-seo
 *
 * Inputs:
 * - title
 * - summary
 * - category
 * - coverImage
 *
 * Output:
 * - previewUrl (R2 protegido)
 *
 * Comportamiento:
 * - llena automáticamente form.seo.image
 * - puede ser reemplazado manualmente
 *
 * 👉 Regla: automático + override manual siempre permitido
 *
 * -----------------------------------------------------------------------------
 * 🧼 NORMALIZACIÓN DE DATOS
 * -----------------------------------------------------------------------------
 * Función central:
 * → normalizeService()
 *
 * Objetivo:
 * - evitar nulls
 * - evitar tipos incorrectos
 * - garantizar estructura estable del form
 *
 * 👉 Nunca confiar en el backend directamente
 *
 * -----------------------------------------------------------------------------
 * 🧩 PAYLOAD FINAL
 * -----------------------------------------------------------------------------
 * buildPayload():
 *
 * - genera slug si no existe
 * - limpia strings
 * - elimina gallery inválida
 * - asegura orden correcto
 * - limpia attachments
 *
 * 👉 El payload siempre sale consistente y listo para persistencia
 *
 * -----------------------------------------------------------------------------
 * 🎨 UX / DISEÑO
 * -----------------------------------------------------------------------------
 * - layout basado en bloques (SectionCard)
 * - sin modales → pantalla completa (consistencia con Maintenance)
 * - acciones globales en header (FormActionsHeader)
 * - feedback inmediato (toast)
 * - estados visuales claros:
 *   - loading
 *   - saving
 *   - uploading
 *   - generating
 *
 * 👉 Diseño orientado a claridad operativa, no decoración
 *
 * -----------------------------------------------------------------------------
 * 🚫 RESTRICCIONES (IMPORTANTES)
 * -----------------------------------------------------------------------------
 * - NO usar any
 * - NO usar alert()
 * - NO usar window.confirm()
 * - NO duplicar lógica create/edit
 * - NO confiar en estructura backend sin normalizar
 *
 * -----------------------------------------------------------------------------
 * 🧭 FILOSOFÍA DEL COMPONENTE
 * -----------------------------------------------------------------------------
 * Este componente define el patrón oficial para formularios administrativos:
 *
 * ✔ unificado
 * ✔ tipado
 * ✔ predecible
 * ✔ extensible
 * ✔ desacoplado del backend
 *
 * 👉 Este mismo patrón debe replicarse en:
 * - Projects
 * - Maintenance
 * - Blog
 * - cualquier módulo futuro
 *
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	BriefcaseBusiness,
	FileText,
	Image as ImageIcon,
	Plus,
	Save,
	SearchCheck,
	Settings2,
	Star,
	Trash2,
	Loader2,
} from "lucide-react";

import DocumentAttachmentSelector, {
	type ServiceAttachmentItem,
} from "@/components/admin/documents/DocumentAttachmentSelector";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";
import {
	uploadAdminFile,
	type UploadedAdminFile,
} from "@/lib/adminUploadsClient";
import { resolveAssetUrl } from "@/lib/resolveAssetUrl";
import FormActionsHeader from "@/components/ui/FormActionsHeader";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type ServiceStatus = "draft" | "published";
type ServiceFormMode = "create" | "edit";

interface LocalizedText {
	es: string;
	en: string;
}

interface ServiceGalleryItem {
	url: string;
	alt: LocalizedText;
	order: number;
}

interface ServiceSeo {
	metaTitle: LocalizedText;
	metaDescription: LocalizedText;
	image: string;
}

interface ServiceTechnicalSpecs {
	capacity: LocalizedText;
	flowRate: LocalizedText;
	material: LocalizedText;
	application: LocalizedText;
	technology: LocalizedText;
}

type ServiceAttachmentRef = ServiceAttachmentItem;

interface ServicePayload {
	title: LocalizedText;
	slug: string;
	category: string;
	summary: LocalizedText;
	description: LocalizedText;
	coverImage: string;
	gallery: ServiceGalleryItem[];
	technicalSpecs: ServiceTechnicalSpecs;
	order: number;
	featured: boolean;
	status: ServiceStatus;
	seo: ServiceSeo;
	attachments: ServiceAttachmentRef[];
	createdAt?: string;
	updatedAt?: string;
	updatedBy?: string;
	updatedByEmail?: string;
}

interface ServiceFormPageProps {
	mode: ServiceFormMode;
	serviceId?: string;
}

type ServiceSaveResponse =
	| {
		_id?: string;
		id?: string;
	}
	| {
		ok?: boolean;
		data?: {
			_id?: string;
			id?: string;
		};
		item?: {
			_id?: string;
			id?: string;
		};
		error?: string;
		error_es?: string;
		error_en?: string;
	};

interface GenerateSeoResponse {
	ok: boolean;
	data?: {
		fileKey: string;
		fileName: string;
		extension: string;
		previewUrl: string;
	};
	message?: string;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = { es: "", en: "" };

const SERVICE_DEFAULTS: ServicePayload = {
	title: { es: "", en: "" },
	slug: "",
	category: "",
	summary: { es: "", en: "" },
	description: { es: "", en: "" },
	coverImage: "",
	gallery: [],
	technicalSpecs: {
		capacity: { es: "", en: "" },
		flowRate: { es: "", en: "" },
		material: { es: "", en: "" },
		application: { es: "", en: "" },
		technology: { es: "", en: "" },
	},
	order: 1,
	featured: false,
	status: "draft",
	seo: {
		metaTitle: { es: "", en: "" },
		metaDescription: { es: "", en: "" },
		image: "",
	},
	attachments: [],
	createdAt: "",
	updatedAt: "",
	updatedBy: "",
	updatedByEmail: "",
};

const SERVICE_CATEGORIES = [
	"tratamiento-agua",
	"control-olores",
	"biorremediacion",
	"energia-solar",
	"procesos-microbiologicos",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLocalizedText(
	value: unknown,
	fallback: LocalizedText = EMPTY_LOCALIZED_TEXT,
): LocalizedText {
	if (!value || typeof value !== "object") return fallback;

	const record = value as Record<string, unknown>;

	return {
		es: normalizeString(record.es, fallback.es),
		en: normalizeString(record.en, fallback.en),
	};
}

function normalizeGallery(value: unknown): ServiceGalleryItem[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item, index): ServiceGalleryItem | null => {
			if (!item || typeof item !== "object") return null;

			const record = item as Record<string, unknown>;

			return {
				url: normalizeString(record.url),
				alt: normalizeLocalizedText(record.alt),
				order: Math.max(1, normalizeNumber(record.order, index + 1)),
			};
		})
		.filter((item): item is ServiceGalleryItem => item !== null)
		.sort((a, b) => a.order - b.order)
		.map((item, index) => ({
			...item,
			order: index + 1,
		}));
}

function normalizeAttachments(value: unknown): ServiceAttachmentRef[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item): ServiceAttachmentRef | null => {
			if (!item || typeof item !== "object") return null;

			const record = item as Record<string, unknown>;

			return {
				documentId: normalizeString(record.documentId),
				title: normalizeString(record.title),
			};
		})
		.filter(
			(item): item is ServiceAttachmentRef =>
				item !== null && item.documentId.trim().length > 0,
		);
}

function normalizeService(value: unknown): ServicePayload {
	if (!value || typeof value !== "object") {
		return structuredClone(SERVICE_DEFAULTS);
	}

	const record = value as Record<string, unknown>;
	const technicalSpecs = (record.technicalSpecs ?? {}) as Record<string, unknown>;
	const seo = (record.seo ?? {}) as Record<string, unknown>;

	return {
		title: normalizeLocalizedText(record.title),
		slug: normalizeString(record.slug),
		category: normalizeString(record.category),
		summary: normalizeLocalizedText(record.summary),
		description: normalizeLocalizedText(record.description),
		coverImage: normalizeString(record.coverImage),
		gallery: normalizeGallery(record.gallery),
		technicalSpecs: {
			capacity: normalizeLocalizedText(technicalSpecs.capacity),
			flowRate: normalizeLocalizedText(technicalSpecs.flowRate),
			material: normalizeLocalizedText(technicalSpecs.material),
			application: normalizeLocalizedText(technicalSpecs.application),
			technology: normalizeLocalizedText(technicalSpecs.technology),
		},
		order: Math.max(1, normalizeNumber(record.order, 1)),
		featured: normalizeBoolean(record.featured, false),
		status: record.status === "published" ? "published" : "draft",
		seo: {
			metaTitle: normalizeLocalizedText(seo.metaTitle),
			metaDescription: normalizeLocalizedText(seo.metaDescription),
			image: normalizeString(seo.image),
		},
		attachments: normalizeAttachments(record.attachments),
		createdAt: normalizeString(record.createdAt),
		updatedAt: normalizeString(record.updatedAt),
		updatedBy: normalizeString(record.updatedBy),
		updatedByEmail: normalizeString(record.updatedByEmail),
	};
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function reorderGallery(items: ServiceGalleryItem[]): ServiceGalleryItem[] {
	return items.map((item, index) => ({
		...item,
		order: index + 1,
	}));
}

function moveGalleryItem(
	items: ServiceGalleryItem[],
	fromIndex: number,
	toIndex: number,
): ServiceGalleryItem[] {
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

	if (!moved) return items;

	clone.splice(toIndex, 0, moved);

	return reorderGallery(clone);
}

function serialize(value: ServicePayload | null): string {
	return JSON.stringify(value);
}

function resolveSavedServiceId(payload: ServiceSaveResponse): string {
	if ("_id" in payload && payload._id) return payload._id;
	if ("id" in payload && payload.id) return payload.id;

	if ("item" in payload && payload.item?._id) return payload.item._id;
	if ("item" in payload && payload.item?.id) return payload.item.id;

	if ("data" in payload && payload.data?._id) return payload.data._id;
	if ("data" in payload && payload.data?.id) return payload.data.id;

	return "";
}

function buildApiErrorMessage(
	payload: ServiceSaveResponse | null,
	lang: Locale,
	fallback: string,
): string {
	if (!payload || typeof payload !== "object") return fallback;

	if ("error_es" in payload && lang === "es" && payload.error_es) {
		return payload.error_es;
	}

	if ("error_en" in payload && lang === "en" && payload.error_en) {
		return payload.error_en;
	}

	if ("error" in payload && payload.error) {
		return payload.error;
	}

	return fallback;
}

/* -------------------------------------------------------------------------- */
/* Small UI                                                                   */
/* -------------------------------------------------------------------------- */

function SectionCard({
	title,
	subtitle,
	icon,
	children,
}: {
	title: string;
	subtitle?: string;
	icon?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
				{icon ? (
					<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
						{icon}
					</div>
				) : null}

				<div>
					<h2 className="text-xl font-bold tracking-tight text-text-primary">
						{title}
					</h2>

					{subtitle ? (
						<p className="mt-1 text-sm leading-7 text-text-secondary">
							{subtitle}
						</p>
					) : null}
				</div>
			</div>

			<div className="space-y-5">{children}</div>
		</section>
	);
}

function FieldLabel({ children }: { children: ReactNode }) {
	return (
		<label className="mb-1.5 block text-sm font-medium text-text-primary">
			{children}
		</label>
	);
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			{...props}
			className={`h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""}`}
		/>
	);
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			{...props}
			className={`min-h-[120px] w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""}`}
		/>
	);
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""}`}
		/>
	);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function ServiceFormPage({
	mode,
	serviceId = "",
}: ServiceFormPageProps) {
	const router = useRouter();
	const toast = useToast();
	const { locale } = useTranslation();

	const lang: Locale = locale === "en" ? "en" : "es";
	const isEditMode = mode === "edit";

	const [form, setForm] = useState<ServicePayload | null>(
		isEditMode ? null : structuredClone(SERVICE_DEFAULTS),
	);
	const [snapshot, setSnapshot] = useState(
		isEditMode ? "" : serialize(SERVICE_DEFAULTS),
	);

	const [loading, setLoading] = useState(isEditMode);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

	const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
	const [uploadingSeoImage, setUploadingSeoImage] = useState(false);
	const [generatingSeoImage, setGeneratingSeoImage] = useState(false);
	const [uploadingGalleryIndex, setUploadingGalleryIndex] = useState<
		number | null
	>(null);

	const hasChanges = useMemo(() => {
		if (!form) return false;
		return serialize(form) !== snapshot;
	}, [form, snapshot]);

	const canSave = useMemo(() => {
		if (!form || loading || saving) return false;

		const hasTitle = Boolean(form.title.es.trim() || form.title.en.trim());

		return hasTitle && hasChanges;
	}, [form, hasChanges, loading, saving]);

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

	useEffect(() => {
		if (!isEditMode) return;

		let cancelled = false;

		async function loadService() {
			if (!serviceId.trim()) {
				setError(lang === "es" ? "Servicio inválido." : "Invalid service.");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError("");
				setSuccess("");

				const response = await fetch(`/api/admin/services/${serviceId}`, {
					method: "GET",
					cache: "no-store",
				});

				const payload: unknown = await response.json().catch(() => null);

				if (cancelled) return;

				if (!response.ok || !payload) {
					setForm(null);
					setSnapshot("");
					setError(
						lang === "es"
							? "No se pudo cargar el servicio."
							: "Service could not be loaded.",
					);
					return;
				}

				const normalized = normalizeService(payload);

				setForm(normalized);
				setSnapshot(serialize(normalized));
			} catch (err) {
				if (cancelled) return;

				setError(
					err instanceof Error
						? err.message
						: lang === "es"
							? "Error de carga."
							: "Loading error.",
				);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void loadService();

		return () => {
			cancelled = true;
		};
	}, [isEditMode, lang, serviceId]);

	const handleBack = useCallback(() => {
		if (hasChanges) {
			setLeaveConfirmOpen(true);
			return;
		}

		router.push("/admin/dashboard/services");
	}, [hasChanges, router]);

	function updateForm(updater: (current: ServicePayload) => ServicePayload): void {
		setForm((current) => {
			if (!current) return current;
			return updater(current);
		});
	}

	function updateLocalizedField(
		field: "title" | "summary" | "description",
		localeKey: Locale,
		value: string,
	): void {
		updateForm((current) => ({
			...current,
			[field]: {
				...current[field],
				[localeKey]: value,
			},
		}));
	}

	function updateTechnicalSpecField(
		field: keyof ServiceTechnicalSpecs,
		localeKey: Locale,
		value: string,
	): void {
		updateForm((current) => ({
			...current,
			technicalSpecs: {
				...current.technicalSpecs,
				[field]: {
					...current.technicalSpecs[field],
					[localeKey]: value,
				},
			},
		}));
	}

	function updateSeoField(
		field: "metaTitle" | "metaDescription",
		localeKey: Locale,
		value: string,
	): void {
		updateForm((current) => ({
			...current,
			seo: {
				...current.seo,
				[field]: {
					...current.seo[field],
					[localeKey]: value,
				},
			},
		}));
	}

	function addGalleryItem(): void {
		updateForm((current) => ({
			...current,
			gallery: [
				...current.gallery,
				{
					url: "",
					alt: { es: "", en: "" },
					order: current.gallery.length + 1,
				},
			],
		}));
	}

	function removeGalleryItem(index: number): void {
		updateForm((current) => ({
			...current,
			gallery: reorderGallery(current.gallery.filter((_, i) => i !== index)),
		}));
	}

	function moveGalleryUp(index: number): void {
		updateForm((current) => ({
			...current,
			gallery: moveGalleryItem(current.gallery, index, index - 1),
		}));
	}

	function moveGalleryDown(index: number): void {
		updateForm((current) => ({
			...current,
			gallery: moveGalleryItem(current.gallery, index, index + 1),
		}));
	}

	function updateGalleryUrl(index: number, value: string): void {
		updateForm((current) => ({
			...current,
			gallery: current.gallery.map((item, i) =>
				i === index ? { ...item, url: value } : item,
			),
		}));
	}

	function updateGalleryAlt(
		index: number,
		localeKey: Locale,
		value: string,
	): void {
		updateForm((current) => ({
			...current,
			gallery: current.gallery.map((item, i) =>
				i === index
					? {
						...item,
						alt: {
							...item.alt,
							[localeKey]: value,
						},
					}
					: item,
			),
		}));
	}

	function buildPayload(current: ServicePayload): ServicePayload {
		return {
			...current,
			slug: slugify(current.slug || current.title.es || current.title.en),
			gallery: reorderGallery(
				current.gallery
					.filter((item) => item.url.trim().length > 0)
					.map((item) => ({
						url: item.url.trim(),
						alt: {
							es: item.alt.es.trim(),
							en: item.alt.en.trim(),
						},
						order: item.order,
					})),
			),
			attachments: current.attachments
				.filter((item) => item.documentId.trim().length > 0)
				.map((item) => ({
					documentId: item.documentId.trim(),
					title: item.title.trim(),
				})),
		};
	}

	async function saveService(): Promise<void> {
		if (!form || !canSave) return;

		try {
			setSaving(true);
			setError("");
			setSuccess("");

			const payload = buildPayload(form);

			const response = await fetch(
				isEditMode ? `/api/admin/services/${serviceId}` : "/api/admin/services",
				{
					method: isEditMode ? "PUT" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				},
			);

			const json = (await response
				.json()
				.catch(() => null)) as ServiceSaveResponse | null;

			if (!response.ok || !json) {
				throw new Error(
					buildApiErrorMessage(
						json,
						lang,
						isEditMode
							? lang === "es"
								? "No se pudo guardar el servicio."
								: "Service could not be saved."
							: lang === "es"
								? "No se pudo crear el servicio."
								: "Service could not be created.",
					),
				);
			}

			const normalized = normalizeService(json);

			if (isEditMode) {
				setForm(normalized);
				setSnapshot(serialize(normalized));
				setSuccess(
					lang === "es"
						? "Servicio guardado correctamente."
						: "Service saved successfully.",
				);

				toast.success(
					lang === "es"
						? "Servicio guardado correctamente."
						: "Service saved successfully.",
				);

				return;
			}

			const createdId = resolveSavedServiceId(json);

			toast.success(
				lang === "es"
					? "Servicio creado correctamente."
					: "Service created successfully.",
			);

			if (createdId) {
				router.push(`/admin/dashboard/services/${createdId}`);
				return;
			}

			router.push("/admin/dashboard/services");
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: isEditMode
						? lang === "es"
							? "No se pudo guardar el servicio."
							: "Service could not be saved."
						: lang === "es"
							? "No se pudo crear el servicio."
							: "Service could not be created.";

			setError(message);
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	async function uploadCoverImage(file: File): Promise<void> {
		try {
			setUploadingCoverImage(true);

			const result = await uploadAdminFile(file, "services/covers");

			if (!result.ok || !result.file) {
				toast.error(
					result.message ||
					(lang === "es"
						? "No se pudo subir la imagen principal."
						: "Could not upload the cover image."),
				);
				return;
			}

			const uploadedFile: UploadedAdminFile = result.file;

			updateForm((current) => ({
				...current,
				coverImage: uploadedFile.fileKey,
			}));

			toast.success(
				lang === "es"
					? "Imagen principal subida correctamente."
					: "Cover image uploaded successfully.",
			);
		} finally {
			setUploadingCoverImage(false);
		}
	}

	async function uploadGalleryImage(index: number, file: File): Promise<void> {
		try {
			setUploadingGalleryIndex(index);

			const result = await uploadAdminFile(file, "services/gallery");

			if (!result.ok || !result.file) {
				toast.error(
					result.message ||
					(lang === "es"
						? "No se pudo subir la imagen de galería."
						: "Could not upload the gallery image."),
				);
				return;
			}

			updateGalleryUrl(index, result.file.fileKey);

			toast.success(
				lang === "es"
					? "Imagen de galería subida correctamente."
					: "Gallery image uploaded successfully.",
			);
		} finally {
			setUploadingGalleryIndex(null);
		}
	}

	async function uploadSeoImage(file: File): Promise<void> {
		try {
			setUploadingSeoImage(true);

			const result = await uploadAdminFile(file, "services/seo");

			if (!result.ok || !result.file) {
				toast.error(
					result.message ||
					(lang === "es"
						? "No se pudo subir la imagen SEO."
						: "Could not upload the SEO image."),
				);
				return;
			}

			updateForm((current) => ({
				...current,
				seo: {
					...current.seo,
					image: result.file?.fileKey ?? "",
				},
			}));

			toast.success(
				lang === "es"
					? "Imagen SEO subida correctamente."
					: "SEO image uploaded successfully.",
			);
		} finally {
			setUploadingSeoImage(false);
		}
	}

	async function generateSeoImage(): Promise<void> {
		if (!form) return;

		if (!form.coverImage.trim()) {
			toast.error(
				lang === "es"
					? "Primero debes subir una imagen principal."
					: "You must upload a cover image first.",
			);
			return;
		}

		const title = form.title.es.trim() || form.title.en.trim();

		if (!title) {
			toast.error(
				lang === "es"
					? "Debes ingresar un título antes de generar SEO."
					: "You must enter a title before generating SEO.",
			);
			return;
		}

		try {
			setGeneratingSeoImage(true);
			setError("");

			const response = await fetch("/api/admin/services/generate-seo", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title,
					subtitle: form.summary.es.trim() || form.summary.en.trim(),
					category: form.category.trim(),
					coverImage: resolveAssetUrl(form.coverImage),
				}),
			});

			const result = (await response
				.json()
				.catch(() => null)) as GenerateSeoResponse | null;

			if (!response.ok || !result?.ok || !result.data?.previewUrl) {
				throw new Error(
					result?.message ||
					(lang === "es"
						? "No se pudo generar la imagen SEO."
						: "Could not generate SEO image."),
				);
			}

			updateForm((current) => ({
				...current,
				seo: {
					...current.seo,
					image: result.data?.previewUrl ?? "",
				},
			}));

			toast.success(
				lang === "es"
					? "Imagen SEO generada correctamente."
					: "SEO image generated successfully.",
			);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: lang === "es"
						? "No se pudo generar la imagen SEO."
						: "Could not generate SEO image.";

			setError(message);
			toast.error(message);
		} finally {
			setGeneratingSeoImage(false);
		}
	}

	if (loading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center px-6">
				<div className="rounded-2xl border border-border bg-white px-6 py-5 text-sm text-text-secondary shadow-sm">
					{lang === "es" ? "Cargando servicio..." : "Loading service..."}
				</div>
			</div>
		);
	}

	if (!form) {
		return (
			<div className="space-y-4 px-6 py-6">
				<button
					type="button"
					onClick={() => router.push("/admin/dashboard/services")}
					className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
				>
					<ArrowLeft className="h-4 w-4" />
					{lang === "es" ? "Volver" : "Back"}
				</button>

				<div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-rose-700">
						{error ||
							(lang === "es"
								? "No se pudo cargar el servicio."
								: "Service could not be loaded.")}
					</p>
				</div>
			</div>
		);
	}

	const pageTitle = isEditMode
		? form.title[lang] || form.title.es || form.title.en || "Servicio"
		: lang === "es"
			? "Nuevo servicio"
			: "New service";

	const pageDescription = isEditMode
		? lang === "es"
			? "Edita el contenido bilingüe, imágenes, documentos, SEO y configuración pública del servicio."
			: "Edit bilingual content, images, documents, SEO, and public service configuration."
		: lang === "es"
			? "Crea un servicio público con contenido bilingüe, imágenes, documentos relacionados y configuración SEO."
			: "Create a public service with bilingual content, images, related documents, and SEO configuration.";

	return (
		<div className="space-y-6 px-6 pb-24">
			<FormActionsHeader
				backLabel={lang === "es" ? "Atrás" : "Back"}
				saveLabel={
					isEditMode
						? lang === "es"
							? "Guardar servicio"
							: "Save service"
						: lang === "es"
							? "Crear servicio"
							: "Create service"
				}
				savingLabel={lang === "es" ? "Guardando..." : "Saving..."}
				isSaving={saving}
				canSave={canSave}
				statusLabel={
					form.status === "published"
						? lang === "es"
							? "Publicado"
							: "Published"
						: lang === "es"
							? "Borrador"
							: "Draft"
				}
				onBack={handleBack}
				onSave={saveService}
			/>

			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="max-w-3xl space-y-4">
						<button
							type="button"
							onClick={handleBack}
							className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
						>
							<ArrowLeft className="h-4 w-4" />
							{lang === "es" ? "Volver" : "Back"}
						</button>

						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
							{lang === "es" ? "Sitio web / Servicios" : "Website / Services"}
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-text-primary">
							{pageTitle}
						</h1>

						<p className="text-base leading-8 text-text-secondary">
							{pageDescription}
						</p>
					</div>

					<div className="flex flex-wrap gap-3">
						<PrimaryButton
							type="button"
							onClick={() => void saveService()}
							disabled={!canSave}
						>
							{saving ? (
								lang === "es" ? (
									"Guardando..."
								) : (
									"Saving..."
								)
							) : (
								<>
									<Save className="h-4 w-4" />
									{isEditMode
										? lang === "es"
											? "Guardar"
											: "Save"
										: lang === "es"
											? "Crear servicio"
											: "Create service"}
									{!isEditMode ? <ArrowRight className="h-4 w-4" /> : null}
								</>
							)}
						</PrimaryButton>
					</div>
				</div>

				<div className="mt-6 grid gap-3 md:grid-cols-4">
					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						{lang === "es" ? "Estado" : "Status"}:{" "}
						<strong className="text-text-primary">
							{form.status === "published"
								? lang === "es"
									? "Publicado"
									: "Published"
								: lang === "es"
									? "Borrador"
									: "Draft"}
						</strong>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						Slug:{" "}
						<strong className="text-text-primary">{form.slug || "—"}</strong>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						{lang === "es" ? "Orden" : "Order"}:{" "}
						<strong className="text-text-primary">{form.order}</strong>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						{lang === "es" ? "Cambios" : "Changes"}:{" "}
						<strong className={hasChanges ? "text-amber-700" : "text-emerald-700"}>
							{hasChanges
								? lang === "es"
									? "Sin guardar"
									: "Unsaved"
								: lang === "es"
									? "Guardado"
									: "Saved"}
						</strong>
					</div>
				</div>
			</section>

			{error ? (
				<section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-rose-700">{error}</p>
				</section>
			) : null}

			{success ? (
				<section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-emerald-700">{success}</p>
				</section>
			) : null}

			<SectionCard
				title={lang === "es" ? "Identidad del servicio" : "Service identity"}
				subtitle={
					lang === "es"
						? "Define título, slug, categoría, orden, estado y destacado."
						: "Define title, slug, category, order, status, and featured state."
				}
				icon={<BriefcaseBusiness className="h-5 w-5" />}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Título ES</FieldLabel>
						<TextInput
							value={form.title.es}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateLocalizedField("title", "es", value);
							}}
						/>
					</div>

					<div>
						<FieldLabel>Title EN</FieldLabel>
						<TextInput
							value={form.title.en}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateLocalizedField("title", "en", value);
							}}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-4">
					<div>
						<FieldLabel>Slug</FieldLabel>
						<TextInput
							value={form.slug}
							onChange={(event) => {
								const value = event.currentTarget.value;

								updateForm((current) => ({
									...current,
									slug: value,
								}));
							}}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Categoría" : "Category"}</FieldLabel>
						<select
							value={form.category}
							onChange={(event) => {
								const value = event.currentTarget.value;

								updateForm((current) => ({
									...current,
									category: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="">
								{lang === "es" ? "Selecciona una categoría" : "Select category"}
							</option>
							{SERVICE_CATEGORIES.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Orden" : "Order"}</FieldLabel>
						<TextInput
							type="number"
							min={1}
							value={form.order}
							onChange={(event) => {
								const value = Math.max(
									1,
									Number(event.currentTarget.value) || 1,
								);

								updateForm((current) => ({
									...current,
									order: value,
								}));
							}}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Estado" : "Status"}</FieldLabel>
						<select
							value={form.status}
							onChange={(event) => {
								const value: ServiceStatus =
									event.currentTarget.value === "published"
										? "published"
										: "draft";

								updateForm((current) => ({
									...current,
									status: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="draft">{lang === "es" ? "Borrador" : "Draft"}</option>
							<option value="published">
								{lang === "es" ? "Publicado" : "Published"}
							</option>
						</select>
					</div>
				</div>

				<label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
					<input
						type="checkbox"
						checked={form.featured}
						onChange={(event) => {
							const checked = event.currentTarget.checked;

							updateForm((current) => ({
								...current,
								featured: checked,
							}));
						}}
						className="h-4 w-4"
					/>
					<Star className="h-4 w-4" />
					{lang === "es" ? "Destacado" : "Featured"}
				</label>
			</SectionCard>

			<SectionCard
				title={lang === "es" ? "Contenido principal" : "Main content"}
				subtitle={
					lang === "es"
						? "Resumen, descripción e imagen principal del servicio."
						: "Summary, description, and main service image."
				}
				icon={<Settings2 className="h-5 w-5" />}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Resumen ES</FieldLabel>
						<TextArea
							value={form.summary.es}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateLocalizedField("summary", "es", value);
							}}
						/>
					</div>

					<div>
						<FieldLabel>Summary EN</FieldLabel>
						<TextArea
							value={form.summary.en}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateLocalizedField("summary", "en", value);
							}}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Descripción ES</FieldLabel>
						<TextArea
							value={form.description.es}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateLocalizedField("description", "es", value);
							}}
						/>
					</div>

					<div>
						<FieldLabel>Description EN</FieldLabel>
						<TextArea
							value={form.description.en}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateLocalizedField("description", "en", value);
							}}
						/>
					</div>
				</div>

				<div>
					<FieldLabel>Cover Image</FieldLabel>

					<div className="space-y-3">
						<TextInput
							value={form.coverImage}
							onChange={(event) => {
								const value = event.currentTarget.value;

								updateForm((current) => ({
									...current,
									coverImage: value,
								}));
							}}
							placeholder="admin/services/covers/..."
						/>

						<label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft">
							<input
								type="file"
								accept=".png,.jpg,.jpeg,.webp,.svg"
								className="hidden"
								disabled={uploadingCoverImage || saving}
								onChange={(event) => {
									const file = event.currentTarget.files?.[0] ?? null;
									event.currentTarget.value = "";

									if (!file) return;

									void uploadCoverImage(file);
								}}
							/>

							{uploadingCoverImage
								? lang === "es"
									? "Subiendo..."
									: "Uploading..."
								: lang === "es"
									? "Subir imagen principal"
									: "Upload cover image"}
						</label>

						{form.coverImage ? (
							<div className="rounded-xl border border-border bg-surface p-4">
								<Image
									src={resolveAssetUrl(form.coverImage)}
									alt="Service cover preview"
									width={480}
									height={280}
									unoptimized
									className="max-h-56 w-auto rounded-lg object-contain"
								/>
							</div>
						) : null}
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={lang === "es" ? "Galería del servicio" : "Service gallery"}
				subtitle={
					lang === "es"
						? "Agrega imágenes adicionales para el servicio."
						: "Add additional images for this service."
				}
				icon={<ImageIcon className="h-5 w-5" />}
			>
				<div>
					<PrimaryButton type="button" onClick={addGalleryItem}>
						<Plus size={18} />
						{lang === "es" ? "Agregar imagen" : "Add image"}
					</PrimaryButton>
				</div>

				{form.gallery.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-text-secondary">
						{lang === "es"
							? "No hay imágenes en la galería."
							: "There are no gallery images."}
					</div>
				) : (
					<div className="space-y-4">
						{form.gallery.map((item, index) => (
							<div
								key={`gallery-item-${index}`}
								className="rounded-2xl border border-border bg-surface p-4"
							>
								<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
									<div className="flex items-center gap-3">
										<div className="rounded-2xl bg-white p-3 text-text-secondary shadow-sm">
											<ImageIcon className="h-5 w-5" />
										</div>

										<div>
											<p className="text-sm font-semibold text-text-primary">
												{lang === "es"
													? `Imagen ${index + 1}`
													: `Image ${index + 1}`}
											</p>
											<p className="text-xs text-text-secondary">
												{lang === "es"
													? `Orden: ${item.order}`
													: `Order: ${item.order}`}
											</p>
										</div>
									</div>

									<div className="flex flex-wrap gap-2">
										<ActionButton
											type="button"
											onClick={() => moveGalleryUp(index)}
											disabled={index === 0}
										>
											<ArrowUp size={16} />
										</ActionButton>

										<ActionButton
											type="button"
											onClick={() => moveGalleryDown(index)}
											disabled={index === form.gallery.length - 1}
										>
											<ArrowDown size={16} />
										</ActionButton>

										<ActionButton
											type="button"
											onClick={() => removeGalleryItem(index)}
											className="border-rose-200 text-rose-700 hover:bg-rose-50"
										>
											<Trash2 size={16} />
										</ActionButton>
									</div>
								</div>

								<div className="space-y-4">
									<TextInput
										value={item.url}
										onChange={(event) => {
											const value = event.currentTarget.value;
											updateGalleryUrl(index, value);
										}}
										placeholder="admin/services/gallery/..."
									/>

									<label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft">
										<input
											type="file"
											accept=".png,.jpg,.jpeg,.webp,.svg"
											className="hidden"
											disabled={uploadingGalleryIndex === index || saving}
											onChange={(event) => {
												const file = event.currentTarget.files?.[0] ?? null;
												event.currentTarget.value = "";

												if (!file) return;

												void uploadGalleryImage(index, file);
											}}
										/>

										{uploadingGalleryIndex === index
											? lang === "es"
												? "Subiendo..."
												: "Uploading..."
											: lang === "es"
												? "Subir imagen"
												: "Upload image"}
									</label>

									{item.url ? (
										<Image
											src={resolveAssetUrl(item.url)}
											alt={item.alt[lang] || `Gallery image ${index + 1}`}
											width={420}
											height={240}
											unoptimized
											className="max-h-48 w-auto rounded-lg object-contain"
										/>
									) : null}

									<div className="grid gap-4 md:grid-cols-2">
										<TextInput
											value={item.alt.es}
											onChange={(event) => {
												const value = event.currentTarget.value;
												updateGalleryAlt(index, "es", value);
											}}
											placeholder="Alt ES"
										/>

										<TextInput
											value={item.alt.en}
											onChange={(event) => {
												const value = event.currentTarget.value;
												updateGalleryAlt(index, "en", value);
											}}
											placeholder="Alt EN"
										/>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</SectionCard>

			<SectionCard
				title={
					lang === "es"
						? "Especificaciones técnicas"
						: "Technical specifications"
				}
				subtitle={
					lang === "es"
						? "Información técnica estructurada del servicio."
						: "Structured technical information for this service."
				}
				icon={<SearchCheck className="h-5 w-5" />}
			>
				{(
					[
						["application", "Aplicación", "Application"],
						["capacity", "Capacidad", "Capacity"],
						["flowRate", "Caudal", "Flow Rate"],
						["material", "Material", "Material"],
						["technology", "Tecnología", "Technology"],
					] as const
				).map(([field, labelEs, labelEn]) => (
					<div key={field} className="grid gap-5 md:grid-cols-2">
						<div>
							<FieldLabel>{labelEs} ES</FieldLabel>
							<TextInput
								value={form.technicalSpecs[field].es}
								onChange={(event) => {
									const value = event.currentTarget.value;
									updateTechnicalSpecField(field, "es", value);
								}}
							/>
						</div>

						<div>
							<FieldLabel>{labelEn} EN</FieldLabel>
							<TextInput
								value={form.technicalSpecs[field].en}
								onChange={(event) => {
									const value = event.currentTarget.value;
									updateTechnicalSpecField(field, "en", value);
								}}
							/>
						</div>
					</div>
				))}
			</SectionCard>

			<DocumentAttachmentSelector
				value={form.attachments}
				onChange={(nextValue) =>
					updateForm((current) => ({
						...current,
						attachments: nextValue,
					}))
				}
				locale={lang}
				relatedModule="services"
				title={lang === "es" ? "Documentos relacionados" : "Related documents"}
				description={
					lang === "es"
						? "Busca documentos existentes en la biblioteca y asígnalos a este servicio."
						: "Search existing documents in the library and attach them to this service."
				}
			/>

			<SectionCard
				title="SEO"
				subtitle={
					lang === "es"
						? "Configura metadatos e imagen social del servicio."
						: "Configure metadata and social image for this service."
				}
				icon={<FileText className="h-5 w-5" />}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>SEO Meta Title ES</FieldLabel>
						<TextInput
							value={form.seo.metaTitle.es}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateSeoField("metaTitle", "es", value);
							}}
						/>
					</div>

					<div>
						<FieldLabel>SEO Meta Title EN</FieldLabel>
						<TextInput
							value={form.seo.metaTitle.en}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateSeoField("metaTitle", "en", value);
							}}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>SEO Meta Description ES</FieldLabel>
						<TextArea
							value={form.seo.metaDescription.es}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateSeoField("metaDescription", "es", value);
							}}
						/>
					</div>

					<div>
						<FieldLabel>SEO Meta Description EN</FieldLabel>
						<TextArea
							value={form.seo.metaDescription.en}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateSeoField("metaDescription", "en", value);
							}}
						/>
					</div>
				</div>

				<div>
					<FieldLabel>SEO Image</FieldLabel>

					<TextInput
						value={form.seo.image}
						onChange={(event) => {
							const value = event.currentTarget.value;

							updateForm((current) => ({
								...current,
								seo: {
									...current.seo,
									image: value,
								},
							}));
						}}
						placeholder="admin/services/seo/..."
					/>

					<div className="mt-3">
						<div className="mt-3 flex flex-wrap gap-3">
							<label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft">
								<input
									type="file"
									accept=".png,.jpg,.jpeg,.webp,.svg"
									className="hidden"
									disabled={uploadingSeoImage || saving || generatingSeoImage}
									onChange={(event) => {
										const file = event.currentTarget.files?.[0] ?? null;
										event.currentTarget.value = "";

										if (!file) return;

										void uploadSeoImage(file);
									}}
								/>

								{uploadingSeoImage
									? lang === "es"
										? "Subiendo..."
										: "Uploading..."
									: form.seo.image
										? lang === "es"
											? "Reemplazar imagen SEO"
											: "Replace SEO image"
										: lang === "es"
											? "Subir imagen SEO"
											: "Upload SEO image"}
							</label>

							<button
								type="button"
								onClick={() => void generateSeoImage()}
								disabled={saving || uploadingSeoImage || generatingSeoImage}
								className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
							>
								{generatingSeoImage ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<ImageIcon className="h-4 w-4" />
								)}

								<span>
									{generatingSeoImage
										? lang === "es"
											? "Generando..."
											: "Generating..."
										: form.seo.image
											? lang === "es"
												? "Regenerar SEO"
												: "Regenerate SEO"
											: lang === "es"
												? "Generar SEO"
												: "Generate SEO"}
								</span>
							</button>
						</div>
					</div>

					{form.seo.image ? (
						<div className="mt-3 rounded-xl border border-border bg-surface p-4">
							<Image
								src={resolveAssetUrl(form.seo.image)}
								alt="SEO image preview"
								width={420}
								height={240}
								unoptimized
								className="max-h-48 w-auto rounded-lg object-contain"
							/>
						</div>
					) : null}
				</div>
			</SectionCard>

			<GlobalConfirm
				open={leaveConfirmOpen}
				title={lang === "es" ? "Cambios sin guardar" : "Unsaved changes"}
				message={
					lang === "es"
						? "Tienes cambios sin guardar. Si sales ahora, perderás los cambios realizados."
						: "You have unsaved changes. If you leave now, your changes will be lost."
				}
				cancelLabel={lang === "es" ? "Seguir editando" : "Keep editing"}
				confirmLabel={
					lang === "es" ? "Salir sin guardar" : "Leave without saving"
				}
				loading={false}
				onCancel={() => setLeaveConfirmOpen(false)}
				onConfirm={() => {
					setLeaveConfirmOpen(false);
					router.push("/admin/dashboard/services");
				}}
			/>
		</div>
	);
}