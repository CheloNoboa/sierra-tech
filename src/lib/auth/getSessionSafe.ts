/**
 * =============================================================================
 * 📌 getSessionSafe — Wrapper seguro para obtener sesión en APIs
 * Ruta: src/lib/auth/getSessionSafe.ts
 * =============================================================================
 *
 * ES:
 *   Envolver getServerSession para evitar errores en endpoints.
 *   Retorna null si no existe sesión, NUNCA lanza errores.
 *
 * EN:
 *   Safe wrapper for getServerSession. Never throws, always returns session or null.
 *
 * Autor: Marcelo Noboa
 * Mantenimiento técnico: IA Asistida (ChatGPT)
 * =============================================================================
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getSessionSafe() {
	try {
		const session = await getServerSession(authOptions);
		return session;
	} catch {
		return null;
	}
}
