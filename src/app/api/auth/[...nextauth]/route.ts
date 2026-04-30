/**
 * =============================================================================
 * 📌 NextAuth Route — Sierra Tech Auth Handler
 * Path: src/app/api/auth/[...nextauth]/route.ts
 * =============================================================================
 *
 * ES:
 * Handler HTTP oficial de NextAuth para App Router.
 *
 * Reglas:
 * - NO exportar authOptions desde este archivo.
 * - Solo exportar handlers HTTP permitidos por Next.js: GET y POST.
 * =============================================================================
 */

import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth/authOptions";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
