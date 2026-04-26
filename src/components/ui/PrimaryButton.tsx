"use client";

/**
 * =============================================================================
 * 📌 Component: PrimaryButton
 * Path: src/components/ui/PrimaryButton.tsx
 * =============================================================================
 *
 * ES:
 * Botón primario reutilizable del sistema admin Sierra Tech.
 *
 * Propósito:
 * - centralizar el estilo visual de acciones principales (CTA)
 * - evitar duplicación de clases Tailwind en múltiples módulos
 * - garantizar consistencia en:
 *   - color (brand-primary)
 *   - espaciado
 *   - tipografía
 *   - estados (hover, disabled)
 *
 * Uso:
 * - acciones principales (crear, guardar, confirmar)
 * - botones destacados dentro de headers o formularios
 *
 * NO usar para:
 * - acciones secundarias (usar ActionButton)
 * - links de navegación simples sin énfasis
 *
 * Decisiones:
 * - extiende ButtonHTMLAttributes para compatibilidad completa con HTML
 * - permite className adicional para ajustes puntuales sin romper base visual
 * - mantiene estilos base protegidos (no deben ser sobrescritos globalmente)
 *
 * Reglas:
 * - no redefinir estilos inline en páginas
 * - no duplicar este componente localmente
 * - todos los botones primarios del sistema deben usar este componente
 *
 * EN:
 * Reusable primary action button for Sierra Tech admin UI.
 * Ensures visual consistency across modules.
 * =============================================================================
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
}

export function PrimaryButton({
	children,
	className = "",
	...props
}: PrimaryButtonProps) {
	return (
		<button
			{...props}
			className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryStrong disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
		>
			{children}
		</button>
	);
}