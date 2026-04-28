/**
 * =============================================================================
 * 📄 Types: Maintenance
 * Path: src/types/maintenance.ts
 * =============================================================================
 *
 * ES:
 * Definiciones de tipos oficiales para el nuevo módulo Maintenance de
 * Sierra Tech.
 *
 * Propósito:
 * - separar el dominio de mantenimientos del módulo Projects
 * - establecer un contrato único y estricto entre:
 *   - UI administrativa
 *   - APIs admin
 *   - persistencia en base de datos
 *   - procesos automáticos futuros (alertas / correos / barridos)
 * - soportar generación automática y manual del schedule
 * - mantener trazabilidad operativa real por cada evento del mantenimiento
 *
 * Alcance:
 * - selección de organización y proyecto
 * - recuperación del contexto contractual del proyecto
 * - configuración base del mantenimiento
 * - schedule como fuente de verdad operativa
 * - adjuntos y documentos relacionados
 * - estados agregados del mantenimiento
 *
 * Decisiones oficiales:
 * - Maintenance es un módulo independiente de Projects
 * - un proyecto puede tener cero, uno o varios mantenimientos
 * - la tabla `schedule` es la fuente de verdad operativa
 * - `nextDueDate` y `status` del mantenimiento se derivan desde `schedule`
 * - el schedule puede ser:
 *   - automatic
 *   - manual
 * - el mantenimiento realizado puede ser marcado por:
 *   - client
 *   - internal
 * - documentos e imágenes deben usar R2 como fuente de verdad
 *
 * Reglas:
 * - no usar `any`
 * - no inventar contratos fuera de este archivo
 * - los campos de fecha deben salir como `string | null`
 * - los arrays deben mantenerse tipados y estables
 *
 * EN:
 * Official type definitions for the new Sierra Tech Maintenance module.
 * =============================================================================
 */

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

export type MaintenanceFrequencyUnit =
	| "days"
	| "weeks"
	| "months"
	| "years";

/* -------------------------------------------------------------------------- */
/* Core enums                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Modo de generación del schedule del mantenimiento.
 *
 * - automatic:
 *   el sistema genera la tabla a partir del contexto contractual y la
 *   configuración de frecuencia
 *
 * - manual:
 *   el usuario construye y administra la tabla fila por fila
 */
export type MaintenanceGenerationMode = "automatic" | "manual";

/**
 * Tipo funcional del mantenimiento.
 */
export type MaintenanceType =
	| "preventive"
	| "corrective"
	| "cleaning"
	| "inspection"
	| "replacement"
	| "other";

/**
 * Estado agregado del mantenimiento completo.
 *
 * Importante:
 * este estado se deriva desde el schedule y no debe contradecirlo.
 */
export type MaintenanceStatus =
	| "scheduled"
	| "active"
	| "completed"
	| "overdue"
	| "cancelled";

/**
 * Estado de emisión de la alerta de una fila del schedule.
 */
export type MaintenanceAlertStatus = "pending" | "emitted";

/**
 * Estado del correo asociado a una alerta del schedule.
 *
 * - pending:
 *   todavía no se intentó enviar el correo
 *
 * - sent:
 *   el correo fue enviado correctamente
 *
 * - failed:
 *   se intentó enviar, pero falló
 *
 * - skipped:
 *   no aplicaba envío de correo o no había destinatario válido
 */
export type MaintenanceEmailStatus =
	| "pending"
	| "sent"
	| "failed"
	| "skipped";

/**
 * Estado operativo real de una fila del schedule.
 */
export type MaintenanceExecutionStatus =
	| "pending"
	| "done"
	| "overdue"
	| "cancelled";

/**
 * Contexto desde el cual se marcó un mantenimiento como realizado.
 *
 * - client:
 *   el cliente confirmó / registró que realizó el mantenimiento
 *
 * - internal:
 *   Sierra Tech registró o ejecutó el mantenimiento
 */
export type MaintenanceCompletedByRole = "client" | "internal" | null;

/* -------------------------------------------------------------------------- */
/* Files and attachments                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Archivo adjunto del módulo Maintenance.
 *
 * Regla Sierra Tech:
 * - `storageKey` es la fuente de verdad en R2
 * - `url` puede existir como apoyo, compatibilidad o resolución externa
 * - la aplicación no debe asumir que `url` es siempre la verdad del archivo
 */
export type MaintenanceFileAttachment = {
	name: string;
	url: string;
	storageKey: string;
	mimeType: string;
	size: number;
};

/* -------------------------------------------------------------------------- */
/* Schedule                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * =============================================================================
 * 🧠 MaintenanceScheduleEntry
 * =============================================================================
 *
 * Representa una ocurrencia concreta dentro del schedule del mantenimiento.
 *
 * Cada fila vive como una unidad operativa real.
 *
 * Contiene:
 * - fecha del mantenimiento
 * - fecha de alerta previa
 * - estado de alerta
 * - estado de ejecución
 * - destinatarios/canales
 * - trazabilidad de emisión
 * - trazabilidad de realización
 *
 * Decisiones:
 * - esta estructura es la fuente de verdad operativa
 * - el check de realización es real, no decorativo
 * - puede ser marcado por client o internal
 * =============================================================================
 */
export type MaintenanceScheduleEntry = {
	eventId: string;

	/**
	 * Índice lógico del ciclo dentro del schedule.
	 */
	cycleIndex: number;

	/**
	 * Fecha programada del mantenimiento.
	 *
	 * Regla:
	 * se maneja como fecha calendario, no como datetime dependiente de zona
	 * horaria para evitar desfases visuales y operativos.
	 */
	maintenanceDate: string;

	/**
	 * Fecha en la que debe emitirse la alerta previa, si aplica.
	 */
	alertDate: string | null;

	alertStatus: MaintenanceAlertStatus;
	maintenanceStatus: MaintenanceExecutionStatus;

	/**
	 * Canales por los cuales el sistema podrá emitir la alerta.
	 */
	channels: Array<"platform" | "email">;

	/**
	 * Destinatarios previstos para esa alerta.
	 */
	recipients: Array<"client" | "internal">;

	/**
	 * Correo principal de destino cuando aplique.
	 */
	recipientEmail: string;

	/**
	 * Fecha real en la que la alerta fue emitida.
	 */
	emittedAt: string | null;

	/**
	 * Estado del correo asociado a esta alerta.
	 *
	 * Importante:
	 * - alertStatus controla la generación de la alerta
	 * - emailStatus controla exclusivamente el envío del correo
	 */
	emailStatus: MaintenanceEmailStatus;

	/**
	 * Fecha real en la que el correo fue enviado correctamente.
	 */
	emailSentAt: string | null;

	/**
	 * Último error registrado durante el intento de envío de correo.
	 */
	emailError: string;

	/**
	 * Fecha real en la que el mantenimiento fue marcado como realizado.
	 */
	completedAt: string | null;

	/**
	 * Marca operativa real del evento.
	 *
	 * Importante:
	 * reemplaza la idea anterior de `completedByClient`.
	 */
	completed: boolean;

	/**
	 * Rol que marcó o registró la ejecución del mantenimiento.
	 */
	completedByRole: MaintenanceCompletedByRole;

	/**
	 * Nota libre operativa de la fila.
	 */
	note: string;
};

/* -------------------------------------------------------------------------- */
/* Main payload                                                               */
/* -------------------------------------------------------------------------- */

/**
 * =============================================================================
 * 🧠 MaintenancePayload
 * =============================================================================
 *
 * Entidad principal del módulo Maintenance.
 *
 * Contiene:
 * - contexto organizacional y de proyecto
 * - snapshot contractual base recuperado desde Projects
 * - configuración del mantenimiento
 * - relaciones documentales
 * - adjuntos propios
 * - resumen derivado
 * - schedule operativo
 *
 * Reglas:
 * - `schedule` es la fuente de verdad
 * - `nextDueDate` y `status` son derivados
 * - `generationMode` controla cómo se construye y administra la tabla
 * =============================================================================
 */
export type MaintenancePayload = {
	/* ---------------------------------------------------------------------- */
	/* Context                                                                 */
	/* ---------------------------------------------------------------------- */

	organizationId: string;
	projectId: string;

	/**
	 * Datos de apoyo para la UI/listado.
	 * Pueden persistirse como snapshot simple para mejorar lectura y trazabilidad.
	 */
	organizationName: string;
	projectTitle: string;

	/* ---------------------------------------------------------------------- */
	/* Base maintenance config                                                 */
	/* ---------------------------------------------------------------------- */

	title: string;
	description: string;

	maintenanceType: MaintenanceType;
	generationMode: MaintenanceGenerationMode;

	/* ---------------------------------------------------------------------- */
	/* Project contractual snapshot                                            */
	/* ---------------------------------------------------------------------- */

	/**
	 * Inicio de contrato recuperado desde el proyecto.
	 */
	contractStartDate: string | null;

	/**
	 * Duración contractual recuperada desde el proyecto.
	 */
	contractDurationMonths: number | null;

	/**
	 * Fecha fin persistida o calculada a partir del proyecto.
	 */
	contractEndDate: string | null;

	/* ---------------------------------------------------------------------- */
	/* Automatic generation config                                             */
	/* ---------------------------------------------------------------------- */

	/**
	 * Solo aplica de forma obligatoria en modo automatic.
	 * En modo manual puede quedar null.
	 */
	frequencyValue: number | null;
	frequencyUnit: MaintenanceFrequencyUnit | null;

	/**
	 * Días previos en los que debe activarse la alerta.
	 */
	alertDaysBefore: number | null;

	/**
	 * Define si la secuencia continúa generándose de forma repetitiva.
	 */
	isRecurring: boolean;

	notifyClient: boolean;
	notifyInternal: boolean;

	/* ---------------------------------------------------------------------- */
	/* Supporting content                                                      */
	/* ---------------------------------------------------------------------- */

	instructions: string;
	notes: string;

	/**
	 * IDs de documentos relacionados del proyecto.
	 */
	relatedDocumentIds: string[];

	/**
	 * Archivos propios del maintenance.
	 */
	attachments: MaintenanceFileAttachment[];

	/* ---------------------------------------------------------------------- */
	/* Derived summary                                                         */
	/* ---------------------------------------------------------------------- */

	/**
	 * Próxima fecha relevante operativa derivada desde schedule.
	 */
	nextDueDate: string | null;

	/**
	 * Estado agregado del mantenimiento derivado desde schedule.
	 */
	status: MaintenanceStatus;

	/* ---------------------------------------------------------------------- */
	/* Source of truth                                                         */
	/* ---------------------------------------------------------------------- */

	schedule: MaintenanceScheduleEntry[];
};

/* -------------------------------------------------------------------------- */
/* Entity                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Entidad persistida del módulo Maintenance.
 */
export type MaintenanceEntity = MaintenancePayload & {
	_id: string;
	createdAt: string;
	updatedAt: string;
};

/* -------------------------------------------------------------------------- */
/* List items                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Shape resumido para listados y grillas administrativas.
 */
export type MaintenanceListItem = {
	_id: string;

	organizationId: string;
	projectId: string;

	organizationName: string;
	projectTitle: string;

	title: string;
	maintenanceType: MaintenanceType;
	generationMode: MaintenanceGenerationMode;

	nextDueDate: string | null;
	status: MaintenanceStatus;

	totalEvents: number;
	completedEvents: number;
	overdueEvents: number;
	pendingEvents: number;

	createdAt: string;
	updatedAt: string;
};

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Filtros oficiales para listados administrativos del módulo Maintenance.
 */
export type MaintenanceFilters = {
	q?: string;
	organizationId?: string | "all";
	projectId?: string | "all";
	status?: MaintenanceStatus | "all";
	maintenanceType?: MaintenanceType | "all";
	generationMode?: MaintenanceGenerationMode | "all";
};

/* -------------------------------------------------------------------------- */
/* UI / summary                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Resumen cuantitativo útil para dashboard/listado del módulo.
 */
export type MaintenanceSummary = {
	totalMaintenances: number;
	activeMaintenances: number;
	overdueMaintenances: number;
	completedMaintenances: number;
	upcomingEvents: number;
};

/* -------------------------------------------------------------------------- */
/* Project context bootstrap                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Contexto mínimo recuperado desde Projects para iniciar la creación o edición
 * de un maintenance.
 *
 * Propósito:
 * - seleccionar organización/proyecto
 * - traer base contractual
 * - habilitar generación automática del schedule
 */
export type MaintenanceProjectContext = {
	organizationId: string;
	organizationName: string;

	projectId: string;
	projectTitle: string;

	contractStartDate: string | null;
	contractDurationMonths: number | null;
	contractEndDate: string | null;

	/**
	 * IDs de documentos potencialmente vinculables al maintenance.
	 */
	availableDocumentIds: string[];
};

/* -------------------------------------------------------------------------- */
/* Write contracts                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Payload de escritura para crear o actualizar un maintenance.
 *
 * Por ahora coincide con el payload principal.
 * Se deja como alias explícito para permitir evolución futura sin romper la API.
 */
export type MaintenanceWritePayload = MaintenancePayload;

/* -------------------------------------------------------------------------- */
/* Action helpers                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Acción de actualización puntual sobre una fila del schedule.
 *
 * Se deja tipada desde ahora para:
 * - UI admin
 * - APIs futuras de edición granular
 * - procesos automáticos
 */
export type MaintenanceScheduleRowUpdate =
	| {
		action: "set_maintenance_date";
		eventId: string;
		maintenanceDate: string;
	}
	| {
		action: "set_alert_emitted";
		eventId: string;
		emitted: boolean;
	}
	| {
		action: "set_completed";
		eventId: string;
		completed: boolean;
		completedByRole: Exclude<MaintenanceCompletedByRole, null>;
	}
	| {
		action: "set_status";
		eventId: string;
		maintenanceStatus: MaintenanceExecutionStatus;
	}
	| {
		action: "set_note";
		eventId: string;
		note: string;
	}
	| {
		action: "set_email_status";
		eventId: string;
		emailStatus: MaintenanceEmailStatus;
		emailSentAt: string | null;
		emailError: string;
	};