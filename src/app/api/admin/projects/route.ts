/**
 * =============================================================================
 * 📡 API Route: Admin Projects
 * Path: src/app/api/admin/projects/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para listar y crear proyectos.
 *
 *   Decisiones:
 *   - toda escritura pasa por normalizeProjectWritePayload
 *   - la persistencia usa documentos Mongoose reales
 *   - se fuerza validate + save para que corran hooks del modelo
 *   - el modelo Project es la fuente de verdad para:
 *     - contractEndDate
 *     - visibilidad pública
 *     - schedule de mantenimientos
 *     - nextDueDate derivada
 *
 *   Regla importante:
 *   - POST no intenta reconstruir documentos previos porque el proyecto aún
 *     no existe; simplemente persiste exactamente el payload normalizado
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";
import {
  normalizeProjectEntity,
  normalizeProjectWritePayload,
} from "@/lib/projects/projectPayload";

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

function buildProjectPersistencePayload(
  input: unknown
): ReturnType<typeof normalizeProjectWritePayload> {
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

function buildValidationErrors(
  payload: ReturnType<typeof normalizeProjectWritePayload>
): string[] {
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

export async function GET() {
  try {
    await connectToDB();

    const items = await Project.find({})
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      ok: true,
      items: items.map((item) => normalizeProjectEntity(item)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error loading projects.",
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

    const existingSlug = await Project.findOne({ slug: payload.slug })
      .select("_id")
      .lean();

    if (existingSlug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug already exists.",
        },
        { status: 409 }
      );
    }

    const project = new Project({
      slug: payload.slug,
      status: payload.status,
      visibility: payload.visibility,
      featured: payload.featured,
      sortOrder: payload.sortOrder,

      title: payload.title,
      summary: payload.summary,
      description: payload.description,

      primaryClientId: payload.primaryClientId,
      clientDisplayName: payload.clientDisplayName,
      clientEmail: payload.clientEmail,

      coverImage: payload.coverImage,
      gallery: payload.gallery,

      publicSiteSettings: payload.publicSiteSettings,

      documents: payload.documents,
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

    await project.save({ validateBeforeSave: true });

    return NextResponse.json(
      {
        ok: true,
        item: normalizeProjectEntity(project.toObject()),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error creating project.",
      },
      { status: 500 }
    );
  }
}