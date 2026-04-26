"use client";

/**
 * =============================================================================
 * 📌 Component: GlobalFilterCard
 * Path: src/components/ui/GlobalFilterCard.tsx
 * =============================================================================
 *
 * ES:
 * Contenedor visual reutilizable para secciones de filtros en páginas admin tipo
 * contenido/operación: Blog, Servicios, Proyectos y Mantenimientos.
 *
 * Importante:
 * - No reemplaza GlobalDataGridShell.
 * - No debe aplicarse a Organizaciones, Usuarios, Roles ni Configuraciones.
 * =============================================================================
 */

import type { ReactNode } from "react";

interface GlobalFilterCardProps {
	icon: ReactNode;
	eyebrow: string;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
}

export default function GlobalFilterCard({
	icon,
	eyebrow,
	title,
	children,
	footer,
}: GlobalFilterCardProps) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="mb-5 flex items-center gap-3">
				<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
					{icon}
				</div>

				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
						{eyebrow}
					</p>

					<h2 className="text-xl font-bold tracking-tight text-text-primary">
						{title}
					</h2>
				</div>
			</div>

			{children}

			{footer ? <div className="mt-5">{footer}</div> : null}
		</section>
	);
}