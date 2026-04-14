/**
 * =============================================================================
 * 📡 API Route: Admin Project By ID
 * Path: src/app/api/admin/projects/[id]/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para leer, actualizar y eliminar un proyecto.
 *
 *   Decisiones:
 *   - la actualización NO usa findByIdAndUpdate
 *   - se usa existing.set + validate + save
 *   - se marcan paths anidados críticos como modificados
 *   - esto garantiza la ejecución de hooks del modelo Project
 *
 *   Regla crítica de estabilidad:
 *   - al editar, NO se deben perder referencias de documentos ya cargados
 *   - si el frontend manda un documento existente con metadata de archivo vacía,
 *     se preserva la metadata persistida previamente en DB
 *   - esto evita romper funcionalidades que ya estaban correctas
 * =============================================================================
 */

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";
import {
  normalizeProjectEntity,
  normalizeProjectWritePayload,
} from "@/lib/projects/projectPayload";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type NormalizedPayload = ReturnType<typeof normalizeProjectWritePayload>;

type ExistingProjectDocumentLike = {
  documentId?: string;
  title?: string;
  documentType?: string;
  description?: string;
  visibility?: string;
  language?: string;
  documentDate?: Date | string | null;

  fileName?: string;
  fileUrl?: string;
  storageKey?: string;
  mimeType?: string;
  size?: number | null;

  version?: string;

  isPublic?: boolean;
  visibleInPortal?: boolean;
  visibleInPublicSite?: boolean;
  visibleToInternalOnly?: boolean;

  requiresAlert?: boolean;
  alertDate?: Date | string | null;
  nextDueDate?: Date | string | null;
  maintenanceFrequency?: string | null;

  isCritical?: boolean;
  sortOrder?: number;
  notes?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function calculateContractEndDate(
  start: string | null,
  durationMonths: number | null
): string | null {
  if (!start || !durationMonths || durationMonths <= 0) return null;

  const date = new Date(start);
  if (Number.isNaN(date.getTime())) return null;

  const next = new Date(date);
  next.setMonth(next.getMonth() + durationMonths);

  return next.toISOString();
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeNullableDateLike(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function hasFileMetadata(value: {
  fileName?: string;
  fileUrl?: string;
  storageKey?: string;
  mimeType?: string;
  size?: number | null;
}): boolean {
  return (
    normalizeText(value.fileName).length > 0 ||
    normalizeText(value.fileUrl).length > 0 ||
    normalizeText(value.storageKey).length > 0 ||
    normalizeText(value.mimeType).length > 0 ||
    normalizeNullableNumber(value.size) !== null
  );
}

function buildExistingDocumentsMap(
  existingDocuments: ExistingProjectDocumentLike[]
): Map<string, ExistingProjectDocumentLike> {
  const map = new Map<string, ExistingProjectDocumentLike>();

  for (const item of existingDocuments) {
    const keyById = normalizeText(item.documentId);
    const keyByFileUrl = normalizeText(item.fileUrl);
    const keyByStorage = normalizeText(item.storageKey);

    if (keyById) {
      map.set(`id:${keyById}`, item);
    }

    if (keyByFileUrl) {
      map.set(`fileUrl:${keyByFileUrl}`, item);
    }

    if (keyByStorage) {
      map.set(`storageKey:${keyByStorage}`, item);
    }
  }

  return map;
}

function resolveExistingDocumentMatch(
  item: NormalizedPayload["documents"][number],
  existingDocumentsMap: Map<string, ExistingProjectDocumentLike>
): ExistingProjectDocumentLike | null {
  const byId = normalizeText(item.documentId);
  if (byId) {
    const found = existingDocumentsMap.get(`id:${byId}`);
    if (found) return found;
  }

  const byFileUrl = normalizeText(item.fileUrl);
  if (byFileUrl) {
    const found = existingDocumentsMap.get(`fileUrl:${byFileUrl}`);
    if (found) return found;
  }

  const byStorage = normalizeText(item.storageKey);
  if (byStorage) {
    const found = existingDocumentsMap.get(`storageKey:${byStorage}`);
    if (found) return found;
  }

  return null;
}

function mergeDocumentsWithExisting(
  nextDocuments: NormalizedPayload["documents"],
  existingDocumentsRaw: ExistingProjectDocumentLike[]
): NormalizedPayload["documents"] {
  const existingDocumentsMap = buildExistingDocumentsMap(existingDocumentsRaw);

  return nextDocuments.map((item, index) => {
    const existingMatch = resolveExistingDocumentMatch(item, existingDocumentsMap);

    if (!existingMatch) {
      return {
        ...item,
        sortOrder: index,
      };
    }

    const incomingHasFileData = hasFileMetadata(item);

    return {
      ...item,
      documentId:
        normalizeText(item.documentId) || normalizeText(existingMatch.documentId),
      documentDate:
        item.documentDate ?? normalizeNullableDateLike(existingMatch.documentDate),

      fileName: incomingHasFileData
        ? item.fileName
        : normalizeText(existingMatch.fileName),
      fileUrl: incomingHasFileData
        ? item.fileUrl
        : normalizeText(existingMatch.fileUrl),
      storageKey: incomingHasFileData
        ? item.storageKey
        : normalizeText(existingMatch.storageKey),
      mimeType: incomingHasFileData
        ? item.mimeType
        : normalizeText(existingMatch.mimeType),
      size: incomingHasFileData
        ? item.size
        : normalizeNullableNumber(existingMatch.size),

      sortOrder: index,
    };
  });
}

function buildProjectPersistencePayload(
  input: unknown
): NormalizedPayload {
  const normalized = normalizeProjectWritePayload(input);

  const publicEnabled = Boolean(normalized.publicSiteSettings.enabled);
  const contractEndDate =
    normalized.contractEndDate ??
    calculateContractEndDate(
      normalized.contractStartDate,
      normalized.contractDurationMonths
    );

  return {
    ...normalized,
    status: publicEnabled
      ? "published"
      : normalized.status === "archived"
        ? "archived"
        : "draft",
    visibility: publicEnabled ? "public" : "private",
    contractEndDate,
    documents: normalized.documents.map((item, index) => ({
      ...item,
      sortOrder: index,
    })),
  };
}

function buildValidationErrors(payload: NormalizedPayload): string[] {
  const errors: string[] = [];

  if (!payload.slug) errors.push("Slug is required.");
  if (!payload.title.es) errors.push("Title ES is required.");
  if (!payload.title.en) errors.push("Title EN is required.");
  if (!payload.summary.es) errors.push("Summary ES is required.");
  if (!payload.summary.en) errors.push("Summary EN is required.");
  if (!payload.description.es) errors.push("Description ES is required.");
  if (!payload.description.en) errors.push("Description EN is required.");
  if (!payload.primaryClientId) errors.push("Organization is required.");

  if (!payload.contractStartDate) {
    errors.push("Contract start date is required.");
  }

  if (
    payload.contractDurationMonths === null ||
    !Number.isFinite(payload.contractDurationMonths) ||
    payload.contractDurationMonths <= 0
  ) {
    errors.push("Contract duration months must be greater than 0.");
  }

  if (!payload.contractEndDate) {
    errors.push("Contract end date is required.");
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectToDB();

    const { id } = await context.params;
    const normalizedId = id.trim();

    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid project id.",
        },
        { status: 400 }
      );
    }

    const item = await Project.findById(normalizedId).lean();

    if (!item) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: normalizeProjectEntity(item),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error loading project.",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(req: Request, context: RouteContext) {
  try {
    await connectToDB();

    const { id } = await context.params;
    const normalizedId = id.trim();

    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid project id.",
        },
        { status: 400 }
      );
    }

    const existing = await Project.findById(normalizedId);

    if (!existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project not found.",
        },
        { status: 404 }
      );
    }

    const body = (await req.json().catch(() => null)) as unknown;
    const payload = buildProjectPersistencePayload(body);
    const validationErrors = buildValidationErrors(payload);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Validation error.",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    const duplicateSlug = await Project.findOne({
      slug: payload.slug,
      _id: { $ne: normalizedId },
    })
      .select("_id")
      .lean();

    if (duplicateSlug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug already exists.",
        },
        { status: 409 }
      );
    }

    const existingDocumentsSource = Array.isArray(existing.documents)
      ? (existing.documents as unknown as ExistingProjectDocumentLike[])
      : [];

    const mergedDocuments = mergeDocumentsWithExisting(
      payload.documents,
      existingDocumentsSource
    );

    existing.set({
      slug: payload.slug,
      status: payload.status,
      visibility: payload.visibility,
      featured: payload.featured,
      sortOrder: payload.sortOrder,

      title: payload.title,
      summary: payload.summary,
      description: payload.description,

      primaryClientId: payload.primaryClientId,
      clientDisplayName:
        payload.clientDisplayName || existing.clientDisplayName || "",
      clientEmail: payload.clientEmail || existing.clientEmail || "",

      coverImage: payload.coverImage,
      gallery: payload.gallery,

      publicSiteSettings: {
        ...(existing.publicSiteSettings
          ? (existing.publicSiteSettings as unknown as Record<string, unknown>)
          : {}),
        ...payload.publicSiteSettings,
      },

      documents: mergedDocuments,
      maintenanceItems: payload.maintenanceItems,

      contractStartDate: payload.contractStartDate,
      contractDurationMonths: payload.contractDurationMonths,
      contractEndDate: payload.contractEndDate,

      technicalOverview: payload.technicalOverview,
      systemType: payload.systemType,
      treatedMedium: payload.treatedMedium,
      technologyUsed: payload.technologyUsed,
      operationalNotes: payload.operationalNotes,
      internalNotes: payload.internalNotes,
      locationLabel: payload.locationLabel,
      isPublicLocationVisible: payload.isPublicLocationVisible,
    });

    existing.markModified("documents");
    existing.markModified("maintenanceItems");
    existing.markModified("publicSiteSettings");

    await existing.save({ validateBeforeSave: true });

    return NextResponse.json({
      ok: true,
      item: normalizeProjectEntity(existing.toObject()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error updating project.",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(_: Request, context: RouteContext) {
  try {
    await connectToDB();

    const { id } = await context.params;
    const normalizedId = id.trim();

    if (!mongoose.Types.ObjectId.isValid(normalizedId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid project id.",
        },
        { status: 400 }
      );
    }

    const deleted = await Project.findByIdAndDelete(normalizedId).lean();

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          error: "Project not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error deleting project.",
      },
      { status: 500 }
    );
  }
}