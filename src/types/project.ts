/**
 * =============================================================================
 * 📄 Types: Project
 * Path: src/types/project.ts
 * =============================================================================
 *
 * ES:
 * Contrato central del módulo Projects para Sierra Tech.
 *
 * Objetivo:
 * - mantener un contrato único entre UI, API y persistencia
 * - representar proyectos como entidades documental-operativas
 * - soportar publicación pública controlada
 * - soportar acceso privado desde portal cliente
 * - conservar datos contractuales base para que Maintenance los consuma
 *
 * Decisiones:
 * - Projects NO administra el flujo operativo de mantenimientos
 * - Maintenance vive en su propio módulo independiente
 * - `schedule` pertenece a Maintenance, no a Projects
 * - se conservan algunos tipos legacy solo para compatibilidad temporal
 * - no se usa `any`
 * =============================================================================
 */

/* -------------------------------------------------------------------------- */
/* Base types                                                                 */
/* -------------------------------------------------------------------------- */

export type Locale = "es" | "en";

export type LocalizedText = {
	es: string;
	en: string;
};

/* -------------------------------------------------------------------------- */
/* Project core                                                               */
/* -------------------------------------------------------------------------- */

export type ProjectStatus = "draft" | "published" | "archived";

export type ProjectVisibility = "private" | "public";

export type ProjectDocumentLanguage = "none" | "es" | "en" | "both";

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Imagen administrable del proyecto.
 *
 * Reglas:
 * - `url` es la URL pública final.
 * - `storageKey` identifica el archivo en R2 / storage.
 * - `alt` se usa para accesibilidad y render público.
 */
export type ProjectImage = {
	url: string;
	alt: LocalizedText;
	storageKey: string;
};

/**
 * Archivo adjunto genérico.
 *
 * Uso:
 * - documentos del proyecto
 * - compatibilidad temporal con estructuras legacy
 */
export type ProjectFileAttachment = {
	name: string;
	url: string;
	storageKey: string;
	mimeType: string;
	size: number;
};

/* -------------------------------------------------------------------------- */
/* Documents                                                                  */
/* -------------------------------------------------------------------------- */

export type ProjectDocumentType =
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

export type ProjectDocumentVisibility = "public" | "private" | "internal";

/**
 * Documento estructurado asociado al proyecto.
 *
 * Regla:
 * - todo documento importante debe existir como entidad administrable
 * - la metadata documental no debe quedar escondida en texto libre
 * - los mantenimientos pueden consumir documentos, pero no administran aquí
 *   su flujo operativo
 */
export type ProjectDocumentLink = {
	documentId: string;

	title: string;
	documentType: ProjectDocumentType;
	description: string;

	visibility: ProjectDocumentVisibility;
	language: ProjectDocumentLanguage;

	documentDate: string | null;

	fileName: string;
	fileUrl: string;
	storageKey: string;
	mimeType: string;
	size: number | null;

	version: string;

	isPublic: boolean;
	visibleInPortal: boolean;
	visibleInPublicSite: boolean;
	visibleToInternalOnly: boolean;

	requiresAlert: boolean;
	alertDate: string | null;
	nextDueDate: string | null;
	maintenanceFrequency: string | null;

	isCritical: boolean;
	sortOrder: number;
	notes: string;
};

/* -------------------------------------------------------------------------- */
/* Public site                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Configuración controlada de publicación pública del proyecto.
 *
 * Regla:
 * - el layout público no es libre
 * - solo se habilitan/deshabilitan bloques permitidos
 */
export type ProjectPublicSiteSettings = {
	enabled: boolean;
	showTitle: boolean;
	showSummary: boolean;
	showCoverImage: boolean;
	showGallery: boolean;
};

/* -------------------------------------------------------------------------- */
/* Maintenance legacy compatibility                                           */
/* -------------------------------------------------------------------------- */

/**
 * Tipos legacy conservados solo para evitar romper imports antiguos.
 *
 * IMPORTANTE:
 * - Projects ya no debe crear, editar ni resolver schedules.
 * - El módulo Maintenance es la fuente oficial para mantenimientos.
 * - Estos tipos deben retirarse cuando los archivos antiguos sean migrados.
 */
export type MaintenanceType =
	| "preventive"
	| "corrective"
	| "cleaning"
	| "inspection"
	| "replacement"
	| "other";

export type MaintenanceFrequencyUnit = "days" | "weeks" | "months" | "years";

export type MaintenanceStatus =
	| "scheduled"
	| "completed"
	| "overdue"
	| "cancelled";

export type MaintenanceAlertStatus = "pending" | "emitted";

export type MaintenanceExecutionStatus =
	| "pending"
	| "done"
	| "overdue"
	| "cancelled";

export type MaintenanceScheduleEntry = {
	eventId: string;
	cycleIndex: number;
	maintenanceDate: string;
	alertDate: string | null;
	alertStatus: MaintenanceAlertStatus;
	maintenanceStatus: MaintenanceExecutionStatus;
	channels: Array<"platform" | "email">;
	recipients: Array<"client" | "internal">;
	recipientEmail: string;
	emittedAt: string | null;
	completedAt: string | null;
	completedByClient: boolean;
	note: string;
};

export type ProjectMaintenanceItem = {
	maintenanceType: MaintenanceType;
	title: string;
	description: string;
	frequencyValue: number | null;
	frequencyUnit: MaintenanceFrequencyUnit | null;
	lastCompletedDate: string | null;
	nextDueDate: string | null;
	status: MaintenanceStatus;
	notifyClient: boolean;
	notifyInternal: boolean;
	alertDaysBefore: number | null;
	isRecurring: boolean;
	instructions: string;
	relatedDocumentIds: string[];
	attachments: ProjectFileAttachment[];
	notes: string;
	schedule: MaintenanceScheduleEntry[];
};

/* -------------------------------------------------------------------------- */
/* Payload                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Payload principal compartido entre:
 * - formulario administrativo
 * - API administrativa
 * - modelo de persistencia
 *
 * Nota:
 * - `contractStartDate`, `contractDurationMonths` y `contractEndDate`
 *   se conservan en Projects porque Maintenance los necesita como contexto.
 */
export type ProjectPayload = {
	slug: string;

	status: ProjectStatus;
	visibility: ProjectVisibility;

	featured: boolean;
	sortOrder: number;

	title: LocalizedText;
	summary: LocalizedText;
	description: LocalizedText;

	serviceClassKey: string;
	serviceClassLabel: LocalizedText;

	primaryClientId: string | null;
	clientDisplayName: string;
	clientEmail: string;

	coverImage: ProjectImage | null;
	gallery: ProjectImage[];

	publicSiteSettings: ProjectPublicSiteSettings;

	documents: ProjectDocumentLink[];

	contractStartDate: string | null;
	contractDurationMonths: number | null;
	contractEndDate: string | null;

	technicalOverview: LocalizedText;

	systemType: LocalizedText;
	treatedMedium: LocalizedText;
	technologyUsed: {
		es: string[];
		en: string[];
	};

	operationalNotes: string;
	internalNotes: string;

	locationLabel: string;
	isPublicLocationVisible: boolean;
};

/* -------------------------------------------------------------------------- */
/* Entity / List                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Entidad persistida completa.
 */
export type ProjectEntity = ProjectPayload & {
	_id: string;
	createdAt: string;
	updatedAt: string;
};

/**
 * Shape resumido para listados / grillas.
 */
export type ProjectListItem = {
	_id: string;
	slug: string;

	status: ProjectStatus;
	visibility: ProjectVisibility;

	featured: boolean;
	sortOrder: number;

	title: LocalizedText;
	summary: LocalizedText;

	primaryClientId: string | null;
	clientDisplayName: string;

	coverImage: ProjectImage | null;

	publicSiteSettings: ProjectPublicSiteSettings;

	contractStartDate: string | null;
	contractDurationMonths: number | null;
	contractEndDate: string | null;

	createdAt: string;
	updatedAt: string;
};