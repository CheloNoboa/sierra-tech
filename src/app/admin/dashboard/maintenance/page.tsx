"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Maintenance
 * Path: src/app/admin/dashboard/maintenance/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa principal del módulo Maintenance.
 *
 * Responsabilidades:
 * - listar mantenimientos creados
 * - mostrar resumen operativo
 * - permitir filtros básicos con GlobalFilterCard
 * - permitir edición y eliminación con confirmación global
 * - servir como entrada para crear, editar y operar mantenimientos
 *
 * Decisiones:
 * - la fuente de verdad del listado es GET /api/admin/maintenance
 * - la eliminación usa DELETE /api/admin/maintenance/[id]
 * - la confirmación usa GlobalConfirm
 * - la mensajería usa useToast
 * - no se usa any
 *
 * EN:
 * Main admin page for the Maintenance module.
 * =============================================================================
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	ArrowRight,
	ClipboardList,
	Filter,
	CalendarCog,
	AlertTriangle,
	CalendarClock,
	Pencil,
	Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import GlobalFilterCard from "@/components/ui/GlobalFilterCard";
import { useToast } from "@/components/ui/GlobalToastProvider";

import {
	DEFAULT_APP_DATE_FORMAT,
	formatAppDate,
	type AppDateFormat,
} from "@/lib/format/date.format";

import type {
	MaintenanceFilters,
	MaintenanceGenerationMode,
	MaintenanceListItem,
	MaintenanceStatus,
	MaintenanceSummary,
	MaintenanceType,
} from "@/types/maintenance";

/* -------------------------------------------------------------------------- */
/* I18N                                                                       */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";

const TEXT: Record<
	Locale,
	{
		eyebrow: string;
		title: string;
		subtitle: string;
		newMaintenance: string;
		totalMaintenances: string;
		totalDescription: string;
		active: string;
		activeDescription: string;
		overdue: string;
		overdueDescription: string;
		upcomingEvents: string;
		upcomingDescription: string;
		filters: string;
		operationalSearch: string;
		search: string;
		searchPlaceholder: string;
		status: string;
		mode: string;
		type: string;
		all: string;
		clearFilters: string;
		activeFilters: string;
		mainList: string;
		registeredMaintenances: string;
		results: string;
		loading: string;
		emptyEyebrow: string;
		emptyTitle: string;
		emptyDescription: string;
		organization: string;
		project: string;
		nextDate: string;
		events: string;
		completed: string;
		edit: string;
		delete: string;
		deleteTitle: string;
		deleteMessage: string;
		deleteCancel: string;
		deleteConfirm: string;
		deleteSuccess: string;
		deleteError: string;
		loadError: string;
	}
> = {
	es: {
		eyebrow: "Operaciones / Mantenimiento",
		title: "Mantenimientos",
		subtitle:
			"Administra mantenimientos por proyecto, controla programaciones, próximas fechas, estado operativo y base documental asociada.",
		newMaintenance: "Nuevo mantenimiento",
		totalMaintenances: "Total mantenimientos",
		totalDescription: "Mantenimientos registrados en el módulo.",
		active: "Activos",
		activeDescription: "Mantenimientos en curso o programados.",
		overdue: "Vencidos",
		overdueDescription: "Mantenimientos con eventos atrasados.",
		upcomingEvents: "Eventos próximos",
		upcomingDescription: "Eventos pendientes dentro de la programación.",
		filters: "Filtros",
		operationalSearch: "Búsqueda operativa",
		search: "Buscar",
		searchPlaceholder: "Título, proyecto, organización o notas",
		status: "Estado",
		mode: "Modo",
		type: "Tipo",
		all: "Todos",
		clearFilters: "Limpiar filtros",
		activeFilters: "Filtros activos aplicados al listado.",
		mainList: "Listado principal",
		registeredMaintenances: "Mantenimientos registrados",
		results: "Resultados",
		loading: "Cargando mantenimientos...",
		emptyEyebrow: "Sin resultados",
		emptyTitle: "Aún no hay mantenimientos registrados",
		emptyDescription:
			"Cuando se creen mantenimientos asociados a proyectos, aparecerán aquí para administración, seguimiento y operación de la programación.",
		organization: "Organización",
		project: "Proyecto",
		nextDate: "Próxima fecha",
		events: "Eventos",
		completed: "completados",
		edit: "Editar",
		delete: "Eliminar",
		deleteTitle: "Eliminar mantenimiento",
		deleteMessage:
			"¿Seguro que deseas eliminar este mantenimiento? Esta acción no se puede deshacer.",
		deleteCancel: "Cancelar",
		deleteConfirm: "Eliminar",
		deleteSuccess: "Mantenimiento eliminado correctamente.",
		deleteError: "No se pudo eliminar el mantenimiento.",
		loadError: "No se pudo cargar Mantenimiento.",
	},
	en: {
		eyebrow: "Operations / Maintenance",
		title: "Maintenance",
		subtitle:
			"Manage project maintenance, schedules, upcoming dates, operational status, and related documentation.",
		newMaintenance: "New maintenance",
		totalMaintenances: "Total maintenances",
		totalDescription: "Maintenances registered in the module.",
		active: "Active",
		activeDescription: "Maintenances in progress or scheduled.",
		overdue: "Overdue",
		overdueDescription: "Maintenances with overdue events.",
		upcomingEvents: "Upcoming events",
		upcomingDescription: "Pending events within the schedule.",
		filters: "Filters",
		operationalSearch: "Operational search",
		search: "Search",
		searchPlaceholder: "Title, project, organization, or notes",
		status: "Status",
		mode: "Mode",
		type: "Type",
		all: "All",
		clearFilters: "Clear filters",
		activeFilters: "Active filters applied to the list.",
		mainList: "Main list",
		registeredMaintenances: "Registered maintenances",
		results: "Results",
		loading: "Loading maintenances...",
		emptyEyebrow: "No results",
		emptyTitle: "No maintenances registered yet",
		emptyDescription:
			"When maintenances associated with projects are created, they will appear here for administration, tracking, and schedule operation.",
		organization: "Organization",
		project: "Project",
		nextDate: "Next date",
		events: "Events",
		completed: "completed",
		edit: "Edit",
		delete: "Delete",
		deleteTitle: "Delete maintenance",
		deleteMessage:
			"Are you sure you want to delete this maintenance? This action cannot be undone.",
		deleteCancel: "Cancel",
		deleteConfirm: "Delete",
		deleteSuccess: "Maintenance deleted successfully.",
		deleteError: "Maintenance could not be deleted.",
		loadError: "Maintenance could not be loaded.",
	},
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MaintenanceListResponse =
	| {
		ok: true;
		items: MaintenanceListItem[];
		summary: MaintenanceSummary;
	}
	| {
		ok: false;
		error: string;
	};

type MaintenanceDeleteResponse =
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

function resolveMaintenanceTypeLabel(
	value: MaintenanceType,
	locale: Locale,
): string {
	const labels: Record<Locale, Record<MaintenanceType, string>> = {
		es: {
			preventive: "Preventivo",
			corrective: "Correctivo",
			cleaning: "Limpieza",
			inspection: "Inspección",
			replacement: "Reemplazo",
			other: "Otro",
		},
		en: {
			preventive: "Preventive",
			corrective: "Corrective",
			cleaning: "Cleaning",
			inspection: "Inspection",
			replacement: "Replacement",
			other: "Other",
		},
	};

	return labels[locale][value] ?? labels[locale].other;
}

function resolveGenerationModeLabel(
	value: MaintenanceGenerationMode,
	locale: Locale,
): string {
	if (locale === "en") {
		return value === "manual" ? "Manual" : "Automatic";
	}

	return value === "manual" ? "Manual" : "Automático";
}

function resolveStatusLabel(value: MaintenanceStatus, locale: Locale): string {
	const labels: Record<Locale, Record<MaintenanceStatus, string>> = {
		es: {
			scheduled: "Programado",
			active: "Activo",
			completed: "Completado",
			overdue: "Vencido",
			cancelled: "Cancelado",
		},
		en: {
			scheduled: "Scheduled",
			active: "Active",
			completed: "Completed",
			overdue: "Overdue",
			cancelled: "Cancelled",
		},
	};

	return labels[locale][value] ?? "—";
}

function getStatusBadgeClasses(status: MaintenanceStatus): string {
	switch (status) {
		case "completed":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "overdue":
			return "border-rose-200 bg-rose-50 text-rose-700";
		case "active":
			return "border-brand-primary/20 bg-brand-primary/10 text-brand-primaryStrong";
		case "cancelled":
			return "border-slate-200 bg-slate-100 text-slate-700";
		case "scheduled":
		default:
			return "border-amber-200 bg-amber-50 text-amber-700";
	}
}

function buildQueryString(filters: MaintenanceFilters): string {
	const params = new URLSearchParams();

	if (normalizeString(filters.q)) {
		params.set("q", normalizeString(filters.q));
	}

	if (filters.organizationId && filters.organizationId !== "all") {
		params.set("organizationId", filters.organizationId);
	}

	if (filters.projectId && filters.projectId !== "all") {
		params.set("projectId", filters.projectId);
	}

	if (filters.status && filters.status !== "all") {
		params.set("status", filters.status);
	}

	if (filters.maintenanceType && filters.maintenanceType !== "all") {
		params.set("maintenanceType", filters.maintenanceType);
	}

	if (filters.generationMode && filters.generationMode !== "all") {
		params.set("generationMode", filters.generationMode);
	}

	const queryString = params.toString();
	return queryString ? `?${queryString}` : "";
}

function createEmptySummary(): MaintenanceSummary {
	return {
		totalMaintenances: 0,
		activeMaintenances: 0,
		overdueMaintenances: 0,
		completedMaintenances: 0,
		upcomingEvents: 0,
	};
}

function createDefaultFilters(): MaintenanceFilters {
	return {
		q: "",
		organizationId: "all",
		projectId: "all",
		status: "all",
		maintenanceType: "all",
		generationMode: "all",
	};
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

function EmptyState({
	error,
	text,
}: {
	error: string;
	text: {
		emptyEyebrow: string;
		emptyTitle: string;
		emptyDescription: string;
	};
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
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminMaintenancePage() {
	const router = useRouter();
	const toast = useToast();

	const locale: Locale = "es";
	const t = TEXT[locale];
	const dateFormat: AppDateFormat = DEFAULT_APP_DATE_FORMAT;

	const [items, setItems] = useState<MaintenanceListItem[]>([]);
	const [summary, setSummary] = useState<MaintenanceSummary>(createEmptySummary);
	const [filters, setFilters] = useState<MaintenanceFilters>(
		createDefaultFilters(),
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [deleteTarget, setDeleteTarget] = useState<MaintenanceListItem | null>(
		null,
	);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const hasActiveFilters = useMemo(() => {
		return Boolean(
			normalizeString(filters.q) ||
			(filters.organizationId && filters.organizationId !== "all") ||
			(filters.projectId && filters.projectId !== "all") ||
			(filters.status && filters.status !== "all") ||
			(filters.maintenanceType && filters.maintenanceType !== "all") ||
			(filters.generationMode && filters.generationMode !== "all"),
		);
	}, [filters]);

	useEffect(() => {
		let cancelled = false;

		async function loadData() {
			try {
				setLoading(true);
				setError("");

				const response = await fetch(
					`/api/admin/maintenance${buildQueryString(filters)}`,
					{
						method: "GET",
						cache: "no-store",
					},
				);

				const json = (await response
					.json()
					.catch(() => null)) as MaintenanceListResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setItems([]);
					setSummary(createEmptySummary());
					setError(json && !json.ok ? json.error : t.loadError);
					return;
				}

				setItems(Array.isArray(json.items) ? json.items : []);
				setSummary(json.summary ?? createEmptySummary());
			} catch (err) {
				if (cancelled) return;

				setItems([]);
				setSummary(createEmptySummary());
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
	}, [filters, t.loadError]);

	async function handleDeleteConfirmed() {
		if (!deleteTarget) return;

		try {
			setDeleteLoading(true);

			const response = await fetch(`/api/admin/maintenance/${deleteTarget._id}`, {
				method: "DELETE",
			});

			const json = (await response
				.json()
				.catch(() => null)) as MaintenanceDeleteResponse | null;

			if (!response.ok || !json || !json.ok) {
				throw new Error(json && !json.ok ? json.error : t.deleteError);
			}

			setItems((current) =>
				current.filter((item) => item._id !== json.deletedId),
			);

			setSummary((current) => ({
				...current,
				totalMaintenances: Math.max(0, current.totalMaintenances - 1),
				activeMaintenances:
					deleteTarget.status === "active"
						? Math.max(0, current.activeMaintenances - 1)
						: current.activeMaintenances,
				overdueMaintenances:
					deleteTarget.status === "overdue"
						? Math.max(0, current.overdueMaintenances - 1)
						: current.overdueMaintenances,
				completedMaintenances:
					deleteTarget.status === "completed"
						? Math.max(0, current.completedMaintenances - 1)
						: current.completedMaintenances,
			}));

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
				icon={<CalendarCog className="h-7 w-7" />}
				eyebrow={t.eyebrow}
				title={t.title}
				subtitle={t.subtitle}
				actions={
					<PrimaryButton
						type="button"
						onClick={() => router.push("/admin/dashboard/maintenance/new")}
					>
						{t.newMaintenance}
						<ArrowRight className="h-4 w-4" />
					</PrimaryButton>
				}
			/>

			<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title={t.totalMaintenances}
					value={summary.totalMaintenances}
					description={t.totalDescription}
					icon={<ClipboardList className="h-5 w-5" />}
				/>

				<SummaryCard
					title={t.active}
					value={summary.activeMaintenances}
					description={t.activeDescription}
					icon={<CalendarCog className="h-5 w-5" />}
				/>

				<SummaryCard
					title={t.overdue}
					value={summary.overdueMaintenances}
					description={t.overdueDescription}
					icon={<AlertTriangle className="h-5 w-5" />}
				/>

				<SummaryCard
					title={t.upcomingEvents}
					value={summary.upcomingEvents}
					description={t.upcomingDescription}
					icon={<CalendarClock className="h-5 w-5" />}
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
				<div className="grid gap-4 xl:grid-cols-4">
					<div className="xl:col-span-2">
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.search}
						</label>

						<input
							value={filters.q ?? ""}
							onChange={(e) => {
								const value = e.currentTarget.value;

								setFilters((current) => ({
									...current,
									q: value,
								}));
							}}
							placeholder={t.searchPlaceholder}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.status}
						</label>

						<select
							value={filters.status ?? "all"}
							onChange={(e) => {
								const value = e.currentTarget.value as MaintenanceFilters["status"];

								setFilters((current) => ({
									...current,
									status: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="all">{t.all}</option>
							<option value="scheduled">
								{resolveStatusLabel("scheduled", locale)}
							</option>
							<option value="active">
								{resolveStatusLabel("active", locale)}
							</option>
							<option value="completed">
								{resolveStatusLabel("completed", locale)}
							</option>
							<option value="overdue">
								{resolveStatusLabel("overdue", locale)}
							</option>
							<option value="cancelled">
								{resolveStatusLabel("cancelled", locale)}
							</option>
						</select>
					</div>

					<div>
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.mode}
						</label>

						<select
							value={filters.generationMode ?? "all"}
							onChange={(e) => {
								const value = e.currentTarget.value as MaintenanceFilters["generationMode"];

								setFilters((current) => ({
									...current,
									generationMode: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="all">{t.all}</option>
							<option value="automatic">
								{resolveGenerationModeLabel("automatic", locale)}
							</option>
							<option value="manual">
								{resolveGenerationModeLabel("manual", locale)}
							</option>
						</select>
					</div>

					<div>
						<label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							{t.type}
						</label>

						<select
							value={filters.maintenanceType ?? "all"}
							onChange={(e) => {
								const value = e.currentTarget.value as MaintenanceFilters["maintenanceType"];

								setFilters((current) => ({
									...current,
									maintenanceType: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="all">{t.all}</option>
							<option value="preventive">
								{resolveMaintenanceTypeLabel("preventive", locale)}
							</option>
							<option value="corrective">
								{resolveMaintenanceTypeLabel("corrective", locale)}
							</option>
							<option value="cleaning">
								{resolveMaintenanceTypeLabel("cleaning", locale)}
							</option>
							<option value="inspection">
								{resolveMaintenanceTypeLabel("inspection", locale)}
							</option>
							<option value="replacement">
								{resolveMaintenanceTypeLabel("replacement", locale)}
							</option>
							<option value="other">
								{resolveMaintenanceTypeLabel("other", locale)}
							</option>
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
							{t.registeredMaintenances}
						</h2>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3">
						<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
							{t.results}
						</p>
						<p className="mt-1 text-lg font-bold text-text-primary">
							{items.length}
						</p>
					</div>
				</div>

				{loading ? (
					<div className="rounded-2xl border border-border bg-surface px-5 py-8 text-sm text-text-secondary">
						{t.loading}
					</div>
				) : items.length === 0 ? (
					<EmptyState
						error={error}
						text={{
							emptyEyebrow: t.emptyEyebrow,
							emptyTitle: t.emptyTitle,
							emptyDescription: t.emptyDescription,
						}}
					/>
				) : (
					<div className="space-y-4">
						{items.map((item) => (
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
												{resolveStatusLabel(item.status, locale)}
											</span>

											<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
												{resolveMaintenanceTypeLabel(
													item.maintenanceType,
													locale,
												)}
											</span>

											<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
												{resolveGenerationModeLabel(
													item.generationMode,
													locale,
												)}
											</span>
										</div>

										<h3 className="break-words text-xl font-semibold text-text-primary">
											{item.title}
										</h3>

										<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
											<div className="rounded-2xl border border-border bg-white px-4 py-3">
												<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
													{t.organization}
												</p>
												<p className="mt-2 text-sm font-semibold text-text-primary">
													{item.organizationName || "—"}
												</p>
											</div>

											<div className="rounded-2xl border border-border bg-white px-4 py-3">
												<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
													{t.project}
												</p>
												<p className="mt-2 text-sm font-semibold text-text-primary">
													{item.projectTitle || "—"}
												</p>
											</div>

											<div className="rounded-2xl border border-border bg-white px-4 py-3">
												<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
													{t.nextDate}
												</p>
												<p className="mt-2 text-sm font-semibold text-text-primary">
													{formatAppDate(item.nextDueDate, dateFormat)}
												</p>
											</div>

											<div className="rounded-2xl border border-border bg-white px-4 py-3">
												<p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
													{t.events}
												</p>
												<p className="mt-2 text-sm font-semibold text-text-primary">
													{item.completedEvents}/{item.totalEvents}{" "}
													{t.completed}
												</p>
											</div>
										</div>
									</div>

									<div className="flex flex-wrap gap-3 xl:justify-end">
										<Link
											href={`/admin/dashboard/maintenance/${item._id}`}
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
						))}
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
						? `${t.deleteMessage}\n\n${deleteTarget.title}`
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