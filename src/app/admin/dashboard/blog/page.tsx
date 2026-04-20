// src/app/admin/dashboard/blog/page.tsx

"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Blog
 * Path: src/app/admin/dashboard/blog/page.tsx
 * =============================================================================
 *
 * ES:
 *   Pantalla administrativa base del módulo Blog para Sierra Tech.
 *
 *   Responsabilidades:
 *   - listar artículos del blog
 *   - permitir búsqueda y filtros administrativos
 *   - permitir refresco manual
 *   - permitir eliminación de artículos
 *   - integrar create / edit mediante BlogModal
 *
 *   Decisiones:
 *   - la tabla sigue siendo simple y estable
 *   - create / edit actualizan estado local sin recarga dura
 *   - para editar se reutiliza el registro disponible en memoria
 *   - el idioma visual se resuelve desde locale actual
 *
 *   Nota:
 *   - la siguiente mejora natural será conectar upload real a R2
 *   - luego podremos evolucionar a DataGrid compartido si hace falta
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Loader2,
	RefreshCcw,
	Search,
	Trash2,
	Plus,
	FileText,
	Star,
	Pencil,
} from "lucide-react";
import BlogModal from "@/components/BlogModal";
import type {
	BlogAdminFilters,
	BlogListItem,
	BlogLocale,
	BlogPost,
	BlogPostListResponse,
} from "@/types/blog";
import Image from "next/image";

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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getPreferredLocale(): BlogLocale {
	if (typeof window === "undefined") {
		return "es";
	}

	const htmlLang = document.documentElement.lang?.toLowerCase();

	if (htmlLang === "en") {
		return "en";
	}

	return "es";
}

function formatDate(value: string | null, locale: BlogLocale): string {
	if (!value) {
		return locale === "es" ? "Sin fecha" : "No date";
	}

	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return locale === "es" ? "Fecha inválida" : "Invalid date";
	}

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
): string {
	const safeKey = categoryKey.trim();

	if (!safeKey) {
		return locale === "es" ? "Sin categoría" : "No category";
	}

	const match = serviceClasses.find((item) => item.key === safeKey);

	if (!match) {
		return safeKey;
	}

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

	if (filters.q.trim()) {
		params.set("q", filters.q.trim());
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
): boolean {
	const normalizedQuery = filters.q.trim().toLowerCase();

	const visibleCategory = resolveCategoryLabel(
		post.category,
		serviceClasses,
		locale,
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
		if (a.featured !== b.featured) {
			return a.featured ? -1 : 1;
		}

		if (a.order !== b.order) {
			return a.order - b.order;
		}

		const aPublished = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
		const bPublished = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;

		if (aPublished !== bPublished) {
			return bPublished - aPublished;
		}

		const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
		const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;

		return bCreated - aCreated;
	});
}

function isRenderableImageUrl(value: string): boolean {
	const safeValue = value.trim();

	return safeValue.startsWith("/api/admin/uploads/view?key=") || safeValue.startsWith("/");
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminBlogPage() {
	const [locale, setLocale] = useState<BlogLocale>("es");
	const [posts, setPosts] = useState<BlogListItem[]>([]);
	const [filters, setFilters] = useState<BlogAdminFilters>({
		q: "",
		status: "",
		featured: "",
	});
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
	const [isDeletingId, setIsDeletingId] = useState<string>("");
	const [errorMessage, setErrorMessage] = useState<string>("");

	const [deleteTarget, setDeleteTarget] = useState<BlogListItem | null>(null);
	const [pageNotice, setPageNotice] = useState<string>("");

	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [modalMode, setModalMode] = useState<"create" | "edit">("create");
	const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

	const [serviceClasses, setServiceClasses] = useState<ServiceClassListItem[]>([]);

	useEffect(() => {
		setLocale(getPreferredLocale());
	}, []);

	useEffect(() => {
		let cancelled = false;

		const loadServiceClasses = async () => {
			try {
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
						(Array.isArray(result.items) ? result.items : [])
							.filter((item) => item.enabled)
							.sort((a, b) => a.order - b.order),
					);
				}
			} catch {
				if (!cancelled) {
					setServiceClasses([]);
				}
			}
		};

		void loadServiceClasses();

		return () => {
			cancelled = true;
		};
	}, []);

	const labels = useMemo(() => {
		return {
			title: locale === "es" ? "Blog" : "Blog",
			subtitle:
				locale === "es"
					? "Administra los artículos editoriales del sitio público."
					: "Manage editorial posts for the public website.",
			create: locale === "es" ? "Nuevo artículo" : "New article",
			refresh: locale === "es" ? "Refrescar" : "Refresh",
			searchPlaceholder:
				locale === "es"
					? "Buscar por título, extracto, categoría, tags o slug"
					: "Search by title, excerpt, category, tags or slug",
			status: locale === "es" ? "Estado" : "Status",
			featured: locale === "es" ? "Destacado" : "Featured",
			all: locale === "es" ? "Todos" : "All",
			draft: locale === "es" ? "Borrador" : "Draft",
			published: locale === "es" ? "Publicado" : "Published",
			yes: locale === "es" ? "Sí" : "Yes",
			no: locale === "es" ? "No" : "No",
			image: locale === "es" ? "Imagen" : "Image",
			article: locale === "es" ? "Artículo" : "Article",
			category: locale === "es" ? "Categoría" : "Category",
			date: locale === "es" ? "Fecha" : "Date",
			actions: locale === "es" ? "Acciones" : "Actions",
			noCategory: locale === "es" ? "Sin categoría" : "No category",
			noPostsTitle:
				locale === "es" ? "No hay artículos todavía" : "No posts yet",
			noPostsDescription:
				locale === "es"
					? "Cuando empieces a crear artículos, aparecerán aquí."
					: "Once you start creating posts, they will appear here.",
			loading: locale === "es" ? "Cargando artículos..." : "Loading posts...",
			deleting: locale === "es" ? "Eliminando..." : "Deleting...",
			delete: locale === "es" ? "Eliminar" : "Delete",
			edit: locale === "es" ? "Editar" : "Edit",
			deleteConfirm:
				locale === "es"
					? "¿Seguro que deseas eliminar este artículo?"
					: "Are you sure you want to delete this post?",
			deleteFailed:
				locale === "es"
					? "No se pudo eliminar el artículo."
					: "Could not delete the post.",
			fetchFailed:
				locale === "es"
					? "No se pudo cargar el blog."
					: "Could not load the blog.",
			retry: locale === "es" ? "Intentar de nuevo" : "Try again",
			featuredBadge: locale === "es" ? "Destacado" : "Featured",
			records: locale === "es" ? "artículos" : "posts",
			close: locale === "es" ? "Cerrar" : "Close",
			confirmDeleteTitle:
				locale === "es" ? "Eliminar artículo" : "Delete article",
			confirmDeleteMessage:
				locale === "es"
					? "Esta acción eliminará el artículo de forma permanente."
					: "This action will permanently delete the article.",
			confirmDeleteAction:
				locale === "es" ? "Sí, eliminar" : "Yes, delete",
			dismissNotice:
				locale === "es" ? "Cerrar mensaje" : "Dismiss message",
			editLoadFailed:
				locale === "es"
					? "No se pudo cargar el artículo para edición."
					: "Could not load the post for editing.",
			cancel: locale === "es" ? "Cancelar" : "Cancel",
		};
	}, [locale]);

	const fetchPosts = useCallback(
		async (showRefreshingState: boolean) => {
			try {
				setErrorMessage("");

				if (showRefreshingState) {
					setIsRefreshing(true);
				} else {
					setIsLoading(true);
				}

				const query = buildQueryString(filters);
				const response = await fetch(`/api/admin/blog${query}`, {
					method: "GET",
					cache: "no-store",
				});

				const result = (await response.json()) as BlogPostListResponse;

				if (!response.ok || !result.ok) {
					throw new Error(result.message || labels.fetchFailed);
				}

				const safePosts = Array.isArray(result.data) ? result.data : [];
				setPosts(sortPosts(safePosts.map((post) => mapPostToListItem(post))));
			} catch (error) {
				console.error("Failed to fetch blog posts:", error);
				setPosts([]);
				setErrorMessage(
					error instanceof Error ? error.message : labels.fetchFailed,
				);
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[filters, labels.fetchFailed],
	);

	useEffect(() => {
		void fetchPosts(false);
	}, [fetchPosts]);

	const handleRefresh = async () => {
		await fetchPosts(true);
	};

	const handleRequestDelete = (post: BlogListItem) => {
		if (isDeletingId) {
			return;
		}

		setDeleteTarget(post);
	};

	const handleConfirmDelete = async () => {
		if (!deleteTarget?._id) {
			return;
		}

		try {
			setIsDeletingId(deleteTarget._id);
			setPageNotice("");
			setErrorMessage("");

			const response = await fetch(`/api/admin/blog/${deleteTarget._id}`, {
				method: "DELETE",
			});

			const result = (await response.json()) as {
				ok: boolean;
				message?: string;
			};

			if (!response.ok || !result.ok) {
				throw new Error(result.message || labels.deleteFailed);
			}

			setPosts((current) =>
				current.filter((post) => post._id !== deleteTarget._id),
			);

			if (selectedPost?._id === deleteTarget._id) {
				setSelectedPost(null);
			}

			setDeleteTarget(null);
		} catch (error) {
			console.error("Failed to delete blog post:", error);
			setPageNotice(
				error instanceof Error ? error.message : labels.deleteFailed,
			);
		} finally {
			setIsDeletingId("");
		}
	};

	const handleOpenCreate = () => {
		setPageNotice("");
		setModalMode("create");
		setSelectedPost(null);
		setIsModalOpen(true);
	};

	const handleOpenEdit = async (id: string) => {
		try {
			setPageNotice("");

			const response = await fetch(`/api/admin/blog/${id}`, {
				method: "GET",
				cache: "no-store",
			});

			const result = (await response.json()) as {
				ok: boolean;
				data?: BlogPost;
				message?: string;
			};

			if (!response.ok || !result.ok || !result.data) {
				throw new Error(result.message || labels.fetchFailed);
			}

			setSelectedPost(result.data);
			setModalMode("edit");
			setIsModalOpen(true);
		} catch (error) {
			console.error("Failed to load blog post for edit:", error);
			setPageNotice(
				error instanceof Error ? error.message : labels.editLoadFailed,
			);
		}
	};

	const handleModalSuccess = (post: BlogPost) => {
		const nextListItem = mapPostToListItem(post);

		setPosts((current) => {
			const exists = current.some((item) => item._id === nextListItem._id);

			if (!exists) {
				if (!matchesFilters(post, filters, serviceClasses, locale)) {
					return current;
				}

				return sortPosts([nextListItem, ...current]);
			}

			const updated = current.map((item) =>
				item._id === nextListItem._id ? nextListItem : item,
			);

			if (!matchesFilters(post, filters, serviceClasses, locale)) {
				return sortPosts(
					updated.filter((item) => item._id !== nextListItem._id),
				);
			}

			return sortPosts(updated);
		});

		setSelectedPost(post);
	};

	const handleCloseModal = () => {
		setIsModalOpen(false);
		setSelectedPost(null);
	};

	const totalPostsLabel = useMemo(() => {
		return `${posts.length} ${labels.records}`;
	}, [labels.records, posts.length]);

	return (
		<>
			<div className="space-y-6">
				{pageNotice ? (
					<section className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm font-medium text-red-700">{pageNotice}</p>

							<button
								type="button"
								onClick={() => setPageNotice("")}
								className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
							>
								{labels.dismissNotice}
							</button>
						</div>
					</section>
				) : null}
				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-2">
							<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
								<FileText className="h-4 w-4" />
								<span>{labels.title}</span>
							</div>

							<div>
								<h1 className="text-2xl font-semibold tracking-tight text-slate-900">
									{labels.title}
								</h1>
								<p className="mt-1 max-w-2xl text-sm text-slate-600">
									{labels.subtitle}
								</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={handleRefresh}
								disabled={isRefreshing || isLoading}
								className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isRefreshing ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCcw className="h-4 w-4" />
								)}
								<span>{labels.refresh}</span>
							</button>

							<button
								type="button"
								onClick={handleOpenCreate}
								className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								<Plus className="h-4 w-4" />
								<span>{labels.create}</span>
							</button>
						</div>
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
						<div className="xl:col-span-6">
							<label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
								{labels.article}
							</label>

							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={filters.q}
									onChange={(event) =>
										setFilters((current) => ({
											...current,
											q: event.target.value,
										}))
									}
									placeholder={labels.searchPlaceholder}
									className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
								/>
							</div>
						</div>

						<div className="xl:col-span-3">
							<label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
								{labels.status}
							</label>
							<select
								value={filters.status}
								onChange={(event) =>
									setFilters((current) => ({
										...current,
										status: event.target.value as BlogAdminFilters["status"],
									}))
								}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
							>
								<option value="">{labels.all}</option>
								<option value="draft">{labels.draft}</option>
								<option value="published">{labels.published}</option>
							</select>
						</div>

						<div className="xl:col-span-3">
							<label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
								{labels.featured}
							</label>
							<select
								value={filters.featured}
								onChange={(event) =>
									setFilters((current) => ({
										...current,
										featured: event.target
											.value as BlogAdminFilters["featured"],
									}))
								}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
							>
								<option value="">{labels.all}</option>
								<option value="true">{labels.yes}</option>
								<option value="false">{labels.no}</option>
							</select>
						</div>
					</div>

					<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
						<p className="text-sm text-slate-500">{totalPostsLabel}</p>

						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() =>
									setFilters({
										q: "",
										status: "",
										featured: "",
									})
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
							>
								{labels.all}
							</button>

							<button
								type="button"
								onClick={() => void fetchPosts(true)}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								{labels.refresh}
							</button>
						</div>
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
					{isLoading ? (
						<div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
							<Loader2 className="h-8 w-8 animate-spin text-slate-400" />
							<p className="text-sm text-slate-500">{labels.loading}</p>
						</div>
					) : errorMessage ? (
						<div className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
							<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
								{errorMessage}
							</div>

							<button
								type="button"
								onClick={() => void fetchPosts(false)}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								{labels.retry}
							</button>
						</div>
					) : posts.length === 0 ? (
						<div className="flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
							<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
								<FileText className="h-7 w-7" />
							</div>

							<div className="space-y-1">
								<h2 className="text-lg font-semibold text-slate-900">
									{labels.noPostsTitle}
								</h2>
								<p className="max-w-md text-sm text-slate-500">
									{labels.noPostsDescription}
								</p>
							</div>

							<button
								type="button"
								onClick={handleOpenCreate}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								{labels.create}
							</button>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full border-collapse">
								<thead>
									<tr className="border-b border-slate-200 bg-slate-50/80 text-left">
										<th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
											{labels.image}
										</th>
										<th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
											{labels.article}
										</th>
										<th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
											{labels.category}
										</th>
										<th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
											{labels.status}
										</th>
										<th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
											{labels.date}
										</th>
										<th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
											{labels.actions}
										</th>
									</tr>
								</thead>

								<tbody>
									{posts.map((post) => {
										const localizedTitle =
											getLocalizedValue(post.title, locale) ||
											(locale === "es" ? "Sin título" : "Untitled");

										const localizedExcerpt =
											getLocalizedValue(post.excerpt, locale) ||
											(locale === "es"
												? "Sin extracto disponible."
												: "No excerpt available.");

										const displayDate =
											post.status === "published"
												? formatDate(post.publishedAt, locale)
												: formatDate(post.updatedAt, locale);

										return (
											<tr
												key={post._id}
												className="border-b border-slate-100 align-top transition hover:bg-slate-50/50"
											>
												<td className="px-5 py-4">
													<div className="relative h-16 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
														{post.coverImage && isRenderableImageUrl(post.coverImage) ? (
															<Image
																src={post.coverImage}
																alt={localizedTitle}
																fill
																sizes="96px"
																className="object-cover"
																unoptimized
															/>
														) : (
															<div className="flex h-full w-full items-center justify-center text-slate-400">
																<FileText className="h-5 w-5" />
															</div>
														)}
													</div>
												</td>

												<td className="px-5 py-4">
													<div className="space-y-2">
														<div className="flex flex-wrap items-center gap-2">
															<h3 className="text-sm font-semibold text-slate-900">
																{localizedTitle}
															</h3>

															{post.featured ? (
																<span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
																	<Star className="h-3 w-3 fill-current" />
																	{labels.featuredBadge}
																</span>
															) : null}

															<span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
																/blog/{post.slug}
															</span>
														</div>

														<p className="max-w-xl text-sm leading-6 text-slate-600">
															{localizedExcerpt}
														</p>

														{post.tags.length > 0 ? (
															<div className="flex flex-wrap gap-2">
																{post.tags.slice(0, 4).map((tag) => (
																	<span
																		key={`${post._id}-${tag}`}
																		className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
																	>
																		#{tag}
																	</span>
																))}
															</div>
														) : null}
													</div>
												</td>

												<td className="px-5 py-4">
													<span className="text-sm text-slate-700">
														{resolveCategoryLabel(post.category, serviceClasses, locale)}
													</span>
												</td>

												<td className="px-5 py-4">
													<span
														className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${post.status === "published"
															? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200"
															: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"
															}`}
													>
														{post.status === "published"
															? labels.published
															: labels.draft}
													</span>
												</td>

												<td className="px-5 py-4">
													<span className="text-sm text-slate-600">
														{displayDate}
													</span>
												</td>

												<td className="px-5 py-4">
													<div className="flex items-center gap-2">
														<button
															type="button"
															onClick={() => void handleOpenEdit(post._id)}
															className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
														>
															<Pencil className="h-4 w-4" />
															<span>{labels.edit}</span>
														</button>

														<button
															type="button"
															onClick={() => handleRequestDelete(post)}
															disabled={isDeletingId === post._id}
															className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
														>
															{isDeletingId === post._id ? (
																<Loader2 className="h-4 w-4 animate-spin" />
															) : (
																<Trash2 className="h-4 w-4" />
															)}
															<span>
																{isDeletingId === post._id
																	? labels.deleting
																	: labels.delete}
															</span>
														</button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</section>
			</div>

			<BlogModal
				mode={modalMode}
				open={isModalOpen}
				locale={locale}
				initialData={selectedPost}
				onClose={handleCloseModal}
				onSuccess={handleModalSuccess}
			/>

			{/* 🔴 MODAL DE CONFIRMACIÓN DELETE */}
			{deleteTarget ? (
				<div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4">
					<div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white shadow-2xl">
						<div className="border-b border-slate-200 px-6 py-5">
							<h2 className="text-lg font-semibold text-slate-900">
								{labels.confirmDeleteTitle}
							</h2>
						</div>

						<div className="px-6 py-5">
							<p className="text-sm leading-6 text-slate-600">
								{labels.confirmDeleteMessage}
							</p>

							<p className="mt-3 text-sm font-semibold text-slate-900">
								{getLocalizedValue(deleteTarget.title, locale) ||
									(locale === "es" ? "Sin título" : "Untitled")}
							</p>

							<p className="mt-1 text-xs text-slate-500">
								/blog/{deleteTarget.slug}
							</p>
						</div>

						<div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={() => setDeleteTarget(null)}
								disabled={isDeletingId === deleteTarget._id}
								className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{labels.cancel}
							</button>

							<button
								type="button"
								onClick={() => void handleConfirmDelete()}
								disabled={isDeletingId === deleteTarget._id}
								className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isDeletingId === deleteTarget._id ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Trash2 className="h-4 w-4" />
								)}
								<span>
									{isDeletingId === deleteTarget._id
										? labels.deleting
										: labels.confirmDeleteAction}
								</span>
							</button>
						</div>
					</div>
				</div>
			) : null}

		</>
	);
}
