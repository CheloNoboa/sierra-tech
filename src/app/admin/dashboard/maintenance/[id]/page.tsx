"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Maintenance Detail
 * Path: src/app/admin/dashboard/maintenance/[id]/page.tsx
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GlobalConfirm from "@/components/ui/GlobalConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

import type {
	MaintenanceEntity,
	MaintenanceExecutionStatus,
	MaintenanceFrequencyUnit,
	MaintenanceGenerationMode,
	MaintenanceScheduleEntry,
	MaintenanceStatus,
	MaintenanceType,
} from "@/types/maintenance";

import { normalizeMaintenanceEntity } from "@/lib/maintenance/maintenance.normalize";

import {
	DEFAULT_APP_DATE_FORMAT,
	formatAppDate,
	type AppDateFormat,
} from "@/lib/format/date.format";

type MaintenanceDetailResponse =
	| { ok: true; item: MaintenanceEntity }
	| { ok: false; error: string };

type MaintenanceUpdateResponse =
	| { ok: true; item: MaintenanceEntity }
	| { ok: false; error: string; details?: string[] };

type Locale = "es" | "en";

const TEXT: Record<
	Locale,
	{
		loading: string;
		invalidMaintenance: string;
		loadError: string;
		loadFallbackError: string;
		back: string;
		save: string;
		saving: string;
		saveSuccess: string;
		saveError: string;
		unsavedChanges: string;
		changesSaved: string;
		leaveTitle: string;
		leaveMessage: string;
		leaveCancel: string;
		leaveConfirm: string;
		regenerateTitle: string;
		regenerateButton: string;
		regenerateMessage: string;
		regenerateCancel: string;
		regenerateConfirm: string;
		regenerateBlocked: string;
		regenerateError: string;
		regenerateSuccess: (rows: number) => string;
		addManualRow: string;
		addManualRowSuccess: string;
		scheduleTitle: string;
		scheduleSubtitle: string;
		noRowsTitle: string;
		noRowsDescription: string;
		configuration: string;
		status: string;
		rows: string;
		next: string;
		changes: string;
		title: string;
		type: string;
		mode: string;
		frequency: string;
		unit: string;
		alertDaysBefore: string;
		recurring: string;
		notifyClient: string;
		notifyInternal: string;
		start: string;
		duration: string;
		end: string;
		months: string;
		tableNumber: string;
		tableDate: string;
		tableAlert: string;
		tableStatus: string;
		tableCompleted: string;
		tableCompletedBy: string;
		tableNote: string;
		tableActions: string;
		pending: string;
		done: string;
		overdue: string;
		cancelled: string;
		cancel: string;
		reactivate: string;
		delete: string;
		client: string;
		internal: string;
		maintenanceStatusLabels: Record<MaintenanceStatus, string>;
		executionStatusLabels: Record<MaintenanceExecutionStatus, string>;
		maintenanceTypeLabels: Record<MaintenanceType, string>;
		generationModeLabels: Record<MaintenanceGenerationMode, string>;
		frequencyUnitLabels: Record<MaintenanceFrequencyUnit, string>;
	}
> = {
	es: {
		loading: "Cargando...",
		invalidMaintenance: "Maintenance inválido.",
		loadError: "No se pudo cargar el maintenance.",
		loadFallbackError: "Error de carga.",
		back: "← Volver",
		save: "Guardar",
		saving: "Guardando...",
		saveSuccess: "Mantenimiento guardado correctamente.",
		saveError: "No se pudo guardar.",
		unsavedChanges: "Cambios sin guardar",
		changesSaved: "Guardado",
		leaveTitle: "Cambios sin guardar",
		leaveMessage:
			"Tienes cambios sin guardar. Si sales ahora, perderás los cambios realizados.",
		leaveCancel: "Seguir editando",
		leaveConfirm: "Salir sin guardar",
		regenerateTitle: "Recalcular programación",
		regenerateButton: "Recalcular programación",
		regenerateMessage:
			"Esta acción regenerará la programación automática y reemplazará las filas actuales del schedule. Los cambios manuales se perderán si continúas.",
		regenerateCancel: "Cancelar",
		regenerateConfirm: "Recalcular",
		regenerateBlocked:
			"No se puede regenerar automáticamente porque ya existen mantenimientos realizados.",
		regenerateError:
			"No se pudo generar el schedule. Revisa inicio de contrato, fin de contrato y frecuencia.",
		regenerateSuccess: (rows) =>
			`Schedule regenerado: ${rows} filas. Falta guardar.`,
		addManualRow: "Agregar fila manual",
		addManualRowSuccess: "Fila manual agregada. Falta guardar.",
		scheduleTitle: "Schedule operativo",
		scheduleSubtitle:
			"Genera, edita y guarda la tabla operativa del mantenimiento.",
		noRowsTitle: "No hay filas en el schedule.",
		noRowsDescription: "Usa “Recalcular programación” o “Agregar fila manual”.",
		configuration: "Configuración",
		status: "Estado",
		rows: "Filas",
		next: "Próxima",
		changes: "Cambios",
		title: "Título",
		type: "Tipo",
		mode: "Modo",
		frequency: "Frecuencia",
		unit: "Unidad",
		alertDaysBefore: "Días antes para alerta",
		recurring: "Recurrente",
		notifyClient: "Notificar cliente",
		notifyInternal: "Notificar interno",
		start: "Inicio",
		duration: "Duración",
		end: "Fin",
		months: "meses",
		tableNumber: "#",
		tableDate: "Fecha",
		tableAlert: "Alerta",
		tableStatus: "Estado",
		tableCompleted: "Realizado",
		tableCompletedBy: "Realizado por",
		tableNote: "Nota",
		tableActions: "Acciones",
		pending: "Pendiente",
		done: "Realizado",
		overdue: "Vencido",
		cancelled: "Cancelado",
		cancel: "Cancelar",
		reactivate: "Reactivar",
		delete: "Eliminar",
		client: "Cliente",
		internal: "Sierra Tech",
		maintenanceStatusLabels: {
			scheduled: "Programado",
			active: "Activo",
			completed: "Completado",
			overdue: "Vencido",
			cancelled: "Cancelado",
		},
		executionStatusLabels: {
			pending: "Pendiente",
			done: "Realizado",
			overdue: "Vencido",
			cancelled: "Cancelado",
		},
		maintenanceTypeLabels: {
			preventive: "Preventivo",
			corrective: "Correctivo",
			cleaning: "Limpieza",
			inspection: "Inspección",
			replacement: "Reemplazo",
			other: "Otro",
		},
		generationModeLabels: {
			automatic: "Automático",
			manual: "Manual",
		},
		frequencyUnitLabels: {
			days: "Días",
			weeks: "Semanas",
			months: "Meses",
			years: "Años",
		},
	},
	en: {
		loading: "Loading...",
		invalidMaintenance: "Invalid maintenance.",
		loadError: "Maintenance could not be loaded.",
		loadFallbackError: "Loading error.",
		back: "← Back",
		save: "Save",
		saving: "Saving...",
		saveSuccess: "Maintenance saved successfully.",
		saveError: "Could not save.",
		unsavedChanges: "Unsaved changes",
		changesSaved: "Saved",
		leaveTitle: "Unsaved changes",
		leaveMessage:
			"You have unsaved changes. If you leave now, your changes will be lost.",
		leaveCancel: "Keep editing",
		leaveConfirm: "Leave without saving",
		regenerateTitle: "Recalculate schedule",
		regenerateButton: "Recalculate schedule",
		regenerateMessage:
			"This action will regenerate the automatic schedule and replace the current schedule rows. Manual changes will be lost if you continue.",
		regenerateCancel: "Cancel",
		regenerateConfirm: "Recalculate",
		regenerateBlocked:
			"Automatic regeneration is not allowed because completed maintenance rows already exist.",
		regenerateError:
			"Could not generate the schedule. Check contract start date, contract end date, and frequency.",
		regenerateSuccess: (rows) =>
			`Schedule regenerated: ${rows} rows. Save is still required.`,
		addManualRow: "Add manual row",
		addManualRowSuccess: "Manual row added. Save is still required.",
		scheduleTitle: "Operational schedule",
		scheduleSubtitle: "Generate, edit, and save the maintenance schedule.",
		noRowsTitle: "There are no schedule rows.",
		noRowsDescription: "Use “Recalculate schedule” or “Add manual row”.",
		configuration: "Configuration",
		status: "Status",
		rows: "Rows",
		next: "Next",
		changes: "Changes",
		title: "Title",
		type: "Type",
		mode: "Mode",
		frequency: "Frequency",
		unit: "Unit",
		alertDaysBefore: "Alert days before",
		recurring: "Recurring",
		notifyClient: "Notify client",
		notifyInternal: "Notify internal team",
		start: "Start",
		duration: "Duration",
		end: "End",
		months: "months",
		tableNumber: "#",
		tableDate: "Date",
		tableAlert: "Alert",
		tableStatus: "Status",
		tableCompleted: "Completed",
		tableCompletedBy: "Completed by",
		tableNote: "Note",
		tableActions: "Actions",
		pending: "Pending",
		done: "Completed",
		overdue: "Overdue",
		cancelled: "Cancelled",
		cancel: "Cancel",
		reactivate: "Reactivate",
		delete: "Delete",
		client: "Client",
		internal: "Sierra Tech",
		maintenanceStatusLabels: {
			scheduled: "Scheduled",
			active: "Active",
			completed: "Completed",
			overdue: "Overdue",
			cancelled: "Cancelled",
		},
		executionStatusLabels: {
			pending: "Pending",
			done: "Completed",
			overdue: "Overdue",
			cancelled: "Cancelled",
		},
		maintenanceTypeLabels: {
			preventive: "Preventive",
			corrective: "Corrective",
			cleaning: "Cleaning",
			inspection: "Inspection",
			replacement: "Replacement",
			other: "Other",
		},
		generationModeLabels: {
			automatic: "Automatic",
			manual: "Manual",
		},
		frequencyUnitLabels: {
			days: "Days",
			weeks: "Weeks",
			months: "Months",
			years: "Years",
		},
	},
};

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function toDateInput(value: string | null | undefined): string {
	if (!value) return "";
	return value.split("T")[0] ?? "";
}

function toNullableNumber(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(
	value: string | null | undefined,
	dateFormat: AppDateFormat,
): string {
	return formatAppDate(value, dateFormat);
}

function addInterval(
	dateValue: string,
	amount: number,
	unit: MaintenanceFrequencyUnit,
): string {
	const date = new Date(`${dateValue}T00:00:00`);

	if (unit === "days") date.setDate(date.getDate() + amount);
	if (unit === "weeks") date.setDate(date.getDate() + amount * 7);
	if (unit === "months") date.setMonth(date.getMonth() + amount);
	if (unit === "years") date.setFullYear(date.getFullYear() + amount);

	return date.toISOString().split("T")[0] ?? dateValue;
}

function subtractDays(dateValue: string, days: number): string {
	const date = new Date(`${dateValue}T00:00:00`);
	date.setDate(date.getDate() - Math.max(0, days));
	return date.toISOString().split("T")[0] ?? dateValue;
}

function createEventId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `maintenance-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createScheduleRow(
	maintenanceDate: string,
	alertDaysBefore: number,
	cycleIndex: number,
): MaintenanceScheduleEntry {
	return {
		eventId: createEventId(),
		cycleIndex,
		maintenanceDate,
		alertDate: subtractDays(maintenanceDate, alertDaysBefore),
		alertStatus: "pending",
		maintenanceStatus: "pending",
		channels: ["platform", "email"],
		recipients: ["internal"],
		recipientEmail: "",
		emittedAt: null,
		completedAt: null,
		completed: false,
		completedByRole: null,
		note: "",
	};
}

function generateAutomaticRows(form: MaintenanceEntity): MaintenanceScheduleEntry[] {
	const startDate = toDateInput(form.contractStartDate);
	const endDate = toDateInput(form.contractEndDate);
	const frequencyValue = form.frequencyValue ?? 0;
	const frequencyUnit = form.frequencyUnit ?? "months";
	const alertDaysBefore = form.alertDaysBefore ?? 0;

	if (!startDate || !endDate || frequencyValue <= 0) return [];

	const rows: MaintenanceScheduleEntry[] = [];
	let currentDate = startDate;
	let index = 0;

	while (currentDate <= endDate && index < 240) {
		rows.push(createScheduleRow(currentDate, alertDaysBefore, index));
		currentDate = addInterval(currentDate, frequencyValue, frequencyUnit);
		index += 1;
	}

	return rows;
}

function recalculateRowsFromFirstDate(
	form: MaintenanceEntity,
	firstDate: string,
): MaintenanceScheduleEntry[] {
	const endDate = toDateInput(form.contractEndDate);
	const frequencyValue = form.frequencyValue ?? 0;
	const frequencyUnit = form.frequencyUnit ?? "months";
	const alertDaysBefore = form.alertDaysBefore ?? 0;

	if (!firstDate || !endDate || frequencyValue <= 0) return form.schedule;

	const rows: MaintenanceScheduleEntry[] = [];
	let currentDate = firstDate;
	let index = 0;

	while (currentDate <= endDate && index < 240) {
		const existingRow = form.schedule[index];

		rows.push({
			...(existingRow ?? createScheduleRow(currentDate, alertDaysBefore, index)),
			eventId: existingRow?.eventId ?? createEventId(),
			cycleIndex: index,
			maintenanceDate: currentDate,
			alertDate: subtractDays(currentDate, alertDaysBefore),
		});

		currentDate = addInterval(currentDate, frequencyValue, frequencyUnit);
		index += 1;
	}

	return rows;
}

function deriveNextDueDate(schedule: MaintenanceScheduleEntry[]): string | null {
	const nextRow = schedule.find(
		(row) =>
			row.maintenanceStatus !== "done" &&
			row.maintenanceStatus !== "cancelled",
	);

	return nextRow?.maintenanceDate ?? null;
}

function deriveStatus(schedule: MaintenanceScheduleEntry[]): MaintenanceStatus {
	if (schedule.length === 0) return "scheduled";

	const activeRows = schedule.filter(
		(row) => row.maintenanceStatus !== "cancelled",
	);

	if (activeRows.length === 0) return "cancelled";

	const completedRows = activeRows.filter(
		(row) => row.maintenanceStatus === "done" || row.completed,
	);

	if (completedRows.length === activeRows.length) return "completed";

	if (activeRows.some((row) => row.maintenanceStatus === "overdue")) {
		return "overdue";
	}

	return "active";
}

function serialize(value: MaintenanceEntity | null): string {
	return JSON.stringify(value);
}

export default function AdminMaintenanceDetailPage() {
	const params = useParams<{ id: string }>();
	const maintenanceId = normalizeString(params?.id);
	const router = useRouter();
	const toast = useToast();
	const dateFormat: AppDateFormat = DEFAULT_APP_DATE_FORMAT;

	const { locale } = useTranslation();
	const lang: Locale = locale === "en" ? "en" : "es";
	const t = TEXT[lang];

	const [form, setForm] = useState<MaintenanceEntity | null>(null);
	const [snapshot, setSnapshot] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
	const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

	const hasChanges = useMemo(() => {
		if (!form) return false;
		return serialize(form) !== snapshot;
	}, [form, snapshot]);

	useEffect(() => {
		if (!hasChanges) return;

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			event.returnValue = "";
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasChanges]);

	const localNextDueDate = useMemo(() => {
		if (!form) return null;
		return deriveNextDueDate(form.schedule) ?? form.nextDueDate;
	}, [form]);

	const canSave = useMemo(() => {
		if (!form || loading || saving) return false;
		return Boolean(normalizeString(form.title));
	}, [form, loading, saving]);

	const hasCompletedScheduleRows = useMemo(() => {
		if (!form) return false;

		return form.schedule.some(
			(row) => row.completed || row.maintenanceStatus === "done",
		);
	}, [form]);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			if (!maintenanceId) {
				setError(t.invalidMaintenance);
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				setError("");
				setSuccess("");

				const response = await fetch(`/api/admin/maintenance/${maintenanceId}`, {
					method: "GET",
					cache: "no-store",
				});

				const json = (await response
					.json()
					.catch(() => null)) as MaintenanceDetailResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setForm(null);
					setSnapshot("");
					setError(
						json && !json.ok ? json.error : t.loadError,
					);
					return;
				}

				const normalized = normalizeMaintenanceEntity(json.item);
				setForm(normalized);
				setSnapshot(serialize(normalized));
			} catch (err) {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : t.loadFallbackError);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [maintenanceId, t.invalidMaintenance, t.loadError, t.loadFallbackError]);

	const handleBack = useCallback(() => {
		if (hasChanges) {
			setLeaveConfirmOpen(true);
			return;
		}

		router.push("/admin/dashboard/maintenance");
	}, [hasChanges, router]);

	async function saveMaintenance() {
		if (!form || !canSave) return;

		try {
			setSaving(true);
			setError("");
			setSuccess("");

			const response = await fetch(`/api/admin/maintenance/${maintenanceId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...form,
					nextDueDate: deriveNextDueDate(form.schedule),
					status: deriveStatus(form.schedule),
				}),
			});

			const json = (await response
				.json()
				.catch(() => null)) as MaintenanceUpdateResponse | null;

			if (!response.ok || !json || !json.ok) {
				const details =
					json && !json.ok && json.details?.length
						? ` ${json.details.join(" ")}`
						: "";

				setError(
					json && !json.ok
						? `${json.error}${details}`.trim()
						: t.saveError,
				);
				return;
			}

			const normalized = normalizeMaintenanceEntity(json.item);
			setForm(normalized);
			setSnapshot(serialize(normalized));
			setSuccess(t.saveSuccess);
			toast.success(t.saveSuccess);
		} catch (err) {
			const message = err instanceof Error ? err.message : t.saveError;

			setError(message);
			toast.error(message);
		} finally {
			setSaving(false);
		}
	}

	function updateForm(updater: (current: MaintenanceEntity) => MaintenanceEntity) {
		setForm((current) => {
			if (!current) return current;

			const updated = updater(current);
			return {
				...updated,
				nextDueDate: deriveNextDueDate(updated.schedule),
				status: deriveStatus(updated.schedule),
			};
		});
	}

	function updateRow(
		eventId: string,
		updater: (row: MaintenanceScheduleEntry) => MaintenanceScheduleEntry,
	) {
		updateForm((current) => ({
			...current,
			generationMode: "manual",
			schedule: current.schedule.map((row) =>
				row.eventId === eventId ? updater(row) : row,
			),
		}));
	}

	function requestAutomaticRegeneration() {
		if (!form) return;

		if (hasCompletedScheduleRows) {
			toast.warning(t.regenerateBlocked);
			return;
		}

		setRegenerateConfirmOpen(true);
	}

	function confirmAutomaticRegeneration() {
		if (!form) return;

		const rows = generateAutomaticRows(form);

		if (rows.length === 0) {
			setRegenerateConfirmOpen(false);
			setSuccess("");
			setError(t.regenerateError);
			return;
		}

		setRegenerateConfirmOpen(false);
		setError("");
		setSuccess(t.regenerateSuccess(rows.length));

		updateForm((current) => ({
			...current,
			generationMode: "automatic",
			schedule: rows,
		}));
	}

	function handleAddManualRow() {
		if (!form) return;

		setError("");
		setSuccess(t.addManualRowSuccess);

		updateForm((current) => {
			const lastRow = current.schedule[current.schedule.length - 1];

			const baseDate = lastRow
				? addInterval(
					toDateInput(lastRow.maintenanceDate),
					current.frequencyValue ?? 1,
					current.frequencyUnit ?? "months",
				)
				: toDateInput(current.contractStartDate) ||
				new Date().toISOString().split("T")[0] ||
				"";

			return {
				...current,
				generationMode: "manual",
				schedule: [
					...current.schedule,
					createScheduleRow(
						baseDate,
						current.alertDaysBefore ?? 0,
						current.schedule.length,
					),
				],
			};
		});
	}

	if (loading) {
		return <div className="p-6 text-sm text-text-secondary">{t.loading}</div>;
	}

	if (!form) {
		return (
			<div className="space-y-4 px-6 py-6">
				<button
					type="button"
					onClick={handleBack}
					className="text-sm font-semibold text-text-secondary hover:text-text-primary"
				>
					{t.back}
				</button>

				<p className="text-sm text-rose-700">
					{error || t.loadError}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-5 px-6 pb-24">
			<div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<button
							type="button"
							onClick={handleBack}
							className="text-sm font-semibold text-text-secondary hover:text-text-primary"
						>
							{t.back}
						</button>

						<h1 className="mt-3 text-2xl font-bold text-text-primary">
							{form.title || t.title}
						</h1>

						<p className="mt-1 text-sm text-text-secondary">
							{form.organizationName} · {form.projectTitle} ·{" "}
							<strong>{t.maintenanceStatusLabels[form.status] ?? "—"}</strong>
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={requestAutomaticRegeneration}
							className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
						>
							{t.regenerateButton}
						</button>

						<button
							type="button"
							onClick={handleAddManualRow}
							className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary"
						>
							{t.addManualRow}
						</button>

						<button
							type="button"
							onClick={() => void saveMaintenance()}
							disabled={!canSave}
							className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
						>
							{saving ? t.saving : t.save}
						</button>
					</div>
				</div>

				<div className="mt-4 grid gap-3 md:grid-cols-4">
					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.status}: <strong>{t.maintenanceStatusLabels[form.status] ?? "—"}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.rows}: <strong>{form.schedule.length}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.next}: <strong>{formatDate(localNextDueDate, dateFormat)}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.changes}: <strong>{hasChanges ? t.unsavedChanges : t.changesSaved}</strong>
					</div>
				</div>
			</div>

			{error ? (
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
					{error}
				</div>
			) : null}

			{success ? (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
					{success}
				</div>
			) : null}

			<section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-bold text-text-primary">
							{t.scheduleTitle}
						</h2>
						<p className="mt-1 text-sm text-text-secondary">
							{t.scheduleSubtitle}
						</p>
					</div>

					{hasChanges ? (
						<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
							{t.unsavedChanges}
						</span>
					) : null}
				</div>

				{form.schedule.length === 0 ? (
					<div className="mt-4 rounded-xl border border-dashed border-border bg-surface p-5">
						<p className="text-sm font-semibold text-text-primary">
							{t.noRowsTitle}
						</p>
						<p className="mt-1 text-sm text-text-secondary">
							{t.noRowsDescription}
						</p>
					</div>
				) : (
					<div className="mt-4 overflow-x-auto rounded-xl border border-border">
						<table className="min-w-[1120px] w-full text-sm">
							<thead className="bg-surface text-left text-xs uppercase text-text-secondary">
								<tr>
									<th className="px-3 py-3">{t.tableNumber}</th>
									<th className="px-3 py-3">{t.tableDate}</th>
									<th className="px-3 py-3">{t.tableAlert}</th>
									<th className="px-3 py-3">{t.tableStatus}</th>
									<th className="px-3 py-3">{t.tableCompleted}</th>
									<th className="px-3 py-3">{t.tableCompletedBy}</th>
									<th className="px-3 py-3">{t.tableNote}</th>
									<th className="px-3 py-3">{t.tableActions}</th>
								</tr>
							</thead>

							<tbody>
								{form.schedule.map((row, index) => (
									<tr key={row.eventId} className="border-t border-border">
										<td className="px-3 py-3">{index + 1}</td>

										<td className="px-3 py-3">
											<input
												type="date"
												value={toDateInput(row.maintenanceDate)}
												onChange={(event) => {
													const value = event.currentTarget.value;

													updateForm((current) => {
														if (
															current.generationMode === "automatic" &&
															index === 0
														) {
															return {
																...current,
																schedule: recalculateRowsFromFirstDate(
																	current,
																	value,
																),
															};
														}

														return {
															...current,
															generationMode: "manual",
															schedule: current.schedule.map((item) =>
																item.eventId === row.eventId
																	? {
																		...item,
																		maintenanceDate: value,
																		alertDate: subtractDays(
																			value,
																			current.alertDaysBefore ?? 0,
																		),
																	}
																	: item,
															),
														};
													});
												}}
												className="h-9 rounded-lg border border-border bg-white px-2 text-sm"
											/>
										</td>

										<td className="px-3 py-3">{formatDate(row.alertDate, dateFormat)}</td>

										<td className="px-3 py-3">
											<select
												value={row.maintenanceStatus}
												onChange={(event) => {
													const value = event.currentTarget
														.value as MaintenanceExecutionStatus;

													updateRow(row.eventId, (current) => ({
														...current,
														maintenanceStatus: value,
														completed: value === "done",
														completedAt:
															value === "done"
																? new Date().toISOString().split("T")[0] ?? null
																: null,
														completedByRole:
															value === "done" ? "internal" : null,
													}));
												}}
												className="h-9 rounded-lg border border-border bg-white px-2 text-sm"
											>
												<option value="pending">{t.pending}</option>
												<option value="done">{t.done}</option>
												<option value="overdue">{t.overdue}</option>
												<option value="cancelled">{t.cancelled}</option>
											</select>
										</td>

										<td className="px-3 py-3">
											<input
												type="checkbox"
												checked={row.completed}
												onChange={(event) => {
													const checked = event.currentTarget.checked;

													updateRow(row.eventId, (current) => ({
														...current,
														completed: checked,
														completedAt: checked
															? new Date().toISOString().split("T")[0] ?? null
															: null,
														maintenanceStatus: checked ? "done" : "pending",
														completedByRole: checked ? "internal" : null,
													}));
												}}
											/>
										</td>

										<td className="px-3 py-3">
											{row.completedByRole === "client"
												? t.client
												: row.completedByRole === "internal"
													? t.internal
													: "—"}
										</td>

										<td className="px-3 py-3">
											<input
												value={row.note}
												onChange={(event) => {
													const value = event.currentTarget.value;
													updateRow(row.eventId, (current) => ({
														...current,
														note: value,
													}));
												}}
												className="h-9 w-64 rounded-lg border border-border bg-white px-2 text-sm"
											/>
										</td>

										<td className="px-3 py-3">
											<div className="flex gap-2">
												<button
													type="button"
													disabled={row.completed || row.maintenanceStatus === "done"}
													onClick={() => {
														updateRow(row.eventId, (current) => ({
															...current,
															maintenanceStatus:
																current.maintenanceStatus === "cancelled"
																	? "pending"
																	: "cancelled",
															completed: false,
															completedAt: null,
															completedByRole: null,
														}));
													}}
													className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
												>
													{row.maintenanceStatus === "cancelled" ? t.reactivate : t.cancel}
												</button>

												<button
													type="button"
													disabled={row.completed || row.maintenanceStatus === "done"}
													onClick={() => {
														updateForm((current) => ({
															...current,
															generationMode: "manual",
															schedule: current.schedule.filter(
																(item) => item.eventId !== row.eventId,
															),
														}));
													}}
													className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
												>
													{t.delete}
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
				<h2 className="text-lg font-bold text-text-primary">{t.configuration}</h2>

				<div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<div>
						<label className="mb-1 block text-xs text-text-secondary">
							{t.title}
						</label>
						<input
							value={form.title}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateForm((current) => ({ ...current, title: value }));
							}}
							className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
						/>
					</div>

					<div>
						<label className="mb-1 block text-xs text-text-secondary">
							{t.type}
						</label>
						<select
							value={form.maintenanceType}
							onChange={(event) => {
								const value = event.currentTarget.value as MaintenanceType;
								updateForm((current) => ({
									...current,
									maintenanceType: value,
								}));
							}}
							className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
						>
							<option value="preventive">{t.maintenanceTypeLabels.preventive}</option>
							<option value="corrective">{t.maintenanceTypeLabels.corrective}</option>
							<option value="cleaning">{t.maintenanceTypeLabels.cleaning}</option>
							<option value="inspection">{t.maintenanceTypeLabels.inspection}</option>
							<option value="replacement">{t.maintenanceTypeLabels.replacement}</option>
							<option value="other">{t.maintenanceTypeLabels.other}</option>
						</select>
					</div>

					<div>
						<label className="mb-1 block text-xs text-text-secondary">
							{t.mode}
						</label>
						<select
							value={form.generationMode}
							onChange={(event) => {
								const value = event.currentTarget
									.value as MaintenanceGenerationMode;

								updateForm((current) => ({
									...current,
									generationMode: value,
								}));
							}}
							className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
						>
							<option value="automatic">{t.generationModeLabels.automatic}</option>
							<option value="manual">{t.generationModeLabels.manual}</option>
						</select>
					</div>

					<div>
						<label className="mb-1 block text-xs text-text-secondary">
							{t.frequency}
						</label>
						<input
							type="number"
							min={1}
							value={form.frequencyValue ?? ""}
							onChange={(event) => {
								const value = toNullableNumber(event.currentTarget.value);
								updateForm((current) => ({
									...current,
									frequencyValue: value,
								}));
							}}
							className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
						/>
					</div>

					<div>
						<label className="mb-1 block text-xs text-text-secondary">
							{t.unit}
						</label>
						<select
							value={form.frequencyUnit ?? "months"}
							onChange={(event) => {
								const value = event.currentTarget
									.value as MaintenanceFrequencyUnit;

								updateForm((current) => ({
									...current,
									frequencyUnit: value,
								}));
							}}
							className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
						>
							<option value="days">{t.frequencyUnitLabels.days}</option>
							<option value="weeks">{t.frequencyUnitLabels.weeks}</option>
							<option value="months">{t.frequencyUnitLabels.months}</option>
							<option value="years">{t.frequencyUnitLabels.years}</option>
						</select>
					</div>

					<div>
						<label className="mb-1 block text-xs text-text-secondary">
							{t.alertDaysBefore}
						</label>
						<input
							type="number"
							min={0}
							value={form.alertDaysBefore ?? ""}
							onChange={(event) => {
								const value = toNullableNumber(event.currentTarget.value);

								updateForm((current) => ({
									...current,
									alertDaysBefore: value,
									schedule: current.schedule.map((row) => ({
										...row,
										alertDate: subtractDays(
											toDateInput(row.maintenanceDate),
											value ?? 0,
										),
									})),
								}));
							}}
							className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"
						/>
					</div>

					<label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm">
						<input
							type="checkbox"
							checked={form.isRecurring}
							onChange={(event) => {
								const checked = event.currentTarget.checked;
								updateForm((current) => ({
									...current,
									isRecurring: checked,
								}));
							}}
						/>
						{t.recurring}
					</label>

					<label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm">
						<input
							type="checkbox"
							checked={form.notifyClient}
							onChange={(event) => {
								const checked = event.currentTarget.checked;
								updateForm((current) => ({
									...current,
									notifyClient: checked,
								}));
							}}
						/>
						{t.notifyClient}
					</label>

					<label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm">
						<input
							type="checkbox"
							checked={form.notifyInternal}
							onChange={(event) => {
								const checked = event.currentTarget.checked;
								updateForm((current) => ({
									...current,
									notifyInternal: checked,
								}));
							}}
						/>
						{t.notifyInternal}
					</label>
				</div>

				<div className="mt-4 grid gap-4 md:grid-cols-3">
					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.start}: <strong>{formatDate(form.contractStartDate, dateFormat)}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.duration}:{" "}
						<strong>
							{form.contractDurationMonths
								? `${form.contractDurationMonths} ${t.months}`
								: "—"}
						</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.end}: <strong>{formatDate(form.contractEndDate, dateFormat)}</strong>
					</div>
				</div>
			</section>

			<div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-xl">
				{hasChanges ? (
					<span className="text-xs font-bold text-amber-700">
						{t.unsavedChanges}
					</span>
				) : null}

				<button
					type="button"
					onClick={() => void saveMaintenance()}
					disabled={!canSave}
					className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
				>
					{saving ? t.saving : t.save}
				</button>
			</div>
			<GlobalConfirm
				open={regenerateConfirmOpen}
				title={t.regenerateTitle}
				message={t.regenerateMessage}
				cancelLabel={t.regenerateCancel}
				confirmLabel={t.regenerateConfirm}
				loading={false}
				onCancel={() => setRegenerateConfirmOpen(false)}
				onConfirm={confirmAutomaticRegeneration}
			/>

			<GlobalConfirm
				open={leaveConfirmOpen}
				title={t.leaveTitle}
				message={t.leaveMessage}
				cancelLabel={t.leaveCancel}
				confirmLabel={t.leaveConfirm}
				loading={false}
				onCancel={() => setLeaveConfirmOpen(false)}
				onConfirm={() => {
					setLeaveConfirmOpen(false);
					router.push("/admin/dashboard/maintenance");
				}}
			/>
		</div>
	);
}