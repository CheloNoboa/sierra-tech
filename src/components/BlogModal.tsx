"use client";

/**
 * =============================================================================
 * 📄 Component: BlogModal
 * Path: src/components/BlogModal.tsx
 * =============================================================================
 *
 * ES:
 *   Modal administrativa oficial del módulo Blog para Sierra Tech.
 *
 *   Responsabilidades:
 *   - crear artículos nuevos
 *   - editar artículos existentes
 *   - validar campos mínimos requeridos
 *   - normalizar datos antes de enviar
 *   - subir portada y OG image a R2 mediante el flujo admin oficial
 *   - mantener un formulario bilingüe estable
 *   - advertir correctamente cuando existan cambios sin guardar
 *   - resolver categoría desde Clases de servicio
 *
 *   Decisiones:
 *   - create y edit comparten el mismo formulario
 *   - portada y OG image se cargan mediante upload administrativo real
 *   - no se aceptan rutas manuales ni URLs externas arbitrarias como flujo normal
 *   - gallery queda para la siguiente iteración
 *   - tags se editan como texto separado por comas
 *   - el slug puede autogenerarse desde el título si está vacío
 *   - `publishedAt` no se edita aquí; lo controla el modelo
 *   - `createdBy` solo se edita en creación; en edición el backend actual no lo actualiza
 *
 *   Nota:
 *   - este modal sigue el estándar de media administrada en R2
 *   - la siguiente evolución natural es gallery múltiple con reorder
 * =============================================================================
 */

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	AlertTriangle,
	ImagePlus,
	Loader2,
	Save,
	Trash2,
	X,
} from "lucide-react";

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
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

interface BlogModalProps {
	mode: "create" | "edit";
	open: boolean;
	locale?: "es" | "en";
	initialData?: BlogPost | null;
	onClose: () => void;
	onSuccess: (post: BlogPost) => void;
}

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
	title:
	| {
		es: string;
		en: string;
	}
	| null;
	summary:
	| {
		es: string;
		en: string;
	}
	| null;
	coverImage:
	| {
		url: string;
		alt?: {
			es: string;
			en: string;
		};
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
	label: {
		es: string;
		en: string;
	};
	description: {
		es: string;
		en: string;
	};
	enabled: boolean;
	order: number;
}

interface ServiceClassesResponse {
	ok: boolean;
	items?: ServiceClassOption[];
	message?: string;
}

interface SnapshotState {
	form: BlogPostFormValues;
	tagsInput: string;
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
				.filter((tag) => tag.length > 0)
		)
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

function buildPayload(form: BlogPostFormValues) {
	return {
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
		gallery: form.gallery,
		category: form.category.trim(),
		tags: form.tags,
		relatedProjectIds: form.relatedProjectIds,
		status: form.status,
		featured: form.featured,
		order: form.order,
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

function validateForm(
	form: BlogPostFormValues,
	language: "es" | "en"
): string[] {
	const errors: string[] = [];

	const titleEs = form.title.es.trim();
	const titleEn = form.title.en.trim();
	const excerptEs = form.excerpt.es.trim();
	const excerptEn = form.excerpt.en.trim();
	const contentEs = form.content.es.trim();
	const contentEn = form.content.en.trim();
	const slug = slugify(form.slug);

	if (!slug) {
		errors.push(
			language === "es" ? "El slug es obligatorio." : "Slug is required."
		);
	}

	if (!titleEs && !titleEn) {
		errors.push(
			language === "es"
				? "Debes ingresar al menos un título."
				: "You must enter at least one title."
		);
	}

	if (!excerptEs && !excerptEn) {
		errors.push(
			language === "es"
				? "Debes ingresar al menos un extracto."
				: "You must enter at least one excerpt."
		);
	}

	if (!contentEs && !contentEn) {
		errors.push(
			language === "es"
				? "Debes ingresar contenido en al menos un idioma."
				: "You must enter content in at least one language."
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

function extractAdminFileKeyFromPreviewUrl(value: string): string {
	if (!value.trim()) {
		return "";
	}

	const safeValue = value.trim();
	const keyMatch = safeValue.match(/[?&]key=([^&]+)/);

	return keyMatch?.[1] ? decodeURIComponent(keyMatch[1]) : "";
}

function extractFileNameFromFileKey(fileKey: string): string {
	if (!fileKey.trim()) {
		return "";
	}

	const parts = fileKey.trim().split("/");
	return parts[parts.length - 1] ?? "";
}

function getLocalizedProjectText(
	value: { es: string; en: string } | null | undefined,
	locale: "es" | "en"
): string {
	if (!value) {
		return "";
	}

	const primary = locale === "es" ? value.es : value.en;
	const fallback = locale === "es" ? value.en : value.es;

	return primary?.trim() || fallback?.trim() || "";
}

function resolveProjectCoverImage(
	value: RelatedProjectCandidate["coverImage"]
): string {
	if (!value) {
		return "";
	}

	if (typeof value === "string") {
		return value.trim();
	}

	if (typeof value.url === "string" && value.url.trim()) {
		return value.url.trim();
	}

	if (typeof value.storageKey === "string" && value.storageKey.trim()) {
		const storageKey = value.storageKey.trim();

		if (storageKey.startsWith("admin/")) {
			return buildAdminPreviewUrl(storageKey);
		}

		return storageKey;
	}

	return "";
}

function stableStringify(value: unknown): string {
	return JSON.stringify(value);
}

function normalizeServiceClassKey(value: string): string {
	return value.trim();
}

function createSnapshot(form: BlogPostFormValues, tagsInput: string): string {
	return stableStringify({
		form,
		tagsInput,
	} satisfies SnapshotState);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function BlogModal({
	mode,
	open,
	locale = "es",
	initialData,
	onClose,
	onSuccess,
}: BlogModalProps) {
	const [form, setForm] = useState<BlogPostFormValues>(createEmptyForm());
	const [tagsInput, setTagsInput] = useState<string>("");
	const [errors, setErrors] = useState<string[]>([]);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);
	const [isUploadingOgImage, setIsUploadingOgImage] = useState<boolean>(false);
	const [isGeneratingOgImage, setIsGeneratingOgImage] = useState<boolean>(false);

	const [relatedProjects, setRelatedProjects] = useState<RelatedProjectCandidate[]>(
		[]
	);
	const [isLoadingRelatedProjects, setIsLoadingRelatedProjects] =
		useState<boolean>(false);

	const [serviceClasses, setServiceClasses] = useState<ServiceClassOption[]>([]);
	const [isLoadingServiceClasses, setIsLoadingServiceClasses] =
		useState<boolean>(false);

	const [initialSnapshot, setInitialSnapshot] = useState<string>("");
	const [isForceClosing, setIsForceClosing] = useState<boolean>(false);
	const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

	const coverInputRef = useRef<HTMLInputElement | null>(null);
	const ogInputRef = useRef<HTMLInputElement | null>(null);

	const coverFileLabel = extractFileNameFromFileKey(
		extractAdminFileKeyFromPreviewUrl(form.coverImage)
	);

	const ogFileLabel = extractFileNameFromFileKey(
		extractAdminFileKeyFromPreviewUrl(form.seo.ogImage)
	);

	const labels = useMemo(() => {
		return {
			createTitle: locale === "es" ? "Nuevo artículo" : "New article",
			editTitle: locale === "es" ? "Editar artículo" : "Edit article",
			close: locale === "es" ? "Cerrar" : "Close",
			cancel: locale === "es" ? "Cancelar" : "Cancel",
			save: locale === "es" ? "Guardar" : "Save",
			saving: locale === "es" ? "Guardando..." : "Saving...",
			identity: locale === "es" ? "Identidad" : "Identity",
			content: locale === "es" ? "Contenido" : "Content",
			publication: locale === "es" ? "Publicación" : "Publication",
			seo: locale === "es" ? "SEO" : "SEO",
			media: locale === "es" ? "Media" : "Media",
			slug: locale === "es" ? "Slug" : "Slug",
			category: locale === "es" ? "Categoría" : "Category",
			tags: locale === "es" ? "Tags" : "Tags",
			tagsHelp:
				locale === "es" ? "Separados por comas" : "Separated by commas",
			titleEs: locale === "es" ? "Título (ES)" : "Title (ES)",
			titleEn: locale === "es" ? "Título (EN)" : "Title (EN)",
			excerptEs: locale === "es" ? "Extracto (ES)" : "Excerpt (ES)",
			excerptEn: locale === "es" ? "Extracto (EN)" : "Excerpt (EN)",
			contentEs: locale === "es" ? "Contenido (ES)" : "Content (ES)",
			contentEn: locale === "es" ? "Contenido (EN)" : "Content (EN)",
			coverImage:
				locale === "es" ? "Portada principal" : "Primary cover image",
			ogImage: locale === "es" ? "Imagen OG" : "OG image",
			metaTitleEs: locale === "es" ? "Meta title (ES)" : "Meta title (ES)",
			metaTitleEn: locale === "es" ? "Meta title (EN)" : "Meta title (EN)",
			metaDescriptionEs:
				locale === "es" ? "Meta description (ES)" : "Meta description (ES)",
			metaDescriptionEn:
				locale === "es" ? "Meta description (EN)" : "Meta description (EN)",
			status: locale === "es" ? "Estado" : "Status",
			featured: locale === "es" ? "Destacado" : "Featured",
			order: locale === "es" ? "Orden" : "Order",
			draft: locale === "es" ? "Borrador" : "Draft",
			published: locale === "es" ? "Publicado" : "Published",
			yes: locale === "es" ? "Sí" : "Yes",
			no: locale === "es" ? "No" : "No",
			createdBy: locale === "es" ? "Creado por" : "Created by",
			generateSlug:
				locale === "es"
					? "Generar desde título ES"
					: "Generate from ES title",
			requestFailed:
				locale === "es"
					? "No se pudo guardar el artículo."
					: "Could not save the article.",
			uploadCover:
				locale === "es" ? "Subir portada" : "Upload cover image",
			replaceCover:
				locale === "es" ? "Reemplazar portada" : "Replace cover image",
			removeCover:
				locale === "es" ? "Quitar portada" : "Remove cover image",
			uploadOg: locale === "es" ? "Subir imagen OG" : "Upload OG image",
			replaceOg:
				locale === "es" ? "Reemplazar imagen OG" : "Replace OG image",
			removeOg:
				locale === "es" ? "Quitar imagen OG" : "Remove OG image",
			uploading: locale === "es" ? "Subiendo..." : "Uploading...",
			coverHelp:
				locale === "es"
					? "La portada se guarda en R2 usando el flujo admin oficial."
					: "The cover image is stored in R2 using the official admin flow.",
			ogHelp:
				locale === "es"
					? "La imagen OG también se guarda en R2."
					: "The OG image is also stored in R2.",
			uploadFailed:
				locale === "es"
					? "No se pudo subir el archivo."
					: "Could not upload the file.",
			invalidFile:
				locale === "es"
					? "Debes seleccionar un archivo válido."
					: "You must select a valid file.",
			generateOg: locale === "es" ? "Generar OG" : "Generate OG",
			regenerateOg: locale === "es" ? "Regenerar OG" : "Regenerate OG",
			generatingOg:
				locale === "es" ? "Generando OG..." : "Generating OG...",
			generateOgFailed:
				locale === "es"
					? "No se pudo generar la imagen OG."
					: "Could not generate the OG image.",
			generateOgNeedsCover:
				locale === "es"
					? "Primero debes subir la portada."
					: "You must upload a cover image first.",
			relatedProjects:
				locale === "es" ? "Proyectos relacionados" : "Related projects",
			relatedProjectsHelp:
				locale === "es"
					? "Selecciona los proyectos que se mostrarán en el artículo si siguen autorizados para publicación pública."
					: "Select the projects that will be shown in the article if they remain authorized for public publication.",
			loadingRelatedProjects:
				locale === "es" ? "Cargando proyectos..." : "Loading projects...",
			noRelatedProjects:
				locale === "es"
					? "No hay proyectos públicos disponibles para relacionar."
					: "There are no public projects available to relate.",
			categoryHelp:
				locale === "es"
					? "La categoría se selecciona desde Clases de servicio."
					: "The category is selected from Service Classes.",
			loadingServiceClasses:
				locale === "es"
					? "Cargando clases de servicio..."
					: "Loading service classes...",
			noServiceClasses:
				locale === "es"
					? "No hay clases de servicio disponibles."
					: "No service classes available.",
			selectCategory:
				locale === "es" ? "Selecciona una categoría" : "Select a category",
			legacyCategory:
				locale === "es" ? "Categoría actual" : "Current category",
			unsavedChangesTitle:
				locale === "es" ? "Cambios sin guardar" : "Unsaved changes",
			unsavedChanges:
				locale === "es"
					? "Tienes cambios sin guardar. Si cierras ahora, perderás lo modificado."
					: "You have unsaved changes. If you close now, your edits will be lost.",
			stayHere: locale === "es" ? "Seguir editando" : "Keep editing",
			discardChanges:
				locale === "es" ? "Descartar cambios" : "Discard changes",
		};
	}, [locale]);

	/* ------------------------------------------------------------------------ */
	/* Inicialización                                                           */
	/* ------------------------------------------------------------------------ */

	useEffect(() => {
		if (!open) {
			return;
		}

		const nextForm =
			mode === "edit" && initialData
				? mapPostToFormValues(initialData)
				: createEmptyForm();

		const nextTagsInput = tagsToText(nextForm.tags);

		setForm(nextForm);
		setTagsInput(nextTagsInput);
		setErrors([]);
		setIsForceClosing(false);
		setShowDiscardConfirm(false);
		setInitialSnapshot(createSnapshot(nextForm, nextTagsInput));
	}, [open, mode, initialData]);

	useEffect(() => {
		if (!open) {
			return;
		}

		let cancelled = false;

		const loadRelatedProjects = async () => {
			try {
				setIsLoadingRelatedProjects(true);

				const response = await fetch("/api/public/projects", {
					method: "GET",
					cache: "no-store",
				});

				const result = (await response.json()) as PublicProjectsResponse;

				if (!response.ok || !result.ok) {
					if (!cancelled) {
						setRelatedProjects([]);
					}
					return;
				}

				if (!cancelled) {
					setRelatedProjects(Array.isArray(result.items) ? result.items : []);
				}
			} catch {
				if (!cancelled) {
					setRelatedProjects([]);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingRelatedProjects(false);
				}
			}
		};

		void loadRelatedProjects();

		return () => {
			cancelled = true;
		};
	}, [open]);

	useEffect(() => {
		if (!open) {
			return;
		}

		let cancelled = false;

		const loadServiceClasses = async () => {
			try {
				setIsLoadingServiceClasses(true);

				const response = await fetch("/api/admin/service-classes", {
					method: "GET",
					cache: "no-store",
				});

				const result = (await response.json()) as ServiceClassesResponse;

				if (!response.ok || !result.ok) {
					if (!cancelled) {
						setServiceClasses([]);
					}
					return;
				}

				if (!cancelled) {
					setServiceClasses(
						Array.isArray(result.items)
							? result.items
								.filter((item) => item.enabled)
								.sort((a, b) => a.order - b.order)
							: []
					);
				}
			} catch {
				if (!cancelled) {
					setServiceClasses([]);
				}
			} finally {
				if (!cancelled) {
					setIsLoadingServiceClasses(false);
				}
			}
		};

		void loadServiceClasses();

		return () => {
			cancelled = true;
		};
	}, [open]);

	/* ------------------------------------------------------------------------ */
	/* Estado derivado                                                          */
	/* ------------------------------------------------------------------------ */

	const currentSnapshot = useMemo(() => {
		return createSnapshot(form, tagsInput);
	}, [form, tagsInput]);

	const hasUnsavedChanges =
		open &&
		!isForceClosing &&
		initialSnapshot.length > 0 &&
		currentSnapshot !== initialSnapshot;

	const selectedCategoryOption = useMemo(() => {
		return serviceClasses.find((item) => item.key === form.category) ?? null;
	}, [form.category, serviceClasses]);

	const showLegacyCategoryOption =
		Boolean(form.category.trim()) && !selectedCategoryOption;

	/* ------------------------------------------------------------------------ */
	/* Cierre                                                                   */
	/* ------------------------------------------------------------------------ */

	const closeImmediately = () => {
		setIsForceClosing(true);
		setShowDiscardConfirm(false);
		onClose();
	};

	const handleRequestClose = () => {
		if (
			isSubmitting ||
			isUploadingCover ||
			isUploadingOgImage ||
			isGeneratingOgImage
		) {
			return;
		}

		if (hasUnsavedChanges) {
			setShowDiscardConfirm(true);
			return;
		}

		closeImmediately();
	};

	useEffect(() => {
		if (!open || !hasUnsavedChanges) {
			return;
		}

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [open, hasUnsavedChanges]);

	/* ------------------------------------------------------------------------ */
	/* Interacciones                                                            */
	/* ------------------------------------------------------------------------ */

	const handleGenerateSlug = () => {
		const source = form.title.es || form.title.en || "";

		setForm((current) => ({
			...current,
			slug: slugify(source),
		}));
	};

	const handleToggleRelatedProject = (projectId: string) => {
		setForm((current) => {
			const exists = current.relatedProjectIds.includes(projectId);

			return {
				...current,
				relatedProjectIds: exists
					? current.relatedProjectIds.filter((id) => id !== projectId)
					: [...current.relatedProjectIds, projectId],
			};
		});
	};

	const handleGenerateOgFromCover = async (coverPreviewUrl: string) => {
		if (!coverPreviewUrl.trim()) {
			setErrors([labels.generateOgNeedsCover]);
			return "";
		}

		try {
			setErrors([]);
			setIsGeneratingOgImage(true);

			const response = await fetch("/api/admin/blog/generate-og", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					title: form.title.es.trim() || form.title.en.trim(),
					category: form.category.trim(),
					coverImage: coverPreviewUrl,
				}),
			});

			const result = (await response.json()) as GenerateOgResponse;

			if (
				!response.ok ||
				!result.ok ||
				!result.data?.previewUrl ||
				!result.data?.fileKey
			) {
				setErrors([result.message || labels.generateOgFailed]);
				return "";
			}

			return result.data.previewUrl;
		} catch (error) {
			console.error("Failed to generate OG image:", error);
			setErrors([
				error instanceof Error ? error.message : labels.generateOgFailed,
			]);
			return "";
		} finally {
			setIsGeneratingOgImage(false);
		}
	};

	const handleUploadAsset = async (
		file: File | null,
		scope: AdminUploadScope,
		target: "cover" | "og"
	) => {
		if (!file) {
			setErrors([labels.invalidFile]);
			return;
		}

		try {
			setErrors([]);

			if (target === "cover") {
				setIsUploadingCover(true);
			} else {
				setIsUploadingOgImage(true);
			}

			const result = await uploadAdminFile(file, scope);

			if (!result.ok || !result.file?.fileKey) {
				setErrors([result.message || labels.uploadFailed]);
				return;
			}

			const previewUrl = buildAdminPreviewUrl(result.file.fileKey);

			if (target === "cover") {
				setForm((current) => ({
					...current,
					coverImage: previewUrl,
				}));
				return;
			}

			setForm((current) => ({
				...current,
				seo: {
					...current.seo,
					ogImage: previewUrl,
				},
			}));
		} finally {
			if (target === "cover") {
				setIsUploadingCover(false);
				if (coverInputRef.current) {
					coverInputRef.current.value = "";
				}
			} else {
				setIsUploadingOgImage(false);
				if (ogInputRef.current) {
					ogInputRef.current.value = "";
				}
			}
		}
	};

	const handleSubmit = async () => {
		const normalizedForm: BlogPostFormValues = {
			...form,
			slug: slugify(form.slug),
			tags: parseTags(tagsInput),
		};

		const validationErrors = validateForm(normalizedForm, locale);

		if (validationErrors.length > 0) {
			setErrors(validationErrors);
			return;
		}

		try {
			setIsSubmitting(true);
			setErrors([]);

			const payload = buildPayload(normalizedForm);
			const endpoint =
				mode === "create"
					? "/api/admin/blog"
					: `/api/admin/blog/${initialData?._id ?? ""}`;

			const method = mode === "create" ? "POST" : "PUT";

			const response = await fetch(endpoint, {
				method,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const result = (await response.json()) as BlogPostMutationResponse;

			if (!response.ok || !result.ok || !result.data) {
				const safeErrors =
					Array.isArray(result.errors) && result.errors.length > 0
						? result.errors
						: [result.message || labels.requestFailed];

				setErrors(safeErrors);
				return;
			}

			setInitialSnapshot(currentSnapshot);
			onSuccess(result.data);
			closeImmediately();
		} catch (error) {
			console.error("Failed to save blog post:", error);
			setErrors([error instanceof Error ? error.message : labels.requestFailed]);
		} finally {
			setIsSubmitting(false);
		}
	};

	/* ------------------------------------------------------------------------ */
	/* Render                                                                   */
	/* ------------------------------------------------------------------------ */

	if (!open) {
		return null;
	}

	return (
		<>
			<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
				<div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
					<div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								{mode === "create" ? labels.createTitle : labels.editTitle}
							</h2>
						</div>

						<button
							type="button"
							onClick={handleRequestClose}
							className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
							aria-label={labels.close}
						>
							<X className="h-5 w-5" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto px-6 py-6">
						<div className="space-y-6">
							{errors.length > 0 ? (
								<div className="rounded-2xl border border-red-200 bg-red-50 p-4">
									<ul className="space-y-1 text-sm text-red-700">
										{errors.map((error) => (
											<li key={error}>• {error}</li>
										))}
									</ul>
								</div>
							) : null}

							<section className="rounded-3xl border border-slate-200 p-5">
								<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
									{labels.identity}
								</h3>

								<div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
									<div className="xl:col-span-7">
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.slug}
										</label>
										<input
											type="text"
											value={form.slug}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													slug: event.target.value,
												}))
											}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										/>
									</div>

									<div className="flex items-end xl:col-span-5">
										<button
											type="button"
											onClick={handleGenerateSlug}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
										>
											{labels.generateSlug}
										</button>
									</div>

									<div className="xl:col-span-6">
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.category}
										</label>

										<select
											value={form.category}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													category: normalizeServiceClassKey(event.target.value),
												}))
											}
											disabled={isLoadingServiceClasses}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
										>
											<option value="">{labels.selectCategory}</option>

											{showLegacyCategoryOption ? (
												<option value={form.category}>
													{labels.legacyCategory}: {form.category}
												</option>
											) : null}

											{serviceClasses.map((item) => (
												<option key={item._id} value={item.key}>
													{getLocalizedProjectText(item.label, locale)}
												</option>
											))}
										</select>

										<p className="mt-2 text-xs text-slate-500">
											{isLoadingServiceClasses
												? labels.loadingServiceClasses
												: serviceClasses.length === 0
													? labels.noServiceClasses
													: labels.categoryHelp}
										</p>
									</div>

									<div className="xl:col-span-6">
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.tags}
										</label>
										<input
											type="text"
											value={tagsInput}
											onChange={(event) => setTagsInput(event.target.value)}
											placeholder={labels.tagsHelp}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
										/>
									</div>
								</div>
							</section>

							<section className="rounded-3xl border border-slate-200 p-5">
								<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
									{labels.relatedProjects}
								</h3>

								<p className="mb-4 text-xs text-slate-500">
									{labels.relatedProjectsHelp}
								</p>

								{isLoadingRelatedProjects ? (
									<div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
										<Loader2 className="h-4 w-4 animate-spin" />
										<span>{labels.loadingRelatedProjects}</span>
									</div>
								) : relatedProjects.length === 0 ? (
									<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
										{labels.noRelatedProjects}
									</div>
								) : (
									<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
										{relatedProjects.map((project) => {
											const isSelected = form.relatedProjectIds.includes(
												project._id
											);
											const projectTitle =
												getLocalizedProjectText(project.title, locale) ||
												project.slug;
											const projectSummary = getLocalizedProjectText(
												project.summary,
												locale
											);
											const projectCover = resolveProjectCoverImage(
												project.coverImage
											);

											return (
												<button
													key={project._id}
													type="button"
													onClick={() => handleToggleRelatedProject(project._id)}
													className={`overflow-hidden rounded-3xl border text-left transition ${isSelected
															? "border-slate-900 bg-slate-50 shadow-sm"
															: "border-slate-200 bg-white hover:bg-slate-50"
														}`}
												>
													<div className="grid min-h-[140px] grid-cols-[140px_minmax(0,1fr)]">
														<div className="relative bg-slate-100">
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
																<div className="flex h-full w-full items-center justify-center text-slate-400">
																	<ImagePlus className="h-6 w-6" />
																</div>
															)}
														</div>

														<div className="flex flex-col justify-between p-4">
															<div>
																<div className="flex items-center justify-between gap-3">
																	<p className="text-sm font-semibold text-slate-900">
																		{projectTitle}
																	</p>

																	<div
																		className={`h-4 w-4 rounded-full border ${isSelected
																				? "border-slate-900 bg-slate-900"
																				: "border-slate-300 bg-white"
																			}`}
																	/>
																</div>

																<p className="mt-1 text-xs text-slate-500">
																	/{project.slug}
																</p>

																{projectSummary ? (
																	<p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
																		{projectSummary}
																	</p>
																) : null}
															</div>
														</div>
													</div>
												</button>
											);
										})}
									</div>
								)}
							</section>

							<section className="rounded-3xl border border-slate-200 p-5">
								<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
									{labels.content}
								</h3>

								<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.titleEs}
										</label>
										<input
											type="text"
											value={form.title.es}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													title: {
														...current.title,
														es: event.target.value,
													},
												}))
											}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.titleEn}
										</label>
										<input
											type="text"
											value={form.title.en}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													title: {
														...current.title,
														en: event.target.value,
													},
												}))
											}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.excerptEs}
										</label>
										<textarea
											value={form.excerpt.es}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													excerpt: {
														...current.excerpt,
														es: event.target.value,
													},
												}))
											}
											rows={4}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition resize-y focus:border-slate-400"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.excerptEn}
										</label>
										<textarea
											value={form.excerpt.en}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													excerpt: {
														...current.excerpt,
														en: event.target.value,
													},
												}))
											}
											rows={4}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition resize-y focus:border-slate-400"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.contentEs}
										</label>
										<textarea
											value={form.content.es}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													content: {
														...current.content,
														es: event.target.value,
													},
												}))
											}
											rows={10}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition resize-y focus:border-slate-400"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.contentEn}
										</label>
										<textarea
											value={form.content.en}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													content: {
														...current.content,
														en: event.target.value,
													},
												}))
											}
											rows={10}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition resize-y focus:border-slate-400"
										/>
									</div>
								</div>
							</section>

							<section className="rounded-3xl border border-slate-200 p-5">
								<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
									{labels.media}
								</h3>

								<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
									<div className="space-y-3">
										<label className="block text-sm font-medium text-slate-700">
											{labels.coverImage}
										</label>

										<div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
											<div className="flex aspect-[16/9] items-center justify-center bg-slate-100">
												{form.coverImage && isRenderableImage(form.coverImage) ? (
													<div className="relative h-full w-full">
														<Image
															src={form.coverImage}
															alt={labels.coverImage}
															fill
															sizes="(max-width: 1280px) 100vw, 50vw"
															className="object-cover"
															unoptimized
														/>
													</div>
												) : (
													<div className="flex flex-col items-center justify-center gap-2 text-slate-400">
														<ImagePlus className="h-8 w-8" />
														<span className="text-sm">{labels.coverImage}</span>
													</div>
												)}
											</div>

											<div className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-4">
												<input
													ref={coverInputRef}
													type="file"
													accept="image/*"
													onChange={(event) =>
														void handleUploadAsset(
															event.target.files?.[0] ?? null,
															"blog/covers",
															"cover"
														)
													}
													className="hidden"
												/>

												<button
													type="button"
													onClick={() => coverInputRef.current?.click()}
													disabled={isUploadingCover}
													className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
												>
													{isUploadingCover ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<ImagePlus className="h-4 w-4" />
													)}
													<span>
														{isUploadingCover
															? labels.uploading
															: form.coverImage
																? labels.replaceCover
																: labels.uploadCover}
													</span>
												</button>

												{form.coverImage ? (
													<button
														type="button"
														onClick={() => {
															setForm((current) => ({
																...current,
																coverImage: "",
															}));
														}}
														className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
													>
														<Trash2 className="h-4 w-4" />
														<span>{labels.removeCover}</span>
													</button>
												) : null}
											</div>
										</div>

										<p className="text-xs text-slate-500">{labels.coverHelp}</p>
										{coverFileLabel ? (
											<p
												className="truncate text-[11px] text-slate-500"
												title={coverFileLabel}
											>
												{coverFileLabel}
											</p>
										) : null}
									</div>

									<div className="space-y-3">
										<label className="block text-sm font-medium text-slate-700">
											{labels.ogImage}
										</label>

										<div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
											<div className="flex aspect-[16/9] items-center justify-center bg-slate-100">
												{form.seo.ogImage && isRenderableImage(form.seo.ogImage) ? (
													<div className="relative h-full w-full">
														<Image
															src={form.seo.ogImage}
															alt={labels.ogImage}
															fill
															sizes="(max-width: 1280px) 100vw, 50vw"
															className="object-cover"
															unoptimized
														/>
													</div>
												) : (
													<div className="flex flex-col items-center justify-center gap-2 text-slate-400">
														<ImagePlus className="h-8 w-8" />
														<span className="text-sm">{labels.ogImage}</span>
													</div>
												)}
											</div>

											<div className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-4">
												<input
													ref={ogInputRef}
													type="file"
													accept="image/*"
													onChange={(event) =>
														void handleUploadAsset(
															event.target.files?.[0] ?? null,
															"blog/seo",
															"og"
														)
													}
													className="hidden"
												/>

												<button
													type="button"
													onClick={() => ogInputRef.current?.click()}
													disabled={isUploadingOgImage}
													className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
												>
													{isUploadingOgImage ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<ImagePlus className="h-4 w-4" />
													)}
													<span>
														{isUploadingOgImage
															? labels.uploading
															: form.seo.ogImage
																? labels.replaceOg
																: labels.uploadOg}
													</span>
												</button>

												{form.coverImage ? (
													<button
														type="button"
														onClick={() =>
															void handleGenerateOgFromCover(form.coverImage).then(
																(previewUrl) => {
																	if (!previewUrl) {
																		return;
																	}

																	setForm((current) => ({
																		...current,
																		seo: {
																			...current.seo,
																			ogImage: previewUrl,
																		},
																	}));
																}
															)
														}
														disabled={isGeneratingOgImage}
														className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
													>
														{isGeneratingOgImage ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<ImagePlus className="h-4 w-4" />
														)}
														<span>
															{isGeneratingOgImage
																? labels.generatingOg
																: form.seo.ogImage
																	? labels.regenerateOg
																	: labels.generateOg}
														</span>
													</button>
												) : null}

												{form.seo.ogImage ? (
													<button
														type="button"
														onClick={() => {
															setForm((current) => ({
																...current,
																seo: {
																	...current.seo,
																	ogImage: "",
																},
															}));
														}}
														className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
													>
														<Trash2 className="h-4 w-4" />
														<span>{labels.removeOg}</span>
													</button>
												) : null}
											</div>
										</div>

										<p className="text-xs text-slate-500">{labels.ogHelp}</p>
										{ogFileLabel ? (
											<p
												className="truncate text-[11px] text-slate-500"
												title={ogFileLabel}
											>
												{ogFileLabel}
											</p>
										) : null}
									</div>
								</div>
							</section>

							<section className="rounded-3xl border border-slate-200 p-5">
								<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
									{labels.publication}
								</h3>

								<div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
									<div className="xl:col-span-4">
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.status}
										</label>
										<select
											value={form.status}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													status: event.target.value as BlogStatus,
												}))
											}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										>
											<option value="draft">{labels.draft}</option>
											<option value="published">{labels.published}</option>
										</select>
									</div>

									<div className="xl:col-span-4">
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.featured}
										</label>
										<select
											value={form.featured ? "true" : "false"}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													featured: event.target.value === "true",
												}))
											}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										>
											<option value="false">{labels.no}</option>
											<option value="true">{labels.yes}</option>
										</select>
									</div>

									<div className="xl:col-span-4">
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.order}
										</label>
										<input
											type="number"
											min={0}
											value={form.order}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													order: Number.isFinite(Number(event.target.value))
														? Number(event.target.value)
														: 0,
												}))
											}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										/>
									</div>

									{mode === "create" ? (
										<div className="xl:col-span-12">
											<label className="mb-2 block text-sm font-medium text-slate-700">
												{labels.createdBy}
											</label>
											<input
												type="text"
												value={form.createdBy}
												onChange={(event) =>
													setForm((current) => ({
														...current,
														createdBy: event.target.value,
													}))
												}
												className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
											/>
										</div>
									) : null}
								</div>
							</section>

							<section className="rounded-3xl border border-slate-200 p-5">
								<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
									{labels.seo}
								</h3>

								<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.metaTitleEs}
										</label>
										<input
											type="text"
											value={form.seo.metaTitle.es}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													seo: {
														...current.seo,
														metaTitle: {
															...current.seo.metaTitle,
															es: event.target.value,
														},
													},
												}))
											}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.metaTitleEn}
										</label>
										<input
											type="text"
											value={form.seo.metaTitle.en}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													seo: {
														...current.seo,
														metaTitle: {
															...current.seo.metaTitle,
															en: event.target.value,
														},
													},
												}))
											}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.metaDescriptionEs}
										</label>
										<textarea
											value={form.seo.metaDescription.es}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													seo: {
														...current.seo,
														metaDescription: {
															...current.seo.metaDescription,
															es: event.target.value,
														},
													},
												}))
											}
											rows={4}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition resize-y focus:border-slate-400"
										/>
									</div>

									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											{labels.metaDescriptionEn}
										</label>
										<textarea
											value={form.seo.metaDescription.en}
											onChange={(event) =>
												setForm((current) => ({
													...current,
													seo: {
														...current.seo,
														metaDescription: {
															...current.seo.metaDescription,
															en: event.target.value,
														},
													},
												}))
											}
											rows={4}
											className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition resize-y focus:border-slate-400"
										/>
									</div>
								</div>
							</section>
						</div>
					</div>

					<div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
						<button
							type="button"
							onClick={handleRequestClose}
							disabled={
								isSubmitting ||
								isUploadingCover ||
								isUploadingOgImage ||
								isGeneratingOgImage
							}
							className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{labels.cancel}
						</button>

						<button
							type="button"
							onClick={() => void handleSubmit()}
							disabled={
								isSubmitting ||
								isUploadingCover ||
								isUploadingOgImage ||
								isGeneratingOgImage
							}
							className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isSubmitting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							<span>{isSubmitting ? labels.saving : labels.save}</span>
						</button>
					</div>
				</div>
			</div>

			{showDiscardConfirm ? (
				<div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4">
					<div className="w-full max-w-md rounded-[24px] border border-slate-200 bg-white shadow-2xl">
						<div className="p-6">
							<div className="flex items-start gap-3">
								<div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
									<AlertTriangle className="h-5 w-5" />
								</div>

								<div>
									<h3 className="text-lg font-semibold text-slate-900">
										{labels.unsavedChangesTitle}
									</h3>
									<p className="mt-2 text-sm leading-6 text-slate-600">
										{labels.unsavedChanges}
									</p>
								</div>
							</div>

							<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
								<button
									type="button"
									onClick={() => setShowDiscardConfirm(false)}
									className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
								>
									{labels.stayHere}
								</button>

								<button
									type="button"
									onClick={closeImmediately}
									className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
								>
									{labels.discardChanges}
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}