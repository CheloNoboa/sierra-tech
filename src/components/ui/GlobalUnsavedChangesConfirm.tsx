"use client";

/**
 * =============================================================================
 * 📌 GlobalUnsavedChangesConfirm — Unsaved changes modal
 * Path: src/components/ui/GlobalUnsavedChangesConfirm.tsx
 * =============================================================================
 *
 * ES:
 * - Modal liviano para advertir al usuario sobre cambios sin guardar.
 * - No representa una acción destructiva grave; solo una confirmación de salida.
 * - Usa GlobalModal + GlobalButton para mantener consistencia visual.
 * - Alineado con el sistema visual centralizado de Sierra Tech.
 *
 * EN:
 * - Lightweight modal warning users about unsaved changes.
 * - It is not meant for destructive confirmations.
 * - Uses GlobalModal + GlobalButton for visual consistency.
 * - Aligned with the Sierra Tech centralized design system.
 * =============================================================================
 */

import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import GlobalModal from "./GlobalModal";
import GlobalButton from "./GlobalButton";

export interface GlobalUnsavedChangesConfirmProps {
	open: boolean;
	onCancel: () => void;
	onConfirm: () => void;
	title?: string;
	message?: string;
	cancelLabel?: string;
	confirmLabel?: string;
}

export default function GlobalUnsavedChangesConfirm({
	open,
	onCancel,
	onConfirm,
	title,
	message,
	cancelLabel,
	confirmLabel,
}: GlobalUnsavedChangesConfirmProps) {
	const { locale } = useTranslation();
	const lang: "es" | "en" = locale === "es" ? "es" : "en";

	const t = {
		title: title ?? (lang === "es" ? "Cambios sin guardar" : "Unsaved changes"),
		message:
			message ??
			(lang === "es"
				? "Tienes cambios sin guardar. ¿Salir sin guardar?"
				: "You have unsaved changes. Leave without saving?"),
		cancel:
			cancelLabel ?? (lang === "es" ? "Seguir editando" : "Continue editing"),
		confirm:
			confirmLabel ?? (lang === "es" ? "Descartar cambios" : "Discard changes"),
	};

	if (!open) return null;

	return (
		<GlobalModal open={open} onClose={onCancel} title={t.title} size="sm">
			<div className="space-y-6 text-sm">
				{/* Main message */}
				<div className="flex items-start gap-2 text-sm">
					<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" />
					<span className="text-text-secondary">{t.message}</span>
				</div>

				{/* Actions */}
				<div className="flex justify-end gap-3 pt-2">
					<GlobalButton variant="secondary" size="sm" onClick={onCancel}>
						{t.cancel}
					</GlobalButton>

					<GlobalButton variant="danger" size="sm" onClick={onConfirm}>
						{t.confirm}
					</GlobalButton>
				</div>
			</div>
		</GlobalModal>
	);
}
