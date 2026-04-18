/**
 * =============================================================================
 * 📌 API: /api/admin/seed/security
 * Ruta: src/app/api/admin/seed/security/route.ts
 * =============================================================================
 * ES:
 *   Seeder oficial de Seguridad para FastFood.
 *
 *   Este seeder restablece por completo el módulo de seguridad:
 *     - Elimina TODOS los roles y permisos previos.
 *     - Inserta los permisos oficiales definidos en:
 *         → src/lib/security/permissions.ts
 *     - Inserta los roles oficiales definidos en:
 *         → src/lib/security/roles.ts
 *       (Cada rol incluye un set explícito de códigos de permisos).
 *
 *   Seguridad:
 *     ✔ Solo SUPERADMIN puede ejecutar el seeder.
 *     ✔ NO modifica usuarios.
 *     ✔ NO crea usuarios.
 *     ✔ NO cambia contraseñas.
 *
 * EN:
 *   Official FastFood Security Seeder.
 *   - Drops and rebuilds the Permissions + Roles collections.
 *   - Only SUPERADMIN may execute this endpoint.
 *
 * 🌐 BILINGÜE:
 *   Todos los mensajes de respuesta contemplan ES / EN.
 *
 * AUTOR: Marcelo Noboa
 * MANTENCIÓN TÉCNICA: IA Asistida (ChatGPT)
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";

import Permission from "@/models/Permission";
import Role from "@/models/Role";

import { PERMISSIONS, type PermissionDef } from "@/lib/security/permissions";
import { ROLES, type RoleDef } from "@/lib/security/roles";

/* =============================================================================
 * 📌 Tipos estrictos usados en la inserción (NO usan Document)
 * =============================================================================
 */
interface InsertPermission {
	code: string;
	module: PermissionDef["module"];
	scope: PermissionDef["scope"];
	name_es: string;
	name_en: string;
	description_es: string;
	description_en: string;
}

interface InsertRole {
	code: string;
	name_es: string;
	name_en: string;
	permissions: string[];
}

/* =============================================================================
 * 🔐 VALIDACIÓN: SOLO SUPERADMIN PUEDE EJECUTAR ESTE SEEDER
 * -----------------------------------------------------------------------------
 * ES:
 *   Se garantiza que solo un usuario con rol "superadmin" puede ejecutar
 *   la reconstrucción completa del módulo de seguridad.
 *
 * EN:
 *   Ensures ONLY superadmin accounts may run the security seeder.
 * =============================================================================
 */
async function requireSuperadmin(
	req: NextRequest,
): Promise<
	{ ok: true; session: Session } | { ok: false; response: NextResponse }
> {
	const session = (await getServerSession(authOptions)) as Session | null;

	if (session?.user?.role !== "superadmin") {
		const locale = req.headers
			.get("accept-language")
			?.toLowerCase()
			.startsWith("es")
			? "es"
			: "en";

		return {
			ok: false,
			response: NextResponse.json(
				{
					error:
						locale === "es"
							? "Solo el Superadmin puede ejecutar este seeder."
							: "Only the Superadmin can run this seeder.",
				},
				{ status: 403 },
			),
		};
	}

	return { ok: true, session };
}

/* =============================================================================
 * 🔄 MAPPERS: Convierte PERMISSIONS / ROLES a inserts tipados
 * =============================================================================
 */
function mapPermissionDefToInsert(p: PermissionDef): InsertPermission {
	return {
		code: p.code,
		module: p.module,
		scope: p.scope,
		name_es: p.name_es,
		name_en: p.name_en,
		description_es: p.description_es,
		description_en: p.description_en,
	};
}

function mapRoleDefToInsert(r: RoleDef): InsertRole {
	return {
		code: r.code,
		name_es: r.name_es,
		name_en: r.name_en,
		permissions: r.permissions,
	};
}

/* =============================================================================
 * 📬 POST → EJECUTAR SEEDER
 * -----------------------------------------------------------------------------
 * ES:
 *   Proceso de restauración:
 *     1) Validación de SUPERADMIN.
 *     2) Conexión a la base de datos.
 *     3) Eliminación de roles + permisos actuales.
 *     4) Inserción de definiciones oficiales.
 *
 * EN:
 *   Security module full rebuild.
 * =============================================================================
 */
export async function POST(req: NextRequest) {
	try {
		// 1) Validar superadmin
		const guard = await requireSuperadmin(req);
		if (!guard.ok) return guard.response;

		// 2) Conectar DB
		await connectToDB();

		// 3) Borrar permisos y roles actuales
		await Permission.deleteMany({});
		await Role.deleteMany({});

		// 4) Insertar permisos base
		const permissionDocs: InsertPermission[] = PERMISSIONS.map(
			mapPermissionDefToInsert,
		);
		await Permission.insertMany(permissionDocs);

		// 5) Insertar roles base
		const roleDocs: InsertRole[] = ROLES.map(mapRoleDefToInsert);
		await Role.insertMany(roleDocs);

		const lang = req.headers.get("accept-language")?.startsWith("es")
			? "es"
			: "en";

		return NextResponse.json(
			{
				message:
					lang === "es"
						? "Seeder ejecutado correctamente."
						: "Seeder executed successfully.",
				permissions: permissionDocs.length,
				roles: roleDocs.length,
			},
			{ status: 200 },
		);
	} catch (err) {
		console.error("❌ SECURITY SEED ERROR:", err);

		const lang = req.headers.get("accept-language")?.startsWith("es")
			? "es"
			: "en";

		return NextResponse.json(
			{
				error:
					lang === "es"
						? "Error ejecutando el seeder de seguridad."
						: "Error running security seeder.",
			},
			{ status: 500 },
		);
	}
}
