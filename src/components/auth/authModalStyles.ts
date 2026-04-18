/**
 * =============================================================================
 * 📌 Auth Modal Styles — Shared visual contract for public auth modals
 * Path: src/components/auth/authModalStyles.ts
 * =============================================================================
 *
 * ES:
 * - Centraliza las clases visuales compartidas entre LoginModal y SignUpModal.
 * - Evita duplicación de estilos.
 * - Garantiza consistencia visual en modales públicas de autenticación.
 * - Alineado con el sistema visual centralizado de Sierra Tech.
 *
 * EN:
 * - Centralizes shared visual classes for LoginModal and SignUpModal.
 * - Prevents duplicated styles.
 * - Ensures consistent public authentication modal styling.
 * - Aligned with the Sierra Tech centralized design system.
 * =============================================================================
 */

export const AUTH_MODAL_STYLES = {
	overlay:
		"fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm",

	panel:
		"relative w-96 rounded-2xl border border-border bg-surface p-6 text-text-primary shadow-xl",

	closeButton:
		"absolute right-2 top-2 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-soft hover:text-text-primary",

	title: "mb-4 text-center text-2xl font-bold text-text-primary",

	googleButton:
		"mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2.5 font-semibold text-text-primary shadow-sm transition hover:bg-surface-soft active:scale-[0.99] disabled:opacity-50",

	dividerWrap: "my-2 flex items-center",

	dividerLine: "h-px flex-1 bg-border",

	dividerText: "px-2 text-sm text-text-muted",

	inputBase:
		"rounded-xl border bg-surface px-3 py-2 text-text-primary transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:outline-none focus:ring-2 focus:ring-brand-secondary",

	inputFull:
		"w-full rounded-xl border bg-surface px-3 py-2 text-text-primary transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:outline-none focus:ring-2 focus:ring-brand-secondary",

	inputPassword:
		"w-full rounded-xl border bg-surface px-3 py-2 pr-14 text-text-primary transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:outline-none focus:ring-2 focus:ring-brand-secondary",

	inputNormalBorder: "border-border",

	inputErrorBorder: "border-status-error",

	submitButton:
		"rounded-xl bg-brand-primary py-2.5 font-semibold text-text-primary shadow-sm transition hover:bg-brand-primaryStrong hover:text-white active:scale-[0.99] disabled:opacity-50",

	eyeWrap: "absolute inset-y-0 right-0 flex items-center pr-2",

	eyeButton:
		"inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-surface-soft hover:text-text-primary focus:outline-none",

	helperError: "mt-1 text-xs text-status-error",

	helperMuted: "mt-1 text-[11px] text-text-muted",
} as const;
