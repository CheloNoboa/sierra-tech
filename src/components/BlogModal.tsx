// src/components/BlogModal.tsx

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
 *   - mantener un formulario bilingüe estable
 *
 *   Decisiones:
 *   - create y edit comparten el mismo formulario
 *   - portada se maneja inicialmente como URL
 *   - gallery queda para la siguiente iteración
 *   - tags se editan como texto separado por comas
 *   - el slug puede autogenerarse desde el título si está vacío
 *   - `publishedAt` no se edita aquí; lo controla el modelo
 *
 *   Nota:
 *   - este modal no depende todavía de R2
 *   - cuando conectemos upload real, se reemplaza solo la sección de media
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
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
	const safeCover = form.coverImage.trim().startsWith("/")
		? form.coverImage.trim()
		: "";

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
		coverImage: safeCover,
		gallery: form.gallery,
		category: form.category.trim(),
		tags: form.tags,
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
	language: "es" | "en",
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
			language === "es" ? "El slug es obligatorio." : "Slug is required.",
		);
	}

	if (!titleEs && !titleEn) {
		errors.push(
			language === "es"
				? "Debes ingresar al menos un título."
				: "You must enter at least one title.",
		);
	}

	if (!excerptEs && !excerptEn) {
		errors.push(
			language === "es"
				? "Debes ingresar al menos un extracto."
				: "You must enter at least one excerpt.",
		);
	}

	if (!contentEs && !contentEn) {
		errors.push(
			language === "es"
				? "Debes ingresar contenido en al menos un idioma."
				: "You must enter content in at least one language.",
		);
	}

	if (form.coverImage && !form.coverImage.startsWith("/")) {
		errors.push(
			language === "es"
				? "La imagen debe ser una ruta local (ej: /images/blog/imagen.jpg)"
				: "Image must be a local path (e.g. /images/blog/image.jpg)",
		);
	}

	return errors;
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

	useEffect(() => {
		if (!open) {
			return;
		}

		if (mode === "edit" && initialData) {
			const mapped = mapPostToFormValues(initialData);
			setForm(mapped);
			setTagsInput(tagsToText(mapped.tags));
			setErrors([]);
			return;
		}

		const emptyForm = createEmptyForm();
		setForm(emptyForm);
		setTagsInput("");
		setErrors([]);
	}, [initialData, mode, open]);

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
			tagsHelp: locale === "es" ? "Separados por comas" : "Separated by commas",
			titleEs: locale === "es" ? "Título (ES)" : "Title (ES)",
			titleEn: locale === "es" ? "Título (EN)" : "Title (EN)",
			excerptEs: locale === "es" ? "Extracto (ES)" : "Excerpt (ES)",
			excerptEn: locale === "es" ? "Extracto (EN)" : "Excerpt (EN)",
			contentEs: locale === "es" ? "Contenido (ES)" : "Content (ES)",
			contentEn: locale === "es" ? "Contenido (EN)" : "Content (EN)",
			coverImage:
				locale === "es" ? "Portada (ruta local)" : "Cover image (local path)",
			ogImage: locale === "es" ? "OG image (URL)" : "OG image (URL)",
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
				locale === "es" ? "Generar desde título ES" : "Generate from ES title",
			requestFailed:
				locale === "es"
					? "No se pudo guardar el artículo."
					: "Could not save the article.",
		};
	}, [locale]);

	if (!open) {
		return null;
	}

	const handleGenerateSlug = () => {
		const source = form.title.es || form.title.en || "";
		setForm((current) => ({
			...current,
			slug: slugify(source),
		}));
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

			onSuccess(result.data);
			onClose();
		} catch (error) {
			console.error("Failed to save blog post:", error);
			setErrors([
				error instanceof Error ? error.message : labels.requestFailed,
			]);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4">
			<div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
					<div>
						<h2 className="text-xl font-semibold text-slate-900">
							{mode === "create" ? labels.createTitle : labels.editTitle}
						</h2>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
						aria-label={labels.close}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
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

						{/* Identity */}
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

								<div className="xl:col-span-5 flex items-end">
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
									<input
										type="text"
										value={form.category}
										onChange={(event) =>
											setForm((current) => ({
												...current,
												category: event.target.value,
											}))
										}
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
									/>
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

						{/* Content */}
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

						{/* Media */}
						<section className="rounded-3xl border border-slate-200 p-5">
							<h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
								{labels.media}
							</h3>

							<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										{labels.coverImage}
									</label>

									<input
										type="text"
										value={form.coverImage}
										onChange={(event) =>
											setForm((current) => ({
												...current,
												coverImage: event.target.value,
											}))
										}
										placeholder="/images/blog/ejemplo.jpg"
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
									/>

									<p className="mt-1 text-xs text-slate-500">
										{locale === "es"
											? "Solo rutas locales dentro de /public (ej: /images/blog/imagen.jpg)"
											: "Only local paths inside /public (e.g. /images/blog/image.jpg)"}
									</p>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										{labels.ogImage}
									</label>
									<input
										type="text"
										value={form.seo.ogImage}
										onChange={(event) =>
											setForm((current) => ({
												...current,
												seo: {
													...current.seo,
													ogImage: event.target.value,
												},
											}))
										}
										className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
									/>
								</div>
							</div>
						</section>

						{/* Publication */}
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
							</div>
						</section>

						{/* SEO */}
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

				{/* Footer */}
				<div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
					<button
						type="button"
						onClick={onClose}
						disabled={isSubmitting}
						className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{labels.cancel}
					</button>

					<button
						type="button"
						onClick={() => void handleSubmit()}
						disabled={isSubmitting}
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
	);
}
