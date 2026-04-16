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
 * - proyección básica de mantenimientos y alertas documentales
 * - incorporación de adjuntos de mantenimiento dentro de la biblioteca
 *   documental visible del portal
 *
 * Decisiones:
 * - el portal no expone estados administrativos complejos
 * - archived no debe llegar al portal
 * - published se proyecta como active
 * - draft se proyecta como follow_up
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
  PortalMaintenanceItem,
  PortalProjectCard,
  PortalProjectDetail,
  PortalProjectVisibleStatus,
} from "@/types/portal";
import type {
  ProjectDocumentLink,
  ProjectEntity,
  ProjectMaintenanceItem,
} from "@/types/project";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeNonEmptyString(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function safeLocalizedText(
  value: { es: string; en: string } | null | undefined,
  preferredLocale: "es" | "en" = "es"
): string {
  if (!value) return "";

  const primary = preferredLocale === "es" ? value.es : value.en;
  const fallback = preferredLocale === "es" ? value.en : value.es;

  return (
    normalizeNonEmptyString(primary) ??
    normalizeNonEmptyString(fallback) ??
    ""
  );
}

function isFutureDate(value: string | null | undefined): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= Date.now();
}

function compareIsoAsc(a: string, b: string): number {
  return new Date(a).getTime() - new Date(b).getTime();
}

function compareIsoDesc(a: string, b: string): number {
  return new Date(b).getTime() - new Date(a).getTime();
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
    project.systemType?.es || project.systemType?.en || ""
  );
  if (systemType) return systemType;

  const treatedMedium = normalizeNonEmptyString(
    project.treatedMedium?.es || project.treatedMedium?.en || ""
  );
  if (treatedMedium) return treatedMedium;

  const firstTechnology =
    project.technologyUsed && typeof project.technologyUsed === "object"
      ? [
          ...(project.technologyUsed.es || []),
          ...(project.technologyUsed.en || []),
        ]
          .map((item) => normalizeNonEmptyString(item))
          .find((item): item is string => !!item)
      : null;

  if (firstTechnology) return firstTechnology;

  return null;
}

function buildPortalVisibleStatus(
  project: ProjectEntity
): PortalProjectVisibleStatus {
  if (project.status === "published") {
    return "active";
  }

  if (project.maintenanceItems.some((item) => item.status === "overdue")) {
    return "maintenance";
  }

  return "follow_up";
}

function isPortalVisibleDocument(document: ProjectDocumentLink): boolean {
  return document.visibleInPortal && !document.visibleToInternalOnly;
}

function mapProjectDocumentToPortalDocumentItem(
  project: ProjectEntity,
  document: ProjectDocumentLink
): PortalDocumentItem {
  const fallbackFileNameFromUrl = normalizeNonEmptyString(document.fileUrl)
    ? decodeURIComponent(document.fileUrl.split("/").pop() ?? "")
    : null;

  const resolvedFileName =
    normalizeNonEmptyString(document.fileName) ?? fallbackFileNameFromUrl;

  return {
    documentId:
      normalizeNonEmptyString(document.documentId) ??
      `${project._id}-document-${document.sortOrder}`,
    title: normalizeNonEmptyString(document.title) ?? "Documento sin título",
    description: normalizeNonEmptyString(document.description),
    type: document.documentType,
    source: "project_document",
    projectId: project._id,
    projectTitle: safeLocalizedText(project.title),
    maintenanceId: null,
    maintenanceTitle: null,
    fileUrl: document.fileUrl,
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
function mapMaintenanceAttachmentsToPortalDocuments(
  project: ProjectEntity,
  maintenance: ProjectMaintenanceItem,
  maintenanceIndex: number
): PortalDocumentItem[] {
  const maintenanceId = `${project._id}-maintenance-${maintenanceIndex}`;
  const maintenanceTitle =
    normalizeNonEmptyString(maintenance.title) ?? "Mantenimiento";

  return (maintenance.attachments ?? [])
    .filter((attachment) => normalizeNonEmptyString(attachment.url))
    .map((attachment, attachmentIndex) => {
      const fileName =
        normalizeNonEmptyString(attachment.name) ??
        `Adjunto ${attachmentIndex + 1}`;

      return {
        documentId: `${project._id}-maintenance-${maintenanceIndex}-attachment-${attachmentIndex}`,
        title: fileName,
        description: `Documento operativo asociado a ${maintenanceTitle}.`,
        type: "maintenance_report",
        source: "maintenance_attachment",
        projectId: project._id,
        projectTitle: safeLocalizedText(project.title),
        maintenanceId,
        maintenanceTitle,
        fileUrl: attachment.url,
        fileName,
        mimeType: normalizeNonEmptyString(attachment.mimeType),
        fileSizeBytes: attachment.size ?? null,
        language: null,
        documentDate:
          maintenance.nextDueDate ?? maintenance.lastCompletedDate ?? null,
        effectiveDate: null,
        expiresAt: null,
        uploadedAt: project.updatedAt,
        thumbnailUrl: null,
      };
    });
}

function mapProjectMaintenanceToPortalMaintenanceItem(
  project: ProjectEntity,
  item: ProjectMaintenanceItem,
  index: number
): PortalMaintenanceItem {
  const normalizedStatus =
    item.status === "overdue"
      ? "overdue"
      : item.status === "completed"
        ? "completed"
        : item.nextDueDate && isFutureDate(item.nextDueDate)
          ? "upcoming"
          : "scheduled";

  return {
    maintenanceId: `${project._id}-maintenance-${index}`,
    projectId: project._id,
    projectTitle: safeLocalizedText(project.title),
    title: normalizeNonEmptyString(item.title) ?? "Mantenimiento",
    description: normalizeNonEmptyString(item.description),
    maintenanceType: normalizeNonEmptyString(item.maintenanceType),
    frequencyValue: item.frequencyValue,
    frequencyUnit: item.frequencyUnit,
    lastCompletedDate: item.lastCompletedDate,
    nextDueDate: item.nextDueDate,
    status: normalizedStatus,
    instructions: normalizeNonEmptyString(item.instructions),
    attachments: item.attachments.map((attachment) => ({
      fileName: normalizeNonEmptyString(attachment.name),
      fileUrl: attachment.url,
      mimeType: normalizeNonEmptyString(attachment.mimeType),
    })),
  };
}

function buildMaintenanceAlerts(project: ProjectEntity): PortalAlertItem[] {
  return project.maintenanceItems
    .filter((item) => !!item.nextDueDate)
    .map((item, index) => {
      const isOverdue = item.status === "overdue";
      const title =
        normalizeNonEmptyString(item.title) ?? "Mantenimiento programado";

      return {
        alertId: `${project._id}-maintenance-alert-${index}`,
        type: isOverdue ? "maintenance_overdue" : "maintenance_upcoming",
        priority: isOverdue ? "high" : "medium",
        title,
        description: isOverdue
          ? "Existe un mantenimiento vencido asociado a este proyecto."
          : "Existe un mantenimiento próximo asociado a este proyecto.",
        projectId: project._id,
        projectTitle: safeLocalizedText(project.title),
        documentId: null,
        documentTitle: null,
        dueDate: item.nextDueDate,
        createdAt: project.updatedAt,
        action: "view_project",
      };
    });
}

function buildDocumentAlerts(project: ProjectEntity): PortalAlertItem[] {
  return project.documents
    .filter(isPortalVisibleDocument)
    .filter(
      (document) =>
        document.requiresAlert &&
        (!!document.alertDate || !!document.nextDueDate)
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
          "Documento con fecha relevante",
        description:
          "Existe un documento con fecha crítica o seguimiento próximo en este proyecto.",
        projectId: project._id,
        projectTitle: safeLocalizedText(project.title),
        documentId:
          normalizeNonEmptyString(document.documentId) ??
          `${project._id}-document-${index}`,
        documentTitle: normalizeNonEmptyString(document.title),
        dueDate,
        createdAt: project.updatedAt,
        action: "view_document",
      };
    });
}

function buildProjectAlerts(project: ProjectEntity): PortalAlertItem[] {
  return [...buildMaintenanceAlerts(project), ...buildDocumentAlerts(project)].sort(
    (a, b) => {
      const aDate = a.dueDate ?? a.createdAt ?? "";
      const bDate = b.dueDate ?? b.createdAt ?? "";
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return compareIsoAsc(aDate, bDate);
    }
  );
}

function getVisiblePortalDocuments(project: ProjectEntity): PortalDocumentItem[] {
  const structuredDocuments = project.documents
    .filter(isPortalVisibleDocument)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((document) => mapProjectDocumentToPortalDocumentItem(project, document));

  const maintenanceAttachmentDocuments = project.maintenanceItems.flatMap(
    (maintenance, maintenanceIndex) =>
      mapMaintenanceAttachmentsToPortalDocuments(
        project,
        maintenance,
        maintenanceIndex
      )
  );

  return [...structuredDocuments, ...maintenanceAttachmentDocuments].sort((a, b) => {
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
  });
}

function getVisiblePortalMaintenances(
  project: ProjectEntity
): PortalMaintenanceItem[] {
  return project.maintenanceItems
    .map((item, index) => mapProjectMaintenanceToPortalMaintenanceItem(project, item, index))
    .sort((a, b) => {
      const aDate = a.nextDueDate;
      const bDate = b.nextDueDate;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return compareIsoAsc(aDate, bDate);
    });
}

function getNextMaintenanceDate(project: ProjectEntity): string | null {
  const dates = project.maintenanceItems
    .map((item) => item.nextDueDate)
    .filter((value): value is string => !!value)
    .sort(compareIsoAsc);

  return dates[0] ?? null;
}

function getNextRelevantDate(project: ProjectEntity): string | null {
  const maintenanceDate = getNextMaintenanceDate(project);

  const documentDates = project.documents
    .filter(isPortalVisibleDocument)
    .flatMap((document) => [document.nextDueDate, document.alertDate])
    .filter((value): value is string => !!value);

  const allDates = [maintenanceDate, ...documentDates]
    .filter((value): value is string => !!value)
    .sort(compareIsoAsc);

  return allDates[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Public mappers                                                             */
/* -------------------------------------------------------------------------- */

export function isPortalVisibleProject(project: ProjectEntity): boolean {
  return project.status !== "archived";
}

export function mapProjectEntityToPortalProjectCard(
  project: ProjectEntity
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
    coverImageUrl: project.coverImage?.url ?? null,
    visibleStatus: buildPortalVisibleStatus(project),
    documentsCount: visibleDocuments.length,
    activeAlertsCount: alerts.length,
    nextMaintenanceDate: getNextMaintenanceDate(project),
    nextRelevantDate: getNextRelevantDate(project),
  };
}

export function mapProjectEntityToPortalProjectDetail(
  project: ProjectEntity,
  organizationName?: string | null
): PortalProjectDetail {
  const documents = getVisiblePortalDocuments(project);
  const maintenanceItems = getVisiblePortalMaintenances(project);
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
    coverImageUrl: project.coverImage?.url ?? null,
    gallery: project.gallery
      .filter((image) => !!normalizeNonEmptyString(image.url))
      .map((image) => {
        const resolvedAlt = normalizeNonEmptyString(safeLocalizedText(image.alt));

        return {
          url: image.url,
          alt: resolvedAlt,
        };
      }),
    visibleStatus: buildPortalVisibleStatus(project),
    organizationId: project.primaryClientId ?? "",
    organizationName: normalizeNonEmptyString(organizationName),
    documents,
    maintenanceItems,
    alerts,
  };
}

export function extractPortalDocumentsFromProject(
  project: ProjectEntity
): PortalDocumentItem[] {
  return getVisiblePortalDocuments(project);
}

export function extractPortalAlertsFromProject(
  project: ProjectEntity
): PortalAlertItem[] {
  return buildProjectAlerts(project);
}

export function sortPortalProjects(
  projects: ProjectEntity[]
): ProjectEntity[] {
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