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
 * - evitar fetch interno server-to-server dentro de la misma aplicación
 *
 * Alcance:
 * - listado de proyectos del portal
 * - detalle de proyecto del portal
 *
 * Decisiones:
 * - organizationId es la fuente de verdad del filtro
 * - archived no se expone en portal
 * - toda entidad se normaliza antes de proyectarse al contrato del portal
 * - la validación de sesión NO vive aquí; esta capa solo resuelve lectura
 *
 * Reglas:
 * - este archivo no debe depender de NextAuth
 * - este archivo no construye responses HTTP
 * - este archivo solo consulta, normaliza y proyecta
 *
 * EN:
 * Shared read layer for client portal projects.
 * =============================================================================
 */

import mongoose from "mongoose";

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";
import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import {
	isPortalVisibleProject,
	mapProjectEntityToPortalProjectCard,
	mapProjectEntityToPortalProjectDetail,
	sortPortalProjects,
} from "@/lib/portal/portalProjectMappers";
import type { PortalProjectCard, PortalProjectDetail } from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Obtiene los proyectos visibles para una organización dentro del portal.
 *
 * Regla:
 * - el filtro base se realiza por primaryClientId
 * - luego se proyecta solo lo visible para portal
 */
export async function getPortalProjectsByOrganization(
	organizationId: string,
): Promise<PortalProjectCard[]> {
	const normalizedOrganizationId = organizationId.trim();

	if (!normalizedOrganizationId) {
		return [];
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

	return visibleProjects.map((project) =>
		mapProjectEntityToPortalProjectCard(project),
	);
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Obtiene el detalle visible en portal de un proyecto perteneciente a una
 * organización específica.
 *
 * Reglas:
 * - si el id no es válido, devuelve null
 * - si el proyecto no pertenece a la organización, devuelve null
 * - si el proyecto no es visible en portal, devuelve null
 */
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

	const item = await Project.findOne({
		_id: normalizedProjectId,
		primaryClientId: normalizedOrganizationId,
	}).lean();

	if (!item) {
		return null;
	}

	const project = normalizeProjectEntity(item);

	if (!isPortalVisibleProject(project)) {
		return null;
	}

	return mapProjectEntityToPortalProjectDetail(
		project,
		organizationName ?? null,
	);
}
