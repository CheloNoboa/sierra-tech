/**
 * =============================================================================
 * 📡 API Route: Admin Maintenance Settings
 * Path: src/app/api/admin/maintenance/settings/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo para leer y actualizar la configuración operativa
 * del módulo Maintenance.
 *
 * Propósito:
 * - exponer una única configuración global de Maintenance
 * - permitir administrar scheduler diario o semanal
 * - permitir administrar configuración de correos vía SMTP
 * - conservar auditoría básica de última ejecución
 *
 * Decisiones:
 * - no se soporta modo interval
 * - no se soporta proveedor Resend
 * - SMTP es el único proveedor habilitable
 * - disabled permite apagar correos sin apagar el scheduler
 *
 * Reglas:
 * - no guarda credenciales sensibles
 * - las credenciales reales viven en variables de entorno
 * - GET crea defaults si no existe configuración
 * - PUT actualiza solo campos administrables
 * - no usa any
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import MaintenanceSettings from "@/models/MaintenanceSettings";

import type {
	MaintenanceEmailProvider,
	MaintenanceLastRunStatus,
	MaintenanceSchedulerMode,
	MaintenanceSchedulerWeekday,
	MaintenanceSettingsEntity,
	MaintenanceSettingsPayload,
} from "@/types/maintenanceSettings";

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_SETTINGS: MaintenanceSettingsPayload = {
	schedulerEnabled: true,

	schedulerMode: "daily",

	dailyRunTime: "08:00",

	weeklyRunDays: ["mon"],
	weeklyRunTime: "08:00",

	timezone: "America/Guayaquil",
	manualRunEnabled: true,

	emailEnabled: false,
	emailProvider: "disabled",

	fromName: "Sierra Tech",
	fromEmail: "",
	replyToEmail: "",

	internalRecipients: [],

	lastRunAt: null,
	lastRunStatus: "never",
	lastRunMessage: "",
	lastRunDurationMs: null,
	lastRunProcessed: 0,
	lastRunAlertsGenerated: 0,
	lastRunEmailsSent: 0,
	lastRunEmailsFailed: 0,

	lastRunSource: "unknown",
	lastRunStartedAt: null,
	lastRunFinishedAt: null,
	lastRunUpdated: 0,
	lastRunEmailsSkipped: 0,
	lastRunRowsMarkedOverdue: 0,
	lastRunError: "",
};

type MaintenanceLastRunSource = "cron" | "manual" | "unknown";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeLastRunSource(value: unknown): MaintenanceLastRunSource {
	if (value === "cron" || value === "manual") return value;
	return "unknown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
	if (typeof value === "number" && Number.isFinite(value)) return value;

	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	return fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;

	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

function normalizeSchedulerMode(value: unknown): MaintenanceSchedulerMode {
	if (value === "weekly") return "weekly";
	return "daily";
}

function normalizeWeekday(value: unknown): MaintenanceSchedulerWeekday | null {
	if (
		value === "mon" ||
		value === "tue" ||
		value === "wed" ||
		value === "thu" ||
		value === "fri" ||
		value === "sat" ||
		value === "sun"
	) {
		return value;
	}

	return null;
}

function normalizeWeekdays(value: unknown): MaintenanceSchedulerWeekday[] {
	if (!Array.isArray(value)) return DEFAULT_SETTINGS.weeklyRunDays;

	const days = value
		.map(normalizeWeekday)
		.filter((item): item is MaintenanceSchedulerWeekday => item !== null);

	return days.length > 0
		? Array.from(new Set(days))
		: DEFAULT_SETTINGS.weeklyRunDays;
}

function normalizeTime(value: unknown, fallback: string): string {
	const text = normalizeString(value);

	if (!/^\d{2}:\d{2}$/.test(text)) {
		return fallback;
	}

	const [hourText, minuteText] = text.split(":");
	const hour = Number(hourText);
	const minute = Number(minuteText);

	if (
		Number.isInteger(hour) &&
		Number.isInteger(minute) &&
		hour >= 0 &&
		hour <= 23 &&
		minute >= 0 &&
		minute <= 59
	) {
		return text;
	}

	return fallback;
}

function normalizeEmailProvider(value: unknown): MaintenanceEmailProvider {
	if (value === "smtp") return "smtp";
	return "disabled";
}

function normalizeRecipients(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	return Array.from(
		new Set(
			value
				.map((item) => normalizeString(item).toLowerCase())
				.filter(Boolean),
		),
	);
}

function normalizeLastRunStatus(value: unknown): MaintenanceLastRunStatus {
	if (value === "success" || value === "failed") return value;
	return "never";
}

function normalizeNullableIsoString(value: unknown): string | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	}

	const text = normalizeString(value);
	if (!text) return null;

	const date = new Date(text);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeSettingsPayload(value: unknown): MaintenanceSettingsPayload {
	const source = isRecord(value) ? value : {};

	const emailEnabled = normalizeBoolean(
		source.emailEnabled,
		DEFAULT_SETTINGS.emailEnabled,
	);

	const emailProvider = emailEnabled
		? normalizeEmailProvider(source.emailProvider)
		: "disabled";

	return {
		schedulerEnabled: normalizeBoolean(
			source.schedulerEnabled,
			DEFAULT_SETTINGS.schedulerEnabled,
		),

		schedulerMode: normalizeSchedulerMode(source.schedulerMode),

		dailyRunTime: normalizeTime(
			source.dailyRunTime,
			DEFAULT_SETTINGS.dailyRunTime,
		),

		weeklyRunDays: normalizeWeekdays(source.weeklyRunDays),
		weeklyRunTime: normalizeTime(
			source.weeklyRunTime,
			DEFAULT_SETTINGS.weeklyRunTime,
		),

		timezone: normalizeString(source.timezone) || DEFAULT_SETTINGS.timezone,
		manualRunEnabled: normalizeBoolean(
			source.manualRunEnabled,
			DEFAULT_SETTINGS.manualRunEnabled,
		),

		emailEnabled,
		emailProvider,

		fromName: normalizeString(source.fromName) || DEFAULT_SETTINGS.fromName,
		fromEmail: normalizeString(source.fromEmail),
		replyToEmail: normalizeString(source.replyToEmail),

		internalRecipients: normalizeRecipients(source.internalRecipients),

		lastRunAt: normalizeNullableIsoString(source.lastRunAt),
		lastRunStatus: normalizeLastRunStatus(source.lastRunStatus),
		lastRunMessage: normalizeString(source.lastRunMessage),

		lastRunDurationMs: normalizeNullableNumber(source.lastRunDurationMs),
		lastRunProcessed: Math.max(0, normalizeNumber(source.lastRunProcessed, 0)),
		lastRunAlertsGenerated: Math.max(
			0,
			normalizeNumber(source.lastRunAlertsGenerated, 0),
		),
		lastRunEmailsSent: Math.max(
			0,
			normalizeNumber(source.lastRunEmailsSent, 0),
		),
		lastRunEmailsFailed: Math.max(
			0,
			normalizeNumber(source.lastRunEmailsFailed, 0),
		),
		lastRunSource: normalizeLastRunSource(source.lastRunSource),
		lastRunStartedAt: normalizeNullableIsoString(source.lastRunStartedAt),
		lastRunFinishedAt: normalizeNullableIsoString(source.lastRunFinishedAt),
		lastRunUpdated: Math.max(0, normalizeNumber(source.lastRunUpdated, 0)),
		lastRunEmailsSkipped: Math.max(
			0,
			normalizeNumber(source.lastRunEmailsSkipped, 0),
		),
		lastRunRowsMarkedOverdue: Math.max(
			0,
			normalizeNumber(source.lastRunRowsMarkedOverdue, 0),
		),
		lastRunError: normalizeString(source.lastRunError),
	};
}

function toEntity(value: unknown): MaintenanceSettingsEntity {
	const source = isRecord(value) ? value : {};
	const normalized = normalizeSettingsPayload(source);

	const rawId = source._id;
	const id =
		normalizeString(rawId) ||
		(rawId && typeof rawId === "object" && "toString" in rawId
			? normalizeString(rawId.toString())
			: "");

	const createdAt =
		source.createdAt instanceof Date
			? source.createdAt.toISOString()
			: normalizeString(source.createdAt);

	const updatedAt =
		source.updatedAt instanceof Date
			? source.updatedAt.toISOString()
			: normalizeString(source.updatedAt);

	return {
		...normalized,
		_id: id,
		createdAt,
		updatedAt,
	};
}

async function getOrCreateSettings() {
	const settings = await MaintenanceSettings.findOneAndUpdate(
		{ singletonKey: "maintenance-settings" },
		{
			$setOnInsert: {
				...DEFAULT_SETTINGS,
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

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
	try {
		await connectToDB();

		const settings = await getOrCreateSettings();

		return NextResponse.json({
			ok: true,
			item: toEntity(settings.toObject()),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Error loading maintenance settings.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(req: Request) {
	try {
		await connectToDB();

		const body = (await req.json().catch(() => null)) as unknown;
		const payload = normalizeSettingsPayload(body);

		const settings = await getOrCreateSettings();

		settings.set({
			schedulerEnabled: payload.schedulerEnabled,

			schedulerMode: payload.schedulerMode,

			dailyRunTime: payload.dailyRunTime,

			weeklyRunDays: payload.weeklyRunDays,
			weeklyRunTime: payload.weeklyRunTime,

			timezone: payload.timezone,
			manualRunEnabled: payload.manualRunEnabled,

			emailEnabled: payload.emailEnabled,
			emailProvider: payload.emailProvider,

			fromName: payload.fromName,
			fromEmail: payload.fromEmail,
			replyToEmail: payload.replyToEmail,

			internalRecipients: payload.internalRecipients,
		});

		await settings.save({ validateBeforeSave: true });

		return NextResponse.json({
			ok: true,
			item: toEntity(settings.toObject()),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Error saving maintenance settings.",
			},
			{ status: 500 },
		);
	}
}