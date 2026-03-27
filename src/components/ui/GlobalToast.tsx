"use client";

/**
 * =============================================================================
 * 📌 Component: GlobalToast
 * Path: src/components/ui/GlobalToast.tsx
 * =============================================================================
 *
 * ES:
 * - Representa un toast individual dentro del sistema global de notificaciones.
 * - Separa presentación del estado manejado por GlobalToastProvider.
 * - Usa variantes visuales para success / error / warning / info.
 * - Alineado con el sistema visual centralizado de Sierra Tech.
 *
 * DECISIÓN DE DISEÑO
 * - El toast no usa la estética oscura heredada.
 * - Tampoco usa colores utilitarios hardcodeados como identidad principal.
 * - Se apoya en:
 *   - surface / border / text tokens
 *   - estados semánticos del sistema
 *
 * EN:
 * - Represents a single toast inside the global notification system.
 * - Keeps presentation separate from GlobalToastProvider state handling.
 * - Uses visual variants for success / error / warning / info.
 * - Aligned with Sierra Tech centralized design system.
 * =============================================================================
 */

import {
  X,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
} from "lucide-react";
import clsx from "clsx";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface GlobalToastProps {
  id: string;
  message: string;
  variant: ToastVariant;
  onClose: (id: string) => void;
}

export default function GlobalToast({
  id,
  message,
  variant,
  onClose,
}: GlobalToastProps) {
  /**
   * ============================================================================
   * Variant styles
   * ============================================================================
   * ES:
   * - Base clara y corporativa.
   * - Cada variante usa un borde/acento semántico, sin romper la identidad.
   *
   * EN:
   * - Clean corporate base.
   * - Each variant uses a semantic accent/border without breaking brand identity.
   * ============================================================================
   */
  const variantStyles: Record<ToastVariant, string> = {
    success:
      "border-l-4 border-status-success bg-surface text-text-primary",
    error:
      "border-l-4 border-status-error bg-surface text-text-primary",
    warning:
      "border-l-4 border-status-warning bg-surface text-text-primary",
    info:
      "border-l-4 border-status-info bg-surface text-text-primary",
  };

  const iconStyles: Record<ToastVariant, string> = {
    success: "text-status-success",
    error: "text-status-error",
    warning: "text-status-warning",
    info: "text-status-info",
  };

  const icons: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle className={clsx("h-5 w-5", iconStyles.success)} />,
    error: <AlertCircle className={clsx("h-5 w-5", iconStyles.error)} />,
    warning: <AlertTriangle className={clsx("h-5 w-5", iconStyles.warning)} />,
    info: <Info className={clsx("h-5 w-5", iconStyles.info)} />,
  };

  return (
    <div
      className={clsx(
        "animate-slide-in-left flex min-w-[280px] items-start gap-3 rounded-xl border border-border px-4 py-3 shadow-sm",
        variantStyles[variant]
      )}
      role="status"
      aria-live="polite"
    >
      {/* Ícono */}
      <div className="mt-0.5 shrink-0">{icons[variant]}</div>

      {/* Mensaje */}
      <p className="flex-1 text-sm font-medium leading-6 text-text-primary">
        {message}
      </p>

      {/* Cerrar */}
      <button
        type="button"
        onClick={() => onClose(id)}
        aria-label="Close notification"
        className="shrink-0 rounded-md p-1 text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}