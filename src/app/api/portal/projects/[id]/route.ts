/**
 * =============================================================================
 * 📡 API Route: Portal Project By ID
 * Path: src/app/api/portal/projects/[id]/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint del portal cliente para obtener el detalle de un proyecto visible
 * para la organización autenticada.
 *
 * Propósito:
 * - devolver únicamente el detalle de un proyecto asociado a la organización
 *   del usuario autenticado
 * - reutilizar la capa compartida de lectura del portal
 * - mantener una única fuente de verdad para la consulta del detalle
 *
 * Alcance:
 * - solo lectura de detalle
 * - no actualiza ni elimina proyectos
 * - no expone proyectos ajenos a la organización autenticada
 *
 * Decisiones:
 * - la sesión del portal es la fuente de verdad para organizationId
 * - la validación de acceso vive en el endpoint
 * - la consulta y proyección viven en src/lib/portal/portalProjects.ts
 * - si el proyecto no existe, no pertenece a la organización o no es visible
 *   en portal, se responde 404
 *
 * EN:
 * Portal API route for returning a single visible project detail for the
 * authenticated organization.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPortalProjectDetailByOrganization } from "@/lib/portal/portalProjects";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user;

    /**
     * Solo usuarios cliente activos con organizationId válido.
     */
    if (
      !user ||
      user.userType !== "client" ||
      user.status !== "active" ||
      !user.organizationId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const item = await getPortalProjectDetailByOrganization({
      organizationId: user.organizationId,
      projectId: id,
      organizationName: user.organizationName ?? null,
    });

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
      item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error loading portal project.",
      },
      { status: 500 }
    );
  }
}