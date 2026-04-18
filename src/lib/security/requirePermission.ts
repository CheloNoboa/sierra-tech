/**
 * ============================================================================
 * 📌 src/lib/security/requirePermission.ts
 * ----------------------------------------------------------------------------
 * ES:
 *   Guardia centralizada de permisos para APIs administrativas.
 *
 *   Uso típico en una API:
 *
 *     const guard = await requirePermission(req, "products.view");
 *     if (!guard.ok) return guard.response;
 *     const { session } = guard;
 *
 *   Características:
 *   ✔ Usa getServerSession(authOptions) → mismos datos que useSession()
 *   ✔ Trabaja SIEMPRE con session.user.permissions (no con role)
 *   ✔ Soporta:
 *       - string  → 1 permiso
 *       - string[] → cualquiera de la lista (OR)
 *   ✔ Respeta superadmin con "*" en permisos
 *   ✔ Mensajes bilingües según Accept-Language
 *
 * EN:
 *   Centralized permission guard for admin APIs.
 * ============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type Locale = "es" | "en";

function getLocale(req: Request): Locale {
	const lang = req.headers.get("accept-language") ?? "";
	return lang.toLowerCase().startsWith("es") ? "es" : "en";
}

const MSG = {
	es: {
		unauthorized: "No autorizado. Debe iniciar sesión.",
		forbidden: "Acceso denegado. No tiene permisos suficientes.",
	},
	en: {
		unauthorized: "Unauthorized. Please sign in.",
		forbidden: "Access denied. You do not have enough permissions.",
	},
};

export type PermissionCode = string;

export interface PermissionGuardOk {
	ok: true;
	// session viene de NextAuth; no tipamos en detalle para evitar ANY
	session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
}

export interface PermissionGuardFail {
	ok: false;
	response: ReturnType<typeof NextResponse.json>;
}

export type PermissionGuardResult = PermissionGuardOk | PermissionGuardFail;

/**
 * ES:
 *   Valida que el usuario tenga al menos UNO de los permisos requeridos.
 *
 *   - required puede ser "products.view" o ["products.view", "categories.view"]
 *   - Si el usuario tiene "*" en sus permisos → acceso total
 *
 * EN:
 *   Checks that the current user has at least ONE of the required permissions.
 */
export async function requirePermission(
	req: Request,
	required: PermissionCode | PermissionCode[],
): Promise<PermissionGuardResult> {
	const locale = getLocale(req);
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return {
			ok: false,
			response: NextResponse.json(
				{ message: MSG[locale].unauthorized },
				{ status: 401 },
			),
		};
	}

	const userPerms =
		(session.user as { permissions?: string[] }).permissions ?? [];

	// Superadmin → tiene "*"
	if (userPerms.includes("*")) {
		return { ok: true, session };
	}

	const requiredList = Array.isArray(required) ? required : [required];

	const hasSome = requiredList.some((p) => userPerms.includes(p));

	if (!hasSome) {
		return {
			ok: false,
			response: NextResponse.json(
				{ message: MSG[locale].forbidden },
				{ status: 403 },
			),
		};
	}

	return { ok: true, session };
}
