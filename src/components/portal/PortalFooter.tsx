"use client";

/**
 * =============================================================================
 * 📄 Component: PortalFooter
 * Path: src/components/portal/PortalFooter.tsx
 * =============================================================================
 *
 * ES:
 * Footer discreto del portal cliente con branding de CoreVix.
 *
 * Objetivo:
 * - mostrar crédito profesional sin invadir UI del cliente
 * - integrar logo + texto de forma elegante
 * - mantener estética corporativa
 *
 * Reglas:
 * - tamaño contenido (no protagonista)
 * - sin colores agresivos
 * - alineación limpia
 *
 * EN:
 * Lightweight footer with CoreVix branding.
 * =============================================================================
 */

import Image from "next/image";

export default function PortalFooter() {
	return (
		<footer className="mt-6 rounded-2xl border border-border/80 bg-white/80 px-4 py-5 shadow-sm backdrop-blur">
			<div className="flex flex-col items-center justify-center gap-2 text-center">
				<span className="text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
					Plataforma impulsada por
				</span>

				<Image
					src="/images/StructaByCorevix.png"
					alt="Structa by CoreVix"
					width={420}
					height={90}
					priority
					className="h-12 w-auto max-w-[320px] object-contain opacity-95"
				/>

				<span className="text-xs text-text-secondary">
					© {new Date().getFullYear()} Sierra Tech. Todos los derechos reservados.
				</span>
			</div>
		</footer>
	);
}

