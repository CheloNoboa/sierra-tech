"use client";

/**
 * =============================================================================
 * ✅ Page: Admin Service Create
 * Path: src/app/admin/dashboard/services/new/page.tsx
 * =============================================================================
 *
 * ES:
 * Página administrativa para crear un servicio fuera de modal.
 *
 * Responsabilidades:
 * - mantener el mismo flujo visual usado en Maintenance
 * - crear servicios con formulario estructurado
 * - subir imágenes a R2 usando el helper existente
 * - permitir galería, documentos, SEO y especificaciones técnicas
 * - guardar mediante POST /api/admin/services
 * - redirigir al detalle del servicio creado
 *
 * Reglas:
 * - no usar any
 * - no eliminar funcionalidad existente del módulo Services
 * - no usar window.confirm
 * - no leer event.currentTarget dentro de callbacks async de setState
 * =============================================================================
 */

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
	ArrowLeft,
	ArrowRight,
	ArrowDown,
	ArrowUp,
	BriefcaseBusiness,
	Image as ImageIcon,
	Plus,
	Save,
	Settings2,
	Star,
	Trash2,
	X,
} from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import DocumentAttachmentSelector, {
	type ServiceAttachmentItem,
} from "@/components/admin/documents/DocumentAttachmentSelector";

import {
	uploadAdminFile,
	type UploadedAdminFile,
} from "@/lib/adminUploadsClient";
import { resolveAssetUrl } from "@/lib/resolveAssetUrl";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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
}

type ServiceCreateResponse =
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

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

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

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
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
	clone.splice(toIndex, 0, moved);

	return reorderGallery(clone);
}

function resolveCreatedServiceId(payload: ServiceCreateResponse): string {
	if ("_id" in payload && payload._id) return payload._id;
	if ("id" in payload && payload.id) return payload.id;

	if ("item" in payload && payload.item?._id) return payload.item._id;
	if ("item" in payload && payload.item?.id) return payload.item.id;

	if ("data" in payload && payload.data?._id) return payload.data._id;
	if ("data" in payload && payload.data?.id) return payload.data.id;

	return "";
}

/* -------------------------------------------------------------------------- */
/* Small UI blocks                                                            */
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
			className={`h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""
				}`}
		/>
	);
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			{...props}
			className={`min-h-[120px] w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""
				}`}
		/>
	);
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50 ${props.className ?? ""
				}`}
		/>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminServiceCreatePage() {
	const router = useRouter();
	const toast = useToast();
	const { locale } = useTranslation();

	const lang: Locale = locale === "en" ? "en" : "es";

	const [form, setForm] = useState<ServicePayload>(SERVICE_DEFAULTS);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
	const [uploadingSeoImage, setUploadingSeoImage] = useState(false);
	const [uploadingGalleryIndex, setUploadingGalleryIndex] = useState<
		number | null
	>(null);

	const canSave = useMemo(() => {
		if (saving) return false;

		const hasTitle =
			normalizeString(form.title.es).length > 0 ||
			normalizeString(form.title.en).length > 0;

		return hasTitle;
	}, [form.title.en, form.title.es, saving]);

	function updateLocalizedField(
		field: "title" | "summary" | "description",
		localeKey: Locale,
		value: string,
	): void {
		setForm((current) => ({
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
		setForm((current) => ({
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
		setForm((current) => ({
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
		setForm((current) => ({
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
		setForm((current) => ({
			...current,
			gallery: reorderGallery(current.gallery.filter((_, i) => i !== index)),
		}));
	}

	function moveGalleryUp(index: number): void {
		setForm((current) => ({
			...current,
			gallery: moveGalleryItem(current.gallery, index, index - 1),
		}));
	}

	function moveGalleryDown(index: number): void {
		setForm((current) => ({
			...current,
			gallery: moveGalleryItem(current.gallery, index, index + 1),
		}));
	}

	function updateGalleryUrl(index: number, value: string): void {
		setForm((current) => ({
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
		setForm((current) => ({
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

	async function handleSave(): Promise<void> {
		if (!canSave) return;

		try {
			setSaving(true);
			setError("");

			const payload: ServicePayload = {
				...form,
				slug: slugify(form.slug || form.title.es || form.title.en),
				gallery: reorderGallery(
					form.gallery
						.filter((item) => normalizeString(item.url).length > 0)
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
					.filter((item) => normalizeString(item.documentId).length > 0)
					.map((item) => ({
						documentId: item.documentId.trim(),
						title: item.title.trim(),
					})),
			};

			const response = await fetch("/api/admin/services", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const json = (await response
				.json()
				.catch(() => null)) as ServiceCreateResponse | null;

			if (!response.ok || !json) {
				const message =
					json && "error_es" in json && lang === "es"
						? json.error_es
						: json && "error_en" in json && lang === "en"
							? json.error_en
							: lang === "es"
								? "No se pudo crear el servicio."
								: "Service could not be created.";

				throw new Error(message || `HTTP_${response.status}`);
			}

			const createdId = resolveCreatedServiceId(json);

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
					: lang === "es"
						? "No se pudo crear el servicio."
						: "Service could not be created.";

			setError(message);
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6 px-6 pb-24">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="max-w-3xl space-y-4">
						<button
							type="button"
							onClick={() => router.push("/admin/dashboard/services")}
							className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
						>
							<ArrowLeft className="h-4 w-4" />
							{lang === "es" ? "Volver" : "Back"}
						</button>

						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
							{lang === "es" ? "Sitio web / Servicios" : "Website / Services"}
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-text-primary">
							{lang === "es" ? "Nuevo servicio" : "New service"}
						</h1>

						<p className="text-base leading-8 text-text-secondary">
							{lang === "es"
								? "Crea un servicio público con contenido bilingüe, imágenes, documentos relacionados y configuración SEO."
								: "Create a public service with bilingual content, images, related documents, and SEO configuration."}
						</p>
					</div>

					<div className="flex flex-wrap gap-3">
						<PrimaryButton
							type="button"
							onClick={() => void handleSave()}
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
									{lang === "es" ? "Crear servicio" : "Create service"}
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</PrimaryButton>
					</div>
				</div>
			</section>

			{error ? (
				<section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-rose-700">{error}</p>
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

								setForm((current) => ({
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

								setForm((current) => ({
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

								setForm((current) => ({
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

								setForm((current) => ({
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

							setForm((current) => ({
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

								setForm((current) => ({
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
								onChange={async (event) => {
									const file = event.target.files?.[0] ?? null;
									if (!file) return;

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

										setForm((current) => ({
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
										event.target.value = "";
									}
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
									<p className="text-sm font-semibold text-text-primary">
										{lang === "es"
											? `Imagen ${index + 1}`
											: `Image ${index + 1}`}
									</p>

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
											onChange={async (event) => {
												const file = event.target.files?.[0] ?? null;
												if (!file) return;

												try {
													setUploadingGalleryIndex(index);

													const result = await uploadAdminFile(
														file,
														"services/gallery",
													);

													if (!result.ok || !result.file) {
														toast.error(
															result.message ||
															(lang === "es"
																? "No se pudo subir la imagen."
																: "Could not upload image."),
														);
														return;
													}

													const uploadedFile: UploadedAdminFile = result.file;
													updateGalleryUrl(index, uploadedFile.fileKey);

													toast.success(
														lang === "es"
															? "Imagen subida correctamente."
															: "Image uploaded successfully.",
													);
												} finally {
													setUploadingGalleryIndex(null);
													event.target.value = "";
												}
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
											alt={item.alt[lang] || `Gallery ${index + 1}`}
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
					setForm((current) => ({
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

							setForm((current) => ({
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
						<label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft">
							<input
								type="file"
								accept=".png,.jpg,.jpeg,.webp,.svg"
								className="hidden"
								disabled={uploadingSeoImage || saving}
								onChange={async (event) => {
									const file = event.target.files?.[0] ?? null;
									if (!file) return;

									try {
										setUploadingSeoImage(true);

										const result = await uploadAdminFile(file, "services/seo");

										if (!result.ok || !result.file) {
											toast.error(
												result.message ||
												(lang === "es"
													? "No se pudo subir la imagen SEO."
													: "Could not upload SEO image."),
											);
											return;
										}

										const uploadedFile: UploadedAdminFile = result.file;

										setForm((current) => ({
											...current,
											seo: {
												...current.seo,
												image: uploadedFile.fileKey,
											},
										}));

										toast.success(
											lang === "es"
												? "Imagen SEO subida correctamente."
												: "SEO image uploaded successfully.",
										);
									} finally {
										setUploadingSeoImage(false);
										event.target.value = "";
									}
								}}
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

			<div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-xl">
				<button
					type="button"
					onClick={() => router.push("/admin/dashboard/services")}
					disabled={saving}
					className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-sm font-bold text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
				>
					<X className="h-4 w-4" />
					{lang === "es" ? "Cancelar" : "Cancel"}
				</button>

				<PrimaryButton
					type="button"
					onClick={() => void handleSave()}
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
							{lang === "es" ? "Crear servicio" : "Create service"}
						</>
					)}
				</PrimaryButton>
			</div>
		</div>
	);
}