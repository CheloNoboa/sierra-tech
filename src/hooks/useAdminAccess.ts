"use client";

/**
 * =============================================================================
 * ✅ src/hooks/useAdminAccess.ts
 * =============================================================================
 * 🔐 Hook unificado de autorización para panel administrativo
 *
 * ES:
 * - Centraliza la validación de acceso a módulos administrativos.
 * - Permite acceso solo a:
 *   - admin
 *   - superadmin
 * - Devuelve estado de carga, permiso final, rol y mensaje traducido.
 *
 * EN:
 * - Centralized authorization hook for admin modules.
 * - Allows access only to:
 *   - admin
 *   - superadmin
 * - Returns loading state, final permission, role and translated message.
 * =============================================================================
 */

import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";

/* ---------------------------------------------------------------------------
 * Roles permitidos
 * --------------------------------------------------------------------------- */
const ALLOWED_ROLES = ["admin", "superadmin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

/**
 * Hook de acceso para módulos administrativos.
 */
export function useAdminAccess() {
	const { locale } = useTranslation();
	const { data: session, status } = useSession();

	const loading = status === "loading";
	const role = session?.user?.role;
	const allowed = !!role && ALLOWED_ROLES.includes(role as AllowedRole);

	const message = loading
		? locale === "es"
			? "Verificando sesión..."
			: "Checking session..."
		: !allowed
			? locale === "es"
				? "Acceso denegado. Solo administradores."
				: "Access denied. Admins only."
			: "";

	return {
		loading,
		allowed,
		role,
		message,
		locale,
	};
}
