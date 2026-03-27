"use client";

/**
 * =============================================================================
 * 📌 GlobalConfirm — Unified Confirmation Modal
 * Path: src/components/ui/GlobalConfirm.tsx
 * =============================================================================
 *
 * ES:
 * - Modal unificado de confirmación para acciones sensibles o destructivas.
 * - Se monta sobre GlobalModal para heredar estructura y comportamiento común.
 * - Mantiene soporte bilingüe ES/EN.
 * - Alineado con la identidad visual clara y corporativa de Sierra Tech.
 *
 * Incluye:
 * - título
 * - mensaje principal
 * - advertencia secundaria
 * - botones Cancelar / Confirmar
 *
 * EN:
 * - Unified confirmation modal for sensitive or destructive actions.
 * - Built on top of GlobalModal to inherit common structure and behavior.
 * - Keeps ES/EN bilingual support.
 * - Aligned with Sierra Tech light and corporate visual identity.
 * =============================================================================
 */

import { AlertTriangle } from "lucide-react";
import GlobalModal from "./GlobalModal";
import { useTranslation } from "@/hooks/useTranslation";

export interface GlobalConfirmProps {
  open: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function GlobalConfirm({
  open,
  title,
  message,
  cancelLabel = "Cancelar",
  confirmLabel = "Eliminar",
  loading = false,
  onCancel,
  onConfirm,
}: GlobalConfirmProps) {
  const { locale } = useTranslation();
  const lang: "es" | "en" = locale === "es" ? "es" : "en";

  const warningText =
    lang === "es"
      ? "Esta operación puede afectar registros relacionados."
      : "This operation may affect related records.";

  return (
    <GlobalModal open={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-6 text-sm">
        {/* Main message */}
        <p className="text-text-secondary">{message}</p>

        {/* Warning message */}
        <div className="flex items-start gap-2 text-sm text-status-error">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{warningText}</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-soft hover:text-text-primary disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl bg-status-error px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </GlobalModal>
  );
}