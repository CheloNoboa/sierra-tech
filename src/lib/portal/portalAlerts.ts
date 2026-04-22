/**
 * =============================================================================
 * 📄 Helpers: Portal Alerts Query
 * Path: src/lib/portal/portalAlerts.ts
 * =============================================================================
 *
 * ES:
 * Capa compartida de lectura para alertas del portal cliente.
 *
 * Propósito:
 * - centralizar la consulta de alertas visibles para una organización
 * - reutilizar la misma lógica desde páginas server y futuros endpoints API
 * - evitar fetch interno server-to-server dentro de la misma aplicación
 *
 * Alcance:
 * - listado global de alertas visibles en portal
 * - métricas resumidas para la página de alertas
 *
 * Decisiones:
 * - en esta fase, la fuente de verdad sigue siendo Projects
 * - las alertas se derivan desde proyectos ya normalizados
 * - el orden prioriza:
 *   - prioridad
 *   - fecha relevante
 *   - fecha de creación
 * - este archivo no reinterpreta la lógica de negocio del mapper:
 *   - consume alertas ya proyectadas
 *   - no elimina adjuntos
 *   - no reescribe acciones
 *
 * Reglas:
 * - este archivo no depende de NextAuth
 * - este archivo no construye responses HTTP
 * - este archivo solo consulta, normaliza y proyecta
 *
 * EN:
 * Shared read layer for client portal alerts.
 * =============================================================================
 */

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
	upcomingMaintenances: number;
	expiringDocuments: number;
	overdueAlerts: number;
	highPriorityAlerts: number;
}

export interface PortalAlertsData {
	items: PortalAlertItem[];
	summary: PortalAlertsSummary;
	relatedProjectsCount: number;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Parsea una fecha ISO de manera segura.
 *
 * Regla:
 * - si la fecha es inválida o vacía, retorna null
 * - evita NaN propagados en ordenamientos
 */
function parseSafeDate(value: string | null | undefined): Date | null {
	if (!value) return null;

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;

	return parsed;
}

/**
 * Comparador ascendente defensivo.
 *
 * Regla:
 * - fechas válidas primero
 * - fechas inválidas o vacías al final
 */
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

/**
 * Orden oficial de alertas para el portal.
 *
 * Prioridad:
 * 1. prioridad visible
 * 2. dueDate / createdAt
 * 3. título
 *
 * Nota:
 * - este helper no toca attachments ni demás payload
 * - solo ordena
 */
function sortPortalAlerts(items: PortalAlertItem[]): PortalAlertItem[] {
	return [...items].sort((a, b) => {
		const byPriority =
			getPriorityWeight(a.priority) - getPriorityWeight(b.priority);

		if (byPriority !== 0) {
			return byPriority;
		}

		const aDate = a.dueDate ?? a.createdAt ?? "";
		const bDate = b.dueDate ?? b.createdAt ?? "";

		if (aDate && bDate) {
			return compareIsoAsc(aDate, bDate);
		}

		if (aDate) return -1;
		if (bDate) return 1;

		return a.title.localeCompare(b.title, "es", {
			sensitivity: "base",
		});
	});
}

/**
 * Resumen agregado usado por la página /portal/alerts.
 */
function buildPortalAlertsSummary(items: PortalAlertItem[]): PortalAlertsSummary {
	return {
		totalAlerts: items.length,
		upcomingMaintenances: items.filter(
			(item) => item.type === "maintenance_upcoming",
		).length,
		expiringDocuments: items.filter(
			(item) =>
				item.type === "document_expiring" ||
				item.type === "warranty_expiring" ||
				item.type === "scheduled_review",
		).length,
		overdueAlerts: items.filter(
			(item) => item.type === "maintenance_overdue",
		).length,
		highPriorityAlerts: items.filter((item) => item.priority === "high").length,
	};
}

function getRelatedProjectsCount(items: PortalAlertItem[]): number {
	return new Set(
		items
			.map((item) => item.projectId?.trim() ?? "")
			.filter((value) => value.length > 0),
	).size;
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Obtiene todas las alertas visibles para una organización cliente.
 *
 * Flujo:
 * - conecta a DB
 * - consulta proyectos por organizationId
 * - normaliza entidades
 * - filtra solo proyectos visibles en portal
 * - extrae alertas desde los mappers del portal
 * - ordena y resume resultados
 *
 * Importante:
 * - si los adjuntos de mantenimiento fueron correctamente proyectados en
 *   portalProjectMappers, aquí se conservan tal cual
 * - este archivo no vacía ni transforma item.attachments
 */
export async function getPortalAlertsByOrganization(
	organizationId: string,
): Promise<PortalAlertsData> {
	const normalizedOrganizationId = organizationId.trim();

	if (!normalizedOrganizationId) {
		return {
			items: [],
			summary: {
				totalAlerts: 0,
				upcomingMaintenances: 0,
				expiringDocuments: 0,
				overdueAlerts: 0,
				highPriorityAlerts: 0,
			},
			relatedProjectsCount: 0,
		};
	}

	await connectToDB();

	const projects = await Project.find({
		primaryClientId: normalizedOrganizationId,
	})
		.sort({ featured: -1, sortOrder: 1, updatedAt: -1 })
		.lean();

	const normalizedProjects = projects
		.map((item) => normalizeProjectEntity(item))
		.filter(isPortalVisibleProject);

	/**
	 * Las alertas ya salen tipadas y proyectadas desde portalProjectMappers.
	 * Aquí únicamente se consolidan.
	 */
	const alerts = sortPortalAlerts(
		normalizedProjects.flatMap((project) =>
			extractPortalAlertsFromProject(project),
		),
	);

	return {
		items: alerts,
		summary: buildPortalAlertsSummary(alerts),
		relatedProjectsCount: getRelatedProjectsCount(alerts),
	};
}