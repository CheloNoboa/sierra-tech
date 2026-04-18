/**
 * ============================================================================
 * ✅ Page: Admin Privacy Policy
 * Path: src/app/admin/dashboard/privacy/page.tsx
 * ============================================================================
 *
 * ES:
 *   Pantalla administrativa para consultar y mantener la Política de Privacidad.
 *
 *   Responsabilidades:
 *   - Validar acceso administrativo desde la sesión activa.
 *   - Montar el layout estándar del módulo de políticas.
 *   - Reutilizar el editor centralizado de políticas.
 *
 *   Reglas:
 *   - Acceso permitido solo para roles: admin, superadmin.
 *   - El contenido editable se gestiona mediante AdminPolicyEditor.
 *   - La persistencia se delega al endpoint configurado en ROUTES.API.PRIVACY_ADMIN.
 *
 * EN:
 *   Administrative page used to review and maintain the Privacy Policy.
 *
 *   Responsibilities:
 *   - Validate admin access from the active session.
 *   - Mount the standard policy module layout.
 *   - Reuse the centralized policy editor component.
 *
 *   Rules:
 *   - Access allowed only for roles: admin, superadmin.
 *   - Editable content is handled by AdminPolicyEditor.
 *   - Persistence is delegated to ROUTES.API.PRIVACY_ADMIN.
 * ============================================================================
 */

"use client";

import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";
import AdminPolicyEditor from "@/components/AdminPolicyEditor";
import AdminPolicyLayout from "@/layout/AdminPolicyLayout";
import { ROUTES } from "@/constants/routes";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type AllowedRole = "admin" | "superadmin";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
	return role === "admin" || role === "superadmin";
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AdminPrivacyPage() {
	const { locale } = useTranslation();
	const lang: Locale = locale === "es" ? "es" : "en";
	const { data: session, status } = useSession();

	const role = session?.user?.role;
	const hasAccess = isAllowedRole(role);

	if (status === "loading") {
		return (
			<main className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
					{lang === "es" ? "Cargando sesión..." : "Loading session..."}
				</div>
			</main>
		);
	}

	if (!hasAccess) {
		return (
			<main className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
					{lang === "es"
						? "Acceso restringido a administradores."
						: "Admin access only."}
				</div>
			</main>
		);
	}

	return (
		<AdminPolicyLayout
			title={lang === "es" ? "Política de Privacidad" : "Privacy Policy"}
		>
			<AdminPolicyEditor
				apiRoute={ROUTES.API.PRIVACY_ADMIN}
				titleEs="Mantenimiento — Política de Privacidad"
				titleEn="Privacy Policy Maintenance"
			/>
		</AdminPolicyLayout>
	);
}
