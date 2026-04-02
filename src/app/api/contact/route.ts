/**
 * =============================================================================
 * 📡 API Route: Public Contact
 * Path: src/app/api/contact/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint público para recibir formularios de contacto del sitio.
 *
 * Responsabilidades:
 * - Validar el contrato mínimo del formulario público.
 * - Aceptar múltiples intenciones en una sola entrada:
 *   - general
 *   - advisory
 *   - quote
 *   - support
 * - Persistir la solicitud en MongoDB.
 * - Resolver y congelar la clase de servicio seleccionada.
 * - Devolver una respuesta estable para el frontend público.
 *
 * Contrato esperado:
 * POST /api/contact
 *
 * Body:
 * {
 *   intent: "general" | "advisory" | "quote" | "support",
 *   name: string,
 *   company?: string,
 *   email: string,
 *   phone?: string,
 *   location?: string,
 *   serviceClassKey?: string,
 *   message: string
 * }
 *
 * Reglas:
 * - name, email y message son obligatorios siempre.
 * - serviceClassKey es obligatorio cuando intent = advisory | quote.
 * - No se permite any.
 *
 * EN:
 * Public endpoint for website contact requests.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import ContactRequest, { ContactIntent } from "@/models/ContactRequest";
import ServiceClass from "@/models/ServiceClass";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface ContactRequestPayload {
  intent: ContactIntent;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  location?: string;
  serviceClassKey?: string;
  message: string;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ALLOWED_INTENTS: ContactIntent[] = [
  "general",
  "advisory",
  "quote",
  "support",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeIntent(value: unknown): ContactIntent {
  return typeof value === "string" && ALLOWED_INTENTS.includes(value as ContactIntent)
    ? (value as ContactIntent)
    : "general";
}

function isValidEmail(value: string): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizePayload(body: unknown): ContactRequestPayload {
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  return {
    intent: normalizeIntent(record.intent),
    name: normalizeString(record.name),
    company: normalizeString(record.company) || undefined,
    email: normalizeString(record.email),
    phone: normalizeString(record.phone) || undefined,
    location: normalizeString(record.location) || undefined,
    serviceClassKey: normalizeString(record.serviceClassKey) || undefined,
    message: normalizeString(record.message),
  };
}

function validatePayload(payload: ContactRequestPayload): string | null {
  if (!payload.name) {
    return "NAME_REQUIRED";
  }

  if (!payload.email || !isValidEmail(payload.email)) {
    return "EMAIL_INVALID";
  }

  if (!payload.message) {
    return "MESSAGE_REQUIRED";
  }

  if (
    (payload.intent === "advisory" || payload.intent === "quote") &&
    !payload.serviceClassKey
  ) {
    return "SERVICE_CLASS_REQUIRED";
  }

  return null;
}

function getValidationMessage(code: string): string {
  switch (code) {
    case "NAME_REQUIRED":
      return "Name is required.";
    case "EMAIL_INVALID":
      return "A valid email is required.";
    case "MESSAGE_REQUIRED":
      return "Message is required.";
    case "SERVICE_CLASS_REQUIRED":
      return "Service class is required for this request type.";
    default:
      return "Invalid request.";
  }
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
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
          message: getValidationMessage(validationError),
        },
        { status: 400 }
      );
    }

    const serviceClass =
      payload.serviceClassKey?.trim()
        ? await ServiceClass.findOne({
            key: payload.serviceClassKey.trim(),
            enabled: true,
          }).lean()
        : null;

    if (
      (payload.intent === "advisory" || payload.intent === "quote") &&
      !serviceClass
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "SERVICE_CLASS_NOT_FOUND",
          message: "Selected service class is invalid.",
        },
        { status: 400 }
      );
    }

    const created = await ContactRequest.create({
      intent: payload.intent,
      name: payload.name,
      company: payload.company || "",
      email: payload.email,
      phone: payload.phone || "",
      location: payload.location || "",
      serviceClassKey: serviceClass?.key ?? "",
      serviceClassSnapshot: serviceClass?.label ?? { es: "", en: "" },
      message: payload.message,
      source: "public_site",
      status: "new",
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Request received successfully.",
        requestId: String(created._id),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API /contact] POST error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}