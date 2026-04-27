/**
 * =============================================================================
 * 📄 Helpers: Portal Project Mappers
 * Path: src/lib/portal/portalProjectMappers.ts
 * =============================================================================
 *
 * ES:
 * Mapeadores oficiales para convertir entidades del módulo Projects al contrato
 * del portal cliente de Sierra Tech.
 *
 * Propósito:
 * - traducir ProjectEntity al shape simplificado del portal
 * - evitar que las rutas /api/portal mezclen lógica de negocio con render shape
 * - reutilizar el contrato normalizado existente del módulo Projects
 * - mantener una separación clara entre:
 *   - contrato administrativo / persistencia
 *   - contrato visual / funcional del portal cliente
 *
 * Alcance:
 * - listado de proyectos del portal
 * - detalle de proyecto del portal
 * - filtrado de documentos visibles en portal
 * - proyección de mantenimientos visibles
 * - generación de alertas derivadas desde mantenimientos y documentos
 * - incorporación de adjuntos de mantenimiento dentro de:
 *   - biblioteca documental visible del portal
 *   - alertas de mantenimiento del portal
 *
 * Decisiones:
 * - el portal no expone estados administrativos complejos
 * - archived no debe llegar al portal
 * - published se proyecta como active
 * - draft se proyecta como follow_up
 * - si existe mantenimiento vencido, el portal prioriza estado maintenance
 *   por encima del estado editorial del proyecto
 * - los documentos visibles en portal dependen de:
 *   - visibleInPortal = true
 *   - visibleToInternalOnly = false
 * - los adjuntos de mantenimiento también se consideran visibles para portal
 *   porque forman parte del soporte operativo entregado al cliente
 * - las alertas del portal, en esta fase, se derivan desde:
 *   - maintenanceItems.nextDueDate
 *   - documents.nextDueDate
 *   - documents.alertDate
 * - la categoría visible del portal usa una resolución defensiva:
 *   - systemType
 *   - treatedMedium
 *   - primera tecnología disponible
 *
 * Reglas:
 * - este archivo no consulta base de datos
 * - este archivo no depende de NextAuth ni de request context
 * - recibe ProjectEntity ya normalizado
 *
 * EN:
 * Official mappers from Projects entities to client portal contracts.
 * =============================================================================
 */

import type {
	PortalAlertItem,
	PortalDocumentItem,
	PortalProjectCard,
	PortalProjectDetail,
	PortalProjectVisibleStatus,
} from "@/types/portal";

import type {
	ProjectDocumentLink,
	ProjectEntity,
} from "@/types/project";

/* -------------------------------------------------------------------------- */
/* Local helper types                                                         */
/* -------------------------------------------------------------------------- */

type LocalizedTextLike =
	| {
		es?: string | null;
		en?: string | null;
	}
	| null
	| undefined;

/* -------------------------------------------------------------------------- */
/* Primitive helpers                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Normaliza strings opcionales para evitar propagar:
 * - undefined
 * - null
 * - strings vacíos o con espacios
 */
function normalizeNonEmptyString(
	value: string | null | undefined,
): string | null {
	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Lee un localized text con fallback defensivo entre ES y EN.
 *
 * Regla:
 * - primero intenta preferredLocale
 * - si está vacío, usa el idioma alterno
 * - si ambos están vacíos, retorna ""
 */
function safeLocalizedText(
	value: LocalizedTextLike,
	preferredLocale: "es" | "en" = "es",
): string {
	if (!value) return "";

	const primary =
		preferredLocale === "es"
			? normalizeNonEmptyString(value.es ?? null)
			: normalizeNonEmptyString(value.en ?? null);

	const fallback =
		preferredLocale === "es"
			? normalizeNonEmptyString(value.en ?? null)
			: normalizeNonEmptyString(value.es ?? null);

	return primary ?? fallback ?? "";
}

/**
 * Parsea una fecha ISO de forma segura.
 */
function parseSafeDate(value: string | null | undefined): Date | null {
	if (!value) return null;

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;

	return parsed;
}

function isFutureDate(value: string | null | undefined): boolean {
	const parsed = parseSafeDate(value);
	if (!parsed) return false;

	return parsed.getTime() >= Date.now();
}

/**
 * Comparadores robustos para fechas ISO.
 *
 * Regla:
 * - asc: fechas inválidas van al final
 * - desc: fechas inválidas van al final
 */
function compareIsoAsc(a: string, b: string): number {
	const aTime = parseSafeDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
	const bTime = parseSafeDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;

	return aTime - bTime;
}

function compareIsoDesc(a: string, b: string): number {
	const aTime = parseSafeDate(a)?.getTime() ?? Number.NEGATIVE_INFINITY;
	const bTime = parseSafeDate(b)?.getTime() ?? Number.NEGATIVE_INFINITY;

	return bTime - aTime;
}

/**
 * Formato corto visual usado por descripciones humanas del portal.
 */
function formatPortalShortDate(value: string | null | undefined): string | null {
	const parsed = parseSafeDate(value);
	if (!parsed) return null;

	return new Intl.DateTimeFormat("es-EC", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(parsed);
}

/**
 * Obtiene la fecha más temprana, si existe al menos una válida.
 */
function getEarliestDate(
	values: Array<string | null | undefined>,
): string | null {
	const safeDates = values
		.filter((value): value is string => !!parseSafeDate(value))
		.sort(compareIsoAsc);

	return safeDates[0] ?? null;
}

/**
 * Obtiene la próxima fecha futura más cercana.
 */
function getEarliestFutureDate(
	values: Array<string | null | undefined>,
): string | null {
	const safeDates = values
		.filter((value): value is string => !!parseSafeDate(value))
		.filter((value) => isFutureDate(value))
		.sort(compareIsoAsc);

	return safeDates[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* File / media helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Resuelve URLs consumibles por el portal.
 *
 * Casos soportados:
 * - URL absoluta http/https
 * - path local "/..."
 * - storage key bajo prefijo admin/
 * - fallback directo por storageKey
 */
function resolvePortalFileUrl(
	value: string | null | undefined,
	storageKey?: string | null,
): string {
	const directUrl = normalizeNonEmptyString(value);

	if (directUrl) {
		if (
			directUrl.startsWith("http://") ||
			directUrl.startsWith("https://") ||
			directUrl.startsWith("/")
		) {
			return directUrl;
		}

		if (directUrl.startsWith("admin/")) {
			return `/api/admin/uploads/view?key=${encodeURIComponent(directUrl)}`;
		}
	}

	const safeStorageKey = normalizeNonEmptyString(storageKey);

	if (safeStorageKey) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(safeStorageKey)}`;
	}

	return "";
}

/**
 * Resuelve la portada visible del proyecto para portal.
 */
function resolveProjectCoverImageUrl(project: ProjectEntity): string | null {
	const resolved = resolvePortalFileUrl(
		project.coverImage?.url ?? null,
		project.coverImage?.storageKey ?? null,
	);

	return normalizeNonEmptyString(resolved);
}

/* -------------------------------------------------------------------------- */
/* Domain helpers                                                             */
/* -------------------------------------------------------------------------- */

function buildDocumentAlertDescription(
	project: ProjectEntity,
	document: ProjectDocumentLink,
): string {
	const projectTitle = safeLocalizedText(project.title) || "este proyecto";

	const documentTitle = normalizeNonEmptyString(document.title);
	const dueDate = document.nextDueDate ?? document.alertDate;
	const dueDateLabel = formatPortalShortDate(dueDate);

	const baseDescription = normalizeNonEmptyString(document.description);

	if (baseDescription) {
		return baseDescription;
	}

	if (documentTitle && dueDateLabel) {
		return `${documentTitle} tiene una fecha relevante el ${dueDateLabel} en ${projectTitle}.`;
	}

	if (documentTitle) {
		return `${documentTitle} requiere seguimiento dentro de ${projectTitle}.`;
	}

	if (dueDateLabel) {
		return `Existe un documento con fecha relevante el ${dueDateLabel} en ${projectTitle}.`;
	}

	return `Existe un documento con seguimiento pendiente en ${projectTitle}.`;
}

/**
 * ---------------------------------------------------------------------------
 * Resuelve una categoría visible estable para el portal.
 *
 * Orden de prioridad:
 * 1. systemType
 * 2. treatedMedium
 * 3. primera tecnología disponible
 * ---------------------------------------------------------------------------
 */
function resolvePortalProjectCategory(project: ProjectEntity): string | null {
	const systemType = normalizeNonEmptyString(
		safeLocalizedText(project.systemType),
	);
	if (systemType) return systemType;

	const treatedMedium = normalizeNonEmptyString(
		safeLocalizedText(project.treatedMedium),
	);
	if (treatedMedium) return treatedMedium;

	const firstTechnology =
		project.technologyUsed && typeof project.technologyUsed === "object"
			? [...(project.technologyUsed.es || []), ...(project.technologyUsed.en || [])]
				.map((item) => normalizeNonEmptyString(item))
				.find((item): item is string => !!item)
			: null;

	if (firstTechnology) return firstTechnology;

	return null;
}

/**
 * Estado visible simplificado del proyecto para el portal.
 *
 * Regla:
 * - maintenance tiene prioridad si existe mantenimiento vencido
 * - active aplica a published sin vencimiento operativo
 * - follow_up cubre drafts / seguimiento general
 */
function buildPortalVisibleStatus(
	project: ProjectEntity,
): PortalProjectVisibleStatus {
	if (project.status === "published") {
		return "active";
	}

	return "follow_up";
}

function isPortalVisibleDocument(document: ProjectDocumentLink): boolean {
	return document.visibleInPortal && !document.visibleToInternalOnly;
}

function getDocumentRelevantDate(document: ProjectDocumentLink): string | null {
	return document.nextDueDate ?? document.alertDate ?? document.documentDate ?? null;
}

/* -------------------------------------------------------------------------- */
/* Document mappers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Convierte un documento estructurado del proyecto al contrato del portal.
 *
 * Nota:
 * - PortalDocumentItem sí contempla effectiveDate
 * - ProjectDocumentLink NO lo tiene en el contrato actual
 * - por eso aquí se proyecta como null
 */
function mapProjectDocumentToPortalDocumentItem(
	project: ProjectEntity,
	document: ProjectDocumentLink,
	documentIndex: number,
): PortalDocumentItem {
	const fallbackFileNameFromUrl = normalizeNonEmptyString(document.fileUrl)
		? decodeURIComponent(document.fileUrl.split("/").pop() ?? "")
		: null;

	const resolvedFileName =
		normalizeNonEmptyString(document.fileName) ?? fallbackFileNameFromUrl;

	return {
		documentId:
			normalizeNonEmptyString(document.documentId) ??
			`${project._id}-document-${documentIndex}`,
		title: normalizeNonEmptyString(document.title) ?? "Documento sin título",
		description: normalizeNonEmptyString(document.description),
		type: document.documentType,
		source: "project_document",
		projectId: project._id,
		projectTitle: safeLocalizedText(project.title),
		maintenanceId: null,
		maintenanceTitle: null,
		fileUrl: resolvePortalFileUrl(document.fileUrl, document.storageKey ?? null),
		fileName: resolvedFileName,
		mimeType: normalizeNonEmptyString(document.mimeType),
		fileSizeBytes: document.size ?? null,
		language: document.language === "none" ? null : document.language,
		documentDate: document.documentDate,
		effectiveDate: null,
		expiresAt: document.nextDueDate,
		uploadedAt: project.updatedAt,
		thumbnailUrl: null,
	};
}

/**
 * ---------------------------------------------------------------------------
 * Convierte adjuntos de mantenimiento a documentos visibles del portal.
 *
 * Decisión:
 * - estos archivos no son "documents" estructurados del proyecto, pero sí son
 *   material documental útil para el cliente
 * - se proyectan como maintenance_report por defecto, ya que viven dentro de un
 *   mantenimiento específico y acompañan su operación
 * ---------------------------------------------------------------------------
 */

function getVisiblePortalDocuments(
	project: ProjectEntity,
): PortalDocumentItem[] {
	const structuredDocuments = project.documents
		.filter(isPortalVisibleDocument)
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((document, index) =>
			mapProjectDocumentToPortalDocumentItem(project, document, index),
		);

	return structuredDocuments.sort(
		(a, b) => {
			const aDate = a.uploadedAt ?? a.documentDate ?? a.expiresAt ?? "";
			const bDate = b.uploadedAt ?? b.documentDate ?? b.expiresAt ?? "";

			if (!aDate && !bDate) {
				return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
			}

			if (!aDate) return 1;
			if (!bDate) return -1;

			const byDate = compareIsoDesc(aDate, bDate);
			if (byDate !== 0) return byDate;

			return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
		},
	);
}

/**
 * Genera alertas documentales visibles para portal.
 *
 * Nota:
 * - actualmente no se proyectan adjuntos extras aquí
 * - la acción principal lleva a documentos
 */
function buildDocumentAlerts(project: ProjectEntity): PortalAlertItem[] {
	return project.documents
		.filter(isPortalVisibleDocument)
		.filter(
			(document) =>
				document.requiresAlert &&
				(!!document.alertDate || !!document.nextDueDate),
		)
		.map((document, index) => {
			const dueDate = document.nextDueDate ?? document.alertDate;
			const isCritical = document.isCritical;

			return {
				alertId: `${project._id}-document-alert-${index}`,
				type:
					document.documentType === "warranty"
						? "warranty_expiring"
						: "document_expiring",
				priority: isCritical ? "high" : "medium",
				title:
					normalizeNonEmptyString(document.title) ??
					(document.documentType === "warranty"
						? "Garantía con fecha relevante"
						: "Documento con fecha relevante"),
				description: buildDocumentAlertDescription(project, document),
				projectId: project._id,
				projectTitle: safeLocalizedText(project.title),
				documentId:
					normalizeNonEmptyString(document.documentId) ??
					`${project._id}-document-${index}`,
				documentTitle: normalizeNonEmptyString(document.title),
				maintenanceId: null,
				maintenanceTitle: null,
				dueDate,
				createdAt: project.updatedAt,
				action: "view_document",
				attachments: [],
			};
		});
}

/**
 * Une todas las alertas visibles del proyecto y las ordena por fecha relevante.
 */
function buildProjectAlerts(project: ProjectEntity): PortalAlertItem[] {
	return buildDocumentAlerts(project).sort(
		(a, b) => {
			const aDate = a.dueDate ?? a.createdAt ?? "";
			const bDate = b.dueDate ?? b.createdAt ?? "";

			if (!aDate && !bDate) return 0;
			if (!aDate) return 1;
			if (!bDate) return -1;

			return compareIsoAsc(aDate, bDate);
		},
	);
}

/* -------------------------------------------------------------------------- */
/* Aggregate project helpers                                                  */
/* -------------------------------------------------------------------------- */

function getNextRelevantProjectDate(project: ProjectEntity): string | null {
	const documentDate = getEarliestFutureDate(
		project.documents
			.filter(isPortalVisibleDocument)
			.filter((document) => document.requiresAlert)
			.map((document) => getDocumentRelevantDate(document)),
	);

	if (documentDate) return documentDate;

	const fallbackDocumentDate = getEarliestDate(
		project.documents
			.filter(isPortalVisibleDocument)
			.filter((document) => document.requiresAlert)
			.map((document) => getDocumentRelevantDate(document)),
	);

	return fallbackDocumentDate;
}

/**
 * Determina si un proyecto puede mostrarse en portal.
 *
 * Regla actual:
 * - archived queda fuera
 */
export function isPortalVisibleProject(project: ProjectEntity): boolean {
	return project.status !== "archived";
}

/**
 * Convierte ProjectEntity a card resumida para:
 * - home portal
 * - listado de proyectos
 */
export function mapProjectEntityToPortalProjectCard(
	project: ProjectEntity,
): PortalProjectCard {
	const visibleDocuments = getVisiblePortalDocuments(project);
	const alerts = buildProjectAlerts(project);

	return {
		projectId: project._id,
		title: safeLocalizedText(project.title) || "Proyecto sin título",
		summary:
			safeLocalizedText(project.summary) ||
			"Proyecto visible para la organización.",
		category: resolvePortalProjectCategory(project),
		projectDate: project.contractStartDate,
		coverImageUrl: resolveProjectCoverImageUrl(project),
		visibleStatus: buildPortalVisibleStatus(project),
		documentsCount: visibleDocuments.length,
		activeAlertsCount: alerts.length,
		nextMaintenanceDate: null,
		nextRelevantDate: getNextRelevantProjectDate(project),
	};
}

/**
 * Convierte ProjectEntity a detalle completo visible en portal.
 */
export function mapProjectEntityToPortalProjectDetail(
	project: ProjectEntity,
	organizationName?: string | null,
): PortalProjectDetail {
	const documents = getVisiblePortalDocuments(project);
	const maintenanceItems: PortalProjectDetail["maintenanceItems"] = [];
	const alerts = buildProjectAlerts(project);

	return {
		projectId: project._id,
		title: safeLocalizedText(project.title) || "Proyecto sin título",
		summary:
			safeLocalizedText(project.summary) ||
			"Proyecto visible para la organización.",
		description:
			safeLocalizedText(project.description) ||
			"Sin descripción visible disponible.",
		category: resolvePortalProjectCategory(project),
		projectDate: project.contractStartDate,
		coverImageUrl: resolveProjectCoverImageUrl(project),
		gallery: project.gallery
			.map((image) => {
				const resolvedUrl = resolvePortalFileUrl(
					image.url ?? null,
					image.storageKey ?? null,
				);

				const safeUrl = normalizeNonEmptyString(resolvedUrl);
				if (!safeUrl) return null;

				const resolvedAlt = normalizeNonEmptyString(safeLocalizedText(image.alt));

				return {
					url: safeUrl,
					alt: resolvedAlt,
				};
			})
			.filter(
				(
					image,
				): image is {
					url: string;
					alt: string | null;
				} => !!image,
			),
		visibleStatus: buildPortalVisibleStatus(project),
		organizationId: project.primaryClientId ?? "",
		organizationName: normalizeNonEmptyString(organizationName),
		documents,
		maintenanceItems,
		alerts,
	};
}

/**
 * Extrae todos los documentos visibles para portal desde un proyecto.
 *
 * Incluye:
 * - documentos estructurados del proyecto
 * - adjuntos de mantenimiento
 */
export function extractPortalDocumentsFromProject(
	project: ProjectEntity,
): PortalDocumentItem[] {
	return getVisiblePortalDocuments(project);
}

/**
 * Extrae todas las alertas visibles del proyecto.
 */
export function extractPortalAlertsFromProject(
	project: ProjectEntity,
): PortalAlertItem[] {
	return buildProjectAlerts(project);
}

/**
 * Orden de proyectos visible en portal.
 *
 * Prioridad:
 * 1. featured
 * 2. sortOrder
 * 3. updatedAt desc
 */
export function sortPortalProjects(projects: ProjectEntity[]): ProjectEntity[] {
	return [...projects].sort((a, b) => {
		if (a.featured !== b.featured) {
			return a.featured ? -1 : 1;
		}

		if (a.sortOrder !== b.sortOrder) {
			return a.sortOrder - b.sortOrder;
		}

		return compareIsoDesc(a.updatedAt, b.updatedAt);
	});
}