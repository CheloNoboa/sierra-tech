"use client";

/**
 * =============================================================================
 * 📄 Component: PortalLogoutButton
 * Path: src/components/portal/PortalLogoutButton.tsx
 * =============================================================================
 *
 * ES:
 * Botón de cierre de sesión para el portal cliente.
 *
 * Objetivo:
 * - cerrar la sesión activa
 * - regresar al sitio público de Sierra Tech
 * - evitar mostrar la pantalla intermedia de logout de NextAuth
 *
 * EN:
 * Logout button for the client portal.
 * =============================================================================
 */

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function PortalLogoutButton() {
	return (
		<button
			type="button"
			onClick={() => void signOut({ callbackUrl: "/" })}
			className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-status-error/30 hover:bg-status-error/5"
		>
			<LogOut className="h-4 w-4" />
			Cerrar sesión
		</button>
	);
}
