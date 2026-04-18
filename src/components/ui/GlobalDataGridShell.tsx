"use client";

/**
 * =============================================================================
 * 🌐 GlobalDataGridShell — Standard shell for data grids
 * Path: src/components/ui/GlobalDataGridShell.tsx
 * =============================================================================
 *
 * ES:
 * - Estructura visual unificada para módulos administrativos tipo tabla.
 * - Define:
 *   - encabezado con ícono, título y subtítulo
 *   - barra de acciones
 *   - bloque de filtros
 *   - contenedor principal para tabla
 *   - footer para paginación o controles inferiores
 * - Incluye `loading` con skeleton overlay.
 * - Alineado con el sistema visual centralizado de Sierra Tech.
 *
 * Responsabilidades:
 * - Unificar la estructura base de módulos administrativos orientados a datos.
 * - Mantener separación consistente entre header, filtros, contenido y footer.
 * - Permitir composición flexible desde cada módulo consumidor.
 *
 * Reglas:
 * - No implementa lógica de negocio ni fetch de datos.
 * - `children` representa el contenido principal del grid.
 * - `loading` solo afecta la capa visual del contenido.
 *
 * EN:
 * - Unified visual shell for admin grid-like modules.
 * - Defines header, actions, filters, main table area and footer.
 * - Includes `loading` skeleton overlay.
 * - Aligned with the Sierra Tech centralized design system.
 * =============================================================================
 */

import type { ReactNode } from "react";
import clsx from "clsx";

interface GlobalDataGridShellProps {
	title: string;
	subtitle?: string;
	icon?: ReactNode;
	actions?: ReactNode;
	filters?: ReactNode;
	footer?: ReactNode;
	children: ReactNode;
	className?: string;
	loading?: boolean;
}

export default function GlobalDataGridShell({
	title,
	subtitle,
	icon,
	actions,
	filters,
	footer,
	children,
	className,
	loading = false,
}: GlobalDataGridShellProps) {
	return (
		<section className={clsx("w-full space-y-5", className)}>
			{/* Header */}
			<header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
				<div className="flex items-start gap-3">
					{icon ? (
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-soft shadow-sm">
							{icon}
						</div>
					) : null}

					<div className="min-w-0">
						<h1 className="text-xl font-semibold text-text-primary md:text-2xl">
							{title}
						</h1>

						{subtitle ? (
							<p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-secondary md:text-sm">
								{subtitle}
							</p>
						) : null}
					</div>
				</div>

				{actions ? (
					<div className="flex flex-wrap justify-start gap-2 md:justify-end">
						{actions}
					</div>
				) : null}
			</header>

			{/* Filters */}
			{filters ? (
				<div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
					{filters}
				</div>
			) : null}

			{/* Main table/content area */}
			<div className="relative min-h-[300px] overflow-x-auto rounded-2xl border border-border bg-surface p-4 shadow-sm">
				<div className={clsx(loading && "pointer-events-none opacity-30")}>
					{children}
				</div>

				{loading ? (
					<div className="absolute inset-0 flex flex-col gap-3 rounded-2xl bg-surface/80 p-4 backdrop-blur-sm">
						<div className="h-5 w-3/4 animate-pulse rounded-md bg-surface-soft" />
						<div className="h-5 w-1/2 animate-pulse rounded-md bg-surface-soft" />
						<div className="h-5 w-full animate-pulse rounded-md bg-surface-soft" />
						<div className="h-5 w-5/6 animate-pulse rounded-md bg-surface-soft" />
						<div className="h-5 w-2/3 animate-pulse rounded-md bg-surface-soft" />
					</div>
				) : null}
			</div>

			{/* Footer */}
			{footer ? <div className="pt-1">{footer}</div> : null}
		</section>
	);
}
