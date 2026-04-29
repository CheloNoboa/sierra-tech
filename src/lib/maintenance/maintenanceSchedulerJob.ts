/**
 * =============================================================================
 * 🤖 Job: Maintenance Scheduler
 * Path: src/lib/maintenance/maintenanceSchedulerJob.ts
 * =============================================================================
 *
 * ES:
 * Job backend para procesar automáticamente el schedule del módulo Maintenance.
 *
 * Propósito:
 * - leer la configuración operativa de MaintenanceSettings
 * - decidir si corresponde ejecutar según modo daily/weekly
 * - detectar alertas pendientes por generar
 * - registrar generación de alertas del sistema
 * - procesar estado de correo asociado a la alerta
 * - marcar ejecuciones vencidas como overdue
 * - mantener nextDueDate y status derivados desde schedule
 * - registrar auditoría de ejecución del demonio
 *
 * Reglas:
 * - schedule es la fuente de verdad
 * - MaintenanceSettings controla si el job procesa o no
 * - una fila done/cancelled no se modifica automáticamente
 * - una alerta emitted no se vuelve a generar
 * - emailStatus registra el resultado real del correo
 * - el job es idempotente
 * - Projects no se modifica desde este job
 * - no se usa any
 * =============================================================================
 */

import { connectToDB } from "@/lib/connectToDB";
import Maintenance, {
	type MaintenanceDocument,
	type MaintenanceScheduleEntryDocument,
} from "@/models/Maintenance";
import MaintenanceSettings, {
	type MaintenanceSettingsDocument,
} from "@/models/MaintenanceSettings";
import { sendTransactionalEmail } from "@/lib/email/sendTransactionalEmail";
import Organization from "@/models/Organization";
import OrganizationUser from "@/models/OrganizationUser";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type MaintenanceStatus =
	| "scheduled"
	| "active"
	| "completed"
	| "overdue"
	| "cancelled";

type SchedulerRunMode = "automatic" | "manual";

type SchedulerRunOptions = {
	now?: Date;
	limit?: number;
	mode?: SchedulerRunMode;
	force?: boolean;
};

type SchedulerRunResult = {
	ok: true;
	source: "cron" | "manual";
	startedAt: string;
	finishedAt: string;
	durationMs: number;
	processed: number;
	updated: number;
	alertsGenerated: number;
	emailsSent: number;
	emailsFailed: number;
	emailsSkipped: number;
	rowsMarkedOverdue: number;
};

type ProcessMaintenanceResult = {
	changed: boolean;
	alertsGenerated: number;
	emailsSent: number;
	emailsFailed: number;
	emailsSkipped: number;
	rowsMarkedOverdue: number;
};

type EmailDispatchResult =
	| {
		status: "sent";
		sentAt: string;
		error: "";
	}
	| {
		status: "failed";
		sentAt: null;
		error: string;
	}
	| {
		status: "skipped";
		sentAt: null;
		error: "";
	};

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

function toDateOnly(value: Date): string {
	return [
		value.getFullYear(),
		String(value.getMonth() + 1).padStart(2, "0"),
		String(value.getDate()).padStart(2, "0"),
	].join("-");
}

function normalizeDateOnly(value: string | null): string | null {
	if (!value) return null;

	const trimmed = value.trim();
	if (!trimmed) return null;

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

	const date = new Date(trimmed);
	if (Number.isNaN(date.getTime())) return null;

	return toDateOnly(date);
}

function isSameOrBeforeDateOnly(
	value: string | null,
	reference: string,
): boolean {
	const normalized = normalizeDateOnly(value);
	if (!normalized) return false;

	return normalized <= reference;
}

function isBeforeDateOnly(value: string | null, reference: string): boolean {
	const normalized = normalizeDateOnly(value);
	if (!normalized) return false;

	return normalized < reference;
}

/* -------------------------------------------------------------------------- */
/* Scheduler config helpers                                                   */
/* -------------------------------------------------------------------------- */

function getLocalParts(now: Date, timezone: string): {
	date: string;
	weekday: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
	time: string;
	minutesFromMidnight: number;
} {
	const safeTimezone = timezone || "UTC";

	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: safeTimezone,
		weekday: "short",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	});

	const parts = formatter.formatToParts(now);

	const weekdayText =
		parts.find((part) => part.type === "weekday")?.value.toLowerCase() ?? "";

	const yearText = parts.find((part) => part.type === "year")?.value ?? "1970";
	const monthText = parts.find((part) => part.type === "month")?.value ?? "01";
	const dayText = parts.find((part) => part.type === "day")?.value ?? "01";

	const hourText = parts.find((part) => part.type === "hour")?.value ?? "00";
	const minuteText = parts.find((part) => part.type === "minute")?.value ?? "00";

	const weekdayMap: Record<
		string,
		"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
	> = {
		sun: "sun",
		mon: "mon",
		tue: "tue",
		wed: "wed",
		thu: "thu",
		fri: "fri",
		sat: "sat",
	};

	const hour = Number(hourText);
	const minute = Number(minuteText);

	const safeHour = Number.isInteger(hour) ? hour : 0;
	const safeMinute = Number.isInteger(minute) ? minute : 0;

	return {
		date: `${yearText}-${monthText}-${dayText}`,
		weekday: weekdayMap[weekdayText.slice(0, 3)] ?? "mon",
		time: `${String(safeHour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`,
		minutesFromMidnight: safeHour * 60 + safeMinute,
	};
}

function shouldRunScheduler(
	settings: MaintenanceSettingsDocument,
	now: Date,
	mode: SchedulerRunMode,
	force: boolean,
): boolean {
	if (force) return true;

	if (!settings.schedulerEnabled) return false;

	if (mode === "manual") {
		return Boolean(settings.manualRunEnabled);
	}

	const local = getLocalParts(now, settings.timezone);

	if (settings.schedulerMode === "weekly") {
		return (
			settings.weeklyRunDays.includes(local.weekday) &&
			local.time === settings.weeklyRunTime
		);
	}

	return local.time === settings.dailyRunTime;
}

async function getOrCreateSettings(): Promise<MaintenanceSettingsDocument> {
	const settings = await MaintenanceSettings.findOneAndUpdate(
		{ singletonKey: "maintenance-settings" },
		{
			$setOnInsert: {
				singletonKey: "maintenance-settings",
			},
		},
		{
			new: true,
			upsert: true,
			runValidators: true,
		},
	);

	return settings;
}

async function writeSchedulerAudit(
	settings: MaintenanceSettingsDocument,
	params: {
		source: "cron" | "manual";
		startedAt: string;
		finishedAt: string;
		status: "success" | "failed";
		message: string;
		durationMs: number | null;
		processed: number;
		updated: number;
		alertsGenerated: number;
		emailsSent: number;
		emailsFailed: number;
		emailsSkipped: number;
		rowsMarkedOverdue: number;
		error: string;
	},
): Promise<void> {
	settings.set({
		lastRunAt: params.finishedAt,
		lastRunSource: params.source,
		lastRunStartedAt: params.startedAt,
		lastRunFinishedAt: params.finishedAt,

		lastRunStatus: params.status,
		lastRunMessage: params.message,
		lastRunError: params.error,

		lastRunDurationMs: params.durationMs,
		lastRunProcessed: params.processed,
		lastRunUpdated: params.updated,
		lastRunAlertsGenerated: params.alertsGenerated,
		lastRunEmailsSent: params.emailsSent,
		lastRunEmailsFailed: params.emailsFailed,
		lastRunEmailsSkipped: params.emailsSkipped,
		lastRunRowsMarkedOverdue: params.rowsMarkedOverdue,
	});

	await settings.save({ validateBeforeSave: true });
}

/* -------------------------------------------------------------------------- */
/* Derivation helpers                                                         */
/* -------------------------------------------------------------------------- */

function deriveNextDueDate(
	schedule: MaintenanceScheduleEntryDocument[],
): string | null {
	const pendingDates = schedule
		.filter((entry) => entry.maintenanceStatus === "pending")
		.map((entry) => normalizeDateOnly(entry.maintenanceDate))
		.filter((value): value is string => Boolean(value))
		.sort();

	return pendingDates[0] ?? null;
}

function deriveMaintenanceStatus(
	schedule: MaintenanceScheduleEntryDocument[],
): MaintenanceStatus {
	if (schedule.length === 0) return "scheduled";

	if (schedule.every((entry) => entry.maintenanceStatus === "cancelled")) {
		return "cancelled";
	}

	if (schedule.every((entry) => entry.maintenanceStatus === "done")) {
		return "completed";
	}

	if (schedule.some((entry) => entry.maintenanceStatus === "overdue")) {
		return "overdue";
	}

	if (
		schedule.some(
			(entry) =>
				entry.alertStatus === "emitted" &&
				entry.maintenanceStatus === "pending",
		)
	) {
		return "active";
	}

	return "scheduled";
}

/* -------------------------------------------------------------------------- */
/* Email dispatch                                                             */
/* -------------------------------------------------------------------------- */

function uniqueEmails(values: string[]): string[] {
	return Array.from(
		new Set(
			values
				.map((value) => value.trim().toLowerCase())
				.filter(Boolean),
		),
	);
}

async function resolveClientEmails(
	maintenance: MaintenanceDocument,
): Promise<string[]> {
	const organization = await Organization.findById(maintenance.organizationId)
		.select("primaryEmail")
		.lean()
		.exec();

	const organizationEmail =
		organization && typeof organization.primaryEmail === "string"
			? organization.primaryEmail
			: "";

	const organizationUsers = await OrganizationUser.find({
		organizationId: maintenance.organizationId,
		status: "active",
	})
		.select("email")
		.lean()
		.exec();

	const userEmails = organizationUsers.map((user) =>
		typeof user.email === "string" ? user.email : "",
	);

	return uniqueEmails([organizationEmail, ...userEmails]);
}

async function dispatchMaintenanceEmail(
	settings: MaintenanceSettingsDocument,
	maintenance: MaintenanceDocument,
	entry: MaintenanceScheduleEntryDocument,
): Promise<EmailDispatchResult> {
	if (!settings.emailEnabled || settings.emailProvider === "disabled") {
		return { status: "skipped", sentAt: null, error: "" };
	}

	if (!entry.channels.includes("email")) {
		return { status: "skipped", sentAt: null, error: "" };
	}

	const shouldNotifyClient = entry.recipients.includes("client");
	const shouldNotifyInternal = entry.recipients.includes("internal");

	const snapshotEmail = entry.recipientEmail.trim();

	const clientEmails = shouldNotifyClient
		? uniqueEmails([snapshotEmail, ...(await resolveClientEmails(maintenance))])
		: [];

	const internalEmails = shouldNotifyInternal
		? settings.internalRecipients
		: [];

	const recipients = uniqueEmails([...clientEmails, ...internalEmails]);

	if (clientEmails.length > 0) {
		entry.recipientEmail = clientEmails.join(", ");
	}

	if (recipients.length === 0) {
		return { status: "skipped", sentAt: null, error: "" };
	}

	try {
		await sendTransactionalEmail({
			to: recipients,
			subject: `Alerta de mantenimiento - ${maintenance.projectTitle}`,
			replyTo: settings.replyToEmail || undefined,
			html: `
			<div style="font-family: Arial, Helvetica, sans-serif; color:#333; line-height:1.6;">

				<h2 style="color:#D97706; margin-bottom:16px;">
					🔧 Alerta de mantenimiento programado
				</h2>

				<p><strong>Organización:</strong> ${maintenance.organizationName}</p>
				<p><strong>Proyecto:</strong> ${maintenance.projectTitle}</p>

				<hr style="margin:16px 0;" />

				<p><strong>Mantenimiento:</strong> ${maintenance.title}</p>
				<p><strong>Tipo:</strong> ${maintenance.maintenanceType}</p>

				<p style="margin-top:12px;">
					<strong>Fecha programada:</strong> ${entry.maintenanceDate}
				</p>

				<hr style="margin:16px 0;" />

				${maintenance.instructions
					? `
						<div>
							<p><strong>Instrucciones:</strong></p>
							<p style="white-space:pre-line;">
								${maintenance.instructions}
							</p>
						</div>
					`
					: ""
				}

				${maintenance.notes
					? `
						<div style="margin-top:12px;">
							<p><strong>Notas:</strong></p>
							<p>${maintenance.notes}</p>
						</div>
					`
					: ""
				}

				<hr style="margin:20px 0;" />

				<p>
					👉 Puede acceder al portal para revisar o registrar el mantenimiento.
				</p>

				<p style="font-size:12px; color:#777; margin-top:20px;">
					Este es un aviso automático del sistema de mantenimiento.
				</p>

			</div>
			`,
		});

		return {
			status: "sent",
			sentAt: new Date().toISOString(),
			error: "",
		};
	} catch (error) {
		return {
			status: "failed",
			sentAt: null,
			error:
				error instanceof Error
					? error.message
					: "Unknown maintenance email error.",
		};
	}
}

/* -------------------------------------------------------------------------- */
/* Row processor                                                              */
/* -------------------------------------------------------------------------- */

async function processScheduleEntry(
	settings: MaintenanceSettingsDocument,
	maintenance: MaintenanceDocument,
	entry: MaintenanceScheduleEntryDocument,
	today: string,
	nowIso: string,
): Promise<{
	changed: boolean;
	alertGenerated: boolean;
	emailSent: boolean;
	emailFailed: boolean;
	emailSkipped: boolean;
	markedOverdue: boolean;
}> {
	let changed = false;
	let alertGenerated = false;
	let emailSent = false;
	let emailFailed = false;
	let emailSkipped = false;
	let markedOverdue = false;

	const isFinalState =
		entry.maintenanceStatus === "done" ||
		entry.maintenanceStatus === "cancelled" ||
		entry.completed;

	if (isFinalState) {
		return {
			changed,
			alertGenerated,
			emailSent,
			emailFailed,
			emailSkipped,
			markedOverdue,
		};
	}

	if (
		entry.alertStatus === "pending" &&
		isSameOrBeforeDateOnly(entry.alertDate, today)
	) {
		entry.alertStatus = "emitted";
		entry.emittedAt = nowIso;

		changed = true;
		alertGenerated = true;

		const emailResult = await dispatchMaintenanceEmail(
			settings,
			maintenance,
			entry,
		);

		entry.emailStatus = emailResult.status;
		entry.emailSentAt = emailResult.sentAt;
		entry.emailError = emailResult.error;

		if (emailResult.status === "sent") emailSent = true;
		if (emailResult.status === "failed") emailFailed = true;
		if (emailResult.status === "skipped") emailSkipped = true;
	}

	if (
		entry.maintenanceStatus === "pending" &&
		isBeforeDateOnly(entry.maintenanceDate, today)
	) {
		entry.maintenanceStatus = "overdue";
		changed = true;
		markedOverdue = true;
	}

	return {
		changed,
		alertGenerated,
		emailSent,
		emailFailed,
		emailSkipped,
		markedOverdue,
	};
}

/* -------------------------------------------------------------------------- */
/* Maintenance processor                                                      */
/* -------------------------------------------------------------------------- */

async function processMaintenanceDocument(
	settings: MaintenanceSettingsDocument,
	maintenance: MaintenanceDocument,
	now: Date,
): Promise<ProcessMaintenanceResult> {
	const today = toDateOnly(now);
	const nowIso = now.toISOString();

	let changed = false;
	let alertsGenerated = 0;
	let emailsSent = 0;
	let emailsFailed = 0;
	let emailsSkipped = 0;
	let rowsMarkedOverdue = 0;

	for (const entry of maintenance.schedule) {
		const result = await processScheduleEntry(
			settings,
			maintenance,
			entry,
			today,
			nowIso,
		);

		if (result.changed) changed = true;
		if (result.alertGenerated) alertsGenerated += 1;
		if (result.emailSent) emailsSent += 1;
		if (result.emailFailed) emailsFailed += 1;
		if (result.emailSkipped) emailsSkipped += 1;
		if (result.markedOverdue) rowsMarkedOverdue += 1;
	}

	const nextDueDate = deriveNextDueDate(maintenance.schedule);
	const status = deriveMaintenanceStatus(maintenance.schedule);

	if (maintenance.nextDueDate !== nextDueDate) {
		maintenance.nextDueDate = nextDueDate;
		changed = true;
	}

	if (maintenance.status !== status) {
		maintenance.status = status;
		changed = true;
	}

	if (changed) {
		maintenance.markModified("schedule");
		await maintenance.save({ validateBeforeSave: true });
	}

	return {
		changed,
		alertsGenerated,
		emailsSent,
		emailsFailed,
		emailsSkipped,
		rowsMarkedOverdue,
	};
}

/* -------------------------------------------------------------------------- */
/* Public job                                                                 */
/* -------------------------------------------------------------------------- */

export async function runMaintenanceSchedulerJob(
	options: SchedulerRunOptions = {},
): Promise<SchedulerRunResult> {
	await connectToDB();

	const startedAt = Date.now();
	const now = options.now ?? new Date();
	const startedAtIso = now.toISOString();

	const limit = options.limit ?? 250;
	const mode = options.mode ?? "automatic";
	const force = Boolean(options.force);
	const source: "cron" | "manual" = mode === "manual" ? "manual" : "cron";

	const settings = await getOrCreateSettings();

	try {
		if (!shouldRunScheduler(settings, now, mode, force)) {
			const finishedAt = new Date().toISOString();
			const durationMs = Date.now() - startedAt;

			await writeSchedulerAudit(settings, {
				source,
				startedAt: startedAtIso,
				finishedAt,
				status: "success",
				message: "Scheduler skipped by configuration.",
				durationMs,
				processed: 0,
				updated: 0,
				alertsGenerated: 0,
				emailsSent: 0,
				emailsFailed: 0,
				emailsSkipped: 0,
				rowsMarkedOverdue: 0,
				error: "",
			});

			return {
				ok: true,
				source,
				startedAt: startedAtIso,
				finishedAt,
				durationMs,
				processed: 0,
				updated: 0,
				alertsGenerated: 0,
				emailsSent: 0,
				emailsFailed: 0,
				emailsSkipped: 0,
				rowsMarkedOverdue: 0,
			};
		}

		const items = await Maintenance.find({
			status: { $nin: ["completed", "cancelled"] },
			schedule: { $exists: true, $ne: [] },
		})
			.sort({ nextDueDate: 1, updatedAt: 1 })
			.limit(limit);

		let processed = 0;
		let updated = 0;
		let alertsGenerated = 0;
		let emailsSent = 0;
		let emailsFailed = 0;
		let emailsSkipped = 0;
		let rowsMarkedOverdue = 0;

		for (const maintenance of items) {
			const result = await processMaintenanceDocument(settings, maintenance, now);

			processed += 1;

			if (result.changed) updated += 1;

			alertsGenerated += result.alertsGenerated;
			emailsSent += result.emailsSent;
			emailsFailed += result.emailsFailed;
			emailsSkipped += result.emailsSkipped;
			rowsMarkedOverdue += result.rowsMarkedOverdue;
		}

		const finishedAt = new Date().toISOString();
		const durationMs = Date.now() - startedAt;

		await writeSchedulerAudit(settings, {
			source,
			startedAt: startedAtIso,
			finishedAt,
			status: "success",
			message: "Scheduler executed successfully.",
			durationMs,
			processed,
			updated,
			alertsGenerated,
			emailsSent,
			emailsFailed,
			emailsSkipped,
			rowsMarkedOverdue,
			error: "",
		});

		return {
			ok: true,
			source,
			startedAt: startedAtIso,
			finishedAt,
			durationMs,
			processed,
			updated,
			alertsGenerated,
			emailsSent,
			emailsFailed,
			emailsSkipped,
			rowsMarkedOverdue,
		};
	} catch (error) {
		const finishedAt = new Date().toISOString();
		const durationMs = Date.now() - startedAt;
		const errorMessage =
			error instanceof Error
				? error.message
				: "Unknown scheduler execution error.";

		await writeSchedulerAudit(settings, {
			source,
			startedAt: startedAtIso,
			finishedAt,
			status: "failed",
			message: errorMessage,
			durationMs,
			processed: 0,
			updated: 0,
			alertsGenerated: 0,
			emailsSent: 0,
			emailsFailed: 0,
			emailsSkipped: 0,
			rowsMarkedOverdue: 0,
			error: errorMessage,
		});

		throw error;
	}
}