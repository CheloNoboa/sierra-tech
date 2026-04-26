"use client";

/**
 * =============================================================================
 * 📌 AdminPageHeader
 * Path: src/components/ui/AdminPageHeader.tsx
 * =============================================================================
 *
 * ES:
 * Encabezado reutilizable estándar para páginas administrativas simples.
 *
 * Responsabilidades:
 * - unificar la cabecera visual del panel admin
 * - mostrar ícono contextual, eyebrow, título, subtítulo y acciones opcionales
 * - mantener separación correcta respecto al sidebar/flecha del layout
 *
 * Reglas:
 * - usar en páginas admin que no usan GlobalDataGridShell
 * - no duplicar cabeceras manuales por módulo
 * =============================================================================
 */

import type { ReactNode } from "react";

interface AdminPageHeaderProps {
	icon: ReactNode;
	eyebrow?: string;
	title: string;
	subtitle?: string;
	actions?: ReactNode;
}

export function AdminPageHeader({
	icon,
	eyebrow,
	title,
	subtitle,
	actions,
}: AdminPageHeaderProps) {
	return (
		<section className="rounded-[30px] border border-border bg-white p-6 shadow-sm">
			<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
				<div className="flex items-center gap-5">
					<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand-primary/20 bg-brand-primary/10 text-brand-primaryStrong">
						{icon}
					</div>

					<div className="min-w-0 space-y-2">
						{eyebrow ? (
							<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
								{eyebrow}
							</p>
						) : null}

						<h1 className="text-3xl font-bold tracking-tight text-text-primary">
							{title}
						</h1>

						{subtitle ? (
							<p className="max-w-5xl text-base leading-7 text-text-secondary">
								{subtitle}
							</p>
						) : null}
					</div>
				</div>

				{actions ? (
					<div className="flex shrink-0 flex-wrap items-center gap-3">
						{actions}
					</div>
				) : null}
			</div>
		</section>
	);
}