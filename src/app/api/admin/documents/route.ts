/**
 * =============================================================================
 * 📡 API Route: Admin Documents
 * Path: src/app/api/admin/documents/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para listar y crear documentos administrables.
 *
 *   Métodos:
 *   - GET: devuelve documentos con filtros básicos para el panel admin
 *   - POST: crea un nuevo documento
 *
 *   Objetivo:
 *   - Servir como base del módulo Documents Library
 *   - Permitir que Services, Projects y Client Portal reutilicen documentos
 *   - Mantener un contrato estable y seguro para la UI administrativa
 *
 *   Decisiones:
 *   - Los metadatos técnicos/auditoría NO se capturan manualmente desde la UI:
 *     - uploadedAt
 *     - updatedBy
 *     - updatedByEmail
 *     - mimeType
 *     - fileSizeBytes
 *   - El backend resuelve estos valores con defaults seguros.
 *   - El campo language mantiene contrato interno estable:
 *     - es
 *     - en
 *     - both
 *     - other
 *     La traducción a etiquetas visibles (Ej: "Bilingüe") se resuelve en UI.
 *
 * EN:
 *   Administrative endpoint for listing and creating reusable documents.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    await connectToDB();

    const { searchParams } = new URL(req.url);

    const q = normalizeString(searchParams.get("q"));
    const status = normalizeString(searchParams.get("status"));
    const visibility = normalizeString(searchParams.get("visibility"));
    const relatedModule = normalizeString(searchParams.get("relatedModule"));
    const category = normalizeString(searchParams.get("category"));
    const language = normalizeString(searchParams.get("language"));
    const featured = normalizeString(searchParams.get("featured"));
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || 50), 1),
      200
    );

    const query: Record<string, unknown> = {};

    if (
      status === "draft" ||
      status === "published" ||
      status === "archived"
    ) {
      query.status = status;
    }

    if (
      visibility === "public" ||
      visibility === "private" ||
      visibility === "internal"
    ) {
      query.visibility = visibility;
    }

    if (relatedModule) {
      const normalizedRelatedModule = normalizeRelatedModule(relatedModule);

      query.relatedModule = {
        $in: [normalizedRelatedModule, "general"],
      };
    }

    if (category) {
      query.category = normalizeDocumentCategory(category);
    }

    if (
      language === "es" ||
      language === "en" ||
      language === "both" ||
      language === "other"
    ) {
      query.language = language;
    }

    if (featured === "true") {
      query.featured = true;
    } else if (featured === "false") {
      query.featured = false;
    }

    if (q) {
      query.$or = [
        { "title.es": { $regex: q, $options: "i" } },
        { "title.en": { $regex: q, $options: "i" } },
        { "description.es": { $regex: q, $options: "i" } },
        { "description.en": { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { type: { $regex: q, $options: "i" } },
        { fileName: { $regex: q, $options: "i" } },
      ];
    }

    const documents = await Document.find(query)
      .sort({ order: 1, uploadedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json(
      {
        ok: true,
        data: documents ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Documents][GET] error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error loading documents",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) return guard.response;

    await connectToDB();

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

    const created = await Document.create({
      title: payload.title,
      description: payload.description,
      type: payload.type,
      fileUrl: payload.fileUrl,
      fileName: payload.fileName || payload.fileUrl.split("/").pop() || "",
      mimeType: inferMimeType(payload.type, payload.fileUrl),
      fileSizeBytes: 0,
      thumbnailUrl: payload.thumbnailUrl,
      language: payload.language,
      category: payload.category,
      relatedModule: payload.relatedModule,
      relatedEntityId: payload.relatedEntityId,
      visibility: payload.visibility,
      status: payload.status,
      order: payload.order,
      featured: payload.featured,
      uploadedAt: new Date(),
      updatedBy: guard.userName,
      updatedByEmail: guard.userEmail,
    });

    return NextResponse.json(
      {
        ok: true,
        data: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Admin Documents][POST] error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Error creating document",
      },
      { status: 500 }
    );
  }
}