/**
 * =============================================================================
 * 📄 Model: Maintenance Settings
 * Path: src/models/MaintenanceSettings.ts
 * =============================================================================
 *
 * ES:
 * Modelo oficial de configuración operativa del scheduler de Maintenance.
 *
 * Propósito:
 * - persistir la configuración editable desde el admin
 * - controlar la ejecución lógica del demonio de mantenimientos
 * - soportar programación tipo alarma:
 *   - intervalo
 *   - diaria
 *   - semanal
 * - configurar envío de correos sin guardar credenciales sensibles
 * - guardar auditoría básica de la última ejecución
 *
 * Reglas:
 * - no guarda claves API ni passwords
 * - las credenciales reales viven en variables de entorno
 * - se usa una sola entidad global
 * - weeklyRunDays usa claves estables: mon/tue/wed/thu/fri/sat/sun
 * - sin any
 * =============================================================================
 */

import mongoose, { Model, Schema, Types } from "mongoose";

import type {
	MaintenanceEmailProvider,
	MaintenanceLastRunStatus,
	MaintenanceSchedulerIntervalUnit,
	MaintenanceSchedulerMode,
	MaintenanceSchedulerWeekday,
} from "@/types/maintenanceSettings";

/* -------------------------------------------------------------------------- */
/* Enum values                                                                */
/* -------------------------------------------------------------------------- */

const SCHEDULER_MODE_VALUES: MaintenanceSchedulerMode[] = [
	"interval",
	"daily",
	"weekly",
];

const INTERVAL_UNIT_VALUES: MaintenanceSchedulerIntervalUnit[] = [
	"minutes",
	"hours",
];

const WEEKDAY_VALUES: MaintenanceSchedulerWeekday[] = [
	"mon",
	"tue",
	"wed",
	"thu",
	"fri",
	"sat",
	"sun",
];

const EMAIL_PROVIDER_VALUES: MaintenanceEmailProvider[] = [
	"resend",
	"smtp",
	"disabled",
];

const LAST_RUN_STATUS_VALUES: MaintenanceLastRunStatus[] = [
	"success",
	"failed",
	"never",
];

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

const MaintenanceSettingsSchema = new Schema(
	{
		/* ------------------------------------------------------------------ */
		/* Scheduler core                                                     */
		/* ------------------------------------------------------------------ */

		singletonKey: {
			type: String,
			default: "maintenance-settings",
			unique: true,
			immutable: true,
			index: true,
		},

		schedulerEnabled: {
			type: Boolean,
			default: true,
		},

		schedulerMode: {
			type: String,
			enum: SCHEDULER_MODE_VALUES,
			default: "interval",
		},

		/**
		 * Interval mode:
		 * - ejecuta cada X minutos u horas
		 */
		intervalValue: {
			type: Number,
			default: 1,
			min: 1,
		},

		intervalUnit: {
			type: String,
			enum: INTERVAL_UNIT_VALUES,
			default: "hours",
		},

		/**
		 * Hora base para modo interval.
		 *
		 * Ejemplo:
		 * - 00:00 con cada 1 hora permite 00:00, 01:00, 02:00...
		 */
		intervalStartTime: {
			type: String,
			trim: true,
			default: "00:00",
		},

		/**
		 * Daily mode:
		 * - hora exacta del día en formato HH:mm
		 */
		dailyRunTime: {
			type: String,
			trim: true,
			default: "08:00",
		},

		/**
		 * Weekly mode:
		 * - días seleccionados usando claves estables
		 * - no usar números para evitar ambigüedad entre calendarios
		 */
		weeklyRunDays: {
			type: [
				{
					type: String,
					enum: WEEKDAY_VALUES,
				},
			],
			default: ["mon", "tue", "wed", "thu", "fri"],
		},

		/**
		 * Weekly mode:
		 * - hora exacta para los días seleccionados
		 */
		weeklyRunTime: {
			type: String,
			trim: true,
			default: "08:00",
		},

		/**
		 * Zona horaria usada para interpretar días y horas.
		 */
		timezone: {
			type: String,
			trim: true,
			default: "America/Guayaquil",
		},

		/**
		 * Permite o bloquea ejecución manual desde UI.
		 */
		manualRunEnabled: {
			type: Boolean,
			default: false,
		},

		/* ------------------------------------------------------------------ */
		/* Email                                                              */
		/* ------------------------------------------------------------------ */

		emailEnabled: {
			type: Boolean,
			default: false,
		},

		emailProvider: {
			type: String,
			enum: EMAIL_PROVIDER_VALUES,
			default: "disabled",
		},

		fromName: {
			type: String,
			trim: true,
			default: "Sierra Tech",
		},

		fromEmail: {
			type: String,
			trim: true,
			default: "",
		},

		replyToEmail: {
			type: String,
			trim: true,
			default: "",
		},

		internalRecipients: {
			type: [String],
			default: [],
		},

		/* ------------------------------------------------------------------ */
		/* Execution audit                                                    */
		/* ------------------------------------------------------------------ */

		lastRunAt: {
			type: String,
			default: null,
		},

		lastRunStatus: {
			type: String,
			enum: LAST_RUN_STATUS_VALUES,
			default: "never",
		},

		lastRunMessage: {
			type: String,
			trim: true,
			default: "",
		},

		lastRunDurationMs: {
			type: Number,
			default: null,
		},

		lastRunProcessed: {
			type: Number,
			default: 0,
			min: 0,
		},

		lastRunAlertsGenerated: {
			type: Number,
			default: 0,
			min: 0,
		},

		lastRunEmailsSent: {
			type: Number,
			default: 0,
			min: 0,
		},

		lastRunEmailsFailed: {
			type: Number,
			default: 0,
			min: 0,
		},
	},
	{
		collection: "MaintenanceSettings",
		timestamps: true,
	},
);

/* -------------------------------------------------------------------------- */
/* Interface                                                                  */
/* -------------------------------------------------------------------------- */

export interface MaintenanceSettingsDocument extends mongoose.Document {
	_id: Types.ObjectId;
	singletonKey: string;

	schedulerEnabled: boolean;
	schedulerMode: MaintenanceSchedulerMode;

	intervalValue: number;
	intervalUnit: MaintenanceSchedulerIntervalUnit;
	intervalStartTime: string;

	dailyRunTime: string;

	weeklyRunDays: MaintenanceSchedulerWeekday[];
	weeklyRunTime: string;

	timezone: string;
	manualRunEnabled: boolean;

	emailEnabled: boolean;
	emailProvider: MaintenanceEmailProvider;

	fromName: string;
	fromEmail: string;
	replyToEmail: string;

	internalRecipients: string[];

	lastRunAt: string | null;
	lastRunStatus: MaintenanceLastRunStatus;
	lastRunMessage: string;

	lastRunDurationMs: number | null;
	lastRunProcessed: number;
	lastRunAlertsGenerated: number;
	lastRunEmailsSent: number;
	lastRunEmailsFailed: number;

	createdAt: Date;
	updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Model                                                                      */
/* -------------------------------------------------------------------------- */

const MaintenanceSettings: Model<MaintenanceSettingsDocument> =
	(mongoose.models.MaintenanceSettings as Model<MaintenanceSettingsDocument>) ||
	mongoose.model<MaintenanceSettingsDocument>(
		"MaintenanceSettings",
		MaintenanceSettingsSchema,
	);

export default MaintenanceSettings;