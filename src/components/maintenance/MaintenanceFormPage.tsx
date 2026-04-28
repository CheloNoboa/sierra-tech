"use client";

/**
 * =============================================================================
 * 📄 Component: MaintenanceFormPage
 * Path: src/components/maintenance/MaintenanceFormPage.tsx
 * =============================================================================
 *
 * ES:
 * Formulario unificado del módulo Maintenance.
 *
 * Propósito:
 * - crear y editar mantenimientos desde una sola pantalla
 * - gestionar el schedule como fuente de verdad
 *
 * Uso:
 * - mode="create" → /admin/dashboard/maintenance/new
 * - mode="edit"   → /admin/dashboard/maintenance/[id]
 *
 * Alcance:
 * - selección de organización y proyecto
 * - carga de contexto contractual del proyecto
 * - configuración base del mantenimiento
 * - generación y edición del schedule
 * - persistencia:
 *   - POST → create
 *   - PUT  → update
 *
 * Reglas:
 * - el schedule define el estado del mantenimiento
 * - una fila = una ejecución
 * - la primera fila puede recalcular la secuencia
 * - las demás filas solo afectan su propia entrada
 *
 * Decisiones:
 * - una sola UI para create y edit
 * - página completa (sin modal)
 * - tipado estricto (sin any)
 * - sin alert()
 *
 * EN:
 * Unified form for creating and editing Maintenance entities.
 *
 * Purpose:
 * - manage maintenance configuration and schedule in a single UI
 * - treat schedule as the source of truth
 * =============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	Building2,
	CalendarClock,
	Info,
	Settings2,
	Wrench,
} from "lucide-react";

import GlobalConfirm from "@/components/ui/GlobalConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";
import { useTranslation } from "@/hooks/useTranslation";

import {
	addFrequencyDateOnly,
	buildScheduleEntry,
	extractDateOnly,
	generateAutomaticSchedule,
	recalculateMaintenanceSummary,
	recalculateScheduleFromFirstRow,
	recalculateSingleScheduleRow,
} from "@/lib/maintenance/maintenance.engine";

import {
	createEmptyMaintenancePayload,
	normalizeMaintenanceEntity,
} from "@/lib/maintenance/maintenance.normalize";

import {
	DEFAULT_APP_DATE_FORMAT,
	formatAppDate,
	type AppDateFormat,
} from "@/lib/format/date.format";

import type {
	MaintenanceEntity,
	MaintenanceExecutionStatus,
	MaintenanceFrequencyUnit,
	MaintenanceGenerationMode,
	MaintenanceProjectContext,
	MaintenanceScheduleEntry,
	MaintenanceStatus,
	MaintenanceType,
	MaintenanceWritePayload,
} from "@/types/maintenance";

import FormActionsHeader from "@/components/ui/FormActionsHeader";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type MaintenanceFormMode = "create" | "edit";

type MaintenanceFormPageProps = {
	mode: MaintenanceFormMode;
};

type Locale = "es" | "en";

type MaintenanceDetailResponse =
	| { ok: true; item: MaintenanceEntity }
	| { ok: false; error: string };

type MaintenanceSaveResponse =
	| { ok: true; item: MaintenanceEntity }
	| { ok: false; error: string; details?: string[] };

type MaintenanceContextOrganizationOption = {
	_id: string;
	name: string;
	email: string;
};

type MaintenanceContextProjectOption = {
	_id: string;
	title: string;
	slug: string;
	status: string;
	contractStartDate: string | null;
	contractDurationMonths: number | null;
	contractEndDate: string | null;
};

type MaintenanceContextResponse =
	| {
		ok: true;
		organizations: MaintenanceContextOrganizationOption[];
		projects: MaintenanceContextProjectOption[];
		projectContext: MaintenanceProjectContext | null;
	}
	| { ok: false; error: string };


type MaintenanceAlertStatus = "pending" | "emitted";
type MaintenanceEmailStatus = "pending" | "sent" | "failed" | "skipped";

type MaintenanceScheduleEntryAdmin = MaintenanceScheduleEntry & {
	alertStatus?: MaintenanceAlertStatus;
	emittedAt?: string | null;
	emailStatus?: MaintenanceEmailStatus;
	emailSentAt?: string | null;
	emailError?: string;
};

/* -------------------------------------------------------------------------- */
/* I18N                                                                       */
/* -------------------------------------------------------------------------- */

const TEXT: Record<
	Locale,
	{
		back: string;
		eyebrow: string;
		createTitle: string;
		editTitleFallback: string;
		createSubtitle: string;
		editSubtitle: string;
		generateSchedule: string;
		createMaintenance: string;
		saveMaintenance: string;
		saving: string;
		loading: string;
		invalidMaintenance: string;
		loadError: string;
		loadFallbackError: string;
		saveSuccess: string;
		createSuccess: string;
		saveError: string;
		createError: string;
		unsavedChanges: string;
		changesSaved: string;
		leaveTitle: string;
		leaveMessage: string;
		leaveCancel: string;
		leaveConfirm: string;
		contextTitle: string;
		contextSubtitle: string;
		organization: string;
		selectOrganization: string;
		project: string;
		selectProject: string;
		contextLoadError: string;
		projectContextError: string;
		contractTitle: string;
		contractSubtitle: string;
		contractStart: string;
		contractDuration: string;
		contractEnd: string;
		months: string;
		baseConfigTitle: string;
		baseConfigSubtitle: string;
		titleField: string;
		titlePlaceholder: string;
		type: string;
		description: string;
		descriptionPlaceholder: string;
		generationMode: string;
		frequency: string;
		unit: string;
		alertDaysBefore: string;
		recurring: string;
		notifyClient: string;
		notifyInternal: string;
		scheduleTitle: string;
		scheduleSubtitle: string;
		addManualRow: string;
		rows: string;
		next: string;
		noRows: string;
		number: string;
		date: string;
		alert: string;
		status: string;
		completed: string;
		completedBy: string;
		note: string;
		actions: string;
		delete: string;
		cancel: string;
		reactivate: string;
		client: string;
		internal: string;
		instructionsTitle: string;
		instructionsSubtitle: string;
		instructions: string;
		instructionsPlaceholder: string;
		notes: string;
		notesPlaceholder: string;
		flowTitle: string;
		flowText: string;
		loadingBaseData: string;
		generateScheduleError: string;
		scheduleGenerated: (rows: number) => string;
		manualRowAdded: string;
		regenerateTitle: string;
		regenerateMessage: string;
		regenerateCancel: string;
		regenerateConfirm: string;
		regenerateBlocked: string;
		maintenanceStatusLabels: Record<MaintenanceStatus, string>;
		executionStatusLabels: Record<MaintenanceExecutionStatus, string>;
		maintenanceTypeLabels: Record<MaintenanceType, string>;
		generationModeLabels: Record<MaintenanceGenerationMode, string>;
		frequencyUnitLabels: Record<MaintenanceFrequencyUnit, string>;
		alertStatus: string;
		emittedAt: string;
		emailStatus: string;
		emailSentAt: string;
		emailError: string;
		channels: string;
		recipients: string;
		recipientEmail: string;
	}
> = {
	es: {
		back: "Volver",
		eyebrow: "Mantenimiento",
		createTitle: "Nuevo mantenimiento",
		editTitleFallback: "Mantenimiento",
		createSubtitle:
			"Selecciona organización y proyecto, recupera el contexto contractual real, genera la programación y guarda la entidad.",
		editSubtitle:
			"Administra la configuración y el schedule operativo del mantenimiento.",
		generateSchedule: "Generar programación",
		createMaintenance: "Crear mantenimiento",
		saveMaintenance: "Guardar mantenimiento",
		saving: "Guardando...",
		loading: "Cargando...",
		invalidMaintenance: "Maintenance inválido.",
		loadError: "No se pudo cargar el maintenance.",
		loadFallbackError: "Error de carga.",
		saveSuccess: "Mantenimiento guardado correctamente.",
		createSuccess: "Mantenimiento creado correctamente.",
		saveError: "No se pudo guardar.",
		createError: "No se pudo crear el mantenimiento.",
		unsavedChanges: "Cambios sin guardar",
		changesSaved: "Guardado",
		leaveTitle: "Cambios sin guardar",
		leaveMessage:
			"Tienes cambios sin guardar. Si sales ahora, perderás los cambios realizados.",
		leaveCancel: "Seguir editando",
		leaveConfirm: "Salir sin guardar",
		contextTitle: "Contexto base",
		contextSubtitle:
			"Selecciona la organización y el proyecto para recuperar la base contractual real.",
		organization: "Organización",
		selectOrganization: "Seleccionar organización",
		project: "Proyecto",
		selectProject: "Seleccionar proyecto",
		contextLoadError: "No se pudo cargar el contexto de Maintenance.",
		projectContextError:
			"No se pudo recuperar el contexto contractual del proyecto.",
		contractTitle: "Contrato recuperado",
		contractSubtitle:
			"Estos datos vienen del proyecto seleccionado y sirven de base para la generación automática.",
		contractStart: "Inicio contrato",
		contractDuration: "Duración",
		contractEnd: "Fin contrato",
		months: "meses",
		baseConfigTitle: "Configuración base",
		baseConfigSubtitle:
			"Define la identidad y comportamiento principal del mantenimiento.",
		titleField: "Título",
		titlePlaceholder: "Ej. Mantenimiento preventivo trimestral",
		type: "Tipo",
		description: "Descripción",
		descriptionPlaceholder: "Describe el alcance general del mantenimiento.",
		generationMode: "Modo de generación",
		frequency: "Frecuencia",
		unit: "Unidad",
		alertDaysBefore: "Días previos de alerta",
		recurring: "Recurrente",
		notifyClient: "Notificar cliente",
		notifyInternal: "Notificar interno",
		scheduleTitle: "Programación",
		scheduleSubtitle:
			"Genera o construye manualmente la tabla antes de guardar el mantenimiento.",
		addManualRow: "Agregar fila manual",
		rows: "filas",
		next: "próxima",
		noRows:
			"No hay filas. Genera la programación o agrega filas manuales antes de guardar.",
		number: "#",
		date: "Fecha",
		alert: "Alerta",
		status: "Estado",
		completed: "Realizado",
		completedBy: "Realizado por",
		note: "Nota",
		actions: "Acciones",
		delete: "Eliminar",
		cancel: "Cancelar",
		reactivate: "Reactivar",
		client: "Cliente",
		internal: "Sierra Tech",
		instructionsTitle: "Notas e instrucciones",
		instructionsSubtitle: "Base descriptiva adicional del mantenimiento.",
		instructions: "Instrucciones",
		instructionsPlaceholder: "Instrucciones operativas del mantenimiento.",
		notes: "Notas",
		notesPlaceholder: "Notas internas o de seguimiento.",
		flowTitle: "Flujo del mantenimiento",
		flowText:
			"El mantenimiento se guarda con su programación. Luego puedes volver al detalle para operar filas, marcar realizados y ajustar alertas.",
		loadingBaseData: "Cargando datos base del módulo...",
		generateScheduleError:
			"No se pudo generar la programación. Revisa proyecto, contrato, frecuencia, unidad y notificaciones.",
		scheduleGenerated: (rows) => `Programación generada: ${rows} filas.`,
		manualRowAdded: "Fila manual agregada. Falta guardar.",
		regenerateTitle: "Recalcular programación",
		regenerateMessage:
			"Esta acción regenerará la programación automática y reemplazará las filas actuales del schedule. Los cambios manuales se perderán si continúas.",
		regenerateCancel: "Cancelar",
		regenerateConfirm: "Recalcular",
		regenerateBlocked:
			"No se puede regenerar automáticamente porque ya existen mantenimientos realizados.",
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
		alertStatus: "Alerta",
		emittedAt: "Generada",
		emailStatus: "Correo",
		emailSentAt: "Enviado",
		emailError: "Error correo",
		channels: "Canales",
		recipients: "Destinatarios",
		recipientEmail: "Email",
	},
	en: {
		back: "Back",
		eyebrow: "Maintenance",
		createTitle: "New maintenance",
		editTitleFallback: "Maintenance",
		createSubtitle:
			"Select organization and project, retrieve the real contract context, generate the schedule, and save the entity.",
		editSubtitle:
			"Manage maintenance configuration and operational schedule.",
		generateSchedule: "Generate schedule",
		createMaintenance: "Create maintenance",
		saveMaintenance: "Save maintenance",
		saving: "Saving...",
		loading: "Loading...",
		invalidMaintenance: "Invalid maintenance.",
		loadError: "Maintenance could not be loaded.",
		loadFallbackError: "Loading error.",
		saveSuccess: "Maintenance saved successfully.",
		createSuccess: "Maintenance created successfully.",
		saveError: "Could not save.",
		createError: "Maintenance could not be created.",
		unsavedChanges: "Unsaved changes",
		changesSaved: "Saved",
		leaveTitle: "Unsaved changes",
		leaveMessage:
			"You have unsaved changes. If you leave now, your changes will be lost.",
		leaveCancel: "Keep editing",
		leaveConfirm: "Leave without saving",
		contextTitle: "Base context",
		contextSubtitle:
			"Select the organization and project to retrieve the real contract baseline.",
		organization: "Organization",
		selectOrganization: "Select organization",
		project: "Project",
		selectProject: "Select project",
		contextLoadError: "Maintenance context could not be loaded.",
		projectContextError: "Project contract context could not be retrieved.",
		contractTitle: "Retrieved contract",
		contractSubtitle:
			"These values come from the selected project and are used as the baseline for automatic generation.",
		contractStart: "Contract start",
		contractDuration: "Duration",
		contractEnd: "Contract end",
		months: "months",
		baseConfigTitle: "Base configuration",
		baseConfigSubtitle:
			"Define the main identity and behavior of this maintenance.",
		titleField: "Title",
		titlePlaceholder: "Example: Quarterly preventive maintenance",
		type: "Type",
		description: "Description",
		descriptionPlaceholder: "Describe the general scope of this maintenance.",
		generationMode: "Generation mode",
		frequency: "Frequency",
		unit: "Unit",
		alertDaysBefore: "Alert days before",
		recurring: "Recurring",
		notifyClient: "Notify client",
		notifyInternal: "Notify internal",
		scheduleTitle: "Schedule",
		scheduleSubtitle:
			"Generate or manually build the table before saving the maintenance.",
		addManualRow: "Add manual row",
		rows: "rows",
		next: "next",
		noRows:
			"No rows yet. Generate the schedule or add manual rows before saving.",
		number: "#",
		date: "Date",
		alert: "Alert",
		status: "Status",
		completed: "Completed",
		completedBy: "Completed by",
		note: "Note",
		actions: "Actions",
		delete: "Delete",
		cancel: "Cancel",
		reactivate: "Reactivate",
		client: "Client",
		internal: "Sierra Tech",
		instructionsTitle: "Notes and instructions",
		instructionsSubtitle: "Additional descriptive base for this maintenance.",
		instructions: "Instructions",
		instructionsPlaceholder: "Operational maintenance instructions.",
		notes: "Notes",
		notesPlaceholder: "Internal or follow-up notes.",
		flowTitle: "Maintenance flow",
		flowText:
			"The maintenance is saved with its schedule. Then you can return to the detail page to operate rows, mark completed items, and adjust alerts.",
		loadingBaseData: "Loading module base data...",
		generateScheduleError:
			"Schedule could not be generated. Check project, contract, frequency, unit, and notifications.",
		scheduleGenerated: (rows) => `Schedule generated: ${rows} rows.`,
		manualRowAdded: "Manual row added. Save is still required.",
		regenerateTitle: "Recalculate schedule",
		regenerateMessage:
			"This action will regenerate the automatic schedule and replace the current schedule rows. Manual changes will be lost if you continue.",
		regenerateCancel: "Cancel",
		regenerateConfirm: "Recalculate",
		regenerateBlocked:
			"Automatic regeneration is not allowed because completed maintenance rows already exist.",
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
		alertStatus: "Alert",
		emittedAt: "Generated",
		emailStatus: "Email",
		emailSentAt: "Sent",
		emailError: "Email error",
		channels: "Channels",
		recipients: "Recipients",
		recipientEmail: "Email",
	},
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function toNullableNumber(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function serialize(value: MaintenanceEntity | null): string {
	return JSON.stringify(value);
}

function formatDate(
	value: string | null | undefined,
	dateFormat: AppDateFormat,
): string {
	return formatAppDate(value, dateFormat);
}

function createEmptyMaintenanceEntity(): MaintenanceEntity {
	const now = new Date().toISOString();

	return {
		...createEmptyMaintenancePayload(),
		_id: "",
		createdAt: now,
		updatedAt: now,
	};
}

function buildContextQuery(params: {
	organizationId: string;
	projectId?: string;
}): string {
	const searchParams = new URLSearchParams();

	if (normalizeString(params.organizationId)) {
		searchParams.set("organizationId", normalizeString(params.organizationId));
	}

	if (normalizeString(params.projectId)) {
		searchParams.set("projectId", normalizeString(params.projectId));
	}

	const query = searchParams.toString();
	return query ? `?${query}` : "";
}

function deriveEntitySummary(entity: MaintenanceEntity): MaintenanceEntity {
	const summary = recalculateMaintenanceSummary(entity.schedule);

	return {
		...entity,
		nextDueDate: summary.nextDueDate,
		status: summary.status,
	};
}

function buildWritePayload(entity: MaintenanceEntity): MaintenanceWritePayload {
	return {
		organizationId: entity.organizationId,
		projectId: entity.projectId,
		organizationName: entity.organizationName,
		projectTitle: entity.projectTitle,
		title: entity.title,
		description: entity.description,
		maintenanceType: entity.maintenanceType,
		generationMode: entity.generationMode,
		contractStartDate: entity.contractStartDate,
		contractDurationMonths: entity.contractDurationMonths,
		contractEndDate: entity.contractEndDate,
		frequencyValue: entity.frequencyValue,
		frequencyUnit: entity.frequencyUnit,
		alertDaysBefore: entity.alertDaysBefore,
		isRecurring: entity.isRecurring,
		notifyClient: entity.notifyClient,
		notifyInternal: entity.notifyInternal,
		instructions: entity.instructions,
		notes: entity.notes,
		relatedDocumentIds: entity.relatedDocumentIds,
		attachments: entity.attachments,
		nextDueDate: entity.nextDueDate,
		status: entity.status,
		schedule: entity.schedule,
	};
}

function recalculateRows(entity: MaintenanceEntity): MaintenanceScheduleEntry[] {
	return entity.schedule.map((entry, index) =>
		recalculateSingleScheduleRow({
			entry: {
				...entry,
				cycleIndex: index,
			},
			alertDaysBefore: entity.alertDaysBefore,
			notifyClient: entity.notifyClient,
			notifyInternal: entity.notifyInternal,
		}),
	);
}

function createManualRow(entity: MaintenanceEntity): MaintenanceScheduleEntry {
	const lastRow = entity.schedule[entity.schedule.length - 1];

	const baseDate = lastRow
		? addFrequencyDateOnly(
			lastRow.maintenanceDate,
			entity.frequencyValue ?? 1,
			entity.frequencyUnit ?? "months",
		) ?? lastRow.maintenanceDate
		: entity.contractStartDate || new Date().toISOString().split("T")[0] || "";

	return buildScheduleEntry({
		cycleIndex: entity.schedule.length,
		maintenanceDate: baseDate,
		alertDaysBefore: entity.alertDaysBefore,
		notifyClient: entity.notifyClient,
		notifyInternal: entity.notifyInternal,
	});
}

function mapProjectContextToEntity(
	current: MaintenanceEntity,
	context: MaintenanceProjectContext,
): MaintenanceEntity {
	return deriveEntitySummary({
		...current,
		organizationId: context.organizationId,
		projectId: context.projectId,
		organizationName: context.organizationName,
		projectTitle: context.projectTitle,
		contractStartDate: context.contractStartDate,
		contractDurationMonths: context.contractDurationMonths,
		contractEndDate: context.contractEndDate,
		relatedDocumentIds:
			current.relatedDocumentIds.length > 0
				? current.relatedDocumentIds
				: context.availableDocumentIds,
		schedule: [],
		nextDueDate: null,
		status: "scheduled",
	});
}

/* -------------------------------------------------------------------------- */
/* Small UI blocks                                                            */
/* -------------------------------------------------------------------------- */

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

function SectionCard({
	title,
	subtitle,
	icon,
	children,
}: {
	title: string;
	subtitle?: string;
	icon?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="mb-5 flex items-start gap-3 border-b border-border pb-4">
				{icon ? (
					<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
						{icon}
					</div>
				) : null}

				<div className="min-w-0">
					<h2 className="text-xl font-bold tracking-tight text-text-primary">
						{title}
					</h2>

					{subtitle ? (
						<p className="mt-1 text-sm leading-7 text-text-secondary">
							{subtitle}
						</p>
					) : null}
				</div>
			</div>

			{children}
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function MaintenanceFormPage({ mode }: MaintenanceFormPageProps) {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const maintenanceId = normalizeString(params?.id);

	const toast = useToast();
	const { locale } = useTranslation();

	const lang: Locale = locale === "en" ? "en" : "es";
	const t = TEXT[lang];
	const dateFormat: AppDateFormat = DEFAULT_APP_DATE_FORMAT;

	const isCreate = mode === "create";
	const isEdit = mode === "edit";

	const [form, setForm] = useState<MaintenanceEntity | null>(() =>
		isCreate ? createEmptyMaintenanceEntity() : null,
	);

	const [snapshot, setSnapshot] = useState("");
	const [loading, setLoading] = useState(isEdit);
	const [loadingContext, setLoadingContext] = useState(isCreate);
	const [saving, setSaving] = useState(false);

	const [organizations, setOrganizations] = useState<
		MaintenanceContextOrganizationOption[]
	>([]);
	const [projects, setProjects] = useState<MaintenanceContextProjectOption[]>([]);
	const [selectedProjectContext, setSelectedProjectContext] =
		useState<MaintenanceProjectContext | null>(null);

	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [scheduleMessage, setScheduleMessage] = useState("");
	const [projectContextError, setProjectContextError] = useState("");

	const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
	const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);

	const hasChanges = useMemo(() => {
		if (!form) return false;
		return serialize(form) !== snapshot;
	}, [form, snapshot]);

	const canSave = useMemo(() => {
		if (!form || loading || loadingContext || saving) return false;
		if (!normalizeString(form.title)) return false;

		if (isCreate) {
			if (!normalizeString(form.organizationId)) return false;
			if (!normalizeString(form.projectId)) return false;
			if (form.schedule.length === 0) return false;
		}

		return hasChanges;
	}, [form, hasChanges, isCreate, loading, loadingContext, saving]);

	const hasCompletedRows = useMemo(() => {
		if (!form) return false;

		return form.schedule.some(
			(row) => row.completed || row.maintenanceStatus === "done",
		);
	}, [form]);

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

	useEffect(() => {
		if (!isCreate) return;

		const initial = createEmptyMaintenanceEntity();
		setForm(initial);
		setSnapshot(serialize(initial));
	}, [isCreate]);

	useEffect(() => {
		let cancelled = false;

		async function loadMaintenance() {
			if (!isEdit) return;

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
					setError(json && !json.ok ? json.error : t.loadError);
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

		void loadMaintenance();

		return () => {
			cancelled = true;
		};
	}, [
		isEdit,
		maintenanceId,
		t.invalidMaintenance,
		t.loadError,
		t.loadFallbackError,
	]);

	useEffect(() => {
		let cancelled = false;

		async function loadOrganizations() {
			if (!isCreate) return;

			try {
				setLoadingContext(true);
				setError("");

				const response = await fetch("/api/admin/maintenance/context", {
					method: "GET",
					cache: "no-store",
				});

				const json = (await response
					.json()
					.catch(() => null)) as MaintenanceContextResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setOrganizations([]);
					setError(json && !json.ok ? json.error : t.contextLoadError);
					return;
				}

				setOrganizations(json.organizations);
			} catch (err) {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : t.contextLoadError);
			} finally {
				if (!cancelled) setLoadingContext(false);
			}
		}

		void loadOrganizations();

		return () => {
			cancelled = true;
		};
	}, [isCreate, t.contextLoadError]);

	useEffect(() => {
		let cancelled = false;

		async function loadProjects() {
			if (!isCreate || !form?.organizationId) {
				setProjects([]);
				return;
			}

			try {
				setLoadingContext(true);
				setProjectContextError("");

				const response = await fetch(
					`/api/admin/maintenance/context${buildContextQuery({
						organizationId: form.organizationId,
					})}`,
					{ method: "GET", cache: "no-store" },
				);

				const json = (await response
					.json()
					.catch(() => null)) as MaintenanceContextResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setProjects([]);
					setProjectContextError(
						json && !json.ok ? json.error : t.contextLoadError,
					);
					return;
				}

				setProjects(json.projects);
			} catch (err) {
				if (cancelled) return;
				setProjectContextError(
					err instanceof Error ? err.message : t.contextLoadError,
				);
			} finally {
				if (!cancelled) setLoadingContext(false);
			}
		}

		void loadProjects();

		return () => {
			cancelled = true;
		};
	}, [form?.organizationId, isCreate, t.contextLoadError]);

	useEffect(() => {
		let cancelled = false;

		async function loadProjectContext() {
			if (!isCreate || !form?.organizationId || !form.projectId) return;

			try {
				setLoadingContext(true);
				setProjectContextError("");
				setScheduleMessage("");

				const response = await fetch(
					`/api/admin/maintenance/context${buildContextQuery({
						organizationId: form.organizationId,
						projectId: form.projectId,
					})}`,
					{ method: "GET", cache: "no-store" },
				);

				const json = (await response
					.json()
					.catch(() => null)) as MaintenanceContextResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok || !json.projectContext) {
					setSelectedProjectContext(null);
					setProjectContextError(
						json && !json.ok ? json.error : t.projectContextError,
					);
					return;
				}

				setSelectedProjectContext(json.projectContext);

				setForm((current) =>
					current ? mapProjectContextToEntity(current, json.projectContext!) : current,
				);
			} catch (err) {
				if (cancelled) return;
				setSelectedProjectContext(null);
				setProjectContextError(
					err instanceof Error ? err.message : t.projectContextError,
				);
			} finally {
				if (!cancelled) setLoadingContext(false);
			}
		}

		void loadProjectContext();

		return () => {
			cancelled = true;
		};
	}, [
		form?.organizationId,
		form?.projectId,
		isCreate,
		t.projectContextError,
	]);

	const handleBack = useCallback(() => {
		if (hasChanges) {
			setLeaveConfirmOpen(true);
			return;
		}

		router.push("/admin/dashboard/maintenance");
	}, [hasChanges, router]);

	function updateForm(updater: (current: MaintenanceEntity) => MaintenanceEntity) {
		setForm((current) => {
			if (!current) return current;
			return deriveEntitySummary(updater(current));
		});
	}

	function replaceSchedule(schedule: MaintenanceScheduleEntry[]) {
		updateForm((current) => ({
			...current,
			schedule: schedule.map((row, index) => ({
				...row,
				cycleIndex: index,
			})),
		}));
	}

	function handleGenerateSchedule() {
		if (!form) return;

		const rows = generateAutomaticSchedule({
			contractStartDate: form.contractStartDate,
			contractEndDate: form.contractEndDate,
			frequencyValue: form.frequencyValue,
			frequencyUnit: form.frequencyUnit,
			alertDaysBefore: form.alertDaysBefore,
			isRecurring: form.isRecurring,
			notifyClient: form.notifyClient,
			notifyInternal: form.notifyInternal,
		});

		if (rows.length === 0) {
			setScheduleMessage("");
			setError(t.generateScheduleError);
			return;
		}

		setError("");
		setScheduleMessage(t.scheduleGenerated(rows.length));

		replaceSchedule(rows);
	}

	function requestAutomaticRegeneration() {
		if (!form) return;

		if (isCreate) {
			handleGenerateSchedule();
			return;
		}

		if (hasCompletedRows) {
			toast.warning(t.regenerateBlocked);
			return;
		}

		setRegenerateConfirmOpen(true);
	}

	function confirmAutomaticRegeneration() {
		handleGenerateSchedule();
		setRegenerateConfirmOpen(false);
	}

	function handleAddManualRow() {
		if (!form) return;

		setError("");
		setScheduleMessage(t.manualRowAdded);

		updateForm((current) => ({
			...current,
			generationMode: "manual",
			schedule: [...current.schedule, createManualRow(current)],
		}));
	}

	async function handleSave() {
		if (!form || !canSave) return;

		try {
			setSaving(true);
			setError("");
			setSuccess("");

			const prepared = deriveEntitySummary({
				...form,
				organizationName:
					selectedProjectContext?.organizationName || form.organizationName,
				projectTitle: selectedProjectContext?.projectTitle || form.projectTitle,
				contractStartDate:
					selectedProjectContext?.contractStartDate ?? form.contractStartDate,
				contractDurationMonths:
					selectedProjectContext?.contractDurationMonths ??
					form.contractDurationMonths,
				contractEndDate:
					selectedProjectContext?.contractEndDate ?? form.contractEndDate,
			});

			const endpoint = isCreate
				? "/api/admin/maintenance"
				: `/api/admin/maintenance/${maintenanceId}`;

			const response = await fetch(endpoint, {
				method: isCreate ? "POST" : "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(buildWritePayload(prepared)),
			});

			const json = (await response
				.json()
				.catch(() => null)) as MaintenanceSaveResponse | null;

			if (!response.ok || !json || !json.ok) {
				const details =
					json && !json.ok && json.details?.length
						? ` ${json.details.join(" ")}`
						: "";

				setError(
					json && !json.ok
						? `${json.error}${details}`.trim()
						: isCreate
							? t.createError
							: t.saveError,
				);
				return;
			}

			const normalized = normalizeMaintenanceEntity(json.item);
			setForm(normalized);
			setSnapshot(serialize(normalized));

			const message = isCreate ? t.createSuccess : t.saveSuccess;
			setSuccess(message);
			toast.success(message);

			if (isCreate) {
				router.push(`/admin/dashboard/maintenance/${normalized._id}`);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : isCreate ? t.createError : t.saveError;

			setError(message);
			toast.error(message);
		} finally {
			setSaving(false);
		}
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

				<p className="text-sm text-rose-700">{error || t.loadError}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 pb-24">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="max-w-3xl space-y-4">
						<button
							type="button"
							onClick={handleBack}
							className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
						>
							<ArrowLeft className="h-4 w-4" />
							{t.back}
						</button>

						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
							{t.eyebrow}
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-text-primary">
							{isCreate ? t.createTitle : form.title || t.editTitleFallback}
						</h1>

						<p className="text-base leading-8 text-text-secondary">
							{isCreate ? t.createSubtitle : t.editSubtitle}
						</p>

						{form.organizationName || form.projectTitle ? (
							<p className="text-sm text-text-secondary">
								{form.organizationName} · {form.projectTitle} ·{" "}
								<strong>{t.maintenanceStatusLabels[form.status]}</strong>
							</p>
						) : null}
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={requestAutomaticRegeneration}
							disabled={
								form.generationMode !== "automatic" ||
								(form.frequencyValue ?? 0) <= 0
							}
							className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{t.generateSchedule}
						</button>

						<button
							type="button"
							onClick={() => void handleSave()}
							disabled={!canSave}
							className="inline-flex items-center gap-2 rounded-2xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryStrong disabled:cursor-not-allowed disabled:opacity-50"
						>
							{saving
								? t.saving
								: isCreate
									? t.createMaintenance
									: t.saveMaintenance}
							<ArrowRight className="h-4 w-4" />
						</button>
					</div>
				</div>

				<div className="mt-5 grid gap-3 md:grid-cols-4">
					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.status}:{" "}
						<strong>{t.maintenanceStatusLabels[form.status]}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.rows}: <strong>{form.schedule.length}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.next}: <strong>{formatDate(form.nextDueDate, dateFormat)}</strong>
					</div>

					<div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
						{t.status}:{" "}
						<strong>{hasChanges ? t.unsavedChanges : t.changesSaved}</strong>
					</div>
				</div>
			</section>

			{error ? (
				<section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-rose-700">{error}</p>
				</section>
			) : null}

			{success ? (
				<section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-emerald-700">{success}</p>
				</section>
			) : null}

			{scheduleMessage ? (
				<section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-emerald-700">
						{scheduleMessage}
					</p>
				</section>
			) : null}

			<SectionCard
				title={t.contextTitle}
				subtitle={t.contextSubtitle}
				icon={<Building2 className="h-5 w-5" />}
			>
				{isCreate ? (
					<div className="grid gap-5 xl:grid-cols-2">
						<div>
							<FieldLabel>{t.organization}</FieldLabel>
							<select
								value={form.organizationId}
								onChange={(event) => {
									const organizationId = event.currentTarget.value;
									const organization = organizations.find(
										(item) => item._id === organizationId,
									);

									setForm((current) =>
										current
											? deriveEntitySummary({
												...current,
												organizationId,
												organizationName: organization?.name ?? "",
												projectId: "",
												projectTitle: "",
												contractStartDate: null,
												contractDurationMonths: null,
												contractEndDate: null,
												schedule: [],
												nextDueDate: null,
												status: "scheduled",
											})
											: current,
									);

									setSelectedProjectContext(null);
									setScheduleMessage("");
								}}
								disabled={loadingContext || saving}
								className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
							>
								<option value="">{t.selectOrganization}</option>
								{organizations.map((item) => (
									<option key={item._id} value={item._id}>
										{item.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<FieldLabel>{t.project}</FieldLabel>
							<select
								value={form.projectId}
								onChange={(event) => {
									const projectId = event.currentTarget.value;

									setForm((current) =>
										current
											? deriveEntitySummary({
												...current,
												projectId,
												projectTitle: "",
												contractStartDate: null,
												contractDurationMonths: null,
												contractEndDate: null,
												schedule: [],
												nextDueDate: null,
												status: "scheduled",
											})
											: current,
									);

									setSelectedProjectContext(null);
									setScheduleMessage("");
								}}
								disabled={
									loadingContext ||
									saving ||
									!normalizeString(form.organizationId)
								}
								className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
							>
								<option value="">{t.selectProject}</option>
								{projects.map((item) => (
									<option key={item._id} value={item._id}>
										{item.title}
									</option>
								))}
							</select>
						</div>
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						<div className="rounded-2xl border border-border bg-surface px-4 py-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
								{t.organization}
							</p>
							<p className="mt-2 text-sm font-semibold text-text-primary">
								{form.organizationName || "—"}
							</p>
						</div>

						<div className="rounded-2xl border border-border bg-surface px-4 py-4">
							<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
								{t.project}
							</p>
							<p className="mt-2 text-sm font-semibold text-text-primary">
								{form.projectTitle || "—"}
							</p>
						</div>
					</div>
				)}

				{projectContextError ? (
					<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
						{projectContextError}
					</div>
				) : null}
			</SectionCard>

			<SectionCard
				title={t.contractTitle}
				subtitle={t.contractSubtitle}
				icon={<CalendarClock className="h-5 w-5" />}
			>
				<div className="grid gap-4 md:grid-cols-3">
					<div className="rounded-2xl border border-border bg-surface px-4 py-4">
						<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
							{t.contractStart}
						</p>
						<p className="mt-2 text-sm font-semibold text-text-primary">
							{formatDate(form.contractStartDate, dateFormat)}
						</p>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-4">
						<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
							{t.contractDuration}
						</p>
						<p className="mt-2 text-sm font-semibold text-text-primary">
							{form.contractDurationMonths
								? `${form.contractDurationMonths} ${t.months}`
								: "—"}
						</p>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-4">
						<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
							{t.contractEnd}
						</p>
						<p className="mt-2 text-sm font-semibold text-text-primary">
							{formatDate(form.contractEndDate, dateFormat)}
						</p>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={t.baseConfigTitle}
				subtitle={t.baseConfigSubtitle}
				icon={<Wrench className="h-5 w-5" />}
			>
				<div className="grid gap-5 xl:grid-cols-2">
					<div>
						<FieldLabel>{t.titleField}</FieldLabel>
						<input
							value={form.title}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateForm((current) => ({ ...current, title: value }));
							}}
							placeholder={t.titlePlaceholder}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<FieldLabel>{t.type}</FieldLabel>
						<select
							value={form.maintenanceType}
							onChange={(event) => {
								const value = event.currentTarget.value as MaintenanceType;
								updateForm((current) => ({
									...current,
									maintenanceType: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="preventive">
								{t.maintenanceTypeLabels.preventive}
							</option>
							<option value="corrective">
								{t.maintenanceTypeLabels.corrective}
							</option>
							<option value="cleaning">{t.maintenanceTypeLabels.cleaning}</option>
							<option value="inspection">
								{t.maintenanceTypeLabels.inspection}
							</option>
							<option value="replacement">
								{t.maintenanceTypeLabels.replacement}
							</option>
							<option value="other">{t.maintenanceTypeLabels.other}</option>
						</select>
					</div>

					<div className="xl:col-span-2">
						<FieldLabel>{t.description}</FieldLabel>
						<textarea
							rows={4}
							value={form.description}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateForm((current) => ({
									...current,
									description: value,
								}));
							}}
							placeholder={t.descriptionPlaceholder}
							className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<FieldLabel>{t.generationMode}</FieldLabel>
						<select
							value={form.generationMode}
							onChange={(event) => {
								const value = event.currentTarget
									.value as MaintenanceGenerationMode;

								updateForm((current) => ({
									...current,
									generationMode: value,
									schedule: value === "automatic" ? current.schedule : current.schedule,
								}));

								setScheduleMessage("");
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="automatic">
								{t.generationModeLabels.automatic}
							</option>
							<option value="manual">{t.generationModeLabels.manual}</option>
						</select>
					</div>

					<div>
						<FieldLabel>{t.frequency}</FieldLabel>
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
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<FieldLabel>{t.unit}</FieldLabel>
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
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="days">{t.frequencyUnitLabels.days}</option>
							<option value="weeks">{t.frequencyUnitLabels.weeks}</option>
							<option value="months">{t.frequencyUnitLabels.months}</option>
							<option value="years">{t.frequencyUnitLabels.years}</option>
						</select>
					</div>

					<div>
						<FieldLabel>{t.alertDaysBefore}</FieldLabel>
						<input
							type="number"
							min={0}
							value={form.alertDaysBefore ?? ""}
							onChange={(event) => {
								const value = toNullableNumber(event.currentTarget.value);

								updateForm((current) => {
									const next = {
										...current,
										alertDaysBefore: value,
									};

									return {
										...next,
										schedule: recalculateRows(next),
									};
								});
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div className="grid gap-3 xl:col-span-2 md:grid-cols-3">
						<label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
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
								className="h-4 w-4"
							/>
							<span>{t.recurring}</span>
						</label>

						<label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
							<input
								type="checkbox"
								checked={form.notifyClient}
								onChange={(event) => {
									const checked = event.currentTarget.checked;

									updateForm((current) => {
										const next = {
											...current,
											notifyClient: checked,
										};

										return {
											...next,
											schedule: recalculateRows(next),
										};
									});
								}}
								className="h-4 w-4"
							/>
							<span>{t.notifyClient}</span>
						</label>

						<label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
							<input
								type="checkbox"
								checked={form.notifyInternal}
								onChange={(event) => {
									const checked = event.currentTarget.checked;

									updateForm((current) => {
										const next = {
											...current,
											notifyInternal: checked,
										};

										return {
											...next,
											schedule: recalculateRows(next),
										};
									});
								}}
								className="h-4 w-4"
							/>
							<span>{t.notifyInternal}</span>
						</label>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				title={t.scheduleTitle}
				subtitle={t.scheduleSubtitle}
				icon={<CalendarClock className="h-5 w-5" />}
			>
				<div className="mb-5 flex flex-wrap gap-3">
					<button
						type="button"
						onClick={requestAutomaticRegeneration}
						disabled={
							form.generationMode !== "automatic" ||
							(form.frequencyValue ?? 0) <= 0
						}
						className="rounded-2xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryStrong disabled:cursor-not-allowed disabled:opacity-50"
					>
						{t.generateSchedule}
					</button>

					<button
						type="button"
						onClick={handleAddManualRow}
						className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
					>
						{t.addManualRow}
					</button>

					<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
						<strong>{form.schedule.length}</strong> {t.rows} · {t.next}{" "}
						{formatDate(form.nextDueDate, dateFormat)}
					</div>
				</div>

				{form.schedule.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-text-secondary">
						{t.noRows}
					</div>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-border">
						<table className="min-w-[1900px] w-full text-sm">
							<thead className="bg-surface text-left text-xs uppercase text-text-secondary">
								<tr>
									<th className="px-3 py-3">{t.number}</th>
									<th className="px-3 py-3">{t.date}</th>
									<th className="px-3 py-3">{t.alert}</th>
									<th className="px-3 py-3">{t.alertStatus}</th>
									<th className="px-3 py-3">{t.emittedAt}</th>
									<th className="px-3 py-3">{t.emailStatus}</th>
									<th className="px-3 py-3">{t.emailSentAt}</th>
									<th className="px-3 py-3">{t.emailError}</th>
									<th className="px-3 py-3">{t.channels}</th>
									<th className="px-3 py-3">{t.recipients}</th>
									<th className="px-3 py-3">{t.recipientEmail}</th>
									<th className="px-3 py-3">{t.status}</th>
									<th className="px-3 py-3">{t.completed}</th>
									<th className="px-3 py-3">{t.completedBy}</th>
									<th className="px-3 py-3">{t.note}</th>
									<th className="px-3 py-3">{t.actions}</th>
								</tr>
							</thead>

							<tbody>
								{form.schedule.map((row, index) => {
									const adminRow = row as MaintenanceScheduleEntryAdmin;

									return (
										<tr key={row.eventId} className="border-t border-border">
											<td className="px-3 py-3">{index + 1}</td>

											<td className="px-3 py-3">
												<input
													type="date"
													value={extractDateOnly(row.maintenanceDate)}
													onChange={(event) => {
														const value = event.currentTarget.value;

														updateForm((current) => {
															const nextSchedule = current.schedule.map(
																(item, itemIndex) =>
																	item.eventId === row.eventId
																		? {
																			...item,
																			cycleIndex: itemIndex,
																			maintenanceDate: value,
																		}
																		: {
																			...item,
																			cycleIndex: itemIndex,
																		},
															);

															if (
																current.generationMode === "automatic" &&
																index === 0
															) {
																return {
																	...current,
																	schedule: recalculateScheduleFromFirstRow({
																		schedule: nextSchedule,
																		contractEndDate: current.contractEndDate,
																		frequencyValue: current.frequencyValue,
																		frequencyUnit: current.frequencyUnit,
																		alertDaysBefore: current.alertDaysBefore,
																		isRecurring: current.isRecurring,
																		notifyClient: current.notifyClient,
																		notifyInternal: current.notifyInternal,
																	}),
																};
															}

															return {
																...current,
																generationMode: "manual",
																schedule: nextSchedule.map((item, itemIndex) =>
																	item.eventId === row.eventId
																		? recalculateSingleScheduleRow({
																			entry: {
																				...item,
																				cycleIndex: itemIndex,
																			},
																			alertDaysBefore: current.alertDaysBefore,
																			notifyClient: current.notifyClient,
																			notifyInternal: current.notifyInternal,
																		})
																		: item,
																),
															};
														});
													}}
													className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
												/>
											</td>

											<td className="px-3 py-3">
												{formatDate(row.alertDate, dateFormat)}
											</td>

											<td className="px-3 py-3">
												<span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-primary">
													{adminRow.alertStatus ?? "pending"}
												</span>
											</td>

											<td className="px-3 py-3">
												{formatDate(adminRow.emittedAt ?? null, dateFormat)}
											</td>

											<td className="px-3 py-3">
												<span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-text-primary">
													{adminRow.emailStatus ?? "pending"}
												</span>
											</td>

											<td className="px-3 py-3">
												{formatDate(adminRow.emailSentAt ?? null, dateFormat)}
											</td>

											<td className="px-3 py-3">
												<div className="max-w-[260px] truncate text-xs text-rose-700">
													{adminRow.emailError || "—"}
												</div>
											</td>

											<td className="px-3 py-3">
												{row.channels.length > 0 ? row.channels.join(", ") : "—"}
											</td>

											<td className="px-3 py-3">
												{row.recipients.length > 0 ? row.recipients.join(", ") : "—"}
											</td>

											<td className="px-3 py-3">
												<div className="max-w-[220px] truncate">
													{row.recipientEmail || "—"}
												</div>
											</td>

											<td className="px-3 py-3">
												<select
													value={row.maintenanceStatus}
													onChange={(event) => {
														const value = event.currentTarget
															.value as MaintenanceExecutionStatus;

														updateForm((current) => ({
															...current,
															generationMode: "manual",
															schedule: current.schedule.map((item, itemIndex) =>
																item.eventId === row.eventId
																	? recalculateSingleScheduleRow({
																		entry: {
																			...item,
																			cycleIndex: itemIndex,
																			maintenanceStatus: value,
																			completed: value === "done",
																			completedAt:
																				value === "done"
																					? new Date().toISOString().split("T")[0] ?? null
																					: null,
																			completedByRole:
																				value === "done" ? "internal" : null,
																		},
																		alertDaysBefore: current.alertDaysBefore,
																		notifyClient: current.notifyClient,
																		notifyInternal: current.notifyInternal,
																	})
																	: item,
															),
														}));
													}}
													className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
												>
													<option value="pending">{t.executionStatusLabels.pending}</option>
													<option value="done">{t.executionStatusLabels.done}</option>
													<option value="overdue">{t.executionStatusLabels.overdue}</option>
													<option value="cancelled">
														{t.executionStatusLabels.cancelled}
													</option>
												</select>
											</td>

											<td className="px-3 py-3">
												<input
													type="checkbox"
													checked={row.completed}
													onChange={(event) => {
														const checked = event.currentTarget.checked;

														updateForm((current) => ({
															...current,
															generationMode: "manual",
															schedule: current.schedule.map((item, itemIndex) =>
																item.eventId === row.eventId
																	? recalculateSingleScheduleRow({
																		entry: {
																			...item,
																			cycleIndex: itemIndex,
																			completed: checked,
																			completedAt: checked
																				? new Date().toISOString().split("T")[0] ?? null
																				: null,
																			completedByRole: checked ? "internal" : null,
																			maintenanceStatus: checked ? "done" : "pending",
																		},
																		alertDaysBefore: current.alertDaysBefore,
																		notifyClient: current.notifyClient,
																		notifyInternal: current.notifyInternal,
																	})
																	: item,
															),
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

														updateForm((current) => ({
															...current,
															generationMode: "manual",
															schedule: current.schedule.map((item) =>
																item.eventId === row.eventId
																	? { ...item, note: value }
																	: item,
															),
														}));
													}}
													className="h-10 w-64 rounded-xl border border-border bg-white px-3 text-sm"
												/>
											</td>

											<td className="px-3 py-3">
												<div className="flex gap-2">
													<button
														type="button"
														disabled={row.completed || row.maintenanceStatus === "done"}
														onClick={() => {
															updateForm((current) => ({
																...current,
																generationMode: "manual",
																schedule: current.schedule.map((item, itemIndex) =>
																	item.eventId === row.eventId
																		? recalculateSingleScheduleRow({
																			entry: {
																				...item,
																				cycleIndex: itemIndex,
																				maintenanceStatus:
																					item.maintenanceStatus === "cancelled"
																						? "pending"
																						: "cancelled",
																				completed: false,
																				completedAt: null,
																				completedByRole: null,
																			},
																			alertDaysBefore: current.alertDaysBefore,
																			notifyClient: current.notifyClient,
																			notifyInternal: current.notifyInternal,
																		})
																		: item,
																),
															}));
														}}
														className="rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
													>
														{row.maintenanceStatus === "cancelled"
															? t.reactivate
															: t.cancel}
													</button>

													<button
														type="button"
														disabled={row.completed || row.maintenanceStatus === "done"}
														onClick={() => {
															updateForm((current) => ({
																...current,
																generationMode: "manual",
																schedule: current.schedule
																	.filter((item) => item.eventId !== row.eventId)
																	.map((item, itemIndex) => ({
																		...item,
																		cycleIndex: itemIndex,
																	})),
															}));
														}}
														className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
													>
														{t.delete}
													</button>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</SectionCard>

			<SectionCard
				title={t.instructionsTitle}
				subtitle={t.instructionsSubtitle}
				icon={<Settings2 className="h-5 w-5" />}
			>
				<div className="grid gap-5 xl:grid-cols-2">
					<div>
						<FieldLabel>{t.instructions}</FieldLabel>
						<textarea
							rows={5}
							value={form.instructions}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateForm((current) => ({
									...current,
									instructions: value,
								}));
							}}
							placeholder={t.instructionsPlaceholder}
							className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<FieldLabel>{t.notes}</FieldLabel>
						<textarea
							rows={5}
							value={form.notes}
							onChange={(event) => {
								const value = event.currentTarget.value;
								updateForm((current) => ({
									...current,
									notes: value,
								}));
							}}
							placeholder={t.notesPlaceholder}
							className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>
				</div>
			</SectionCard>

			<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
				<div className="flex items-start gap-3">
					<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
						<Info className="h-5 w-5" />
					</div>

					<div className="space-y-3">
						<h2 className="text-xl font-bold tracking-tight text-text-primary">
							{t.flowTitle}
						</h2>

						<p className="max-w-4xl text-sm leading-7 text-text-secondary">
							{t.flowText}
						</p>
					</div>
				</div>
			</section>

			{loadingContext ? (
				<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
					<p className="text-sm text-text-secondary">{t.loadingBaseData}</p>
				</section>
			) : null}

			<FormActionsHeader
				backLabel={t.back}
				saveLabel={isCreate ? t.createMaintenance : t.saveMaintenance}
				savingLabel={t.saving}
				isSaving={saving}
				canSave={canSave}
				statusLabel={`${form.schedule.length} ${t.rows} · ${hasChanges ? t.unsavedChanges : t.changesSaved
					}`}
				onBack={handleBack}
				onSave={handleSave}
			/>

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