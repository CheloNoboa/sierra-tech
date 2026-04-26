"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Maintenance Create
 * Path: src/app/admin/dashboard/maintenance/new/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa para crear un nuevo mantenimiento.
 *
 * Responsabilidades:
 * - cargar organizaciones disponibles
 * - cargar proyectos asociados a la organización seleccionada
 * - recuperar el contexto contractual real del proyecto
 * - configurar la identidad base del mantenimiento
 * - definir modo de generación automático o manual
 * - generar una programación inicial del mantenimiento
 * - permitir edición básica de filas antes de guardar
 * - crear la entidad Maintenance mediante POST /api/admin/maintenance
 * - redirigir al detalle operativo después de crear
 *
 * Flujo principal:
 * 1. El usuario selecciona organización.
 * 2. El sistema carga los proyectos de esa organización.
 * 3. El usuario selecciona proyecto.
 * 4. El sistema recupera fechas contractuales del proyecto.
 * 5. El usuario configura tipo, frecuencia, alertas y notificaciones.
 * 6. El usuario genera la programación automática o agrega filas manuales.
 * 7. El usuario crea el mantenimiento.
 * 8. El sistema redirige a /admin/dashboard/maintenance/[id].
 *
 * Decisiones:
 * - la base contractual viene siempre del proyecto seleccionado
 * - la programación se guarda junto con la entidad inicial
 * - las fechas se muestran con el formatter global del proyecto
 * - el texto visible está preparado para ES/EN mediante TEXT
 * - la edición avanzada queda en la pantalla de detalle
 *
 * Reglas:
 * - no usar any
 * - no formatear fechas manualmente en UI
 * - no confiar en snapshots escritos manualmente por el usuario
 * - mantener schedule como fuente operativa inicial
 *
 * EN:
 * Admin page for creating a new Maintenance entity.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
	ArrowLeft,
	ArrowRight,
	Building2,
	CalendarClock,
	Info,
	Settings2,
	Wrench,
} from "lucide-react";

import type {
	MaintenanceExecutionStatus,
	MaintenanceFrequencyUnit,
	MaintenanceGenerationMode,
	MaintenanceProjectContext,
	MaintenanceScheduleEntry,
	MaintenanceStatus,
	MaintenanceType,
	MaintenanceWritePayload,
} from "@/types/maintenance";

import { createEmptyMaintenancePayload } from "@/lib/maintenance/maintenance.normalize";
import {
	DEFAULT_APP_DATE_FORMAT,
	formatAppDate,
	type AppDateFormat,
} from "@/lib/format/date.format";

import GlobalConfirm from "@/components/ui/GlobalConfirm";

/* -------------------------------------------------------------------------- */
/* I18N                                                                       */
/* -------------------------------------------------------------------------- */
/**
 * Diccionario local de textos visibles.
 *
 * Nota:
 * - actualmente el locale se fija localmente
 * - luego debe conectarse al mecanismo global bilingüe del admin
 */

type Locale = "es" | "en";

const TEXT: Record<
	Locale,
	{
		back: string;
		eyebrow: string;
		title: string;
		subtitle: string;
		generateSchedule: string;
		createMaintenance: string;
		saving: string;
		contextTitle: string;
		contextSubtitle: string;
		organization: string;
		selectOrganization: string;
		project: string;
		selectProject: string;
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
		note: string;
		actions: string;
		delete: string;
		instructionsTitle: string;
		instructionsSubtitle: string;
		instructions: string;
		instructionsPlaceholder: string;
		notes: string;
		notesPlaceholder: string;
		flowTitle: string;
		flowText: string;
		loadingBaseData: string;
		unnamed: string;
		loadOrganizationsError: string;
		loadProjectsError: string;
		loadProjectContextError: string;
		projectContextNotFound: string;
		generateScheduleError: string;
		scheduleGenerated: (rows: number) => string;
		manualRowAdded: string;
		createError: string;
		leaveTitle: string;
		leaveMessage: string;
		leaveCancel: string;
		leaveConfirm: string;
	}
> = {
	es: {
		back: "Volver",
		eyebrow: "Mantenimiento",
		title: "Nuevo mantenimiento",
		subtitle:
			"Selecciona organización y proyecto, recupera el contexto contractual real, genera la programación y guarda la entidad.",
		generateSchedule: "Generar programación",
		createMaintenance: "Crear mantenimiento",
		saving: "Guardando...",
		contextTitle: "Contexto base",
		contextSubtitle:
			"Selecciona la organización y el proyecto para recuperar la base contractual real.",
		organization: "Organización",
		selectOrganization: "Seleccionar organización",
		project: "Proyecto",
		selectProject: "Seleccionar proyecto",
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
			"Genera o construye manualmente la tabla antes de crear el mantenimiento.",
		addManualRow: "Agregar fila manual",
		rows: "filas",
		next: "próxima",
		noRows:
			"No hay filas. Genera la programación o agrega filas manuales antes de crear el mantenimiento.",
		number: "#",
		date: "Fecha",
		alert: "Alerta",
		status: "Estado",
		completed: "Realizado",
		note: "Nota",
		actions: "Acciones",
		delete: "Eliminar",
		instructionsTitle: "Notas e instrucciones",
		instructionsSubtitle: "Base descriptiva adicional del mantenimiento.",
		instructions: "Instrucciones",
		instructionsPlaceholder: "Instrucciones operativas del mantenimiento.",
		notes: "Notas",
		notesPlaceholder: "Notas internas o de seguimiento.",
		flowTitle: "Flujo de creación",
		flowText:
			"El mantenimiento se crea con su programación inicial. Luego puedes abrir el detalle para operar filas, marcar realizados y ajustar alertas.",
		loadingBaseData: "Cargando datos base del módulo...",
		unnamed: "Sin nombre",
		loadOrganizationsError: "No se pudieron cargar las organizaciones.",
		loadProjectsError: "No se pudo cargar el directorio de proyectos.",
		loadProjectContextError: "No se pudo recuperar el contexto del proyecto.",
		projectContextNotFound:
			"No se encontró contexto válido para el proyecto seleccionado.",
		generateScheduleError:
			"No se pudo generar la programación. Revisa organización, proyecto, fechas de contrato, frecuencia y unidad.",
		scheduleGenerated: (rows) => `Programación generada: ${rows} filas.`,
		manualRowAdded: "Fila manual agregada.",
		createError: "No se pudo crear el mantenimiento.",
		leaveTitle: "Cambios sin guardar",
		leaveMessage:
			"Tienes cambios sin guardar. Si sales ahora, perderás los cambios realizados.",
		leaveCancel: "Seguir editando",
		leaveConfirm: "Salir sin guardar",
	},
	en: {
		back: "Back",
		eyebrow: "Maintenance",
		title: "New maintenance",
		subtitle:
			"Select organization and project, retrieve the real contract context, generate the schedule, and save the entity.",
		generateSchedule: "Generate schedule",
		createMaintenance: "Create maintenance",
		saving: "Saving...",
		contextTitle: "Base context",
		contextSubtitle:
			"Select the organization and project to retrieve the real contract baseline.",
		organization: "Organization",
		selectOrganization: "Select organization",
		project: "Project",
		selectProject: "Select project",
		contractTitle: "Retrieved contract",
		contractSubtitle:
			"These values come from the selected project and are used for automatic generation.",
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
			"Generate or manually build the table before creating the maintenance.",
		addManualRow: "Add manual row",
		rows: "rows",
		next: "next",
		noRows:
			"No rows yet. Generate the schedule or add manual rows before creating the maintenance.",
		number: "#",
		date: "Date",
		alert: "Alert",
		status: "Status",
		completed: "Completed",
		note: "Note",
		actions: "Actions",
		delete: "Delete",
		instructionsTitle: "Notes and instructions",
		instructionsSubtitle: "Additional descriptive base for this maintenance.",
		instructions: "Instructions",
		instructionsPlaceholder: "Operational maintenance instructions.",
		notes: "Notes",
		notesPlaceholder: "Internal or follow-up notes.",
		flowTitle: "Creation flow",
		flowText:
			"The maintenance is created with its initial schedule. Then you can open the detail page to operate rows, mark completed items, and adjust alerts.",
		loadingBaseData: "Loading module base data...",
		unnamed: "Unnamed",
		loadOrganizationsError: "Organizations could not be loaded.",
		loadProjectsError: "Project directory could not be loaded.",
		loadProjectContextError: "Project context could not be retrieved.",
		projectContextNotFound:
			"No valid context was found for the selected project.",
		generateScheduleError:
			"Schedule could not be generated. Check organization, project, contract dates, frequency, and unit.",
		scheduleGenerated: (rows) => `Schedule generated: ${rows} rows.`,
		manualRowAdded: "Manual row added.",
		createError: "Maintenance could not be created.",
		leaveTitle: "Unsaved changes",
		leaveMessage:
			"You have unsaved changes. If you leave now, your changes will be lost.",
		leaveCancel: "Keep editing",
		leaveConfirm: "Leave without saving",
	},
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RawOrganization = {
	_id?: string;
	name?: string;
	companyName?: string;
	commercialName?: string;
	legalName?: string;
	email?: string;
	primaryEmail?: string;
};

type OrganizationOption = {
	id: string;
	label: string;
	email: string;
};

type OrganizationsResponse =
	| {
		ok: true;
		items?: RawOrganization[];
		organizations?: RawOrganization[];
		data?: RawOrganization[];
	}
	| {
		ok: false;
		error: string;
	};

type ProjectOption = {
	_id: string;
	title: string;
	slug: string;
	status: string;
	contractStartDate: string | null;
	contractDurationMonths: number | null;
	contractEndDate: string | null;
};

type MaintenanceProjectContextResponse =
	| {
		ok: true;
		organizations: Array<{
			_id: string;
			name: string;
			email: string;
		}>;
		projects: ProjectOption[];
		projectContext: MaintenanceProjectContext | null;
	}
	| {
		ok: false;
		error: string;
	};

type MaintenanceCreateResponse =
	| {
		ok: true;
		item: {
			_id: string;
		};
	}
	| {
		ok: false;
		error: string;
		details?: string[];
	};

/* -------------------------------------------------------------------------- */
/* Schedule helpers                                                           */
/* -------------------------------------------------------------------------- */
/**
 * Helpers puros de apoyo para construir la programación inicial.
 *
 * Importante:
 * - trabajan con fechas calendario YYYY-MM-DD
 * - no consultan API ni base de datos
 * - solo preparan estado local antes de guardar
 */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function toDateInput(value: string | null | undefined): string {
	if (!value) return "";
	return value.split("T")[0] ?? "";
}

function mapOrganizationLabel(item: RawOrganization, fallback: string): string {
	return (
		normalizeString(item.commercialName) ||
		normalizeString(item.legalName) ||
		normalizeString(item.companyName) ||
		normalizeString(item.name) ||
		normalizeString(item.primaryEmail) ||
		normalizeString(item.email) ||
		fallback
	);
}

function toNullableNumber(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;

	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
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

function generateAutomaticSchedule(
	form: MaintenanceWritePayload,
): MaintenanceScheduleEntry[] {
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

function deriveNextDueDate(schedule: MaintenanceScheduleEntry[]): string | null {
	const row = schedule.find(
		(item) =>
			item.maintenanceStatus !== "done" &&
			item.maintenanceStatus !== "cancelled",
	);

	return row?.maintenanceDate ?? null;
}

function deriveStatus(schedule: MaintenanceScheduleEntry[]): MaintenanceStatus {
	if (schedule.length === 0) return "scheduled";

	const activeRows = schedule.filter(
		(row) => row.maintenanceStatus !== "cancelled",
	);

	if (activeRows.length === 0) return "cancelled";

	const completedRows = activeRows.filter(
		(row) => row.completed || row.maintenanceStatus === "done",
	);

	if (completedRows.length === activeRows.length) return "completed";

	if (activeRows.some((row) => row.maintenanceStatus === "overdue")) {
		return "overdue";
	}

	return "active";
}

function resolveMaintenanceTypeLabel(
	value: MaintenanceType,
	locale: Locale,
): string {
	const labels: Record<Locale, Record<MaintenanceType, string>> = {
		es: {
			preventive: "Preventivo",
			corrective: "Correctivo",
			cleaning: "Limpieza",
			inspection: "Inspección",
			replacement: "Reemplazo",
			other: "Otro",
		},
		en: {
			preventive: "Preventive",
			corrective: "Corrective",
			cleaning: "Cleaning",
			inspection: "Inspection",
			replacement: "Replacement",
			other: "Other",
		},
	};

	return labels[locale][value] ?? labels[locale].other;
}

function resolveGenerationModeLabel(
	value: MaintenanceGenerationMode,
	locale: Locale,
): string {
	if (locale === "en") {
		return value === "manual" ? "Manual" : "Automatic";
	}

	return value === "manual" ? "Manual" : "Automático";
}

function resolveFrequencyUnitLabel(
	value: MaintenanceFrequencyUnit,
	locale: Locale,
): string {
	const labels: Record<Locale, Record<MaintenanceFrequencyUnit, string>> = {
		es: {
			days: "Días",
			weeks: "Semanas",
			months: "Meses",
			years: "Años",
		},
		en: {
			days: "Days",
			weeks: "Weeks",
			months: "Months",
			years: "Years",
		},
	};

	return labels[locale][value] ?? "—";
}

function resolveExecutionLabel(
	value: MaintenanceExecutionStatus,
	locale: Locale,
): string {
	const labels: Record<Locale, Record<MaintenanceExecutionStatus, string>> = {
		es: {
			pending: "Pendiente",
			done: "Realizado",
			overdue: "Vencido",
			cancelled: "Cancelado",
		},
		en: {
			pending: "Pending",
			done: "Completed",
			overdue: "Overdue",
			cancelled: "Cancelled",
		},
	};

	return labels[locale][value] ?? labels[locale].pending;
}

function buildProjectContextQuery(params: {
	organizationId: string;
	projectId: string;
}): string {
	const searchParams = new URLSearchParams();

	if (normalizeString(params.organizationId)) {
		searchParams.set("organizationId", normalizeString(params.organizationId));
	}

	if (normalizeString(params.projectId)) {
		searchParams.set("projectId", normalizeString(params.projectId));
	}

	const queryString = searchParams.toString();
	return queryString ? `?${queryString}` : "";
}

function serialize(value: MaintenanceWritePayload): string {
	return JSON.stringify(value);
}

/* -------------------------------------------------------------------------- */
/* Small UI blocks                                                            */
/* -------------------------------------------------------------------------- */

function FieldLabel({
	children,
	hint,
}: {
	children: React.ReactNode;
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
	icon?: React.ReactNode;
	children: React.ReactNode;
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
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AdminMaintenanceCreatePage() {
	const router = useRouter();

	const locale: Locale = "es";
	const t = TEXT[locale];
	const dateFormat: AppDateFormat = DEFAULT_APP_DATE_FORMAT;

	const [form, setForm] = useState<MaintenanceWritePayload>(
		createEmptyMaintenancePayload(),
	);

	const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
	const [projects, setProjects] = useState<ProjectOption[]>([]);
	const [selectedProjectContext, setSelectedProjectContext] =
		useState<MaintenanceProjectContext | null>(null);

	const [loadingBootstrap, setLoadingBootstrap] = useState(true);
	const [loadingProjectContext, setLoadingProjectContext] = useState(false);
	const [saving, setSaving] = useState(false);

	const [error, setError] = useState("");
	const [projectContextError, setProjectContextError] = useState("");
	const [scheduleMessage, setScheduleMessage] = useState("");

	const [snapshot, setSnapshot] = useState("");

	const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

	const selectedOrganization = useMemo(
		() => organizations.find((item) => item.id === form.organizationId) ?? null,
		[organizations, form.organizationId],
	);

	const availableProjects = useMemo(() => projects, [projects]);

	const canSave = useMemo(() => {
		if (saving || loadingBootstrap || loadingProjectContext) return false;
		if (!normalizeString(form.organizationId)) return false;
		if (!normalizeString(form.projectId)) return false;
		if (!normalizeString(form.title)) return false;
		if (form.schedule.length === 0) return false;

		return true;
	}, [form, loadingBootstrap, loadingProjectContext, saving]);

	const hasChanges = useMemo(() => {
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

	/* -------------------------------------------------------------------------- */
	/* Data loading                                                               */
	/* -------------------------------------------------------------------------- */
	/**
	 * Carga progresiva:
	 * - organizaciones al montar
	 * - proyectos al seleccionar organización
	 * - contexto contractual al seleccionar proyecto
	 */

	useEffect(() => {
		setSnapshot(serialize(form));
		// Solo snapshot inicial del formulario vacío.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		let cancelled = false;

		async function loadOrganizations() {
			try {
				setLoadingBootstrap(true);
				setError("");

				const response = await fetch("/api/admin/organizations", {
					method: "GET",
					cache: "no-store",
				});

				const json = (await response
					.json()
					.catch(() => null)) as OrganizationsResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setOrganizations([]);
					setError(json && !json.ok ? json.error : t.loadOrganizationsError);
					return;
				}

				const source = Array.isArray(json.items ?? json.organizations ?? json.data)
					? (json.items ?? json.organizations ?? json.data)!
					: [];

				const mapped = source
					.map((item) => ({
						id: normalizeString(item._id),
						label: mapOrganizationLabel(item, t.unnamed),
						email:
							normalizeString(item.primaryEmail) ||
							normalizeString(item.email),
					}))
					.filter((item) => item.id.length > 0);

				const deduped = Array.from(
					new Map(mapped.map((item) => [item.id, item])).values(),
				);

				setOrganizations(deduped);
			} catch (err) {
				if (cancelled) return;

				setOrganizations([]);
				setError(err instanceof Error ? err.message : t.loadOrganizationsError);
			} finally {
				if (!cancelled) setLoadingBootstrap(false);
			}
		}

		void loadOrganizations();

		return () => {
			cancelled = true;
		};
	}, [t.loadOrganizationsError, t.unnamed]);

	useEffect(() => {
		let cancelled = false;

		async function loadProjectsBySelectedOrganization() {
			if (!normalizeString(form.organizationId)) {
				setProjects([]);
				return;
			}

			try {
				setProjectContextError("");

				const response = await fetch(
					`/api/admin/maintenance/context${buildProjectContextQuery({
						organizationId: form.organizationId,
						projectId: "",
					})}`,
					{
						method: "GET",
						cache: "no-store",
					},
				);

				const json = (await response
					.json()
					.catch(() => null)) as MaintenanceProjectContextResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setProjects([]);
					setProjectContextError(
						json && !json.ok ? json.error : t.loadProjectsError,
					);
					return;
				}

				setProjects(Array.isArray(json.projects) ? json.projects : []);
			} catch (err) {
				if (cancelled) return;

				setProjects([]);
				setProjectContextError(
					err instanceof Error ? err.message : t.loadProjectsError,
				);
			}
		}

		void loadProjectsBySelectedOrganization();

		return () => {
			cancelled = true;
		};
	}, [form.organizationId, t.loadProjectsError]);

	useEffect(() => {
		let cancelled = false;

		async function loadSelectedProjectContext() {
			if (!normalizeString(form.organizationId) || !normalizeString(form.projectId)) {
				setSelectedProjectContext(null);

				setForm((current) => ({
					...current,
					organizationName:
						selectedOrganization?.label || current.organizationName || "",
					projectTitle: "",
					contractStartDate: null,
					contractDurationMonths: null,
					contractEndDate: null,
					schedule: [],
					nextDueDate: null,
					status: "scheduled",
				}));

				setScheduleMessage("");
				return;
			}

			try {
				setLoadingProjectContext(true);
				setProjectContextError("");

				const response = await fetch(
					`/api/admin/maintenance/context${buildProjectContextQuery({
						organizationId: form.organizationId,
						projectId: form.projectId,
					})}`,
					{
						method: "GET",
						cache: "no-store",
					},
				);

				const json = (await response
					.json()
					.catch(() => null)) as MaintenanceProjectContextResponse | null;

				if (cancelled) return;

				if (!response.ok || !json || !json.ok) {
					setSelectedProjectContext(null);
					setProjectContextError(
						json && !json.ok ? json.error : t.loadProjectContextError,
					);
					return;
				}

				const context = json.projectContext ?? null;
				setSelectedProjectContext(context);

				if (!context) {
					setProjectContextError(t.projectContextNotFound);
					return;
				}

				setForm((current) => ({
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
							: [],
					schedule: [],
					nextDueDate: null,
					status: "scheduled",
				}));

				setScheduleMessage("");
			} catch (err) {
				if (cancelled) return;

				setSelectedProjectContext(null);
				setProjectContextError(
					err instanceof Error ? err.message : t.loadProjectContextError,
				);
			} finally {
				if (!cancelled) setLoadingProjectContext(false);
			}
		}

		void loadSelectedProjectContext();

		return () => {
			cancelled = true;
		};
	}, [
		form.organizationId,
		form.projectId,
		selectedOrganization?.label,
		t.loadProjectContextError,
		t.projectContextNotFound,
	]);

	function updateSchedule(schedule: MaintenanceScheduleEntry[]) {
		setForm((current) => ({
			...current,
			schedule,
			nextDueDate: deriveNextDueDate(schedule),
			status: deriveStatus(schedule),
		}));
	}

	function handleGenerateSchedule() {
		const rows = generateAutomaticSchedule(form);

		if (rows.length === 0) {
			setScheduleMessage("");
			setError(t.generateScheduleError);
			return;
		}

		setError("");
		setScheduleMessage(t.scheduleGenerated(rows.length));
		updateSchedule(rows);
	}

	function handleAddManualRow() {
		const lastRow = form.schedule[form.schedule.length - 1];

		const baseDate = lastRow
			? addInterval(
				toDateInput(lastRow.maintenanceDate),
				form.frequencyValue ?? 1,
				form.frequencyUnit ?? "months",
			)
			: toDateInput(form.contractStartDate) ||
			new Date().toISOString().split("T")[0] ||
			"";

		const row = createScheduleRow(
			baseDate,
			form.alertDaysBefore ?? 0,
			form.schedule.length,
		);

		setError("");
		setScheduleMessage(t.manualRowAdded);
		setForm((current) => {
			const schedule = [...current.schedule, row];

			return {
				...current,
				generationMode: "manual",
				schedule,
				nextDueDate: deriveNextDueDate(schedule),
				status: deriveStatus(schedule),
			};
		});
	}

	function updateScheduleRow(
		eventId: string,
		updater: (row: MaintenanceScheduleEntry) => MaintenanceScheduleEntry,
	) {
		setForm((current) => {
			const schedule = current.schedule.map((row) =>
				row.eventId === eventId ? updater(row) : row,
			);

			return {
				...current,
				schedule,
				nextDueDate: deriveNextDueDate(schedule),
				status: deriveStatus(schedule),
			};
		});
	}

	/* -------------------------------------------------------------------------- */
	/* Save flow                                                                  */
	/* -------------------------------------------------------------------------- */
	/**
	 * Construye el payload final de creación.
	 *
	 * Regla:
	 * - organización/proyecto/contrato se consolidan desde selectedProjectContext
	 * - nextDueDate y status se derivan desde schedule
	 */

	async function handleSave() {
		if (!canSave) return;

		try {
			setSaving(true);
			setError("");

			const payload: MaintenanceWritePayload = {
				...form,
				organizationName:
					selectedProjectContext?.organizationName ||
					selectedOrganization?.label ||
					form.organizationName,
				projectTitle: selectedProjectContext?.projectTitle || form.projectTitle,
				contractStartDate: selectedProjectContext?.contractStartDate ?? null,
				contractDurationMonths:
					selectedProjectContext?.contractDurationMonths ?? null,
				contractEndDate: selectedProjectContext?.contractEndDate ?? null,
				nextDueDate: deriveNextDueDate(form.schedule),
				status: deriveStatus(form.schedule),
			};

			const response = await fetch("/api/admin/maintenance", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const json = (await response
				.json()
				.catch(() => null)) as MaintenanceCreateResponse | null;

			if (!response.ok || !json || !json.ok) {
				const detailText =
					json &&
						!json.ok &&
						Array.isArray(json.details) &&
						json.details.length > 0
						? ` ${json.details.join(" ")}`
						: "";

				setError(
					json && !json.ok ? `${json.error}${detailText}`.trim() : t.createError,
				);
				return;
			}

			router.push(`/admin/dashboard/maintenance/${json.item._id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : t.createError);
		} finally {
			setSaving(false);
		}
	}

	function handleBack() {
		if (hasChanges) {
			setLeaveConfirmOpen(true);
			return;
		}

		router.push("/admin/dashboard/maintenance");
	}

	return (
		<div className="space-y-6 pb-24">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="max-w-3xl space-y-4">
						<div className="flex flex-wrap items-center gap-3">
							<button
								type="button"
								onClick={handleBack}
								className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
							>
								<ArrowLeft className="h-4 w-4" />
								{t.back}
							</button>
						</div>

						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
							{t.eyebrow}
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-text-primary">
							{t.title}
						</h1>

						<p className="text-base leading-8 text-text-secondary">
							{t.subtitle}
						</p>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={handleGenerateSchedule}
							disabled={form.generationMode !== "automatic" || (form.frequencyValue ?? 0) <= 0}
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
							{saving ? t.saving : t.createMaintenance}
							<ArrowRight className="h-4 w-4" />
						</button>
					</div>
				</div>
			</section>

			{error ? (
				<section className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
					<p className="text-sm font-semibold text-rose-700">{error}</p>
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
				<div className="grid gap-5 xl:grid-cols-2">
					<div>
						<FieldLabel>{t.organization}</FieldLabel>
						<select
							value={form.organizationId}
							onChange={(e) => {
								const nextOrganizationId = e.currentTarget.value;
								const organizationName =
									organizations.find((item) => item.id === nextOrganizationId)
										?.label || "";

								setForm((current) => ({
									...current,
									organizationId: nextOrganizationId,
									projectId: "",
									organizationName,
									projectTitle: "",
									contractStartDate: null,
									contractDurationMonths: null,
									contractEndDate: null,
									schedule: [],
									nextDueDate: null,
									status: "scheduled",
								}));
							}}
							disabled={loadingBootstrap || saving}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="">{t.selectOrganization}</option>
							{organizations.map((item) => (
								<option key={item.id} value={item.id}>
									{item.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<FieldLabel>{t.project}</FieldLabel>
						<select
							value={form.projectId}
							onChange={(e) => {
								const nextProjectId = e.currentTarget.value;

								setForm((current) => ({
									...current,
									projectId: nextProjectId,
									schedule: [],
									nextDueDate: null,
									status: "scheduled",
								}));
							}}
							disabled={
								loadingBootstrap ||
								loadingProjectContext ||
								saving ||
								!normalizeString(form.organizationId)
							}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="">{t.selectProject}</option>
							{availableProjects.map((item) => (
								<option key={item._id} value={item._id}>
									{item.title}
								</option>
							))}
						</select>
					</div>
				</div>

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
							{formatAppDate(form.contractStartDate, dateFormat)}
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
							{formatAppDate(form.contractEndDate, dateFormat)}
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
							onChange={(e) => {
								const value = e.currentTarget.value;

								setForm((current) => ({
									...current,
									title: value,
								}));
							}}
							placeholder={t.titlePlaceholder}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						/>
					</div>

					<div>
						<FieldLabel>{t.type}</FieldLabel>
						<select
							value={form.maintenanceType}
							onChange={(e) => {
								const value = e.currentTarget.value as MaintenanceType;

								setForm((current) => ({
									...current,
									maintenanceType: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="preventive">
								{resolveMaintenanceTypeLabel("preventive", locale)}
							</option>
							<option value="corrective">
								{resolveMaintenanceTypeLabel("corrective", locale)}
							</option>
							<option value="cleaning">
								{resolveMaintenanceTypeLabel("cleaning", locale)}
							</option>
							<option value="inspection">
								{resolveMaintenanceTypeLabel("inspection", locale)}
							</option>
							<option value="replacement">
								{resolveMaintenanceTypeLabel("replacement", locale)}
							</option>
							<option value="other">
								{resolveMaintenanceTypeLabel("other", locale)}
							</option>
						</select>
					</div>

					<div className="xl:col-span-2">
						<FieldLabel>{t.description}</FieldLabel>
						<textarea
							rows={4}
							value={form.description}
							onChange={(e) => {
								const value = e.currentTarget.value;

								setForm((current) => ({
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
							onChange={(e) => {
								const value = e.currentTarget.value as MaintenanceGenerationMode;

								setForm((current) => ({
									...current,
									generationMode: value,
									schedule: [],
									nextDueDate: null,
									status: "scheduled",
								}));

								setScheduleMessage("");
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="automatic">
								{resolveGenerationModeLabel("automatic", locale)}
							</option>
							<option value="manual">
								{resolveGenerationModeLabel("manual", locale)}
							</option>
						</select>
					</div>

					<div>
						<FieldLabel>{t.frequency}</FieldLabel>
						<input
							type="number"
							min={1}
							value={form.frequencyValue ?? ""}
							onChange={(e) => {
								const value = toNullableNumber(e.currentTarget.value);

								setForm((current) => ({
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
							onChange={(e) => {
								const value = e.currentTarget.value as MaintenanceFrequencyUnit;

								setForm((current) => ({
									...current,
									frequencyUnit: value,
								}));
							}}
							className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
						>
							<option value="days">
								{resolveFrequencyUnitLabel("days", locale)}
							</option>
							<option value="weeks">
								{resolveFrequencyUnitLabel("weeks", locale)}
							</option>
							<option value="months">
								{resolveFrequencyUnitLabel("months", locale)}
							</option>
							<option value="years">
								{resolveFrequencyUnitLabel("years", locale)}
							</option>
						</select>
					</div>

					<div>
						<FieldLabel>{t.alertDaysBefore}</FieldLabel>
						<input
							type="number"
							min={0}
							value={form.alertDaysBefore ?? ""}
							onChange={(e) => {
								const value = toNullableNumber(e.currentTarget.value);

								setForm((current) => {
									const schedule = current.schedule.map((row) => ({
										...row,
										alertDate: subtractDays(
											toDateInput(row.maintenanceDate),
											value ?? 0,
										),
									}));

									return {
										...current,
										alertDaysBefore: value,
										schedule,
										nextDueDate: deriveNextDueDate(schedule),
										status: deriveStatus(schedule),
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
								onChange={(e) => {
									const checked = e.currentTarget.checked;

									setForm((current) => ({
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
								onChange={(e) => {
									const checked = e.currentTarget.checked;

									setForm((current) => ({
										...current,
										notifyClient: checked,
									}));
								}}
								className="h-4 w-4"
							/>
							<span>{t.notifyClient}</span>
						</label>

						<label className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-primary">
							<input
								type="checkbox"
								checked={form.notifyInternal}
								onChange={(e) => {
									const checked = e.currentTarget.checked;

									setForm((current) => ({
										...current,
										notifyInternal: checked,
									}));
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
						onClick={handleGenerateSchedule}
						disabled={form.generationMode !== "automatic" || (form.frequencyValue ?? 0) <= 0}
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
						{formatAppDate(form.nextDueDate, dateFormat)}
					</div>
				</div>

				{form.schedule.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-text-secondary">
						{t.noRows}
					</div>
				) : (
					<div className="overflow-x-auto rounded-2xl border border-border">
						<table className="min-w-[980px] w-full text-sm">
							<thead className="bg-surface text-left text-xs uppercase text-text-secondary">
								<tr>
									<th className="px-3 py-3">{t.number}</th>
									<th className="px-3 py-3">{t.date}</th>
									<th className="px-3 py-3">{t.alert}</th>
									<th className="px-3 py-3">{t.status}</th>
									<th className="px-3 py-3">{t.completed}</th>
									<th className="px-3 py-3">{t.note}</th>
									<th className="px-3 py-3">{t.actions}</th>
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
												onChange={(e) => {
													const value = e.currentTarget.value;

													updateScheduleRow(row.eventId, (current) => ({
														...current,
														maintenanceDate: value,
														alertDate: subtractDays(
															value,
															form.alertDaysBefore ?? 0,
														),
													}));
												}}
												className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
											/>
										</td>

										<td className="px-3 py-3">
											{formatAppDate(row.alertDate, dateFormat)}
										</td>

										<td className="px-3 py-3">
											<select
												value={row.maintenanceStatus}
												onChange={(e) => {
													const value = e.currentTarget
														.value as MaintenanceExecutionStatus;

													updateScheduleRow(row.eventId, (current) => ({
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
												className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
											>
												<option value="pending">
													{resolveExecutionLabel("pending", locale)}
												</option>
												<option value="done">
													{resolveExecutionLabel("done", locale)}
												</option>
												<option value="overdue">
													{resolveExecutionLabel("overdue", locale)}
												</option>
												<option value="cancelled">
													{resolveExecutionLabel("cancelled", locale)}
												</option>
											</select>
										</td>

										<td className="px-3 py-3">
											<input
												type="checkbox"
												checked={row.completed}
												onChange={(e) => {
													const checked = e.currentTarget.checked;

													updateScheduleRow(row.eventId, (current) => ({
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
											<input
												value={row.note}
												onChange={(e) => {
													const value = e.currentTarget.value;

													updateScheduleRow(row.eventId, (current) => ({
														...current,
														note: value,
													}));
												}}
												className="h-10 w-64 rounded-xl border border-border bg-white px-3 text-sm"
											/>
										</td>

										<td className="px-3 py-3">
											<button
												type="button"
												onClick={() => {
													const schedule = form.schedule.filter(
														(item) => item.eventId !== row.eventId,
													);

													updateSchedule(
														schedule.map((item, itemIndex) => ({
															...item,
															cycleIndex: itemIndex,
														})),
													);
												}}
												className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
											>
												{t.delete}
											</button>
										</td>
									</tr>
								))}
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
							onChange={(e) => {
								const value = e.currentTarget.value;

								setForm((current) => ({
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
							onChange={(e) => {
								const value = e.currentTarget.value;

								setForm((current) => ({
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

			{loadingBootstrap ? (
				<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
					<p className="text-sm text-text-secondary">{t.loadingBaseData}</p>
				</section>
			) : null}

			<div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-xl">
				<span className="text-xs font-semibold text-text-secondary">
					{form.schedule.length} {t.rows}
				</span>

				<button
					type="button"
					onClick={() => void handleSave()}
					disabled={!canSave}
					className="inline-flex items-center gap-2 rounded-2xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryStrong disabled:cursor-not-allowed disabled:opacity-50"
				>
					{saving ? t.saving : t.createMaintenance}
					<ArrowRight className="h-4 w-4" />
				</button>
			</div>
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