/**
 * =============================================================================
 * 📄 Helpers: Maintenance Engine
 * Path: src/lib/maintenance/maintenance.engine.ts
 * =============================================================================
 *
 * ES:
 * Motor oficial del módulo Maintenance de Sierra Tech.
 *
 * Propósito:
 * - centralizar la lógica pura del schedule
 * - generar tablas automáticas
 * - recalcular secuencias
 * - recalcular filas puntuales
 * - derivar estados operativos
 * - derivar nextDueDate y status del maintenance
 *
 * Alcance:
 * - modo automatic
 * - modo manual
 * - edición de primera fila
 * - edición de filas individuales
 * - marcación de mantenimiento realizado
 * - marcación de alerta emitida
 * - resumen operativo del maintenance
 *
 * Decisiones:
 * - este archivo NO consulta base de datos
 * - este archivo NO depende de React
 * - este archivo NO depende de Next.js
 * - este archivo trabaja con fechas calendario (YYYY-MM-DD)
 *   para evitar desfases por zona horaria
 * - schedule es la fuente de verdad operativa
 * - nextDueDate y status del maintenance se derivan desde schedule
 *
 * Reglas:
 * - sin any
 * - sin efectos secundarios
 * - todas las funciones deben ser puras
 * - los resultados deben ser estables y predecibles
 *
 * EN:
 * Official pure engine for the Sierra Tech Maintenance module.
 * =============================================================================
 */

import type {
	MaintenanceCompletedByRole,
	MaintenanceEntity,
	MaintenanceExecutionStatus,
	MaintenanceFrequencyUnit,
	MaintenanceGenerationMode,
	MaintenancePayload,
	MaintenanceScheduleEntry,
	MaintenanceScheduleRowUpdate,
	MaintenanceStatus,
} from "@/types/maintenance";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ScheduleGenerationConfig = {
	contractStartDate: string | null;
	contractEndDate: string | null;
	frequencyValue: number | null;
	frequencyUnit: MaintenanceFrequencyUnit | null;
	alertDaysBefore: number | null;
	isRecurring: boolean;
	notifyClient: boolean;
	notifyInternal: boolean;
	clientEmail?: string | null;
	today?: string | null;
};

type RecalculateFromFirstRowInput = {
	schedule: MaintenanceScheduleEntry[];
	contractEndDate: string | null;
	frequencyValue: number | null;
	frequencyUnit: MaintenanceFrequencyUnit | null;
	alertDaysBefore: number | null;
	isRecurring: boolean;
	notifyClient: boolean;
	notifyInternal: boolean;
	clientEmail?: string | null;
	today?: string | null;
};

type RecalculateSingleRowInput = {
	entry: MaintenanceScheduleEntry;
	alertDaysBefore: number | null;
	notifyClient: boolean;
	notifyInternal: boolean;
	clientEmail?: string | null;
	today?: string | null;
};

type ScheduleSummary = {
	nextDueDate: string | null;
	status: MaintenanceStatus;
	totalEvents: number;
	completedEvents: number;
	overdueEvents: number;
	pendingEvents: number;
	cancelledEvents: number;
	emittedAlerts: number;
};

/* -------------------------------------------------------------------------- */
/* Date helpers                                                               */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Extrae la parte YYYY-MM-DD de un valor de fecha.
 *
 * Casos soportados:
 * - 2026-07-01
 * - 2026-07-01T00:00:00.000Z
 * ---------------------------------------------------------------------------
 */
export function extractDateOnly(value: string | null | undefined): string {
	if (!value) {
		return "";
	}

	return value.split("T")[0]?.trim() ?? "";
}

/**
 * ---------------------------------------------------------------------------
 * Convierte YYYY-MM-DD a Date local segura, evitando parse ambiguo.
 * ---------------------------------------------------------------------------
 */
export function parseDateOnly(value: string | null | undefined): Date | null {
	const safeValue = extractDateOnly(value);

	if (!safeValue) {
		return null;
	}

	const [yearText, monthText, dayText] = safeValue.split("-");
	const year = Number(yearText);
	const month = Number(monthText);
	const day = Number(dayText);

	if (!year || !month || !day) {
		return null;
	}

	const date = new Date(year, month - 1, day);
	return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * ---------------------------------------------------------------------------
 * Formatea un Date a YYYY-MM-DD.
 * ---------------------------------------------------------------------------
 */
export function formatDateOnly(date: Date): string {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join("-");
}

/**
 * ---------------------------------------------------------------------------
 * Obtiene la fecha calendario de hoy.
 * ---------------------------------------------------------------------------
 */
export function getTodayDateOnly(): string {
	return formatDateOnly(new Date());
}

/**
 * ---------------------------------------------------------------------------
 * Compara dos fechas calendario.
 *
 * Retorna:
 * - negativo si a < b
 * - 0 si a === b
 * - positivo si a > b
 * ---------------------------------------------------------------------------
 */
export function compareDateOnly(a: string, b: string): number {
	const aDate = parseDateOnly(a);
	const bDate = parseDateOnly(b);

	if (!aDate && !bDate) return 0;
	if (!aDate) return 1;
	if (!bDate) return -1;

	return aDate.getTime() - bDate.getTime();
}

/**
 * ---------------------------------------------------------------------------
 * Suma días a una fecha calendario.
 * ---------------------------------------------------------------------------
 */
export function addDaysDateOnly(
	baseDate: string | null | undefined,
	days: number,
): string | null {
	const parsed = parseDateOnly(baseDate);

	if (!parsed || !Number.isFinite(days)) {
		return null;
	}

	const next = new Date(parsed);
	next.setDate(next.getDate() + days);

	return formatDateOnly(next);
}

/**
 * ---------------------------------------------------------------------------
 * Suma frecuencia a una fecha calendario.
 * ---------------------------------------------------------------------------
 */
export function addFrequencyDateOnly(
	baseDate: string | null | undefined,
	frequencyValue: number | null,
	frequencyUnit: MaintenanceFrequencyUnit | null,
): string | null {
	if (!baseDate || !frequencyValue || frequencyValue <= 0 || !frequencyUnit) {
		return null;
	}

	const parsed = parseDateOnly(baseDate);

	if (!parsed) {
		return null;
	}

	const next = new Date(parsed);

	switch (frequencyUnit) {
		case "days":
			next.setDate(next.getDate() + frequencyValue);
			return formatDateOnly(next);

		case "weeks":
			next.setDate(next.getDate() + frequencyValue * 7);
			return formatDateOnly(next);

		case "months":
			next.setMonth(next.getMonth() + frequencyValue);
			return formatDateOnly(next);

		case "years":
			next.setFullYear(next.getFullYear() + frequencyValue);
			return formatDateOnly(next);

		default:
			return null;
	}
}

/* -------------------------------------------------------------------------- */
/* Base helpers                                                               */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function ensureTodayDate(today?: string | null): string {
	const safeToday = extractDateOnly(today);
	return safeToday || getTodayDateOnly();
}

function resolveRecipients(
	notifyClient: boolean,
	notifyInternal: boolean,
): Array<"client" | "internal"> {
	const recipients: Array<"client" | "internal"> = [];

	if (notifyClient) recipients.push("client");
	if (notifyInternal) recipients.push("internal");

	return recipients;
}

function resolveChannels(
	notifyClient: boolean,
	notifyInternal: boolean,
): Array<"platform" | "email"> {
	if (!notifyClient && !notifyInternal) {
		return [];
	}

	return ["platform", "email"];
}

function createEventId(cycleIndex: number, maintenanceDate: string): string {
	return `maintenance-event-${cycleIndex}-${maintenanceDate}`;
}

function deriveMaintenanceExecutionStatus(params: {
	maintenanceDate: string;
	completed: boolean;
	manualStatus?: MaintenanceExecutionStatus | null;
	today: string;
}): MaintenanceExecutionStatus {
	const { maintenanceDate, completed, manualStatus, today } = params;

	if (manualStatus === "cancelled") {
		return "cancelled";
	}

	if (completed || manualStatus === "done") {
		return "done";
	}

	return compareDateOnly(maintenanceDate, today) < 0 ? "overdue" : "pending";
}

function deriveAlertDate(
	maintenanceDate: string,
	alertDaysBefore: number | null,
): string | null {
	if (!alertDaysBefore || alertDaysBefore <= 0) {
		return null;
	}

	return addDaysDateOnly(maintenanceDate, -alertDaysBefore);
}

function canGenerateAutomaticSchedule(config: ScheduleGenerationConfig): boolean {
	return Boolean(
		extractDateOnly(config.contractStartDate) &&
		extractDateOnly(config.contractEndDate) &&
		config.frequencyValue &&
		config.frequencyValue > 0 &&
		config.frequencyUnit,
	);
}

function isPendingLikeStatus(status: MaintenanceExecutionStatus): boolean {
	return status === "pending" || status === "overdue";
}

function shouldRebuildAutomaticSchedule(payload: MaintenancePayload): boolean {
	return payload.schedule.length === 0;
}

/* -------------------------------------------------------------------------- */
/* Row builders                                                               */
/* -------------------------------------------------------------------------- */

export function buildScheduleEntry(params: {
	cycleIndex: number;
	maintenanceDate: string;
	alertDaysBefore: number | null;
	notifyClient: boolean;
	notifyInternal: boolean;
	clientEmail?: string | null;
	today?: string | null;
	manualStatus?: MaintenanceExecutionStatus | null;
	completed?: boolean;
	completedAt?: string | null;
	completedByRole?: MaintenanceCompletedByRole;
	note?: string;
	emittedAt?: string | null;
	emailStatus?: "pending" | "sent" | "failed" | "skipped";
	emailSentAt?: string | null;
	emailError?: string;
	eventId?: string | null;
}): MaintenanceScheduleEntry {
	const today = ensureTodayDate(params.today);
	const recipients = resolveRecipients(
		params.notifyClient,
		params.notifyInternal,
	);
	const channels = resolveChannels(params.notifyClient, params.notifyInternal);
	const maintenanceDate = extractDateOnly(params.maintenanceDate);
	const alertDate = deriveAlertDate(maintenanceDate, params.alertDaysBefore);
	const completed = Boolean(params.completed);

	const maintenanceStatus = deriveMaintenanceExecutionStatus({
		maintenanceDate,
		completed,
		manualStatus: params.manualStatus ?? null,
		today,
	});

	const emittedAtValue = normalizeString(params.emittedAt);
	const emittedAt =
		emittedAtValue.length > 0 ? extractDateOnly(emittedAtValue) : null;

	const alertStatus = emittedAt ? "emitted" : "pending";

	const emailSentAtValue = normalizeString(params.emailSentAt);
	const emailSentAt =
		emailSentAtValue.length > 0 ? extractDateOnly(emailSentAtValue) : null;

	return {
		eventId:
			normalizeString(params.eventId) ||
			createEventId(params.cycleIndex, maintenanceDate),
		cycleIndex: params.cycleIndex,
		maintenanceDate,
		alertDate,
		alertStatus,
		maintenanceStatus,
		channels,
		recipients,
		recipientEmail: params.notifyClient
			? normalizeString(params.clientEmail)
			: "",
		emittedAt,
		emailStatus: params.emailStatus ?? "pending",
		emailSentAt,
		emailError: normalizeString(params.emailError),
		completedAt: completed
			? extractDateOnly(params.completedAt) || today
			: null,
		completed,
		completedByRole: completed ? params.completedByRole ?? "internal" : null,
		note: normalizeString(params.note),
	};
}

/* -------------------------------------------------------------------------- */
/* Automatic schedule generation                                              */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Genera automáticamente un schedule dentro del rango contractual.
 *
 * Regla:
 * - primera fecha = contractStartDate + frecuencia
 * - se detiene al superar contractEndDate
 * - si isRecurring = false, solo genera la primera ocurrencia válida
 * ---------------------------------------------------------------------------
 */
export function generateAutomaticSchedule(
	config: ScheduleGenerationConfig,
): MaintenanceScheduleEntry[] {
	if (!canGenerateAutomaticSchedule(config)) {
		return [];
	}

	const today = ensureTodayDate(config.today);
	const contractStartDate = extractDateOnly(config.contractStartDate);
	const contractEndDate = extractDateOnly(config.contractEndDate);

	const recipients = resolveRecipients(
		config.notifyClient,
		config.notifyInternal,
	);

	if (recipients.length === 0) {
		return [];
	}

	const dates: string[] = [];
	let cursor: string | null = contractStartDate;

	let guard = 0;

	while (cursor && guard < 240) {
		if (compareDateOnly(cursor, contractEndDate) > 0) {
			break;
		}

		dates.push(cursor);

		if (!config.isRecurring) {
			break;
		}

		cursor = addFrequencyDateOnly(
			cursor,
			config.frequencyValue,
			config.frequencyUnit,
		);

		guard += 1;
	}

	return dates.map((maintenanceDate, cycleIndex) =>
		buildScheduleEntry({
			cycleIndex,
			maintenanceDate,
			alertDaysBefore: config.alertDaysBefore,
			notifyClient: config.notifyClient,
			notifyInternal: config.notifyInternal,
			clientEmail: config.clientEmail,
			today,
		}),
	);
}

/* -------------------------------------------------------------------------- */
/* Schedule recalculation                                                     */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Recalcula toda la secuencia a partir de la primera fila.
 *
 * Regla oficial:
 * - si se cambia la primera fila en automatic, esa fecha se vuelve nueva ancla
 * - la secuencia completa se regenera desde esa primera fila
 * - si una fila que NO es la primera cambia, eso se maneja fuera de esta
 *   función y solo afecta a esa fila
 * ---------------------------------------------------------------------------
 */
export function recalculateScheduleFromFirstRow(
	input: RecalculateFromFirstRowInput,
): MaintenanceScheduleEntry[] {
	const today = ensureTodayDate(input.today);

	if (
		!input.schedule.length ||
		!extractDateOnly(input.contractEndDate) ||
		!input.frequencyValue ||
		input.frequencyValue <= 0 ||
		!input.frequencyUnit
	) {
		return input.schedule.map((entry, index) =>
			recalculateSingleScheduleRow({
				entry: {
					...entry,
					cycleIndex: index,
				},
				alertDaysBefore: input.alertDaysBefore,
				notifyClient: input.notifyClient,
				notifyInternal: input.notifyInternal,
				clientEmail: input.clientEmail,
				today,
			}),
		);
	}

	const contractEndDate = extractDateOnly(input.contractEndDate);
	const firstRow = input.schedule[0];
	const firstDate = extractDateOnly(firstRow?.maintenanceDate);

	if (!firstDate) {
		return [];
	}

	const regenerated: MaintenanceScheduleEntry[] = [];
	let cycleIndex = 0;
	let cursor: string | null = firstDate;
	let guard = 0;

	while (cursor && guard < 240) {
		if (compareDateOnly(cursor, contractEndDate) > 0) {
			break;
		}

		const sourceEntry = input.schedule[cycleIndex];

		regenerated.push(
			buildScheduleEntry({
				eventId: sourceEntry?.eventId ?? null,
				cycleIndex,
				maintenanceDate: cursor,
				alertDaysBefore: input.alertDaysBefore,
				notifyClient: input.notifyClient,
				notifyInternal: input.notifyInternal,
				clientEmail: input.clientEmail,
				today,
				manualStatus:
					sourceEntry?.maintenanceStatus === "cancelled"
						? "cancelled"
						: null,
				completed:
					sourceEntry?.completed === true &&
					sourceEntry.maintenanceStatus === "done",
				completedAt: sourceEntry?.completedAt ?? null,
				completedByRole: sourceEntry?.completedByRole ?? null,
				note: sourceEntry?.note ?? "",
				emittedAt:
					sourceEntry?.alertStatus === "emitted"
						? sourceEntry.emittedAt
						: null,
				emailStatus: sourceEntry?.emailStatus ?? "pending",
				emailSentAt: sourceEntry?.emailSentAt ?? null,
				emailError: sourceEntry?.emailError ?? "",
			}),
		);

		if (!input.isRecurring) {
			break;
		}

		cursor = addFrequencyDateOnly(
			cursor,
			input.frequencyValue,
			input.frequencyUnit,
		);

		cycleIndex += 1;
		guard += 1;
	}

	return regenerated;
}

/**
 * ---------------------------------------------------------------------------
 * Recalcula una sola fila sin afectar el resto.
 *
 * Regla:
 * - mantiene la edición puntual
 * - recalcula alertDate
 * - recalcula maintenanceStatus
 * - resuelve recipientEmail
 * - conserva emittedAt y completedAt si siguen aplicando
 * ---------------------------------------------------------------------------
 */
export function recalculateSingleScheduleRow(
	input: RecalculateSingleRowInput,
): MaintenanceScheduleEntry {
	const today = ensureTodayDate(input.today);

	return buildScheduleEntry({
		eventId: input.entry.eventId,
		cycleIndex: input.entry.cycleIndex,
		maintenanceDate: input.entry.maintenanceDate,
		alertDaysBefore: input.alertDaysBefore,
		notifyClient: input.notifyClient,
		notifyInternal: input.notifyInternal,
		clientEmail:
			normalizeString(input.entry.recipientEmail) ||
			normalizeString(input.clientEmail),
		today,
		manualStatus:
			input.entry.maintenanceStatus === "cancelled"
				? "cancelled"
				: input.entry.completed
					? "done"
					: null,
		completed: input.entry.completed,
		completedAt: input.entry.completedAt,
		completedByRole: input.entry.completedByRole,
		note: input.entry.note,
		emittedAt:
			input.entry.alertStatus === "emitted" ? input.entry.emittedAt : null,
		emailStatus: input.entry.emailStatus,
		emailSentAt: input.entry.emailSentAt,
		emailError: input.entry.emailError,
	});
}

/* -------------------------------------------------------------------------- */
/* Manual row operations                                                      */
/* -------------------------------------------------------------------------- */

export function toggleScheduleCompleted(params: {
	entry: MaintenanceScheduleEntry;
	completed: boolean;
	completedByRole: MaintenanceCompletedByRole;
	alertDaysBefore: number | null;
	notifyClient: boolean;
	notifyInternal: boolean;
	clientEmail?: string | null;
	today?: string | null;
}): MaintenanceScheduleEntry {
	const today = ensureTodayDate(params.today);

	return buildScheduleEntry({
		eventId: params.entry.eventId,
		cycleIndex: params.entry.cycleIndex,
		maintenanceDate: params.entry.maintenanceDate,
		alertDaysBefore: params.alertDaysBefore,
		notifyClient: params.notifyClient,
		notifyInternal: params.notifyInternal,
		clientEmail:
			normalizeString(params.entry.recipientEmail) ||
			normalizeString(params.clientEmail),
		today,
		completed: params.completed,
		completedAt: params.completed ? today : null,
		completedByRole: params.completed ? params.completedByRole : null,
		note: params.entry.note,
		manualStatus:
			params.entry.maintenanceStatus === "cancelled" ? "cancelled" : null,
		emittedAt: params.entry.emittedAt,
		emailStatus: params.entry.emailStatus,
		emailSentAt: params.entry.emailSentAt,
		emailError: params.entry.emailError,
	});
}

export function toggleScheduleAlertEmitted(params: {
	entry: MaintenanceScheduleEntry;
	emitted: boolean;
	alertDaysBefore: number | null;
	notifyClient: boolean;
	notifyInternal: boolean;
	clientEmail?: string | null;
	today?: string | null;
}): MaintenanceScheduleEntry {
	const today = ensureTodayDate(params.today);

	const recalculated = recalculateSingleScheduleRow({
		entry: params.entry,
		alertDaysBefore: params.alertDaysBefore,
		notifyClient: params.notifyClient,
		notifyInternal: params.notifyInternal,
		clientEmail: params.clientEmail,
		today,
	});

	return {
		...recalculated,
		alertStatus: params.emitted ? "emitted" : "pending",
		emittedAt: params.emitted ? today : null,
		emailStatus: params.entry.emailStatus,
		emailSentAt: params.entry.emailSentAt,
		emailError: params.entry.emailError,
	};
}

export function updateScheduleRowStatus(params: {
	entry: MaintenanceScheduleEntry;
	maintenanceStatus: MaintenanceExecutionStatus;
	alertDaysBefore: number | null;
	notifyClient: boolean;
	notifyInternal: boolean;
	clientEmail?: string | null;
	today?: string | null;
}): MaintenanceScheduleEntry {
	const today = ensureTodayDate(params.today);

	if (params.maintenanceStatus === "done") {
		return toggleScheduleCompleted({
			entry: params.entry,
			completed: true,
			completedByRole: params.entry.completedByRole ?? "internal",
			alertDaysBefore: params.alertDaysBefore,
			notifyClient: params.notifyClient,
			notifyInternal: params.notifyInternal,
			clientEmail: params.clientEmail,
			today,
		});
	}

	if (params.maintenanceStatus === "cancelled") {
		return buildScheduleEntry({
			eventId: params.entry.eventId,
			cycleIndex: params.entry.cycleIndex,
			maintenanceDate: params.entry.maintenanceDate,
			alertDaysBefore: params.alertDaysBefore,
			notifyClient: params.notifyClient,
			notifyInternal: params.notifyInternal,
			clientEmail:
				normalizeString(params.entry.recipientEmail) ||
				normalizeString(params.clientEmail),
			today,
			manualStatus: "cancelled",
			completed: false,
			completedAt: null,
			completedByRole: null,
			note: params.entry.note,
			emittedAt: null,
			emailStatus: params.entry.emailStatus,
			emailSentAt: params.entry.emailSentAt,
			emailError: params.entry.emailError,
		});
	}

	if (params.maintenanceStatus === "overdue") {
		const next = recalculateSingleScheduleRow({
			entry: {
				...params.entry,
				completed: false,
				completedAt: null,
				completedByRole: null,
			},
			alertDaysBefore: params.alertDaysBefore,
			notifyClient: params.notifyClient,
			notifyInternal: params.notifyInternal,
			clientEmail: params.clientEmail,
			today,
		});

		return {
			...next,
			maintenanceStatus: "overdue",
		};
	}

	return recalculateSingleScheduleRow({
		entry: {
			...params.entry,
			completed: false,
			completedAt: null,
			completedByRole: null,
		},
		alertDaysBefore: params.alertDaysBefore,
		notifyClient: params.notifyClient,
		notifyInternal: params.notifyInternal,
		clientEmail: params.clientEmail,
		today,
	});
}

/* -------------------------------------------------------------------------- */
/* Summary derivation                                                         */
/* -------------------------------------------------------------------------- */

export function deriveMaintenanceNextDueDate(
	schedule: MaintenanceScheduleEntry[],
): string | null {
	const activeDates = schedule
		.filter((entry) => isPendingLikeStatus(entry.maintenanceStatus))
		.map((entry) => extractDateOnly(entry.maintenanceDate))
		.filter(Boolean)
		.sort(compareDateOnly);

	return activeDates[0] ?? null;
}

export function deriveMaintenanceStatus(
	schedule: MaintenanceScheduleEntry[],
): MaintenanceStatus {
	if (schedule.length === 0) {
		return "scheduled";
	}

	if (schedule.some((entry) => entry.maintenanceStatus === "overdue")) {
		return "overdue";
	}

	const hasPending = schedule.some(
		(entry) => entry.maintenanceStatus === "pending",
	);

	if (hasPending) {
		return "active";
	}

	const allFinished = schedule.every(
		(entry) =>
			entry.maintenanceStatus === "done" ||
			entry.maintenanceStatus === "cancelled",
	);

	if (allFinished) {
		return "completed";
	}

	return "scheduled";
}

export function recalculateMaintenanceSummary(
	schedule: MaintenanceScheduleEntry[],
): ScheduleSummary {
	const totalEvents = schedule.length;
	const completedEvents = schedule.filter(
		(entry) => entry.maintenanceStatus === "done",
	).length;
	const overdueEvents = schedule.filter(
		(entry) => entry.maintenanceStatus === "overdue",
	).length;
	const pendingEvents = schedule.filter(
		(entry) => entry.maintenanceStatus === "pending",
	).length;
	const cancelledEvents = schedule.filter(
		(entry) => entry.maintenanceStatus === "cancelled",
	).length;
	const emittedAlerts = schedule.filter(
		(entry) => entry.alertStatus === "emitted",
	).length;

	return {
		nextDueDate: deriveMaintenanceNextDueDate(schedule),
		status: deriveMaintenanceStatus(schedule),
		totalEvents,
		completedEvents,
		overdueEvents,
		pendingEvents,
		cancelledEvents,
		emittedAlerts,
	};
}

/* -------------------------------------------------------------------------- */
/* High-level maintenance recalculation                                       */
/* -------------------------------------------------------------------------- */

export function buildMaintenanceState(
	payload: MaintenancePayload,
	options?: {
		today?: string | null;
		clientEmail?: string | null;
	},
): MaintenancePayload {
	const today = ensureTodayDate(options?.today);
	const clientEmail = normalizeString(options?.clientEmail);

	let nextSchedule: MaintenanceScheduleEntry[] = [];

	if (payload.generationMode === "automatic") {
		if (!shouldRebuildAutomaticSchedule(payload)) {
			nextSchedule = payload.schedule.map((entry, index) =>
				recalculateSingleScheduleRow({
					entry: {
						...entry,
						cycleIndex: index,
					},
					alertDaysBefore: payload.alertDaysBefore,
					notifyClient: payload.notifyClient,
					notifyInternal: payload.notifyInternal,
					clientEmail,
					today,
				}),
			);
		} else if (payload.schedule.length === 0) {
			nextSchedule = generateAutomaticSchedule({
				contractStartDate: payload.contractStartDate,
				contractEndDate: payload.contractEndDate,
				frequencyValue: payload.frequencyValue,
				frequencyUnit: payload.frequencyUnit,
				alertDaysBefore: payload.alertDaysBefore,
				isRecurring: payload.isRecurring,
				notifyClient: payload.notifyClient,
				notifyInternal: payload.notifyInternal,
				clientEmail,
				today,
			});
		} else {
			nextSchedule = recalculateScheduleFromFirstRow({
				schedule: payload.schedule.map((entry, index) => ({
					...entry,
					cycleIndex: index,
				})),
				contractEndDate: payload.contractEndDate,
				frequencyValue: payload.frequencyValue,
				frequencyUnit: payload.frequencyUnit,
				alertDaysBefore: payload.alertDaysBefore,
				isRecurring: payload.isRecurring,
				notifyClient: payload.notifyClient,
				notifyInternal: payload.notifyInternal,
				clientEmail,
				today,
			});
		}
	} else {
		nextSchedule = payload.schedule.map((entry, index) =>
			recalculateSingleScheduleRow({
				entry: {
					...entry,
					cycleIndex: index,
				},
				alertDaysBefore: payload.alertDaysBefore,
				notifyClient: payload.notifyClient,
				notifyInternal: payload.notifyInternal,
				clientEmail,
				today,
			}),
		);
	}

	const summary = recalculateMaintenanceSummary(nextSchedule);

	return {
		...payload,
		nextDueDate: summary.nextDueDate,
		status: summary.status,
		schedule: nextSchedule,
	};
}

/* -------------------------------------------------------------------------- */
/* Schedule row update dispatcher                                             */
/* -------------------------------------------------------------------------- */

export function applyScheduleRowUpdate(params: {
	schedule: MaintenanceScheduleEntry[];
	update: MaintenanceScheduleRowUpdate;
	alertDaysBefore: number | null;
	notifyClient: boolean;
	notifyInternal: boolean;
	clientEmail?: string | null;
	today?: string | null;
	generationMode: MaintenanceGenerationMode;
	contractEndDate: string | null;
	frequencyValue: number | null;
	frequencyUnit: MaintenanceFrequencyUnit | null;
	isRecurring: boolean;
}): MaintenanceScheduleEntry[] {
	const today = ensureTodayDate(params.today);
	const update = params.update;

	const currentIndex = params.schedule.findIndex(
		(entry) => entry.eventId === update.eventId,
	);

	if (currentIndex === -1) {
		return params.schedule;
	}

	switch (update.action) {
		case "set_maintenance_date": {
			const nextSchedule = params.schedule.map((entry, index) =>
				index === currentIndex
					? {
						...entry,
						maintenanceDate: extractDateOnly(update.maintenanceDate),
					}
					: entry,
			);

			if (params.generationMode === "automatic" && currentIndex === 0) {
				return recalculateScheduleFromFirstRow({
					schedule: nextSchedule,
					contractEndDate: params.contractEndDate,
					frequencyValue: params.frequencyValue,
					frequencyUnit: params.frequencyUnit,
					alertDaysBefore: params.alertDaysBefore,
					isRecurring: params.isRecurring,
					notifyClient: params.notifyClient,
					notifyInternal: params.notifyInternal,
					clientEmail: params.clientEmail,
					today,
				});
			}

			return nextSchedule.map((entry, index) =>
				index === currentIndex
					? recalculateSingleScheduleRow({
						entry: {
							...entry,
							cycleIndex: index,
						},
						alertDaysBefore: params.alertDaysBefore,
						notifyClient: params.notifyClient,
						notifyInternal: params.notifyInternal,
						clientEmail: params.clientEmail,
						today,
					})
					: entry,
			);
		}

		case "set_alert_emitted":
			return params.schedule.map((entry, index) =>
				index === currentIndex
					? toggleScheduleAlertEmitted({
						entry,
						emitted: update.emitted,
						alertDaysBefore: params.alertDaysBefore,
						notifyClient: params.notifyClient,
						notifyInternal: params.notifyInternal,
						clientEmail: params.clientEmail,
						today,
					})
					: entry,
			);

		case "set_completed":
			return params.schedule.map((entry, index) =>
				index === currentIndex
					? toggleScheduleCompleted({
						entry,
						completed: update.completed,
						completedByRole: update.completedByRole,
						alertDaysBefore: params.alertDaysBefore,
						notifyClient: params.notifyClient,
						notifyInternal: params.notifyInternal,
						clientEmail: params.clientEmail,
						today,
					})
					: entry,
			);

		case "set_status":
			return params.schedule.map((entry, index) =>
				index === currentIndex
					? updateScheduleRowStatus({
						entry,
						maintenanceStatus: update.maintenanceStatus,
						alertDaysBefore: params.alertDaysBefore,
						notifyClient: params.notifyClient,
						notifyInternal: params.notifyInternal,
						clientEmail: params.clientEmail,
						today,
					})
					: entry,
			);

		case "set_note":
			return params.schedule.map((entry, index) =>
				index === currentIndex
					? {
						...entry,
						note: normalizeString(update.note),
					}
					: entry,
			);

		default:
			return params.schedule;
	}
}

/* -------------------------------------------------------------------------- */
/* Entity helper                                                              */
/* -------------------------------------------------------------------------- */

export function recalculateMaintenanceEntity(
	entity: MaintenanceEntity,
	options?: {
		today?: string | null;
		clientEmail?: string | null;
	},
): MaintenanceEntity {
	const recalculated = buildMaintenanceState(entity, options);

	return {
		...entity,
		...recalculated,
	};
}