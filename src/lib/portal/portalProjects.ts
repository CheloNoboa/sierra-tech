/**
 * =============================================================================
 * 📄 Helpers: Portal Projects Query
 * Path: src/lib/portal/portalProjects.ts
 * =============================================================================
 *
 * ES:
 * Capa compartida de lectura para proyectos del portal cliente.
 *
 * Propósito:
 * - centralizar la consulta real de proyectos visibles para una organización
 * - reutilizar esta misma lógica desde páginas server y endpoints API
 * - enriquecer las cards de proyectos con alertas reales del portal
 * - evitar que Projects calcule alertas desde lógica vieja/incompleta
 *
 * Decisiones:
 * - Projects sigue siendo la fuente de proyectos/documentos
 * - getPortalAlertsByOrganization es la fuente real de alertas/mantenimientos
 * - activeAlertsCount se calcula por projectId usando alertas consolidadas
 * - nextMaintenanceDate se deriva de alertas de Maintenance pendientes
 *
 * Reglas:
 * - este archivo no depende de NextAuth
 * - este archivo no construye responses HTTP
 * - este archivo solo consulta, normaliza y proyecta
 *
 * EN:
 * Shared read layer for client portal projects.
 * =============================================================================
 */

import mongoose, { Types } from "mongoose";

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";
import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import { getPortalAlertsByOrganization } from "@/lib/portal/portalAlerts";
import {
	isPortalVisibleProject,
	mapProjectEntityToPortalProjectCard,
	mapProjectEntityToPortalProjectDetail,
	sortPortalProjects,
} from "@/lib/portal/portalProjectMappers";
import type {
	PortalAlertItem,
	PortalProjectCard,
	PortalProjectDetail,
} from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function buildOrganizationQueryValues(
	organizationId: string,
): Array<string | Types.ObjectId> {
	return Types.ObjectId.isValid(organizationId)
		? [organizationId, new Types.ObjectId(organizationId)]
		: [organizationId];
}

function getProjectAlerts(
	alerts: PortalAlertItem[],
	projectId: string,
): PortalAlertItem[] {
	return alerts.filter((alert) => alert.projectId === projectId);
}

function getNextMaintenanceDate(alerts: PortalAlertItem[]): string | null {
	const dates = alerts
		.filter((alert) => alert.maintenanceId)
		.filter((alert) => alert.completed !== true)
		.filter((alert) => alert.maintenanceStatus !== "cancelled")
		.map((alert) => alert.maintenanceDate ?? alert.dueDate ?? null)
		.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
		.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

	return dates[0] ?? null;
}

function enrichProjectCardWithAlerts(params: {
	card: PortalProjectCard;
	alerts: PortalAlertItem[];
}): PortalProjectCard {
	const { card, alerts } = params;
	const projectAlerts = getProjectAlerts(alerts, card.projectId);

	return {
		...card,
		activeAlertsCount: projectAlerts.length,
		nextMaintenanceDate: getNextMaintenanceDate(projectAlerts),
		nextRelevantDate:
			getNextMaintenanceDate(projectAlerts) ?? card.nextRelevantDate ?? null,
	};
}

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export async function getPortalProjectsByOrganization(
	organizationId: string,
): Promise<PortalProjectCard[]> {
	const normalizedOrganizationId = organizationId.trim();

	if (!normalizedOrganizationId) {
		return [];
	}

	await connectToDB();

	const organizationQueryValues =
		buildOrganizationQueryValues(normalizedOrganizationId);

	const [items, alertsData] = await Promise.all([
		Project.find({
			primaryClientId: { $in: organizationQueryValues },
		})
			.sort({ featured: -1, sortOrder: 1, updatedAt: -1 })
			.lean(),

		getPortalAlertsByOrganization(normalizedOrganizationId),
	]);

	const normalizedProjects = items.map((item) => normalizeProjectEntity(item));

	const visibleProjects = sortPortalProjects(
		normalizedProjects.filter(isPortalVisibleProject),
	);

	return visibleProjects.map((project) =>
		enrichProjectCardWithAlerts({
			card: mapProjectEntityToPortalProjectCard(project),
			alerts: alertsData.items,
		}),
	);
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

export async function getPortalProjectDetailByOrganization(params: {
	organizationId: string;
	projectId: string;
	organizationName?: string | null;
}): Promise<PortalProjectDetail | null> {
	const { organizationId, projectId, organizationName } = params;

	const normalizedOrganizationId = organizationId.trim();
	const normalizedProjectId = projectId.trim();

	if (!normalizedOrganizationId) {
		return null;
	}

	if (!mongoose.Types.ObjectId.isValid(normalizedProjectId)) {
		return null;
	}

	await connectToDB();

	const organizationQueryValues =
		buildOrganizationQueryValues(normalizedOrganizationId);

	const [item, alertsData] = await Promise.all([
		Project.findOne({
			_id: normalizedProjectId,
			primaryClientId: { $in: organizationQueryValues },
		}).lean(),

		getPortalAlertsByOrganization(normalizedOrganizationId),
	]);

	if (!item) {
		return null;
	}

	const project = normalizeProjectEntity(item);

	if (!isPortalVisibleProject(project)) {
		return null;
	}

	const detail = mapProjectEntityToPortalProjectDetail(
		project,
		organizationName ?? null,
	);

	return {
		...detail,
		alerts: getProjectAlerts(alertsData.items, detail.projectId),
	};
}