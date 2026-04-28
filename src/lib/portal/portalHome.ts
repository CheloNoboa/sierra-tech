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
 * - mostrar datos reales visibles para el cliente
 * - reutilizar Projects como fuente para proyectos y documentos
 * - reutilizar Maintenance, vía portalAlerts, como fuente real de alertas e
 *   historial operativo
 *
 * Responsabilidades:
 * - cargar proyectos visibles de la organización
 * - construir cards de proyectos destacados
 * - extraer documentos recientes visibles
 * - consumir la vista consolidada de alertas/mantenimientos del portal
 * - alimentar los contadores de Inicio con datos reales
 *
 * Decisiones:
 * - Projects alimenta proyectos y documentos
 * - getPortalAlertsByOrganization alimenta alertas y mantenimientos
 * - no se vuelve a calcular Maintenance aquí para evitar duplicación
 * - activeAlerts representa alertas emitidas o registros accionables visibles
 * - upcomingMaintenances representa eventos pendientes/programados reales
 *
 * EN:
 * Shared read layer for the client portal home.
 * =============================================================================
 */

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";

import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import { getPortalAlertsByOrganization } from "@/lib/portal/portalAlerts";
import {
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

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function compareIsoDesc(a: string, b: string): number {
	return new Date(b).getTime() - new Date(a).getTime();
}

function sortRecentDocuments(items: PortalDocumentItem[]): PortalDocumentItem[] {
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
		const aDate =
			a.emittedAt ??
			a.completedAt ??
			a.dueDate ??
			a.maintenanceDate ??
			a.createdAt ??
			"";

		const bDate =
			b.emittedAt ??
			b.completedAt ??
			b.dueDate ??
			b.maintenanceDate ??
			b.createdAt ??
			"";

		if (!aDate && !bDate) return 0;
		if (!aDate) return 1;
		if (!bDate) return -1;

		return compareIsoDesc(aDate, bDate);
	});
}

function countVisibleActiveAlerts(items: PortalAlertItem[]): number {
	return items.filter((item) => {
		if (item.alertStatus === "emitted" && item.completed !== true) {
			return true;
		}

		if (item.priority === "high" && item.completed !== true) {
			return true;
		}

		return false;
	}).length;
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

	const [projectItems, alertsData] = await Promise.all([
		Project.find({
			primaryClientId: normalizedOrganizationId,
		})
			.sort({ featured: -1, sortOrder: 1, updatedAt: -1 })
			.lean(),

		getPortalAlertsByOrganization(normalizedOrganizationId),
	]);

	const normalizedProjects = projectItems.map((item) =>
		normalizeProjectEntity(item),
	);

	const visibleProjects = sortPortalProjects(
		normalizedProjects.filter(isPortalVisibleProject),
	);

	const projectCards: PortalProjectCard[] = visibleProjects.map((project) =>
		mapProjectEntityToPortalProjectCard(project),
	);

	const portalDocuments: PortalDocumentItem[] = visibleProjects.flatMap(
		(project) => extractPortalDocumentsFromProject(project),
	);

	const portalAlerts = alertsData.items;

	return {
		organizationName,
		userName,
		summary: {
			activeProjects: projectCards.length,
			recentDocuments: portalDocuments.length,
			activeAlerts: countVisibleActiveAlerts(portalAlerts),
			upcomingMaintenances: alertsData.summary.upcomingMaintenances,
		},
		featuredProjects: projectCards.slice(0, 3),
		recentDocuments: sortRecentDocuments(portalDocuments).slice(0, 5),
		alerts: sortRecentAlerts(portalAlerts).slice(0, 5),
	};
}