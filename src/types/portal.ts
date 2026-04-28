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
 * - soportar vistas ejecutivas, alertas, mantenimientos e historial operativo
 *
 * Alcance:
 * - home del portal
 * - listado de proyectos
 * - detalle de proyecto
 * - biblioteca documental
 * - mantenimientos
 * - alertas
 * - historial de schedule
 * - filtros de búsqueda / navegación
 *
 * Decisiones:
 * - el portal cliente usa contratos propios y simplificados
 * - visibleStatus no expone estados internos complejos
 * - alertas se modelan como una vista funcional del portal
 * - mantenimientos se presentan como historial operativo completo
 * - una alerta emitida puede estar pendiente o ya realizada
 * - scheduleIndex identifica la fila real dentro de Maintenance.schedule
 * - los documentos expuestos representan solo contenido autorizado
 *
 * EN:
 * Official typed contracts for the Sierra Tech client portal.
 * =============================================================================
 */

/* -------------------------------------------------------------------------- */
/* 🧱 Estados visibles del portal                                             */
/* -------------------------------------------------------------------------- */

export type PortalProjectVisibleStatus =
	| "active"
	| "follow_up"
	| "completed"
	| "maintenance";

export type PortalMaintenanceStatus =
	| "scheduled"
	| "upcoming"
	| "overdue"
	| "completed";

export type PortalMaintenanceScheduleStatus =
	| "pending"
	| "done"
	| "overdue"
	| "cancelled";

export type PortalMaintenanceAlertStatus = "pending" | "emitted";

export type PortalMaintenanceEmailStatus =
	| "pending"
	| "sent"
	| "failed"
	| "skipped";

export type PortalAlertType =
	| "maintenance_upcoming"
	| "maintenance_overdue"
	| "maintenance_completed"
	| "document_expiring"
	| "warranty_expiring"
	| "scheduled_review"
	| "critical";

export type PortalAlertPriority = "high" | "medium" | "low";

export type PortalAlertAction =
	| "view_project"
	| "view_document"
	| "contact_support"
	| "mark_completed";

/* -------------------------------------------------------------------------- */
/* 📄 Documentos                                                              */
/* -------------------------------------------------------------------------- */

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

export type PortalDocumentSource =
	| "project_document"
	| "maintenance_attachment";

export interface PortalDocumentItem {
	documentId: string;

	title: string;
	description?: string | null;

	type: PortalDocumentType;
	source: PortalDocumentSource;

	projectId?: string | null;
	projectTitle?: string | null;

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

export interface PortalAlertAttachment {
	fileName: string;
	fileUrl: string;
	mimeType?: string | null;
}

export interface PortalMaintenanceScheduleItem {
	eventId: string;
	cycleIndex?: number | null;

	maintenanceId: string;
	maintenanceTitle: string;

	projectId?: string | null;
	projectTitle?: string | null;

	scheduleIndex: number;

	maintenanceDate: string;
	alertDate?: string | null;

	alertStatus: PortalMaintenanceAlertStatus;
	emailStatus?: PortalMaintenanceEmailStatus | null;

	emailSentAt?: string | null;
	emailError?: string | null;

	maintenanceStatus: PortalMaintenanceScheduleStatus;

	channels: string[];
	recipients: string[];
	recipientEmail?: string | null;

	emittedAt?: string | null;

	completed: boolean;
	completedAt?: string | null;
	completedByRole?: "client" | "internal" | null;

	note?: string | null;

	attachments: PortalMaintenanceAttachment[];

	canMarkCompleted: boolean;
}

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

	schedule?: PortalMaintenanceScheduleItem[];
}

/* -------------------------------------------------------------------------- */
/* 🚨 Alertas                                                                 */
/* -------------------------------------------------------------------------- */

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

	maintenanceId?: string | null;
	maintenanceTitle?: string | null;

	maintenanceEventId?: string | null;
	scheduleIndex?: number | null;

	maintenanceDate?: string | null;
	alertDate?: string | null;

	alertStatus?: PortalMaintenanceAlertStatus | null;
	emailStatus?: PortalMaintenanceEmailStatus | null;

	maintenanceStatus?: PortalMaintenanceScheduleStatus | null;

	emittedAt?: string | null;
	completedAt?: string | null;
	completedByRole?: "client" | "internal" | null;

	completed?: boolean | null;
	canMarkCompleted?: boolean;

	note?: string | null;

	attachments: PortalAlertAttachment[];

	dueDate?: string | null;
	createdAt?: string | null;

	action: PortalAlertAction;
}

/* -------------------------------------------------------------------------- */
/* 📊 Resumen ejecutivo                                                       */
/* -------------------------------------------------------------------------- */

export interface PortalAlertsSummary {
	totalProjects: number;
	totalMaintenances: number;
	totalScheduleEvents: number;

	emittedAlerts: number;
	pendingAlerts: number;

	upcomingMaintenances: number;
	overdueMaintenances: number;
	completedMaintenances: number;

	expiringDocuments: number;
	highPriorityAlerts: number;
}

/* -------------------------------------------------------------------------- */
/* 📁 Proyectos                                                               */
/* -------------------------------------------------------------------------- */

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