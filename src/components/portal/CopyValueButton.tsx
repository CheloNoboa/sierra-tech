"use client";

/**
 * =============================================================================
 * 📄 Component: CopyValueButton
 * Path: src/components/portal/CopyValueButton.tsx
 * =============================================================================
 *
 * ES:
 * Botón cliente reutilizable para copiar un valor al portapapeles.
 *
 * Propósito:
 * - encapsular una interacción cliente mínima dentro del portal
 * - evitar convertir páginas server completas en client components
 * - ofrecer una acción simple y coherente para correo o teléfono
 *
 * Decisiones:
 * - el componente mantiene estado visual mínimo
 * - no depende todavía de toasts globales
 * - el texto cambia temporalmente a "Copiado"
 *
 * EN:
 * Small client-side button used to copy a value to clipboard.
 * =============================================================================
 */

import { useEffect, useState } from "react";

interface CopyValueButtonProps {
	value: string;
	defaultLabel?: string;
	copiedLabel?: string;
}

export default function CopyValueButton({
	value,
	defaultLabel = "Copiar",
	copiedLabel = "Copiado",
}: CopyValueButtonProps) {
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;

		const timer = window.setTimeout(() => {
			setCopied(false);
		}, 1800);

		return () => {
			window.clearTimeout(timer);
		};
	}, [copied]);

	async function handleCopy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	}

	return (
		<button
			type="button"
			onClick={() => void handleCopy()}
			className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
		>
			{copied ? copiedLabel : defaultLabel}
		</button>
	);
}
