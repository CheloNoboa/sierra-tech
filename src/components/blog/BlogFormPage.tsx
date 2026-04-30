"use client";

/**
 * =============================================================================
 * 📄 Component: BlogFormPage
 * Path: src/components/blog/BlogFormPage.tsx
 * =============================================================================
 *
 * ES:
 * Formulario administrativo unificado para crear y editar artículos del Blog.
 *
 * Propósito:
 * - reemplazar el flujo anterior basado en BlogModal
 * - unificar create/edit en una sola pantalla
 * - mantener consistencia visual con Services, Projects y Maintenance
 *
 * Uso:
 * - mode="create" → /admin/dashboard/blog/new
 * - mode="edit"   → /admin/dashboard/blog/[id]
 *
 * Responsabilidades:
 * - inicializar formulario vacío en creación
 * - cargar artículo existente en edición
 * - validar campos mínimos
 * - guardar vía POST/PUT
 * - subir portada e imagen OG a R2
 * - generar imagen OG desde portada
 * - cargar clases de servicio como categorías
 * - cargar proyectos públicos relacionados
 * - proteger cambios sin guardar
 *
 * Reglas:
 * - sin modal
 * - sin any
 * - sin alert()
 * - sin window.confirm()
 * - una sola fuente de verdad: BlogPostFormValues
 *
 * EN:
 * Unified admin form for creating and editing Blog posts.
 * =============================================================================
 */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	FileText,
	ImagePlus,
	Loader2,
	Save,
	SearchCheck,
	Settings2,
	Star,
	Trash2,
} from "lucide-react";

import FormActionsHeader from "@/components/ui/FormActionsHeader";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

import {
	uploadAdminFile,
	type AdminUploadScope,
} from "@/lib/adminUploadsClient";

import type {
	BlogLocalizedText,
	BlogPost,
	BlogPostFormValues,
	BlogPostMutationResponse,
	BlogStatus,
} from "@/types/blog";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type BlogFormMode = "create" | "edit";
type Locale = "es" | "en";

type BlogFormPageProps = {
	mode: BlogFormMode;
	blogId?: string;
};

type BlogDetailResponse =
	| {
		ok: true;
		data: BlogPost;
	}
	| {
		ok: false;
		message?: string;
	};

interface GenerateOgResponse {
	ok: boolean;
	data?: {
		fileKey: string;
		fileName: string;
		extension: string;
		previewUrl: string;
	};
	message?: string;
}

interface RelatedProjectCandidate {
	_id: string;
	slug: string;
	title: BlogLocalizedText | null;
	summary: BlogLocalizedText | null;
	coverImage:
	| {
		url: string;
		alt?: BlogLocalizedText;
		storageKey?: string;
	}
	| string
	| null;
}

interface PublicProjectsResponse {
	ok: boolean;
	items?: RelatedProjectCandidate[];
	error?: string;
}

interface ServiceClassOption {
	_id: string;
	key: string;
	label: BlogLocalizedText;
	description: BlogLocalizedText;
	enabled: boolean;
	order: number;
}

interface ServiceClassesResponse {
	ok: boolean;
	items?: ServiceClassOption[];
	message?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function emptyLocalizedText(): BlogLocalizedText {
	return {
		es: "",
		en: "",
	};
}

function createEmptyForm(): BlogPostFormValues {
	return {
		slug: "",
		title: emptyLocalizedText(),
		excerpt: emptyLocalizedText(),
		content: emptyLocalizedText(),
		coverImage: "",
		gallery: [],
		category: "",
		tags: [],
		relatedProjectIds: [],
		status: "draft",
		featured: false,
		order: 0,
		seo: {
			metaTitle: emptyLocalizedText(),
			metaDescription: emptyLocalizedText(),
			ogImage: "",
		},
		createdBy: "",
	};
}

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function parseTags(value: string): string[] {
	return Array.from(
		new Set(
			value
				.split(",")
				.map((tag) => tag.trim())
				.filter((tag) => tag.length > 0),
		),
	);
}

function tagsToText(tags: string[]): string {
	return tags.join(", ");
}

function mapPostToFormValues(post: BlogPost): BlogPostFormValues {
	return {
		slug: post.slug ?? "",
		title: post.title ?? emptyLocalizedText(),
		excerpt: post.excerpt ?? emptyLocalizedText(),
		content: post.content ?? emptyLocalizedText(),
		coverImage: post.coverImage ?? "",
		gallery: Array.isArray(post.gallery) ? post.gallery : [],
		category: post.category ?? "",
		tags: Array.isArray(post.tags) ? post.tags : [],
		relatedProjectIds: Array.isArray(post.relatedProjectIds)
			? post.relatedProjectIds
			: [],
		status: post.status ?? "draft",
		featured: Boolean(post.featured),
		order: typeof post.order === "number" ? post.order : 0,
		seo: post.seo ?? {
			metaTitle: emptyLocalizedText(),
			metaDescription: emptyLocalizedText(),
			ogImage: "",
		},
		createdBy: post.createdBy ?? "",
	};
}

function buildPayload(form: BlogPostFormValues): BlogPostFormValues {
	return {
		...form,
		slug: slugify(form.slug),
		title: {
			es: form.title.es.trim(),
			en: form.title.en.trim(),
		},
		excerpt: {
			es: form.excerpt.es.trim(),
			en: form.excerpt.en.trim(),
		},
		content: {
			es: form.content.es.trim(),
			en: form.content.en.trim(),
		},
		coverImage: form.coverImage.trim(),
		category: form.category.trim(),
		tags: form.tags,
		relatedProjectIds: form.relatedProjectIds,
		seo: {
			metaTitle: {
				es: form.seo.metaTitle.es.trim(),
				en: form.seo.metaTitle.en.trim(),
			},
			metaDescription: {
				es: form.seo.metaDescription.es.trim(),
				en: form.seo.metaDescription.en.trim(),
			},
			ogImage: form.seo.ogImage.trim(),
		},
		createdBy: form.createdBy.trim(),
	};
}

function validateForm(form: BlogPostFormValues, lang: Locale): string[] {
	const errors: string[] = [];

	if (!slugify(form.slug)) {
		errors.push(lang === "es" ? "El slug es obligatorio." : "Slug is required.");
	}

	if (!form.title.es.trim() && !form.title.en.trim()) {
		errors.push(
			lang === "es"
				? "Debes ingresar al menos un título."
				: "You must enter at least one title.",
		);
	}

	if (!form.excerpt.es.trim() && !form.excerpt.en.trim()) {
		errors.push(
			lang === "es"
				? "Debes ingresar al menos un extracto."
				: "You must enter at least one excerpt.",
		);
	}

	if (!form.content.es.trim() && !form.content.en.trim()) {
		errors.push(
			lang === "es"
				? "Debes ingresar contenido en al menos un idioma."
				: "You must enter content in at least one language.",
		);
	}

	return errors;
}

function isRenderableImage(value: string): boolean {
	const safeValue = value.trim();
	return safeValue.startsWith("/") || safeValue.startsWith("http");
}

function buildAdminPreviewUrl(fileKey: string): string {
	return `/api/admin/uploads/view?key=${encodeURIComponent(fileKey)}`;
}

function getLocalizedText(
	value: BlogLocalizedText | null | undefined,
	locale: Locale,
): string {
	if (!value) return "";

	const primary = locale === "es" ? value.es : value.en;
	const fallback = locale === "es" ? value.en : value.es;

	return primary?.trim() || fallback?.trim() || "";
}

function resolveProjectCoverImage(
	value: RelatedProjectCandidate["coverImage"],
): string {
	if (!value) return "";

	if (typeof value === "string") {
		return value.trim();
	}

	if (typeof value.url === "string" && value.url.trim()) {
		return value.url.trim();
	}

	if (typeof value.storageKey === "string" && value.storageKey.trim()) {
		return value.storageKey.startsWith("admin/")
			? buildAdminPreviewUrl(value.storageKey)
			: value.storageKey;
	}

	return "";
}

function normalizeServiceClassKey(value: string): string {
	return value.trim();
}

function serialize(form: BlogPostFormValues, tagsInput: string): string {
	return JSON.stringify({
		form,
		tagsInput,
	});
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
	icon?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
				{icon ? (
					<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
						{icon}
					</div>
				) : null}

				<div className="min-w-0">
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

function FieldLabel({ children }: { children: React.ReactNode }) {
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
			className={`w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${props.className ?? ""
				}`}
		/>
	);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function BlogFormPage({ mode, blogId = "" }: BlogFormPageProps) {
	const router = useRouter();
	const toast = useToast();
	const { locale } = useTranslation();

	const lang: Locale = locale === "en" ? "en" : "es";
	const isEditMode = mode === "edit";

	const [form, setForm] = useState<BlogPostFormValues>(() => createEmptyForm());
	const [tagsInput, setTagsInput] = useState("");
	const [snapshot, setSnapshot] = useState(() =>
		serialize(createEmptyForm(), ""),
	);

	const [loading, setLoading] = useState(isEditMode);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

	const [uploadingCover, setUploadingCover] = useState(false);
	const [uploadingOgImage, setUploadingOgImage] = useState(false);
	const [generatingOgImage, setGeneratingOgImage] = useState(false);

	const [relatedProjects, setRelatedProjects] = useState<
		RelatedProjectCandidate[]
	>([]);
	const [loadingRelatedProjects, setLoadingRelatedProjects] = useState(false);

	const [serviceClasses, setServiceClasses] = useState<ServiceClassOption[]>([]);
	const [loadingServiceClasses, setLoadingServiceClasses] = useState(false);

	const coverInputRef = useRef<HTMLInputElement | null>(null);
	const ogInputRef = useRef<HTMLInputElement | null>(null);

	const t = useMemo(
		() => ({
			back: lang === "es" ? "Volver" : "Back",
			eyebrow: lang === "es" ? "Sitio web / Blog" : "Website / Blog",
			createTitle: lang === "es" ? "Nuevo artículo" : "New article",
			editTitle: lang === "es" ? "Editar artículo" : "Edit article",
			createSubtitle:
				lang === "es"
					? "Crea un artículo editorial bilingüe con portada, SEO, categoría y proyectos relacionados."
					: "Create a bilingual editorial article with cover, SEO, category and related projects.",
			editSubtitle:
				lang === "es"
					? "Edita contenido, publicación, SEO, portada y relaciones del artículo."
					: "Edit content, publication, SEO, cover image and article relations.",
			saveArticle: lang === "es" ? "Guardar artículo" : "Save article",
			createArticle: lang === "es" ? "Crear artículo" : "Create article",
			saving: lang === "es" ? "Guardando..." : "Saving...",
			loading: lang === "es" ? "Cargando artículo..." : "Loading article...",
			identity: lang === "es" ? "Identidad editorial" : "Editorial identity",
			identitySubtitle:
				lang === "es"
					? "Define slug, categoría, tags y orden editorial."
					: "Define slug, category, tags and editorial order.",
			relatedProjects:
				lang === "es" ? "Proyectos relacionados" : "Related projects",
			relatedProjectsSubtitle:
				lang === "es"
					? "Selecciona proyectos públicos que se mostrarán como relación editorial."
					: "Select public projects that will be displayed as editorial relations.",
			content: lang === "es" ? "Contenido bilingüe" : "Bilingual content",
			contentSubtitle:
				lang === "es"
					? "Título, extracto y contenido completo en español e inglés."
					: "Title, excerpt and full content in Spanish and English.",
			media: lang === "es" ? "Portada e imagen OG" : "Cover and OG image",
			mediaSubtitle:
				lang === "es"
					? "Administra la portada principal y la imagen social del artículo."
					: "Manage the main cover and social image for the article.",
			publication: lang === "es" ? "Publicación" : "Publication",
			publicationSubtitle:
				lang === "es"
					? "Controla estado, destacado, autor y orden."
					: "Control status, featured state, author and order.",
			seo: "SEO",
			seoSubtitle:
				lang === "es"
					? "Configura metadatos bilingües del artículo."
					: "Configure bilingual metadata for the article.",
			slug: "Slug",
			generateSlug:
				lang === "es" ? "Generar desde título" : "Generate from title",
			category: lang === "es" ? "Categoría" : "Category",
			selectCategory:
				lang === "es" ? "Selecciona una categoría" : "Select category",
			tags: "Tags",
			tagsHelp:
				lang === "es" ? "Separados por comas" : "Separated by commas",
			titleEs: "Título ES",
			titleEn: "Title EN",
			excerptEs: "Extracto ES",
			excerptEn: "Excerpt EN",
			contentEs: "Contenido ES",
			contentEn: "Content EN",
			coverImage: lang === "es" ? "Portada principal" : "Main cover",
			ogImage: lang === "es" ? "Imagen OG" : "OG image",
			uploadCover: lang === "es" ? "Subir portada" : "Upload cover",
			replaceCover:
				lang === "es" ? "Reemplazar portada" : "Replace cover",
			removeCover: lang === "es" ? "Quitar portada" : "Remove cover",
			uploadOg: lang === "es" ? "Subir imagen OG" : "Upload OG image",
			replaceOg:
				lang === "es" ? "Reemplazar imagen OG" : "Replace OG image",
			removeOg: lang === "es" ? "Quitar imagen OG" : "Remove OG image",
			generateOg: lang === "es" ? "Generar OG" : "Generate OG",
			regenerateOg: lang === "es" ? "Regenerar OG" : "Regenerate OG",
			uploading: lang === "es" ? "Subiendo..." : "Uploading...",
			generatingOg: lang === "es" ? "Generando..." : "Generating...",
			status: lang === "es" ? "Estado" : "Status",
			draft: lang === "es" ? "Borrador" : "Draft",
			published: lang === "es" ? "Publicado" : "Published",
			featured: lang === "es" ? "Destacado" : "Featured",
			yes: lang === "es" ? "Sí" : "Yes",
			no: lang === "es" ? "No" : "No",
			order: lang === "es" ? "Orden" : "Order",
			createdBy: lang === "es" ? "Creado por" : "Created by",
			metaTitleEs: "Meta title ES",
			metaTitleEn: "Meta title EN",
			metaDescriptionEs: "Meta description ES",
			metaDescriptionEn: "Meta description EN",
			loadError:
				lang === "es"
					? "No se pudo cargar el artículo."
					: "Could not load the article.",
			saveError:
				lang === "es"
					? "No se pudo guardar el artículo."
					: "Could not save the article.",
			saveSuccess:
				lang === "es"
					? "Artículo guardado correctamente."
					: "Article saved successfully.",
			createSuccess:
				lang === "es"
					? "Artículo creado correctamente."
					: "Article created successfully.",
			uploadFailed:
				lang === "es"
					? "No se pudo subir el archivo."
					: "Could not upload the file.",
			invalidFile:
				lang === "es"
					? "Debes seleccionar un archivo válido."
					: "You must select a valid file.",
			generateOgFailed:
				lang === "es"
					? "No se pudo generar la imagen OG."
					: "Could not generate OG image.",
			generateOgNeedsCover:
				lang === "es"
					? "Primero debes subir la portada."
					: "You must upload a cover first.",
			loadingProjects:
				lang === "es" ? "Cargando proyectos..." : "Loading projects...",
			noProjects:
				lang === "es"
					? "No hay proyectos públicos disponibles."
					: "No public projects available.",
			loadingServiceClasses:
				lang === "es"
					? "Cargando clases de servicio..."
					: "Loading service classes...",
			noServiceClasses:
				lang === "es"
					? "No hay clases de servicio disponibles."
					: "No service classes available.",
			unsavedTitle:
				lang === "es" ? "Cambios sin guardar" : "Unsaved changes",
			unsavedMessage:
				lang === "es"
					? "Tienes cambios sin guardar. Si sales ahora, perderás los cambios realizados."
					: "You have unsaved changes. If you leave now, your changes will be lost.",
			stay: lang === "es" ? "Seguir editando" : "Keep editing",
			leave: lang === "es" ? "Salir sin guardar" : "Leave without saving",
			changes: lang === "es" ? "Cambios" : "Changes",
			unsaved: lang === "es" ? "Sin guardar" : "Unsaved",
			saved: lang === "es" ? "Guardado" : "Saved",
		}),
		[lang],
	);

	const currentSnapshot = useMemo(
		() => serialize(form, tagsInput),
		[form, tagsInput],
	);

	const hasChanges = currentSnapshot !== snapshot;

	const canSave = useMemo(() => {
		if (loading || saving || uploadingCover || uploadingOgImage || generatingOgImage) {
			return false;
		}

		return hasChanges;
	}, [
		generatingOgImage,
		hasChanges,
		loading,
		saving,
		uploadingCover,
		uploadingOgImage,
	]);

	const pageTitle = isEditMode ? t.editTitle : t.createTitle;
	const pageSubtitle = isEditMode ? t.editSubtitle : t.createSubtitle;
	const statusLabel = form.status === "published" ? t.published : t.draft;

	const selectedCategoryOption = useMemo(() => {
		return serviceClasses.find((item) => item.key === form.category) ?? null;
	}, [form.category, serviceClasses]);

	const showLegacyCategoryOption =
		Boolean(form.category.trim()) && !selectedCategoryOption;

	const patchForm = useCallback(
		(updater: (current: BlogPostFormValues) => BlogPostFormValues) => {
			setForm((current) => updater(current));
		},
		[],
	);

	const handleBack = useCallback(() => {
		if (hasChanges && !saving) {
			setLeaveConfirmOpen(true);
			return;
		}

		router.push("/admin/dashboard/blog");
	}, [hasChanges, router, saving]);

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
		if (!isEditMode) {
			const emptyForm = createEmptyForm();
			setForm(emptyForm);
			setTagsInput("");
			setSnapshot(serialize(emptyForm, ""));
			setLoading(false);
			return;
		}

		let cancelled = false;

		async function loadPost() {
			if (!blogId.trim()) {
				toast.error(t.loadError);
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setErrors([]);

				const response = await fetch(`/api/admin/blog/${blogId}`, {
					method: "GET",
					cache: "no-store",
				});

				const result = (await response
					.json()
					.catch(() => null)) as BlogDetailResponse | null;

				if (cancelled) return;

				if (!response.ok || !result || !result.ok) {
					const message = result && !result.ok ? result.message : t.loadError;
					throw new Error(message || t.loadError);
				}

				const nextForm = mapPostToFormValues(result.data);
				const nextTagsInput = tagsToText(nextForm.tags);

				setForm(nextForm);
				setTagsInput(nextTagsInput);
				setSnapshot(serialize(nextForm, nextTagsInput));
			} catch (error) {
				if (!cancelled) {
					const message = error instanceof Error ? error.message : t.loadError;
					setErrors([message]);
					toast.error(message);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void loadPost();

		return () => {
			cancelled = true;
		};
	}, [blogId, isEditMode, t.loadError, toast]);

	useEffect(() => {
		let cancelled = false;

		async function loadRelatedProjects() {
			try {
				setLoadingRelatedProjects(true);

				const response = await fetch("/api/public/projects", {
					method: "GET",
					cache: "no-store",
				});

				const result = (await response
					.json()
					.catch(() => null)) as PublicProjectsResponse | null;

				if (cancelled) return;

				if (!response.ok || !result?.ok) {
					setRelatedProjects([]);
					return;
				}

				setRelatedProjects(Array.isArray(result.items) ? result.items : []);
			} catch {
				if (!cancelled) {
					setRelatedProjects([]);
				}
			} finally {
				if (!cancelled) {
					setLoadingRelatedProjects(false);
				}
			}
		}

		void loadRelatedProjects();

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadServiceClasses() {
			try {
				setLoadingServiceClasses(true);

				const response = await fetch("/api/admin/service-classes", {
					method: "GET",
					cache: "no-store",
				});

				const result = (await response
					.json()
					.catch(() => null)) as ServiceClassesResponse | null;

				if (cancelled) return;

				if (!response.ok || !result?.ok) {
					setServiceClasses([]);
					return;
				}

				setServiceClasses(
					Array.isArray(result.items)
						? result.items
							.filter((item) => item.enabled)
							.sort((a, b) => a.order - b.order)
						: [],
				);
			} catch {
				if (!cancelled) {
					setServiceClasses([]);
				}
			} finally {
				if (!cancelled) {
					setLoadingServiceClasses(false);
				}
			}
		}

		void loadServiceClasses();

		return () => {
			cancelled = true;
		};
	}, []);

	function handleGenerateSlug() {
		const source = form.title.es || form.title.en || "";

		patchForm((current) => ({
			...current,
			slug: slugify(source),
		}));
	}

	function handleToggleRelatedProject(projectId: string) {
		patchForm((current) => {
			const exists = current.relatedProjectIds.includes(projectId);

			return {
				...current,
				relatedProjectIds: exists
					? current.relatedProjectIds.filter((id) => id !== projectId)
					: [...current.relatedProjectIds, projectId],
			};
		});
	}

	async function handleUploadAsset(
		file: File | null,
		scope: AdminUploadScope,
		target: "cover" | "og",
	) {
		if (!file) {
			setErrors([t.invalidFile]);
			return;
		}

		try {
			setErrors([]);

			if (target === "cover") {
				setUploadingCover(true);
			} else {
				setUploadingOgImage(true);
			}

			const result = await uploadAdminFile(file, scope);

			if (!result.ok || !result.file?.fileKey) {
				setErrors([result.message || t.uploadFailed]);
				return;
			}

			const previewUrl = buildAdminPreviewUrl(result.file.fileKey);

			if (target === "cover") {
				patchForm((current) => ({
					...current,
					coverImage: previewUrl,
				}));
				return;
			}

			patchForm((current) => ({
				...current,
				seo: {
					...current.seo,
					ogImage: previewUrl,
				},
			}));
		} finally {
			setUploadingCover(false);
			setUploadingOgImage(false);

			if (coverInputRef.current) coverInputRef.current.value = "";
			if (ogInputRef.current) ogInputRef.current.value = "";
		}
	}

	async function handleGenerateOgFromCover() {
		if (!form.coverImage.trim()) {
			setErrors([t.generateOgNeedsCover]);
			return;
		}

		try {
			setErrors([]);
			setGeneratingOgImage(true);

			const response = await fetch("/api/admin/blog/generate-og", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title: form.title.es.trim() || form.title.en.trim(),
					category: form.category.trim(),
					coverImage: form.coverImage,
				}),
			});

			const result = (await response
				.json()
				.catch(() => null)) as GenerateOgResponse | null;

			if (!response.ok || !result?.ok || !result.data?.previewUrl) {
				throw new Error(result?.message || t.generateOgFailed);
			}

			patchForm((current) => ({
				...current,
				seo: {
					...current.seo,
					ogImage: result.data?.previewUrl ?? "",
				},
			}));
		} catch (error) {
			setErrors([error instanceof Error ? error.message : t.generateOgFailed]);
		} finally {
			setGeneratingOgImage(false);
		}
	}

	async function handleSave() {
		if (!canSave) return;

		const normalizedForm: BlogPostFormValues = {
			...form,
			slug: slugify(form.slug),
			tags: parseTags(tagsInput),
		};

		const validationErrors = validateForm(normalizedForm, lang);

		if (validationErrors.length > 0) {
			setErrors(validationErrors);
			return;
		}

		try {
			setSaving(true);
			setErrors([]);

			const payload = buildPayload(normalizedForm);

			const endpoint = isEditMode
				? `/api/admin/blog/${blogId}`
				: "/api/admin/blog";

			const response = await fetch(endpoint, {
				method: isEditMode ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const result = (await response
				.json()
				.catch(() => null)) as BlogPostMutationResponse | null;

			if (!response.ok || !result?.ok || !result.data) {
				const safeErrors =
					result && Array.isArray(result.errors) && result.errors.length > 0
						? result.errors
						: [result?.message || t.saveError];

				setErrors(safeErrors);
				return;
			}

			const nextForm = mapPostToFormValues(result.data);
			const nextTagsInput = tagsToText(nextForm.tags);

			setForm(nextForm);
			setTagsInput(nextTagsInput);
			setSnapshot(serialize(nextForm, nextTagsInput));

			toast.success(isEditMode ? t.saveSuccess : t.createSuccess);

			if (!isEditMode) {
				router.push(`/admin/dashboard/blog/${result.data._id}`);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : t.saveError;
			setErrors([message]);
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="space-y-6 px-6 pb-24">
				<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
					<div className="flex items-center gap-3 text-sm text-text-secondary">
						<Loader2 className="h-4 w-4 animate-spin" />
						{t.loading}
					</div>
				</section>
			</div>
		);
	}

	return (
		<div className="space-y-6 px-6 pb-24">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="max-w-3xl space-y-4">
						<button
							type="button"
							onClick={handleBack}
							className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
						>
							<ArrowLeft className="h-4 w-4" />
							{t.back}
						</button>

						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
							{t.eyebrow}
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-text-primary">
							{pageTitle}
						</h1>

						<p className="text-base leading-8 text-text-secondary">
							{pageSubtitle}
						</p>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={() => void handleSave()}
							disabled={!canSave}
							className="inline-flex items-center gap-2 rounded-2xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryStrong disabled:cursor-not-allowed disabled:opacity-50"
						>
							{saving ? (
								t.saving
							) : (
								<>
									<Save className="h-4 w-4" />
									{isEditMode ? t.saveArticle : t.createArticle}
									{!isEditMode ? <ArrowRight className="h-4 w-4" /> : null}
								</>
							)}
						</button>
					</div>
				</div>

				<div className="mt-6 grid gap-3 md:grid-cols-4">
					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						{t.status}:{" "}
						<strong className="text-text-primary">{statusLabel}</strong>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						Slug:{" "}
						<strong className="text-text-primary">
							{form.slug || "—"}
						</strong>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						{t.category}:{" "}
						<strong className="text-text-primary">
							{selectedCategoryOption
								? getLocalizedText(selectedCategoryOption.label, lang)
								: form.category || "—"}
						</strong>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						{t.changes}:{" "}
						<strong
							className={hasChanges ? "text-amber-700" : "text-emerald-700"}
						>
							{hasChanges ? t.unsaved : t.saved}
						</strong>
					</div>
				</div>
			</section>

			{errors.length > 0 ? (
				<section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
					<ul className="space-y-1 text-sm font-semibold text-rose-700">
						{errors.map((error) => (
							<li key={error}>• {error}</li>
						))}
					</ul>
				</section>
			) : null}

			<SectionCard
				title={t.identity}
				subtitle={t.identitySubtitle}
				icon={<FileText className="h-5 w-5" />}
			>
				<div className="grid gap-5 xl:grid-cols-12">
					<div className="xl:col-span-7">
						<FieldLabel>{t.slug}</FieldLabel>
						<TextInput
							value={form.slug}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									slug: event.currentTarget.value,
								}))
							}
							onBlur={() =>
								patchForm((current) => ({
									...current,
									slug: slugify(current.slug),
								}))
							}
						/>
					</div>

					<div className="flex items-end xl:col-span-5">
						<button
							type="button"
							onClick={handleGenerateSlug}
							className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-text-primary transition hover:bg-surface-soft"
						>
							{t.generateSlug}
						</button>
					</div>

					<div className="xl:col-span-6">
						<FieldLabel>{t.category}</FieldLabel>
						<select
							value={form.category}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									category: normalizeServiceClassKey(event.currentTarget.value),
								}))
							}
							disabled={loadingServiceClasses}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="">{t.selectCategory}</option>

							{showLegacyCategoryOption ? (
								<option value={form.category}>{form.category}</option>
							) : null}

							{serviceClasses.map((item) => (
								<option key={item._id} value={item.key}>
									{getLocalizedText(item.label, lang)}
								</option>
							))}
						</select>

						<p className="mt-2 text-xs text-text-muted">
							{loadingServiceClasses
								? t.loadingServiceClasses
								: serviceClasses.length === 0
									? t.noServiceClasses
									: ""}
						</p>
					</div>

					<div className="xl:col-span-6">
						<FieldLabel>{t.tags}</FieldLabel>
						<TextInput
							value={tagsInput}
							onChange={(event) => setTagsInput(event.currentTarget.value)}
							placeholder={t.tagsHelp}
						/>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={t.relatedProjects}
				subtitle={t.relatedProjectsSubtitle}
				icon={<SearchCheck className="h-5 w-5" />}
			>
				{loadingRelatedProjects ? (
					<div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-secondary">
						{t.loadingProjects}
					</div>
				) : relatedProjects.length === 0 ? (
					<div className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-text-secondary">
						{t.noProjects}
					</div>
				) : (
					<div className="grid gap-4 xl:grid-cols-2">
						{relatedProjects.map((project) => {
							const isSelected = form.relatedProjectIds.includes(project._id);
							const projectTitle =
								getLocalizedText(project.title, lang) || project.slug;
							const projectSummary = getLocalizedText(project.summary, lang);
							const projectCover = resolveProjectCoverImage(project.coverImage);

							return (
								<button
									key={project._id}
									type="button"
									onClick={() => handleToggleRelatedProject(project._id)}
									className={`overflow-hidden rounded-3xl border text-left transition ${isSelected
										? "border-brand-primaryStrong bg-brand-primary/5 shadow-sm"
										: "border-border bg-white hover:bg-surface-soft"
										}`}
								>
									<div className="grid min-h-[140px] grid-cols-[140px_minmax(0,1fr)]">
										<div className="relative bg-surface">
											{projectCover && isRenderableImage(projectCover) ? (
												<Image
													src={projectCover}
													alt={projectTitle}
													fill
													unoptimized
													className="object-cover"
													sizes="140px"
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center text-text-muted">
													<ImagePlus className="h-6 w-6" />
												</div>
											)}
										</div>

										<div className="p-4">
											<div className="flex items-start justify-between gap-3">
												<div>
													<p className="text-sm font-semibold text-text-primary">
														{projectTitle}
													</p>
													<p className="mt-1 text-xs text-text-muted">
														/{project.slug}
													</p>
												</div>

												<div
													className={`h-4 w-4 rounded-full border ${isSelected
														? "border-brand-primaryStrong bg-brand-primaryStrong"
														: "border-border bg-white"
														}`}
												/>
											</div>

											{projectSummary ? (
												<p className="mt-3 line-clamp-3 text-sm leading-6 text-text-secondary">
													{projectSummary}
												</p>
											) : null}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				)}
			</SectionCard>

			<SectionCard
				title={t.content}
				subtitle={t.contentSubtitle}
				icon={<Settings2 className="h-5 w-5" />}
			>
				<div className="grid gap-5 xl:grid-cols-2">
					<div>
						<FieldLabel>{t.titleEs}</FieldLabel>
						<TextInput
							value={form.title.es}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									title: {
										...current.title,
										es: event.currentTarget.value,
									},
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{t.titleEn}</FieldLabel>
						<TextInput
							value={form.title.en}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									title: {
										...current.title,
										en: event.currentTarget.value,
									},
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{t.excerptEs}</FieldLabel>
						<TextArea
							rows={4}
							value={form.excerpt.es}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									excerpt: {
										...current.excerpt,
										es: event.currentTarget.value,
									},
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{t.excerptEn}</FieldLabel>
						<TextArea
							rows={4}
							value={form.excerpt.en}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									excerpt: {
										...current.excerpt,
										en: event.currentTarget.value,
									},
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{t.contentEs}</FieldLabel>
						<TextArea
							rows={10}
							value={form.content.es}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									content: {
										...current.content,
										es: event.currentTarget.value,
									},
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{t.contentEn}</FieldLabel>
						<TextArea
							rows={10}
							value={form.content.en}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									content: {
										...current.content,
										en: event.currentTarget.value,
									},
								}))
							}
						/>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={t.media}
				subtitle={t.mediaSubtitle}
				icon={<ImagePlus className="h-5 w-5" />}
			>
				<div className="grid gap-6 xl:grid-cols-2">
					<div className="space-y-3">
						<FieldLabel>{t.coverImage}</FieldLabel>

						<div className="overflow-hidden rounded-3xl border border-border bg-surface">
							<div className="flex aspect-[16/9] items-center justify-center bg-surface-soft">
								{form.coverImage && isRenderableImage(form.coverImage) ? (
									<div className="relative h-full w-full">
										<Image
											src={form.coverImage}
											alt={t.coverImage}
											fill
											sizes="(max-width: 1280px) 100vw, 50vw"
											className="object-cover"
											unoptimized
										/>
									</div>
								) : (
									<div className="flex flex-col items-center justify-center gap-2 text-text-muted">
										<ImagePlus className="h-8 w-8" />
										<span className="text-sm">{t.coverImage}</span>
									</div>
								)}
							</div>

							<div className="flex flex-wrap gap-3 border-t border-border bg-white p-4">
								<input
									ref={coverInputRef}
									type="file"
									accept="image/*"
									onChange={(event) =>
										void handleUploadAsset(
											event.currentTarget.files?.[0] ?? null,
											"blog/covers",
											"cover",
										)
									}
									className="hidden"
								/>

								<button
									type="button"
									onClick={() => coverInputRef.current?.click()}
									disabled={uploadingCover}
									className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
								>
									{uploadingCover ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<ImagePlus className="h-4 w-4" />
									)}
									{uploadingCover
										? t.uploading
										: form.coverImage
											? t.replaceCover
											: t.uploadCover}
								</button>

								{form.coverImage ? (
									<button
										type="button"
										onClick={() =>
											patchForm((current) => ({
												...current,
												coverImage: "",
											}))
										}
										className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
									>
										<Trash2 className="h-4 w-4" />
										{t.removeCover}
									</button>
								) : null}
							</div>
						</div>
					</div>

					<div className="space-y-3">
						<FieldLabel>{t.ogImage}</FieldLabel>

						<div className="overflow-hidden rounded-3xl border border-border bg-surface">
							<div className="flex aspect-[16/9] items-center justify-center bg-surface-soft">
								{form.seo.ogImage && isRenderableImage(form.seo.ogImage) ? (
									<div className="relative h-full w-full">
										<Image
											src={form.seo.ogImage}
											alt={t.ogImage}
											fill
											sizes="(max-width: 1280px) 100vw, 50vw"
											className="object-cover"
											unoptimized
										/>
									</div>
								) : (
									<div className="flex flex-col items-center justify-center gap-2 text-text-muted">
										<ImagePlus className="h-8 w-8" />
										<span className="text-sm">{t.ogImage}</span>
									</div>
								)}
							</div>

							<div className="flex flex-wrap gap-3 border-t border-border bg-white p-4">
								<input
									ref={ogInputRef}
									type="file"
									accept="image/*"
									onChange={(event) =>
										void handleUploadAsset(
											event.currentTarget.files?.[0] ?? null,
											"blog/seo",
											"og",
										)
									}
									className="hidden"
								/>

								<button
									type="button"
									onClick={() => ogInputRef.current?.click()}
									disabled={uploadingOgImage}
									className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
								>
									{uploadingOgImage ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<ImagePlus className="h-4 w-4" />
									)}
									{uploadingOgImage
										? t.uploading
										: form.seo.ogImage
											? t.replaceOg
											: t.uploadOg}
								</button>

								<button
									type="button"
									onClick={() => void handleGenerateOgFromCover()}
									disabled={!form.coverImage || generatingOgImage}
									className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-60"
								>
									{generatingOgImage ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<ImagePlus className="h-4 w-4" />
									)}
									{generatingOgImage
										? t.generatingOg
										: form.seo.ogImage
											? t.regenerateOg
											: t.generateOg}
								</button>

								{form.seo.ogImage ? (
									<button
										type="button"
										onClick={() =>
											patchForm((current) => ({
												...current,
												seo: {
													...current.seo,
													ogImage: "",
												},
											}))
										}
										className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
									>
										<Trash2 className="h-4 w-4" />
										{t.removeOg}
									</button>
								) : null}
							</div>
						</div>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={t.publication}
				subtitle={t.publicationSubtitle}
				icon={<Star className="h-5 w-5" />}
			>
				<div className="grid gap-5 xl:grid-cols-12">
					<div className="xl:col-span-4">
						<FieldLabel>{t.status}</FieldLabel>
						<select
							value={form.status}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									status: event.currentTarget.value as BlogStatus,
								}))
							}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="draft">{t.draft}</option>
							<option value="published">{t.published}</option>
						</select>
					</div>

					<div className="xl:col-span-4">
						<FieldLabel>{t.featured}</FieldLabel>
						<select
							value={form.featured ? "true" : "false"}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									featured: event.currentTarget.value === "true",
								}))
							}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="false">{t.no}</option>
							<option value="true">{t.yes}</option>
						</select>
					</div>

					<div className="xl:col-span-4">
						<FieldLabel>{t.order}</FieldLabel>
						<TextInput
							type="number"
							min={0}
							value={form.order}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									order: Number.isFinite(Number(event.currentTarget.value))
										? Number(event.currentTarget.value)
										: 0,
								}))
							}
						/>
					</div>

					{!isEditMode ? (
						<div className="xl:col-span-12">
							<FieldLabel>{t.createdBy}</FieldLabel>
							<TextInput
								value={form.createdBy}
								onChange={(event) =>
									patchForm((current) => ({
										...current,
										createdBy: event.currentTarget.value,
									}))
								}
							/>
						</div>
					) : null}
				</div>
			</SectionCard>

			<SectionCard title={t.seo} subtitle={t.seoSubtitle}>
				<div className="grid gap-5 xl:grid-cols-2">
					<div>
						<FieldLabel>{t.metaTitleEs}</FieldLabel>
						<TextInput
							value={form.seo.metaTitle.es}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									seo: {
										...current.seo,
										metaTitle: {
											...current.seo.metaTitle,
											es: event.currentTarget.value,
										},
									},
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{t.metaTitleEn}</FieldLabel>
						<TextInput
							value={form.seo.metaTitle.en}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									seo: {
										...current.seo,
										metaTitle: {
											...current.seo.metaTitle,
											en: event.currentTarget.value,
										},
									},
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{t.metaDescriptionEs}</FieldLabel>
						<TextArea
							rows={4}
							value={form.seo.metaDescription.es}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									seo: {
										...current.seo,
										metaDescription: {
											...current.seo.metaDescription,
											es: event.currentTarget.value,
										},
									},
								}))
							}
						/>
					</div>

					<div>
						<FieldLabel>{t.metaDescriptionEn}</FieldLabel>
						<TextArea
							rows={4}
							value={form.seo.metaDescription.en}
							onChange={(event) =>
								patchForm((current) => ({
									...current,
									seo: {
										...current.seo,
										metaDescription: {
											...current.seo.metaDescription,
											en: event.currentTarget.value,
										},
									},
								}))
							}
						/>
					</div>
				</div>
			</SectionCard>

			<FormActionsHeader
				backLabel={t.back}
				saveLabel={isEditMode ? t.saveArticle : t.createArticle}
				savingLabel={t.saving}
				isSaving={saving}
				canSave={canSave}
				statusLabel={`${statusLabel} · ${hasChanges ? t.unsaved : t.saved}`}
				onBack={handleBack}
				onSave={handleSave}
			/>

			<GlobalConfirm
				open={leaveConfirmOpen}
				title={t.unsavedTitle}
				message={t.unsavedMessage}
				cancelLabel={t.stay}
				confirmLabel={t.leave}
				loading={false}
				onCancel={() => setLeaveConfirmOpen(false)}
				onConfirm={() => {
					setLeaveConfirmOpen(false);
					router.push("/admin/dashboard/blog");
				}}
			/>
		</div>
	);
}