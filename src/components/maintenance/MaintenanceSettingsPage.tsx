"use client";

/**
 * =============================================================================
 * 📄 Component: MaintenanceSettingsPage
 * Path: src/components/maintenance/MaintenanceSettingsPage.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa oficial para configurar el scheduler del módulo
 * Maintenance.
 *
 * Propósito:
 * - encender/apagar el scheduler de mantenimientos
 * - configurar ejecución diaria o semanal
 * - controlar ejecución manual desde admin
 * - configurar correos de alerta vía SMTP sin guardar credenciales sensibles
 * - mostrar auditoría de la última ejecución
 *
 * Decisiones:
 * - no se soporta modo interval
 * - no se soporta proveedor Resend
 * - SMTP es el único proveedor habilitable
 * - disabled permite apagar correos sin apagar el scheduler
 *
 * Reglas:
 * - no administra claves privadas ni passwords
 * - las credenciales reales viven en variables de entorno
 * - no contiene la lógica interna del job
 * - sin any
 * - sin alert()
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
	AlarmClock,
	Bell,
	CalendarDays,
	Clock,
	Mail,
	PlayCircle,
	RotateCcw,
	Save,
	Settings2,
} from "lucide-react";

import GlobalButton from "@/components/ui/GlobalButton";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

import type {
	MaintenanceEmailProvider,
	MaintenanceSchedulerMode,
	MaintenanceSchedulerWeekday,
	MaintenanceSettingsEntity,
	MaintenanceSettingsPayload,
} from "@/types/maintenanceSettings";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";

type SettingsResponse =
	| {
		ok: true;
		item: MaintenanceSettingsEntity;
	}
	| {
		ok: false;
		error: string;
	};

type RunNowResponse = {
	ok: boolean;
	message?: string;
	error?: string;
};

type SchedulerModeOption = {
	key: MaintenanceSchedulerMode;
	icon: ReactNode;
	title: string;
	description: string;
};

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_SETTINGS: MaintenanceSettingsPayload = {
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

const WEEKDAYS: MaintenanceSchedulerWeekday[] = [
	"mon",
	"tue",
	"wed",
	"thu",
	"fri",
	"sat",
	"sun",
];

const TIMEZONE_OPTIONS = [
	{ value: "America/Guayaquil", label: "Ecuador — America/Guayaquil" },
	{ value: "America/New_York", label: "EE. UU. Este — America/New_York" },
	{ value: "America/Chicago", label: "EE. UU. Central — America/Chicago" },
	{ value: "America/Denver", label: "EE. UU. Montaña — America/Denver" },
	{
		value: "America/Los_Angeles",
		label: "EE. UU. Pacífico — America/Los_Angeles",
	},
];

/* -------------------------------------------------------------------------- */
/* I18N                                                                       */
/* -------------------------------------------------------------------------- */

const TEXT = {
	es: {
		title: "Configuración de Maintenance",
		subtitle:
			"Programa el scheduler de mantenimientos con una ejecución diaria o semanal, y usa la ejecución manual cuando sea necesario.",
		loading: "Cargando configuración...",
		save: "Guardar configuración",
		saving: "Guardando...",
		saved: "Configuración guardada correctamente.",
		loadError: "No se pudo cargar la configuración de Maintenance.",
		saveError: "No se pudo guardar la configuración.",

		statusTitle: "Estado general",
		statusSubtitle:
			"Activa o detén el scheduler y permite ejecución manual controlada.",
		schedulerEnabled: "Scheduler encendido",
		schedulerDisabled: "Scheduler apagado",
		manualRunEnabled: "Ejecución manual disponible",
		manualRunDisabled: "Ejecución manual oculta",

		schedulerTitle: "Programación del scheduler",
		schedulerSubtitle:
			"Elige si el proceso automático se ejecuta diariamente o en días específicos.",
		dailyTitle: "Diario",
		dailyDescription: "Ejecutar todos los días a una hora fija.",
		weeklyTitle: "Semanal",
		weeklyDescription: "Ejecutar solo en días específicos.",
		dailyTime: "Hora diaria",
		weeklyDays: "Días de ejecución",
		weeklyTime: "Hora semanal",
		timezone: "Zona horaria",
		preview: "Resumen de programación",

		mon: "Lun",
		tue: "Mar",
		wed: "Mié",
		thu: "Jue",
		fri: "Vie",
		sat: "Sáb",
		sun: "Dom",

		emailTitle: "Correos de alerta",
		emailSubtitle:
			"Configura el comportamiento del envío de correos. Las credenciales no se guardan aquí.",
		emailEnabled: "Envío de correos activo",
		emailProvider: "Proveedor",
		disabled: "Desactivado",
		smtp: "SMTP",
		fromName: "Nombre remitente",
		fromEmail: "Correo remitente",
		replyToEmail: "Correo de respuesta",
		internalRecipients: "Destinatarios internos",
		internalRecipientsHint: "Separados por coma",
		credentialsNote:
			"El usuario, contraseña SMTP, host, puerto o tokens deben configurarse en variables de entorno, no en esta pantalla.",

		auditTitle: "Última ejecución",
		auditSubtitle:
			"Resultado registrado por el scheduler después de su última ejecución.",
		lastRunAt: "Fecha",
		lastRunStatus: "Estado",
		lastRunDuration: "Duración",
		lastRunProcessed: "Procesados",
		lastRunAlertsGenerated: "Alertas",
		lastRunEmailsSent: "Correos enviados",
		lastRunEmailsFailed: "Correos fallidos",
		lastRunSource: "Origen",
		lastRunStartedAt: "Inicio",
		lastRunFinishedAt: "Fin",
		lastRunUpdated: "Actualizados",
		lastRunEmailsSkipped: "Correos omitidos",
		lastRunRowsMarkedOverdue: "Vencidos marcados",
		lastRunError: "Error",
		cron: "Cron",
		manual: "Manual",
		unknown: "Desconocido",
		lastRunMessage: "Mensaje",
		success: "Exitosa",
		failed: "Fallida",
		never: "Nunca",
		runNow: "Ejecutar ahora",
		runningNow: "Ejecutando...",
		runNowSuccess: "Scheduler ejecutado correctamente.",
		runNowError: "No se pudo ejecutar el scheduler.",
	},
	en: {
		title: "Maintenance Settings",
		subtitle:
			"Schedule the maintenance scheduler with a daily or weekly execution, and use manual execution when needed.",
		loading: "Loading settings...",
		save: "Save settings",
		saving: "Saving...",
		saved: "Settings saved successfully.",
		loadError: "Could not load Maintenance settings.",
		saveError: "Could not save settings.",

		statusTitle: "General status",
		statusSubtitle:
			"Enable or stop the scheduler and allow controlled manual execution.",
		schedulerEnabled: "Scheduler enabled",
		schedulerDisabled: "Scheduler disabled",
		manualRunEnabled: "Manual execution available",
		manualRunDisabled: "Manual execution hidden",

		schedulerTitle: "Scheduler schedule",
		schedulerSubtitle:
			"Choose whether the automatic process runs daily or on selected weekdays.",
		dailyTitle: "Daily",
		dailyDescription: "Run every day at a fixed time.",
		weeklyTitle: "Weekly",
		weeklyDescription: "Run only on selected weekdays.",
		dailyTime: "Daily time",
		weeklyDays: "Run days",
		weeklyTime: "Weekly time",
		timezone: "Timezone",
		preview: "Schedule summary",

		mon: "Mon",
		tue: "Tue",
		wed: "Wed",
		thu: "Thu",
		fri: "Fri",
		sat: "Sat",
		sun: "Sun",

		emailTitle: "Alert emails",
		emailSubtitle: "Configure email behavior. Credentials are not stored here.",
		emailEnabled: "Email sending enabled",
		emailProvider: "Provider",
		disabled: "Disabled",
		smtp: "SMTP",
		fromName: "Sender name",
		fromEmail: "Sender email",
		replyToEmail: "Reply-to email",
		internalRecipients: "Internal recipients",
		internalRecipientsHint: "Comma separated",
		credentialsNote:
			"SMTP user, password, host, port or tokens must be configured as environment variables, not in this screen.",

		auditTitle: "Last run",
		auditSubtitle: "Result recorded by the scheduler after its last execution.",
		lastRunAt: "Date",
		lastRunStatus: "Status",
		lastRunDuration: "Duration",
		lastRunProcessed: "Processed",
		lastRunAlertsGenerated: "Alerts",
		lastRunEmailsSent: "Emails sent",
		lastRunEmailsFailed: "Emails failed",
		lastRunSource: "Source",
		lastRunStartedAt: "Started",
		lastRunFinishedAt: "Finished",
		lastRunUpdated: "Updated",
		lastRunEmailsSkipped: "Emails skipped",
		lastRunRowsMarkedOverdue: "Rows marked overdue",
		lastRunError: "Error",
		cron: "Cron",
		manual: "Manual",
		unknown: "Unknown",
		lastRunMessage: "Message",
		success: "Success",
		failed: "Failed",
		never: "Never",
		runNow: "Run now",
		runningNow: "Running...",
		runNowSuccess: "Scheduler executed successfully.",
		runNowError: "Scheduler could not be executed.",
	},
} satisfies Record<Locale, Record<string, string>>;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function serializeSettings(value: MaintenanceSettingsPayload): string {
	return JSON.stringify(value);
}

function recipientsToText(value: string[]): string {
	return value.join(", ");
}

function textToRecipients(value: string): string[] {
	return Array.from(
		new Set(
			value
				.split(",")
				.map((item) => item.trim().toLowerCase())
				.filter(Boolean),
		),
	);
}

function formatDateTime(value: string | null, locale: Locale): string {
	if (!value) return "—";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

function formatDuration(value: number | null): string {
	if (value === null) return "—";
	if (value < 1000) return `${value} ms`;
	return `${(value / 1000).toFixed(2)} s`;
}

function getStatusLabel(
	status: MaintenanceSettingsPayload["lastRunStatus"],
	t: (typeof TEXT)[Locale],
): string {
	if (status === "success") return t.success;
	if (status === "failed") return t.failed;
	return t.never;
}

function getSourceLabel(
	source: MaintenanceSettingsPayload["lastRunSource"],
	t: (typeof TEXT)[Locale],
): string {
	if (source === "cron") return t.cron;
	if (source === "manual") return t.manual;
	return t.unknown;
}

function getWeekdayLabel(
	day: MaintenanceSchedulerWeekday,
	t: (typeof TEXT)[Locale],
): string {
	return t[day];
}

function buildSchedulePreview(
	form: MaintenanceSettingsPayload,
	t: (typeof TEXT)[Locale],
): string {
	if (!form.schedulerEnabled) {
		return t.schedulerDisabled;
	}

	if (form.schedulerMode === "weekly") {
		const days = form.weeklyRunDays
			.map((day) => getWeekdayLabel(day, t))
			.join(", ");

		return `${t.weeklyTitle}: ${days} · ${form.weeklyRunTime} · ${form.timezone}`;
	}

	return `${t.dailyTitle}: ${form.dailyRunTime} · ${form.timezone}`;
}

function mapEntityToPayload(item: MaintenanceSettingsEntity): MaintenanceSettingsPayload {
	return {
		schedulerEnabled: item.schedulerEnabled,

		schedulerMode: item.schedulerMode,

		dailyRunTime: item.dailyRunTime,

		weeklyRunDays: item.weeklyRunDays,
		weeklyRunTime: item.weeklyRunTime,

		timezone: item.timezone,
		manualRunEnabled: item.manualRunEnabled,

		emailEnabled: item.emailEnabled,
		emailProvider: item.emailProvider,

		fromName: item.fromName,
		fromEmail: item.fromEmail,
		replyToEmail: item.replyToEmail,

		internalRecipients: item.internalRecipients,

		lastRunAt: item.lastRunAt,
		lastRunStatus: item.lastRunStatus,
		lastRunMessage: item.lastRunMessage,
		lastRunDurationMs: item.lastRunDurationMs,
		lastRunProcessed: item.lastRunProcessed,
		lastRunAlertsGenerated: item.lastRunAlertsGenerated,
		lastRunEmailsSent: item.lastRunEmailsSent,
		lastRunEmailsFailed: item.lastRunEmailsFailed,

		lastRunSource: item.lastRunSource,
		lastRunStartedAt: item.lastRunStartedAt,
		lastRunFinishedAt: item.lastRunFinishedAt,
		lastRunUpdated: item.lastRunUpdated,
		lastRunEmailsSkipped: item.lastRunEmailsSkipped,
		lastRunRowsMarkedOverdue: item.lastRunRowsMarkedOverdue,
		lastRunError: item.lastRunError,
	};
}

/* -------------------------------------------------------------------------- */
/* Small UI blocks                                                            */
/* -------------------------------------------------------------------------- */

function SectionCard({
	title,
	subtitle,
	icon,
	children,
}: {
	title: string;
	subtitle: string;
	icon: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
				<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
					{icon}
				</div>

				<div>
					<h2 className="text-xl font-bold tracking-tight text-text-primary">
						{title}
					</h2>
					<p className="mt-1 text-sm leading-7 text-text-secondary">
						{subtitle}
					</p>
				</div>
			</div>

			{children}
		</section>
	);
}

function FieldLabel({
	children,
	hint,
}: {
	children: ReactNode;
	hint?: string;
}) {
	return (
		<div className="mb-1.5 flex items-center justify-between gap-3">
			<label className="text-xs font-medium text-text-secondary">
				{children}
			</label>
			{hint ? <span className="text-[11px] text-text-muted">{hint}</span> : null}
		</div>
	);
}

function ToggleCard({
	active,
	title,
	subtitle,
	icon,
	onClick,
}: {
	active: boolean;
	title: string;
	subtitle: string;
	icon: ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={[
				"flex min-h-[104px] w-full items-start gap-4 rounded-3xl border p-5 text-left transition",
				active
					? "border-brand-primary bg-brand-primary/10 shadow-sm ring-1 ring-brand-primary/20"
					: "border-border bg-surface hover:border-brand-primary/40 hover:bg-brand-primary/5",
			].join(" ")}
		>
			<div
				className={[
					"rounded-2xl p-3",
					active
						? "bg-brand-primary text-white"
						: "bg-white text-brand-primaryStrong",
				].join(" ")}
			>
				{icon}
			</div>

			<div>
				<p className="text-sm font-bold text-text-primary">{title}</p>
				<p className="mt-1 text-xs leading-5 text-text-secondary">{subtitle}</p>
			</div>
		</button>
	);
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="rounded-2xl border border-border bg-surface px-4 py-4">
			<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
				{label}
			</p>
			<p className="mt-2 text-sm font-semibold text-text-primary">{value}</p>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function MaintenanceSettingsPage() {
	const toast = useToast();
	const { locale } = useTranslation();

	const lang: Locale = locale === "en" ? "en" : "es";
	const t = TEXT[lang];

	const [form, setForm] = useState<MaintenanceSettingsPayload>(EMPTY_SETTINGS);
	const [snapshot, setSnapshot] = useState(serializeSettings(EMPTY_SETTINGS));

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [runningNow, setRunningNow] = useState(false);
	const [error, setError] = useState("");

	const [manualRunVisible, setManualRunVisible] = useState(false);

	const hasChanges = useMemo(
		() => serializeSettings(form) !== snapshot,
		[form, snapshot],
	);

	const canSave = hasChanges && !loading && !saving;

	const schedulerModeOptions: SchedulerModeOption[] = useMemo(
		() => [
			{
				key: "daily",
				icon: <AlarmClock className="h-5 w-5" />,
				title: t.dailyTitle,
				description: t.dailyDescription,
			},
			{
				key: "weekly",
				icon: <CalendarDays className="h-5 w-5" />,
				title: t.weeklyTitle,
				description: t.weeklyDescription,
			},
		],
		[t],
	);

	useEffect(() => {
		let cancelled = false;

		async function loadSettings() {
			try {
				setLoading(true);
				setError("");

				const response = await fetch("/api/admin/maintenance/settings", {
					method: "GET",
					cache: "no-store",
				});

				const json = (await response
					.json()
					.catch(() => null)) as SettingsResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setError(json && !json.ok ? json.error : t.loadError);
					return;
				}

				const next = mapEntityToPayload(json.item);

				setForm(next);
				setSnapshot(serializeSettings(next));
				setManualRunVisible(false);
			} catch (err) {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : t.loadError);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void loadSettings();

		return () => {
			cancelled = true;
		};
	}, [t.loadError]);

	function patch<K extends keyof MaintenanceSettingsPayload>(
		key: K,
		value: MaintenanceSettingsPayload[K],
	) {
		setForm((current) => ({
			...current,
			[key]: value,
		}));
	}

	function toggleWeekday(day: MaintenanceSchedulerWeekday) {
		setForm((current) => {
			const exists = current.weeklyRunDays.includes(day);
			const nextDays = exists
				? current.weeklyRunDays.filter((item) => item !== day)
				: [...current.weeklyRunDays, day];

			return {
				...current,
				weeklyRunDays: nextDays.length > 0 ? nextDays : [day],
			};
		});
	}

	async function handleSave() {
		if (!canSave) return;

		try {
			setSaving(true);
			setError("");

			const payload: MaintenanceSettingsPayload = {
				...form,
				emailProvider: form.emailEnabled ? form.emailProvider : "disabled",
			};

			const response = await fetch("/api/admin/maintenance/settings", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const json = (await response
				.json()
				.catch(() => null)) as SettingsResponse | null;

			if (!response.ok || !json || !json.ok) {
				const message = json && !json.ok ? json.error : t.saveError;
				setError(message);
				toast.error(message);
				return;
			}

			const next = mapEntityToPayload(json.item);

			setForm(next);
			setSnapshot(serializeSettings(next));
			setManualRunVisible(false);
			toast.success(t.saved);
		} catch (err) {
			const message = err instanceof Error ? err.message : t.saveError;
			setError(message);
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	async function handleRunNow() {
		if (runningNow) return;

		try {
			setRunningNow(true);
			setError("");

			const response = await fetch("/api/admin/maintenance/run", {
				method: "POST",
				cache: "no-store",
			});

			const json = (await response.json().catch(() => null)) as
				| RunNowResponse
				| null;

			if (!response.ok || !json || !json.ok) {
				const message = json?.message || json?.error || t.runNowError;
				setError(message);
				toast.error(message);
				return;
			}

			toast.success(json.message || t.runNowSuccess);
		} catch (err) {
			const message = err instanceof Error ? err.message : t.runNowError;
			setError(message);
			toast.error(message);
		} finally {
			setRunningNow(false);
		}
	}

	if (loading) {
		return (
			<div className="rounded-[28px] border border-border bg-white p-6 text-sm text-text-secondary shadow-sm">
				{t.loading}
			</div>
		);
	}

	return (
		<div className="space-y-6 pb-24">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="max-w-3xl">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
							Maintenance
						</p>

						<h1 className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
							{t.title}
						</h1>

						<p className="mt-3 text-base leading-8 text-text-secondary">
							{t.subtitle}
						</p>
					</div>

					<GlobalButton
						variant="primary"
						disabled={!canSave}
						onClick={() => void handleSave()}
						className="inline-flex items-center gap-2"
					>
						<Save className="h-4 w-4" />
						{saving ? t.saving : t.save}
					</GlobalButton>
				</div>
			</section>

			{error ? (
				<section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-rose-700">{error}</p>
				</section>
			) : null}

			<SectionCard
				title={t.statusTitle}
				subtitle={t.statusSubtitle}
				icon={<Settings2 className="h-5 w-5" />}
			>
				<div className="grid gap-4 md:grid-cols-2">
					<ToggleCard
						active={form.schedulerEnabled}
						title={
							form.schedulerEnabled
								? t.schedulerEnabled
								: t.schedulerDisabled
						}
						subtitle={t.schedulerSubtitle}
						icon={<PowerIcon />}
						onClick={() => patch("schedulerEnabled", !form.schedulerEnabled)}
					/>

					<ToggleCard
						active={manualRunVisible}
						title={manualRunVisible ? t.manualRunEnabled : t.manualRunDisabled}
						subtitle={t.preview}
						icon={<PlayCircle className="h-5 w-5" />}
						onClick={() => setManualRunVisible((current) => !current)}
					/>
				</div>

				{manualRunVisible ? (
					<div className="mt-4">
						<button
							type="button"
							disabled={runningNow}
							onClick={() => void handleRunNow()}
							className="
								w-full rounded-2xl border border-brand-primary
								bg-brand-primary py-3 text-sm font-semibold text-white
								transition hover:opacity-90
								disabled:cursor-not-allowed disabled:opacity-60
							"
						>
							{runningNow ? t.runningNow : t.runNow}
						</button>
					</div>
				) : null}
			</SectionCard>

			<SectionCard
				title={t.schedulerTitle}
				subtitle={t.schedulerSubtitle}
				icon={<AlarmClock className="h-5 w-5" />}
			>
				<div className="space-y-6">
					<div className="grid gap-4 xl:grid-cols-2">
						{schedulerModeOptions.map((option) => (
							<ToggleCard
								key={option.key}
								active={form.schedulerMode === option.key}
								title={option.title}
								subtitle={option.description}
								icon={option.icon}
								onClick={() => patch("schedulerMode", option.key)}
							/>
						))}
					</div>

					<div className="rounded-[24px] border border-border bg-surface p-5">
						<div className="grid gap-5 xl:grid-cols-2">
							<div>
								<FieldLabel>{t.timezone}</FieldLabel>
								<select
									value={form.timezone}
									onChange={(event) => patch("timezone", event.currentTarget.value)}
									className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
								>
									{TIMEZONE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<FieldLabel>{t.preview}</FieldLabel>
								<div className="flex min-h-12 items-center rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-text-primary">
									{buildSchedulePreview(form, t)}
								</div>
							</div>

							{form.schedulerMode === "daily" ? (
								<div>
									<FieldLabel>{t.dailyTime}</FieldLabel>
									<input
										type="time"
										value={form.dailyRunTime}
										onChange={(event) =>
											patch("dailyRunTime", event.currentTarget.value)
										}
										className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
									/>
								</div>
							) : null}

							{form.schedulerMode === "weekly" ? (
								<>
									<div className="xl:col-span-2">
										<FieldLabel>{t.weeklyDays}</FieldLabel>

										<div className="grid grid-cols-7 gap-2">
											{WEEKDAYS.map((day) => {
												const selected = form.weeklyRunDays.includes(day);

												return (
													<button
														key={day}
														type="button"
														onClick={() => toggleWeekday(day)}
														className={[
															"h-14 rounded-2xl border text-sm font-bold transition",
															selected
																? "border-brand-primary bg-brand-primary text-white shadow-sm"
																: "border-border bg-white text-text-primary hover:border-brand-primary/40 hover:bg-brand-primary/5",
														].join(" ")}
													>
														{getWeekdayLabel(day, t)}
													</button>
												);
											})}
										</div>
									</div>

									<div>
										<FieldLabel>{t.weeklyTime}</FieldLabel>
										<input
											type="time"
											value={form.weeklyRunTime}
											onChange={(event) =>
												patch("weeklyRunTime", event.currentTarget.value)
											}
											className="h-12 w-full rounded-2xl border border-border bg-white px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
										/>
									</div>
								</>
							) : null}
						</div>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={t.emailTitle}
				subtitle={t.emailSubtitle}
				icon={<Mail className="h-5 w-5" />}
			>
				<div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					{t.credentialsNote}
				</div>

				<div className="grid gap-5 xl:grid-cols-2">
					<label className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
						<input
							type="checkbox"
							checked={form.emailEnabled}
							onChange={(event) => {
								const checked = event.currentTarget.checked;

								setForm((current) => ({
									...current,
									emailEnabled: checked,
									emailProvider: checked ? "smtp" : "disabled",
								}));
							}}
							className="h-4 w-4"
						/>
						<span>{t.emailEnabled}</span>
					</label>

					<div>
						<FieldLabel>{t.emailProvider}</FieldLabel>
						<select
							value={form.emailProvider}
							onChange={(event) =>
								patch(
									"emailProvider",
									event.currentTarget.value as MaintenanceEmailProvider,
								)
							}
							disabled={!form.emailEnabled}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong disabled:cursor-not-allowed disabled:opacity-60"
						>
							<option value="disabled">{t.disabled}</option>
							<option value="smtp">{t.smtp}</option>
						</select>
					</div>

					<div>
						<FieldLabel>{t.fromName}</FieldLabel>
						<input
							value={form.fromName}
							onChange={(event) => patch("fromName", event.currentTarget.value)}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<FieldLabel>{t.fromEmail}</FieldLabel>
						<input
							value={form.fromEmail}
							onChange={(event) =>
								patch("fromEmail", event.currentTarget.value)
							}
							placeholder="alerts@sierratech.ec"
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<FieldLabel>{t.replyToEmail}</FieldLabel>
						<input
							value={form.replyToEmail}
							onChange={(event) =>
								patch("replyToEmail", event.currentTarget.value)
							}
							placeholder="soporte@sierratech.ec"
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<FieldLabel hint={t.internalRecipientsHint}>
							{t.internalRecipients}
						</FieldLabel>
						<input
							value={recipientsToText(form.internalRecipients)}
							onChange={(event) =>
								patch(
									"internalRecipients",
									textToRecipients(event.currentTarget.value),
								)
							}
							placeholder="admin@sierratech.ec, soporte@sierratech.ec"
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={t.auditTitle}
				subtitle={t.auditSubtitle}
				icon={<Bell className="h-5 w-5" />}
			>
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<StatCard label={t.lastRunSource} value={getSourceLabel(form.lastRunSource, t)} />
					<StatCard label={t.lastRunStatus} value={getStatusLabel(form.lastRunStatus, t)} />
					<StatCard label={t.lastRunStartedAt} value={formatDateTime(form.lastRunStartedAt, lang)} />
					<StatCard label={t.lastRunFinishedAt} value={formatDateTime(form.lastRunFinishedAt, lang)} />
					<StatCard label={t.lastRunDuration} value={formatDuration(form.lastRunDurationMs)} />
					<StatCard label={t.lastRunProcessed} value={form.lastRunProcessed} />
					<StatCard label={t.lastRunUpdated} value={form.lastRunUpdated} />
					<StatCard label={t.lastRunAlertsGenerated} value={form.lastRunAlertsGenerated} />
					<StatCard label={t.lastRunEmailsSent} value={form.lastRunEmailsSent} />
					<StatCard label={t.lastRunEmailsFailed} value={form.lastRunEmailsFailed} />
					<StatCard label={t.lastRunEmailsSkipped} value={form.lastRunEmailsSkipped} />
					<StatCard label={t.lastRunRowsMarkedOverdue} value={form.lastRunRowsMarkedOverdue} />
					<StatCard label={t.lastRunMessage} value={normalizeString(form.lastRunMessage) || "—"} />
					<StatCard label={t.lastRunError} value={normalizeString(form.lastRunError) || "—"} />
				</div>

				<div className="mt-5 flex items-center gap-2 text-xs text-text-muted">
					<RotateCcw className="h-4 w-4" />
					<span>{hasChanges ? t.save : t.saved}</span>
				</div>
			</SectionCard>

			<div className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-2xl border border-border bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
				<Clock className="h-4 w-4 text-brand-primaryStrong" />
				<span className="text-sm text-text-secondary">
					{hasChanges ? t.save : t.saved}
				</span>
			</div>
		</div>
	);
}

function PowerIcon() {
	return (
		<span className="relative flex h-5 w-5 items-center justify-center">
			<span className="absolute h-4 w-4 rounded-full border-2 border-current" />
			<span className="absolute -top-0.5 h-2.5 w-0.5 rounded-full bg-current" />
		</span>
	);
}