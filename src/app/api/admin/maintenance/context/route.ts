/**
 * =============================================================================
 * 📄 API Route: Admin Maintenance Context
 * Path: src/app/api/admin/maintenance/context/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo de contexto para el módulo Maintenance.
 *
 * Propósito:
 * - entregar datos base para construir la UI del módulo
 * - resolver organizaciones disponibles
 * - resolver proyectos disponibles por organización
 * - resolver el contexto contractual de un proyecto específico
 *
 * Alcance:
 * - GET:
 *   - sin parámetros: devuelve organizaciones
 *   - con organizationId: devuelve organizaciones + proyectos de esa organización
 *   - con organizationId + projectId: devuelve además el contexto del proyecto
 *
 * Decisiones:
 * - el frontend no debe reinventar la carga de contexto
 * - la selección organización/proyecto se resuelve desde este endpoint
 * - el contexto del proyecto reutiliza el helper oficial del dominio
 * - no se expone información administrativa innecesaria
 *
 * Reglas:
 * - sin any
 * - respuestas consistentes { ok, ... }
 * - sin duplicar lógica de negocio fuera del módulo
 *
 * EN:
 * Admin context route for the Maintenance module.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Types } from "mongoose";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";

import Organization from "@/models/Organization";
import Project from "@/models/Project";

import { getMaintenanceProjectContextByProjectId } from "@/lib/maintenance/maintenance.project-context";

import type { MaintenanceProjectContext } from "@/types/maintenance";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RouteContext = {
	sessionUserId: string;
};

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
	| {
		ok: false;
		error: string;
	};

type LeanOrganizationRecord = {
	_id?: unknown;
	name?: unknown;
	companyName?: unknown;
	commercialName?: unknown;
	legalName?: unknown;
	email?: unknown;
	primaryEmail?: unknown;
	updatedAt?: unknown;
	createdAt?: unknown;
};

type LeanLocalizedText = {
	es?: unknown;
	en?: unknown;
};

type LeanProjectRecord = {
	_id?: unknown;
	title?: LeanLocalizedText | unknown;
	projectTitle?: unknown;
	name?: unknown;
	slug?: unknown;
	status?: unknown;
	contractStartDate?: unknown;
	contractDurationMonths?: unknown;
	contractEndDate?: unknown;
	updatedAt?: unknown;
	createdAt?: unknown;
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

function resolveObjectId(value: unknown): string {
	if (!value) {
		return "";
	}

	if (typeof value === "string") {
		return value.trim();
	}

	if (typeof value === "object" && value !== null && "toString" in value) {
		const candidate = value.toString;
		if (typeof candidate === "function") {
			return normalizeString(candidate.call(value));
		}
	}

	return "";
}

function resolveOrganizationLabel(source: LeanOrganizationRecord): string {
	return (
		normalizeString(source.commercialName) ||
		normalizeString(source.legalName) ||
		normalizeString(source.companyName) ||
		normalizeString(source.name) ||
		"Organización"
	);
}

function resolveOrganizationEmail(source: LeanOrganizationRecord): string {
	return (
		normalizeString(source.primaryEmail) ||
		normalizeString(source.email) ||
		""
	);
}

function resolveLocalizedTitle(value: LeanLocalizedText | unknown): string {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return "";
	}

	const localized = value as LeanLocalizedText;

	return normalizeString(localized.es) || normalizeString(localized.en);
}

function resolveProjectTitle(source: LeanProjectRecord): string {
	return (
		resolveLocalizedTitle(source.title) ||
		normalizeString(source.projectTitle) ||
		normalizeString(source.name) ||
		"Proyecto"
	);
}

function normalizeNullableDate(value: unknown): string | null {
	const text = normalizeString(value);
	return text || null;
}

function normalizeNullableNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === "string" && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

async function requireAdminContext(): Promise<
	| { ok: true; value: RouteContext }
	| { ok: false; response: NextResponse<MaintenanceContextResponse> }
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
					error: "No tienes permisos para acceder al contexto de Maintenance.",
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
/* Data loaders                                                               */
/* -------------------------------------------------------------------------- */

async function loadOrganizations(): Promise<MaintenanceContextOrganizationOption[]> {
	const documents = (await Organization.find({})
		.sort({ updatedAt: -1, createdAt: -1, name: 1 })
		.lean()) as LeanOrganizationRecord[];

	return documents
		.map((item) => {
			const id = resolveObjectId(item._id);

			return {
				_id: id,
				name: resolveOrganizationLabel(item),
				email: resolveOrganizationEmail(item),
			};
		})
		.filter((item) => item._id.length > 0);
}

async function loadProjectsByOrganization(
	organizationId: string,
): Promise<MaintenanceContextProjectOption[]> {
	if (!organizationId || !isValidObjectId(organizationId)) {
		return [];
	}

	const documents = (await Project.find({
		primaryClientId: new Types.ObjectId(organizationId),
	})
		.sort({ updatedAt: -1, createdAt: -1 })
		.lean()) as LeanProjectRecord[];

	return documents
		.map((item) => {
			const id = resolveObjectId(item._id);

			return {
				_id: id,
				title: resolveProjectTitle(item),
				slug: normalizeString(item.slug),
				status: normalizeString(item.status) || "draft",
				contractStartDate: normalizeNullableDate(item.contractStartDate),
				contractDurationMonths: normalizeNullableNumber(
					item.contractDurationMonths,
				),
				contractEndDate: normalizeNullableDate(item.contractEndDate),
			};
		})
		.filter((item) => item._id.length > 0);
}

async function loadProjectContext(
	organizationId: string,
	projectId: string,
): Promise<MaintenanceProjectContext | null> {
	if (!organizationId || !isValidObjectId(organizationId)) {
		return null;
	}

	if (!projectId || !isValidObjectId(projectId)) {
		return null;
	}

	return getMaintenanceProjectContextByProjectId({
		organizationId,
		projectId,
	});
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(
	request: NextRequest,
): Promise<NextResponse<MaintenanceContextResponse>> {
	const auth = await requireAdminContext();

	if (!auth.ok) {
		return auth.response;
	}

	try {
		await connectToDB();

		const { searchParams } = new URL(request.url);

		const organizationId = normalizeString(searchParams.get("organizationId"));
		const projectId = normalizeString(searchParams.get("projectId"));

		const organizations = await loadOrganizations();

		const projects =
			organizationId && isValidObjectId(organizationId)
				? await loadProjectsByOrganization(organizationId)
				: [];

		const projectContext =
			organizationId && projectId
				? await loadProjectContext(organizationId, projectId)
				: null;

		return NextResponse.json({
			ok: true,
			organizations,
			projects,
			projectContext,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "No se pudo cargar el contexto de Maintenance.",
			},
			{ status: 500 },
		);
	}
}