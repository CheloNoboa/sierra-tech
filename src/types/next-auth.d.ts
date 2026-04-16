/**
 * =============================================================================
 * 📌 File: src/types/next-auth.d.ts
 * =============================================================================
 *
 * ES:
 * Extensión tipada oficial de NextAuth para Sierra Tech.
 *
 * Propósito:
 * - unificar el contrato de sesión para usuarios internos y portal cliente
 * - reflejar exactamente el shape que construye:
 *   src/app/api/auth/[...nextauth]/route.ts
 * - permitir que frontend, middleware y server trabajen con tipos consistentes
 *
 * Alcance:
 * - extiende User durante authorize/signIn
 * - extiende Session para uso en cliente y server components
 * - extiende JWT para middleware y callbacks
 *
 * Decisiones:
 * - userType separa audiencias:
 *   - "internal" → usuario interno del sistema
 *   - "client"   → usuario de organización / portal cliente
 * - status permite bloquear acceso sin depender solo del rol
 * - organizationId / organizationName / organizationUserRole
 *   solo aplican al portal cliente
 * - permissions permanece disponible para usuarios internos
 *
 * Regla:
 * - este archivo debe mantenerse siempre sincronizado con:
 *   src/app/api/auth/[...nextauth]/route.ts
 *
 * EN:
 * Official typed NextAuth extension for Sierra Tech.
 * =============================================================================
 */

import "next-auth";
import "next-auth/jwt";
import type { DefaultSession, DefaultUser } from "next-auth";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos base compartidos                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Distingue el origen y audiencia del usuario autenticado.
 */
export type AppUserType = "internal" | "client";

/**
 * Estado operativo del usuario autenticado.
 */
export type AppUserStatus = "active" | "inactive";

/* -------------------------------------------------------------------------- */
/* 🔐 next-auth                                                               */
/* -------------------------------------------------------------------------- */

declare module "next-auth" {
  /**
   * ===========================================================================
   * User
   * ---------------------------------------------------------------------------
   * Disponible durante authorize() y primeros callbacks de login.
   * Debe reflejar exactamente lo que retorna authorize() en credentials
   * y lo que se hidrata para Google OAuth.
   * ===========================================================================
   */
  interface User extends DefaultUser {
    /**
     * Id real persistido del usuario autenticado.
     */
    _id: string;

    /**
     * Rol principal del usuario.
     * - internal: rol dinámico desde Roles
     * - client:   "organization_user" a nivel de gateway
     */
    role: string;

    /**
     * Permisos resueltos para usuarios internos.
     * En portal cliente normalmente será [].
     */
    permissions: string[];

    /**
     * Tipo de audiencia autenticada.
     */
    userType: AppUserType;

    /**
     * Estado del usuario autenticado.
     */
    status: AppUserStatus;

    /**
     * Identidad básica.
     */
    name: string | null;
    email: string | null;

    /**
     * Datos del portal cliente.
     * Solo aplican cuando userType = "client".
     */
    organizationId?: string | null;
    organizationName?: string | null;
    organizationUserRole?: string | null;

    /**
     * Campos heredados del sistema base que se mantienen por compatibilidad.
     */
    isRegistered?: boolean;
    phone?: string | null;
  }

  /**
   * ===========================================================================
   * Session
   * ---------------------------------------------------------------------------
   * Shape consumido por frontend y server-side session reads.
   * ===========================================================================
   */
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      _id: string;
      role: string;
      permissions: string[];

      userType: AppUserType;
      status: AppUserStatus;

      name: string | null;
      email: string | null;

      organizationId?: string | null;
      organizationName?: string | null;
      organizationUserRole?: string | null;

      isRegistered?: boolean;
      phone?: string | null;
    };
  }
}

/* -------------------------------------------------------------------------- */
/* 🪙 next-auth/jwt                                                           */
/* -------------------------------------------------------------------------- */

declare module "next-auth/jwt" {
  /**
   * ===========================================================================
   * JWT
   * ---------------------------------------------------------------------------
   * Shape interno del token usado por callbacks y middleware.
   * Debe incluir toda la identidad mínima necesaria para:
   * - separar admin vs portal cliente
   * - proteger rutas
   * - inyectar headers mínimos a /api/**
   * ===========================================================================
   */
  interface JWT {
    _id?: string;
    role?: string;
    permissions?: string[];

    userType?: AppUserType;
    status?: AppUserStatus;

    name?: string | null;
    email?: string | null;

    organizationId?: string | null;
    organizationName?: string | null;
    organizationUserRole?: string | null;

    isRegistered?: boolean;
    phone?: string | null;

    /**
     * Epoch seconds calculado manualmente desde loadTimeout().
     */
    exp?: number;
  }
}