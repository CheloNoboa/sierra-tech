/**
 * =============================================================================
 * 📡 API Route: Admin Organization Users
 * Path: src/app/api/admin/organization-users/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para listar y crear usuarios de organización.
 *
 *   Responsabilidades:
 *   - GET:
 *     - listar usuarios
 *     - soportar búsqueda por nombre o email
 *     - soportar filtros por organización, rol y estado
 *     - resolver nombre de organización para la grilla
 *   - POST:
 *     - crear un usuario de organización
 *     - validar organización existente
 *     - validar unicidad de email
 *     - generar contraseña temporal
 *     - almacenar password como hash
 *     - generar token de activación
 *     - enviar correo inicial con acceso temporal y enlace de activación
 *
 *   Reglas:
 *   - acceso exclusivo para usuarios administrativos
 *   - un usuario siempre pertenece a una organización
 *   - email único global
 *   - passwordHash no se expone en respuestas
 *   - si falla el correo, se revierte la creación para no dejar usuarios huérfanos
 *
 * EN:
 *   Administrative endpoint for listing and creating organization users.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import nodemailer from "nodemailer";

import SystemSettings from "@/models/SystemSettings";
import Organization from "@/models/Organization";
import OrganizationUser from "@/models/OrganizationUser";

import { connectToDB } from "@/lib/connectToDB";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
	buildActivationUrl,
	generateActivationToken,
	generateTemporaryPassword,
	getActivationTokenExpiresAt,
	getTemporaryPasswordExpiresAt,
	hashActivationToken,
} from "@/lib/auth/organization-user-credentials";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

type OrganizationUserRole = "org_admin" | "org_user";
type OrganizationUserStatus = "active" | "inactive";
type RoleFilter = OrganizationUserRole | "all";
type StatusFilter = OrganizationUserStatus | "all";
type OrganizationFilter = string | "all";

interface SessionUserLike {
	role?: string;
	permissions?: string[];
}

interface NormalizedOrganizationUserInput {
	organizationId: string;
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	role: OrganizationUserRole;
	status: OrganizationUserStatus;
}

interface PopulatedOrganizationRef {
	_id: unknown;
	legalName?: string;
	commercialName?: string;
}

interface OrganizationUserRow {
	_id: string;
	organizationId: string;
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	role: OrganizationUserRole;
	status: OrganizationUserStatus;
	isRegistered: boolean;
	activationStatus: "completed" | "pending";
	lastLoginAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	organizationName: string;
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

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown): string {
	return normalizeString(value).toLowerCase();
}

function normalizeRole(value: unknown): OrganizationUserRole {
	return value === "org_admin" ? "org_admin" : "org_user";
}

function normalizeStatus(value: unknown): OrganizationUserStatus {
	return value === "inactive" ? "inactive" : "active";
}

function parseRoleFilter(value: string | null): RoleFilter {
	return value === "org_admin" || value === "org_user" ? value : "all";
}

function parseStatusFilter(value: string | null): StatusFilter {
	return value === "active" || value === "inactive" ? value : "all";
}

function parseOrganizationFilter(value: string | null): OrganizationFilter {
	const normalized = normalizeString(value ?? "");
	return normalized ? normalized : "all";
}

function buildFullName(firstName: string, lastName: string): string {
	return `${firstName} ${lastName}`.trim();
}

function isValidObjectId(value: string): boolean {
	return mongoose.Types.ObjectId.isValid(value);
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
				user.permissions.includes("organization-users.create") ||
				user.permissions.includes("organization-users.update")
		: false;
}

function normalizeOrganizationUserInput(
	payload: unknown,
): NormalizedOrganizationUserInput {
	const data =
		payload && typeof payload === "object"
			? (payload as Record<string, unknown>)
			: {};

	const firstName = normalizeString(data.firstName);
	const lastName = normalizeString(data.lastName);

	return {
		organizationId: normalizeString(data.organizationId),
		firstName,
		lastName,
		fullName: buildFullName(firstName, lastName),
		email: normalizeEmail(data.email),
		role: normalizeRole(data.role),
		status: normalizeStatus(data.status),
	};
}

function validateOrganizationUserInput(
	input: NormalizedOrganizationUserInput,
): string | null {
	if (!input.organizationId) {
		return "organizationId is required.";
	}

	if (!isValidObjectId(input.organizationId)) {
		return "organizationId is invalid.";
	}

	if (!input.firstName) {
		return "firstName is required.";
	}

	if (!input.lastName) {
		return "lastName is required.";
	}

	if (!input.email) {
		return "email is required.";
	}

	return null;
}

function requireEnv(name: string): string {
	const value = process.env[name];

	if (!value || !value.trim()) {
		throw new Error(`Missing required env variable: ${name}`);
	}

	return value.trim();
}

function requireEnvInt(name: string): number {
	const raw = requireEnv(name);
	const parsed = Number(raw);

	if (!Number.isFinite(parsed)) {
		throw new Error(`Invalid numeric env variable: ${name}`);
	}

	return parsed;
}

async function resolveBrandName(): Promise<string> {
	try {
		const setting = await SystemSettings.findOne({ key: "businessName" })
			.lean()
			.exec();

		const value =
			setting && typeof setting === "object" && "value" in setting
				? (setting as { value?: unknown }).value
				: null;

		return typeof value === "string" && value.trim()
			? value.trim()
			: "Sierra Tech";
	} catch {
		return "Sierra Tech";
	}
}

/**
 * ES:
 * Mantener el envío de correo dentro del route evita introducir una capa
 * adicional prematura. Este endpoint es hoy el único responsable de este
 * tipo de notificación.
 */
async function sendOrganizationUserActivationEmail(params: {
	email: string;
	fullName: string;
	activationUrl: string;
}) {
	const smtpHost = requireEnv("SMTP_HOST");
	const smtpPort = requireEnvInt("SMTP_PORT");
	const smtpUser = requireEnv("SMTP_USER");
	const smtpPass = requireEnv("SMTP_PASS");
	const smtpFrom = requireEnv("SMTP_FROM");

	const brandName = await resolveBrandName();

	const transporter = nodemailer.createTransport({
		host: smtpHost,
		port: smtpPort,
		secure: smtpPort === 465,
		auth: {
			user: smtpUser,
			pass: smtpPass,
		},
	});

	await transporter.sendMail({
		from: smtpFrom,
		to: params.email,
		subject: `${brandName} - Activación de acceso`,
		html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #333333; line-height: 1.6;">
        <h2 style="color:#D97706; margin-bottom:16px;">${brandName}</h2>

        <p>Hola ${params.fullName || "usuario"},</p>

        <p>
          Su acceso al portal ha sido creado correctamente.
        </p>

        <p>
          Para activar su cuenta y definir su contraseña, haga clic en el siguiente botón:
        </p>

        <p style="margin:24px 0;">
          <a
            href="${params.activationUrl}"
            style="
              display:inline-block;
              padding:12px 24px;
              background:#D97706;
              color:#FFFFFF;
              text-decoration:none;
              border-radius:8px;
              font-weight:bold;
            "
          >
            Activar cuenta
          </a>
        </p>

        <p style="margin-top:16px;">
          Si el botón no funciona, copie y pegue este enlace en su navegador:
        </p>

        <p style="word-break:break-all; color:#92400E;">
          ${params.activationUrl}
        </p>

        <p style="margin-top:15px; font-size:12px; color:#777777;">
          Este enlace tiene vigencia limitada.
        </p>
      </div>
    `,
	});
}

function mapUserToRow(user: {
	_id: unknown;
	organizationId: unknown;
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	role: OrganizationUserRole;
	status: OrganizationUserStatus;
	isRegistered?: boolean;
	lastLoginAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}): OrganizationUserRow {
	const organization = extractPopulatedOrganization(user.organizationId);
	const isRegistered = Boolean(user.isRegistered);

	return {
		_id: String(user._id),
		organizationId: resolveOrganizationId(organization),
		firstName: user.firstName,
		lastName: user.lastName,
		fullName: user.fullName,
		email: user.email,
		role: user.role,
		status: user.status,
		isRegistered,
		activationStatus: isRegistered ? "completed" : "pending",
		lastLoginAt: user.lastLoginAt ?? null,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		organizationName: resolveOrganizationName(organization),
	};
}

/* -------------------------------------------------------------------------- */
/* 📥 GET                                                                     */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
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

		await connectToDB();

		const { searchParams } = new URL(req.url);

		const query = normalizeString(searchParams.get("query"));
		const organizationId = parseOrganizationFilter(
			searchParams.get("organizationId"),
		);
		const role = parseRoleFilter(searchParams.get("role"));
		const status = parseStatusFilter(searchParams.get("status"));

		const mongoFilter: Record<string, unknown> = {};

		if (organizationId !== "all") {
			if (!isValidObjectId(organizationId)) {
				return NextResponse.json(
					{
						ok: false,
						message: "Invalid organizationId filter.",
					},
					{ status: 400 },
				);
			}

			mongoFilter.organizationId = new mongoose.Types.ObjectId(organizationId);
		}

		if (role !== "all") {
			mongoFilter.role = role;
		}

		if (status !== "all") {
			mongoFilter.status = status;
		}

		if (query) {
			const regex = new RegExp(escapeRegex(query), "i");
			mongoFilter.$or = [
				{ firstName: regex },
				{ lastName: regex },
				{ fullName: regex },
				{ email: regex },
			];
		}

		const users = await OrganizationUser.find(mongoFilter)
			.populate({
				path: "organizationId",
				select: "legalName commercialName",
			})
			.sort({ createdAt: -1, fullName: 1 })
			.lean();

		const rows = users.map((user) =>
			mapUserToRow({
				_id: user._id,
				organizationId: user.organizationId,
				firstName: user.firstName,
				lastName: user.lastName,
				fullName: user.fullName,
				email: user.email,
				role: user.role,
				status: user.status,
				isRegistered: user.isRegistered,
				lastLoginAt: user.lastLoginAt ?? null,
				createdAt: user.createdAt,
				updatedAt: user.updatedAt,
			}),
		);

		return NextResponse.json({
			ok: true,
			data: rows,
			total: rows.length,
			filters: {
				query,
				organizationId,
				role,
				status,
			},
		});
	} catch (error) {
		console.error("GET /api/admin/organization-users error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Failed to load organization users.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* 📤 POST                                                                    */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
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

		await connectToDB();

		const body = await req.json();
		const input = normalizeOrganizationUserInput(body);

		const validationError = validateOrganizationUserInput(input);

		if (validationError) {
			return NextResponse.json(
				{
					ok: false,
					message: validationError,
				},
				{ status: 400 },
			);
		}

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

		const existingEmail = await OrganizationUser.exists({
			email: input.email,
		});

		if (existingEmail) {
			return NextResponse.json(
				{
					ok: false,
					message: "Email is already in use.",
				},
				{ status: 409 },
			);
		}

		const temporaryPassword = generateTemporaryPassword(10);
		const passwordHash = await hash(temporaryPassword, 12);

		const activationToken = generateActivationToken();
		const activationTokenHash = hashActivationToken(activationToken);
		const activationTokenExpiresAt = getActivationTokenExpiresAt();
		const temporaryPasswordExpiresAt = getTemporaryPasswordExpiresAt();
		const activationUrl = buildActivationUrl(activationToken);

		const createdUser = new OrganizationUser({
			organizationId: input.organizationId,
			firstName: input.firstName,
			lastName: input.lastName,
			fullName: input.fullName,
			email: input.email,
			passwordHash,
			role: input.role,
			status: input.status,
			isRegistered: false,
			activationTokenHash,
			activationTokenExpiresAt,
			temporaryPasswordExpiresAt,
			resetToken: null,
			resetTokenExpiry: null,
		});

		try {
			await createdUser.save();

			await sendOrganizationUserActivationEmail({
				email: createdUser.email,
				fullName: createdUser.fullName,
				activationUrl,
			});
		} catch (emailOrCreateError) {
			if (createdUser._id) {
				await OrganizationUser.findByIdAndDelete(createdUser._id);
			}

			throw emailOrCreateError;
		}

		const populatedUser = await OrganizationUser.findById(createdUser._id)
			.populate({
				path: "organizationId",
				select: "legalName commercialName",
			})
			.lean();

		const responseRow = populatedUser
			? mapUserToRow({
					_id: populatedUser._id,
					organizationId: populatedUser.organizationId,
					firstName: populatedUser.firstName,
					lastName: populatedUser.lastName,
					fullName: populatedUser.fullName,
					email: populatedUser.email,
					role: populatedUser.role,
					status: populatedUser.status,
					isRegistered: populatedUser.isRegistered,
					lastLoginAt: populatedUser.lastLoginAt ?? null,
					createdAt: populatedUser.createdAt,
					updatedAt: populatedUser.updatedAt,
				})
			: mapUserToRow({
					_id: createdUser._id,
					organizationId: createdUser.organizationId,
					firstName: createdUser.firstName,
					lastName: createdUser.lastName,
					fullName: createdUser.fullName,
					email: createdUser.email,
					role: createdUser.role,
					status: createdUser.status,
					isRegistered: createdUser.isRegistered,
					lastLoginAt: createdUser.lastLoginAt ?? null,
					createdAt: createdUser.createdAt,
					updatedAt: createdUser.updatedAt,
				});

		return NextResponse.json(
			{
				ok: true,
				message:
					"Organization user created and activation email sent successfully.",
				data: responseRow,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("POST /api/admin/organization-users error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Failed to create organization user.",
			},
			{ status: 500 },
		);
	}
}
