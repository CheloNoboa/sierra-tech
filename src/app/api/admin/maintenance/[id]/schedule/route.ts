/**
 * =============================================================================
 * 📄 API Route: Admin Maintenance Schedule Actions
 * Path: src/app/api/admin/maintenance/[id]/schedule/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo operativo para la tabla `schedule` del módulo
 * Maintenance.
 *
 * Propósito:
 * - aplicar acciones puntuales sobre filas del schedule
 * - persistir la tabla operativa como fuente de verdad
 * - recalcular nextDueDate y status del maintenance
 * - respetar la regla oficial del módulo:
 *   - si cambia la primera fila en automático, se recalcula toda la secuencia
 *   - si cambia cualquier otra fila, solo se recalcula esa fila
 *
 * Alcance:
 * - PATCH:
 *   - set_maintenance_date
 *   - set_alert_emitted
 *   - set_completed
 *   - set_status
 *   - set_note
 *
 * Decisiones:
 * - usa el engine oficial del módulo como única fuente de lógica operativa
 * - no reimplementa lógica de schedule dentro del route
 * - no usa any
 * - no expone detalles internos innecesarios
 * - responde siempre con contrato consistente { ok, item }
 *
 * Reglas:
 * - schedule es la fuente de verdad operativa
 * - status y nextDueDate se derivan desde schedule
 * - documentos e imágenes siguen usando R2 como fuente de verdad
 *
 * EN:
 * Admin operational route for schedule row actions in the Maintenance module.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";

import Maintenance from "@/models/Maintenance";

import {
	applyScheduleRowUpdate,
	buildMaintenanceState,
} from "@/lib/maintenance/maintenance.engine";

import { normalizeMaintenanceEntity } from "@/lib/maintenance/maintenance.normalize";

import type {
	MaintenanceEntity,
	MaintenanceScheduleRowUpdate,
	MaintenanceWritePayload,
} from "@/types/maintenance";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RouteParams = {
	params: Promise<{
		id: string;
	}>;
};

type RouteContext = {
	sessionUserId: string;
};

type MaintenanceSchedulePatchResponse =
	| {
		ok: true;
		item: MaintenanceEntity;
	}
	| {
		ok: false;
		error: string;
		details?: string[];
	};

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                               */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function getTodayDateOnly(): string {
	const today = new Date();

	return [
		today.getFullYear(),
		String(today.getMonth() + 1).padStart(2, "0"),
		String(today.getDate()).padStart(2, "0"),
	].join("-");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidObjectId(value: string): boolean {
	return Types.ObjectId.isValid(value);
}

async function requireAdminContext(): Promise<
	| { ok: true; value: RouteContext }
	| {
		ok: false;
		response: NextResponse<MaintenanceSchedulePatchResponse>;
	}
> {
	const session = await getServerSession(authOptions);
	const user = session?.user;

	if (!user) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					ok: false,
					error: "No autorizado.",
				},
				{ status: 401 },
			),
		};
	}

	const role = normalizeString(user.role).toLowerCase();
	const permissions = Array.isArray(user.permissions)
		? user.permissions.map((item) => normalizeString(item))
		: [];

	const canWrite =
		role === "admin" ||
		role === "superadmin" ||
		permissions.includes("*") ||
		permissions.includes("maintenance.write");

	if (!canWrite) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					ok: false,
					error: "No tienes permisos para modificar el schedule de Maintenance.",
				},
				{ status: 403 },
			),
		};
	}

	return {
		ok: true,
		value: {
			sessionUserId: normalizeString(user._id),
		},
	};
}

/* -------------------------------------------------------------------------- */
/* Maintenance helpers                                                        */
/* -------------------------------------------------------------------------- */

async function findMaintenanceById(id: string) {
	if (!id || !isValidObjectId(id)) {
		return null;
	}

	return Maintenance.findById(id);
}

function buildPersistencePayload(
	entity: MaintenanceEntity,
	recalculated: MaintenanceWritePayload,
): Record<string, unknown> {
	return {
		organizationId: new Types.ObjectId(entity.organizationId),
		projectId: new Types.ObjectId(entity.projectId),

		organizationName: recalculated.organizationName,
		projectTitle: recalculated.projectTitle,

		title: recalculated.title,
		description: recalculated.description,

		maintenanceType: recalculated.maintenanceType,
		generationMode: recalculated.generationMode,

		contractStartDate: recalculated.contractStartDate,
		contractDurationMonths: recalculated.contractDurationMonths,
		contractEndDate: recalculated.contractEndDate,

		frequencyValue: recalculated.frequencyValue,
		frequencyUnit: recalculated.frequencyUnit,

		alertDaysBefore: recalculated.alertDaysBefore,
		isRecurring: recalculated.isRecurring,

		notifyClient: recalculated.notifyClient,
		notifyInternal: recalculated.notifyInternal,

		instructions: recalculated.instructions,
		notes: recalculated.notes,

		relatedDocumentIds: recalculated.relatedDocumentIds,
		attachments: recalculated.attachments,

		nextDueDate: recalculated.nextDueDate,
		status: recalculated.status,
		schedule: recalculated.schedule,
	};
}

/* -------------------------------------------------------------------------- */
/* Update validators                                                          */
/* -------------------------------------------------------------------------- */

function parseScheduleRowUpdate(
	value: unknown,
): MaintenanceScheduleRowUpdate | null {
	if (!isRecord(value)) {
		return null;
	}

	const action = normalizeString(value.action);
	const eventId = normalizeString(value.eventId);

	if (!action || !eventId) {
		return null;
	}

	if (action === "set_maintenance_date") {
		const maintenanceDate = normalizeString(value.maintenanceDate);

		if (!maintenanceDate) {
			return null;
		}

		return {
			action: "set_maintenance_date",
			eventId,
			maintenanceDate,
		};
	}

	if (action === "set_alert_emitted") {
		if (typeof value.emitted !== "boolean") {
			return null;
		}

		return {
			action: "set_alert_emitted",
			eventId,
			emitted: value.emitted,
		};
	}

	if (action === "set_completed") {
		if (typeof value.completed !== "boolean") {
			return null;
		}

		const completedByRole = normalizeString(value.completedByRole);

		if (completedByRole !== "client" && completedByRole !== "internal") {
			return null;
		}

		return {
			action: "set_completed",
			eventId,
			completed: value.completed,
			completedByRole,
		};
	}

	if (action === "set_status") {
		const maintenanceStatus = normalizeString(value.maintenanceStatus);

		if (
			maintenanceStatus !== "pending" &&
			maintenanceStatus !== "done" &&
			maintenanceStatus !== "overdue" &&
			maintenanceStatus !== "cancelled"
		) {
			return null;
		}

		return {
			action: "set_status",
			eventId,
			maintenanceStatus,
		};
	}

	if (action === "set_note") {
		return {
			action: "set_note",
			eventId,
			note: normalizeString(value.note),
		};
	}

	return null;
}

function validateScheduleRowUpdate(
	update: MaintenanceScheduleRowUpdate,
): string[] {
	const errors: string[] = [];

	if (!normalizeString(update.eventId)) {
		errors.push("eventId es obligatorio.");
	}

	if (update.action === "set_maintenance_date") {
		const maintenanceDate = normalizeString(update.maintenanceDate);
		const parts = maintenanceDate.split("-");

		if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
			errors.push("maintenanceDate debe tener formato YYYY-MM-DD.");
		}
	}

	return errors;
}

/* -------------------------------------------------------------------------- */
/* PATCH                                                                      */
/* -------------------------------------------------------------------------- */

export async function PATCH(
	request: NextRequest,
	{ params }: RouteParams,
): Promise<NextResponse<MaintenanceSchedulePatchResponse>> {
	const auth = await requireAdminContext();

	if (!auth.ok) {
		return auth.response;
	}

	try {
		await connectToDB();

		const { id } = await params;
		const existing = await findMaintenanceById(id);

		if (!existing) {
			return NextResponse.json(
				{
					ok: false,
					error: "Maintenance no encontrado.",
				},
				{ status: 404 },
			);
		}

		const body = (await request.json().catch(() => null)) as unknown;
		const update = parseScheduleRowUpdate(body);

		if (!update) {
			return NextResponse.json(
				{
					ok: false,
					error: "La acción del schedule es inválida.",
				},
				{ status: 400 },
			);
		}

		const validationErrors = validateScheduleRowUpdate(update);

		if (validationErrors.length > 0) {
			return NextResponse.json(
				{
					ok: false,
					error: "No se pudo aplicar la acción sobre el schedule.",
					details: validationErrors,
				},
				{ status: 400 },
			);
		}

		const entity = normalizeMaintenanceEntity(existing.toObject());
		const today = getTodayDateOnly();

		const nextSchedule = applyScheduleRowUpdate({
			schedule: entity.schedule,
			update,
			alertDaysBefore: entity.alertDaysBefore,
			notifyClient: entity.notifyClient,
			notifyInternal: entity.notifyInternal,
			clientEmail: "",
			today,
			generationMode: entity.generationMode,
			contractEndDate: entity.contractEndDate,
			frequencyValue: entity.frequencyValue,
			frequencyUnit: entity.frequencyUnit,
			isRecurring: entity.isRecurring,
		});

		const recalculated = buildMaintenanceState(
			{
				...entity,
				schedule: nextSchedule,
			},
			{
				today,
				clientEmail: "",
			},
		);

		await Maintenance.findByIdAndUpdate(
			id,
			{
				$set: buildPersistencePayload(entity, recalculated),
			},
			{
				new: false,
				runValidators: true,
			},
		);

		const updated = await findMaintenanceById(id);

		if (!updated) {
			return NextResponse.json(
				{
					ok: false,
					error: "No se pudo recuperar el maintenance actualizado.",
				},
				{ status: 500 },
			);
		}

		const normalizedUpdated = normalizeMaintenanceEntity(updated.toObject());

		return NextResponse.json({
			ok: true,
			item: normalizedUpdated,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "No se pudo actualizar el schedule del maintenance.",
			},
			{ status: 500 },
		);
	}
}