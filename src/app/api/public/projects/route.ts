/**
 * =============================================================================
 * 📡 API Route: Public Projects
 * Path: src/app/api/public/projects/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint público para listar proyectos visibles en el sitio.
 *
 * Regla pública:
 * - solo salen proyectos con publicación pública habilitada
 * - solo se expone:
 *   - identidad pública básica
 *   - resumen
 *   - portada
 *   - galería
 *
 * Decisiones:
 * - los proyectos destacados salen primero
 * - luego se respeta sortOrder y fechas recientes
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import Project from "@/models/Project";

export async function GET() {
  try {
    await connectToDB();

    const items = await Project.find({
      status: "published",
      visibility: "public",
      "publicSiteSettings.enabled": true,
    })
      .sort({
        featured: -1,
        sortOrder: 1,
        updatedAt: -1,
        createdAt: -1,
      })
      .lean();

    const normalized = items.map((item) => normalizeProjectEntity(item));

    const publicItems = normalized.map((item) => ({
      _id: item._id,
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      coverImage: item.publicSiteSettings.showCoverImage ? item.coverImage : null,
      gallery: item.publicSiteSettings.showGallery ? item.gallery : [],
      featured: item.featured,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({
      ok: true,
      items: publicItems,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not load public projects.",
      },
      { status: 500 }
    );
  }
}