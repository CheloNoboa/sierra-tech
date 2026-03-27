/**
 * ============================================================================
 * 📌 GLOBAL MIDDLEWARE — src/middleware.ts
 * ============================================================================
 * ES — PROPÓSITO
 *   Middleware unificado de seguridad y ruteo para la plataforma FastFood.
 *   Aplica control de acceso basado en JWT (NextAuth) y estandariza la
 *   inyección de identidad mínima hacia endpoints internos (/api).
 *
 * ES — ALCANCE
 *   1) Protección de rutas de plataforma:
 *      - /admin/** requiere permiso "system.dashboard.view" (o "*" / superadmin).
 *      - /user/** requiere autenticación (token presente).
 *
 *   2) Separación de audiencias (cliente vs plataforma):
 *      - /menu/** es una experiencia de cliente (pública).
 *      - Si el usuario autenticado corresponde a “plataforma”, NO debe
 *        permanecer en /menu/** → se redirige a /admin/dashboard.
 *
 *   3) API identity headers:
 *      - Para /api/** (excepto /api/auth/** por matcher), inyecta headers mínimos:
 *          x-user-id (CRÍTICO), x-user-role, x-user-branch-id, x-user-permissions (opcional).
 *
 * ES — CONTRATOS (INVARIANTES)
 *   - La autoridad de identidad proviene del JWT (NextAuth).
 *   - userId efectivo se resuelve priorizando: token._id -> token.sub -> token.userId -> token.id.
 *   - "plataforma" se determina por:
 *       (a) rol ∈ {admin, superadmin, staff}
 *       (b) permisos incluyen "system.dashboard.view" o "*"
 *     (Cualquiera de los anteriores es suficiente.)
 *
 * ES — NO OBJETIVOS
 *   - No implementa lógica de negocio (promos, pedidos, catálogos).
 *   - No reemplaza validación de permisos dentro de cada endpoint; solo provee
 *     identidad y control de acceso a nivel de rutas.
 *
 * EN — SUMMARY
 *   Unified middleware for route-level security and identity propagation.
 *   Protects /admin and /user routes, enforces audience separation for /menu,
 *   and injects identity headers for /api requests.
 *
 * ----------------------------------------------------------------------------
 * AUTORES:
 *   Diseño: Marcelo Noboa
 *   Mantención técnica: IA Asistida (ChatGPT)
 *   Última actualización: 2026-02-01
 * ============================================================================
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/* ============================================================================
 * CONFIG — Rutas bajo protección del middleware
 * ----------------------------------------------------------------------------
 * Excluye:
 *   - _next (archivos internos)
 *   - api/auth (rutas internas de NextAuth)
 *   - assets comunes (favicon, imágenes, íconos)
 * ============================================================================
 */
export const config = {
  matcher: ["/((?!_next|api/auth|favicon.ico|images|icons).*)"],
};

/* ============================================================================
 * 🔐 Token shape (JWT NextAuth extendido en app)
 * ----------------------------------------------------------------------------
 * NOTA:
 * - NextAuth usa `sub` como id estándar.
 * - La app setea también `token._id` (ObjectId string).
 * ============================================================================
 */
interface TokenPayload {
  sub?: string;
  _id?: string;
  id?: string;
  userId?: string;

  role?: string; // staff role o "customer"
  branchId?: string | null;
  permissions?: string[];
}

/* ============================================================================
 * Utils (sin any)
 * ============================================================================
 */
function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function normalizeHeaderValue(v: string): string {
  // headers deben ser strings simples sin saltos de línea
  return v.replace(/\r?\n/g, " ").trim();
}

/**
 * ✅ Resuelve userId de forma robusta:
 * - Preferimos `_id` (ObjectId real del sistema)
 * - Luego `sub` (estándar NextAuth)
 * - Fallbacks históricos: userId / id
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

/**
 * ✅ Permisos de dashboard (plataforma)
 */
function canViewAdminDashboard(role: string, permissions: string[]): boolean {
  if (role === "superadmin") return true;
  if (permissions.includes("*")) return true;
  return permissions.includes("system.dashboard.view");
}

/**
 * ✅ Determina si un usuario autenticado debe salir de /menu/** hacia /admin.
 * Regla: SOLO si realmente puede ver dashboard (misma regla de /admin).
 */
function isPlatformAudience(role: string, permissions: string[]): boolean {
  return canViewAdminDashboard(role, permissions);
}

/* ============================================================================
 * 🧩 MIDDLEWARE PRINCIPAL
 * ============================================================================
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as TokenPayload | null;

  const role = typeof token?.role === "string" && token.role ? token.role : "user";
  const permissions = Array.isArray(token?.permissions) ? token.permissions.filter((p) => typeof p === "string") : [];
  const branchId =
    typeof token?.branchId === "string"
      ? token.branchId
      : token?.branchId
        ? String(token.branchId)
        : "";

  const userId = resolveUserIdFromToken(token);

  const isAdminRoute = pathname.startsWith("/admin");
  const isUserRoute = pathname.startsWith("/user");
  const isApiRoute = pathname.startsWith("/api/");
  const isMenuRoute = pathname === "/menu" || pathname.startsWith("/menu/");

  /* ============================================================================
   * 1) API — Inyectar headers mínimos (IDENTIDAD)
   * ----------------------------------------------------------------------------
   * IMPORTANT:
   * - Aplica para /api/** excepto /api/auth/** por matcher.
   * - Solo inyecta si hay token (autenticado).
   * ============================================================================
   */
  if (isApiRoute) {
    // ✅ IMPORTANTE: para pasar identidad a Route Handlers hay que mutar
    // los headers del REQUEST (no del response).
    const requestHeaders = new Headers(req.headers);

    if (token) {
      requestHeaders.set("x-user-role", normalizeHeaderValue(role));
      requestHeaders.set("x-user-branch-id", normalizeHeaderValue(branchId || ""));

      if (userId) requestHeaders.set("x-user-id", normalizeHeaderValue(userId));

      if (permissions.length) {
        requestHeaders.set("x-user-permissions", normalizeHeaderValue(permissions.join(",")));
      }
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  /* ============================================================================
   * 2) Separación de audiencias — /menu/** (cliente) vs plataforma
   * ----------------------------------------------------------------------------
   * Regla:
   * - Usuario autenticado “plataforma” NO permanece en /menu/**.
   * - Redirige server-side a /admin/dashboard (sin flash de UI cliente).
   * ============================================================================
   */
  if (isMenuRoute && token) {
    if (isPlatformAudience(role, permissions)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  /* ============================================================================
   * 3) Rutas protegidas (/admin, /user)
   * ============================================================================
   */

  // No autenticado → home (para rutas protegidas)
  if ((isAdminRoute || isUserRoute) && !token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Auto-redirect desde "/" → /admin/dashboard si tiene acceso
  if (pathname === "/" && token) {
    if (canViewAdminDashboard(role, permissions)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  // Validación /admin (requiere permiso dashboard)
  if (isAdminRoute) {
    if (!canViewAdminDashboard(role, permissions)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  /* ============================================================================
   * 4) Resto — Continuar normal
   * ============================================================================
   */
  return NextResponse.next();
}
