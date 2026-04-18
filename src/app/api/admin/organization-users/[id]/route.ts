/**
 * =============================================================================
 * 📡 API Route: Admin Organization User By ID
 * Path: src/app/api/admin/organization-users/[id]/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para leer y actualizar un usuario de organización.
 *
 *   Responsabilidades:
 *   - GET:
 *     - devolver un usuario por id
 *     - incluir nombre de organización resuelto
 *   - PUT:
 *     - actualizar usuario existente
 *     - permitir cambio de organización, datos base, rol, estado y password
 *     - rehacer fullName cuando cambie nombre o apellido
 *
 *   Reglas:
 *   - acceso exclusivo para usuarios administrativos
 *   - no exponer passwordHash
 *   - email único global
 *   - password solo se persiste hasheado
 *
 * EN:
 *   Administrative endpoint for reading and updating one organization user.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";

import { connectToDB } from "@/lib/connectToDB";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Organization from "@/models/Organization";
import OrganizationUser from "@/models/OrganizationUser";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

type OrganizationUserRole = "org_admin" | "org_user";
type OrganizationUserStatus = "active" | "inactive";

interface SessionUserLike {
	role?: string;
	permissions?: string[];
}

interface UpdateOrganizationUserInput {
	organizationId?: string;
	firstName?: string;
	lastName?: string;
	email?: string;
	password?: string;
	role?: OrganizationUserRole;
	status?: OrganizationUserStatus;
}

interface PopulatedOrganizationRef {
	_id: unknown;
	legalName?: string;
	commercialName?: string;
}

/* -------------------------------------------------------------------------- */
/* 🧠 Helpers                                                                 */
/* -------------------------------------------------------------------------- */

function extractPopulatedOrganization(
	value: unknown,
): PopulatedOrganizationRef | null {
	if (!value || typeof value !== "object") {
		return null;
	}

	const record = value as Record<string, unknown>;

	return {
		_id: record._id,
		legalName:
			typeof record.legalName === "string" ? record.legalName : undefined,
		commercialName:
			typeof record.commercialName === "string"
				? record.commercialName
				: undefined,
	};
}

function resolveOrganizationName(
	organization: PopulatedOrganizationRef | null,
): string {
	if (!organization) {
		return "";
	}

	if (organization.commercialName?.trim()) {
		return organization.commercialName.trim();
	}

	if (organization.legalName?.trim()) {
		return organization.legalName.trim();
	}

	return "";
}

function resolveOrganizationId(
	organization: PopulatedOrganizationRef | null,
): string {
	if (!organization?._id) {
		return "";
	}

	return String(organization._id);
}

function normalizeOptionalString(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	return value.trim();
}

function normalizeOptionalEmail(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	return value.trim().toLowerCase();
}

function normalizeOptionalRole(
	value: unknown,
): OrganizationUserRole | undefined {
	return value === "org_admin" || value === "org_user" ? value : undefined;
}

function normalizeOptionalStatus(
	value: unknown,
): OrganizationUserStatus | undefined {
	return value === "active" || value === "inactive" ? value : undefined;
}

function buildFullName(firstName: string, lastName: string): string {
	return `${firstName} ${lastName}`.trim();
}

function isValidObjectId(value: string): boolean {
	return mongoose.Types.ObjectId.isValid(value);
}

function isAdminSession(session: unknown): boolean {
	const user = (session as { user?: SessionUserLike } | null)?.user;

	if (!user) {
		return false;
	}

	if (user.role === "superadmin" || user.role === "admin") {
		return true;
	}

	if (Array.isArray(user.permissions) && user.permissions.includes("*")) {
		return true;
	}

	return Array.isArray(user.permissions)
		? user.permissions.includes("organization-users.read") ||
				user.permissions.includes("organization-users.update")
		: false;
}

function normalizeUpdateInput(payload: unknown): UpdateOrganizationUserInput {
	const data =
		payload && typeof payload === "object"
			? (payload as Record<string, unknown>)
			: {};

	const normalized: UpdateOrganizationUserInput = {};

	if ("organizationId" in data) {
		normalized.organizationId = normalizeOptionalString(data.organizationId);
	}

	if ("firstName" in data) {
		normalized.firstName = normalizeOptionalString(data.firstName);
	}

	if ("lastName" in data) {
		normalized.lastName = normalizeOptionalString(data.lastName);
	}

	if ("email" in data) {
		normalized.email = normalizeOptionalEmail(data.email);
	}

	if ("password" in data) {
		normalized.password = normalizeOptionalString(data.password);
	}

	if ("role" in data) {
		normalized.role = normalizeOptionalRole(data.role);
	}

	if ("status" in data) {
		normalized.status = normalizeOptionalStatus(data.status);
	}

	return normalized;
}

function validateUpdateInput(
	input: UpdateOrganizationUserInput,
): string | null {
	if ("organizationId" in input) {
		if (!input.organizationId) {
			return "organizationId cannot be empty.";
		}

		if (!isValidObjectId(input.organizationId)) {
			return "organizationId is invalid.";
		}
	}

	if ("firstName" in input && !input.firstName) {
		return "firstName cannot be empty.";
	}

	if ("lastName" in input && !input.lastName) {
		return "lastName cannot be empty.";
	}

	if ("email" in input && !input.email) {
		return "email cannot be empty.";
	}

	if ("password" in input && input.password && input.password.length < 8) {
		return "password must be at least 8 characters long.";
	}

	return null;
}

/* -------------------------------------------------------------------------- */
/* 📥 GET                                                                     */
/* -------------------------------------------------------------------------- */

export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getServerSession(authOptions);

		if (!isAdminSession(session)) {
			return NextResponse.json(
				{
					ok: false,
					message: "Unauthorized.",
				},
				{ status: 401 },
			);
		}

		const { id } = await context.params;

		if (!isValidObjectId(id)) {
			return NextResponse.json(
				{
					ok: false,
					message: "Invalid organization user id.",
				},
				{ status: 400 },
			);
		}

		await connectToDB();

		const user = await OrganizationUser.findById(id)
			.populate({
				path: "organizationId",
				select: "legalName commercialName",
			})
			.lean();

		if (!user) {
			return NextResponse.json(
				{
					ok: false,
					message: "Organization user not found.",
				},
				{ status: 404 },
			);
		}

		const organization = extractPopulatedOrganization(user.organizationId);

		return NextResponse.json({
			ok: true,
			data: {
				_id: String(user._id),
				organizationId: resolveOrganizationId(organization),
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.fullName,
				email: user.email,
				role: user.role,
				status: user.status,
				isRegistered: Boolean(user.isRegistered),
				activationStatus: user.isRegistered ? "completed" : "pending",
				lastLoginAt: user.lastLoginAt ?? null,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
				organizationName: resolveOrganizationName(organization),
			},
		});
	} catch (error) {
		console.error("GET /api/admin/organization-users/[id] error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Failed to load organization user.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* 📤 PUT                                                                     */
/* -------------------------------------------------------------------------- */

export async function PUT(
	req: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const session = await getServerSession(authOptions);

		if (!isAdminSession(session)) {
			return NextResponse.json(
				{
					ok: false,
					message: "Unauthorized.",
				},
				{ status: 401 },
			);
		}

		const { id } = await context.params;

		if (!isValidObjectId(id)) {
			return NextResponse.json(
				{
					ok: false,
					message: "Invalid organization user id.",
				},
				{ status: 400 },
			);
		}

		await connectToDB();

		const existingUser = await OrganizationUser.findById(id);

		if (!existingUser) {
			return NextResponse.json(
				{
					ok: false,
					message: "Organization user not found.",
				},
				{ status: 404 },
			);
		}

		const body = await req.json();
		const input = normalizeUpdateInput(body);

		const validationError = validateUpdateInput(input);

		if (validationError) {
			return NextResponse.json(
				{
					ok: false,
					message: validationError,
				},
				{ status: 400 },
			);
		}

		if (input.organizationId) {
			const organizationExists = await Organization.exists({
				_id: input.organizationId,
			});

			if (!organizationExists) {
				return NextResponse.json(
					{
						ok: false,
						message: "Organization not found.",
					},
					{ status: 404 },
				);
			}
		}

		if (input.email && input.email !== existingUser.email) {
			const duplicatedEmail = await OrganizationUser.exists({
				email: input.email,
				_id: { $ne: existingUser._id },
			});

			if (duplicatedEmail) {
				return NextResponse.json(
					{
						ok: false,
						message: "Email is already in use.",
					},
					{ status: 409 },
				);
			}
		}

		const nextFirstName = input.firstName ?? existingUser.firstName;
		const nextLastName = input.lastName ?? existingUser.lastName;

		const updatePayload: Record<string, unknown> = {
			...("organizationId" in input
				? { organizationId: input.organizationId }
				: {}),
			...("firstName" in input ? { firstName: input.firstName } : {}),
			...("lastName" in input ? { lastName: input.lastName } : {}),
			...("email" in input ? { email: input.email } : {}),
			...("role" in input ? { role: input.role } : {}),
			...("status" in input ? { status: input.status } : {}),
			fullName: buildFullName(nextFirstName, nextLastName),
		};

		if (input.password) {
			updatePayload.passwordHash = await hash(input.password, 12);
		}

		const updatedUser = await OrganizationUser.findByIdAndUpdate(
			id,
			{ $set: updatePayload },
			{ new: true, runValidators: true },
		)
			.populate({
				path: "organizationId",
				select: "legalName commercialName",
			})
			.lean();

		if (!updatedUser) {
			return NextResponse.json(
				{
					ok: false,
					message: "Organization user not found after update.",
				},
				{ status: 404 },
			);
		}

		const organization = extractPopulatedOrganization(
			updatedUser.organizationId,
		);

		return NextResponse.json({
			ok: true,
			message: "Organization user updated successfully.",
			data: {
				_id: String(updatedUser._id),
				organizationId: resolveOrganizationId(organization),
				firstName: updatedUser.firstName,
				lastName: updatedUser.lastName,
				fullName: updatedUser.fullName,
				email: updatedUser.email,
				role: updatedUser.role,
				status: updatedUser.status,
				isRegistered: Boolean(updatedUser.isRegistered),
				activationStatus: updatedUser.isRegistered ? "completed" : "pending",
				lastLoginAt: updatedUser.lastLoginAt ?? null,
				createdAt: updatedUser.createdAt,
				updatedAt: updatedUser.updatedAt,
				organizationName: resolveOrganizationName(organization),
			},
		});
	} catch (error) {
		console.error("PUT /api/admin/organization-users/[id] error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Failed to update organization user.",
			},
			{ status: 500 },
		);
	}
}
