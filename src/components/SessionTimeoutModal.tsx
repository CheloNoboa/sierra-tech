"use client";

/**
 * =============================================================================
 * 📌 Component: SessionTimeoutModal
 * Path: src/components/SessionTimeoutModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal de advertencia por inactividad de sesión.
 * - Se muestra cuando la sesión está próxima a expirar.
 *
 * Responsabilidades:
 * - Bloquear la interacción con la UI subyacente mientras está visible.
 * - Mostrar cuenta regresiva en segundos.
 * - Permitir al usuario mantener la sesión activa mediante acción explícita.
 * - Escuchar tecla "Escape" como atajo para continuar la sesión.
 *
 * Comportamiento:
 * - Cuando `show === true`:
 *   - Se renderiza el modal centrado.
 *   - Se bloquea el scroll del documento (`overflow-hidden`).
 *   - Se activa listener de teclado.
 *
 * - Cuando `show === false`:
 *   - No renderiza contenido visual.
 *   - No mantiene efectos activos.
 *
 * Reglas:
 * - No gestiona lógica de sesión (solo UI).
 * - No inicia timers.
 * - No decide expiración.
 * - Solo ejecuta `onStayActive` cuando el usuario interactúa.
 *
 * EN:
 * - Session inactivity warning modal.
 * - Displays countdown and allows user to stay active.
 * - Handles UI lock, keyboard interaction and user confirmation.
 * =============================================================================
 */

import { useEffect } from "react";

interface SessionTimeoutModalProps {
	show: boolean;
	seconds: number;
	onStayActive: () => void;
	t: {
		title: string;
		message: string;
		secondsSuffix: string;
		stayActive: string;
	};
}

export default function SessionTimeoutModal({
	show,
	seconds,
	onStayActive,
	t,
}: SessionTimeoutModalProps) {
	/**
	 * ES:
	 * - Maneja efectos secundarios cuando el modal está visible:
	 *   - Listener de teclado (Escape)
	 *   - Bloqueo de scroll del body
	 *
	 * EN:
	 * - Handles side effects when modal is visible:
	 *   - Keyboard listener (Escape)
	 *   - Body scroll lock
	 */
	useEffect(() => {
		if (!show) return;

		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onStayActive();
			}
		};

		window.addEventListener("keydown", handleKey);
		document.body.classList.add("overflow-hidden");

		return () => {
			window.removeEventListener("keydown", handleKey);
			document.body.classList.remove("overflow-hidden");
		};
	}, [show, onStayActive]);

	/**
	 * ES:
	 * - Render mínimo cuando el modal no está activo.
	 *
	 * EN:
	 * - Minimal render when modal is not active.
	 */
	if (!show) {
		return <></>;
	}

	/* =============================================================================
	 * Render
	 * ============================================================================= */
	return (
		<div
			role="dialog"
			aria-modal="true"
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
		>
			<div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-sm text-center space-y-4 animate-fade-in">
				<h2 className="text-xl font-bold text-yellow-400">{t.title}</h2>

				<p className="text-gray-300 text-sm leading-relaxed">
					{t.message}{" "}
					<span className="text-yellow-400 font-bold text-lg">{seconds}</span>{" "}
					{t.secondsSuffix}
				</p>

				<button
					onClick={onStayActive}
					className="px-4 py-2 rounded-md bg-yellow-500 text-black font-semibold hover:bg-yellow-400 transition-colors"
				>
					{t.stayActive}
				</button>
			</div>
		</div>
	);
}
