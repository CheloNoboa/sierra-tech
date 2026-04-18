"use client";

/**
 * =============================================================================
 * 🕒 Hook: useAutoLogout
 * =============================================================================
 * Controla la expiración automática de la sesión por inactividad:
 *
 * ✔ Lee desde SystemSettings → sessionTimeoutMinutes
 * ✔ Detecta actividad: mouse, teclado, scroll, click, focus, touch
 * ✔ Muestra un modal bilingüe avisando:
 *      "Tu sesión expirará en 60 segundos por inactividad."
 * ✔ Cuenta regresiva en segundos (60 → 0)
 * ✔ Si el usuario hace actividad → cancela el cierre y reinicia el contador
 * ✔ Si no hay actividad → ejecuta signOut()
 *
 * Requisitos:
 * - Usar este hook dentro de un componente cliente (por ejemplo AutoLogoutGuard).
 *
 * Última actualización: 2025-11-22
 * Autor: Marcelo Noboa
 * Mant. Técnico: IA Asistida (ChatGPT)
 * =============================================================================
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { signOut } from "next-auth/react";

interface SystemSetting {
	key: string;
	value: unknown;
}

interface AutoLogoutTranslations {
	title: string;
	message: string;
	secondsSuffix: string;
	stayActive: string;
}

export function useAutoLogout() {
	const { locale } = useTranslation();

	// Tiempo de inactividad antes de cerrar sesión (en minutos)
	const [timeoutMinutes, setTimeoutMinutes] = useState<number>(60); // default seguro
	// Segundos que se muestran en el modal (cuenta regresiva)
	const [warnSeconds, setWarnSeconds] = useState<number>(0);
	// Mostrar / ocultar el modal
	const [showWarning, setShowWarning] = useState<boolean>(false);

	// Referencias a timers para poder limpiarlos correctamente
	const mainTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null,
	);

	/**
	 * ========================================================================
	 * 🔄 Cargar el valor de sessionTimeoutMinutes desde la API
	 * ========================================================================
	 */
	const loadTimeout = useCallback(async () => {
		try {
			const res = await fetch("/api/admin/settings", {
				headers: { "accept-language": locale },
			});

			if (!res.ok) return;

			const settings: SystemSetting[] = await res.json();
			const found = settings.find((s) => s.key === "sessionTimeoutMinutes");

			if (found && typeof found.value === "number") {
				setTimeoutMinutes(found.value);
			}
		} catch (error) {
			console.error("❌ Error loading session timeout:", error);
		}
	}, [locale]);

	/**
	 * ========================================================================
	 * 🧹 Limpia todos los timers activos
	 * ========================================================================
	 */
	const clearAllTimers = useCallback(() => {
		if (mainTimeoutRef.current) {
			clearTimeout(mainTimeoutRef.current);
			mainTimeoutRef.current = null;
		}
		if (warningTimeoutRef.current) {
			clearTimeout(warningTimeoutRef.current);
			warningTimeoutRef.current = null;
		}
		if (countdownIntervalRef.current) {
			clearInterval(countdownIntervalRef.current);
			countdownIntervalRef.current = null;
		}
	}, []);

	/**
	 * ========================================================================
	 * 🔁 Reset de actividad (se llama en cada interacción del usuario)
	 * ========================================================================
	 */
	const resetTimer = useCallback(() => {
		// Ocultar modal y resetear contador visual
		setShowWarning(false);
		setWarnSeconds(0);

		// Limpiar timers previos
		clearAllTimers();

		// Seguridad: mínimo 1 minuto para evitar tiempos inválidos
		const minutes = timeoutMinutes > 0 ? timeoutMinutes : 1;

		const totalMs = minutes * 60 * 1000;
		const warningOffsetMs = 60_000; // Siempre 60 segundos antes
		const warningDelay = totalMs - warningOffsetMs;

		// Si el total es menor o igual que 60s, mostramos el modal desde el inicio
		if (warningDelay <= 0) {
			setShowWarning(true);
			setWarnSeconds(60);

			countdownIntervalRef.current = setInterval(() => {
				setWarnSeconds((prev) => {
					if (prev <= 1) {
						clearAllTimers();
						signOut();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);

			return;
		}

		// Timer para mostrar el modal 60s antes del logout
		warningTimeoutRef.current = setTimeout(() => {
			setShowWarning(true);
			setWarnSeconds(60);

			// Cuenta regresiva dentro del modal
			countdownIntervalRef.current = setInterval(() => {
				setWarnSeconds((prev) => {
					if (prev <= 1) {
						clearAllTimers();
						signOut();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}, warningDelay);

		// Timer final que ejecuta el signOut (por seguridad adicional)
		mainTimeoutRef.current = setTimeout(() => {
			clearAllTimers();
			signOut();
		}, totalMs);
	}, [clearAllTimers, timeoutMinutes]);

	/**
	 * ========================================================================
	 * 🎯 Registrar listeners de actividad del usuario
	 * ========================================================================
	 */
	const registerActivityListeners = useCallback(() => {
		const events: Array<keyof WindowEventMap> = [
			"mousemove",
			"keydown",
			"click",
			"scroll",
			"focus",
			"touchstart",
		];

		const handler = () => {
			resetTimer();
		};

		events.forEach((evt) => {
			window.addEventListener(evt, handler);
		});

		return () => {
			events.forEach((evt) => {
				window.removeEventListener(evt, handler);
			});
		};
	}, [resetTimer]);

	/**
	 * ========================================================================
	 * Inicializar: cargar timeout desde backend
	 * ========================================================================
	 */
	useEffect(() => {
		void loadTimeout();
	}, [loadTimeout]);

	/**
	 * ========================================================================
	 * Cuando cambie timeoutMinutes → reiniciar timers y listeners
	 * ========================================================================
	 */
	useEffect(() => {
		if (!timeoutMinutes) return;

		resetTimer();
		const unregister = registerActivityListeners();

		return () => {
			unregister();
			clearAllTimers();
		};
	}, [timeoutMinutes, resetTimer, registerActivityListeners, clearAllTimers]);

	/**
	 * ========================================================================
	 * Textos bilingües para el modal
	 * ========================================================================
	 */
	const t: AutoLogoutTranslations = {
		title:
			locale === "es"
				? "Tu sesión expirará pronto"
				: "Your session will expire soon",
		message:
			locale === "es" ? "Tu sesión expirará en" : "Your session will expire in",
		secondsSuffix:
			locale === "es"
				? "segundos por inactividad."
				: "seconds due to inactivity.",
		stayActive: locale === "es" ? "Seguir activo" : "Stay active",
	};

	return {
		showWarning,
		warnSeconds,
		resetTimer,
		t,
	};
}
