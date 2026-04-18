/**
 * =============================================================================
 * 📡 API Route: Portal Projects
 * Path: src/app/api/portal/projects/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint del portal cliente para listar proyectos visibles de la organización
 * autenticada.
 *
 * Propósito:
 * - devolver únicamente proyectos asociados a la organización del usuario
 * - reutilizar la capa compartida de lectura del portal
 * - mantener una única fuente de verdad para la consulta de proyectos
 *
 * Alcance:
 * - solo lista proyectos
 * - no devuelve detalle expandido
 * - no construye documentos ni alertas globales del portal todavía
 *
 * Decisiones:
 * - la sesión del portal es la fuente de verdad para organizationId
 * - la validación de acceso vive en el endpoint
 * - la consulta y proyección viven en src/lib/portal/portalProjects.ts
 * - archived no se expone en portal
 *
 * EN:
 * Portal API route for listing visible projects for the authenticated
 * organization.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPortalProjectsByOrganization } from "@/lib/portal/portalProjects";

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
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
				{ status: 401 },
			);
		}

		const items = await getPortalProjectsByOrganization(user.organizationId);

		return NextResponse.json({
			ok: true,
			items,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Error loading portal projects.",
			},
			{ status: 500 },
		);
	}
}
