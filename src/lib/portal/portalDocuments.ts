/**
 * =============================================================================
 * 📄 Helpers: Portal Documents Query
 * Path: src/lib/portal/portalDocuments.ts
 * =============================================================================
 *
 * ES:
 * Capa compartida de lectura para la biblioteca documental del portal cliente.
 *
 * Propósito:
 * - centralizar la consulta de documentos visibles para una organización
 * - reutilizar la misma lógica desde páginas server y futuros endpoints API
 * - evitar fetch interno server-to-server dentro de la misma aplicación
 *
 * Alcance:
 * - listado global de documentos visibles en portal
 * - métricas resumidas para la página documental
 *
 * Decisiones:
 * - en esta fase, la fuente de verdad documental sigue siendo Projects
 * - solo se exponen documentos autorizados para portal
 * - la agregación se resuelve desde entidades Project ya normalizadas
 * - el orden prioriza fechas recientes y luego título
 *
 * Reglas:
 * - este archivo no depende de NextAuth
 * - este archivo no construye responses HTTP
 * - este archivo solo consulta, normaliza y proyecta
 *
 * EN:
 * Shared read layer for client portal documents.
 * =============================================================================
 */

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";
import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import {
	extractPortalDocumentsFromProject,
	isPortalVisibleProject,
} from "@/lib/portal/portalProjectMappers";
import type { PortalDocumentItem, PortalDocumentType } from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface PortalDocumentsSummary {
	totalDocuments: number;
	contractsAndRecords: number;
	manualsAndWarranties: number;
	criticalDateDocuments: number;
}

export interface PortalDocumentsData {
	items: PortalDocumentItem[];
	summary: PortalDocumentsSummary;
	relatedProjectsCount: number;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function compareIsoDesc(a: string, b: string): number {
	return new Date(b).getTime() - new Date(a).getTime();
}

function getDocumentRelevantDate(item: PortalDocumentItem): string {
	return (
		item.uploadedAt ??
		item.documentDate ??
		item.effectiveDate ??
		item.expiresAt ??
		""
	);
}

function sortPortalDocuments(
	items: PortalDocumentItem[],
): PortalDocumentItem[] {
	return [...items].sort((a, b) => {
		const aDate = getDocumentRelevantDate(a);
		const bDate = getDocumentRelevantDate(b);

		if (aDate && bDate) {
			const byDate = compareIsoDesc(aDate, bDate);
			if (byDate !== 0) return byDate;
		} else if (aDate) {
			return -1;
		} else if (bDate) {
			return 1;
		}

		return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
	});
}

function isContractOrRecord(type: PortalDocumentType): boolean {
	return (
		type === "contract" ||
		type === "delivery_record" ||
		type === "invoice" ||
		type === "permit"
	);
}

function isManualOrWarranty(type: PortalDocumentType): boolean {
	return (
		type === "operation_manual" ||
		type === "maintenance_manual" ||
		type === "warranty" ||
		type === "technical_sheet" ||
		type === "certificate"
	);
}

function hasCriticalDate(item: PortalDocumentItem): boolean {
	return Boolean(item.expiresAt || item.effectiveDate || item.documentDate);
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function getPortalDocumentsByOrganization(
	organizationId: string,
): Promise<PortalDocumentsData> {
	const normalizedOrganizationId = organizationId.trim();

	if (!normalizedOrganizationId) {
		return {
			items: [],
			summary: {
				totalDocuments: 0,
				contractsAndRecords: 0,
				manualsAndWarranties: 0,
				criticalDateDocuments: 0,
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

	const documents = sortPortalDocuments(
		normalizedProjects.flatMap((project) =>
			extractPortalDocumentsFromProject(project),
		),
	);

	const uniqueProjects = new Set(
		documents
			.map((item) => item.projectId?.trim() ?? "")
			.filter((value) => value.length > 0),
	);

	return {
		items: documents,
		summary: {
			totalDocuments: documents.length,
			contractsAndRecords: documents.filter((item) =>
				isContractOrRecord(item.type),
			).length,
			manualsAndWarranties: documents.filter((item) =>
				isManualOrWarranty(item.type),
			).length,
			criticalDateDocuments: documents.filter(hasCriticalDate).length,
		},
		relatedProjectsCount: uniqueProjects.size,
	};
}
