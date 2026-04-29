/**
 * =============================================================================
 * 📄 Types: Maintenance Settings
 * Path: src/types/maintenanceSettings.ts
 * =============================================================================
 *
 * ES:
 * Contrato oficial de configuración operativa para el módulo Maintenance.
 *
 * Propósito:
 * - centralizar la configuración del scheduler de mantenimientos
 * - controlar si el job automático está activo
 * - limitar la frecuencia operativa a modos reales y sostenibles
 * - permitir ejecución manual controlada desde el panel admin
 * - controlar el envío de correos de alertas mediante SMTP/Nodemailer
 *
 * Alcance:
 * - activación/desactivación del scheduler
 * - ejecución diaria o semanal
 * - zona horaria de interpretación
 * - ejecución manual controlada
 * - configuración de correo saliente
 * - destinatarios internos por defecto
 * - auditoría básica de la última ejecución
 *
 * Decisiones:
 * - no se soporta ejecución por intervalos en esta versión
 * - no se soporta proveedor Resend
 * - SMTP es el único proveedor de correo habilitable
 * - disabled permite apagar el envío de correos sin afectar el scheduler
 *
 * Reglas:
 * - no contiene lógica del job
 * - no contiene credenciales sensibles directamente
 * - las credenciales reales viven en variables de entorno
 * - los horarios se guardan como HH:mm
 * - los días se guardan como claves estables
 * =============================================================================
 */

export type MaintenanceEmailProvider = "smtp" | "disabled";

export type MaintenanceSchedulerMode = "daily" | "weekly";

export type MaintenanceSchedulerWeekday =
	| "mon"
	| "tue"
	| "wed"
	| "thu"
	| "fri"
	| "sat"
	| "sun";

export type MaintenanceLastRunStatus = "success" | "failed" | "never";

export type MaintenanceSettingsPayload = {
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
};

export type MaintenanceSettingsEntity = MaintenanceSettingsPayload & {
	_id: string;
	createdAt: string;
	updatedAt: string;
};