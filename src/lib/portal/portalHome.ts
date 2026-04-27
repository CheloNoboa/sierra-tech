/**
 * =============================================================================
 * 📄 Helpers: Portal Home Query
 * Path: src/lib/portal/portalHome.ts
 * =============================================================================
 *
 * ES:
 * Capa compartida de lectura para la home del portal cliente.
 *
 * Propósito:
 * - construir el resumen principal de la home del portal
 * - reutilizar proyectos visibles como fuente inicial de verdad
 * - evitar duplicar lógica entre páginas server y futuros endpoints API
 *
 * Alcance:
 * - resumen numérico de la home
 * - proyectos destacados
 * - documentos recientes
 * - alertas recientes
 *
 * Decisiones:
 * - Projects alimenta proyectos, documentos y alertas documentales
 * - Maintenance alimenta el conteo real de mantenimientos próximos
 * - no se introduce todavía una fuente documental independiente
 * - los documentos recientes salen de los documentos visibles en portal dentro
 *   de los proyectos
 * - las alertas salen de la proyección derivada ya definida para portal
 *
 * EN:
 * Shared read layer for the client portal home.
 * =============================================================================
 */

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";
import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import {
	extractPortalAlertsFromProject,
	extractPortalDocumentsFromProject,
	isPortalVisibleProject,
	mapProjectEntityToPortalProjectCard,
	sortPortalProjects,
} from "@/lib/portal/portalProjectMappers";
import type {
	PortalAlertItem,
	PortalDocumentItem,
	PortalHomeData,
	PortalProjectCard,
} from "@/types/portal";
import Maintenance from "@/models/Maintenance";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function compareIsoDesc(a: string, b: string): number {
	return new Date(b).getTime() - new Date(a).getTime();
}

function sortRecentDocuments(
	items: PortalDocumentItem[],
): PortalDocumentItem[] {
	return [...items].sort((a, b) => {
		const aDate = a.uploadedAt ?? a.documentDate ?? a.expiresAt ?? "";
		const bDate = b.uploadedAt ?? b.documentDate ?? b.expiresAt ?? "";

		if (!aDate && !bDate) return 0;
		if (!aDate) return 1;
		if (!bDate) return -1;

		return compareIsoDesc(aDate, bDate);
	});
}

function sortRecentAlerts(items: PortalAlertItem[]): PortalAlertItem[] {
	return [...items].sort((a, b) => {
		const aDate = a.dueDate ?? a.createdAt ?? "";
		const bDate = b.dueDate ?? b.createdAt ?? "";

		if (!aDate && !bDate) return 0;
		if (!aDate) return 1;
		if (!bDate) return -1;

		return compareIsoDesc(aDate, bDate);
	});
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function getPortalHomeDataByOrganization(params: {
	organizationId: string;
	organizationName: string;
	userName: string;
}): Promise<PortalHomeData> {
	const { organizationId, organizationName, userName } = params;
	const normalizedOrganizationId = organizationId.trim();

	if (!normalizedOrganizationId) {
		return {
			organizationName,
			userName,
			summary: {
				activeProjects: 0,
				recentDocuments: 0,
				activeAlerts: 0,
				upcomingMaintenances: 0,
			},
			featuredProjects: [],
			recentDocuments: [],
			alerts: [],
		};
	}

	await connectToDB();

	const items = await Project.find({
		primaryClientId: normalizedOrganizationId,
	})
		.sort({ featured: -1, sortOrder: 1, updatedAt: -1 })
		.lean();

	const normalizedProjects = items.map((item) => normalizeProjectEntity(item));
	const visibleProjects = sortPortalProjects(
		normalizedProjects.filter(isPortalVisibleProject),
	);

	const projectCards: PortalProjectCard[] = visibleProjects.map((project) =>
		mapProjectEntityToPortalProjectCard(project),
	);

	const portalDocuments: PortalDocumentItem[] = visibleProjects.flatMap(
		(project) => extractPortalDocumentsFromProject(project),
	);

	const portalAlerts: PortalAlertItem[] = visibleProjects.flatMap((project) =>
		extractPortalAlertsFromProject(project),
	);

	const upcomingMaintenances = await Maintenance.countDocuments({
		organizationId: normalizedOrganizationId,
		status: { $in: ["scheduled", "active", "overdue"] },
		nextDueDate: { $ne: null },
	});

	return {
		organizationName,
		userName,
		summary: {
			activeProjects: projectCards.length,
			recentDocuments: portalDocuments.length,
			activeAlerts: portalAlerts.length,
			upcomingMaintenances,
		},
		featuredProjects: projectCards.slice(0, 3),
		recentDocuments: sortRecentDocuments(portalDocuments).slice(0, 5),
		alerts: sortRecentAlerts(portalAlerts).slice(0, 5),
	};
}
