/**
 * =============================================================================
 * 📌 File: src/types/next-auth.d.ts
 * =============================================================================
 *
 * ES:
 * Extensión tipada de NextAuth para la plataforma base.
 *
 * Define la estructura real de:
 * - session.user (frontend)
 * - jwt (token server)
 * - User (authorize/login)
 *
 * Regla:
 * - Debe mantenerse en sincronía con:
 *   src/app/api/auth/[...nextauth]/route.ts
 *
 * Importante:
 * - Ya no existe branchId
 * - Ya no existe isSubscriber
 * - Ya no existe tier
 * - Ya no existe lógica customer/pricing del proyecto anterior
 *
 * EN:
 * Typed NextAuth extension for the reusable platform base.
 * =============================================================================
 */

import "next-auth";
import "next-auth/jwt";
import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  /**
   * ===========================================================================
   * User
   * - Available during authorize() and initial JWT callback.
   * ===========================================================================
   */
  interface User extends DefaultUser {
    _id: string;
    role: string;
    permissions: string[];
    name: string | null;
    email: string | null;
    isRegistered: boolean;
    phone: string | null;
  }

  /**
   * ===========================================================================
   * Session
   * - Client-side session shape.
   * ===========================================================================
   */
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      _id: string;
      role: string;
      permissions: string[];
      name: string | null;
      email: string | null;
      isRegistered: boolean;
      phone: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  /**
   * ===========================================================================
   * JWT
   * - Server-side token shape.
   * ===========================================================================
   */
  interface JWT {
    _id?: string;
    role?: string;
    permissions?: string[];
    name?: string | null;
    email?: string | null;
    isRegistered?: boolean;
    exp?: number;
    phone?: string | null;
  }
}