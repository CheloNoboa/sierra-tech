/**
 * =============================================================================
 * 📄 Helpers: Portal Alerts Query
 * Path: src/lib/portal/portalAlerts.ts
 * =============================================================================
 *
 * ES:
 * Capa compartida de lectura para la vista de alertas e historial operativo
 * del portal cliente.
 *
 * Propósito:
 * - consolidar información visible para una organización cliente
 * - mantener Projects como fuente para alertas documentales
 * - usar Maintenance como fuente oficial para mantenimientos e historial
 * - devolver eventos completos del schedule, no solo pendientes
 * - alimentar una vista PRO con resumen, historial, estado y acciones
 *
 * Responsabilidades:
 * - conectar con base de datos
 * - leer proyectos visibles para la organización
 * - leer mantenimientos asociados a la organización
 * - convertir cada fila del schedule en un item visible del portal
 * - conservar realizados, pendientes, vencidos, emitidos y futuros
 * - construir resumen ejecutivo real
 * - ordenar eventos por prioridad funcional y fecha
 *
 * Reglas:
 * - no depende de NextAuth
 * - no construye responses HTTP
 * - no modifica datos
 * - no usa any
 * - schedule es la fuente de verdad para mantenimientos
 * - completed no oculta el historial; solo desactiva la acción
 * - cada evento de mantenimiento expone maintenanceId y scheduleIndex
 *
 * Decisiones:
 * - se consulta Maintenance mediante colección directa para evitar conflictos
 *   con modelos cacheados o nombres de colección
 * - se soportan los nombres de colección "Maintenance" y "maintenances"
 * - organizationId se busca como ObjectId y como string para tolerar datos
 *   persistidos en ambos formatos
 *
 * EN:
 * Shared query layer for the client portal alerts and operational history view.
 * =============================================================================
 */

import mongoose, { Types } from "mongoose";

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";

import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import {
	extractPortalAlertsFromProject,
	isPortalVisibleProject,
} from "@/lib/portal/portalProjectMappers";

import type { PortalAlertItem } from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface PortalAlertsSummary {
	totalAlerts: number;
	totalProjects: number;
	totalMaintenances: number;
	totalScheduleEvents: number;

	emittedAlerts: number;
	pendingAlerts: number;

	upcomingMaintenances: number;
	overdueMaintenances: number;
	completedMaintenances: number;

	expiringDocuments: number;
	highPriorityAlerts: number;

	overdueAlerts: number;
}

export interface PortalAlertsData {
	items: PortalAlertItem[];
	summary: PortalAlertsSummary;
	relatedProjectsCount: number;
}

type MaintenanceScheduleAlertRow = {
	eventId: string;
	cycleIndex?: number | null;

	maintenanceDate: string;
	alertDate?: string | null;

	alertStatus?: "pending" | "emitted";
	emailStatus?: "pending" | "sent" | "failed" | "skipped" | null;

	emailSentAt?: string | Date | null;
	emailError?: string | null;

	maintenanceStatus: "pending" | "done" | "overdue" | "cancelled";

	channels?: string[];
	recipients?: string[];
	recipientEmail?: string | null;

	emittedAt?: string | Date | null;

	completed: boolean;
	completedAt?: string | Date | null;
	completedByRole?: "client" | "internal" | null;

	note?: string | null;
};

type MaintenanceAlertSource = {
	_id: unknown;
	organizationId: unknown;
	projectId: unknown;

	projectTitle: string;
	title: string;
	description: string;

	maintenanceType: string;
	instructions: string;
	notes: string;

	attachments?: Array<{
		name?: string | null;
		url?: string | null;
		mimeType?: string | null;
	}>;

	schedule: MaintenanceScheduleAlertRow[];

	status?: string;
	nextDueDate?: string | null;
	createdAt?: Date;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function toId(value: unknown): string {
	return value ? String(value) : "";
}

function toIsoDateValue(value: string | Date | null | undefined): string | null {
	if (!value) return null;

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	}

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;

	return value;
}

function getTodayDateOnly(): string {
	const now = new Date();

	return [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, "0"),
		String(now.getDate()).padStart(2, "0"),
	].join("-");
}

function parseSafeDate(value: string | null | undefined): Date | null {
	if (!value) return null;

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;

	return parsed;
}

function compareIsoAsc(a: string, b: string): number {
	const aTime = parseSafeDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
	const bTime = parseSafeDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;

	return aTime - bTime;
}

function getPriorityWeight(priority: PortalAlertItem["priority"]): number {
	switch (priority) {
		case "high":
			return 0;
		case "medium":
			return 1;
		case "low":
			return 2;
		default:
			return 3;
	}
}

function sortPortalAlerts(items: PortalAlertItem[]): PortalAlertItem[] {
	return [...items].sort((a, b) => {
		const byPriority =
			getPriorityWeight(a.priority) - getPriorityWeight(b.priority);

		if (byPriority !== 0) return byPriority;

		const aDate = a.dueDate ?? a.createdAt ?? "";
		const bDate = b.dueDate ?? b.createdAt ?? "";

		if (aDate && bDate) return compareIsoAsc(aDate, bDate);
		if (aDate) return -1;
		if (bDate) return 1;

		return a.title.localeCompare(b.title, "es", {
			sensitivity: "base",
		});
	});
}

function getRelatedProjectsCount(items: PortalAlertItem[]): number {
	return new Set(
		items
			.map((item) => item.projectId?.trim() ?? "")
			.filter((value) => value.length > 0),
	).size;
}

function buildOrganizationQueryValues(
	organizationId: string,
): Array<string | Types.ObjectId> {
	return Types.ObjectId.isValid(organizationId)
		? [organizationId, new Types.ObjectId(organizationId)]
		: [organizationId];
}

async function loadMaintenanceSources(params: {
	db: mongoose.mongo.Db;
	organizationQueryValues: Array<string | Types.ObjectId>;
	projectQueryValues: Array<string | Types.ObjectId>;
}): Promise<MaintenanceAlertSource[]> {
	const { db, organizationQueryValues, projectQueryValues } = params;

	const collectionNames = ["Maintenance", "maintenances"];

	const results = await Promise.all(
		collectionNames.map((collectionName) =>
			db
				.collection<MaintenanceAlertSource>(collectionName)
				.find({
					$or: [
						{ organizationId: { $in: organizationQueryValues } },
						{ projectId: { $in: projectQueryValues } },
					],
					schedule: { $exists: true, $ne: [] },
				})
				.sort({ nextDueDate: 1, updatedAt: -1 })
				.toArray(),
		),
	);

	const map = new Map<string, MaintenanceAlertSource>();

	for (const group of results) {
		for (const item of group) {
			map.set(toId(item._id), item);
		}
	}

	return Array.from(map.values());
}

function resolveMaintenanceAlertType(
	row: MaintenanceScheduleAlertRow,
	today: string,
): PortalAlertItem["type"] {
	if (row.completed || row.maintenanceStatus === "done") {
		return "maintenance_completed";
	}

	if (row.maintenanceStatus === "overdue" || row.maintenanceDate < today) {
		return "maintenance_overdue";
	}

	return "maintenance_upcoming";
}

function resolveMaintenancePriority(
	row: MaintenanceScheduleAlertRow,
	today: string,
): PortalAlertItem["priority"] {
	if (row.completed || row.maintenanceStatus === "done") return "low";

	if (row.maintenanceStatus === "overdue" || row.maintenanceDate < today) {
		return "high";
	}

	if (row.alertStatus === "emitted") return "medium";

	return "low";
}

function resolveMaintenanceTitle(
	maintenanceTitle: string,
	row: MaintenanceScheduleAlertRow,
	today: string,
): string {
	if (row.completed || row.maintenanceStatus === "done") {
		return `Mantenimiento realizado: ${maintenanceTitle}`;
	}

	if (row.maintenanceStatus === "cancelled") {
		return `Mantenimiento cancelado: ${maintenanceTitle}`;
	}

	if (row.maintenanceStatus === "overdue" || row.maintenanceDate < today) {
		return `Mantenimiento vencido: ${maintenanceTitle}`;
	}

	if (row.alertStatus === "emitted") {
		return `Alerta emitida: ${maintenanceTitle}`;
	}

	return `Mantenimiento programado: ${maintenanceTitle}`;
}

function buildMaintenanceDescription(
	maintenance: MaintenanceAlertSource,
	row: MaintenanceScheduleAlertRow,
): string {
	const baseDescription = maintenance.description.trim();

	if (baseDescription) return baseDescription;

	if (row.completed) {
		return `El mantenimiento "${maintenance.title}" fue marcado como realizado.`;
	}

	if (row.alertStatus === "emitted") {
		return `La alerta del mantenimiento "${maintenance.title}" fue emitida para seguimiento del cliente.`;
	}

	return `El mantenimiento "${maintenance.title}" está programado para el ${row.maintenanceDate}.`;
}

function mapMaintenanceAttachments(
	maintenance: MaintenanceAlertSource,
): PortalAlertItem["attachments"] {
	return (maintenance.attachments ?? [])
		.filter((attachment) => (attachment.url ?? "").trim().length > 0)
		.map((attachment) => ({
			fileName: attachment.name?.trim() || "Documento de mantenimiento",
			fileUrl: attachment.url?.trim() ?? "",
			mimeType: attachment.mimeType?.trim() || null,
		}));
}

function canClientMarkCompleted(row: MaintenanceScheduleAlertRow): boolean {
	if (row.completed) return false;
	if (row.maintenanceStatus === "done") return false;
	if (row.maintenanceStatus === "cancelled") return false;

	return row.alertStatus === "emitted";
}

function mapMaintenanceToPortalAlerts(
	maintenance: MaintenanceAlertSource,
	today: string,
): PortalAlertItem[] {
	const maintenanceId = toId(maintenance._id);
	const projectId = toId(maintenance.projectId);
	const createdAt = maintenance.createdAt?.toISOString() ?? null;
	const attachments = mapMaintenanceAttachments(maintenance);

	return maintenance.schedule.map((row, scheduleIndex): PortalAlertItem => {
		const type = resolveMaintenanceAlertType(row, today);
		const priority = resolveMaintenancePriority(row, today);
		const canMarkCompleted = canClientMarkCompleted(row);

		return {
			alertId: `maintenance:${maintenanceId}:${row.eventId}`,
			type,
			priority,

			title: resolveMaintenanceTitle(maintenance.title, row, today),
			description: buildMaintenanceDescription(maintenance, row),

			projectId,
			projectTitle: maintenance.projectTitle,

			maintenanceId,
			maintenanceTitle: maintenance.title,
			maintenanceEventId: row.eventId,
			scheduleIndex,

			maintenanceDate: row.maintenanceDate,
			alertDate: row.alertDate ?? null,

			alertStatus: row.alertStatus ?? "pending",
			emailStatus: row.emailStatus ?? null,

			maintenanceStatus: row.maintenanceStatus,

			emittedAt: toIsoDateValue(row.emittedAt),
			completedAt: toIsoDateValue(row.completedAt),
			completedByRole: row.completedByRole ?? null,

			completed: row.completed,
			canMarkCompleted,

			note: row.note ?? null,

			attachments,

			dueDate: row.maintenanceDate,
			createdAt,

			action: canMarkCompleted ? "mark_completed" : "view_project",
		};
	});
}

function buildPortalAlertsSummary(params: {
	items: PortalAlertItem[];
	totalProjects: number;
	totalMaintenances: number;
}): PortalAlertsSummary {
	const { items, totalProjects, totalMaintenances } = params;

	const maintenanceItems = items.filter((item) => item.maintenanceId);
	const documentItems = items.filter((item) => !item.maintenanceId);

	const emittedAlerts = maintenanceItems.filter(
		(item) => item.alertStatus === "emitted",
	).length;

	const pendingAlerts = maintenanceItems.filter(
		(item) => item.alertStatus === "pending",
	).length;

	const upcomingMaintenances = maintenanceItems.filter(
		(item) =>
			item.type === "maintenance_upcoming" &&
			item.completed !== true &&
			item.maintenanceStatus !== "cancelled",
	).length;

	const overdueMaintenances = maintenanceItems.filter(
		(item) => item.type === "maintenance_overdue",
	).length;

	const completedMaintenances = maintenanceItems.filter(
		(item) => item.completed === true || item.type === "maintenance_completed",
	).length;

	const expiringDocuments = documentItems.filter(
		(item) =>
			item.type === "document_expiring" ||
			item.type === "warranty_expiring" ||
			item.type === "scheduled_review",
	).length;

	const highPriorityAlerts = items.filter(
		(item) => item.priority === "high",
	).length;

	return {
		totalAlerts: items.length,
		totalProjects,
		totalMaintenances,
		totalScheduleEvents: maintenanceItems.length,

		emittedAlerts,
		pendingAlerts,

		upcomingMaintenances,
		overdueMaintenances,
		completedMaintenances,

		expiringDocuments,
		highPriorityAlerts,

		overdueAlerts: overdueMaintenances,
	};
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function getPortalAlertsByOrganization(
	organizationId: string,
): Promise<PortalAlertsData> {
	const normalizedOrganizationId = organizationId.trim();

	if (!normalizedOrganizationId) {
		const emptySummary = buildPortalAlertsSummary({
			items: [],
			totalProjects: 0,
			totalMaintenances: 0,
		});

		return {
			items: [],
			summary: emptySummary,
			relatedProjectsCount: 0,
		};
	}

	await connectToDB();

	const db = mongoose.connection.db;

	if (!db) {
		return {
			items: [],
			summary: buildPortalAlertsSummary({
				items: [],
				totalProjects: 0,
				totalMaintenances: 0,
			}),
			relatedProjectsCount: 0,
		};
	}

	const organizationQueryValues =
		buildOrganizationQueryValues(normalizedOrganizationId);

	const projects = await Project.find({
		primaryClientId: { $in: organizationQueryValues },
	})
		.sort({ featured: -1, sortOrder: 1, updatedAt: -1 })
		.lean();

	const projectIds = projects
		.map((project) => toId(project._id))
		.filter((value) => value.length > 0);

	const projectQueryValues = projectIds.flatMap((projectId) =>
		Types.ObjectId.isValid(projectId)
			? [projectId, new Types.ObjectId(projectId)]
			: [projectId],
	);

	const maintenances = await loadMaintenanceSources({
		db,
		organizationQueryValues,
		projectQueryValues,
	});

	const projectAlerts = projects
		.map((item) => normalizeProjectEntity(item))
		.filter(isPortalVisibleProject)
		.flatMap((project) => extractPortalAlertsFromProject(project));

	const today = getTodayDateOnly();

	const maintenanceAlerts = maintenances.flatMap((maintenance) =>
		mapMaintenanceToPortalAlerts(maintenance, today),
	);

	const alerts = sortPortalAlerts([...projectAlerts, ...maintenanceAlerts]);

	return {
		items: alerts,
		summary: buildPortalAlertsSummary({
			items: alerts,
			totalProjects: projects.length,
			totalMaintenances: maintenances.length,
		}),
		relatedProjectsCount: getRelatedProjectsCount(alerts),
	};
}