"use client";

/**
 * =============================================================================
 * 🌐 GlobalInput — Universal input component
 * Path: src/components/ui/GlobalInput.tsx
 * =============================================================================
 *
 * ES:
 * - Componente reutilizable que unifica <input> y <textarea> bajo una sola API.
 * - Permite:
 *   - label opcional
 *   - mensaje de error
 *   - estilos estandarizados
 *   - tipado estricto sin any
 *   - compatibilidad con React Hook Form
 * - Alineado con el sistema visual centralizado de Sierra Tech.
 *
 * DISEÑO DEL TIPADO
 * - Usa una unión discriminada basada en la prop `textarea`.
 * - Así TypeScript sabe qué props son válidas en cada caso:
 *   - textarea = true  → TextareaHTMLAttributes
 *   - textarea = false → InputHTMLAttributes
 *
 * EN:
 * - Reusable component that unifies <input> and <textarea> under a single API.
 * - Supports optional label, error message, strict typing and RHF compatibility.
 * - Aligned with Sierra Tech centralized design system.
 * =============================================================================
 */

import React from "react";
import { cn } from "@/lib/utils";

/** Native props */
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Shared props
 */
interface BaseProps {
  label?: string;
  error?: string;
  textarea?: boolean;
  className?: string;
}

/**
 * Discriminated union
 */
export type GlobalInputProps =
  | (BaseProps & { textarea?: false } & InputProps)
  | (BaseProps & { textarea: true } & TextareaProps);

/**
 * GlobalInput — main component
 */
export default function GlobalInput({
  label,
  error,
  textarea = false,
  className,
  ...rest
}: GlobalInputProps) {
  const baseFieldClass = cn(
    "w-full rounded-xl border bg-surface px-3 py-2 text-text-primary transition",
    "placeholder:text-text-muted",
    "focus:outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary",
    "disabled:cursor-not-allowed disabled:opacity-60",
    error ? "border-status-error" : "border-border",
    className
  );

  return (
    <div className="mb-3 flex w-full flex-col">
      {label ? (
        <label className="mb-1 text-sm font-medium text-text-secondary">
          {label}
        </label>
      ) : null}

      {textarea ? (
        <textarea
          {...(rest as TextareaProps)}
          className={cn(baseFieldClass, "min-h-[90px] resize-none")}
        />
      ) : (
        <input {...(rest as InputProps)} className={baseFieldClass} />
      )}

      {error ? (
        <p className="mt-1 text-xs text-status-error">{error}</p>
      ) : null}
    </div>
  );
}