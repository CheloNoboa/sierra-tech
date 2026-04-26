/**
 * =============================================================================
 * 📄 Helpers: Maintenance Project Context
 * Path: src/lib/maintenance/maintenance.project-context.ts
 * =============================================================================
 *
 * ES:
 * Capa oficial de lectura para recuperar el contexto base de un proyecto
 * antes de crear o editar un maintenance.
 *
 * Propósito:
 * - desacoplar el módulo Maintenance del módulo Projects sin duplicar lógica
 * - recuperar el contexto mínimo necesario para inicializar un maintenance
 * - centralizar la lectura estable de:
 *   - organización
 *   - proyecto
 *   - contexto contractual
 *   - documentos disponibles para vinculación
 *
 * Alcance:
 * - lectura por organización
 * - lectura de proyectos visibles para bootstrap de maintenance
 * - lectura de contexto puntual por projectId
 * - proyección limpia hacia src/types/maintenance.ts
 *
 * Decisiones:
 * - este archivo NO crea ni actualiza mantenimientos
 * - este archivo NO expone payload administrativo completo de Projects
 * - este archivo usa normalizeProjectEntity como única entrada confiable
 * - los documentos disponibles se limitan a los IDs documentales reales
 * - los nombres de organización y proyecto se resuelven como texto simple
 *
 * Reglas:
 * - sin any
 * - sin efectos secundarios
 * - no construir responses HTTP
 * - no depender de React
 *
 * EN:
 * Official read helpers to bootstrap Maintenance from Projects context.
 * =============================================================================
 */

import { connectToDB } from "@/lib/connectToDB";
import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import Organization from "@/models/Organization";
import Project from "@/models/Project";

import type {
	MaintenanceProjectContext,
} from "@/types/maintenance";
import type { ProjectEntity } from "@/types/project";

/* -------------------------------------------------------------------------- */
/* Base helpers                                                               */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function resolveLocalizedText(
	value: { es: string; en: string } | null | undefined,
): string {
	if (!value) {
		return "";
	}

	return normalizeString(value.es) || normalizeString(value.en) || "";
}

function resolveOrganizationName(source: unknown): string {
	if (!source || typeof source !== "object") {
		return "";
	}

	const record = source as Record<string, unknown>;

	return (
		normalizeString(record.commercialName) ||
		normalizeString(record.legalName) ||
		normalizeString(record.companyName) ||
		normalizeString(record.name) ||
		""
	);
}

function buildMaintenanceProjectContext(params: {
	project: ProjectEntity;
	organizationName: string;
}): MaintenanceProjectContext {
	const { project, organizationName } = params;

	return {
		organizationId: normalizeString(project.primaryClientId),
		organizationName,
		projectId: normalizeString(project._id),
		projectTitle: resolveLocalizedText(project.title),
		contractStartDate: project.contractStartDate,
		contractDurationMonths: project.contractDurationMonths,
		contractEndDate: project.contractEndDate,
		availableDocumentIds: project.documents
			.map((document) => normalizeString(document.documentId))
			.filter(Boolean),
	};
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Devuelve los proyectos de una organización listos para bootstrap del módulo
 * Maintenance.
 *
 * Uso:
 * - selector de proyecto en la nueva pantalla de Maintenance
 * - carga inicial de opciones disponibles para una organización
 * ---------------------------------------------------------------------------
 */
export async function getMaintenanceProjectContextsByOrganization(
	organizationId: string,
): Promise<MaintenanceProjectContext[]> {
	const normalizedOrganizationId = normalizeString(organizationId);

	if (!normalizedOrganizationId) {
		return [];
	}

	await connectToDB();

	const [organizationRaw, projectsRaw] = await Promise.all([
		Organization.findById(normalizedOrganizationId).lean(),
		Project.find({
			primaryClientId: normalizedOrganizationId,
		})
			.sort({ featured: -1, sortOrder: 1, updatedAt: -1 })
			.lean(),
	]);

	const organizationName = resolveOrganizationName(organizationRaw);

	return projectsRaw
		.map((item) => normalizeProjectEntity(item))
		.map((project) =>
			buildMaintenanceProjectContext({
				project,
				organizationName,
			}),
		)
		.filter(
			(item) =>
				item.organizationId.length > 0 && item.projectId.length > 0,
		);
}

/**
 * ---------------------------------------------------------------------------
 * Devuelve el contexto puntual de un proyecto, validando que pertenezca a la
 * organización indicada.
 *
 * Uso:
 * - bootstrap detallado del formulario create/edit de Maintenance
 * - recarga del contexto contractual base desde Projects
 * ---------------------------------------------------------------------------
 */
export async function getMaintenanceProjectContextByProjectId(params: {
	organizationId: string;
	projectId: string;
}): Promise<MaintenanceProjectContext | null> {
	const organizationId = normalizeString(params.organizationId);
	const projectId = normalizeString(params.projectId);

	if (!organizationId || !projectId) {
		return null;
	}

	await connectToDB();

	const [organizationRaw, projectRaw] = await Promise.all([
		Organization.findById(organizationId).lean(),
		Project.findOne({
			_id: projectId,
			primaryClientId: organizationId,
		}).lean(),
	]);

	if (!projectRaw) {
		return null;
	}

	const project = normalizeProjectEntity(projectRaw);
	const organizationName = resolveOrganizationName(organizationRaw);

	return buildMaintenanceProjectContext({
		project,
		organizationName,
	});
}