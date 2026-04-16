/**
 * =============================================================================
 * 📄 Types: Client Portal
 * Path: src/types/portal.ts
 * =============================================================================
 *
 * ES:
 * Contratos tipados oficiales del portal cliente para Sierra Tech.
 *
 * Propósito:
 * - unificar el shape de datos consumido por las pantallas del portal
 * - separar claramente la vista cliente de los contratos internos admin
 * - exponer tipos estables para UI, API y normalizadores
 *
 * Alcance:
 * - home del portal
 * - listado de proyectos
 * - detalle de proyecto
 * - biblioteca documental
 * - mantenimientos
 * - alertas
 * - filtros de búsqueda / navegación
 *
 * Decisiones:
 * - el portal cliente usa contratos propios y simplificados
 * - visibleStatus no expone estados internos complejos
 * - alertas se modelan como una vista funcional del portal
 * - los documentos expuestos aquí representan solo contenido autorizado
 * - los documentos del portal pueden venir tanto de:
 *   - documentos estructurados del proyecto
 *   - adjuntos de mantenimiento visibles para el cliente
 *
 * EN:
 * Official typed contracts for the Sierra Tech client portal.
 * =============================================================================
 */

/* -------------------------------------------------------------------------- */
/* 🧱 Estados visibles del portal                                             */
/* -------------------------------------------------------------------------- */

/**
 * Estado visible del proyecto para el cliente.
 * Se evita exponer al portal estados internos técnicos o ambiguos.
 */
export type PortalProjectVisibleStatus =
  | "active"
  | "follow_up"
  | "completed"
  | "maintenance";

/**
 * Estado operativo simplificado para mantenimientos.
 */
export type PortalMaintenanceStatus =
  | "scheduled"
  | "upcoming"
  | "overdue"
  | "completed";

/**
 * Tipos de alerta visibles en el portal.
 */
export type PortalAlertType =
  | "maintenance_upcoming"
  | "maintenance_overdue"
  | "document_expiring"
  | "warranty_expiring"
  | "scheduled_review"
  | "critical";

/**
 * Prioridad visible de alerta.
 */
export type PortalAlertPriority = "high" | "medium" | "low";

/**
 * Acción principal sugerida por una alerta.
 */
export type PortalAlertAction =
  | "view_project"
  | "view_document"
  | "contact_support";

/* -------------------------------------------------------------------------- */
/* 📄 Documentos                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Tipología documental visible al cliente.
 * Basada en el contrato documental-operativo del módulo Projects.
 */
export type PortalDocumentType =
  | "contract"
  | "planning"
  | "schedule"
  | "technical_design"
  | "plan"
  | "technical_report"
  | "technical_sheet"
  | "operation_manual"
  | "maintenance_manual"
  | "inspection_report"
  | "maintenance_report"
  | "delivery_record"
  | "certificate"
  | "warranty"
  | "invoice"
  | "permit"
  | "photo_evidence"
  | "other";

/**
 * Origen funcional del documento dentro del portal.
 *
 * Decisión:
 * - `project_document` representa documentos estructurados del proyecto
 * - `maintenance_attachment` representa archivos adjuntos que nacen dentro
 *   de un mantenimiento, pero deben quedar disponibles para el cliente
 */
export type PortalDocumentSource =
  | "project_document"
  | "maintenance_attachment";

/**
 * Documento visible dentro del portal cliente.
 * Puede aparecer en:
 * - home
 * - biblioteca documental
 * - detalle de proyecto
 */
export interface PortalDocumentItem {
  documentId: string;

  title: string;
  description?: string | null;

  type: PortalDocumentType;
  source: PortalDocumentSource;

  projectId?: string | null;
  projectTitle?: string | null;

  /**
   * Contexto adicional cuando el archivo proviene de un mantenimiento.
   */
  maintenanceId?: string | null;
  maintenanceTitle?: string | null;

  fileUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;

  language?: "es" | "en" | "both" | "other" | null;

  documentDate?: string | null;
  effectiveDate?: string | null;
  expiresAt?: string | null;
  uploadedAt?: string | null;

  thumbnailUrl?: string | null;
}

/* -------------------------------------------------------------------------- */
/* 🛠️ Mantenimientos                                                          */
/* -------------------------------------------------------------------------- */

export interface PortalMaintenanceAttachment {
  fileName?: string | null;
  fileUrl: string;
  mimeType?: string | null;
}

/**
 * Mantenimiento visible para el cliente.
 * Vive principalmente dentro del detalle del proyecto, pero también
 * alimenta la vista global de alertas.
 */
export interface PortalMaintenanceItem {
  maintenanceId: string;

  projectId: string;
  projectTitle?: string | null;

  title: string;
  description?: string | null;

  maintenanceType?: string | null;

  frequencyValue?: number | null;
  frequencyUnit?: "days" | "weeks" | "months" | "years" | null;

  lastCompletedDate?: string | null;
  nextDueDate?: string | null;

  status: PortalMaintenanceStatus;

  instructions?: string | null;

  attachments?: PortalMaintenanceAttachment[];
}

/* -------------------------------------------------------------------------- */
/* 🚨 Alertas                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Alerta consolidada visible en:
 * - home del portal
 * - vista global de alertas
 * - detalle de proyecto
 *
 * Importante:
 * Este contrato puede construirse inicialmente desde mantenimientos,
 * vencimientos documentales y fechas críticas sin necesidad de persistir
 * una colección separada desde el día uno.
 */
export interface PortalAlertItem {
  alertId: string;

  type: PortalAlertType;
  priority: PortalAlertPriority;

  title: string;
  description: string;

  projectId?: string | null;
  projectTitle?: string | null;

  documentId?: string | null;
  documentTitle?: string | null;

  dueDate?: string | null;
  createdAt?: string | null;

  action: PortalAlertAction;
}

/* -------------------------------------------------------------------------- */
/* 📁 Proyectos                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Card de proyecto para:
 * - home
 * - listado de proyectos
 */
export interface PortalProjectCard {
  projectId: string;

  title: string;
  summary: string;

  category?: string | null;
  projectDate?: string | null;

  coverImageUrl?: string | null;

  visibleStatus: PortalProjectVisibleStatus;

  documentsCount: number;
  activeAlertsCount: number;

  nextMaintenanceDate?: string | null;
  nextRelevantDate?: string | null;
}

/**
 * Detalle completo del proyecto visible en portal cliente.
 */
export interface PortalProjectGalleryItem {
  url: string;
  alt?: string | null;
}

export interface PortalProjectDetail {
  projectId: string;

  title: string;
  summary: string;
  description: string;

  category?: string | null;
  projectDate?: string | null;

  coverImageUrl?: string | null;
  gallery?: PortalProjectGalleryItem[];

  visibleStatus: PortalProjectVisibleStatus;

  organizationId: string;
  organizationName?: string | null;

  documents: PortalDocumentItem[];
  maintenanceItems: PortalMaintenanceItem[];
  alerts: PortalAlertItem[];
}

/* -------------------------------------------------------------------------- */
/* 🏠 Home del portal                                                         */
/* -------------------------------------------------------------------------- */

export interface PortalHomeSummary {
  activeProjects: number;
  recentDocuments: number;
  activeAlerts: number;
  upcomingMaintenances: number;
}

/**
 * Contrato de datos para la home del portal cliente.
 */
export interface PortalHomeData {
  organizationName: string;
  userName: string;

  summary: PortalHomeSummary;

  featuredProjects: PortalProjectCard[];
  recentDocuments: PortalDocumentItem[];
  alerts: PortalAlertItem[];
}

/* -------------------------------------------------------------------------- */
/* 🔎 Filtros                                                                 */
/* -------------------------------------------------------------------------- */

export interface PortalProjectsFilters {
  q?: string;
  status?: PortalProjectVisibleStatus | "all";
}

export interface PortalDocumentsFilters {
  q?: string;
  projectId?: string | "all";
  type?: PortalDocumentType | "all";
  language?: "es" | "en" | "both" | "other" | "all";
}

export interface PortalAlertsFilters {
  projectId?: string | "all";
  type?: PortalAlertType | "all";
  priority?: PortalAlertPriority | "all";
}