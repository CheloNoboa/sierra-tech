"use client";

/**
 * =============================================================================
 * 📌 GlobalModal — Unified Base Modal
 * Path: src/components/ui/GlobalModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal base reutilizable para toda la plataforma.
 * - Re-renderiza al cambiar el idioma para refrescar textos dinámicos.
 * - Soporta tamaños semánticos sin romper compatibilidad con widthClass.
 * - Alineado con la identidad visual clara y corporativa de Sierra Tech.
 *
 * REGLAS
 * - Si se pasa `size`, tiene prioridad sobre `widthClass`.
 * - `title` es opcional.
 * - `footer` es opcional y permanece visible.
 * - El body hace scroll interno cuando el contenido es alto.
 * - `showCloseButton` permite ocultar la X cuando el flujo lo requiera.
 * - La tecla Escape ejecuta `onClose` mientras el modal está abierto.
 *
 * EN:
 * - Reusable base modal for the whole platform.
 * - Re-renders on language changes to refresh dynamic text.
 * - Supports semantic sizes without breaking widthClass compatibility.
 * - Escape key triggers `onClose` while the modal is open.
 * =============================================================================
 */

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/* =============================================================================
 * Types
 * ============================================================================= */

export type GlobalModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface GlobalModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
  size?: GlobalModalSize;
  showCloseButton?: boolean;
}

/* =============================================================================
 * Helpers
 * ============================================================================= */

const SIZE_CLASS: Record<GlobalModalSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[96vw]",
};

function resolveWidthClass(size?: GlobalModalSize, widthClass?: string): string {
  if (size) return SIZE_CLASS[size];
  return widthClass && widthClass.trim().length > 0 ? widthClass : "max-w-lg";
}

/* =============================================================================
 * Component
 * ============================================================================= */

export default function GlobalModal({
  open,
  onClose,
  title,
  children,
  footer,
  widthClass = "max-w-lg",
  size,
  showCloseButton = true,
}: GlobalModalProps) {
  const { locale } = useTranslation();

  const localeKey = locale === "es" ? "es" : "en";

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const finalWidthClass = resolveWidthClass(size, widthClass);

  return (
    <div
      key={localeKey}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close modal overlay"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={[
          "relative z-10 flex max-h-[calc(100vh-32px)] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl",
          "animate-fadeIn",
          finalWidthClass,
        ].join(" ")}
      >
        {/* Header */}
        {title ? (
          <div className="flex items-center justify-between border-b border-border px-6 pb-4 pt-6">
            <h2 className="text-lg font-semibold text-text-primary">{title}</h2>

            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
                aria-label="Close"
                title="Close"
              >
                <X size={18} />
              </button>
            ) : (
              <div className="h-8 w-8 shrink-0" aria-hidden="true" />
            )}
          </div>
        ) : (
          <div className="flex justify-end px-6 pt-4">
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
                aria-label="Close"
                title="Close"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        )}

        {/* Body */}
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4 text-text-secondary">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}