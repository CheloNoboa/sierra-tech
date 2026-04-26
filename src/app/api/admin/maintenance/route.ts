/**
 * =============================================================================
 * 📄 API Route: Admin Maintenance Collection
 * Path: src/app/api/admin/maintenance/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo principal del módulo Maintenance.
 *
 * Propósito:
 * - listar mantenimientos
 * - crear mantenimientos
 * - reutilizar el contrato oficial del módulo
 * - aplicar normalización y recálculo antes de persistir
 *
 * Alcance:
 * - GET: listado administrativo con filtros simples
 * - POST: creación de nuevo maintenance
 *
 * Decisiones:
 * - usa el modelo Maintenance como entidad independiente
 * - usa normalize + engine como fuente oficial de consistencia
 * - recupera contexto del proyecto desde Projects para asegurar:
 *   - organizationId
 *   - projectId
 *   - organizationName
 *   - projectTitle
 *   - contractStartDate
 *   - contractDurationMonths
 *   - contractEndDate
 * - no acepta confiar ciegamente en snapshots enviados por el cliente
 *
 * Reglas:
 * - sin any
 * - sin lógica duplicada fuera del dominio Maintenance
 * - respuestas consistentes { ok, ... }
 * - sin exponer detalles internos innecesarios
 *
 * EN:
 * Main admin collection endpoint for the Maintenance module.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";

import Maintenance from "@/models/Maintenance";

import {
	createEmptyMaintenanceSummary,
	normalizeMaintenanceEntity,
	normalizeMaintenanceWritePayload,
} from "@/lib/maintenance/maintenance.normalize";

import {
	getMaintenanceProjectContextByProjectId,
} from "@/lib/maintenance/maintenance.project-context";

import type {
	MaintenanceEntity,
	MaintenanceFilters,
	MaintenanceListItem,
	MaintenanceSummary,
	MaintenanceWritePayload,
} from "@/types/maintenance";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RouteContext = {
	sessionUserId: string;
};

type MaintenanceListResponse =
	| {
		ok: true;
		items: MaintenanceListItem[];
		summary: MaintenanceSummary;
	}
	| {
		ok: false;
		error: string;
	};

type MaintenanceCreateResponse =
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

function isValidObjectId(value: string): boolean {
	return Types.ObjectId.isValid(value);
}

async function requireAdminContext(): Promise<
	| { ok: true; value: RouteContext }
	| {
		ok: false;
		response: NextResponse<MaintenanceListResponse | MaintenanceCreateResponse>;
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
/* Query helpers                                                              */
/* -------------------------------------------------------------------------- */

function parseFiltersFromRequest(request: NextRequest): MaintenanceFilters {
	const { searchParams } = new URL(request.url);

	return {
		q: normalizeString(searchParams.get("q")),
		organizationId: normalizeString(searchParams.get("organizationId")) || "all",
		projectId: normalizeString(searchParams.get("projectId")) || "all",
		status: (normalizeString(searchParams.get("status")) || "all") as MaintenanceFilters["status"],
		maintenanceType: (normalizeString(searchParams.get("maintenanceType")) ||
			"all") as MaintenanceFilters["maintenanceType"],
		generationMode: (normalizeString(searchParams.get("generationMode")) ||
			"all") as MaintenanceFilters["generationMode"],
	};
}

function buildMongoQuery(filters: MaintenanceFilters): Record<string, unknown> {
	const query: Record<string, unknown> = {};

	if (
		filters.organizationId &&
		filters.organizationId !== "all" &&
		isValidObjectId(filters.organizationId)
	) {
		query.organizationId = new Types.ObjectId(filters.organizationId);
	}

	if (
		filters.projectId &&
		filters.projectId !== "all" &&
		isValidObjectId(filters.projectId)
	) {
		query.projectId = new Types.ObjectId(filters.projectId);
	}

	if (filters.status && filters.status !== "all") {
		query.status = filters.status;
	}

	if (filters.maintenanceType && filters.maintenanceType !== "all") {
		query.maintenanceType = filters.maintenanceType;
	}

	if (filters.generationMode && filters.generationMode !== "all") {
		query.generationMode = filters.generationMode;
	}

	if (filters.q) {
		query.$or = [
			{ title: { $regex: filters.q, $options: "i" } },
			{ description: { $regex: filters.q, $options: "i" } },
			{ organizationName: { $regex: filters.q, $options: "i" } },
			{ projectTitle: { $regex: filters.q, $options: "i" } },
			{ notes: { $regex: filters.q, $options: "i" } },
		];
	}

	return query;
}

/* -------------------------------------------------------------------------- */
/* Mapping helpers                                                            */
/* -------------------------------------------------------------------------- */

function mapEntityToListItem(entity: MaintenanceEntity): MaintenanceListItem {
	const totalEvents = entity.schedule.length;
	const completedEvents = entity.schedule.filter(
		(item) => item.maintenanceStatus === "done",
	).length;
	const overdueEvents = entity.schedule.filter(
		(item) => item.maintenanceStatus === "overdue",
	).length;
	const pendingEvents = entity.schedule.filter(
		(item) => item.maintenanceStatus === "pending",
	).length;

	return {
		_id: entity._id,
		organizationId: entity.organizationId,
		projectId: entity.projectId,
		organizationName: entity.organizationName,
		projectTitle: entity.projectTitle,
		title: entity.title,
		maintenanceType: entity.maintenanceType,
		generationMode: entity.generationMode,
		nextDueDate: entity.nextDueDate,
		status: entity.status,
		totalEvents,
		completedEvents,
		overdueEvents,
		pendingEvents,
		createdAt: entity.createdAt,
		updatedAt: entity.updatedAt,
	};
}

function buildSummary(items: MaintenanceEntity[]): MaintenanceSummary {
	const summary = createEmptyMaintenanceSummary();

	summary.totalMaintenances = items.length;
	summary.activeMaintenances = items.filter(
		(item) => item.status === "active" || item.status === "scheduled",
	).length;
	summary.overdueMaintenances = items.filter(
		(item) => item.status === "overdue",
	).length;
	summary.completedMaintenances = items.filter(
		(item) => item.status === "completed",
	).length;
	summary.upcomingEvents = items.reduce((total, item) => {
		return (
			total +
			item.schedule.filter((entry) => entry.maintenanceStatus === "pending").length
		);
	}, 0);

	return summary;
}

/* -------------------------------------------------------------------------- */
/* Project context helpers                                                    */
/* -------------------------------------------------------------------------- */

async function ensureProjectExists(
	organizationId: string,
	projectId: string,
): Promise<
	| {
		ok: true;
		context: Awaited<
			ReturnType<typeof getMaintenanceProjectContextByProjectId>
		>;
	}
	| { ok: false; error: string }
> {
	if (!organizationId || !isValidObjectId(organizationId)) {
		return {
			ok: false,
			error: "La organización seleccionada no es válida.",
		};
	}

	if (!projectId || !isValidObjectId(projectId)) {
		return {
			ok: false,
			error: "El proyecto seleccionado no es válido.",
		};
	}

	const context = await getMaintenanceProjectContextByProjectId({
		organizationId,
		projectId,
	});

	if (!context) {
		return {
			ok: false,
			error: "No se pudo recuperar el contexto del proyecto para Maintenance.",
		};
	}

	return {
		ok: true,
		context,
	};
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
	request: NextRequest,
): Promise<NextResponse<MaintenanceListResponse>> {
	const auth = await requireAdminContext();

	if (!auth.ok) {
		return auth.response as NextResponse<MaintenanceListResponse>;
	}

	try {
		await connectToDB();

		const filters = parseFiltersFromRequest(request);
		const mongoQuery = buildMongoQuery(filters);

		const documents = await Maintenance.find(mongoQuery)
			.sort({
				status: 1,
				nextDueDate: 1,
				updatedAt: -1,
			})
			.lean();

		const normalizedItems = documents.map((item) =>
			normalizeMaintenanceEntity(item),
		);

		return NextResponse.json({
			ok: true,
			items: normalizedItems.map(mapEntityToListItem),
			summary: buildSummary(normalizedItems),
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "No se pudo listar los mantenimientos.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(
	request: NextRequest,
): Promise<NextResponse<MaintenanceCreateResponse>> {
	const auth = await requireAdminContext();

	if (!auth.ok) {
		return auth.response as NextResponse<MaintenanceCreateResponse>;
	}

	try {
		await connectToDB();

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

		const rawOrganizationId =
			typeof body === "object" && body !== null && "organizationId" in body
				? normalizeString((body as { organizationId?: unknown }).organizationId)
				: "";

		const rawProjectId =
			typeof body === "object" && body !== null && "projectId" in body
				? normalizeString((body as { projectId?: unknown }).projectId)
				: "";

		const projectCheck = await ensureProjectExists(
			rawOrganizationId,
			rawProjectId,
		);

		if (!projectCheck.ok) {
			return NextResponse.json(
				{
					ok: false,
					error: projectCheck.error,
				},
				{ status: 400 },
			);
		}

		const projectContext = projectCheck.context;

		if (!projectContext) {
			return NextResponse.json(
				{
					ok: false,
					error: "No se pudo resolver el contexto del proyecto.",
				},
				{ status: 400 },
			);
		}

		const preparedWritePayload: MaintenanceWritePayload =
			normalizeMaintenanceWritePayload(
				{
					...(body as Record<string, unknown>),

					/**
					 * Fuente confiable desde el proyecto.
					 * No confiamos ciegamente en snapshots mandados desde cliente.
					 */
					organizationId: projectContext.organizationId,
					projectId: projectContext.projectId,
					organizationName: projectContext.organizationName,
					projectTitle: projectContext.projectTitle,
					contractStartDate: projectContext.contractStartDate,
					contractDurationMonths: projectContext.contractDurationMonths,
					contractEndDate: projectContext.contractEndDate,
				},
			);

		const validationErrors: string[] = [];

		if (!preparedWritePayload.organizationId) {
			validationErrors.push("organizationId es obligatorio.");
		}

		if (!preparedWritePayload.projectId) {
			validationErrors.push("projectId es obligatorio.");
		}

		if (!preparedWritePayload.title.trim()) {
			validationErrors.push("El título del mantenimiento es obligatorio.");
		}

		if (
			preparedWritePayload.generationMode === "automatic" &&
			(!preparedWritePayload.frequencyValue ||
				preparedWritePayload.frequencyValue <= 0 ||
				!preparedWritePayload.frequencyUnit)
		) {
			validationErrors.push(
				"En modo automático debes definir frecuencia y unidad válidas.",
			);
		}

		if (
			preparedWritePayload.generationMode === "manual" &&
			preparedWritePayload.schedule.length === 0
		) {
			validationErrors.push(
				"En modo manual debes registrar al menos una fila en el schedule.",
			);
		}

		if (validationErrors.length > 0) {
			return NextResponse.json(
				{
					ok: false,
					error: "No se pudo crear el maintenance.",
					details: validationErrors,
				},
				{ status: 400 },
			);
		}

		const created = await Maintenance.create({
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
		});

		const normalizedCreated = normalizeMaintenanceEntity(created.toObject());

		return NextResponse.json(
			{
				ok: true,
				item: normalizedCreated,
			},
			{ status: 201 },
		);
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "No se pudo crear el maintenance.",
			},
			{ status: 500 },
		);
	}
}