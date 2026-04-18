/**
 * =============================================================================
 * 📌 GLOBAL MIDDLEWARE — src/middleware.ts
 * =============================================================================
 *
 * ES:
 * Middleware oficial de seguridad y ruteo para Sierra Tech.
 *
 * Propósito:
 * - proteger rutas administrativas
 * - proteger portal cliente
 * - separar audiencias internas vs clientes
 * - inyectar identidad mínima hacia endpoints internos /api/**
 *
 * Alcance:
 * 1) Protección de rutas:
 *    - /admin/**  → solo usuarios internos activos
 *    - /portal/** → solo usuarios cliente activos con organización válida
 *
 * 2) Redirecciones de audiencia:
 *    - usuario autenticado que entra a /login se redirige según su tipo
 *    - usuario interno en rutas de portal cliente se saca hacia admin
 *    - usuario cliente en rutas administrativas se saca hacia portal
 *
 * 3) Propagación de identidad hacia APIs internas:
 *    - para /api/** (excepto /api/auth/** por matcher), inyecta:
 *      - x-user-id
 *      - x-user-role
 *      - x-user-permissions
 *      - x-user-type
 *      - x-user-status
 *      - x-organization-id
 *      - x-organization-name
 *      - x-organization-user-role
 *
 * Contratos:
 * - la autoridad de identidad proviene del JWT de NextAuth
 * - el tipo de usuario NO se deduce por role; se lee desde userType
 * - el portal cliente exige organizationId válido
 * - el middleware controla acceso por audiencia, no lógica de negocio
 *
 * No objetivos:
 * - no implementa permisos finos por pantalla o módulo
 * - no reemplaza validaciones internas dentro de cada API/route handler
 *
 * EN:
 * Official security and routing middleware for Sierra Tech.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/* -------------------------------------------------------------------------- */
/* ⚙️ Config                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Protege todo excepto:
 * - internals de Next.js
 * - endpoints auth de NextAuth
 * - assets comunes
 *
 * Nota:
 * Si más adelante agregas otras carpetas públicas de assets, se incorporan aquí.
 */
export const config = {
	matcher: ["/((?!_next|api/auth|favicon.ico|images|icons).*)"],
};

/* -------------------------------------------------------------------------- */
/* 🧱 Token shape                                                             */
/* -------------------------------------------------------------------------- */

interface TokenPayload {
	sub?: string;
	_id?: string;
	id?: string;
	userId?: string;

	role?: string;
	permissions?: string[];

	userType?: "internal" | "client";
	status?: "active" | "inactive";

	organizationId?: string | null;
	organizationName?: string | null;
	organizationUserRole?: string | null;
}

/* -------------------------------------------------------------------------- */
/* 🧰 Helpers                                                                 */
/* -------------------------------------------------------------------------- */

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length ? trimmed : null;
}

function normalizeHeaderValue(value: string): string {
	return value.replace(/\r?\n/g, " ").trim();
}

/**
 * Resuelve el user id efectivo del token con prioridad estable.
 * Preferimos _id y luego los fallbacks históricos.
 */
function resolveUserIdFromToken(token: TokenPayload | null): string {
	return (
		asNonEmptyString(token?._id) ??
		asNonEmptyString(token?.sub) ??
		asNonEmptyString(token?.userId) ??
		asNonEmptyString(token?.id) ??
		""
	);
}

function getUserType(token: TokenPayload | null): "internal" | "client" | "" {
	return token?.userType === "internal" || token?.userType === "client"
		? token.userType
		: "";
}

function getUserStatus(token: TokenPayload | null): "active" | "inactive" | "" {
	return token?.status === "active" || token?.status === "inactive"
		? token.status
		: "";
}

/**
 * Usuario interno válido para plataforma administrativa.
 */
function isInternalUser(token: TokenPayload | null): boolean {
	return getUserType(token) === "internal" && getUserStatus(token) === "active";
}

/**
 * Usuario cliente válido para portal.
 * Requiere userType client + status active + organizationId presente.
 */
function isClientUser(token: TokenPayload | null): boolean {
	return (
		getUserType(token) === "client" &&
		getUserStatus(token) === "active" &&
		!!asNonEmptyString(token?.organizationId)
	);
}

/**
 * Redirección segura por audiencia autenticada.
 */
function resolveAuthenticatedHome(token: TokenPayload | null): string {
	if (isInternalUser(token)) return "/admin/dashboard";
	if (isClientUser(token)) return "/portal";
	return "/login";
}

/* -------------------------------------------------------------------------- */
/* 🧩 Middleware principal                                                    */
/* -------------------------------------------------------------------------- */

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;

	const token = (await getToken({
		req,
		secret: process.env.NEXTAUTH_SECRET,
	})) as TokenPayload | null;

	const userId = resolveUserIdFromToken(token);
	const role = asNonEmptyString(token?.role) ?? "";
	const permissions = Array.isArray(token?.permissions)
		? token.permissions.filter(
				(value): value is string => typeof value === "string",
			)
		: [];
	const userType = getUserType(token);
	const status = getUserStatus(token);
	const organizationId = asNonEmptyString(token?.organizationId) ?? "";
	const organizationName = asNonEmptyString(token?.organizationName) ?? "";
	const organizationUserRole =
		asNonEmptyString(token?.organizationUserRole) ?? "";

	const isApiRoute = pathname.startsWith("/api/");
	const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
	const isPortalRoute =
		pathname === "/portal" || pathname.startsWith("/portal/");
	const isLoginRoute = pathname === "/login";

	/* ------------------------------------------------------------------------ */
	/* 1) API identity headers                                                  */
	/* ------------------------------------------------------------------------ */
	/**
	 * Para route handlers internos propagamos identidad mínima desde el JWT.
	 * Esto permite que los endpoints lean contexto autenticado sin reimplementar
	 * parsing manual del token en cada handler.
	 */
	if (isApiRoute) {
		const requestHeaders = new Headers(req.headers);

		if (token) {
			if (userId) {
				requestHeaders.set("x-user-id", normalizeHeaderValue(userId));
			}

			if (role) {
				requestHeaders.set("x-user-role", normalizeHeaderValue(role));
			}

			if (permissions.length > 0) {
				requestHeaders.set(
					"x-user-permissions",
					normalizeHeaderValue(permissions.join(",")),
				);
			}

			if (userType) {
				requestHeaders.set("x-user-type", normalizeHeaderValue(userType));
			}

			if (status) {
				requestHeaders.set("x-user-status", normalizeHeaderValue(status));
			}

			if (organizationId) {
				requestHeaders.set(
					"x-organization-id",
					normalizeHeaderValue(organizationId),
				);
			}

			if (organizationName) {
				requestHeaders.set(
					"x-organization-name",
					normalizeHeaderValue(organizationName),
				);
			}

			if (organizationUserRole) {
				requestHeaders.set(
					"x-organization-user-role",
					normalizeHeaderValue(organizationUserRole),
				);
			}
		}

		return NextResponse.next({
			request: { headers: requestHeaders },
		});
	}

	/* ------------------------------------------------------------------------ */
	/* 2) Login route                                                           */
	/* ------------------------------------------------------------------------ */
	/**
	 * Si el usuario ya tiene sesión válida, no debe permanecer en /login.
	 * Se redirige al hogar correspondiente según su audiencia.
	 */
	if (isLoginRoute && token) {
		const destination = resolveAuthenticatedHome(token);
		if (destination !== "/login") {
			return NextResponse.redirect(new URL(destination, req.url));
		}
	}

	/* ------------------------------------------------------------------------ */
	/* 3) Home pública                                                          */
	/* ------------------------------------------------------------------------ */
	/**
	 * Si la raíz pública recibe a un usuario autenticado, lo enviamos a su zona.
	 * Esto evita mezclar home comercial con home privada.
	 */
	if (pathname === "/" && token) {
		const destination = resolveAuthenticatedHome(token);
		if (destination !== "/login") {
			return NextResponse.redirect(new URL(destination, req.url));
		}
	}

	/* ------------------------------------------------------------------------ */
	/* 4) Protección de /admin/**                                               */
	/* ------------------------------------------------------------------------ */
	if (isAdminRoute) {
		/**
		 * Sin sesión → login.
		 */
		if (!token) {
			return NextResponse.redirect(new URL("/login", req.url));
		}

		/**
		 * Usuario cliente autenticado intentando entrar a admin.
		 * Se redirige al portal cliente.
		 */
		if (isClientUser(token)) {
			return NextResponse.redirect(new URL("/portal", req.url));
		}

		/**
		 * Cualquier identidad no válida para admin sale a login.
		 */
		if (!isInternalUser(token)) {
			return NextResponse.redirect(new URL("/login", req.url));
		}
	}

	/* ------------------------------------------------------------------------ */
	/* 5) Protección de /portal/**                                              */
	/* ------------------------------------------------------------------------ */
	if (isPortalRoute) {
		/**
		 * Sin sesión → login.
		 */
		if (!token) {
			return NextResponse.redirect(new URL("/login", req.url));
		}

		/**
		 * Usuario interno autenticado intentando entrar al portal cliente.
		 * Se redirige al dashboard administrativo.
		 */
		if (isInternalUser(token)) {
			return NextResponse.redirect(new URL("/admin/dashboard", req.url));
		}

		/**
		 * Cualquier identidad no válida para portal sale a login.
		 */
		if (!isClientUser(token)) {
			return NextResponse.redirect(new URL("/login", req.url));
		}
	}

	/* ------------------------------------------------------------------------ */
	/* 6) Resto                                                                 */
	/* ------------------------------------------------------------------------ */

	return NextResponse.next();
}
