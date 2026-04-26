"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Projects
 * Path: src/app/admin/dashboard/projects/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa principal del módulo Projects.
 *
 * Decisiones:
 * - No usa ProjectsDataGrid.
 * - No usa ProjectModal.
 * - Sigue la estructura visual del módulo Maintenance.
 * - La creación/edición navega a páginas dedicadas:
 *   /admin/dashboard/projects/new
 *   /admin/dashboard/projects/[id]
 * - Projects no administra schedule ni lógica operativa de Maintenance.
 * =============================================================================
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowRight,
	BriefcaseBusiness,
	FileText,
	Filter,
	FolderKanban,
	Globe,
	Pencil,
	Star,
	Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import GlobalFilterCard from "@/components/ui/GlobalFilterCard";
import { useToast } from "@/components/ui/GlobalToastProvider";

import { useTranslation } from "@/hooks/useTranslation";

import {
	DEFAULT_APP_DATE_FORMAT,
	formatAppDate,
	type AppDateFormat,
} from "@/lib/format/date.format";

import type {
	Locale,
	ProjectEntity,
	ProjectStatus,
	ProjectVisibility,
} from "@/types/project";

/* -------------------------------------------------------------------------- */
/* I18N                                                                       */
/* -------------------------------------------------------------------------- */

const TEXT: Record<
	Locale,
	{
		eyebrow: string;
		title: string;
		subtitle: string;
		newProject: string;
		totalProjects: string;
		totalDescription: string;
		publicProjects: string;
		publicDescription: string;
		privateProjects: string;
		privateDescription: string;
		totalDocuments: string;
		documentsDescription: string;
		filters: string;
		operationalSearch: string;
		search: string;
		searchPlaceholder: string;
		status: string;
		visibility: string;
		featured: string;
		all: string;
		clearFilters: string;
		activeFilters: string;
		mainList: string;
		registeredProjects: string;
		results: string;
		loading: string;
		emptyEyebrow: string;
		emptyTitle: string;
		emptyDescription: string;
		project: string;
		organization: string;
		contract: string;
		documents: string;
		updated: string;
		edit: string;
		delete: string;
		deleteTitle: string;
		deleteMessage: string;
		deleteCancel: string;
		deleteConfirm: string;
		deleteSuccess: string;
		deleteError: string;
		loadError: string;
		noOrganization: string;
		published: string;
		draft: string;
		archived: string;
		public: string;
		private: string;
		yes: string;
		no: string;
	}
> = {
	es: {
		eyebrow: "Administración / Proyectos",
		title: "Proyectos",
		subtitle:
			"Administra proyectos documentales y operativos, su publicación pública, cliente asociado, contrato base y documentos vinculados.",
		newProject: "Nuevo proyecto",
		totalProjects: "Total proyectos",
		totalDescription: "Proyectos registrados en el módulo.",
		publicProjects: "Públicos",
		publicDescription: "Proyectos visibles en el sitio público.",
		privateProjects: "Privados",
		privateDescription: "Proyectos internos o visibles solo en portal.",
		totalDocuments: "Documentos",
		documentsDescription: "Documentos asociados a proyectos.",
		filters: "Filtros",
		operationalSearch: "Búsqueda administrativa",
		search: "Buscar",
		searchPlaceholder: "Título, resumen, slug u organización",
		status: "Estado",
		visibility: "Visibilidad",
		featured: "Destacado",
		all: "Todos",
		clearFilters: "Limpiar filtros",
		activeFilters: "Filtros activos aplicados al listado.",
		mainList: "Listado principal",
		registeredProjects: "Proyectos registrados",
		results: "Resultados",
		loading: "Cargando proyectos...",
		emptyEyebrow: "Sin resultados",
		emptyTitle: "Aún no hay proyectos registrados",
		emptyDescription:
			"Cuando se creen proyectos asociados a organizaciones, aparecerán aquí para administración documental, publicación y acceso del portal cliente.",
		project: "Proyecto",
		organization: "Organización",
		contract: "Contrato",
		documents: "Documentos",
		updated: "Actualizado",
		edit: "Editar",
		delete: "Eliminar",
		deleteTitle: "Eliminar proyecto",
		deleteMessage:
			"¿Seguro que deseas eliminar este proyecto? Esta acción no se puede deshacer.",
		deleteCancel: "Cancelar",
		deleteConfirm: "Eliminar",
		deleteSuccess: "Proyecto eliminado correctamente.",
		deleteError: "No se pudo eliminar el proyecto.",
		loadError: "No se pudo cargar Proyectos.",
		noOrganization: "Sin organización",
		published: "Publicado",
		draft: "Borrador",
		archived: "Archivado",
		public: "Público",
		private: "Privado",
		yes: "Sí",
		no: "No",
	},
	en: {
		eyebrow: "Administration / Projects",
		title: "Projects",
		subtitle:
			"Manage documentary and operational projects, public publication, linked client, base contract, and related documents.",
		newProject: "New project",
		totalProjects: "Total projects",
		totalDescription: "Projects registered in the module.",
		publicProjects: "Public",
		publicDescription: "Projects visible on the public website.",
		privateProjects: "Private",
		privateDescription: "Internal projects or portal-only projects.",
		totalDocuments: "Documents",
		documentsDescription: "Documents associated with projects.",
		filters: "Filters",
		operationalSearch: "Administrative search",
		search: "Search",
		searchPlaceholder: "Title, summary, slug, or organization",
		status: "Status",
		visibility: "Visibility",
		featured: "Featured",
		all: "All",
		clearFilters: "Clear filters",
		activeFilters: "Active filters applied to the list.",
		mainList: "Main list",
		registeredProjects: "Registered projects",
		results: "Results",
		loading: "Loading projects...",
		emptyEyebrow: "No results",
		emptyTitle: "No projects registered yet",
		emptyDescription:
			"When projects associated with organizations are created, they will appear here for document management, publication, and client portal access.",
		project: "Project",
		organization: "Organization",
		contract: "Contract",
		documents: "Documents",
		updated: "Updated",
		edit: "Edit",
		delete: "Delete",
		deleteTitle: "Delete project",
		deleteMessage:
			"Are you sure you want to delete this project? This action cannot be undone.",
		deleteCancel: "Cancel",
		deleteConfirm: "Delete",
		deleteSuccess: "Project deleted successfully.",
		deleteError: "Project could not be deleted.",
		loadError: "Projects could not be loaded.",
		noOrganization: "No organization",
		published: "Published",
		draft: "Draft",
		archived: "Archived",
		public: "Public",
		private: "Private",
		yes: "Yes",
		no: "No",
	},
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ProjectFilters = {
	q: string;
	status: ProjectStatus | "all";
	visibility: ProjectVisibility | "all";
	featured: "all" | "yes" | "no";
};

type ProjectSummary = {
	totalProjects: number;
	publicProjects: number;
	privateProjects: number;
	totalDocuments: number;
};

type ProjectsListResponse =
	| {
		ok: true;
		items: ProjectEntity[];
	}
	| {
		ok: false;
		error: string;
	};

type ProjectDeleteResponse =
	| {
		ok: true;
		deletedId: string;
	}
	| {
		ok: false;
		error: string;
	};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function resolveText(
	value: { es: string; en: string },
	locale: Locale,
): string {
	const primary = locale === "es" ? value.es : value.en;
	const fallback = locale === "es" ? value.en : value.es;

	return normalizeString(primary) || normalizeString(fallback) || "—";
}

function createDefaultFilters(): ProjectFilters {
	return {
		q: "",
		status: "all",
		visibility: "all",
		featured: "all",
	};
}

function buildSummary(items: ProjectEntity[]): ProjectSummary {
	return {
		totalProjects: items.length,
		publicProjects: items.filter((item) => item.visibility === "public").length,
		privateProjects: items.filter((item) => item.visibility === "private")
			.length,
		totalDocuments: items.reduce(
			(total, item) => total + item.documents.length,
			0,
		),
	};
}

function resolveStatusLabel(status: ProjectStatus, locale: Locale): string {
	const labels: Record<Locale, Record<ProjectStatus, string>> = {
		es: {
			draft: "Borrador",
			published: "Publicado",
			archived: "Archivado",
		},
		en: {
			draft: "Draft",
			published: "Published",
			archived: "Archived",
		},
	};

	return labels[locale][status];
}

function resolveVisibilityLabel(
	visibility: ProjectVisibility,
	locale: Locale,
): string {
	if (locale === "en") {
		return visibility === "public" ? "Public" : "Private";
	}

	return visibility === "public" ? "Público" : "Privado";
}

function getStatusBadgeClasses(status: ProjectStatus): string {
	switch (status) {
		case "published":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "archived":
			return "border-slate-200 bg-slate-100 text-slate-700";
		case "draft":
		default:
			return "border-amber-200 bg-amber-50 text-amber-700";
	}
}

/* -------------------------------------------------------------------------- */
/* Small UI blocks                                                            */
/* -------------------------------------------------------------------------- */

function SummaryCard({
	title,
	value,
	description,
	icon,
}: {
	title: string;
	value: number;
	description: string;
	icon: ReactNode;
}) {
	return (
		<article className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
				{icon}
			</div>

			<p className="text-sm font-medium text-text-secondary">{title}</p>
			<p className="mt-3 text-3xl font-bold text-text-primary">{value}</p>
			<p className="mt-2 text-sm leading-6 text-text-secondary">
				{description}
			</p>
		</article>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminProjectsPage() {
	const router = useRouter();
	const toast = useToast();
	const { locale } = useTranslation();

	const safeLocale: Locale = locale === "en" ? "en" : "es";
	const t = TEXT[safeLocale];
	const dateFormat: AppDateFormat = DEFAULT_APP_DATE_FORMAT;

	const [items, setItems] = useState<ProjectEntity[]>([]);
	const [filters, setFilters] = useState<ProjectFilters>(createDefaultFilters);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [deleteTarget, setDeleteTarget] = useState<ProjectEntity | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const filteredItems = useMemo(() => {
		const query = normalizeString(filters.q).toLowerCase();

		return items.filter((item) => {
			const searchableText = [
				item.slug,
				item.clientDisplayName,
				item.clientEmail,
				item.title.es,
				item.title.en,
				item.summary.es,
				item.summary.en,
			]
				.map((value) => normalizeString(value).toLowerCase())
				.join(" ");

			const matchesQuery = !query || searchableText.includes(query);

			const matchesStatus =
				filters.status === "all" || item.status === filters.status;

			const matchesVisibility =
				filters.visibility === "all" || item.visibility === filters.visibility;

			const matchesFeatured =
				filters.featured === "all" ||
				(filters.featured === "yes" && item.featured) ||
				(filters.featured === "no" && !item.featured);

			return (
				matchesQuery &&
				matchesStatus &&
				matchesVisibility &&
				matchesFeatured
			);
		});
	}, [items, filters]);

	const summary = useMemo(() => buildSummary(items), [items]);

	const hasActiveFilters = useMemo(() => {
		return Boolean(
			normalizeString(filters.q) ||
			filters.status !== "all" ||
			filters.visibility !== "all" ||
			filters.featured !== "all",
		);
	}, [filters]);

	useEffect(() => {
		let cancelled = false;

		async function loadData() {
			try {
				setLoading(true);
				setError("");

				const response = await fetch("/api/admin/projects", {
					method: "GET",
					cache: "no-store",
				});

				const json = (await response
					.json()
					.catch(() => null)) as ProjectsListResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setItems([]);
					setError(json && !json.ok ? json.error : t.loadError);
					return;
				}

				setItems(Array.isArray(json.items) ? json.items : []);
			} catch (err) {
				if (cancelled) return;

				setItems([]);
				setError(err instanceof Error ? err.message : t.loadError);
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		void loadData();

		return () => {
			cancelled = true;
		};
	}, [t.loadError]);

	async function handleDeleteConfirmed() {
		if (!deleteTarget) return;

		try {
			setDeleteLoading(true);

			const response = await fetch(`/api/admin/projects/${deleteTarget._id}`, {
				method: "DELETE",
			});

			const json = (await response
				.json()
				.catch(() => null)) as ProjectDeleteResponse | null;

			if (!response.ok || !json || !json.ok) {
				throw new Error(json && !json.ok ? json.error : t.deleteError);
			}

			setItems((current) =>
				current.filter((item) => item._id !== deleteTarget._id),
			);

			setDeleteTarget(null);
			toast.success(t.deleteSuccess);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : t.deleteError);
		} finally {
			setDeleteLoading(false);
		}
	}

	return (
		<div className="space-y-6 px-6 pb-6">
			<AdminPageHeader
				icon={<FolderKanban className="h-7 w-7" />}
				eyebrow={t.eyebrow}
				title={t.title}
				subtitle={t.subtitle}
				actions={
					<PrimaryButton
						type="button"
						onClick={() => router.push("/admin/dashboard/projects/new")}
					>
						{t.newProject}
						<ArrowRight className="h-4 w-4" />
					</PrimaryButton>
				}
			/>

			<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title={t.totalProjects}
					value={summary.totalProjects}
					description={t.totalDescription}
					icon={<FolderKanban className="h-5 w-5" />}
				/>

				<SummaryCard
					title={t.publicProjects}
					value={summary.publicProjects}
					description={t.publicDescription}
					icon={<Globe className="h-5 w-5" />}
				/>

				<SummaryCard
					title={t.privateProjects}
					value={summary.privateProjects}
					description={t.privateDescription}
					icon={<BriefcaseBusiness className="h-5 w-5" />}
				/>

				<SummaryCard
					title={t.totalDocuments}
					value={summary.totalDocuments}
					description={t.documentsDescription}
					icon={<FileText className="h-5 w-5" />}
				/>
			</section>

			<GlobalFilterCard
				icon={<Filter className="h-5 w-5" />}
				eyebrow={t.filters}
				title={t.operationalSearch}
				footer={
					hasActiveFilters ? (
						<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
							{t.activeFilters}
						</div>
					) : null
				}
			>
				<div className="grid gap-4 xl:grid-cols-5">
					<div className="xl:col-span-2">
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.search}
						</label>

						<input
							value={filters.q}
							onChange={(event) =>
								setFilters((current) => ({
									...current,
									q: event.currentTarget.value,
								}))
							}
							placeholder={t.searchPlaceholder}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.status}
						</label>

						<select
							value={filters.status}
							onChange={(event) =>
								setFilters((current) => ({
									...current,
									status: event.currentTarget.value as ProjectFilters["status"],
								}))
							}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="all">{t.all}</option>
							<option value="draft">{t.draft}</option>
							<option value="published">{t.published}</option>
							<option value="archived">{t.archived}</option>
						</select>
					</div>

					<div>
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.visibility}
						</label>

						<select
							value={filters.visibility}
							onChange={(event) =>
								setFilters((current) => ({
									...current,
									visibility: event.currentTarget
										.value as ProjectFilters["visibility"],
								}))
							}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="all">{t.all}</option>
							<option value="public">{t.public}</option>
							<option value="private">{t.private}</option>
						</select>
					</div>

					<div>
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.featured}
						</label>

						<select
							value={filters.featured}
							onChange={(event) =>
								setFilters((current) => ({
									...current,
									featured: event.currentTarget
										.value as ProjectFilters["featured"],
								}))
							}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="all">{t.all}</option>
							<option value="yes">{t.yes}</option>
							<option value="no">{t.no}</option>
						</select>
					</div>

					<div className="flex items-end">
						<GlobalButton
							type="button"
							variant="secondary"
							onClick={() => setFilters(createDefaultFilters())}
						>
							{t.clearFilters}
						</GlobalButton>
					</div>
				</div>
			</GlobalFilterCard>

			<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
				<div className="mb-5 flex items-center justify-between gap-4">
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.mainList}
						</p>

						<h2 className="text-xl font-bold tracking-tight text-text-primary">
							{t.registeredProjects}
						</h2>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3">
						<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
							{t.results}
						</p>
						<p className="mt-1 text-lg font-bold text-text-primary">
							{filteredItems.length}
						</p>
					</div>
				</div>

				{loading ? (
					<div className="rounded-2xl border border-border bg-surface px-5 py-8 text-sm text-text-secondary">
						{t.loading}
					</div>
				) : filteredItems.length === 0 ? (
					<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
								{t.emptyEyebrow}
							</p>

							<h2 className="text-xl font-bold tracking-tight text-text-primary">
								{t.emptyTitle}
							</h2>

							<p className="text-sm leading-7 text-text-secondary">
								{t.emptyDescription}
							</p>

							{error ? (
								<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
									{error}
								</div>
							) : null}
						</div>
					</section>
				) : (
					<div className="space-y-4">
						{filteredItems.map((item) => {
							const title = resolveText(item.title, safeLocale);
							const summaryText = resolveText(item.summary, safeLocale);

							return (
								<article
									key={item._id}
									className="rounded-2xl border border-border bg-surface px-5 py-5"
								>
									<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
										<div className="min-w-0 flex-1 space-y-3">
											<div className="flex flex-wrap gap-2">
												<span
													className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClasses(
														item.status,
													)}`}
												>
													{resolveStatusLabel(item.status, safeLocale)}
												</span>

												<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
													{resolveVisibilityLabel(item.visibility, safeLocale)}
												</span>

												{item.featured ? (
													<span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
														<Star className="h-3.5 w-3.5" />
														{t.featured}
													</span>
												) : null}
											</div>

											<h3 className="break-words text-xl font-semibold text-text-primary">
												{title}
											</h3>

											<p className="max-w-4xl text-sm leading-7 text-text-secondary">
												{summaryText}
											</p>

											<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
												<div className="rounded-2xl border border-border bg-white px-4 py-3">
													<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
														{t.organization}
													</p>
													<p className="mt-2 text-sm font-semibold text-text-primary">
														{item.clientDisplayName || t.noOrganization}
													</p>
												</div>

												<div className="rounded-2xl border border-border bg-white px-4 py-3">
													<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
														Slug
													</p>
													<p className="mt-2 break-words text-sm font-semibold text-text-primary">
														{item.slug}
													</p>
												</div>

												<div className="rounded-2xl border border-border bg-white px-4 py-3">
													<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
														{t.contract}
													</p>
													<p className="mt-2 text-sm font-semibold text-text-primary">
														{formatAppDate(item.contractStartDate, dateFormat)}
													</p>
												</div>

												<div className="rounded-2xl border border-border bg-white px-4 py-3">
													<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
														{t.documents}
													</p>
													<p className="mt-2 text-sm font-semibold text-text-primary">
														{item.documents.length}
													</p>
												</div>
											</div>

											<p className="text-xs text-text-muted">
												{t.updated}: {formatAppDate(item.updatedAt, dateFormat)}
											</p>
										</div>

										<div className="flex flex-wrap gap-3 xl:justify-end">
											<Link
												href={`/admin/dashboard/projects/${item._id}`}
												className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition hover:border-brand-secondary hover:bg-surface-soft"
											>
												<Pencil className="h-4 w-4" />
												{t.edit}
											</Link>

											<GlobalButton
												type="button"
												variant="danger"
												leftIcon={<Trash2 className="h-4 w-4" />}
												onClick={() => setDeleteTarget(item)}
											>
												{t.delete}
											</GlobalButton>
										</div>
									</div>
								</article>
							);
						})}
					</div>
				)}

				{!loading && error ? (
					<div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						{error}
					</div>
				) : null}
			</section>

			<GlobalConfirm
				open={Boolean(deleteTarget)}
				title={t.deleteTitle}
				message={
					deleteTarget
						? `${t.deleteMessage}\n\n${resolveText(
							deleteTarget.title,
							safeLocale,
						)}`
						: t.deleteMessage
				}
				cancelLabel={t.deleteCancel}
				confirmLabel={t.deleteConfirm}
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