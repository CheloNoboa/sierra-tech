"use client";

/**
 * =============================================================================
 * 📌 Component: GlobalToastProvider
 * Path: src/components/ui/GlobalToastProvider.tsx
 * =============================================================================
 *
 * ES:
 * - Proveedor global de notificaciones (toasts) para toda la plataforma.
 * - Centraliza la mensajería UX (success / error / warning / info).
 * - Controla:
 *   - creación de toasts
 *   - límite de elementos visibles
 *   - auto-dismiss
 *   - montaje seguro del portal solo en cliente
 *
 * DECISIÓN DE ARQUITECTURA
 * - Este archivo NO define la identidad visual del toast.
 * - La apariencia visual real vive en:
 *   src/components/ui/GlobalToast.tsx
 * - Aquí solo se administra el estado y render global del sistema de toasts.
 *
 * REGLAS
 * 1) Máximo 3 toasts visibles.
 * 2) Auto-dismiss de 3 segundos por defecto.
 * 3) SSR-safe: el portal solo se monta en cliente.
 * 4) Tipado estricto, sin any.
 *
 * COMPATIBILIDAD
 * - Algunos entornos no soportan crypto.randomUUID().
 * - Se usa una estrategia robusta:
 *   1) crypto.randomUUID()
 *   2) crypto.getRandomValues()
 *   3) fallback con Date.now + Math.random
 * =============================================================================
 */

import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import GlobalToast from "./GlobalToast";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastData {
	id: string;
	message: string;
	variant: ToastVariant;
}

interface ToastContextValue {
	success: (msg: string) => void;
	error: (msg: string) => void;
	warning: (msg: string) => void;
	info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * =============================================================================
 * ✅ safeToastId()
 * -----------------------------------------------------------------------------
 * ES:
 * - Genera un ID único sin depender exclusivamente de randomUUID.
 * - Diseñado para ser estable en navegadores modernos y WebViews.
 *
 * EN:
 * - Generates a unique ID without relying only on randomUUID.
 * - Designed to remain stable across browsers and WebViews.
 * =============================================================================
 */
function safeToastId(): string {
	try {
		const cryptoRef: Crypto | undefined =
			typeof globalThis !== "undefined" && "crypto" in globalThis
				? (globalThis.crypto as Crypto)
				: undefined;

		if (
			cryptoRef &&
			"randomUUID" in cryptoRef &&
			typeof cryptoRef.randomUUID === "function"
		) {
			return String(cryptoRef.randomUUID());
		}

		if (cryptoRef && typeof cryptoRef.getRandomValues === "function") {
			const bytes = new Uint8Array(16);
			cryptoRef.getRandomValues(bytes);

			// UUID v4-like
			bytes[6] = (bytes[6] & 0x0f) | 0x40;
			bytes[8] = (bytes[8] & 0x3f) | 0x80;

			const hex = Array.from(bytes, (byte) =>
				byte.toString(16).padStart(2, "0"),
			).join("");

			return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
				12,
				16,
			)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
		}
	} catch {
		// Fallback silencioso
	}

	return `t_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

export function GlobalToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<ToastData[]>([]);
	const [mounted, setMounted] = useState(false);

	/**
	 * SSR-safe portal:
	 * el portal solo debe existir en cliente.
	 */
	useEffect(() => {
		setMounted(true);
	}, []);

	/**
	 * Elimina un toast por id.
	 */
	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	/**
	 * Agrega un nuevo toast.
	 * Mantiene máximo 3 visibles para evitar saturación visual.
	 */
	const push = useCallback(
		(message: string, variant: ToastVariant) => {
			const id = safeToastId();

			setToasts((prev) => {
				const updated = [...prev, { id, message, variant }];
				return updated.slice(-3);
			});

			setTimeout(() => {
				removeToast(id);
			}, 3000);
		},
		[removeToast],
	);

	const contextValue: ToastContextValue = {
		success: (message) => push(message, "success"),
		error: (message) => push(message, "error"),
		warning: (message) => push(message, "warning"),
		info: (message) => push(message, "info"),
	};

	return (
		<ToastContext.Provider value={contextValue}>
			{children}

			{mounted &&
				typeof document !== "undefined" &&
				createPortal(
					<div className="fixed right-4 top-4 z-[10000] flex flex-col gap-3">
						{toasts.map((toast) => (
							<GlobalToast
								key={toast.id}
								id={toast.id}
								message={toast.message}
								variant={toast.variant}
								onClose={removeToast}
							/>
						))}
					</div>,
					document.body,
				)}
		</ToastContext.Provider>
	);
}

/**
 * Hook de acceso a la mensajería global.
 * Debe usarse bajo <GlobalToastProvider>.
 */
export function useToast() {
	const context = useContext(ToastContext);

	if (!context) {
		throw new Error("useToast must be used within <GlobalToastProvider>");
	}

	return context;
}
