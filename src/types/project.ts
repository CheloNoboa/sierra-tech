/**
 * =============================================================================
 * 📄 Types: Project
 * Path: src/types/project.ts
 * =============================================================================
 *
 * ES:
 *   Definiciones de tipos centrales para el módulo Projects de Sierra Tech.
 *
 *   Objetivo:
 *   - establecer un contrato único y estricto entre:
 *     - UI (ProjectModal, DataGrid, etc.)
 *     - API administrativa / pública
 *     - persistencia en base de datos
 *   - mantener tipado fuerte y consistente
 *   - separar claramente:
 *     - contenido documental
 *     - media / assets
 *     - mantenimientos
 *     - publicación pública
 *
 *   Decisión oficial:
 *   - el modelo de mantenimientos usa `schedule` como fuente de verdad
 *   - no se usa el modelo anterior de alertas sueltas
 *
 * EN:
 *   Core type definitions for the Projects module.
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

/* -------------------------------------------------------------------------- */
/* Media                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Imagen administrable del proyecto.
 *
 * Reglas:
 * - `url` es la URL pública final
 * - `storageKey` identifica el archivo en R2 / storage
 * - `alt` se usa para accesibilidad y render público
 */
export type ProjectImage = {
	url: string;
	alt: LocalizedText;
	storageKey: string;
};

/**
 * Archivo adjunto genérico asociado al proyecto o a un mantenimiento.
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
export type ProjectDocumentLanguage = "none" | "es" | "en" | "both";

/**
 * Documento estructurado del proyecto.
 *
 * Regla:
 * - todo documento importante debe existir como entidad administrable
 * - no se mezcla metadata documental con texto libre sin estructura
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
/* Maintenance                                                                */
/* -------------------------------------------------------------------------- */

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

/**
 * Estado de la alerta previa del evento.
 */
export type MaintenanceAlertStatus = "pending" | "emitted";

/**
 * Estado real del evento de mantenimiento.
 */
export type MaintenanceExecutionStatus =
	| "pending"
	| "done"
	| "overdue"
	| "cancelled";

/**
 * =============================================================================
 * 🧠 MaintenanceScheduleEntry
 * =============================================================================
 *
 * Representa una ocurrencia concreta dentro del schedule del mantenimiento.
 *
 * Decisión:
 * - esta estructura reemplaza el modelo anterior de alerts separadas
 * - aquí vive la información operativa de cada ciclo:
 *   - fecha del mantenimiento
 *   - fecha del aviso previo
 *   - canales
 *   - destinatarios
 *   - estado de alerta
 *   - estado de ejecución
 *
 * Esto permite:
 * - render directo en UI
 * - persistencia consistente
 * - edición puntual de fechas calculadas
 * - evolución posterior del flujo sin duplicar lógica
 */
export type MaintenanceScheduleEntry = {
	eventId: string;

	/** Índice del ciclo dentro del mantenimiento */
	cycleIndex: number;

	/** Fecha planificada para el mantenimiento */
	maintenanceDate: string;

	/** Fecha del aviso previo */
	alertDate: string | null;

	alertStatus: MaintenanceAlertStatus;
	maintenanceStatus: MaintenanceExecutionStatus;

	channels: Array<"platform" | "email">;
	recipients: Array<"client" | "internal">;

	/**
	 * Correo del cliente cuando aplique.
	 * Para eventos internos puede quedar vacío.
	 */
	recipientEmail: string;

	/**
	 * Fecha en la que la alerta fue efectivamente emitida.
	 * Puede venir null en preview o antes de la ejecución real.
	 */
	emittedAt: string | null;

	/**
	 * Fecha en la que el mantenimiento se registró como realizado.
	 */
	completedAt: string | null;

	/**
	 * Marca si el cliente confirmó / ejecutó el mantenimiento.
	 */
	completedByClient: boolean;

	/**
	 * Nota operativa libre asociada al evento.
	 */
	note: string;
};

/**
 * =============================================================================
 * 🧠 ProjectMaintenanceItem
 * =============================================================================
 *
 * Unidad lógica de mantenimiento del proyecto.
 *
 * Contiene:
 * - configuración del mantenimiento
 * - frecuencia
 * - reglas de notificación
 * - archivos y documentos relacionados
 * - schedule generado / persistido
 *
 * Regla clave:
 * - `schedule` es la fuente de verdad del detalle operativo
 */
export type ProjectMaintenanceItem = {
	maintenanceType: MaintenanceType;

	title: string;
	description: string;

	frequencyValue: number | null;
	frequencyUnit: MaintenanceFrequencyUnit | null;

	/**
	 * Última fecha real de mantenimiento realizado.
	 * Solo aplica cuando el proyecto ya arrancó y existe historial.
	 */
	lastCompletedDate: string | null;

	/**
	 * Próxima fecha agregada / principal del mantenimiento.
	 * Puede derivarse del primer evento del schedule.
	 */
	nextDueDate: string | null;

	status: MaintenanceStatus;

	notifyClient: boolean;
	notifyInternal: boolean;

	/**
	 * Días previos al mantenimiento en que debe generarse el aviso.
	 */
	alertDaysBefore: number | null;

	isRecurring: boolean;

	instructions: string;

	relatedDocumentIds: string[];

	attachments: ProjectFileAttachment[];

	notes: string;

	/**
	 * Fuente de verdad para alertas, ejecución y edición de fechas.
	 */
	schedule: MaintenanceScheduleEntry[];
};

/* -------------------------------------------------------------------------- */
/* Public Site                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Configuración controlada de publicación pública del proyecto.
 *
 * Regla:
 * - el layout público no es libre
 * - solo se habilita / deshabilita qué partes del contenido salen
 */
export type ProjectPublicSiteSettings = {
	enabled: boolean;
	showTitle: boolean;
	showSummary: boolean;
	showCoverImage: boolean;
	showGallery: boolean;
};

/* -------------------------------------------------------------------------- */
/* Payload                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Payload principal compartido entre UI, API y DB.
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

	primaryClientId: string | null;
	clientDisplayName: string;
	clientEmail: string;

	coverImage: ProjectImage | null;
	gallery: ProjectImage[];

	publicSiteSettings: ProjectPublicSiteSettings;

	documents: ProjectDocumentLink[];
	maintenanceItems: ProjectMaintenanceItem[];

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
