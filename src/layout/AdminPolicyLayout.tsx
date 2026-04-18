/**
 * ===============================================================
 * ✅ src/layout/AdminPolicyLayout.tsx
 * ===============================================================
 * Layout visual + validación de acceso para módulos de Políticas
 * ----------------------------------------------------------------
 * ES:
 * - Layout reutilizable para módulos administrativos de políticas.
 * - Valida acceso para:
 *    - admin
 *    - superadmin
 * - Mantiene breadcrumb + contenedor principal.
 * - Alineado con el sistema visual centralizado de Sierra Tech.
 * - Reemplaza la base oscura heredada por una UI administrativa clara.
 *
 * EN:
 * - Reusable layout for admin policy modules.
 * - Validates access for:
 *    - admin
 *    - superadmin
 * - Preserves breadcrumb + main content container.
 * - Aligned with Sierra Tech centralized design system.
 * - Replaces the inherited dark base with a light admin UI.
 * ===============================================================
 */

"use client";

import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";
import { Home, ChevronRight } from "lucide-react";
import Link from "next/link";

interface AdminPolicyLayoutProps {
	title: string;
	children: ReactNode;
}

export default function AdminPolicyLayout({
	title,
	children,
}: AdminPolicyLayoutProps) {
	const { data: session, status } = useSession();
	const { locale } = useTranslation();

	const role = session?.user?.role;

	/**
	 * ⏳ Mientras NextAuth obtiene la sesión
	 */
	if (status === "loading") {
		return (
			<div className="flex min-h-screen items-center justify-center text-text-secondary">
				{locale === "es" ? "Cargando sesión..." : "Loading session..."}
			</div>
		);
	}

	/**
	 * 🚫 Usuario sin acceso:
	 * - Sin sesión
	 * - Rol inválido
	 * - Usuario no administrador
	 */
	if (!role || (role !== "admin" && role !== "superadmin")) {
		return (
			<div className="flex min-h-screen items-center justify-center text-text-secondary">
				{locale === "es"
					? "Acceso denegado. Solo administradores."
					: "Access denied. Admins only."}
			</div>
		);
	}

	/**
	 * 🟩 Render normal
	 */
	return (
		<div className="min-h-screen bg-background p-6 text-text-primary">
			{/* 🧭 Breadcrumb */}
			<div className="mb-6 flex items-center gap-2 text-sm text-text-secondary">
				<Link
					href="/admin/dashboard"
					className="flex items-center gap-1 transition hover:text-brand-primaryStrong"
				>
					<Home size={14} />
					<span>Dashboard</span>
				</Link>

				<ChevronRight size={14} className="text-text-muted" />

				<span className="font-semibold text-brand-primaryStrong">{title}</span>
			</div>

			{/* 🧾 Contenido principal */}
			<div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
				{children}
			</div>
		</div>
	);
}
