/**
 * =============================================================================
 * 📄 API Route: Admin Maintenance Detail
 * Path: src/app/api/admin/maintenance/[id]/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo de detalle del módulo Maintenance.
 *
 * Propósito:
 * - obtener un maintenance por id
 * - actualizar un maintenance existente
 * - eliminar un maintenance
 * - reutilizar el contrato oficial del módulo
 * - aplicar normalización y recálculo antes de persistir
 *
 * Alcance:
 * - GET: detalle administrativo
 * - PUT: actualización completa
 * - DELETE: eliminación del maintenance
 *
 * Decisiones:
 * - usa el modelo Maintenance como entidad independiente
 * - usa normalize + engine como fuente oficial de consistencia
 * - vuelve a resolver el contexto del proyecto desde Projects al guardar
 * - no confía ciegamente en snapshots enviados por el cliente
 *
 * Reglas:
 * - sin any
 * - respuestas consistentes { ok, ... }
 * - sin exponer detalles internos innecesarios
 *
 * EN:
 * Admin detail endpoint for the Maintenance module.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";

import Maintenance from "@/models/Maintenance";

import {
	normalizeMaintenanceEntity,
	normalizeMaintenanceWritePayload,
} from "@/lib/maintenance/maintenance.normalize";

import { getMaintenanceProjectContextByProjectId } from "@/lib/maintenance/maintenance.project-context";

import type {
	MaintenanceEntity,
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

type MaintenanceDetailResponse =
	| {
		ok: true;
		item: MaintenanceEntity;
	}
	| {
		ok: false;
		error: string;
	};

type MaintenanceUpdateResponse =
	| {
		ok: true;
		item: MaintenanceEntity;
	}
	| {
		ok: false;
		error: string;
		details?: string[];
	};

type MaintenanceDeleteResponse =
	| {
		ok: true;
		deletedId: string;
	}
	| {
		ok: false;
		error: string;
	};

/* -------------------------------------------------------------------------- */
/* Auth helpers                                                               */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function isValidObjectId(value: string): boolean {
	return Types.ObjectId.isValid(value);
}

async function requireAdminContext(): Promise<
	| { ok: true; value: RouteContext }
	| {
		ok: false;
		response: NextResponse<
			MaintenanceDetailResponse | MaintenanceUpdateResponse | MaintenanceDeleteResponse
		>;
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

	const isAdmin =
		role === "admin" ||
		role === "superadmin" ||
		permissions.includes("*") ||
		permissions.includes("maintenance.read") ||
		permissions.includes("maintenance.write");

	if (!isAdmin) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					ok: false,
					error: "No tienes permisos para acceder al módulo Maintenance.",
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
	preparedWritePayload: MaintenanceWritePayload,
): Record<string, unknown> {
	return {
		organizationId: new Types.ObjectId(preparedWritePayload.organizationId),
		projectId: new Types.ObjectId(preparedWritePayload.projectId),

		organizationName: preparedWritePayload.organizationName,
		projectTitle: preparedWritePayload.projectTitle,

		title: preparedWritePayload.title,
		description: preparedWritePayload.description,

		maintenanceType: preparedWritePayload.maintenanceType,
		generationMode: preparedWritePayload.generationMode,

		contractStartDate: preparedWritePayload.contractStartDate,
		contractDurationMonths: preparedWritePayload.contractDurationMonths,
		contractEndDate: preparedWritePayload.contractEndDate,

		frequencyValue: preparedWritePayload.frequencyValue,
		frequencyUnit: preparedWritePayload.frequencyUnit,

		alertDaysBefore: preparedWritePayload.alertDaysBefore,
		isRecurring: preparedWritePayload.isRecurring,

		notifyClient: preparedWritePayload.notifyClient,
		notifyInternal: preparedWritePayload.notifyInternal,

		instructions: preparedWritePayload.instructions,
		notes: preparedWritePayload.notes,

		relatedDocumentIds: preparedWritePayload.relatedDocumentIds,
		attachments: preparedWritePayload.attachments,

		nextDueDate: preparedWritePayload.nextDueDate,
		status: preparedWritePayload.status,

		schedule: preparedWritePayload.schedule,
	};
}

function validateWritePayload(
	payload: MaintenanceWritePayload,
): string[] {
	const errors: string[] = [];

	if (!payload.organizationId) {
		errors.push("organizationId es obligatorio.");
	}

	if (!payload.projectId) {
		errors.push("projectId es obligatorio.");
	}

	if (!payload.title.trim()) {
		errors.push("El título del mantenimiento es obligatorio.");
	}

	if (
		payload.generationMode === "automatic" &&
		(!payload.frequencyValue ||
			payload.frequencyValue <= 0 ||
			!payload.frequencyUnit)
	) {
		errors.push(
			"En modo automático debes definir frecuencia y unidad válidas.",
		);
	}

	if (
		payload.generationMode === "manual" &&
		payload.schedule.length === 0
	) {
		errors.push(
			"En modo manual debes registrar al menos una fila en el schedule.",
		);
	}

	return errors;
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
	_request: NextRequest,
	{ params }: RouteParams,
): Promise<NextResponse<MaintenanceDetailResponse>> {
	const auth = await requireAdminContext();

	if (!auth.ok) {
		return auth.response as NextResponse<MaintenanceDetailResponse>;
	}

	try {
		await connectToDB();

		const { id } = await params;
		const document = await findMaintenanceById(id);

		if (!document) {
			return NextResponse.json(
				{
					ok: false,
					error: "Maintenance no encontrado.",
				},
				{ status: 404 },
			);
		}

		const normalized = normalizeMaintenanceEntity(document.toObject());

		return NextResponse.json({
			ok: true,
			item: normalized,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "No se pudo obtener el maintenance.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(
	request: NextRequest,
	{ params }: RouteParams,
): Promise<NextResponse<MaintenanceUpdateResponse>> {
	const auth = await requireAdminContext();

	if (!auth.ok) {
		return auth.response as NextResponse<MaintenanceUpdateResponse>;
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

		if (!body || typeof body !== "object") {
			return NextResponse.json(
				{
					ok: false,
					error: "Payload inválido.",
				},
				{ status: 400 },
			);
		}

		const existingObject = existing.toObject() as {
			organizationId?: unknown;
			projectId?: unknown;
		};

		const existingOrganizationId =
			existingObject.organizationId instanceof Types.ObjectId
				? existingObject.organizationId.toString()
				: normalizeString(existingObject.organizationId);

		const existingProjectId =
			existingObject.projectId instanceof Types.ObjectId
				? existingObject.projectId.toString()
				: normalizeString(existingObject.projectId);

		if (!existingOrganizationId || !isValidObjectId(existingOrganizationId)) {
			return NextResponse.json(
				{
					ok: false,
					error: "La organización guardada en este maintenance no es válida.",
				},
				{ status: 400 },
			);
		}

		if (!existingProjectId || !isValidObjectId(existingProjectId)) {
			return NextResponse.json(
				{
					ok: false,
					error: "El proyecto guardado en este maintenance no es válido.",
				},
				{ status: 400 },
			);
		}

		const projectContext = await getMaintenanceProjectContextByProjectId({
			organizationId: existingOrganizationId,
			projectId: existingProjectId,
		});

		if (!projectContext) {
			return NextResponse.json(
				{
					ok: false,
					error: "No se pudo recuperar el contexto del proyecto para Maintenance.",
				},
				{ status: 400 },
			);
		}

		const preparedWritePayload: MaintenanceWritePayload =
			normalizeMaintenanceWritePayload({
				...(body as Record<string, unknown>),

				organizationId: projectContext.organizationId,
				projectId: projectContext.projectId,
				organizationName: projectContext.organizationName,
				projectTitle: projectContext.projectTitle,
				contractStartDate: projectContext.contractStartDate,
				contractDurationMonths: projectContext.contractDurationMonths,
				contractEndDate: projectContext.contractEndDate,
			});

		const validationErrors = validateWritePayload(preparedWritePayload);

		if (validationErrors.length > 0) {
			return NextResponse.json(
				{
					ok: false,
					error: "No se pudo actualizar el maintenance.",
					details: validationErrors,
				},
				{ status: 400 },
			);
		}

		await Maintenance.findByIdAndUpdate(
			id,
			{
				$set: buildPersistencePayload(preparedWritePayload),
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
						: "No se pudo actualizar el maintenance.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(
	_request: NextRequest,
	{ params }: RouteParams,
): Promise<NextResponse<MaintenanceDeleteResponse>> {
	const auth = await requireAdminContext();

	if (!auth.ok) {
		return auth.response as NextResponse<MaintenanceDeleteResponse>;
	}

	try {
		await connectToDB();

		const { id } = await params;

		if (!id || !isValidObjectId(id)) {
			return NextResponse.json(
				{
					ok: false,
					error: "El id del maintenance no es válido.",
				},
				{ status: 400 },
			);
		}

		const deleted = await Maintenance.findByIdAndDelete(id);

		if (!deleted) {
			return NextResponse.json(
				{
					ok: false,
					error: "Maintenance no encontrado.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json({
			ok: true,
			deletedId: id,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "No se pudo eliminar el maintenance.",
			},
			{ status: 500 },
		);
	}
}