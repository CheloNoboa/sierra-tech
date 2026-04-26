/**
 * =============================================================================
 * 📄 API Route: Admin Maintenance Project Context
 * Path: src/app/api/admin/maintenance/project-context/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint auxiliar para preparar la UI administrativa del módulo Maintenance.
 *
 * Propósito:
 * - listar organizaciones disponibles para el flujo
 * - listar proyectos por organización
 * - resolver el contexto contractual de un proyecto seleccionado
 * - evitar que la UI duplique consultas y lógica de preparación
 *
 * Alcance:
 * - GET con filtros opcionales por:
 *   - organizationId
 *   - projectId
 * - retorna:
 *   - organizaciones
 *   - proyectos visibles para selector
 *   - contexto del proyecto seleccionado
 *
 * Decisiones:
 * - reutiliza la lógica compartida:
 *   src/lib/maintenance/maintenance.project-context.ts
 * - no confía en shapes crudos del modelo Project para la UI
 * - devuelve solo el contexto necesario para construir Maintenance
 *
 * Reglas:
 * - sin any
 * - respuestas consistentes { ok, ... }
 * - sin exponer datos administrativos innecesarios
 *
 * EN:
 * Admin helper endpoint for Maintenance project context bootstrap.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";

import Organization from "@/models/Organization";
import Project from "@/models/Project";

import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import { getMaintenanceProjectContextByProjectId } from "@/lib/maintenance/maintenance.project-context";

import type { MaintenanceProjectContext } from "@/types/maintenance";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RouteContext = {
	sessionUserId: string;
};

type OrganizationOption = {
	id: string;
	label: string;
};

type ProjectOption = {
	id: string;
	title: string;
	organizationId: string;
};

type MaintenanceProjectContextResponse =
	| {
		ok: true;
		organizations: OrganizationOption[];
		projects: ProjectOption[];
		selectedProjectContext: MaintenanceProjectContext | null;
	}
	| {
		ok: false;
		error: string;
	};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function isValidObjectId(value: string): boolean {
	return Types.ObjectId.isValid(value);
}

function resolveOrganizationLabel(source: Record<string, unknown>): string {
	return (
		normalizeString(source.commercialName) ||
		normalizeString(source.legalName) ||
		normalizeString(source.companyName) ||
		normalizeString(source.name) ||
		"Organización"
	);
}

function resolveLocalizedProjectTitle(value: {
	es?: string;
	en?: string;
} | null | undefined): string {
	return (
		normalizeString(value?.es) ||
		normalizeString(value?.en) ||
		"Proyecto"
	);
}

async function requireAdminContext(): Promise<
	| { ok: true; value: RouteContext }
	| {
		ok: false;
		response: NextResponse<MaintenanceProjectContextResponse>;
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
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
	request: NextRequest,
): Promise<NextResponse<MaintenanceProjectContextResponse>> {
	const auth = await requireAdminContext();

	if (!auth.ok) {
		return auth.response;
	}

	try {
		await connectToDB();

		const { searchParams } = new URL(request.url);
		const organizationId = normalizeString(searchParams.get("organizationId"));
		const projectId = normalizeString(searchParams.get("projectId"));

		const organizationDocuments = await Organization.find({})
			.sort({ updatedAt: -1, createdAt: -1 })
			.lean();

		const organizations: OrganizationOption[] = organizationDocuments
			.map((item) => {
				const source =
					item && typeof item === "object"
						? (item as Record<string, unknown>)
						: {};

				const id = normalizeString(source._id);

				return {
					id,
					label: resolveOrganizationLabel(source),
				};
			})
			.filter((item) => item.id.length > 0);

		const projectQuery: Record<string, unknown> = {};

		if (organizationId && isValidObjectId(organizationId)) {
			projectQuery.primaryClientId = organizationId;
		}

		const projectDocuments = await Project.find(projectQuery)
			.sort({ featured: -1, sortOrder: 1, updatedAt: -1 })
			.lean();

		const projects: ProjectOption[] = projectDocuments
			.map((item) => {
				const normalized = normalizeProjectEntity(item);

				return {
					id: normalized._id,
					title: resolveLocalizedProjectTitle(normalized.title),
					organizationId: normalizeString(normalized.primaryClientId),
				};
			})
			.filter((item) => item.id.length > 0);

		let selectedProjectContext: MaintenanceProjectContext | null = null;

		if (
			projectId &&
			isValidObjectId(projectId) &&
			organizationId &&
			isValidObjectId(organizationId)
		) {
			selectedProjectContext = await getMaintenanceProjectContextByProjectId({
				organizationId,
				projectId,
			});
		}

		return NextResponse.json({
			ok: true,
			organizations,
			projects,
			selectedProjectContext,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "No se pudo resolver el contexto de Maintenance.",
			},
			{ status: 500 },
		);
	}
}