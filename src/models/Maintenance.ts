/**
 * =============================================================================
 * 📄 Model: Maintenance
 * Path: src/models/Maintenance.ts
 * =============================================================================
 *
 * ES:
 * Modelo oficial del módulo Maintenance para Sierra Tech.
 *
 * Propósito:
 * - persistir mantenimientos como entidad independiente de Projects
 * - soportar uno o varios mantenimientos por proyecto
 * - permitir modo de generación automática o manual
 * - usar schedule como fuente de verdad operativa
 * - mantener una base robusta para:
 *   - alertas
 *   - correos
 *   - barridos automáticos
 *   - seguimiento de ejecución
 *
 * Alcance:
 * - identidad organizacional y del proyecto
 * - configuración base del mantenimiento
 * - schedule persistido
 * - adjuntos de mantenimiento
 * - estado derivado del maintenance
 *
 * Decisiones:
 * - este modelo NO vuelve a duplicar la lógica del motor
 * - nextDueDate y status se persisten como snapshot derivado útil
 * - schedule sigue siendo la fuente de verdad real
 * - la tabla puede venir de generación automática o manual
 * - completed reemplaza el criterio anterior completedByClient
 * - completedByRole identifica quién marcó la ejecución:
 *   - client
 *   - internal
 *
 * Reglas:
 * - sin any
 * - sin campos ambiguos
 * - sin estructuras abiertas
 * - colección con nombre capitalizado siguiendo convención Sierra Tech
 *
 * EN:
 * Official Maintenance model for Sierra Tech.
 * =============================================================================
 */

import mongoose, { Model, Schema, Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* Reusable enums                                                             */
/* -------------------------------------------------------------------------- */

const MAINTENANCE_TYPE_VALUES = [
	"preventive",
	"corrective",
	"cleaning",
	"inspection",
	"replacement",
	"other",
] as const;

const MAINTENANCE_GENERATION_MODE_VALUES = [
	"automatic",
	"manual",
] as const;

const MAINTENANCE_STATUS_VALUES = [
	"scheduled",
	"active",
	"completed",
	"overdue",
	"cancelled",
] as const;

const MAINTENANCE_FREQUENCY_UNIT_VALUES = [
	"days",
	"weeks",
	"months",
	"years",
] as const;

const MAINTENANCE_ALERT_STATUS_VALUES = [
	"pending",
	"emitted",
] as const;

const MAINTENANCE_EXECUTION_STATUS_VALUES = [
	"pending",
	"done",
	"overdue",
	"cancelled",
] as const;

const MAINTENANCE_CHANNEL_VALUES = [
	"platform",
	"email",
] as const;

const MAINTENANCE_RECIPIENT_VALUES = [
	"client",
	"internal",
] as const;

const MAINTENANCE_COMPLETED_BY_ROLE_VALUES = [
	"client",
	"internal",
] as const;

/* -------------------------------------------------------------------------- */
/* Subschemas                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Archivo adjunto del mantenimiento.
 *
 * Regla:
 * - storageKey es la referencia principal en R2
 * - url puede persistirse vacía o como compatibilidad
 * ---------------------------------------------------------------------------
 */
const MaintenanceFileAttachmentSchema = new Schema(
	{
		name: {
			type: String,
			trim: true,
			default: "",
		},
		url: {
			type: String,
			trim: true,
			default: "",
		},
		storageKey: {
			type: String,
			trim: true,
			default: "",
		},
		mimeType: {
			type: String,
			trim: true,
			default: "",
		},
		size: {
			type: Number,
			default: 0,
			min: 0,
		},
	},
	{ _id: false },
);

/**
 * ---------------------------------------------------------------------------
 * Fila del schedule.
 *
 * Regla clave:
 * - esta estructura es la fuente de verdad operativa
 * ---------------------------------------------------------------------------
 */
const MaintenanceScheduleEntrySchema = new Schema(
	{
		eventId: {
			type: String,
			required: true,
			trim: true,
		},
		cycleIndex: {
			type: Number,
			required: true,
			min: 0,
		},
		maintenanceDate: {
			type: String,
			required: true,
			trim: true,
		},
		alertDate: {
			type: String,
			default: null,
			trim: true,
		},
		alertStatus: {
			type: String,
			enum: MAINTENANCE_ALERT_STATUS_VALUES,
			default: "pending",
		},
		maintenanceStatus: {
			type: String,
			enum: MAINTENANCE_EXECUTION_STATUS_VALUES,
			default: "pending",
		},
		channels: {
			type: [
				{
					type: String,
					enum: MAINTENANCE_CHANNEL_VALUES,
				},
			],
			default: [],
		},
		recipients: {
			type: [
				{
					type: String,
					enum: MAINTENANCE_RECIPIENT_VALUES,
				},
			],
			default: [],
		},
		recipientEmail: {
			type: String,
			trim: true,
			default: "",
		},
		emittedAt: {
			type: String,
			default: null,
			trim: true,
		},
		completedAt: {
			type: String,
			default: null,
			trim: true,
		},
		completed: {
			type: Boolean,
			default: false,
		},
		completedByRole: {
			type: String,
			enum: [...MAINTENANCE_COMPLETED_BY_ROLE_VALUES, null],
			default: null,
		},
		note: {
			type: String,
			trim: true,
			default: "",
		},
	},
	{ _id: false },
);

/* -------------------------------------------------------------------------- */
/* Main schema                                                                */
/* -------------------------------------------------------------------------- */

const MaintenanceSchema = new Schema(
	{
		/**
		 * ---------------------------------------------------------------------
		 * Identidad relacional
		 * ---------------------------------------------------------------------
		 */
		organizationId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "Organization",
			index: true,
		},
		projectId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: "Project",
			index: true,
		},

		/**
		 * Snapshot útil para lectura rápida y desacople visual.
		 * Se permite persistirlo para no depender del populate.
		 */
		organizationName: {
			type: String,
			trim: true,
			default: "",
		},
		projectTitle: {
			type: String,
			trim: true,
			default: "",
		},

		/**
		 * ---------------------------------------------------------------------
		 * Identidad del maintenance
		 * ---------------------------------------------------------------------
		 */
		title: {
			type: String,
			trim: true,
			required: true,
			default: "",
		},
		description: {
			type: String,
			trim: true,
			default: "",
		},
		maintenanceType: {
			type: String,
			enum: MAINTENANCE_TYPE_VALUES,
			default: "preventive",
			index: true,
		},
		generationMode: {
			type: String,
			enum: MAINTENANCE_GENERATION_MODE_VALUES,
			default: "automatic",
			index: true,
		},

		/**
		 * ---------------------------------------------------------------------
		 * Contexto contractual base
		 * ---------------------------------------------------------------------
		 */
		contractStartDate: {
			type: String,
			default: null,
			trim: true,
		},
		contractDurationMonths: {
			type: Number,
			default: null,
			min: 0,
		},
		contractEndDate: {
			type: String,
			default: null,
			trim: true,
		},

		/**
		 * ---------------------------------------------------------------------
		 * Configuración de frecuencia / alertas
		 * ---------------------------------------------------------------------
		 */
		frequencyValue: {
			type: Number,
			default: null,
			min: 0,
		},
		frequencyUnit: {
			type: String,
			enum: [...MAINTENANCE_FREQUENCY_UNIT_VALUES, null],
			default: null,
		},
		alertDaysBefore: {
			type: Number,
			default: 15,
			min: 0,
		},
		isRecurring: {
			type: Boolean,
			default: true,
		},
		notifyClient: {
			type: Boolean,
			default: true,
		},
		notifyInternal: {
			type: Boolean,
			default: true,
		},

		/**
		 * ---------------------------------------------------------------------
		 * Contenido operativo adicional
		 * ---------------------------------------------------------------------
		 */
		instructions: {
			type: String,
			trim: true,
			default: "",
		},
		notes: {
			type: String,
			trim: true,
			default: "",
		},

		/**
		 * Documentos del módulo Projects asociados a este maintenance.
		 */
		relatedDocumentIds: {
			type: [String],
			default: [],
		},

		/**
		 * Adjuntos propios del maintenance.
		 */
		attachments: {
			type: [MaintenanceFileAttachmentSchema],
			default: [],
		},

		/**
		 * ---------------------------------------------------------------------
		 * Snapshot derivado del maintenance
		 * ---------------------------------------------------------------------
		 *
		 * Regla:
		 * - se deriva desde schedule
		 * - se persiste para lectura rápida
		 * - schedule sigue siendo la fuente de verdad
		 */
		nextDueDate: {
			type: String,
			default: null,
			trim: true,
			index: true,
		},
		status: {
			type: String,
			enum: MAINTENANCE_STATUS_VALUES,
			default: "scheduled",
			index: true,
		},

		/**
		 * ---------------------------------------------------------------------
		 * Fuente de verdad operativa
		 * ---------------------------------------------------------------------
		 */
		schedule: {
			type: [MaintenanceScheduleEntrySchema],
			default: [],
		},
	},
	{
		collection: "Maintenance",
		timestamps: true,
	},
);

/* -------------------------------------------------------------------------- */
/* Indexes                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Búsqueda principal por organización y proyecto.
 */
MaintenanceSchema.index({ organizationId: 1, projectId: 1 });

/**
 * Útil para listados operativos por estado.
 */
MaintenanceSchema.index({ organizationId: 1, status: 1, nextDueDate: 1 });

/**
 * Útil para filtros de tipo + modo.
 */
MaintenanceSchema.index({
	organizationId: 1,
	maintenanceType: 1,
	generationMode: 1,
});

/**
 * Útil para vistas operativas por proyecto.
 */
MaintenanceSchema.index({ projectId: 1, status: 1, updatedAt: -1 });

/* -------------------------------------------------------------------------- */
/* Typed document contracts                                                   */
/* -------------------------------------------------------------------------- */

export interface MaintenanceScheduleEntryDocument {
	eventId: string;
	cycleIndex: number;
	maintenanceDate: string;
	alertDate: string | null;
	alertStatus: "pending" | "emitted";
	maintenanceStatus: "pending" | "done" | "overdue" | "cancelled";
	channels: Array<"platform" | "email">;
	recipients: Array<"client" | "internal">;
	recipientEmail: string;
	emittedAt: string | null;
	completedAt: string | null;
	completed: boolean;
	completedByRole: "client" | "internal" | null;
	note: string;
}

export interface MaintenanceFileAttachmentDocument {
	name: string;
	url: string;
	storageKey: string;
	mimeType: string;
	size: number;
}

export interface MaintenanceDocument extends mongoose.Document {
	organizationId: Types.ObjectId;
	projectId: Types.ObjectId;

	organizationName: string;
	projectTitle: string;

	title: string;
	description: string;

	maintenanceType:
	| "preventive"
	| "corrective"
	| "cleaning"
	| "inspection"
	| "replacement"
	| "other";

	generationMode: "automatic" | "manual";

	contractStartDate: string | null;
	contractDurationMonths: number | null;
	contractEndDate: string | null;

	frequencyValue: number | null;
	frequencyUnit: "days" | "weeks" | "months" | "years" | null;

	alertDaysBefore: number | null;
	isRecurring: boolean;
	notifyClient: boolean;
	notifyInternal: boolean;

	instructions: string;
	notes: string;

	relatedDocumentIds: string[];
	attachments: MaintenanceFileAttachmentDocument[];

	nextDueDate: string | null;
	status: "scheduled" | "active" | "completed" | "overdue" | "cancelled";

	schedule: MaintenanceScheduleEntryDocument[];

	createdAt: Date;
	updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Model export                                                               */
/* -------------------------------------------------------------------------- */

const Maintenance: Model<MaintenanceDocument> =
	(mongoose.models.Maintenance as Model<MaintenanceDocument>) ||
	mongoose.model<MaintenanceDocument>("Maintenance", MaintenanceSchema);

export default Maintenance;