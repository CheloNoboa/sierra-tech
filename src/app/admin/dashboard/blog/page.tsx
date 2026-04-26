// src/app/admin/dashboard/blog/page.tsx

"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Blog
 * Path: src/app/admin/dashboard/blog/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa del módulo Blog.
 *
 * Responsabilidades:
 * - listar artículos del blog
 * - filtrar por búsqueda, estado y destacado
 * - crear y editar artículos mediante BlogModal
 * - eliminar artículos con GlobalConfirm
 * - usar el mismo patrón visual del módulo Maintenance
 *
 * Decisiones:
 * - filtros con GlobalFilterCard
 * - acciones con el mismo estilo usado en Maintenance
 * - mensajería con useToast
 * - confirmación global para eliminar
 * - sin window.confirm
 * - sin any
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
	ArrowRight,
	FileText,
	Filter,
	Loader2,
	Pencil,
	RefreshCcw,
	Search,
	Star,
	Trash2,
} from "lucide-react";

import BlogModal from "@/components/BlogModal";
import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import GlobalFilterCard from "@/components/ui/GlobalFilterCard";
import { useToast } from "@/components/ui/GlobalToastProvider";

import type {
	BlogAdminFilters,
	BlogListItem,
	BlogLocale,
	BlogPost,
	BlogPostListResponse,
} from "@/types/blog";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ServiceClassListItem {
	_id: string;
	key: string;
	label: {
		es: string;
		en: string;
	};
	enabled: boolean;
	order: number;
}

interface ServiceClassesResponse {
	ok: boolean;
	items?: ServiceClassListItem[];
	message?: string;
}

type BlogDeleteResponse =
	| {
		ok: true;
		message?: string;
	}
	| {
		ok: false;
		message?: string;
	};

type LocaleText = {
	eyebrow: string;
	title: string;
	subtitle: string;
	newArticle: string;
	refresh: string;
	filters: string;
	editorialSearch: string;
	search: string;
	searchPlaceholder: string;
	status: string;
	featured: string;
	all: string;
	draft: string;
	published: string;
	yes: string;
	no: string;
	clearFilters: string;
	activeFilters: string;
	mainList: string;
	registeredArticles: string;
	results: string;
	loading: string;
	emptyEyebrow: string;
	emptyTitle: string;
	emptyDescription: string;
	image: string;
	article: string;
	category: string;
	date: string;
	edit: string;
	delete: string;
	deleting: string;
	deleteTitle: string;
	deleteMessage: string;
	deleteCancel: string;
	deleteConfirm: string;
	deleteSuccess: string;
	deleteError: string;
	loadError: string;
	editLoadError: string;
	featuredBadge: string;
	noCategory: string;
	noDate: string;
	invalidDate: string;
	untitled: string;
	noExcerpt: string;
};

/* -------------------------------------------------------------------------- */
/* I18N                                                                       */
/* -------------------------------------------------------------------------- */

const TEXT: Record<BlogLocale, LocaleText> = {
	es: {
		eyebrow: "Sitio web / Blog",
		title: "Blog",
		subtitle: "Administra los artículos editoriales del sitio público.",
		newArticle: "Nuevo artículo",
		refresh: "Refrescar",
		filters: "Filtros",
		editorialSearch: "Búsqueda editorial",
		search: "Buscar",
		searchPlaceholder: "Título, extracto, categoría, tags o slug",
		status: "Estado",
		featured: "Destacado",
		all: "Todos",
		draft: "Borrador",
		published: "Publicado",
		yes: "Sí",
		no: "No",
		clearFilters: "Limpiar filtros",
		activeFilters: "Filtros activos aplicados al listado.",
		mainList: "Listado principal",
		registeredArticles: "Artículos registrados",
		results: "Resultados",
		loading: "Cargando artículos...",
		emptyEyebrow: "Sin resultados",
		emptyTitle: "Aún no hay artículos registrados",
		emptyDescription:
			"Cuando se creen artículos editoriales, aparecerán aquí para administración, edición y publicación.",
		image: "Imagen",
		article: "Artículo",
		category: "Categoría",
		date: "Fecha",
		edit: "Editar",
		delete: "Eliminar",
		deleting: "Eliminando...",
		deleteTitle: "Eliminar artículo",
		deleteMessage:
			"¿Seguro que deseas eliminar este artículo? Esta acción no se puede deshacer.",
		deleteCancel: "Cancelar",
		deleteConfirm: "Eliminar",
		deleteSuccess: "Artículo eliminado correctamente.",
		deleteError: "No se pudo eliminar el artículo.",
		loadError: "No se pudo cargar el blog.",
		editLoadError: "No se pudo cargar el artículo para edición.",
		featuredBadge: "Destacado",
		noCategory: "Sin categoría",
		noDate: "Sin fecha",
		invalidDate: "Fecha inválida",
		untitled: "Sin título",
		noExcerpt: "Sin extracto disponible.",
	},
	en: {
		eyebrow: "Website / Blog",
		title: "Blog",
		subtitle: "Manage editorial posts for the public website.",
		newArticle: "New article",
		refresh: "Refresh",
		filters: "Filters",
		editorialSearch: "Editorial search",
		search: "Search",
		searchPlaceholder: "Title, excerpt, category, tags or slug",
		status: "Status",
		featured: "Featured",
		all: "All",
		draft: "Draft",
		published: "Published",
		yes: "Yes",
		no: "No",
		clearFilters: "Clear filters",
		activeFilters: "Active filters applied to the list.",
		mainList: "Main list",
		registeredArticles: "Registered articles",
		results: "Results",
		loading: "Loading articles...",
		emptyEyebrow: "No results",
		emptyTitle: "No articles registered yet",
		emptyDescription:
			"When editorial posts are created, they will appear here for administration, editing, and publishing.",
		image: "Image",
		article: "Article",
		category: "Category",
		date: "Date",
		edit: "Edit",
		delete: "Delete",
		deleting: "Deleting...",
		deleteTitle: "Delete article",
		deleteMessage:
			"Are you sure you want to delete this article? This action cannot be undone.",
		deleteCancel: "Cancel",
		deleteConfirm: "Delete",
		deleteSuccess: "Article deleted successfully.",
		deleteError: "Could not delete the article.",
		loadError: "Could not load the blog.",
		editLoadError: "Could not load the post for editing.",
		featuredBadge: "Featured",
		noCategory: "No category",
		noDate: "No date",
		invalidDate: "Invalid date",
		untitled: "Untitled",
		noExcerpt: "No excerpt available.",
	},
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getPreferredLocale(): BlogLocale {
	if (typeof window === "undefined") return "es";

	const htmlLang = document.documentElement.lang?.toLowerCase();
	return htmlLang === "en" ? "en" : "es";
}

function createDefaultFilters(): BlogAdminFilters {
	return {
		q: "",
		status: "",
		featured: "",
	};
}

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function formatDate(value: string | null, locale: BlogLocale, text: LocaleText): string {
	if (!value) return text.noDate;

	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) return text.invalidDate;

	return new Intl.DateTimeFormat(locale === "es" ? "es-EC" : "en-US", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	}).format(parsedDate);
}

function getLocalizedValue(
	value: { es: string; en: string },
	locale: BlogLocale,
): string {
	const primary = locale === "es" ? value.es : value.en;
	const fallback = locale === "es" ? value.en : value.es;

	return primary?.trim() || fallback?.trim() || "";
}

function resolveCategoryLabel(
	categoryKey: string,
	serviceClasses: ServiceClassListItem[],
	locale: BlogLocale,
	text: LocaleText,
): string {
	const safeKey = categoryKey.trim();

	if (!safeKey) return text.noCategory;

	const match = serviceClasses.find((item) => item.key === safeKey);

	if (!match) return safeKey;

	return getLocalizedValue(match.label, locale) || safeKey;
}

function mapPostToListItem(post: BlogPost): BlogListItem {
	return {
		_id: post._id,
		slug: post.slug,
		title: post.title,
		excerpt: post.excerpt,
		coverImage: post.coverImage,
		category: post.category,
		tags: Array.isArray(post.tags) ? post.tags : [],
		relatedProjectIds: Array.isArray(post.relatedProjectIds)
			? post.relatedProjectIds
			: [],
		status: post.status,
		featured: post.featured,
		order: post.order,
		publishedAt: post.publishedAt,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt,
	};
}

function buildQueryString(filters: BlogAdminFilters): string {
	const params = new URLSearchParams();

	if (normalizeString(filters.q)) {
		params.set("q", normalizeString(filters.q));
	}

	if (filters.status) {
		params.set("status", filters.status);
	}

	if (filters.featured) {
		params.set("featured", filters.featured);
	}

	const query = params.toString();
	return query ? `?${query}` : "";
}

function matchesFilters(
	post: BlogPost,
	filters: BlogAdminFilters,
	serviceClasses: ServiceClassListItem[],
	locale: BlogLocale,
	text: LocaleText,
): boolean {
	const normalizedQuery = normalizeString(filters.q).toLowerCase();

	const visibleCategory = resolveCategoryLabel(
		post.category,
		serviceClasses,
		locale,
		text,
	).toLowerCase();

	const matchesQuery =
		!normalizedQuery ||
		post.slug.toLowerCase().includes(normalizedQuery) ||
		post.category.toLowerCase().includes(normalizedQuery) ||
		visibleCategory.includes(normalizedQuery) ||
		post.title.es.toLowerCase().includes(normalizedQuery) ||
		post.title.en.toLowerCase().includes(normalizedQuery) ||
		post.excerpt.es.toLowerCase().includes(normalizedQuery) ||
		post.excerpt.en.toLowerCase().includes(normalizedQuery) ||
		post.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

	const matchesStatus = !filters.status || post.status === filters.status;

	const matchesFeatured =
		!filters.featured ||
		(filters.featured === "true" && post.featured) ||
		(filters.featured === "false" && !post.featured);

	return matchesQuery && matchesStatus && matchesFeatured;
}

function sortPosts(items: BlogListItem[]): BlogListItem[] {
	return [...items].sort((a, b) => {
		if (a.featured !== b.featured) return a.featured ? -1 : 1;
		if (a.order !== b.order) return a.order - b.order;

		const aPublished = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
		const bPublished = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;

		if (aPublished !== bPublished) return bPublished - aPublished;

		const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
		const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;

		return bCreated - aCreated;
	});
}

function isRenderableImageUrl(value: string): boolean {
	const safeValue = value.trim();

	return (
		safeValue.startsWith("/api/admin/uploads/view?key=") ||
		safeValue.startsWith("/")
	);
}

function getStatusBadgeClasses(status: BlogListItem["status"]): string {
	return status === "published"
		? "border-emerald-200 bg-emerald-50 text-emerald-700"
		: "border-amber-200 bg-amber-50 text-amber-700";
}

/* -------------------------------------------------------------------------- */
/* Small UI blocks                                                            */
/* -------------------------------------------------------------------------- */

function EmptyState({
	error,
	text,
	onCreate,
}: {
	error: string;
	text: LocaleText;
	onCreate: () => void;
}) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="space-y-3">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
					{text.emptyEyebrow}
				</p>

				<h2 className="text-xl font-bold tracking-tight text-text-primary">
					{text.emptyTitle}
				</h2>

				<p className="text-sm leading-7 text-text-secondary">
					{text.emptyDescription}
				</p>

				{error ? (
					<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						{error}
					</div>
				) : null}

				<PrimaryButton type="button" onClick={onCreate}>
					{text.newArticle}
					<ArrowRight className="h-4 w-4" />
				</PrimaryButton>
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminBlogPage() {
	const toast = useToast();

	const [locale, setLocale] = useState<BlogLocale>("es");
	const [posts, setPosts] = useState<BlogListItem[]>([]);
	const [filters, setFilters] = useState<BlogAdminFilters>(createDefaultFilters);
	const [isLoading, setIsLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const [deleteTarget, setDeleteTarget] = useState<BlogListItem | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<"create" | "edit">("create");
	const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

	const [serviceClasses, setServiceClasses] = useState<ServiceClassListItem[]>([]);

	const text = TEXT[locale];

	const hasActiveFilters = useMemo(() => {
		return Boolean(
			normalizeString(filters.q) ||
			normalizeString(filters.status) ||
			normalizeString(filters.featured),
		);
	}, [filters]);

	useEffect(() => {
		setLocale(getPreferredLocale());
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadServiceClasses() {
			try {
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
					(Array.isArray(result.items) ? result.items : [])
						.filter((item) => item.enabled)
						.sort((a, b) => a.order - b.order),
				);
			} catch {
				if (!cancelled) {
					setServiceClasses([]);
				}
			}
		}

		void loadServiceClasses();

		return () => {
			cancelled = true;
		};
	}, []);

	const fetchPosts = useCallback(
		async (showRefreshingState: boolean) => {
			try {
				setErrorMessage("");

				if (showRefreshingState) {
					setIsRefreshing(true);
				} else {
					setIsLoading(true);
				}

				const response = await fetch(`/api/admin/blog${buildQueryString(filters)}`, {
					method: "GET",
					cache: "no-store",
				});

				const result = (await response
					.json()
					.catch(() => null)) as BlogPostListResponse | null;

				if (!response.ok || !result?.ok) {
					throw new Error(result?.message || text.loadError);
				}

				const safePosts = Array.isArray(result.data) ? result.data : [];
				setPosts(sortPosts(safePosts.map((post) => mapPostToListItem(post))));
			} catch (error) {
				setPosts([]);
				setErrorMessage(error instanceof Error ? error.message : text.loadError);
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[filters, text.loadError],
	);

	useEffect(() => {
		void fetchPosts(false);
	}, [fetchPosts]);

	async function handleDeleteConfirmed() {
		if (!deleteTarget?._id) return;

		try {
			setDeleteLoading(true);

			const response = await fetch(`/api/admin/blog/${deleteTarget._id}`, {
				method: "DELETE",
			});

			const result = (await response
				.json()
				.catch(() => null)) as BlogDeleteResponse | null;

			if (!response.ok || !result?.ok) {
				throw new Error(result?.message || text.deleteError);
			}

			setPosts((current) =>
				current.filter((post) => post._id !== deleteTarget._id),
			);

			if (selectedPost?._id === deleteTarget._id) {
				setSelectedPost(null);
			}

			setDeleteTarget(null);
			toast.success(text.deleteSuccess);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : text.deleteError);
		} finally {
			setDeleteLoading(false);
		}
	}

	function handleOpenCreate() {
		setModalMode("create");
		setSelectedPost(null);
		setIsModalOpen(true);
	}

	async function handleOpenEdit(id: string) {
		try {
			const response = await fetch(`/api/admin/blog/${id}`, {
				method: "GET",
				cache: "no-store",
			});

			const result = (await response.json().catch(() => null)) as {
				ok: boolean;
				data?: BlogPost;
				message?: string;
			} | null;

			if (!response.ok || !result?.ok || !result.data) {
				throw new Error(result?.message || text.editLoadError);
			}

			setSelectedPost(result.data);
			setModalMode("edit");
			setIsModalOpen(true);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : text.editLoadError);
		}
	}

	function handleModalSuccess(post: BlogPost) {
		const nextListItem = mapPostToListItem(post);

		setPosts((current) => {
			const exists = current.some((item) => item._id === nextListItem._id);

			if (!exists) {
				if (!matchesFilters(post, filters, serviceClasses, locale, text)) {
					return current;
				}

				return sortPosts([nextListItem, ...current]);
			}

			const updated = current.map((item) =>
				item._id === nextListItem._id ? nextListItem : item,
			);

			if (!matchesFilters(post, filters, serviceClasses, locale, text)) {
				return sortPosts(
					updated.filter((item) => item._id !== nextListItem._id),
				);
			}

			return sortPosts(updated);
		});

		setSelectedPost(post);
	}

	function handleCloseModal() {
		setIsModalOpen(false);
		setSelectedPost(null);
	}

	return (
		<div className="space-y-6 px-6 pb-6">
			<AdminPageHeader
				icon={<FileText className="h-7 w-7" />}
				eyebrow={text.eyebrow}
				title={text.title}
				subtitle={text.subtitle}
				actions={
					<div className="flex flex-wrap items-center gap-3">
						<GlobalButton
							type="button"
							variant="secondary"
							leftIcon={
								isRefreshing ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCcw className="h-4 w-4" />
								)
							}
							disabled={isRefreshing || isLoading}
							onClick={() => void fetchPosts(true)}
						>
							{text.refresh}
						</GlobalButton>

						<PrimaryButton type="button" onClick={handleOpenCreate}>
							{text.newArticle}
							<ArrowRight className="h-4 w-4" />
						</PrimaryButton>
					</div>
				}
			/>

			<GlobalFilterCard
				icon={<Filter className="h-5 w-5" />}
				eyebrow={text.filters}
				title={text.editorialSearch}
				footer={
					hasActiveFilters ? (
						<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
							{text.activeFilters}
						</div>
					) : null
				}
			>
				<div className="grid gap-4 xl:grid-cols-4">
					<div className="xl:col-span-2">
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{text.search}
						</label>

						<div className="relative">
							<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
							<input
								value={filters.q}
								onChange={(event) => {
									const value = event.currentTarget.value;

									setFilters((current) => ({
										...current,
										q: value,
									}));
								}}
								placeholder={text.searchPlaceholder}
								className="h-11 w-full rounded-2xl border border-border bg-surface pl-11 pr-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
							/>
						</div>
					</div>

					<div>
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{text.status}
						</label>

						<select
							value={filters.status}
							onChange={(event) => {
								const value = event.currentTarget.value as BlogAdminFilters["status"];

								setFilters((current) => ({
									...current,
									status: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="">{text.all}</option>
							<option value="draft">{text.draft}</option>
							<option value="published">{text.published}</option>
						</select>
					</div>

					<div>
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{text.featured}
						</label>

						<select
							value={filters.featured}
							onChange={(event) => {
								const value = event.currentTarget.value as BlogAdminFilters["featured"];

								setFilters((current) => ({
									...current,
									featured: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="">{text.all}</option>
							<option value="true">{text.yes}</option>
							<option value="false">{text.no}</option>
						</select>
					</div>

					<div className="flex items-end">
						<GlobalButton
							type="button"
							variant="secondary"
							onClick={() => setFilters(createDefaultFilters())}
						>
							{text.clearFilters}
						</GlobalButton>
					</div>
				</div>
			</GlobalFilterCard>

			<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
				<div className="mb-5 flex items-center justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{text.mainList}
						</p>

						<h2 className="text-xl font-bold tracking-tight text-text-primary">
							{text.registeredArticles}
						</h2>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3">
						<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
							{text.results}
						</p>
						<p className="mt-1 text-lg font-bold text-text-primary">
							{posts.length}
						</p>
					</div>
				</div>

				{isLoading ? (
					<div className="rounded-2xl border border-border bg-surface px-5 py-8 text-sm text-text-secondary">
						<div className="flex items-center gap-3">
							<Loader2 className="h-4 w-4 animate-spin" />
							{text.loading}
						</div>
					</div>
				) : posts.length === 0 ? (
					<EmptyState
						error={errorMessage}
						text={text}
						onCreate={handleOpenCreate}
					/>
				) : (
					<div className="space-y-4">
						{posts.map((post) => {
							const localizedTitle =
								getLocalizedValue(post.title, locale) || text.untitled;

							const localizedExcerpt =
								getLocalizedValue(post.excerpt, locale) || text.noExcerpt;

							const displayDate =
								post.status === "published"
									? formatDate(post.publishedAt, locale, text)
									: formatDate(post.updatedAt, locale, text);

							return (
								<article
									key={post._id}
									className="rounded-2xl border border-border bg-surface px-5 py-5"
								>
									<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
										<div className="min-w-0 flex-1 space-y-4">
											<div className="flex flex-wrap gap-2">
												<span
													className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
														post.status,
													)}`}
												>
													{post.status === "published"
														? text.published
														: text.draft}
												</span>

												<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
													{resolveCategoryLabel(
														post.category,
														serviceClasses,
														locale,
														text,
													)}
												</span>

												{post.featured ? (
													<span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
														<Star className="h-3 w-3 fill-current" />
														{text.featuredBadge}
													</span>
												) : null}

												<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
													/blog/{post.slug}
												</span>
											</div>

											<div className="grid gap-4 lg:grid-cols-[104px_1fr]">
												<div className="relative h-20 w-28 overflow-hidden rounded-2xl border border-border bg-white">
													{post.coverImage &&
														isRenderableImageUrl(post.coverImage) ? (
														<Image
															src={post.coverImage}
															alt={localizedTitle}
															fill
															sizes="112px"
															className="object-cover"
															unoptimized
														/>
													) : (
														<div className="flex h-full w-full items-center justify-center text-text-secondary">
															<FileText className="h-5 w-5" />
														</div>
													)}
												</div>

												<div className="min-w-0 space-y-3">
													<h3 className="break-words text-xl font-semibold text-text-primary">
														{localizedTitle}
													</h3>

													<p className="max-w-3xl text-sm leading-7 text-text-secondary">
														{localizedExcerpt}
													</p>

													<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
														<div className="rounded-2xl border border-border bg-white px-4 py-3">
															<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
																{text.category}
															</p>
															<p className="mt-2 text-sm font-semibold text-text-primary">
																{resolveCategoryLabel(
																	post.category,
																	serviceClasses,
																	locale,
																	text,
																)}
															</p>
														</div>

														<div className="rounded-2xl border border-border bg-white px-4 py-3">
															<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
																{text.date}
															</p>
															<p className="mt-2 text-sm font-semibold text-text-primary">
																{displayDate}
															</p>
														</div>

														<div className="rounded-2xl border border-border bg-white px-4 py-3">
															<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
																Tags
															</p>
															<p className="mt-2 text-sm font-semibold text-text-primary">
																{post.tags.length > 0
																	? post.tags.slice(0, 3).join(", ")
																	: "—"}
															</p>
														</div>
													</div>
												</div>
											</div>
										</div>

										<div className="flex flex-wrap gap-3 xl:justify-end">
											<button
												type="button"
												onClick={() => void handleOpenEdit(post._id)}
												className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft"
											>
												<Pencil className="h-4 w-4" />
												{text.edit}
											</button>

											<GlobalButton
												type="button"
												variant="danger"
												leftIcon={<Trash2 className="h-4 w-4" />}
												disabled={deleteLoading && deleteTarget?._id === post._id}
												onClick={() => setDeleteTarget(post)}
											>
												{deleteLoading && deleteTarget?._id === post._id
													? text.deleting
													: text.delete}
											</GlobalButton>
										</div>
									</div>
								</article>
							);
						})}
					</div>
				)}

				{!isLoading && errorMessage && posts.length > 0 ? (
					<div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						{errorMessage}
					</div>
				) : null}
			</section>

			<BlogModal
				mode={modalMode}
				open={isModalOpen}
				locale={locale}
				initialData={selectedPost}
				onClose={handleCloseModal}
				onSuccess={handleModalSuccess}
			/>

			<GlobalConfirm
				open={Boolean(deleteTarget)}
				title={text.deleteTitle}
				message={
					deleteTarget
						? `${text.deleteMessage}\n\n${getLocalizedValue(deleteTarget.title, locale) || text.untitled
						}`
						: text.deleteMessage
				}
				cancelLabel={text.deleteCancel}
				confirmLabel={text.deleteConfirm}
				loading={deleteLoading}
				onCancel={() => {
					if (!deleteLoading) {
						setDeleteTarget(null);
					}
				}}
				onConfirm={handleDeleteConfirmed}
			/>
		</div>
	);
}