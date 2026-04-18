"use client";

/**
 * =============================================================================
 * 📄 Component: GlobalButton
 * Path: src/components/ui/GlobalButton.tsx
 * =============================================================================
 *
 * ES:
 * - Botón corporativo reutilizable de la plataforma Sierra Tech.
 * - Define un estándar visual y de comportamiento para acciones:
 *   - primary   → acción principal
 *   - secondary → acción secundaria / cancelar
 *   - danger    → acción destructiva
 *   - ghost     → acción neutra
 *
 * Responsabilidades:
 * - Unificar estilos base, tamaños y estados.
 * - Exponer una API tipada y estable para toda la plataforma.
 * - Mantener accesibilidad con soporte para focus, loading y disabled.
 *
 * Reglas:
 * - `variant="primary"` representa la acción principal del flujo.
 * - `loading` deshabilita el botón y muestra spinner.
 * - `disabled` se respeta junto con `loading`.
 * - `className` permite extender estilo sin romper el contrato base.
 *
 * EN:
 * - Reusable corporate button for the Sierra Tech platform.
 * - Provides consistent variants, sizes, accessibility and safe style
 *   composition across the system.
 * =============================================================================
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

export interface GlobalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	loading?: boolean;
	leftIcon?: ReactNode;
	rightIcon?: ReactNode;
}

export default function GlobalButton({
	children,
	variant = "primary",
	size = "md",
	loading = false,
	disabled = false,
	leftIcon,
	rightIcon,
	className,
	...rest
}: GlobalButtonProps) {
	/**
	 * Base visual:
	 * - Bordes suaves
	 * - Transición corta
	 * - Focus visible
	 * - Sombra ligera para dar presencia sin endurecer el botón
	 */
	const base =
		"inline-flex items-center justify-center rounded-xl font-semibold " +
		"transition-all duration-150 shadow-sm " +
		"focus:outline-none focus:ring-2 focus:ring-brand-secondary focus:ring-offset-2";

	/**
	 * Variantes Sierra Tech:
	 * - primary: acción principal con presencia clara pero no agresiva
	 * - secondary: superficie limpia con borde suave
	 * - danger: destructivo más elegante, no tan saturado
	 * - ghost: mínima interferencia visual
	 */
	const variantStyles: Record<Variant, string> = {
		primary:
			"bg-brand-primary text-text-primary border border-transparent " +
			"hover:bg-brand-primaryStrong hover:text-white " +
			"disabled:bg-brand-primary disabled:text-text-primary disabled:opacity-60 disabled:cursor-not-allowed",

		secondary:
			"bg-surface text-text-primary border border-border " +
			"hover:bg-surface-soft hover:border-brand-secondary " +
			"disabled:opacity-60 disabled:cursor-not-allowed",

		danger:
			"bg-surface text-status-error border border-status-error/30 " +
			"hover:bg-status-error hover:text-white hover:border-status-error " +
			"disabled:opacity-60 disabled:cursor-not-allowed",

		ghost:
			"bg-transparent text-text-secondary border border-transparent shadow-none " +
			"hover:bg-surface-soft hover:text-text-primary " +
			"disabled:opacity-60 disabled:cursor-not-allowed",
	};

	const sizeStyles: Record<Size, string> = {
		sm: "px-3 py-1.5 text-sm",
		md: "px-4 py-2 text-sm",
		lg: "px-5 py-3 text-base",
	};

	const mergedClassName = twMerge(
		clsx(
			base,
			variantStyles[variant],
			sizeStyles[size],
			loading && "cursor-wait opacity-80",
			className,
		),
	);

	return (
		<button
			{...rest}
			disabled={disabled || loading}
			aria-busy={loading}
			aria-disabled={disabled || loading}
			className={mergedClassName}
		>
			{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}

			{!loading && leftIcon ? (
				<span className="mr-2 flex items-center">{leftIcon}</span>
			) : null}

			{children}

			{!loading && rightIcon ? (
				<span className="ml-2 flex items-center">{rightIcon}</span>
			) : null}
		</button>
	);
}
