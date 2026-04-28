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
 * - centralizar la configuración del demonio de mantenimientos
 * - controlar cuándo debe ejecutarse el scheduler
 * - controlar el envío de correos de alertas
 * - permitir administración desde el panel admin
 *
 * Alcance:
 * - activación/desactivación del scheduler
 * - modo de ejecución tipo alarma/programador
 * - ejecución por intervalo, diaria o semanal
 * - zona horaria de interpretación
 * - ejecución manual controlada
 * - configuración de correo saliente
 * - destinatarios internos por defecto
 * - auditoría básica de la última ejecución
 *
 * Reglas:
 * - no contiene lógica del job
 * - no contiene credenciales sensibles directamente
 * - las credenciales reales viven en variables de entorno
 * - los horarios se guardan como HH:mm
 * - los días se guardan como claves estables
 * =============================================================================
 */

export type MaintenanceEmailProvider = "resend" | "smtp" | "disabled";

export type MaintenanceSchedulerMode = "interval" | "daily" | "weekly";

export type MaintenanceSchedulerIntervalUnit = "minutes" | "hours";

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
};

export type MaintenanceSettingsEntity = MaintenanceSettingsPayload & {
	_id: string;
	createdAt: string;
	updatedAt: string;
};