"use client";

/**
 * =============================================================================
 * 📄 Component: FormActionsHeader
 * Path: src/components/ui/FormActionsHeader.tsx
 * =============================================================================
 *
 * ES:
 * Barra fija (sticky / flotante) de acciones primarias para páginas tipo formulario
 * dentro del panel administrativo.
 *
 * Propósito:
 * - centralizar las acciones críticas del formulario (navegación y guardado)
 * - garantizar consistencia visual y de comportamiento en todos los módulos
 * - evitar duplicación de lógica en cada pantalla (Projects, Services, Maintenance, etc.)
 *
 * Responsabilidades:
 * - renderizar botón de regreso (Back / Atrás)
 * - renderizar botón de acción principal (Guardar entidad)
 * - mostrar estado del formulario (ej: Draft / Published)
 * - reflejar estado de guardado (loading / disabled)
 * - mantenerse siempre visible (posición fija inferior derecha)
 *
 * Comportamiento esperado:
 * - Back:
 *   - NO navega directamente
 *   - delega al padre (onBack) para validar cambios sin guardar
 *
 * - Save:
 *   - solo se habilita cuando:
 *     - el formulario es válido
 *     - existen cambios (dirty state)
 *     - no está en estado saving/loading
 *   - ejecuta onSave definido por el padre
 *
 * - Saving state:
 *   - desactiva interacciones
 *   - muestra label dinámico (ej: "Guardando...")
 *
 * Decisiones de diseño:
 * - UI desacoplada → no contiene lógica de negocio
 * - recibe todo por props → control total desde la página
 * - posición fija → evita pérdida de acciones en formularios largos
 * - reutilizable en todos los módulos administrativos
 *
 * Props esperadas:
 * - backLabel: string
 * - saveLabel: string
 * - savingLabel: string
 * - isSaving: boolean
 * - canSave: boolean
 * - statusLabel?: string
 * - onBack: () => void
 * - onSave: () => void
 *
 * Reglas:
 * - NO usar navegación directa dentro del componente
 * - NO manejar estado de formulario internamente
 * - NO usar lógica de validación aquí
 * - SIEMPRE delegar control al componente padre
 *
 * EN:
 * Fixed (sticky / floating) action bar for admin form pages.
 *
 * Purpose:
 * - centralize critical form actions (navigation + save)
 * - enforce consistent UX across all admin modules
 * - avoid duplicated logic per screen
 *
 * Behavior:
 * - Back → delegated (unsaved changes handled outside)
 * - Save → enabled only when valid + dirty + not saving
 * - Saving → disables UI + shows loading label
 *
 * Design:
 * - fully controlled via props
 * - no internal business logic
 * - always visible (floating)
 * =============================================================================
 */

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

type FormActionsHeaderProps = {
	backLabel: string;
	saveLabel: string;
	savingLabel: string;
	isSaving: boolean;
	canSave: boolean;
	onBack: () => void;
	onSave: () => void | Promise<void>;
	statusLabel?: string;
};

export default function FormActionsHeader({
	backLabel,
	saveLabel,
	savingLabel,
	isSaving,
	canSave,
	onBack,
	onSave,
	statusLabel,
}: FormActionsHeaderProps) {
	return (
		<div className="fixed bottom-4 right-4 z-[80] flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-xl">
			{statusLabel ? (
				<span className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-semibold text-text-secondary">
					{statusLabel}
				</span>
			) : null}

			<button
				type="button"
				onClick={onBack}
				disabled={isSaving}
				className="
					inline-flex items-center gap-2
					rounded-xl border border-border
					bg-surface px-4 py-2.5
					text-sm font-medium text-text-primary
					transition hover:bg-surface-soft
					disabled:opacity-50 disabled:cursor-not-allowed
				"
			>
				<ArrowLeft className="h-4 w-4" />
				{backLabel}
			</button>

			<button
				type="button"
				onClick={() => void onSave()}
				disabled={!canSave || isSaving}
				className="
					inline-flex items-center gap-2
					rounded-xl px-5 py-2.5
					text-sm font-semibold
					transition
					bg-brand-primary text-white shadow-sm
					hover:bg-brand-primaryStrong
					disabled:bg-surface-soft
					disabled:text-text-muted
					disabled:shadow-none
					disabled:cursor-not-allowed
				"
			>
				{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}

				{isSaving ? savingLabel : saveLabel}

				{!isSaving ? <ArrowRight className="h-4 w-4" /> : null}
			</button>
		</div>
	);
}