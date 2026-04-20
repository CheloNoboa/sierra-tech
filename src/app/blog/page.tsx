"use client";

/**
 * =============================================================================
 * 📄 Page: Public Blog
 * Path: src/app/blog/page.tsx
 * =============================================================================
 *
 * ES:
 *   Página pública principal del Blog de Sierra Tech.
 *
 *   Objetivo:
 *   - presentar artículos publicados con una experiencia visual pro
 *   - mezclar enfoque técnico + comercial
 *   - destacar contenido editorial relevante
 *   - conectar naturalmente con Proyectos y Servicios
 *
 *   Decisiones:
 *   - consume solo la API pública del blog
 *   - usa bilingüismo estable ES/EN
 *   - featured se usa para priorizar contenido editorial destacado
 *   - si existen destacados, la sección "Contenido destacado" muestra TODOS
 *     los artículos destacados
 *   - el hero es editorial y no consume artículos reales
 *   - el grid general muestra solo artículos no destacados
 *   - si todos los artículos están destacados, el grid no se renderiza
 *   - si no hay destacados, el grid muestra todos los artículos filtrados
 *   - la categoría pública usa el label bilingüe resuelto desde Service Classes
 *
 *   UX:
 *   - hero editorial fijo con tono técnico-comercial
 *   - bloque destacado con todos los featured
 *   - chips por categoría
 *   - cards limpias y visuales
 *   - CTA final hacia proyectos y contacto
 * =============================================================================
 */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowRight,
	FileText,
	Loader2,
	Search,
	Sparkles,
} from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";
import type { BlogLocalizedText } from "@/types/blog";

/* -------------------------------------------------------------------------- */
/* Tipos locales                                                              */
/* -------------------------------------------------------------------------- */

interface PublicBlogListItem {
	_id: string;
	slug: string;
	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	coverImage: string;
	category: string;
	categoryLabel?: BlogLocalizedText | null;
	tags: string[];
	featured: boolean;
	order: number;
	publishedAt: string | null;
	seo: {
		metaTitle: BlogLocalizedText;
		metaDescription: BlogLocalizedText;
		ogImage: string;
	};
	createdAt: string | null;
	updatedAt: string | null;
}

interface PublicBlogListResponse {
	ok: boolean;
	items?: PublicBlogListItem[];
	error?: string;
}

interface CategoryFilterOption {
	key: string;
	label: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getLocalizedText(
	value: BlogLocalizedText | null | undefined,
	locale: "es" | "en"
): string {
	if (!value) {
		return "";
	}

	const primary = locale === "es" ? value.es : value.en;
	const fallback = locale === "es" ? value.en : value.es;

	return primary?.trim() || fallback?.trim() || "";
}

function getCategoryDisplayLabel(
	item: Pick<PublicBlogListItem, "category" | "categoryLabel">,
	locale: "es" | "en"
): string {
	const localizedLabel = getLocalizedText(item.categoryLabel, locale);

	if (localizedLabel) {
		return localizedLabel;
	}

	return item.category.trim();
}

function formatDate(value: string | null, locale: "es" | "en"): string {
	if (!value) {
		return locale === "es" ? "Sin fecha" : "No date";
	}

	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		return locale === "es" ? "Fecha inválida" : "Invalid date";
	}

	return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	}).format(parsed);
}

function isRenderableImage(value: string): boolean {
	const safe = value.trim();
	return safe.startsWith("/") || safe.startsWith("http");
}

function buildCategoryList(
	items: PublicBlogListItem[],
	locale: "es" | "en"
): CategoryFilterOption[] {
	const allOption: CategoryFilterOption = {
		key: "",
		label: locale === "es" ? "Todos" : "All",
	};

	const byKey = new Map<string, CategoryFilterOption>();

	for (const item of items) {
		const key = item.category.trim();

		if (!key) {
			continue;
		}

		if (!byKey.has(key)) {
			byKey.set(key, {
				key,
				label: getCategoryDisplayLabel(item, locale) || key,
			});
		}
	}

	const dynamicOptions = Array.from(byKey.values()).sort((a, b) =>
		a.label.localeCompare(b.label)
	);

	return [allOption, ...dynamicOptions];
}

function matchesCategoryFilter(
	item: PublicBlogListItem,
	activeCategoryKey: string
): boolean {
	if (!activeCategoryKey) {
		return true;
	}

	return item.category.trim() === activeCategoryKey.trim();
}

function matchesSearch(
	item: PublicBlogListItem,
	query: string,
	locale: "es" | "en"
): boolean {
	const normalizedQuery = query.trim().toLowerCase();

	if (!normalizedQuery) {
		return true;
	}

	const title = getLocalizedText(item.title, locale).toLowerCase();
	const excerpt = getLocalizedText(item.excerpt, locale).toLowerCase();
	const categoryLabel = getCategoryDisplayLabel(item, locale).toLowerCase();
	const rawCategory = item.category.toLowerCase();
	const tags = item.tags.join(" ").toLowerCase();

	return (
		title.includes(normalizedQuery) ||
		excerpt.includes(normalizedQuery) ||
		categoryLabel.includes(normalizedQuery) ||
		rawCategory.includes(normalizedQuery) ||
		tags.includes(normalizedQuery)
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function BlogPage() {
	const { locale } = useTranslation();
	const safeLocale = locale === "en" ? "en" : "es";

	const [items, setItems] = useState<PublicBlogListItem[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [searchValue, setSearchValue] = useState<string>("");
	const [activeCategoryKey, setActiveCategoryKey] = useState<string>("");

	const labels = useMemo(() => {
		return {
			eyebrow: safeLocale === "es" ? "Blog Sierra Tech" : "Sierra Tech Blog",
			heroTitle:
				safeLocale === "es"
					? "Soluciones reales, conocimiento aplicado"
					: "Real solutions, applied knowledge",
			heroDescription:
				safeLocale === "es"
					? "Artículos técnicos, experiencias en campo, criterios de diseño y contenido estratégico para proyectos de agua, biorremediación, energía y sistemas ambientales."
					: "Technical articles, field experience, design criteria and strategic content for water, bioremediation, energy and environmental systems projects.",
			heroPrimaryCta:
				safeLocale === "es" ? "Explorar artículos" : "Explore articles",
			heroSecondaryCta:
				safeLocale === "es" ? "Ver proyectos" : "View projects",
			featuredSection:
				safeLocale === "es" ? "Contenido destacado" : "Featured content",
			allArticles:
				safeLocale === "es" ? "Todos los artículos" : "All articles",
			readMore: safeLocale === "es" ? "Leer más" : "Read more",
			viewProject: safeLocale === "es" ? "Ver proyectos" : "View projects",
			contact: safeLocale === "es" ? "Contactar" : "Contact",
			searchPlaceholder:
				safeLocale === "es"
					? "Buscar por título, categoría o tags"
					: "Search by title, category or tags",
			latest:
				safeLocale === "es"
					? "Perspectivas, casos y contenido técnico"
					: "Insights, case studies and technical content",
			noItemsTitle:
				safeLocale === "es"
					? "No hay artículos publicados"
					: "No published articles",
			noItemsDescription:
				safeLocale === "es"
					? "Cuando existan artículos publicados, aparecerán aquí."
					: "Published articles will appear here once available.",
			loading: safeLocale === "es" ? "Cargando blog..." : "Loading blog...",
			error:
				safeLocale === "es"
					? "No se pudo cargar el blog público."
					: "Could not load the public blog.",
			tryAgain: safeLocale === "es" ? "Intentar de nuevo" : "Try again",
			finalTitle:
				safeLocale === "es"
					? "¿Buscas una solución similar para tu operación?"
					: "Looking for a similar solution for your operation?",
			finalDescription:
				safeLocale === "es"
					? "Conecta el conocimiento técnico con una propuesta real. Revisa proyectos, explora servicios o conversemos sobre tu necesidad."
					: "Connect technical knowledge with a real proposal. Explore projects, review services or let’s talk about your needs.",
			viewServices: safeLocale === "es" ? "Ver servicios" : "View services",
			untitled: safeLocale === "es" ? "Sin título" : "Untitled",
			noExcerpt:
				safeLocale === "es"
					? "Sin extracto disponible."
					: "No excerpt available.",
			categories: safeLocale === "es" ? "Categorías" : "Categories",
			nextStep: safeLocale === "es" ? "Siguiente paso" : "Next step",
			approach:
				safeLocale === "es" ? "Enfoque Sierra Tech" : "Sierra Tech approach",
			approachText:
				safeLocale === "es"
					? "Contenido técnico útil, diseño corporativo claro y conexión real con proyectos y servicios."
					: "Useful technical content, clear corporate design and a real connection with projects and services.",
		};
	}, [safeLocale]);

	const fetchBlog = useCallback(async () => {
		try {
			setIsLoading(true);
			setErrorMessage("");

			const response = await fetch("/api/public/blog", {
				method: "GET",
				cache: "no-store",
			});

			const result = (await response.json()) as PublicBlogListResponse;

			if (!response.ok || !result.ok) {
				throw new Error(result.error || labels.error);
			}

			setItems(Array.isArray(result.items) ? result.items : []);
		} catch (error) {
			setItems([]);
			setErrorMessage(error instanceof Error ? error.message : labels.error);
		} finally {
			setIsLoading(false);
		}
	}, [labels.error]);

	useEffect(() => {
		void fetchBlog();
	}, [fetchBlog]);

	const categories = useMemo(() => {
		return buildCategoryList(items, safeLocale);
	}, [items, safeLocale]);

	useEffect(() => {
		const validKeys = new Set(categories.map((item) => item.key));

		if (!validKeys.has(activeCategoryKey)) {
			setActiveCategoryKey("");
		}
	}, [activeCategoryKey, categories]);

	const filteredItems = useMemo(() => {
		return items.filter(
			(item) =>
				matchesCategoryFilter(item, activeCategoryKey) &&
				matchesSearch(item, searchValue, safeLocale)
		);
	}, [activeCategoryKey, items, safeLocale, searchValue]);

	const featuredItems = useMemo(() => {
		return filteredItems.filter((item) => item.featured);
	}, [filteredItems]);

	const nonFeaturedItems = useMemo(() => {
		return filteredItems.filter((item) => !item.featured);
	}, [filteredItems]);

	/**
	 * ES:
	 * El hero es editorial fijo.
	 * No consume artículos reales para no esconder un destacado.
	 */
	const gridItems = useMemo(() => {
		if (featuredItems.length > 0) {
			return nonFeaturedItems;
		}

		return filteredItems;
	}, [featuredItems.length, filteredItems, nonFeaturedItems]);

	return (
		<div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
			<section className="border-b border-slate-200/80 bg-white">
				<div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-24 sm:px-6 md:pb-16 md:pt-28 lg:grid-cols-12 lg:px-8 lg:pb-20 lg:pt-32">
					<div className="lg:col-span-7">
						<div className="inline-flex items-center gap-2 rounded-full border border-lime-200 bg-lime-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-lime-700">
							<Sparkles className="h-4 w-4" />
							<span>{labels.eyebrow}</span>
						</div>

						<h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
							{labels.heroTitle}
						</h1>

						<p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
							{labels.heroDescription}
						</p>

						<div className="mt-8 flex flex-wrap items-center gap-3">
							<Link
								href="#blog-list"
								className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
							>
								<span>{labels.heroPrimaryCta}</span>
								<ArrowRight className="h-4 w-4" />
							</Link>

							<Link
								href="/projects"
								className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
							>
								<span>{labels.heroSecondaryCta}</span>
							</Link>
						</div>
					</div>

					<div className="lg:col-span-5">
						<div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
							<div className="relative aspect-[4/3] bg-slate-100">
								<div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-white to-lime-50" />
								<div className="absolute inset-0 flex flex-col justify-between p-6">
									<div className="inline-flex w-fit rounded-full border border-lime-200 bg-lime-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-lime-700">
										{labels.featuredSection}
									</div>

									<div>
										<h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
											{labels.latest}
										</h2>
										<p className="mt-3 text-sm leading-6 text-slate-600">
											{labels.heroDescription}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
				<div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
					<div className="grid gap-4 lg:grid-cols-12">
						<div className="lg:col-span-7">
							<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
								{labels.allArticles}
							</label>

							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={searchValue}
									onChange={(event) => setSearchValue(event.target.value)}
									placeholder={labels.searchPlaceholder}
									className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
								/>
							</div>
						</div>

						<div className="lg:col-span-5">
							<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
								{labels.categories}
							</label>

							<div className="flex flex-wrap gap-2">
								{categories.map((category) => {
									const isActive = category.key === activeCategoryKey;

									return (
										<button
											key={category.key || "all"}
											type="button"
											onClick={() => setActiveCategoryKey(category.key)}
											className={`rounded-full px-4 py-2 text-sm font-medium transition ${isActive
													? "bg-slate-950 text-white"
													: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
												}`}
										>
											{category.label}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</section>

			{isLoading ? (
				<section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
					<div className="flex flex-col items-center justify-center gap-4">
						<Loader2 className="h-8 w-8 animate-spin text-slate-400" />
						<p className="text-sm text-slate-500">{labels.loading}</p>
					</div>
				</section>
			) : errorMessage ? (
				<section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
					<div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-red-50 p-6">
						<p className="text-sm text-red-700">{errorMessage}</p>
						<button
							type="button"
							onClick={() => void fetchBlog()}
							className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
						>
							{labels.tryAgain}
						</button>
					</div>
				</section>
			) : items.length === 0 ? (
				<section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
					<div className="mx-auto max-w-xl rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
							<FileText className="h-8 w-8" />
						</div>

						<h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
							{labels.noItemsTitle}
						</h2>

						<p className="mt-3 text-sm leading-6 text-slate-600">
							{labels.noItemsDescription}
						</p>
					</div>
				</section>
			) : (
				<>
					{featuredItems.length > 0 ? (
						<section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
							<div className="mb-6 flex items-end justify-between gap-4">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
										{labels.featuredSection}
									</p>
									<h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
										{labels.latest}
									</h2>
								</div>
							</div>

							<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
								{featuredItems.map((item) => (
									<Link
										key={item._id}
										href={`/blog/${item.slug}`}
										className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
									>
										<div className="relative aspect-[16/10] bg-slate-100">
											{item.coverImage && isRenderableImage(item.coverImage) ? (
												<Image
													src={item.coverImage}
													alt={
														getLocalizedText(item.title, safeLocale) ||
														labels.untitled
													}
													fill
													unoptimized
													className="object-cover transition duration-300 group-hover:scale-[1.02]"
													sizes="(max-width: 1280px) 100vw, 33vw"
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center text-slate-400">
													<FileText className="h-8 w-8" />
												</div>
											)}
										</div>

										<div className="p-5">
											<div className="flex flex-wrap items-center gap-2">
												{getCategoryDisplayLabel(item, safeLocale) ? (
													<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
														{getCategoryDisplayLabel(item, safeLocale)}
													</span>
												) : null}
											</div>

											<h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">
												{getLocalizedText(item.title, safeLocale) || labels.untitled}
											</h3>

											<p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
												{getLocalizedText(item.excerpt, safeLocale) ||
													labels.noExcerpt}
											</p>

											<div className="mt-5 flex items-center justify-between gap-4">
												<span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
													{formatDate(item.publishedAt, safeLocale)}
												</span>

												<span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
													{labels.readMore}
													<ArrowRight className="h-4 w-4" />
												</span>
											</div>
										</div>
									</Link>
								))}
							</div>
						</section>
					) : null}

					{gridItems.length > 0 ? (
						<section
							id="blog-list"
							className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
						>
							<div className="mb-8 flex items-end justify-between gap-4">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
										{labels.allArticles}
									</p>
									<h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
										{labels.latest}
									</h2>
								</div>
							</div>

							<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
								{gridItems.map((item) => (
									<Link
										key={item._id}
										href={`/blog/${item.slug}`}
										className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
									>
										<div className="relative aspect-[16/10] bg-slate-100">
											{item.coverImage && isRenderableImage(item.coverImage) ? (
												<Image
													src={item.coverImage}
													alt={
														getLocalizedText(item.title, safeLocale) ||
														labels.untitled
													}
													fill
													unoptimized
													className="object-cover transition duration-300 group-hover:scale-[1.02]"
													sizes="(max-width: 1280px) 100vw, 33vw"
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center text-slate-400">
													<FileText className="h-8 w-8" />
												</div>
											)}
										</div>

										<div className="p-5">
											<div className="flex flex-wrap items-center gap-2">
												{getCategoryDisplayLabel(item, safeLocale) ? (
													<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
														{getCategoryDisplayLabel(item, safeLocale)}
													</span>
												) : null}
											</div>

											<h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">
												{getLocalizedText(item.title, safeLocale) || labels.untitled}
											</h3>

											<p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
												{getLocalizedText(item.excerpt, safeLocale) ||
													labels.noExcerpt}
											</p>

											<div className="mt-5 flex items-center justify-between gap-4">
												<span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
													{formatDate(item.publishedAt, safeLocale)}
												</span>

												<span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-950">
													{labels.readMore}
													<ArrowRight className="h-4 w-4" />
												</span>
											</div>
										</div>
									</Link>
								))}
							</div>
						</section>
					) : null}

					<section className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-24">
						<div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-sm">
							<div className="grid gap-0 lg:grid-cols-12">
								<div className="bg-gradient-to-br from-white via-slate-50 to-lime-50 p-8 sm:p-10 lg:col-span-8">
									<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
										{labels.nextStep}
									</p>

									<h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
										{labels.finalTitle}
									</h2>

									<p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
										{labels.finalDescription}
									</p>

									<div className="mt-8 flex flex-wrap gap-3">
										<Link
											href="/projects"
											className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
										>
											<span>{labels.viewProject}</span>
											<ArrowRight className="h-4 w-4" />
										</Link>

										<Link
											href="/services"
											className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
										>
											<span>{labels.viewServices}</span>
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
											{labels.approach}
										</p>
										<p className="mt-4 text-sm leading-7 text-slate-100">
											{labels.approachText}
										</p>
									</div>
								</div>
							</div>
						</div>
					</section>
				</>
			)}
		</div>
	);
}