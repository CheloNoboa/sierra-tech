/**
 * =============================================================================
 * 📄 Page: Public Blog Detail
 * Path: src/app/blog/[slug]/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página pública de detalle para artículos del blog de Sierra Tech.
 *
 *   Objetivo:
 *   - mostrar un artículo publicado con presentación editorial pro
 *   - respetar el contrato bilingüe del módulo Blog
 *   - resolver metadata dinámica para SEO
 *   - conectar el contenido con proyectos públicos relacionados
 *
 *   Decisiones:
 *   - solo se renderizan artículos con status "published"
 *   - el locale visual se infiere desde cookie/request
 *   - si falta seo, se usan fallbacks desde title / excerpt / coverImage
 *   - los proyectos relacionados solo se resuelven desde `relatedProjectIds`
 *     del artículo cuando existan
 *   - no se usa fallback automático de proyectos relacionados
 *   - la categoría pública usa `categoryLabel` cuando exista
 *   - el contenido se renderiza como texto estructurado por párrafos
 *   - la imagen de proyecto relacionado se normaliza para soportar rutas
 *     absolutas, internas y assets de R2
 *
 *   Reglas:
 *   - no exponer borradores
 *   - no romper el lenguaje visual público de Sierra Tech
 *   - mantener layout limpio, corporativo y con orientación comercial
 * =============================================================================
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	CalendarDays,
	FileText,
	Images,
} from "lucide-react";

import { connectToDB } from "@/lib/connectToDB";
import BlogPostModel from "@/models/BlogPost";
import type {
	BlogGalleryItem,
	BlogLocale,
	BlogLocalizedText,
	BlogSeo,
} from "@/types/blog";

interface PageProps {
	params: Promise<{
		slug: string;
	}>;
}

interface RelatedProjectCard {
	_id: string;
	slug: string;
	title: BlogLocalizedText;
	summary: BlogLocalizedText;
	coverImage: string | null;
}

interface PublicBlogDetailItem {
	_id: string;
	slug: string;
	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	content: BlogLocalizedText;
	coverImage: string;
	gallery: BlogGalleryItem[];
	category: string;
	categoryLabel: BlogLocalizedText;
	tags: string[];
	relatedProjectIds: string[];
	featured: boolean;
	order: number;
	publishedAt: string | null;
	seo: BlogSeo;
	createdBy: string;
	createdAt: string | null;
	updatedAt: string | null;
	relatedProjects: RelatedProjectCard[];
}

interface PublicBlogDetailResponse {
	ok: boolean;
	item?: PublicBlogDetailItem;
	error?: string;
}

interface LeanBlogPostRecord {
	_id: { toString(): string };
	slug?: string;
	title?: BlogLocalizedText;
	excerpt?: BlogLocalizedText;
	content?: BlogLocalizedText;
	coverImage?: string;
	gallery?: BlogGalleryItem[];
	category?: string;
	tags?: string[];
	relatedProjectIds?: string[];
	featured?: boolean;
	order?: number;
	seo?: BlogSeo;
	createdBy?: string;
	publishedAt?: Date | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

function resolveLocaleFromCookie(
	cookieValue: string | undefined | null
): BlogLocale | null {
	if (!cookieValue) {
		return null;
	}

	return cookieValue === "en" ? "en" : cookieValue === "es" ? "es" : null;
}

function resolveLocaleFromHeaders(
	acceptLanguage: string | null
): BlogLocale {
	if (!acceptLanguage) {
		return "es";
	}

	return acceptLanguage.toLowerCase().includes("en") ? "en" : "es";
}

async function getServerLocale(): Promise<BlogLocale> {
	const cookieStore = await cookies();
	const cookieLocale =
		resolveLocaleFromCookie(cookieStore.get("NEXT_LOCALE")?.value) ??
		resolveLocaleFromCookie(cookieStore.get("locale")?.value);

	if (cookieLocale) {
		return cookieLocale;
	}

	const requestHeaders = await headers();
	return resolveLocaleFromHeaders(requestHeaders.get("accept-language"));
}

function getLocalizedText(
	value: BlogLocalizedText | null | undefined,
	locale: BlogLocale
): string {
	if (!value) {
		return "";
	}

	const primary = locale === "es" ? value.es : value.en;
	const fallback = locale === "es" ? value.en : value.es;

	return primary?.trim() || fallback?.trim() || "";
}

function formatDate(value: Date | string | null, locale: BlogLocale): string {
	if (!value) {
		return locale === "es" ? "Sin fecha" : "No date";
	}

	const parsed = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		return locale === "es" ? "Fecha inválida" : "Invalid date";
	}

	return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	}).format(parsed);
}

function isRenderableImage(value: string | null | undefined): boolean {
	if (!value) {
		return false;
	}

	const safe = value.trim();
	return safe.startsWith("/") || safe.startsWith("http");
}

function splitContentIntoParagraphs(value: string): string[] {
	return value
		.split(/\n{2,}/)
		.map((paragraph) => paragraph.trim())
		.filter((paragraph) => paragraph.length > 0);
}

function getCategoryDisplayLabel(
	category: string,
	categoryLabel: BlogLocalizedText | null | undefined,
	locale: BlogLocale
): string {
	const localizedLabel = getLocalizedText(categoryLabel, locale);

	if (localizedLabel) {
		return localizedLabel;
	}

	return category.trim();
}

function resolveProjectCoverImageUrl(
	value: string | null | undefined,
	baseUrl: string
): string {
	if (!value) {
		return "";
	}

	const safeValue = value.trim();

	if (!safeValue) {
		return "";
	}

	if (safeValue.startsWith("http://") || safeValue.startsWith("https://")) {
		return safeValue;
	}

	if (safeValue.startsWith("/")) {
		return `${baseUrl}${safeValue}`;
	}

	if (safeValue.startsWith("admin/")) {
		return `${baseUrl}/api/admin/uploads/view?key=${encodeURIComponent(safeValue)}`;
	}

	const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "";

	if (publicBaseUrl) {
		return `${publicBaseUrl}/${safeValue}`;
	}

	return `${baseUrl}/${safeValue}`;
}

async function getBlogPostBySlug(
	slug: string
): Promise<LeanBlogPostRecord | null> {
	await connectToDB();

	return BlogPostModel.findOne({
		slug,
		status: "published",
	}).lean<LeanBlogPostRecord | null>();
}

async function getPublicBlogDetailBySlug(
	slug: string
): Promise<PublicBlogDetailItem | null> {
	const requestHeaders = await headers();
	const host = requestHeaders.get("host") || "localhost:3000";
	const forwardedProto = requestHeaders.get("x-forwarded-proto") || "http";
	const baseUrl = `${forwardedProto}://${host}`;

	try {
		const response = await fetch(
			`${baseUrl}/api/public/blog/${encodeURIComponent(slug)}`,
			{
				cache: "no-store",
			}
		);

		const result = (await response.json()) as PublicBlogDetailResponse;

		if (!response.ok || !result.ok || !result.item) {
			return null;
		}

		return result.item;
	} catch {
		return null;
	}
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug } = await params;
	const locale = await getServerLocale();

	const safeSlug = typeof slug === "string" ? slug.trim().toLowerCase() : "";

	if (!safeSlug) {
		return {};
	}

	const post = await getBlogPostBySlug(safeSlug);

	if (!post) {
		return {};
	}

	const localizedTitle = getLocalizedText(post.title, locale);
	const localizedExcerpt = getLocalizedText(post.excerpt, locale);

	const metaTitle =
		getLocalizedText(post.seo?.metaTitle, locale) || localizedTitle;
	const metaDescription =
		getLocalizedText(post.seo?.metaDescription, locale) || localizedExcerpt;

	const ogImage =
		typeof post.seo?.ogImage === "string" && post.seo.ogImage.trim()
			? post.seo.ogImage.trim()
			: typeof post.coverImage === "string"
				? post.coverImage.trim()
				: "";

	return {
		title: metaTitle || localizedTitle || "Blog",
		description: metaDescription || localizedExcerpt || "",
		openGraph: {
			title: metaTitle || localizedTitle || "Blog",
			description: metaDescription || localizedExcerpt || "",
			images: ogImage ? [{ url: ogImage }] : [],
			type: "article",
		},
		twitter: {
			card: ogImage ? "summary_large_image" : "summary",
			title: metaTitle || localizedTitle || "Blog",
			description: metaDescription || localizedExcerpt || "",
			images: ogImage ? [ogImage] : [],
		},
	};
}

export default async function BlogDetailPage({ params }: PageProps) {
	const { slug } = await params;
	const locale = await getServerLocale();
	const requestHeaders = await headers();

	const safeSlug = typeof slug === "string" ? slug.trim().toLowerCase() : "";

	if (!safeSlug) {
		notFound();
	}

	const post = await getPublicBlogDetailBySlug(safeSlug);

	if (!post) {
		notFound();
	}

	const host = requestHeaders.get("host") || "localhost:3000";
	const forwardedProto = requestHeaders.get("x-forwarded-proto") || "http";
	const baseUrl = `${forwardedProto}://${host}`;

	const labels = {
		backToBlog: locale === "es" ? "Volver al blog" : "Back to blog",
		published: locale === "es" ? "Publicado" : "Published",
		relatedProjects:
			locale === "es" ? "Proyectos relacionados" : "Related projects",
		readProject: locale === "es" ? "Ver proyecto" : "View project",
		finalTitle:
			locale === "es"
				? "¿Necesitas una solución similar?"
				: "Need a similar solution?",
		finalDescription:
			locale === "es"
				? "Conecta este conocimiento técnico con una propuesta real para tu operación, planta o proyecto."
				: "Connect this technical knowledge with a real proposal for your operation, plant or project.",
		viewServices: locale === "es" ? "Ver servicios" : "View services",
		contact: locale === "es" ? "Contactar" : "Contact",
		viewProjects: locale === "es" ? "Ver proyectos" : "View projects",
		untitled: locale === "es" ? "Sin título" : "Untitled",
		noExcerpt:
			locale === "es"
				? "Sin extracto disponible."
				: "No excerpt available.",
		noContent:
			locale === "es"
				? "Este artículo no tiene contenido disponible."
				: "This article has no content available.",
		noRelatedProjects:
			locale === "es"
				? "No hay proyectos relacionados disponibles."
				: "No related projects available.",
		gallery: locale === "es" ? "Galería del artículo" : "Article gallery",
		nextStep: locale === "es" ? "Siguiente paso" : "Next step",
		approach:
			locale === "es" ? "Enfoque Sierra Tech" : "Sierra Tech approach",
		approachText:
			locale === "es"
				? "Contenido técnico útil, criterio aplicado y conexión real con proyectos, servicios y necesidades operativas."
				: "Useful technical content, applied criteria and a real connection with projects, services and operational needs.",
	};

	const localizedTitle = getLocalizedText(post.title, locale) || labels.untitled;
	const localizedExcerpt =
		getLocalizedText(post.excerpt, locale) || labels.noExcerpt;
	const localizedContent = getLocalizedText(post.content, locale);
	const categoryDisplayLabel = getCategoryDisplayLabel(
		post.category,
		post.categoryLabel,
		locale
	);
	const contentParagraphs = splitContentIntoParagraphs(localizedContent);
	const displayDate = formatDate(post.publishedAt ?? null, locale);
	const galleryItems = Array.isArray(post.gallery)
		? post.gallery.filter((item) => isRenderableImage(item.url))
		: [];
	const relatedProjects = Array.isArray(post.relatedProjects)
		? post.relatedProjects
		: [];

	return (
		<div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
			<section className="border-b border-slate-200/80 bg-white">
				<div className="mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6 md:pt-28 lg:px-8 lg:pt-32">
					<Link
						href="/blog"
						className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
					>
						<ArrowLeft className="h-4 w-4" />
						<span>{labels.backToBlog}</span>
					</Link>
				</div>

				<div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:pb-20">
					<div className="lg:col-span-7">
						{categoryDisplayLabel ? (
							<div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
								{categoryDisplayLabel}
							</div>
						) : null}

						<h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
							{localizedTitle}
						</h1>

						<p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
							{localizedExcerpt}
						</p>

						<div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-500">
							<div className="inline-flex items-center gap-2">
								<CalendarDays className="h-4 w-4" />
								<span>
									{labels.published}: {displayDate}
								</span>
							</div>
						</div>

						{Array.isArray(post.tags) && post.tags.length > 0 ? (
							<div className="mt-6 flex flex-wrap gap-2">
								{post.tags.map((tag) => (
									<span
										key={tag}
										className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
									>
										{tag}
									</span>
								))}
							</div>
						) : null}
					</div>

					<div className="lg:col-span-5">
						<div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
							<div className="relative aspect-[4/3] bg-slate-100">
								{isRenderableImage(post.coverImage) ? (
									<Image
										src={post.coverImage ?? ""}
										alt={localizedTitle}
										fill
										unoptimized
										className="object-cover"
										sizes="(max-width: 1024px) 100vw, 40vw"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center text-slate-400">
										<FileText className="h-12 w-12" />
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
				<div className="grid gap-10 lg:grid-cols-12">
					<article className="space-y-8 lg:col-span-8">
						<div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
							<div className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
								{contentParagraphs.length === 0 ? (
									<p className="text-base leading-8 text-slate-600">
										{labels.noContent}
									</p>
								) : (
									<div className="space-y-6">
										{contentParagraphs.map((paragraph, index) => (
											<p
												key={`${index}-${paragraph.slice(0, 24)}`}
												className="text-base leading-8 text-slate-700"
											>
												{paragraph}
											</p>
										))}
									</div>
								)}
							</div>
						</div>

						{galleryItems.length > 0 ? (
							<div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
								<div className="px-6 py-6 sm:px-8 sm:py-8">
									<div className="flex items-center gap-2">
										<Images className="h-5 w-5 text-slate-500" />
										<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
											{labels.gallery}
										</p>
									</div>

									<div className="mt-5 grid gap-4 sm:grid-cols-2">
										{galleryItems.map((item, index) => {
											const altText =
												getLocalizedText(item.alt, locale) ||
												`${localizedTitle} ${index + 1}`;

											return (
												<div
													key={`${item.url}-${index}`}
													className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100"
												>
													<div className="relative aspect-[16/10]">
														<Image
															src={item.url}
															alt={altText}
															fill
															unoptimized
															className="object-cover"
															sizes="(max-width: 1024px) 100vw, 50vw"
														/>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</div>
						) : null}
					</article>

					<aside className="lg:col-span-4">
						<div className="space-y-6">
							<div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
								<div className="px-6 py-6">
									<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
										{labels.relatedProjects}
									</p>

									{relatedProjects.length === 0 ? (
										<p className="mt-5 text-sm leading-6 text-slate-600">
											{labels.noRelatedProjects}
										</p>
									) : (
										<div className="mt-5 space-y-4">
											{relatedProjects.map((project) => {
												const projectTitle =
													getLocalizedText(project.title, locale) ||
													labels.untitled;
												const projectSummary =
													getLocalizedText(project.summary, locale) ||
													labels.noExcerpt;
												const projectCoverImage =
													resolveProjectCoverImageUrl(
														project.coverImage,
														baseUrl
													);

												return (
													<Link
														key={project._id}
														href={`/projects/${project.slug}`}
														className="group block overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 transition hover:bg-white hover:shadow-sm"
													>
														<div className="relative aspect-[16/10] bg-slate-100">
															{isRenderableImage(projectCoverImage) ? (
																<Image
																	src={projectCoverImage}
																	alt={projectTitle}
																	fill
																	unoptimized
																	className="object-cover transition duration-300 group-hover:scale-[1.02]"
																	sizes="(max-width: 1024px) 100vw, 28vw"
																/>
															) : (
																<div className="flex h-full w-full items-center justify-center text-slate-400">
																	<FileText className="h-8 w-8" />
																</div>
															)}
														</div>

														<div className="p-4">
															<h3 className="text-base font-semibold tracking-[-0.03em] text-slate-950">
																{projectTitle}
															</h3>

															<p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
																{projectSummary}
															</p>

															<div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
																<span>{labels.readProject}</span>
																<ArrowRight className="h-4 w-4" />
															</div>
														</div>
													</Link>
												);
											})}
										</div>
									)}
								</div>
							</div>
						</div>
					</aside>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-4 pb-16 pt-2 sm:px-6 lg:px-8 lg:pb-24">
				<div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
					<div className="grid gap-0 lg:grid-cols-12">
						<div className="bg-gradient-to-br from-white via-slate-50 to-lime-50 p-8 sm:p-10 lg:col-span-8">
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
								{locale === "es" ? "Siguiente paso" : "Next step"}
							</p>

							<h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
								{labels.finalTitle}
							</h2>

							<p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
								{labels.finalDescription}
							</p>

							<div className="mt-8 flex flex-wrap gap-3">
								<Link
									href="/services"
									className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
								>
									<span>{labels.viewServices}</span>
									<ArrowRight className="h-4 w-4" />
								</Link>

								<Link
									href="/projects"
									className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
								>
									<span>{labels.viewProjects}</span>
								</Link>

								<Link
									href="/contact"
									className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
								>
									<span>{labels.contact}</span>
								</Link>
							</div>
						</div>

						<div className="flex items-center justify-center border-t border-slate-200 bg-slate-950 p-8 text-white lg:col-span-4 lg:border-l lg:border-t-0">
							<div className="max-w-xs">
								<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
									{locale === "es"
										? "Enfoque Sierra Tech"
										: "Sierra Tech approach"}
								</p>
								<p className="mt-4 text-sm leading-7 text-slate-100">
									{locale === "es"
										? "Contenido técnico útil, criterio aplicado y conexión real con proyectos, servicios y necesidades operativas."
										: "Useful technical content, applied criteria and a real connection with projects, services and operational needs."}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}