import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDB } from "@/lib/connectToDB";
import ServiceClass from "@/models/ServiceClass";

/**
 * =============================================================================
 * 📡 API Route: Admin Service Classes
 * Path: src/app/api/admin/service-classes/route.ts
 * =============================================================================
 *
 * ES:
 * CRUD administrativo completo para clases de servicio.
 *
 * Métodos:
 * - GET    -> lista todas las clases
 * - POST   -> crea una clase
 * - PUT    -> actualiza una clase existente (requiere ?id=...)
 * - DELETE -> elimina una clase existente (requiere ?id=...)
 *
 * Contrato:
 * - GET devuelve: { ok, items }
 * - POST devuelve: { ok, item }
 * - PUT devuelve: { ok, item }
 * - DELETE devuelve: { ok, deletedId }
 *
 * Reglas:
 * - `key` único
 * - `label.es` y `label.en` obligatorios
 * - `description` bilingüe opcional
 * - `order` numérico
 * - `enabled` booleano
 *
 * EN:
 * Full administrative CRUD for service classes.
 * =============================================================================
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface LocalizedTextPayload {
  es: string;
  en: string;
}

interface ServiceClassPayload {
  key: string;
  label: LocalizedTextPayload;
  description: LocalizedTextPayload;
  enabled: boolean;
  order: number;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeLocalizedText(value: unknown): LocalizedTextPayload {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    es: normalizeString(record.es),
    en: normalizeString(record.en),
  };
}

function normalizePayload(body: unknown): ServiceClassPayload {
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  return {
    key: normalizeString(record.key),
    label: normalizeLocalizedText(record.label),
    description: normalizeLocalizedText(record.description),
    enabled: normalizeBoolean(record.enabled, true),
    order: normalizeNumber(record.order, 0),
  };
}

function validatePayload(payload: ServiceClassPayload): string | null {
  if (!payload.key) return "KEY_REQUIRED";
  if (!payload.label.es) return "LABEL_ES_REQUIRED";
  if (!payload.label.en) return "LABEL_EN_REQUIRED";
  return null;
}

function getErrorMessage(code: string): string {
  switch (code) {
    case "KEY_REQUIRED":
      return "Key is required.";
    case "LABEL_ES_REQUIRED":
      return "Spanish label is required.";
    case "LABEL_EN_REQUIRED":
      return "English label is required.";
    case "INVALID_ID":
      return "Invalid id.";
    case "NOT_FOUND":
      return "Service class not found.";
    case "DUPLICATE_KEY":
      return "Key already exists.";
    default:
      return "Invalid request.";
  }
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
  try {
    await connectToDB();

    const items = await ServiceClass.find()
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json(
      {
        ok: true,
        items: items.map((item) => ({
          _id: String(item._id),
          key: item.key ?? "",
          label: {
            es: item.label?.es ?? "",
            en: item.label?.en ?? "",
          },
          description: {
            es: item.description?.es ?? "",
            en: item.description?.en ?? "",
          },
          enabled: typeof item.enabled === "boolean" ? item.enabled : true,
          order: typeof item.order === "number" ? item.order : 0,
          createdAt: item.createdAt ?? null,
          updatedAt: item.updatedAt ?? null,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /admin/service-classes] GET error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error.",
        items: [],
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    await connectToDB();

    const rawBody: unknown = await req.json().catch(() => null);
    const payload = normalizePayload(rawBody);
    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json(
        {
          ok: false,
          code: validationError,
          message: getErrorMessage(validationError),
        },
        { status: 400 }
      );
    }

    const existing = await ServiceClass.findOne({ key: payload.key }).lean();

    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          code: "DUPLICATE_KEY",
          message: getErrorMessage("DUPLICATE_KEY"),
        },
        { status: 409 }
      );
    }

    const created = await ServiceClass.create({
      key: payload.key,
      label: payload.label,
      description: payload.description,
      enabled: payload.enabled,
      order: payload.order,
    });

    return NextResponse.json(
      {
        ok: true,
        item: {
          _id: String(created._id),
          key: created.key,
          label: created.label,
          description: created.description,
          enabled: created.enabled,
          order: created.order,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API /admin/service-classes] POST error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();

    const id = req.nextUrl.searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_ID",
          message: getErrorMessage("INVALID_ID"),
        },
        { status: 400 }
      );
    }

    const rawBody: unknown = await req.json().catch(() => null);
    const payload = normalizePayload(rawBody);
    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json(
        {
          ok: false,
          code: validationError,
          message: getErrorMessage(validationError),
        },
        { status: 400 }
      );
    }

    const duplicate = await ServiceClass.findOne({
      key: payload.key,
      _id: { $ne: id },
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        {
          ok: false,
          code: "DUPLICATE_KEY",
          message: getErrorMessage("DUPLICATE_KEY"),
        },
        { status: 409 }
      );
    }

    const updated = await ServiceClass.findByIdAndUpdate(
      id,
      {
        key: payload.key,
        label: payload.label,
        description: payload.description,
        enabled: payload.enabled,
        order: payload.order,
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: getErrorMessage("NOT_FOUND"),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item: {
          _id: String(updated._id),
          key: updated.key ?? "",
          label: {
            es: updated.label?.es ?? "",
            en: updated.label?.en ?? "",
          },
          description: {
            es: updated.description?.es ?? "",
            en: updated.description?.en ?? "",
          },
          enabled: typeof updated.enabled === "boolean" ? updated.enabled : true,
          order: typeof updated.order === "number" ? updated.order : 0,
          createdAt: updated.createdAt ?? null,
          updatedAt: updated.updatedAt ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /admin/service-classes] PUT error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(req: NextRequest) {
  try {
    await connectToDB();

    const id = req.nextUrl.searchParams.get("id");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_ID",
          message: getErrorMessage("INVALID_ID"),
        },
        { status: 400 }
      );
    }

    const deleted = await ServiceClass.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          code: "NOT_FOUND",
          message: getErrorMessage("NOT_FOUND"),
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        deletedId: id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /admin/service-classes] DELETE error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}