/**
 * =============================================================================
 * ✅ src/layouts/PolicyLayout.tsx
 * =============================================================================
 * Layout visual para páginas públicas de políticas
 * (Privacy, Terms, Cookies)
 * -----------------------------------------------------------------------------
 * ES:
 * - Layout público reutilizable para páginas legales.
 * - Muestra:
 *   - título principal
 *   - fecha de actualización
 *   - contenido dinámico
 *   - botón para volver
 * - Alineado con la identidad visual clara y corporativa de Sierra Tech.
 * - Reemplaza el diseño oscuro heredado del proyecto anterior.
 * - Compensa la altura del header público fijo para evitar solapamiento.
 *
 * EN:
 * - Reusable public layout for legal pages.
 * - Displays:
 *   - main title
 *   - updated date
 *   - dynamic content
 *   - back/close button
 * - Aligned with Sierra Tech light and corporate visual identity.
 * - Replaces the inherited dark layout from the previous project.
 * - Offsets the fixed public header to avoid overlap.
 * =============================================================================
 */

"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

interface PolicyLayoutProps {
	title: string;
	updatedLabelDate?: string;
	children: ReactNode;
}

export default function PolicyLayout({
	title,
	updatedLabelDate,
	children,
}: PolicyLayoutProps) {
	const { locale } = useTranslation();
	const router = useRouter();

	return (
		<div className="flex min-h-screen flex-col items-center bg-background px-6 pb-16 pt-28 text-text-primary md:pt-32">
			<div className="w-full max-w-3xl rounded-3xl border border-border bg-surface p-8 shadow-sm animate-fadeIn">
				{/* Título principal */}
				<h1 className="mb-3 text-center text-3xl font-extrabold text-text-primary md:text-4xl">
					{title}
				</h1>

				{/* Última actualización */}
				{updatedLabelDate && (
					<p className="mb-8 text-center text-sm text-text-secondary">
						{locale === "es"
							? `Última actualización: ${updatedLabelDate}`
							: `Last updated: ${updatedLabelDate}`}
					</p>
				)}

				{/* Contenido dinámico */}
				<div className="space-y-8 leading-relaxed text-text-secondary">
					{children}
				</div>

				{/* Botón cerrar / volver */}
				<div className="mt-10 flex justify-center">
					<button
						type="button"
						onClick={() => router.back()}
						className="rounded-xl bg-brand-primary px-6 py-2.5 font-semibold text-text-primary transition-all duration-200 hover:bg-brand-primaryStrong hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-secondary"
					>
						{locale === "es" ? "Cerrar" : "Close"}
					</button>
				</div>
			</div>
		</div>
	);
}
