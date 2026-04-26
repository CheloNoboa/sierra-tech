"use client";

/**
 * =============================================================================
 * ✅ Page: Admin Service Detail
 * Path: src/app/admin/dashboard/services/[id]/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa de edición de un servicio.
 *
 * Objetivo:
 * - reemplazar la edición en modal por una página dentro del layout admin
 * - mantener todo lo funcional: contenido bilingüe, galería, imágenes, SEO,
 *   documentos asociados y guardado por API
 * - conservar UX similar al módulo Maintenance
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowDown,
	ArrowLeft,
	ArrowUp,
	Image as ImageIcon,
	Plus,
	Save,
	Trash2,
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

type Locale = "es" | "en";
type ServiceStatus = "draft" | "published";

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
		.map((item, index) => ({ ...item, order: index + 1 }));
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
	return items.map((item, index) => ({ ...item, order: index + 1 }));
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
	clone.splice(toIndex, 0, moved);
	return reorderGallery(clone);
}

function serialize(value: ServicePayload | null): string {
	return JSON.stringify(value);
}

function SectionCard({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
			<div className="mb-5">
				<h2 className="text-lg font-bold text-text-primary">{title}</h2>
				{subtitle ? (
					<p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
				) : null}
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
			className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""
				}`}
		/>
	);
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			{...props}
			className={`min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""
				}`}
		/>
	);
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""
				}`}
		/>
	);
}

export default function AdminServiceDetailPage() {
	const params = useParams<{ id: string }>();
	const serviceId = typeof params?.id === "string" ? params.id.trim() : "";
	const router = useRouter();
	const toast = useToast();
	const { locale } = useTranslation();
	const lang: Locale = locale === "en" ? "en" : "es";

	const [form, setForm] = useState<ServicePayload | null>(null);
	const [snapshot, setSnapshot] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

	const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
	const [uploadingSeoImage, setUploadingSeoImage] = useState(false);
	const [uploadingGalleryIndex, setUploadingGalleryIndex] = useState<number | null>(
		null,
	);

	const hasChanges = useMemo(() => {
		if (!form) return false;
		return serialize(form) !== snapshot;
	}, [form, snapshot]);

	const canSave = useMemo(() => {
		if (!form || loading || saving) return false;
		return Boolean(form.title.es.trim() || form.title.en.trim());
	}, [form, loading, saving]);

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
		let cancelled = false;

		async function loadService() {
			if (!serviceId) {
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
	}, [serviceId, lang]);

	const handleBack = useCallback(() => {
		if (hasChanges) {
			setLeaveConfirmOpen(true);
			return;
		}

		router.push("/admin/dashboard/services");
	}, [hasChanges, router]);

	function updateForm(updater: (current: ServicePayload) => ServicePayload) {
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

	async function saveService() {
		if (!form || !canSave) return;

		try {
			setSaving(true);
			setError("");
			setSuccess("");

			const payload: ServicePayload = {
				...form,
				slug: slugify(form.slug || form.title.es || form.title.en),
				gallery: reorderGallery(
					form.gallery
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
				attachments: form.attachments
					.filter((item) => item.documentId.trim().length > 0)
					.map((item) => ({
						documentId: item.documentId.trim(),
						title: item.title.trim(),
					})),
			};

			const response = await fetch(`/api/admin/services/${serviceId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const saved: unknown = await response.json().catch(() => null);

			if (!response.ok || !saved) {
				setError(
					lang === "es"
						? "No se pudo guardar el servicio."
						: "Service could not be saved.",
				);
				return;
			}

			const normalized = normalizeService(saved);
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
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: lang === "es"
						? "No se pudo guardar el servicio."
						: "Service could not be saved.";

			setError(message);
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="p-6 text-sm text-text-secondary">
				{lang === "es" ? "Cargando..." : "Loading..."}
			</div>
		);
	}

	if (!form) {
		return (
			<div className="space-y-4 px-6 py-6">
				<button
					type="button"
					onClick={handleBack}
					className="text-sm font-semibold text-text-secondary hover:text-text-primary"
				>
					{lang === "es" ? "← Volver" : "← Back"}
				</button>

				<p className="text-sm text-rose-700">
					{error ||
						(lang === "es"
							? "No se pudo cargar el servicio."
							: "Service could not be loaded.")}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-5 px-6 pb-24">
			<section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<button
							type="button"
							onClick={handleBack}
							className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary"
						>
							<ArrowLeft className="h-4 w-4" />
							{lang === "es" ? "Volver" : "Back"}
						</button>

						<h1 className="mt-3 text-2xl font-bold text-text-primary">
							{form.title[lang] || form.title.es || form.title.en || "Servicio"}
						</h1>

						<p className="mt-1 text-sm text-text-secondary">
							{form.category || "—"} ·{" "}
							<strong>
								{form.status === "published"
									? lang === "es"
										? "Publicado"
										: "Published"
									: lang === "es"
										? "Borrador"
										: "Draft"}
							</strong>
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<PrimaryButton
							type="button"
							onClick={() => void saveService()}
							disabled={!canSave}
						>
							<Save className="h-4 w-4" />
							{saving
								? lang === "es"
									? "Guardando..."
									: "Saving..."
								: lang === "es"
									? "Guardar"
									: "Save"}
						</PrimaryButton>
					</div>
				</div>

				<div className="mt-4 grid gap-3 md:grid-cols-4">
					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{lang === "es" ? "Estado" : "Status"}:{" "}
						<strong>
							{form.status === "published"
								? lang === "es"
									? "Publicado"
									: "Published"
								: lang === "es"
									? "Borrador"
									: "Draft"}
						</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						Slug: <strong>{form.slug || "—"}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{lang === "es" ? "Orden" : "Order"}: <strong>{form.order}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{lang === "es" ? "Cambios" : "Changes"}:{" "}
						<strong>
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
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
					{error}
				</div>
			) : null}

			{success ? (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
					{success}
				</div>
			) : null}

			<SectionCard
				title={lang === "es" ? "Identidad del servicio" : "Service identity"}
				subtitle={
					lang === "es"
						? "Define título, slug, categoría, orden y visibilidad."
						: "Define title, slug, category, order and visibility."
				}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Título ES</FieldLabel>
						<TextInput
							value={form.title.es}
							onChange={(e) =>
								updateLocalizedField("title", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Title EN</FieldLabel>
						<TextInput
							value={form.title.en}
							onChange={(e) =>
								updateLocalizedField("title", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-3">
					<div>
						<FieldLabel>Slug</FieldLabel>
						<TextInput
							value={form.slug}
							onChange={(e) =>
								updateForm((current) => ({
									...current,
									slug: e.target.value,
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Categoría" : "Category"}</FieldLabel>
						<select
							value={form.category}
							onChange={(e) =>
								updateForm((current) => ({
									...current,
									category: e.target.value,
								}))
							}
							className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="">
								{lang === "es"
									? "Selecciona una categoría"
									: "Select category"}
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
							onChange={(e) =>
								updateForm((current) => ({
									...current,
									order: Math.max(1, Number(e.target.value) || 1),
								}))
							}
						/>
					</div>
				</div>

				<div className="flex flex-wrap gap-6">
					<label className="inline-flex cursor-pointer items-center gap-3 text-sm text-text-primary">
						<input
							type="checkbox"
							checked={form.featured}
							onChange={(e) =>
								updateForm((current) => ({
									...current,
									featured: e.target.checked,
								}))
							}
							className="h-4 w-4 rounded border-border"
						/>
						<span>{lang === "es" ? "Destacado" : "Featured"}</span>
					</label>

					<div className="flex items-center gap-3">
						<FieldLabel>{lang === "es" ? "Estado" : "Status"}</FieldLabel>
						<select
							value={form.status}
							onChange={(e) =>
								updateForm((current) => ({
									...current,
									status:
										e.target.value === "published" ? "published" : "draft",
								}))
							}
							className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="draft">
								{lang === "es" ? "Borrador" : "Draft"}
							</option>
							<option value="published">
								{lang === "es" ? "Publicado" : "Published"}
							</option>
						</select>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={lang === "es" ? "Contenido principal" : "Main content"}
				subtitle={
					lang === "es"
						? "Resumen, descripción e imagen principal."
						: "Summary, description and main image."
				}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Resumen ES</FieldLabel>
						<TextArea
							value={form.summary.es}
							onChange={(e) =>
								updateLocalizedField("summary", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Summary EN</FieldLabel>
						<TextArea
							value={form.summary.en}
							onChange={(e) =>
								updateLocalizedField("summary", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Descripción ES</FieldLabel>
						<TextArea
							value={form.description.es}
							onChange={(e) =>
								updateLocalizedField("description", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Description EN</FieldLabel>
						<TextArea
							value={form.description.en}
							onChange={(e) =>
								updateLocalizedField("description", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div>
					<FieldLabel>Cover Image</FieldLabel>

					<div className="space-y-3">
						<TextInput
							value={form.coverImage}
							onChange={(e) =>
								updateForm((current) => ({
									...current,
									coverImage: e.target.value,
								}))
							}
							placeholder="admin/services/covers/..."
						/>

						<label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
							<input
								type="file"
								accept=".png,.jpg,.jpeg,.webp,.svg"
								className="hidden"
								onChange={async (e) => {
									const file = e.target.files?.[0] ?? null;
									if (!file) return;

									try {
										setUploadingCoverImage(true);

										const result = await uploadAdminFile(file, "services/covers");

										if (!result.ok || !result.file) {
											toast.error(
												lang === "es"
													? result.message ||
													"No se pudo subir la imagen principal."
													: result.message ||
													"Could not upload the cover image.",
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
										e.target.value = "";
									}
								}}
								disabled={uploadingCoverImage || saving}
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
							<div className="rounded-xl border border-border bg-background p-4">
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
						? "Agrega imágenes adicionales para el detalle público del servicio."
						: "Add extra images for the public service detail page."
				}
			>
				<PrimaryButton type="button" onClick={addGalleryItem}>
					<Plus size={18} />
					{lang === "es" ? "Agregar imagen" : "Add image"}
				</PrimaryButton>

				{form.gallery.length === 0 ? (
					<div className="rounded-2xl border border-border bg-background px-4 py-6 text-center text-sm text-text-secondary">
						{lang === "es"
							? "No hay imágenes en la galería."
							: "There are no gallery images."}
					</div>
				) : (
					<div className="space-y-4">
						{form.gallery.map((item, index) => (
							<div
								key={`gallery-item-${index}`}
								className="rounded-2xl border border-border bg-background p-4"
							>
								<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div className="flex items-center gap-3">
										<div className="rounded-2xl bg-surface-soft p-3 text-text-secondary">
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
										onChange={(e) => updateGalleryUrl(index, e.target.value)}
										placeholder="admin/services/gallery/..."
									/>

									<label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
										<input
											type="file"
											accept=".png,.jpg,.jpeg,.webp,.svg"
											className="hidden"
											onChange={async (e) => {
												const file = e.target.files?.[0] ?? null;
												if (!file) return;

												try {
													setUploadingGalleryIndex(index);

													const result = await uploadAdminFile(
														file,
														"services/gallery",
													);

													if (!result.ok || !result.file) {
														toast.error(
															lang === "es"
																? result.message ||
																"No se pudo subir la imagen de galería."
																: result.message ||
																"Could not upload the gallery image.",
														);
														return;
													}

													const uploadedFile = result.file;

													if (!uploadedFile) {
														toast.error(
															lang === "es"
																? "No se pudo obtener la imagen de galería subida."
																: "Could not resolve the uploaded gallery image.",
														);
														return;
													}

													updateGalleryUrl(index, uploadedFile.fileKey);

													toast.success(
														lang === "es"
															? "Imagen de galería subida correctamente."
															: "Gallery image uploaded successfully.",
													);
												} finally {
													setUploadingGalleryIndex(null);
													e.target.value = "";
												}
											}}
											disabled={uploadingGalleryIndex === index || saving}
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
											onChange={(e) =>
												updateGalleryAlt(index, "es", e.target.value)
											}
											placeholder="Alt ES"
										/>
										<TextInput
											value={item.alt.en}
											onChange={(e) =>
												updateGalleryAlt(index, "en", e.target.value)
											}
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
								onChange={(e) =>
									updateTechnicalSpecField(field, "es", e.target.value)
								}
							/>
						</div>

						<div>
							<FieldLabel>{labelEn} EN</FieldLabel>
							<TextInput
								value={form.technicalSpecs[field].en}
								onChange={(e) =>
									updateTechnicalSpecField(field, "en", e.target.value)
								}
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

			<SectionCard title="SEO">
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>SEO Meta Title ES</FieldLabel>
						<TextInput
							value={form.seo.metaTitle.es}
							onChange={(e) =>
								updateSeoField("metaTitle", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>SEO Meta Title EN</FieldLabel>
						<TextInput
							value={form.seo.metaTitle.en}
							onChange={(e) =>
								updateSeoField("metaTitle", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>SEO Meta Description ES</FieldLabel>
						<TextArea
							value={form.seo.metaDescription.es}
							onChange={(e) =>
								updateSeoField("metaDescription", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>SEO Meta Description EN</FieldLabel>
						<TextArea
							value={form.seo.metaDescription.en}
							onChange={(e) =>
								updateSeoField("metaDescription", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div>
					<FieldLabel>SEO Image</FieldLabel>

					<TextInput
						value={form.seo.image}
						onChange={(e) =>
							updateForm((current) => ({
								...current,
								seo: { ...current.seo, image: e.target.value },
							}))
						}
						placeholder="admin/services/seo/..."
					/>

					<div className="mt-3">
						<label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft">
							<input
								type="file"
								accept=".png,.jpg,.jpeg,.webp,.svg"
								className="hidden"
								onChange={async (e) => {
									const file = e.target.files?.[0] ?? null;
									if (!file) return;

									try {
										setUploadingSeoImage(true);

										const result = await uploadAdminFile(file, "services/seo");

										if (!result.ok || !result.file) {
											toast.error(
												lang === "es"
													? result.message || "No se pudo subir la imagen SEO."
													: result.message || "Could not upload the SEO image.",
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
										e.target.value = "";
									}
								}}
								disabled={uploadingSeoImage || saving}
							/>

							{uploadingSeoImage
								? lang === "es"
									? "Subiendo..."
									: "Uploading..."
								: lang === "es"
									? "Subir imagen SEO"
									: "Upload SEO image"}
						</label>
					</div>

					{form.seo.image ? (
						<div className="mt-3 rounded-xl border border-border bg-background p-4">
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

			<div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-xl">
				{hasChanges ? (
					<span className="text-xs font-bold text-amber-700">
						{lang === "es" ? "Cambios sin guardar" : "Unsaved changes"}
					</span>
				) : null}

				<button
					type="button"
					onClick={() => void saveService()}
					disabled={!canSave}
					className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
				>
					{saving
						? lang === "es"
							? "Guardando..."
							: "Saving..."
						: lang === "es"
							? "Guardar"
							: "Save"}
				</button>
			</div>

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