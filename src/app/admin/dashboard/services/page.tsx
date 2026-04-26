"use client";

/**
 * =============================================================================
 * ✅ Page: Admin Services
 * Path: src/app/admin/dashboard/services/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa principal del módulo Services.
 *
 * Responsabilidades:
 * - Listar servicios existentes.
 * - Crear servicios redirigiendo a /admin/dashboard/services/new.
 * - Editar servicios redirigiendo a /admin/dashboard/services/[id].
 * - Eliminar servicios existentes.
 * - Administrar la cabecera global pública de /services.
 *
 * Decisiones:
 * - La creación y edición ya no se realizan en modal.
 * - La cabecera pública de /services pertenece a esta pantalla.
 * - El formulario completo de servicio vive en las páginas new/[id].
 * - Se mantiene el diseño visual previo de tarjetas, badges y acciones.
 *
 * EN:
 * Main administrative page for the Services module.
 * =============================================================================
 */

import {
	useEffect,
	useMemo,
	useState,
	type InputHTMLAttributes,
	type ReactNode,
	type TextareaHTMLAttributes,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
	ArrowRight,
	BriefcaseBusiness,
	Pencil,
	Plus,
	Save,
	Star,
	StarOff,
	Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";
import GlobalConfirm from "@/components/ui/GlobalConfirm";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type AllowedRole = "admin" | "superadmin";
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

interface ServiceAttachmentRef {
	documentId: string;
	title: string;
}

interface ServicePageHeader {
	eyebrow: LocalizedText;
	title: LocalizedText;
	subtitle: LocalizedText;
	primaryCtaLabel: LocalizedText;
	primaryCtaHref: string;
	secondaryCtaLabel: LocalizedText;
	secondaryCtaHref: string;
}

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

interface ServiceListItem extends ServicePayload {
	_id?: string;
}

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = { es: "", en: "" };

const EMPTY_PAGE_HEADER: ServicePageHeader = {
	eyebrow: { es: "", en: "" },
	title: { es: "", en: "" },
	subtitle: { es: "", en: "" },
	primaryCtaLabel: { es: "", en: "" },
	primaryCtaHref: "",
	secondaryCtaLabel: { es: "", en: "" },
	secondaryCtaHref: "",
};

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

/* -------------------------------------------------------------------------- */
/* Normalizers                                                                */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
	return role === "admin" || role === "superadmin";
}

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
	const technicalSpecs = (record.technicalSpecs ?? {}) as Record<
		string,
		unknown
	>;
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

/* -------------------------------------------------------------------------- */
/* Small UI                                                                   */
/* -------------------------------------------------------------------------- */

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
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="mb-5">
				<h3 className="text-lg font-semibold text-text-primary">{title}</h3>
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

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			{...props}
			className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""
				}`}
		/>
	);
}

function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			{...props}
			className={`min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""
				}`}
		/>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ServicesPage() {
	const router = useRouter();
	const { locale } = useTranslation();
	const lang: Locale = locale === "es" ? "es" : "en";

	const { data: session, status } = useSession();
	const toast = useToast();

	const [services, setServices] = useState<ServiceListItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleting, setDeleting] = useState(false);

	const [servicesHeader, setServicesHeader] = useState<ServicePageHeader>(
		structuredClone(EMPTY_PAGE_HEADER),
	);

	const role = session?.user?.role;
	const hasAccess = isAllowedRole(role);

	const sortedServices = useMemo(() => {
		return [...services].sort((a, b) => a.order - b.order);
	}, [services]);

	useEffect(() => {
		async function loadServices() {
			try {
				const response = await fetch("/api/admin/services", {
					method: "GET",
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error(`HTTP_${response.status}`);
				}

				const payload: unknown = await response.json().catch(() => null);

				const payloadRecord =
					payload && typeof payload === "object"
						? (payload as Record<string, unknown>)
						: {};

				const dataRecord =
					payloadRecord.data && typeof payloadRecord.data === "object"
						? (payloadRecord.data as Record<string, unknown>)
						: {};

				const rows = Array.isArray(dataRecord.services)
					? dataRecord.services
					: [];

				const pageRecord =
					dataRecord.page && typeof dataRecord.page === "object"
						? (dataRecord.page as Record<string, unknown>)
						: {};

				const headerRecord =
					pageRecord.header && typeof pageRecord.header === "object"
						? (pageRecord.header as Record<string, unknown>)
						: null;

				if (headerRecord) {
					setServicesHeader({
						eyebrow: normalizeLocalizedText(headerRecord.eyebrow),
						title: normalizeLocalizedText(headerRecord.title),
						subtitle: normalizeLocalizedText(headerRecord.subtitle),
						primaryCtaLabel: normalizeLocalizedText(
							headerRecord.primaryCtaLabel,
						),
						primaryCtaHref: normalizeString(headerRecord.primaryCtaHref),
						secondaryCtaLabel: normalizeLocalizedText(
							headerRecord.secondaryCtaLabel,
						),
						secondaryCtaHref: normalizeString(headerRecord.secondaryCtaHref),
					});
				} else {
					setServicesHeader(structuredClone(EMPTY_PAGE_HEADER));
				}

				const normalized: ServiceListItem[] = rows.map((row) => {
					const record =
						row && typeof row === "object"
							? (row as Record<string, unknown>)
							: {};

					return {
						...normalizeService(row),
						_id: normalizeString(record._id),
					};
				});

				setServices(normalized);
			} catch (error) {
				console.error("[ServicesPage] Error loading services:", error);
				toast.error(
					lang === "es"
						? "No se pudieron cargar los servicios."
						: "Could not load services.",
				);
			} finally {
				setLoading(false);
			}
		}

		if (status !== "authenticated" || !hasAccess) {
			setLoading(false);
			return;
		}

		void loadServices();
	}, [status, hasAccess, toast, lang]);

	function goToCreatePage(): void {
		router.push("/admin/dashboard/services/new");
	}

	function requestDelete(id: string): void {
		setDeletingId(id);
		setDeleteConfirmOpen(true);
	}

	async function confirmDelete(): Promise<void> {
		if (!deletingId) return;

		try {
			setDeleting(true);

			const response = await fetch(`/api/admin/services/${deletingId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error(`HTTP_${response.status}`);
			}

			setServices((prev) => prev.filter((item) => item._id !== deletingId));

			toast.success(
				lang === "es"
					? "Servicio eliminado correctamente."
					: "Service deleted successfully.",
			);

			setDeleteConfirmOpen(false);
			setDeletingId(null);
		} catch (error) {
			console.error("[ServicesPage] Error deleting service:", error);
			toast.error(
				lang === "es"
					? "No se pudo eliminar el servicio."
					: "Could not delete service.",
			);
		} finally {
			setDeleting(false);
		}
	}

	function updateServicesHeaderField(
		field:
			| "eyebrow"
			| "title"
			| "subtitle"
			| "primaryCtaLabel"
			| "secondaryCtaLabel",
		localeKey: Locale,
		value: string,
	): void {
		setServicesHeader((prev) => ({
			...prev,
			[field]: {
				...prev[field],
				[localeKey]: value,
			},
		}));
	}

	async function handleSaveServicesHeader(): Promise<void> {
		try {
			setSaving(true);

			const response = await fetch("/api/admin/services", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ pageHeader: servicesHeader }),
			});

			if (!response.ok) {
				const errorBody: unknown = await response.json().catch(() => null);
				console.error(
					"[ServicesPage] Save services header error response:",
					errorBody,
				);
				throw new Error(`HTTP_${response.status}`);
			}

			toast.success(
				lang === "es"
					? "Cabecera de servicios guardada correctamente."
					: "Services header saved successfully.",
			);
		} catch (error) {
			console.error("[ServicesPage] Error saving services header:", error);
			toast.error(
				lang === "es"
					? "No se pudo guardar la cabecera de servicios."
					: "Could not save services header.",
			);
		} finally {
			setSaving(false);
		}
	}

	if (status === "loading") {
		return (
			<main className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
					{lang === "es" ? "Cargando sesión..." : "Loading session..."}
				</div>
			</main>
		);
	}

	if (!hasAccess) {
		return (
			<main className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
					{lang === "es"
						? "Acceso restringido a administradores."
						: "Admin access only."}
				</div>
			</main>
		);
	}

	if (loading) {
		return (
			<main className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
					{lang === "es" ? "Cargando servicios..." : "Loading services..."}
				</div>
			</main>
		);
	}

	return (
		<main className="space-y-6 px-6 pb-6">
			<AdminPageHeader
				icon={<BriefcaseBusiness className="h-7 w-7" />}
				eyebrow={lang === "es" ? "Sitio web / Servicios" : "Website / Services"}
				title={lang === "es" ? "Servicios" : "Services"}
				subtitle={
					lang === "es"
						? "Administra los servicios públicos del sitio."
						: "Manage the public website services."
				}
				actions={
					<PrimaryButton
						type="button"
						onClick={goToCreatePage}
						className="rounded-2xl px-5 py-3 text-white hover:text-white"
					>
						<span>{lang === "es" ? "Nuevo servicio" : "New service"}</span>
						<ArrowRight className="h-4 w-4" />
					</PrimaryButton>
				}
			/>

			<SectionCard
				title={
					lang === "es"
						? "Cabecera global de la página de servicios"
						: "Global services page header"
				}
				subtitle={
					lang === "es"
						? "Configura el contenido superior de /services una sola vez. Este contenido ya no forma parte de cada servicio individual."
						: "Configure the top content of /services once. This content no longer belongs to each individual service."
				}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Eyebrow ES</FieldLabel>
						<TextInput
							value={servicesHeader.eyebrow.es}
							onChange={(event) =>
								updateServicesHeaderField(
									"eyebrow",
									"es",
									event.currentTarget.value,
								)
							}
						/>
					</div>

					<div>
						<FieldLabel>Eyebrow EN</FieldLabel>
						<TextInput
							value={servicesHeader.eyebrow.en}
							onChange={(event) =>
								updateServicesHeaderField(
									"eyebrow",
									"en",
									event.currentTarget.value,
								)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Título superior ES</FieldLabel>
						<TextInput
							value={servicesHeader.title.es}
							onChange={(event) =>
								updateServicesHeaderField(
									"title",
									"es",
									event.currentTarget.value,
								)
							}
						/>
					</div>

					<div>
						<FieldLabel>Top title EN</FieldLabel>
						<TextInput
							value={servicesHeader.title.en}
							onChange={(event) =>
								updateServicesHeaderField(
									"title",
									"en",
									event.currentTarget.value,
								)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Subtítulo ES</FieldLabel>
						<TextArea
							value={servicesHeader.subtitle.es}
							onChange={(event) =>
								updateServicesHeaderField(
									"subtitle",
									"es",
									event.currentTarget.value,
								)
							}
						/>
					</div>

					<div>
						<FieldLabel>Subtitle EN</FieldLabel>
						<TextArea
							value={servicesHeader.subtitle.en}
							onChange={(event) =>
								updateServicesHeaderField(
									"subtitle",
									"en",
									event.currentTarget.value,
								)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>CTA principal ES</FieldLabel>
						<TextInput
							value={servicesHeader.primaryCtaLabel.es}
							onChange={(event) =>
								updateServicesHeaderField(
									"primaryCtaLabel",
									"es",
									event.currentTarget.value,
								)
							}
						/>
					</div>

					<div>
						<FieldLabel>Primary CTA EN</FieldLabel>
						<TextInput
							value={servicesHeader.primaryCtaLabel.en}
							onChange={(event) =>
								updateServicesHeaderField(
									"primaryCtaLabel",
									"en",
									event.currentTarget.value,
								)
							}
						/>
					</div>
				</div>

				<div>
					<FieldLabel>
						{lang === "es" ? "URL CTA principal" : "Primary CTA URL"}
					</FieldLabel>
					<TextInput
						value={servicesHeader.primaryCtaHref}
						onChange={(event) => {
							const value = event.currentTarget.value;

							setServicesHeader((prev) => ({
								...prev,
								primaryCtaHref: value,
							}));
						}}
						placeholder="/contact"
					/>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>CTA secundario ES</FieldLabel>
						<TextInput
							value={servicesHeader.secondaryCtaLabel.es}
							onChange={(event) =>
								updateServicesHeaderField(
									"secondaryCtaLabel",
									"es",
									event.currentTarget.value,
								)
							}
						/>
					</div>

					<div>
						<FieldLabel>Secondary CTA EN</FieldLabel>
						<TextInput
							value={servicesHeader.secondaryCtaLabel.en}
							onChange={(event) =>
								updateServicesHeaderField(
									"secondaryCtaLabel",
									"en",
									event.currentTarget.value,
								)
							}
						/>
					</div>
				</div>

				<div>
					<FieldLabel>
						{lang === "es" ? "URL CTA secundario" : "Secondary CTA URL"}
					</FieldLabel>
					<TextInput
						value={servicesHeader.secondaryCtaHref}
						onChange={(event) => {
							const value = event.currentTarget.value;

							setServicesHeader((prev) => ({
								...prev,
								secondaryCtaHref: value,
							}));
						}}
						placeholder="/projects"
					/>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<PrimaryButton
						type="button"
						disabled={saving}
						onClick={() => void handleSaveServicesHeader()}
					>
						<Save size={18} />
						<span>
							{saving
								? lang === "es"
									? "Guardando..."
									: "Saving..."
								: lang === "es"
									? "Guardar cabecera"
									: "Save header"}
						</span>
					</PrimaryButton>
				</div>
			</SectionCard>

			{sortedServices.length === 0 ? (
				<SectionCard
					title={lang === "es" ? "Sin servicios" : "No services yet"}
					subtitle={
						lang === "es"
							? "Todavía no existen servicios registrados en el sistema."
							: "There are no registered services yet."
					}
				>
					<div className="flex justify-start">
						<button
							type="button"
							onClick={goToCreatePage}
							className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft"
						>
							<Plus size={18} />
							<span>{lang === "es" ? "Crear primero" : "Create first"}</span>
						</button>
					</div>
				</SectionCard>
			) : (
				<div className="grid gap-4">
					{sortedServices.map((item) => (
						<div
							key={item._id || item.slug || `service-row-${item.order}`}
							className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
						>
							<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
								<div className="min-w-0 space-y-2">
									<div className="flex flex-wrap items-center gap-2">
										<h3 className="text-lg font-semibold text-text-primary">
											{lang === "es"
												? item.title.es || "(Sin título)"
												: item.title.en || item.title.es || "(Untitled)"}
										</h3>

										<span
											className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "published"
												? "bg-green-100 text-green-700"
												: "bg-amber-100 text-amber-700"
												}`}
										>
											{item.status === "published"
												? lang === "es"
													? "Publicado"
													: "Published"
												: lang === "es"
													? "Borrador"
													: "Draft"}
										</span>

										<span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-medium text-text-secondary">
											{item.category || "-"}
										</span>

										<span className="rounded-full bg-surface-soft px-2.5 py-1 text-xs font-medium text-text-secondary">
											{lang === "es" ? "Orden" : "Order"}: {item.order}
										</span>

										{item.featured ? (
											<span className="inline-flex items-center gap-1 rounded-full bg-brand-secondary px-2.5 py-1 text-xs font-medium text-text-primary">
												<Star size={12} />
												{lang === "es" ? "Destacado" : "Featured"}
											</span>
										) : (
											<span className="inline-flex items-center gap-1 rounded-full bg-surface-soft px-2.5 py-1 text-xs font-medium text-text-secondary">
												<StarOff size={12} />
												{lang === "es" ? "Normal" : "Standard"}
											</span>
										)}
									</div>

									<p className="text-sm text-text-secondary">
										{item.slug || "-"}
									</p>

									<p className="text-sm leading-6 text-text-secondary">
										{lang === "es"
											? item.summary.es || item.description.es || "-"
											: item.summary.en ||
											item.summary.es ||
											item.description.en ||
											item.description.es ||
											"-"}
									</p>
								</div>

								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => {
											if (!item._id) return;
											router.push(`/admin/dashboard/services/${item._id}`);
										}}
										className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft"
									>
										<Pencil size={16} />
										<span>{lang === "es" ? "Editar" : "Edit"}</span>
									</button>

									<button
										type="button"
										onClick={() => {
											if (!item._id) return;
											requestDelete(item._id);
										}}
										className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
									>
										<Trash2 size={16} />
										<span>{lang === "es" ? "Eliminar" : "Delete"}</span>
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
			<GlobalConfirm
				open={deleteConfirmOpen}
				title={lang === "es" ? "Eliminar servicio" : "Delete service"}
				message={
					lang === "es"
						? "Esta acción eliminará el servicio seleccionado. No se puede deshacer."
						: "This action will delete the selected service. It cannot be undone."
				}
				cancelLabel={lang === "es" ? "Cancelar" : "Cancel"}
				confirmLabel={lang === "es" ? "Eliminar" : "Delete"}
				loading={deleting}
				onCancel={() => {
					if (deleting) return;
					setDeleteConfirmOpen(false);
					setDeletingId(null);
				}}
				onConfirm={() => void confirmDelete()}
			/>
		</main>
	);
}