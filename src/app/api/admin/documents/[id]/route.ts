/**
 * =============================================================================
 * 📡 API Route: Admin Document By ID
 * Path: src/app/api/admin/documents/[id]/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para leer, actualizar y eliminar un documento.
 *
 *   Métodos:
 *   - GET: obtiene un documento por id
 *   - PUT: actualiza un documento por id
 *   - DELETE: elimina un documento por id
 *
 *   Objetivo:
 *   - Mantener un contrato estable para edición administrativa
 *   - Reutilizar las mismas reglas de negocio del endpoint base
 *   - Resolver auditoría en backend
 *
 *   Decisiones:
 *   - Los metadatos técnicos/auditoría NO se capturan manualmente desde la UI:
 *     - uploadedAt
 *     - updatedBy
 *     - updatedByEmail
 *     - mimeType
 *     - fileSizeBytes
 *   - uploadedAt se conserva desde el documento existente
 *   - updatedBy y updatedByEmail se resuelven desde la sesión
 *   - El campo language mantiene contrato interno estable:
 *     - es
 *     - en
 *     - both
 *     - other
 *     La traducción a etiquetas visibles (Ej: "Bilingüe") se resuelve en UI.
 *
 * EN:
 *   Administrative endpoint for reading, updating and deleting one document.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";

import { connectToDB } from "@/lib/connectToDB";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Document from "@/models/Document";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AllowedRole = "admin" | "superadmin";
type DocumentVisibility = "public" | "private" | "internal";
type DocumentStatus = "draft" | "published" | "archived";
type DocumentLanguage = "es" | "en" | "both" | "other";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface LocalizedText {
  es: string;
  en: string;
}

interface NormalizedDocumentPayload {
  title: LocalizedText;
  description: LocalizedText;
  type: string;
  fileUrl: string;
  fileName: string;
  thumbnailUrl: string;
  language: DocumentLanguage;
  category: string;
  relatedModule: string;
  relatedEntityId: string | null;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  order: number;
  featured: boolean;
}

type AdminGuardResult =
  | {
      ok: true;
      role: AllowedRole;
      userName: string;
      userEmail: string;
    }
  | {
      ok: false;
      response: NextResponse;
    };

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: LocalizedText = {
  es: "",
  en: "",
};

const ALLOWED_RELATED_MODULES = new Set([
  "general",
  "services",
  "projects",
  "policies",
  "client-portal",
]);

const ALLOWED_DOCUMENT_CATEGORIES = new Set([
  "general",
  "tratamiento-agua",
  "control-olores",
  "biorremediacion",
  "energia-solar",
  "procesos-microbiologicos",
  "corporativo",
  "certificaciones",
]);

const ALLOWED_DOCUMENT_TYPES = new Set([
  "pdf",
  "brochure",
  "datasheet",
  "manual",
  "certificate",
  "image",
]);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
  return role === "admin" || role === "superadmin";
}

async function requireAdmin(): Promise<AdminGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          message: "Invalid or expired session",
        },
        { status: 401 }
      ),
    };
  }

  const role = session.user.role;

  if (!isAllowedRole(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          message: "You do not have permission to access this resource",
        },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    role,
    userName: typeof session.user.name === "string" ? session.user.name : "",
    userEmail: typeof session.user.email === "string" ? session.user.email : "",
  };
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeLocalizedText(
  value: unknown,
  fallback: LocalizedText = EMPTY_LOCALIZED_TEXT
): LocalizedText {
  if (!value || typeof value !== "object") {
    return { ...fallback };
  }

  const record = value as Record<string, unknown>;

  return {
    es: normalizeString(record.es, fallback.es),
    en: normalizeString(record.en, fallback.en),
  };
}

function normalizeVisibility(value: unknown): DocumentVisibility {
  return value === "private" || value === "internal" ? value : "public";
}

function normalizeStatus(value: unknown): DocumentStatus {
  return value === "draft" || value === "archived" ? value : "published";
}

function normalizeLanguage(value: unknown): DocumentLanguage {
  return value === "en" || value === "both" || value === "other" ? value : "es";
}

function normalizeOrder(value: unknown): number {
  const n = normalizeNumber(value, 1);
  return n >= 1 ? Math.floor(n) : 1;
}

function normalizeOptionalId(value: unknown): string | null {
  const raw = normalizeString(value);
  return raw.length > 0 ? raw : null;
}

function normalizeDocumentType(value: unknown): string {
  const normalized = normalizeString(value, "pdf").toLowerCase();
  return ALLOWED_DOCUMENT_TYPES.has(normalized) ? normalized : "pdf";
}

function normalizeDocumentCategory(value: unknown): string {
  const normalized = normalizeString(value, "general").toLowerCase();
  return ALLOWED_DOCUMENT_CATEGORIES.has(normalized) ? normalized : "general";
}

function normalizeRelatedModule(value: unknown): string {
  const normalized = normalizeString(value, "general").toLowerCase();
  return ALLOWED_RELATED_MODULES.has(normalized) ? normalized : "general";
}

function normalizePayload(body: unknown): NormalizedDocumentPayload {
  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  return {
    title: normalizeLocalizedText(record.title),
    description: normalizeLocalizedText(record.description),
    type: normalizeDocumentType(record.type),
    fileUrl: normalizeString(record.fileUrl),
    fileName: normalizeString(record.fileName),
    thumbnailUrl: normalizeString(record.thumbnailUrl),
    language: normalizeLanguage(record.language),
    category: normalizeDocumentCategory(record.category),
    relatedModule: normalizeRelatedModule(record.relatedModule),
    relatedEntityId: normalizeOptionalId(record.relatedEntityId),
    visibility: normalizeVisibility(record.visibility),
    status: normalizeStatus(record.status),
    order: normalizeOrder(record.order),
    featured: normalizeBoolean(record.featured, false),
  };
}

function validatePayload(payload: NormalizedDocumentPayload): string | null {
  const hasTitle =
    payload.title.es.length > 0 || payload.title.en.length > 0;

  if (!hasTitle) {
    return "Document title is required";
  }

  if (!payload.fileUrl) {
    return "Document fileUrl is required";
  }

  return null;
}

function isValidObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value);
}

function inferMimeType(type: string, fileUrl: string): string {
  const lowerUrl = fileUrl.toLowerCase();

  if (
    lowerUrl.endsWith(".pdf") ||
    type === "pdf" ||
    type === "datasheet" ||
    type === "manual" ||
    type === "brochure" ||
    type === "certificate"
  ) {
    return "application/pdf";
  }

  if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (lowerUrl.endsWith(".png")) {
    return "image/png";
  }

  if (lowerUrl.endsWith(".webp")) {
    return "image/webp";
  }

  if (type === "image") {
    return "image/*";
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    await connectToDB();

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid document id",
        },
        { status: 400 }
      );
    }

    const document = await Document.findById(id).lean();

    if (!document) {
      return NextResponse.json(
        {
          ok: false,
          message: "Document not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: document,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Document By ID][GET] error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error loading document",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    await connectToDB();

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid document id",
        },
        { status: 400 }
      );
    }

    const existing = await Document.findById(id).lean();

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          message: "Document not found",
        },
        { status: 404 }
      );
    }

    const body: unknown = await req.json().catch(() => null);
    const payload = normalizePayload(body);

    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json(
        {
          ok: false,
          message: validationError,
        },
        { status: 400 }
      );
    }

    const updated = await Document.findByIdAndUpdate(
      id,
      {
        $set: {
          title: payload.title,
          description: payload.description,
          type: payload.type,
          fileUrl: payload.fileUrl,
          fileName: payload.fileName || payload.fileUrl.split("/").pop() || "",
          mimeType: inferMimeType(payload.type, payload.fileUrl),
          thumbnailUrl: payload.thumbnailUrl,
          language: payload.language,
          category: payload.category,
          relatedModule: payload.relatedModule,
          relatedEntityId: payload.relatedEntityId,
          visibility: payload.visibility,
          status: payload.status,
          order: payload.order,
          featured: payload.featured,
          uploadedAt: existing.uploadedAt ?? new Date(),
          updatedBy: guard.userName,
          updatedByEmail: guard.userEmail,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          message: "Document not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Document By ID][PUT] error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error updating document",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    await connectToDB();

    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid document id",
        },
        { status: 400 }
      );
    }

    const deleted = await Document.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          message: "Document not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: deleted,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Document By ID][DELETE] error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error deleting document",
      },
      { status: 500 }
    );
  }
}