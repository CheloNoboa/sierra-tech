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
 *     - almacenar password como hash
 *
 *   Reglas:
 *   - acceso exclusivo para usuarios administrativos
 *   - un usuario siempre pertenece a una organización
 *   - email único global
 *   - passwordHash no se expone en respuestas
 *
 * EN:
 *   Administrative endpoint for listing and creating organization users.
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
  password: string;
  role: OrganizationUserRole;
  status: OrganizationUserStatus;
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
  value: unknown
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
  organization: PopulatedOrganizationRef | null
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
  organization: PopulatedOrganizationRef | null
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
  payload: unknown
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
    password: normalizeString(data.password),
    role: normalizeRole(data.role),
    status: normalizeStatus(data.status),
  };
}

function validateOrganizationUserInput(
  input: NormalizedOrganizationUserInput
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

  if (!input.password) {
    return "password is required.";
  }

  if (input.password.length < 8) {
    return "password must be at least 8 characters long.";
  }

  return null;
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
        { status: 401 }
      );
    }

    await connectToDB();

    const { searchParams } = new URL(req.url);

    const query = normalizeString(searchParams.get("query"));
    const organizationId = parseOrganizationFilter(
      searchParams.get("organizationId")
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
          { status: 400 }
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

    const rows = users.map((user) => {
      const organization = extractPopulatedOrganization(user.organizationId);

      return {
        _id: String(user._id),
        organizationId: resolveOrganizationId(organization),
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        lastLoginAt: user.lastLoginAt ?? null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        organizationName: resolveOrganizationName(organization),
      };
    });

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
      { status: 500 }
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
        { status: 401 }
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
        { status: 400 }
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
        { status: 404 }
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
        { status: 409 }
      );
    }

    const passwordHash = await hash(input.password, 12);

    const createdUser = await OrganizationUser.create({
      organizationId: input.organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: input.role,
      status: input.status,
    });

    const populatedUser = await OrganizationUser.findById(createdUser._id)
      .populate({
        path: "organizationId",
        select: "legalName commercialName",
      })
      .lean();

    const organization = extractPopulatedOrganization(
      populatedUser?.organizationId
    );

    return NextResponse.json(
      {
        ok: true,
        message: "Organization user created successfully.",
        data: {
          _id: populatedUser ? String(populatedUser._id) : String(createdUser._id),
          organizationId:
            resolveOrganizationId(organization) || input.organizationId,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          fullName: createdUser.fullName,
          email: createdUser.email,
          role: createdUser.role,
          status: createdUser.status,
          lastLoginAt: createdUser.lastLoginAt ?? null,
          createdAt: createdUser.createdAt,
          updatedAt: createdUser.updatedAt,
          organizationName: resolveOrganizationName(organization),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/organization-users error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to create organization user.",
      },
      { status: 500 }
    );
  }
}