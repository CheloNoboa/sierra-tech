/**
 * =============================================================================
 * 📄 Page: Client Portal Alerts
 * Path: src/app/portal/alerts/page.tsx
 * =============================================================================
 *
 * ES:
 * Página oficial de Alertas y Seguimiento para el portal cliente de Sierra Tech.
 *
 * Propósito:
 * - presentar una vista ejecutiva del estado operativo del cliente
 * - mostrar proyectos relacionados, alertas emitidas e historial de mantenimiento
 * - permitir que el cliente marque como realizado un mantenimiento pendiente
 * - conservar Maintenance.schedule como fuente de verdad operativa
 *
 * Responsabilidades:
 * - validar sesión activa server-side
 * - restringir acceso a usuarios cliente activos
 * - cargar datos reales de la organización autenticada
 * - aplicar filtros por tipo, prioridad y proyecto desde la URL
 * - mostrar resumen ejecutivo con métricas reales
 * - renderizar historial completo: programado, emitido, vencido y realizado
 * - permitir completar una fila específica del schedule cuando corresponda
 *
 * Reglas funcionales:
 * - el cliente NO crea alertas
 * - el cliente NO edita mantenimientos
 * - el cliente NO modifica fechas, alertas ni configuración administrativa
 * - el cliente SOLO puede marcar completed = true sobre una fila existente
 * - una fila realizada sigue mostrándose como historial
 *
 * Decisiones:
 * - esta página permanece como Server Component
 * - la confirmación usa Server Action local
 * - no se usan alert(), window.confirm ni any
 * - después de completar un mantenimiento se revalida /portal/alerts
 *
 * EN:
 * Official Alerts and Tracking page for the Sierra Tech client portal.
 * =============================================================================
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
	ArrowRight,
	CheckCircle2,
	Clock3,
	FileWarning,
	History,
	ShieldAlert,
	TriangleAlert,
	Wrench,
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import { getPortalAlertsByOrganization } from "@/lib/portal/portalAlerts";
import Maintenance from "@/models/Maintenance";
import type { PortalAlertItem } from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface PortalAlertsPageProps {
	searchParams?: Promise<{
		type?: string;
		priority?: string;
		projectId?: string;
	}>;
}

/* -------------------------------------------------------------------------- */
/* Server actions                                                             */
/* -------------------------------------------------------------------------- */

async function completeMaintenanceFromAlert(formData: FormData) {
	"use server";

	const session = await getServerSession(authOptions);
	const user = session?.user;

	if (
		!user ||
		user.userType !== "client" ||
		user.status !== "active" ||
		!user.organizationId
	) {
		redirect("/login");
	}

	const maintenanceId = String(formData.get("maintenanceId") ?? "").trim();
	const rawScheduleIndex = String(formData.get("scheduleIndex") ?? "").trim();
	const scheduleIndex = Number(rawScheduleIndex);

	if (
		!maintenanceId ||
		!Number.isInteger(scheduleIndex) ||
		scheduleIndex < 0
	) {
		return;
	}

	await connectToDB();

	const maintenance = await Maintenance.findById(maintenanceId);

	if (!maintenance) return;

	if (String(maintenance.organizationId) !== String(user.organizationId)) {
		return;
	}

	if (
		!Array.isArray(maintenance.schedule) ||
		scheduleIndex >= maintenance.schedule.length
	) {
		return;
	}

	const completedAt = new Date().toISOString();

	maintenance.set(`schedule.${scheduleIndex}.completed`, true);
	maintenance.set(`schedule.${scheduleIndex}.completedAt`, completedAt);
	maintenance.set(`schedule.${scheduleIndex}.completedByRole`, "client");
	maintenance.set(`schedule.${scheduleIndex}.maintenanceStatus`, "done");
	maintenance.set("updatedAt", new Date());

	await maintenance.save();

	revalidatePath("/portal/alerts");
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDateLabel(value: string | null | undefined): string {
	if (!value) return "—";

	const safeValue = value.split("T")[0];
	const parts = safeValue.split("-");

	if (parts.length !== 3) return "—";

	const [year, month, day] = parts;

	if (!year || !month || !day) return "—";

	return `${day}/${month}/${year}`;
}

function normalizeFilterValue(value: string | undefined): string {
	return value?.trim() ?? "";
}

function formatAlertPriority(value: PortalAlertItem["priority"]): string {
	switch (value) {
		case "high":
			return "Alta";
		case "medium":
			return "Media";
		case "low":
			return "Baja";
		default:
			return "—";
	}
}

function formatAlertStatus(value: PortalAlertItem["alertStatus"]): string {
	switch (value) {
		case "emitted":
			return "Emitida";
		case "pending":
			return "Pendiente";
		default:
			return "—";
	}
}

function formatMaintenanceStatus(
	value: PortalAlertItem["maintenanceStatus"],
	completed: PortalAlertItem["completed"],
): string {
	if (completed) return "Realizado";

	switch (value) {
		case "done":
			return "Realizado";
		case "overdue":
			return "Vencido";
		case "cancelled":
			return "Cancelado";
		case "pending":
			return "Pendiente";
		default:
			return "—";
	}
}

function formatCompletedByRole(
	value: PortalAlertItem["completedByRole"],
): string {
	switch (value) {
		case "client":
			return "Cliente";
		case "internal":
			return "Sierra Tech";
		default:
			return "—";
	}
}

function getActionHref(item: PortalAlertItem): string {
	switch (item.action) {
		case "view_document":
			return "/portal/documents";
		case "contact_support":
			return "/portal/support";
		case "mark_completed":
		case "view_project":
		default:
			return item.projectId ? `/portal/projects/${item.projectId}` : "/portal/projects";
	}
}

function matchesTypeFilter(item: PortalAlertItem, type: string): boolean {
	if (!type || type === "all") return true;
	return item.type === type;
}

function matchesPriorityFilter(
	item: PortalAlertItem,
	priority: string,
): boolean {
	if (!priority || priority === "all") return true;
	return item.priority === priority;
}

function matchesProjectFilter(item: PortalAlertItem, projectId: string): boolean {
	if (!projectId || projectId === "all") return true;
	return (item.projectId ?? "") === projectId;
}

function getUniqueProjectOptions(items: PortalAlertItem[]): Array<{
	projectId: string;
	projectTitle: string;
}> {
	const map = new Map<string, string>();

	for (const item of items) {
		const projectId = item.projectId?.trim() ?? "";
		const projectTitle = item.projectTitle?.trim() ?? "";

		if (!projectId || !projectTitle) continue;

		if (!map.has(projectId)) {
			map.set(projectId, projectTitle);
		}
	}

	return Array.from(map.entries())
		.map(([projectId, projectTitle]) => ({ projectId, projectTitle }))
		.sort((a, b) =>
			a.projectTitle.localeCompare(b.projectTitle, "es", {
				sensitivity: "base",
			}),
		);
}

function getPriorityPillClasses(priority: PortalAlertItem["priority"]): string {
	switch (priority) {
		case "high":
			return "border-red-200 bg-red-50 text-red-700";
		case "medium":
			return "border-amber-200 bg-amber-50 text-amber-700";
		case "low":
		default:
			return "border-slate-200 bg-slate-50 text-slate-700";
	}
}

function getStatusPillClasses(item: PortalAlertItem): string {
	if (item.completed) {
		return "border-emerald-200 bg-emerald-50 text-emerald-700";
	}

	if (item.type === "maintenance_overdue") {
		return "border-red-200 bg-red-50 text-red-700";
	}

	if (item.alertStatus === "emitted") {
		return "border-amber-200 bg-amber-50 text-amber-700";
	}

	return "border-slate-200 bg-slate-50 text-slate-700";
}

function canCompleteMaintenanceAlert(item: PortalAlertItem): boolean {
	return (
		item.canMarkCompleted === true &&
		item.completed !== true &&
		typeof item.maintenanceId === "string" &&
		item.maintenanceId.trim().length > 0 &&
		typeof item.scheduleIndex === "number" &&
		Number.isInteger(item.scheduleIndex) &&
		item.scheduleIndex >= 0
	);
}

/* -------------------------------------------------------------------------- */
/* UI                                                                         */
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
		<div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
			<div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
				{icon}
			</div>

			<p className="text-sm font-medium text-text-secondary">{title}</p>
			<p className="mt-3 text-3xl font-bold text-text-primary">{value}</p>
			<p className="mt-2 text-sm leading-6 text-text-secondary">
				{description}
			</p>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
			<p className="text-sm font-medium text-text-primary">
				No hay información disponible
			</p>
			<p className="mt-2 text-sm leading-7 text-text-secondary">
				Cuando existan proyectos, mantenimientos o alertas visibles para tu
				organización, aparecerán aquí.
			</p>
		</div>
	);
}

function EmptyFilterResultsState() {
	return (
		<div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
			<p className="text-sm font-medium text-text-primary">
				No encontramos resultados con esos filtros
			</p>
			<p className="mt-2 text-sm leading-7 text-text-secondary">
				Ajusta el tipo, la prioridad o el proyecto para encontrar más registros.
			</p>
		</div>
	);
}

function FilterBar({
	type,
	priority,
	projectId,
	projectOptions,
}: {
	type: string;
	priority: string;
	projectId: string;
	projectOptions: Array<{
		projectId: string;
		projectTitle: string;
	}>;
}) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<form className="grid gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(220px,0.8fr)_minmax(260px,1fr)_auto] xl:items-end">
				<div className="min-w-0">
					<label
						htmlFor="portal-alerts-type"
						className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
					>
						Tipo
					</label>

					<select
						id="portal-alerts-type"
						name="type"
						defaultValue={type || "all"}
						className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
					>
						<option value="all">Todos</option>
						<option value="maintenance_upcoming">Mantenimiento programado</option>
						<option value="maintenance_overdue">Mantenimiento vencido</option>
						<option value="maintenance_completed">Mantenimiento realizado</option>
						<option value="document_expiring">Documento por vencer</option>
						<option value="warranty_expiring">Garantía por vencer</option>
						<option value="scheduled_review">Revisión programada</option>
						<option value="critical">Crítica</option>
					</select>
				</div>

				<div className="min-w-0">
					<label
						htmlFor="portal-alerts-priority"
						className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
					>
						Prioridad
					</label>

					<select
						id="portal-alerts-priority"
						name="priority"
						defaultValue={priority || "all"}
						className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
					>
						<option value="all">Todas</option>
						<option value="high">Alta</option>
						<option value="medium">Media</option>
						<option value="low">Baja</option>
					</select>
				</div>

				<div className="min-w-0">
					<label
						htmlFor="portal-alerts-project"
						className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
					>
						Proyecto
					</label>

					<select
						id="portal-alerts-project"
						name="projectId"
						defaultValue={projectId || "all"}
						className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
					>
						<option value="all">Todos los proyectos</option>
						{projectOptions.map((option) => (
							<option key={option.projectId} value={option.projectId}>
								{option.projectTitle}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-wrap items-center gap-3 xl:self-end">
					<button
						type="submit"
						className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-primary px-6 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white"
					>
						Aplicar
					</button>

					<Link
						href="/portal/alerts"
						className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-white px-6 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
					>
						Limpiar
					</Link>
				</div>
			</form>
		</section>
	);
}

function CompleteMaintenanceButton({ item }: { item: PortalAlertItem }) {
	if (!canCompleteMaintenanceAlert(item)) return null;

	return (
		<form action={completeMaintenanceFromAlert}>
			<input type="hidden" name="maintenanceId" value={item.maintenanceId ?? ""} />
			<input
				type="hidden"
				name="scheduleIndex"
				value={String(item.scheduleIndex ?? "")}
			/>

			<button
				type="submit"
				className="inline-flex items-center gap-2 rounded-2xl bg-brand-primary px-4 py-3 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white"
			>
				<CheckCircle2 className="h-4 w-4" />
				Marcar como realizado
			</button>
		</form>
	);
}

function AttachmentLinks({ item }: { item: PortalAlertItem }) {
	if (!item.attachments || item.attachments.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-2">
			{item.attachments.map((attachment, index) => (
				<a
					key={`${item.alertId}-attachment-${index}`}
					href={attachment.fileUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-xs font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
				>
					{attachment.fileName?.trim() || `Documento ${index + 1}`}
					<ArrowRight className="h-3.5 w-3.5" />
				</a>
			))}
		</div>
	);
}

function HistoryTable({ items }: { items: PortalAlertItem[] }) {
	return (
		<div className="mt-6 overflow-hidden rounded-3xl border border-border">
			<div className="overflow-x-auto">
				<table className="min-w-[1180px] w-full border-collapse bg-white text-sm">
					<thead className="bg-surface text-left text-xs uppercase tracking-[0.14em] text-text-secondary">
						<tr>
							<th className="px-5 py-4 font-semibold">Fecha</th>
							<th className="px-5 py-4 font-semibold">Proyecto</th>
							<th className="px-5 py-4 font-semibold">Mantenimiento / alerta</th>
							<th className="px-5 py-4 font-semibold">Alerta</th>
							<th className="px-5 py-4 font-semibold">Estado</th>
							<th className="px-5 py-4 font-semibold">Realizado</th>
							<th className="px-5 py-4 font-semibold">Realizado por</th>
							<th className="px-5 py-4 font-semibold">Nota</th>
							<th className="px-5 py-4 font-semibold">Acciones</th>
						</tr>
					</thead>

					<tbody className="divide-y divide-border">
						{items.map((item) => (
							<tr key={item.alertId} className="align-top hover:bg-surface/60">
								<td className="px-5 py-4 font-medium text-text-primary">
									{formatDateLabel(item.maintenanceDate ?? item.dueDate)}
								</td>

								<td className="px-5 py-4">
									<p className="max-w-[220px] text-sm font-semibold text-text-primary">
										{item.projectTitle?.trim() || "—"}
									</p>
								</td>

								<td className="px-5 py-4">
									<p className="max-w-[280px] text-sm font-semibold text-text-primary">
										{item.maintenanceTitle ?? item.title}
									</p>
									<p className="mt-1 max-w-[320px] text-xs leading-5 text-text-secondary">
										{item.description}
									</p>
									<div className="mt-3">
										<AttachmentLinks item={item} />
									</div>
								</td>

								<td className="px-5 py-4">
									<div className="space-y-2">
										<span
											className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPriorityPillClasses(
												item.priority,
											)}`}
										>
											{formatAlertPriority(item.priority)}
										</span>
										<p className="text-xs text-text-secondary">
											{formatAlertStatus(item.alertStatus)}
										</p>
										<p className="text-xs text-text-secondary">
											Alerta: {formatDateLabel(item.alertDate)}
										</p>
									</div>
								</td>

								<td className="px-5 py-4">
									<span
										className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusPillClasses(
											item,
										)}`}
									>
										{formatMaintenanceStatus(
											item.maintenanceStatus,
											item.completed,
										)}
									</span>
								</td>

								<td className="px-5 py-4">
									<div className="space-y-1">
										<p className="text-sm font-semibold text-text-primary">
											{item.completed ? "Sí" : "No"}
										</p>
										<p className="text-xs text-text-secondary">
											{formatDateLabel(item.completedAt)}
										</p>
									</div>
								</td>

								<td className="px-5 py-4 text-sm text-text-secondary">
									{formatCompletedByRole(item.completedByRole)}
								</td>

								<td className="px-5 py-4">
									<p className="max-w-[220px] text-sm leading-6 text-text-secondary">
										{item.note?.trim() || "—"}
									</p>
								</td>

								<td className="px-5 py-4">
									<div className="flex flex-col gap-2">
										<CompleteMaintenanceButton item={item} />

										<Link
											href={getActionHref(item)}
											className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
										>
											Ver proyecto
											<ArrowRight className="h-4 w-4" />
										</Link>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function PortalAlertsPage({
	searchParams,
}: PortalAlertsPageProps) {
	const session = await getServerSession(authOptions);
	const user = session?.user;

	if (
		!user ||
		user.userType !== "client" ||
		user.status !== "active" ||
		!user.organizationId
	) {
		redirect("/login");
	}

	const resolvedSearchParams = searchParams ? await searchParams : {};
	const type = normalizeFilterValue(resolvedSearchParams.type) || "all";
	const priority = normalizeFilterValue(resolvedSearchParams.priority) || "all";
	const projectId = normalizeFilterValue(resolvedSearchParams.projectId) || "all";

	const alertsData = await getPortalAlertsByOrganization(user.organizationId);
	const projectOptions = getUniqueProjectOptions(alertsData.items);

	const filteredItems = alertsData.items.filter((item) => {
		return (
			matchesTypeFilter(item, type) &&
			matchesPriorityFilter(item, priority) &&
			matchesProjectFilter(item, projectId)
		);
	});

	return (
		<div className="space-y-6">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="max-w-4xl space-y-4">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
						Alertas, mantenimientos e historial
					</p>

					<h1 className="text-3xl font-bold tracking-tight text-text-primary">
						Seguimiento operativo de la organización
					</h1>

					<p className="text-base leading-8 text-text-secondary">
						Consulta los proyectos asociados, alertas emitidas, mantenimientos
						programados, eventos vencidos y mantenimientos ya realizados. Esta
						vista funciona como historial operativo visible para el cliente.
					</p>
				</div>
			</section>

			<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title="Proyectos vinculados"
					value={alertsData.summary.totalProjects}
					description="Proyectos visibles asociados a la organización."
					icon={<History className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Eventos de mantenimiento"
					value={alertsData.summary.totalScheduleEvents}
					description="Historial completo generado desde el schedule."
					icon={<Wrench className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Alertas emitidas"
					value={alertsData.summary.emittedAlerts}
					description="Alertas ya generadas para seguimiento."
					icon={<TriangleAlert className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Realizados"
					value={alertsData.summary.completedMaintenances}
					description="Mantenimientos marcados como realizados."
					icon={<CheckCircle2 className="h-5 w-5" />}
				/>
			</section>

			<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title="Próximos"
					value={alertsData.summary.upcomingMaintenances}
					description="Mantenimientos pendientes o programados."
					icon={<Clock3 className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Vencidos"
					value={alertsData.summary.overdueMaintenances}
					description="Eventos pendientes con atención requerida."
					icon={<ShieldAlert className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Documentos críticos"
					value={alertsData.summary.expiringDocuments}
					description="Contratos, garantías u otros archivos con seguimiento."
					icon={<FileWarning className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Prioridad alta"
					value={alertsData.summary.highPriorityAlerts}
					description="Registros que requieren mayor atención."
					icon={<TriangleAlert className="h-5 w-5" />}
				/>
			</section>

			<FilterBar
				type={type}
				priority={priority}
				projectId={projectId}
				projectOptions={projectOptions}
			/>

			<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div className="space-y-3">
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
							Historial operativo
						</p>

						<h2 className="text-xl font-bold tracking-tight text-text-primary">
							Mantenimientos, alertas y seguimiento
						</h2>

						<p className="max-w-3xl text-sm leading-7 text-text-secondary">
							Se muestran eventos realizados, pendientes, emitidos, vencidos y
							programados. Los registros pendientes con alerta emitida pueden ser
							marcados como realizados por el cliente.
						</p>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						Mostrando{" "}
						<span className="font-semibold text-text-primary">
							{filteredItems.length}
						</span>{" "}
						de{" "}
						<span className="font-semibold text-text-primary">
							{alertsData.items.length}
						</span>{" "}
						registros
					</div>
				</div>

				{alertsData.items.length === 0 ? (
					<EmptyState />
				) : filteredItems.length === 0 ? (
					<EmptyFilterResultsState />
				) : (
					<HistoryTable items={filteredItems} />
				)}
			</section>
		</div>
	);
}