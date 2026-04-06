/**
 * =============================================================================
 * 📡 API Route: Admin Organizations
 * Path: src/app/api/admin/organizations/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para listar y crear organizaciones.
 *
 *   Responsabilidades:
 *   - GET:
 *     - listar organizaciones
 *     - soportar búsqueda por razón social, nombre comercial o taxId
 *     - soportar filtro por estado
 *   - POST:
 *     - crear una nueva organización
 *     - normalizar datos de entrada
 *     - validar campos obligatorios
 *
 *   Reglas:
 *   - acceso exclusivo para usuarios administrativos
 *   - no eliminación física
 *   - taxId se maneja como string
 *   - status usa estados lógicos
 *
 * EN:
 *   Administrative endpoint for listing and creating organizations.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { connectToDB } from "@/lib/connectToDB";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Organization from "@/models/Organization";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

type OrganizationStatus = "active" | "inactive";
type OrganizationStatusFilter = OrganizationStatus | "all";

interface NormalizedOrganizationInput {
  legalName: string;
  commercialName: string;
  taxId: string;
  primaryEmail: string;
  primaryPhone: string;
  website: string;
  country: string;
  city: string;
  address: string;
  status: OrganizationStatus;
  notes: string;
}

interface SessionUserLike {
  role?: string;
  permissions?: string[];
}

/* -------------------------------------------------------------------------- */
/* 🧠 Helpers                                                                 */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown): string {
  return normalizeString(value).toLowerCase();
}

function normalizeStatus(value: unknown): OrganizationStatus {
  return value === "inactive" ? "inactive" : "active";
}

function normalizeStatusFilter(value: string | null): OrganizationStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

function parseQuery(value: string | null): string {
  return normalizeString(value ?? "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSearchFilter(query: string): Record<string, unknown>[] {
  if (!query) {
    return [];
  }

  const regex = new RegExp(escapeRegex(query), "i");

  return [
    { legalName: regex },
    { commercialName: regex },
    { taxId: regex },
    { primaryEmail: regex },
    { primaryPhone: regex },
  ];
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
        user.permissions.includes("organizations.create") ||
        user.permissions.includes("organizations.update")
    : false;
}

function validateOrganizationInput(
  input: NormalizedOrganizationInput
): string | null {
  if (!input.legalName) {
    return "legalName is required.";
  }

  if (!input.taxId) {
    return "taxId is required.";
  }

  if (!input.primaryEmail) {
    return "primaryEmail is required.";
  }

  if (!input.primaryPhone) {
    return "primaryPhone is required.";
  }

  return null;
}

function normalizeOrganizationInput(payload: unknown): NormalizedOrganizationInput {
  const data =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  return {
    legalName: normalizeString(data.legalName),
    commercialName: normalizeString(data.commercialName),
    taxId: normalizeString(data.taxId),
    primaryEmail: normalizeEmail(data.primaryEmail),
    primaryPhone: normalizeString(data.primaryPhone),
    website: normalizeString(data.website),
    country: normalizeString(data.country),
    city: normalizeString(data.city),
    address: normalizeString(data.address),
    status: normalizeStatus(data.status),
    notes: normalizeString(data.notes),
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
        { status: 401 }
      );
    }

    await connectToDB();

    const { searchParams } = new URL(req.url);

    const query = parseQuery(searchParams.get("query"));
    const status = normalizeStatusFilter(searchParams.get("status"));

    const mongoFilter: Record<string, unknown> = {};

    if (status !== "all") {
      mongoFilter.status = status;
    }

    const searchFilter = buildSearchFilter(query);

    if (searchFilter.length > 0) {
      mongoFilter.$or = searchFilter;
    }

    const organizations = await Organization.find(mongoFilter)
      .sort({ createdAt: -1, legalName: 1 })
      .lean();

    return NextResponse.json({
      ok: true,
      data: organizations,
      total: organizations.length,
      filters: {
        query,
        status,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/organizations error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to load organizations.",
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
    const input = normalizeOrganizationInput(body);

    const validationError = validateOrganizationInput(input);

    if (validationError) {
      return NextResponse.json(
        {
          ok: false,
          message: validationError,
        },
        { status: 400 }
      );
    }

    const organization = await Organization.create({
      legalName: input.legalName,
      commercialName: input.commercialName,
      taxId: input.taxId,
      primaryEmail: input.primaryEmail,
      primaryPhone: input.primaryPhone,
      website: input.website,
      country: input.country,
      city: input.city,
      address: input.address,
      status: input.status,
      notes: input.notes,
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Organization created successfully.",
        data: organization,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/organizations error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to create organization.",
      },
      { status: 500 }
    );
  }
}