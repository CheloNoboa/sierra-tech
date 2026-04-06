/**
 * =============================================================================
 * 📡 API Route: Admin Organization By ID
 * Path: src/app/api/admin/organizations/[id]/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para leer y actualizar una organización específica.
 *
 *   Responsabilidades:
 *   - GET:
 *     - devolver una organización por id
 *   - PUT:
 *     - actualizar una organización existente
 *     - normalizar datos de entrada
 *     - validar campos obligatorios mínimos cuando existan en payload
 *
 *   Reglas:
 *   - acceso exclusivo para usuarios administrativos
 *   - no eliminación física
 *   - status controla disponibilidad lógica
 *
 * EN:
 *   Administrative endpoint for reading and updating one organization.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";

import { connectToDB } from "@/lib/connectToDB";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Organization from "@/models/Organization";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

type OrganizationStatus = "active" | "inactive";

interface SessionUserLike {
  role?: string;
  permissions?: string[];
}

interface UpdateOrganizationPayload {
  legalName?: string;
  commercialName?: string;
  taxId?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  website?: string;
  country?: string;
  city?: string;
  address?: string;
  status?: OrganizationStatus;
  notes?: string;
}

/* -------------------------------------------------------------------------- */
/* 🧠 Helpers                                                                 */
/* -------------------------------------------------------------------------- */

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

function normalizeOptionalStatus(value: unknown): OrganizationStatus | undefined {
  if (value === "active" || value === "inactive") {
    return value;
  }

  return undefined;
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
    ? user.permissions.includes("organizations.read") ||
        user.permissions.includes("organizations.update")
    : false;
}

function normalizeUpdatePayload(payload: unknown): UpdateOrganizationPayload {
  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const normalized: UpdateOrganizationPayload = {};

  if ("legalName" in data) {
    normalized.legalName = normalizeOptionalString(data.legalName);
  }

  if ("commercialName" in data) {
    normalized.commercialName = normalizeOptionalString(data.commercialName);
  }

  if ("taxId" in data) {
    normalized.taxId = normalizeOptionalString(data.taxId);
  }

  if ("primaryEmail" in data) {
    normalized.primaryEmail = normalizeOptionalEmail(data.primaryEmail);
  }

  if ("primaryPhone" in data) {
    normalized.primaryPhone = normalizeOptionalString(data.primaryPhone);
  }

  if ("website" in data) {
    normalized.website = normalizeOptionalString(data.website);
  }

  if ("country" in data) {
    normalized.country = normalizeOptionalString(data.country);
  }

  if ("city" in data) {
    normalized.city = normalizeOptionalString(data.city);
  }

  if ("address" in data) {
    normalized.address = normalizeOptionalString(data.address);
  }

  if ("status" in data) {
    normalized.status = normalizeOptionalStatus(data.status);
  }

  if ("notes" in data) {
    normalized.notes = normalizeOptionalString(data.notes);
  }

  return normalized;
}

function validateUpdatePayload(input: UpdateOrganizationPayload): string | null {
  if ("legalName" in input && !input.legalName) {
    return "legalName cannot be empty.";
  }

  if ("taxId" in input && !input.taxId) {
    return "taxId cannot be empty.";
  }

  if ("primaryEmail" in input && !input.primaryEmail) {
    return "primaryEmail cannot be empty.";
  }

  if ("primaryPhone" in input && !input.primaryPhone) {
    return "primaryPhone cannot be empty.";
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* 📥 GET                                                                     */
/* -------------------------------------------------------------------------- */

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid organization id.",
        },
        { status: 400 }
      );
    }

    await connectToDB();

    const organization = await Organization.findById(id).lean();

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organization not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: organization,
    });
  } catch (error) {
    console.error(`GET /api/admin/organizations/[id] error:`, error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to load organization.",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 📤 PUT                                                                     */
/* -------------------------------------------------------------------------- */

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid organization id.",
        },
        { status: 400 }
      );
    }

    await connectToDB();

    const body = await req.json();
    const input = normalizeUpdatePayload(body);

    const validationError = validateUpdatePayload(input);

    if (validationError) {
      return NextResponse.json(
        {
          ok: false,
          message: validationError,
        },
        { status: 400 }
      );
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true, runValidators: true }
    ).lean();

    if (!organization) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organization not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Organization updated successfully.",
      data: organization,
    });
  } catch (error) {
    console.error(`PUT /api/admin/organizations/[id] error:`, error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to update organization.",
      },
      { status: 500 }
    );
  }
}