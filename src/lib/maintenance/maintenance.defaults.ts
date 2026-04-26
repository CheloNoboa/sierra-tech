/**
 * =============================================================================
 * 📄 Helpers: Maintenance Defaults
 * Path: src/lib/maintenance/maintenance.defaults.ts
 * =============================================================================
 *
 * ES:
 * Defaults oficiales del módulo Maintenance de Sierra Tech.
 *
 * Propósito:
 * - proveer valores iniciales consistentes para UI
 * - evitar estados incompletos en formularios create/edit
 * - centralizar defaults para no duplicarlos en múltiples pantallas
 * - asegurar coherencia con el contrato de:
 *   src/types/maintenance.ts
 *
 * Alcance:
 * - payload base vacío
 * - defaults dependientes del contexto de proyecto
 * - configuración inicial para generación automática
 * - configuración inicial para modo manual
 *
 * Decisiones:
 * - este archivo NO contiene lógica de negocio
 * - este archivo NO recalcula schedule
 * - este archivo NO normaliza (eso lo hace maintenance.normalize)
 * - solo define valores iniciales estables
 *
 * Reglas:
 * - sin any
 * - sin efectos secundarios
 * - sin dependencias externas
 *
 * EN:
 * Official default values for the Sierra Tech Maintenance module.
 * =============================================================================
 */

import type {
	MaintenancePayload,
	MaintenanceProjectContext,
} from "@/types/maintenance";

/* -------------------------------------------------------------------------- */
/* Base default payload                                                       */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Payload base vacío del módulo Maintenance.
 *
 * Uso:
 * - inicialización de formularios
 * - fallback seguro en UI
 * ---------------------------------------------------------------------------
 */
export const MAINTENANCE_BASE_DEFAULTS: MaintenancePayload = {
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

/* -------------------------------------------------------------------------- */
/* Automatic mode defaults                                                    */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Defaults recomendados para generación automática.
 *
 * Nota:
 * - no se fuerza frequencyValue aquí porque depende del caso real
 * ---------------------------------------------------------------------------
 */
export const MAINTENANCE_AUTOMATIC_DEFAULTS = {
	generationMode: "automatic" as const,
	frequencyUnit: "months" as const,
	frequencyValue: 3, // default razonable (trimestral)
	alertDaysBefore: 15,
	isRecurring: true,
};

/* -------------------------------------------------------------------------- */
/* Manual mode defaults                                                       */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Defaults para modo manual.
 *
 * Nota:
 * - no hay frecuencia obligatoria
 * ---------------------------------------------------------------------------
 */
export const MAINTENANCE_MANUAL_DEFAULTS = {
	generationMode: "manual" as const,
	frequencyUnit: null,
	frequencyValue: null,
	alertDaysBefore: 15,
	isRecurring: false,
};

/* -------------------------------------------------------------------------- */
/* Context-based defaults                                                     */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Crea un payload base a partir del contexto del proyecto.
 *
 * Uso:
 * - cuando el usuario selecciona organización + proyecto
 * - bootstrap del formulario create maintenance
 *
 * Importante:
 * - NO genera schedule
 * - NO recalcula nada
 * ---------------------------------------------------------------------------
 */
export function createMaintenanceFromProjectContext(
	context: MaintenanceProjectContext,
): MaintenancePayload {
	return {
		...MAINTENANCE_BASE_DEFAULTS,

		organizationId: context.organizationId,
		projectId: context.projectId,

		organizationName: context.organizationName,
		projectTitle: context.projectTitle,

		contractStartDate: context.contractStartDate,
		contractDurationMonths: context.contractDurationMonths,
		contractEndDate: context.contractEndDate,

		/**
		 * Defaults iniciales:
		 * - dejamos automático como primera opción
		 */
		...MAINTENANCE_AUTOMATIC_DEFAULTS,
	};
}

/* -------------------------------------------------------------------------- */
/* Mode switch helpers                                                        */
/* -------------------------------------------------------------------------- */

/**
 * ---------------------------------------------------------------------------
 * Aplica configuración automática sobre un payload existente.
 *
 * Uso:
 * - cuando el usuario cambia a modo automático en UI
 * ---------------------------------------------------------------------------
 */
export function applyAutomaticModeDefaults(
	payload: MaintenancePayload,
): MaintenancePayload {
	return {
		...payload,
		...MAINTENANCE_AUTOMATIC_DEFAULTS,
	};
}

/**
 * ---------------------------------------------------------------------------
 * Aplica configuración manual sobre un payload existente.
 *
 * Uso:
 * - cuando el usuario cambia a modo manual en UI
 * ---------------------------------------------------------------------------
 */
export function applyManualModeDefaults(
	payload: MaintenancePayload,
): MaintenancePayload {
	return {
		...payload,
		...MAINTENANCE_MANUAL_DEFAULTS,
		/**
		 * En manual, no tiene sentido mantener schedule automático previo
		 * → se limpia para evitar inconsistencias
		 */
		schedule: [],
		nextDueDate: null,
		status: "scheduled",
	};
}