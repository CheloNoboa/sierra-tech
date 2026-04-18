"use client";

/**
 * =============================================================================
 * 📌 AdminPageHeader
 * Path: src/components/ui/AdminPageHeader.tsx
 * =============================================================================
 *
 * ES:
 * - Encabezado reutilizable para páginas administrativas que no utilizan
 *   `GlobalDataGridShell`.
 * - Mantiene consistencia visual entre módulos del panel Sierra Tech.
 * - Permite mostrar:
 *   - ícono contextual
 *   - título principal
 *   - subtítulo opcional
 *
 * Responsabilidades:
 * - Unificar la cabecera visual de páginas administrativas simples.
 * - Mantener jerarquía clara entre iconografía, título y texto secundario.
 * - Integrarse con el sistema visual claro y corporativo del panel.
 *
 * Reglas:
 * - Debe usarse en páginas administrativas sin shell de grid.
 * - Si una página ya usa `GlobalDataGridShell`, no debe duplicar este header.
 *
 * EN:
 * - Reusable header for admin pages that do not use `GlobalDataGridShell`.
 * - Keeps visual consistency across Sierra Tech admin modules.
 * =============================================================================
 */

import type { ReactNode } from "react";

interface AdminPageHeaderProps {
	icon: ReactNode;
	title: string;
	subtitle?: string;
}

export function AdminPageHeader({
	icon,
	title,
	subtitle,
}: AdminPageHeaderProps) {
	return (
		<div className="mb-6 rounded-2xl border border-border bg-surface p-5 shadow-sm">
			<div className="flex items-start gap-4">
				{/* Icon */}
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-soft text-brand-primaryStrong">
					{icon}
				</div>

				{/* Texts */}
				<div className="min-w-0">
					<h1 className="text-xl font-semibold text-text-primary md:text-2xl">
						{title}
					</h1>

					{subtitle ? (
						<p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-secondary">
							{subtitle}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
