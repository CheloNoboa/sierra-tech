/**
 * =============================================================================
 * 📄 Helpers: Maintenance Normalize
 * Path: src/lib/maintenance/maintenance.normalize.ts
 * =============================================================================
 *
 * ES:
 * Helpers oficiales de normalización para el módulo Maintenance de Sierra Tech.
 *
 * Propósito:
 * - convertir input desconocido en estructuras estrictas y estables
 * - proteger UI / API / DB contra datos incompletos o inconsistentes
 * - mantener un contrato único alineado con src/types/maintenance.ts
 * - preservar el schedule generado/editado desde la UI
 * - derivar nextDueDate y status desde schedule sin pisar la tabla operativa
 *
 * Reglas:
 * - sin any
 * - sin efectos secundarios
 * - no consultar base de datos
 * - no depender de React ni Next.js
 * =============================================================================
 */

import { extractDateOnly } from "@/lib/maintenance/maintenance.engine";

import type {
	MaintenanceAlertStatus,
	MaintenanceCompletedByRole,
	MaintenanceEntity,
	MaintenanceExecutionStatus,
	MaintenanceFileAttachment,
	MaintenanceFilters,
	MaintenanceFrequencyUnit,
	MaintenanceGenerationMode,
	MaintenancePayload,
	MaintenanceScheduleEntry,
	MaintenanceStatus,
	MaintenanceSummary,
	MaintenanceType,
	MaintenanceWritePayload,
	MaintenanceEmailStatus,
} from "@/types/maintenance";

/* -------------------------------------------------------------------------- */
/* Base helpers                                                               */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;

	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

function safeArray<T>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeNullableDate(value: unknown): string | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime())
			? null
			: extractDateOnly(value.toISOString());
	}

	if (
		value &&
		typeof value === "object" &&
		"toISOString" in value &&
		typeof value.toISOString === "function"
	) {
		try {
			const iso = value.toISOString();
			return extractDateOnly(iso) || null;
		} catch {
			return null;
		}
	}

	const text = typeof value === "string" ? value.trim() : "";
	if (!text) return null;

	return extractDateOnly(text) || null;
}

function normalizeTimestamp(value: unknown, fallbackIso: string): string {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? fallbackIso : value.toISOString();
	}

	if (
		value &&
		typeof value === "object" &&
		"toISOString" in value &&
		typeof value.toISOString === "function"
	) {
		try {
			const iso = value.toISOString();
			const date = new Date(iso);
			return Number.isNaN(date.getTime()) ? fallbackIso : date.toISOString();
		} catch {
			return fallbackIso;
		}
	}

	const text = typeof value === "string" ? value.trim() : "";
	if (!text) return fallbackIso;

	const date = new Date(text);
	return Number.isNaN(date.getTime()) ? fallbackIso : date.toISOString();
}

/* -------------------------------------------------------------------------- */
/* Enum normalizers                                                           */
/* -------------------------------------------------------------------------- */

function normalizeMaintenanceGenerationMode(
	value: unknown,
): MaintenanceGenerationMode {
	return value === "manual" ? "manual" : "automatic";
}

function normalizeMaintenanceType(value: unknown): MaintenanceType {
	if (
		value === "preventive" ||
		value === "corrective" ||
		value === "cleaning" ||
		value === "inspection" ||
		value === "replacement"
	) {
		return value;
	}

	return "other";
}

function normalizeMaintenanceStatus(value: unknown): MaintenanceStatus {
	if (
		value === "active" ||
		value === "completed" ||
		value === "overdue" ||
		value === "cancelled"
	) {
		return value;
	}

	return "scheduled";
}

function normalizeFrequencyUnit(value: unknown): MaintenanceFrequencyUnit | null {
	if (
		value === "days" ||
		value === "weeks" ||
		value === "months" ||
		value === "years"
	) {
		return value;
	}

	return null;
}

function normalizeAlertStatus(value: unknown): MaintenanceAlertStatus {
	return value === "emitted" ? "emitted" : "pending";
}

function normalizeEmailStatus(value: unknown): MaintenanceEmailStatus {
	if (value === "sent" || value === "failed" || value === "skipped") {
		return value;
	}

	return "pending";
}

function normalizeExecutionStatus(value: unknown): MaintenanceExecutionStatus {
	if (value === "done" || value === "overdue" || value === "cancelled") {
		return value;
	}

	return "pending";
}

function normalizeCompletedByRole(value: unknown): MaintenanceCompletedByRole {
	if (value === "client" || value === "internal") return value;
	return null;
}

/* -------------------------------------------------------------------------- */
/* Attachments                                                                */
/* -------------------------------------------------------------------------- */

function normalizeMaintenanceAttachment(
	value: unknown,
): MaintenanceFileAttachment | null {
	const source = isRecord(value) ? value : null;
	if (!source) return null;

	const storageKey = normalizeString(source.storageKey);
	const url = normalizeString(source.url);
	const name = normalizeString(source.name);

	if (!storageKey && !url) return null;

	return {
		name,
		url,
		storageKey,
		mimeType: normalizeString(source.mimeType),
		size: normalizeNumber(source.size, 0),
	};
}

/* -------------------------------------------------------------------------- */
/* Schedule                                                                   */
/* -------------------------------------------------------------------------- */

function normalizeChannels(value: unknown): Array<"platform" | "email"> {
	return safeArray<unknown>(value).filter(
		(item): item is "platform" | "email" =>
			item === "platform" || item === "email",
	);
}

function normalizeRecipients(value: unknown): Array<"client" | "internal"> {
	return safeArray<unknown>(value).filter(
		(item): item is "client" | "internal" =>
			item === "client" || item === "internal",
	);
}

function normalizeScheduleEntry(
	value: unknown,
	index: number,
): MaintenanceScheduleEntry {
	const source = isRecord(value) ? value : {};

	const maintenanceDate =
		normalizeNullableDate(source.maintenanceDate) ??
		normalizeNullableDate(source.date) ??
		"1970-01-01";

	const maintenanceStatus = normalizeExecutionStatus(source.maintenanceStatus);
	const completed = normalizeBoolean(source.completed, maintenanceStatus === "done");

	return {
		eventId: normalizeString(source.eventId) || `maintenance-event-${index}`,
		cycleIndex: normalizeNumber(source.cycleIndex, index),
		maintenanceDate,
		alertDate: normalizeNullableDate(source.alertDate),
		alertStatus: normalizeAlertStatus(source.alertStatus),
		maintenanceStatus,
		channels: normalizeChannels(source.channels),
		recipients: normalizeRecipients(source.recipients),
		recipientEmail: normalizeString(source.recipientEmail),
		emittedAt: normalizeNullableDate(source.emittedAt),
		emailStatus: normalizeEmailStatus(source.emailStatus),
		emailSentAt: normalizeNullableDate(source.emailSentAt),
		emailError: normalizeString(source.emailError),
		completedAt: normalizeNullableDate(source.completedAt),
		completed,
		completedByRole: normalizeCompletedByRole(source.completedByRole),
		note: normalizeString(source.note),
	};
}

/* -------------------------------------------------------------------------- */
/* Derived state                                                              */
/* -------------------------------------------------------------------------- */

function getTodayDateOnly(): string {
	return extractDateOnly(new Date().toISOString()) || "1970-01-01";
}

function deriveNextDueDate(schedule: MaintenanceScheduleEntry[]): string | null {
	const nextRow = schedule.find(
		(row) =>
			row.maintenanceStatus !== "done" &&
			row.maintenanceStatus !== "cancelled",
	);

	return nextRow?.maintenanceDate ?? null;
}

function deriveMaintenanceStatus(
	schedule: MaintenanceScheduleEntry[],
	today: string,
): MaintenanceStatus {
	if (schedule.length === 0) {
		return "scheduled";
	}

	const activeRows = schedule.filter(
		(row) => row.maintenanceStatus !== "cancelled",
	);

	if (activeRows.length === 0) {
		return "cancelled";
	}

	const completedRows = activeRows.filter(
		(row) => row.maintenanceStatus === "done" || row.completed,
	);

	if (completedRows.length === activeRows.length) {
		return "completed";
	}

	const hasOverdue = activeRows.some(
		(row) =>
			row.maintenanceStatus === "overdue" ||
			(row.maintenanceStatus === "pending" && row.maintenanceDate < today),
	);

	if (hasOverdue) {
		return "overdue";
	}

	return "active";
}

/* -------------------------------------------------------------------------- */
/* Main payload normalization                                                 */
/* -------------------------------------------------------------------------- */

function normalizeMaintenancePayloadBase(value: unknown): MaintenancePayload {
	const source = isRecord(value) ? value : {};

	return {
		organizationId: normalizeString(source.organizationId),
		projectId: normalizeString(source.projectId),

		organizationName: normalizeString(source.organizationName),
		projectTitle: normalizeString(source.projectTitle),

		title: normalizeString(source.title),
		description: normalizeString(source.description),

		maintenanceType: normalizeMaintenanceType(source.maintenanceType),
		generationMode: normalizeMaintenanceGenerationMode(source.generationMode),

		contractStartDate: normalizeNullableDate(source.contractStartDate),
		contractDurationMonths: normalizeNullableNumber(
			source.contractDurationMonths,
		),
		contractEndDate: normalizeNullableDate(source.contractEndDate),

		frequencyValue: normalizeNullableNumber(source.frequencyValue),
		frequencyUnit: normalizeFrequencyUnit(source.frequencyUnit),

		alertDaysBefore: normalizeNullableNumber(source.alertDaysBefore),
		isRecurring: normalizeBoolean(source.isRecurring, true),

		notifyClient: normalizeBoolean(source.notifyClient, true),
		notifyInternal: normalizeBoolean(source.notifyInternal, true),

		instructions: normalizeString(source.instructions),
		notes: normalizeString(source.notes),

		relatedDocumentIds: safeArray<unknown>(source.relatedDocumentIds)
			.map(normalizeString)
			.filter(Boolean),

		attachments: safeArray(source.attachments)
			.map(normalizeMaintenanceAttachment)
			.filter((item): item is MaintenanceFileAttachment => item !== null),

		nextDueDate: normalizeNullableDate(source.nextDueDate),
		status: normalizeMaintenanceStatus(source.status),

		schedule: safeArray(source.schedule).map(normalizeScheduleEntry),
	};
}

/* -------------------------------------------------------------------------- */
/* Public helpers                                                             */
/* -------------------------------------------------------------------------- */

export function createEmptyMaintenancePayload(): MaintenancePayload {
	return {
		organizationId: "",
		projectId: "",

		organizationName: "",
		projectTitle: "",

		title: "",
		description: "",

		maintenanceType: "preventive",
		generationMode: "automatic",

		contractStartDate: null,
		contractDurationMonths: null,
		contractEndDate: null,

		frequencyValue: null,
		frequencyUnit: "months",

		alertDaysBefore: 15,
		isRecurring: true,

		notifyClient: true,
		notifyInternal: true,

		instructions: "",
		notes: "",

		relatedDocumentIds: [],
		attachments: [],

		nextDueDate: null,
		status: "scheduled",

		schedule: [],
	};
}

export function normalizeMaintenanceWritePayload(
	value: unknown,
	options?: {
		today?: string | null;
		clientEmail?: string | null;
	},
): MaintenanceWritePayload {
	const base = normalizeMaintenancePayloadBase(value);

	const today =
		options?.today && extractDateOnly(options.today)
			? extractDateOnly(options.today)
			: getTodayDateOnly();

	const schedule: MaintenanceScheduleEntry[] = base.schedule.map((row, index) => {
		const completed =
			row.completed || row.maintenanceStatus === "done";

		const maintenanceStatus: MaintenanceExecutionStatus =
			completed && row.maintenanceStatus !== "cancelled"
				? "done"
				: row.maintenanceStatus;

		return {
			...row,
			cycleIndex: index,
			channels:
				row.channels.length > 0
					? row.channels
					: (["platform", "email"] satisfies Array<"platform" | "email">),
			recipients:
				row.recipients.length > 0
					? row.recipients
					: base.notifyClient
						? (["client", "internal"] satisfies Array<"client" | "internal">)
						: (["internal"] satisfies Array<"client" | "internal">),
			recipientEmail:
				row.recipientEmail || normalizeString(options?.clientEmail),
			maintenanceStatus,
			completed,
			completedAt: completed && !row.completedAt ? today : row.completedAt,
		};
	});

	return {
		...createEmptyMaintenancePayload(),
		...base,
		relatedDocumentIds: base.relatedDocumentIds,
		attachments: base.attachments,
		schedule,
		nextDueDate: deriveNextDueDate(schedule),
		status: deriveMaintenanceStatus(schedule, today),
	};
}

export function normalizeMaintenanceEntity(
	value: unknown,
	options?: {
		today?: string | null;
		clientEmail?: string | null;
	},
): MaintenanceEntity {
	const source = isRecord(value) ? value : {};
	const payload = normalizeMaintenanceWritePayload(source, options);

	const rawId = source._id;
	const normalizedId =
		normalizeString(rawId) ||
		(isRecord(rawId) && typeof rawId.toString === "function"
			? normalizeString(rawId.toString())
			: "");

	return {
		...payload,
		_id: normalizedId,
		createdAt: normalizeTimestamp(
			source.createdAt,
			"1970-01-01T00:00:00.000Z",
		),
		updatedAt: normalizeTimestamp(
			source.updatedAt,
			"1970-01-01T00:00:00.000Z",
		),
	};
}

/* -------------------------------------------------------------------------- */
/* Lightweight helpers                                                        */
/* -------------------------------------------------------------------------- */

export function createEmptyMaintenanceFilters(): MaintenanceFilters {
	return {
		q: "",
		organizationId: "all",
		projectId: "all",
		status: "all",
		maintenanceType: "all",
		generationMode: "all",
	};
}

export function createEmptyMaintenanceSummary(): MaintenanceSummary {
	return {
		totalMaintenances: 0,
		activeMaintenances: 0,
		overdueMaintenances: 0,
		completedMaintenances: 0,
		upcomingEvents: 0,
	};
}