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
 * - controlar la ejecución lógica del scheduler de mantenimientos
 * - soportar programación simple y realista:
 *   - diaria
 *   - semanal
 * - configurar envío de correos sin guardar credenciales sensibles
 * - guardar auditoría básica de la última ejecución
 *
 * Decisiones:
 * - no se soporta ejecución por intervalos en esta versión
 * - no se soporta proveedor Resend
 * - SMTP es el único proveedor de correo habilitable
 * - disabled permite apagar correos sin apagar el scheduler
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
	MaintenanceSchedulerMode,
	MaintenanceSchedulerWeekday,
} from "@/types/maintenanceSettings";

/* -------------------------------------------------------------------------- */
/* Enum values                                                                */
/* -------------------------------------------------------------------------- */

const SCHEDULER_MODE_VALUES: MaintenanceSchedulerMode[] = ["daily", "weekly"];

const WEEKDAY_VALUES: MaintenanceSchedulerWeekday[] = [
	"mon",
	"tue",
	"wed",
	"thu",
	"fri",
	"sat",
	"sun",
];

const EMAIL_PROVIDER_VALUES: MaintenanceEmailProvider[] = ["smtp", "disabled"];

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
			default: "daily",
		},

		dailyRunTime: {
			type: String,
			trim: true,
			default: "08:00",
		},

		weeklyRunDays: {
			type: [
				{
					type: String,
					enum: WEEKDAY_VALUES,
				},
			],
			default: ["mon"],
		},

		weeklyRunTime: {
			type: String,
			trim: true,
			default: "08:00",
		},

		timezone: {
			type: String,
			trim: true,
			default: "America/Guayaquil",
		},

		manualRunEnabled: {
			type: Boolean,
			default: true,
		},

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

		lastRunSource: {
			type: String,
			enum: ["cron", "manual", "unknown"],
			default: "unknown",
		},

		lastRunStartedAt: {
			type: String,
			default: null,
		},

		lastRunFinishedAt: {
			type: String,
			default: null,
		},

		lastRunUpdated: {
			type: Number,
			default: 0,
			min: 0,
		},

		lastRunEmailsSkipped: {
			type: Number,
			default: 0,
			min: 0,
		},

		lastRunRowsMarkedOverdue: {
			type: Number,
			default: 0,
			min: 0,
		},

		lastRunError: {
			type: String,
			trim: true,
			default: "",
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

	lastRunSource: "cron" | "manual" | "unknown";
	lastRunStartedAt: string | null;
	lastRunFinishedAt: string | null;
	lastRunUpdated: number;
	lastRunEmailsSkipped: number;
	lastRunRowsMarkedOverdue: number;
	lastRunError: string;

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