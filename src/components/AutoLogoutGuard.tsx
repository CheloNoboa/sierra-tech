"use client";

/**
 * =============================================================================
 * 📌 AutoLogoutGuard — Global Inactivity & Session Sync Controller
 * =============================================================================
 *
 * ES (Desarrolladores):
 * -----------------------------------------------------------------------------
 * Este guard controla la expiración de sesión por inactividad y sincroniza
 * dicha actividad entre TODAS las pestañas abiertas del sistema.
 *
 * PRINCIPIOS (NO NEGOCIABLES):
 *   1) Single source of truth:
 *      - ESTA pestaña es responsable de sus timers locales.
 *      - La sincronización entre pestañas es un “evento” (activity/logout)
 *        que las demás pestañas interpretan, SIN re-broadcast.
 *
 *   2) Anti-loops (CRÍTICO):
 *      - Cuando ESTA pestaña expira: hace logout GLOBAL (broadcast + signOut).
 *      - Cuando ESTA pestaña RECIBE logout de otra pestaña: hace logout LOCAL
 *        (solo signOut), SIN broadcast. Esto evita eco infinito.
 *
 *   3) Throttle:
 *      - Los eventos de actividad se emiten con throttle para evitar spam
 *        de logs / llamadas / carga innecesaria.
 *
 * FUNCIONALIDADES PRINCIPALES:
 *   1. ⏱ Timeout basado en configuración del sistema (BD)
 *   2. ⏳ Advertencia 60 segundos antes de expirar
 *   3. 🔁 Reset automático al detectar actividad del usuario
 *   4. 🌐 Sincronización completa entre pestañas:
 *         - activity
 *         - logout
 *
 * MECANISMOS:
 *   - BroadcastChannel (preferido)
 *   - localStorage (fallback: evento "storage")
 *
 * IMPORTANTE:
 *   - No interfiere con `SessionSyncClient` (roles distintos).
 *   - No toca layouts/headers; solo muestra un modal propio si corresponde.
 *   - NO usamos `any` en ninguna parte (regla del proyecto).
 *
 * EN (Developers):
 * -----------------------------------------------------------------------------
 * Enterprise-grade inactivity controller with real multi-tab synchronization.
 *
 * KEY DESIGN:
 *   - Local timers per tab.
 *   - Cross-tab messages are typed and validated at runtime.
 *   - Logout received from another tab triggers LOCAL signOut only (no re-broadcast).
 *
 * =============================================================================
 * Autor UI/UX: Marcelo Noboa
 * Mantenedor técnico: IA Asistida
 * Última actualización: 2026-01-02
 * =============================================================================
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";

/* =============================================================================
 * Types
 * ============================================================================= */

interface SystemSetting {
	key: string;
	value: unknown;
}

type SessionUpdateMessage =
	| { type: "activity"; sourceId: string; ts: number }
	| { type: "logout"; sourceId: string; ts: number };

const CHANNEL_NAME = "session-updates";

/* =============================================================================
 * Utils (sin any, con runtime validation)
 * ============================================================================= */

/**
 * Genera un ID único por pestaña.
 * WHY:
 *   Necesitamos identificar el emisor para ignorar mensajes “self”.
 */
function makeTabId(): string {
	try {
		if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
			return crypto.randomUUID();
		}
	} catch {
		/* ignore */
	}
	return `tab_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Type guard: valida que un unknown sea SessionUpdateMessage.
 * WHY:
 *   BroadcastChannel y storage entregan `unknown` en runtime.
 *   Sin esto, caeríamos en casts inseguros o `any`.
 */
function isSessionUpdateMessage(v: unknown): v is SessionUpdateMessage {
	if (!v || typeof v !== "object") return false;

	const o = v as Record<string, unknown>;
	const type = o.type;

	if (type !== "activity" && type !== "logout") return false;
	if (typeof o.sourceId !== "string") return false;
	if (typeof o.ts !== "number") return false;

	return true;
}

/**
 * Publica un mensaje en BroadcastChannel.
 * WHY:
 *   Comunicación moderna entre pestañas (no requiere polling).
 */
function postToChannel(msg: SessionUpdateMessage) {
	if (typeof window === "undefined") return;
	try {
		if ("BroadcastChannel" in window) {
			const ch = new BroadcastChannel(CHANNEL_NAME);
			ch.postMessage(msg);
			ch.close();
		}
	} catch {
		/* silent */
	}
}

/**
 * Escribe en localStorage (fallback multi-tab).
 * WHY:
 *   Algunas plataformas/restricciones pueden limitar BroadcastChannel.
 *   El evento `storage` nos permite “escuchar” en otras pestañas.
 */
function writeStorage(key: string, value: unknown) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* silent */
	}
}

/**
 * Parse seguro JSON sin lanzar excepciones.
 */
function safeParseJSON<T>(raw: string | null): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

/* =============================================================================
 * Component
 * ============================================================================= */

export default function AutoLogoutGuard() {
	const { locale } = useTranslation();
	const { status } = useSession();

	// Identidad única de esta pestaña (estable)
	const tabIdRef = useRef<string>(makeTabId());

	/* ========================================================================== */
	/* STATE                                                                      */
	/* ========================================================================== */
	const [timeoutMinutes, setTimeoutMinutes] = useState(60);
	const [showModal, setShowModal] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState(60);

	/* ========================================================================== */
	/* TIMERS                                                                     */
	/* ========================================================================== */
	const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const countdown = useRef<ReturnType<typeof setInterval> | null>(null);

	/* ========================================================================== */
	/* THROTTLE ACTIVITY                                                          */
	/* ========================================================================== */
	const lastActivitySentAtRef = useRef<number>(0);
	const ACTIVITY_THROTTLE_MS = 5000;

	/* =============================================================================
	 * 1️⃣ Load timeout from DB (/api/admin/settings)
	 * =============================================================================
	 * ES:
	 *   Carga `sessionTimeoutMinutes`. Si falla, usa 60.
	 * EN:
	 *   Loads `sessionTimeoutMinutes`. Falls back to 60 on error.
	 */
	const loadTimeout = useCallback(async () => {
		try {
			const res = await fetch("/api/admin/settings", {
				headers: { "accept-language": locale },
			});

			if (!res.ok) {
				setTimeoutMinutes(60);
				return;
			}

			const settings: SystemSetting[] = await res.json();
			const found = settings.find((s) => s.key === "sessionTimeoutMinutes");

			let minutes = 60;

			if (found) {
				const raw = found.value;

				if (typeof raw === "number" && raw > 0) minutes = raw;

				if (typeof raw === "string") {
					const parsed = Number(raw);
					if (!Number.isNaN(parsed) && parsed > 0) minutes = parsed;
				}
			}

			setTimeoutMinutes(minutes);
		} catch {
			setTimeoutMinutes(60);
		}
	}, [locale]);

	/* =============================================================================
	 * 2️⃣ Clear ALL timers
	 * =============================================================================
	 * WHY:
	 *   Evita memory leaks y “doble timer” cuando el estado cambia o el componente
	 *   se re-monta.
	 */
	const clearAll = useCallback(() => {
		if (logoutTimer.current) clearTimeout(logoutTimer.current);
		if (warningTimer.current) clearTimeout(warningTimer.current);
		if (countdown.current) clearInterval(countdown.current);

		logoutTimer.current = null;
		warningTimer.current = null;
		countdown.current = null;
	}, []);

	/* =============================================================================
	 * 3️⃣ Logout LOCAL (NO broadcast) — usado al recibir logout externo
	 * =============================================================================
	 * WHY:
	 *   Si re-broadcast aquí, generamos eco infinito (tab A → tab B → tab A...).
	 */
	const forceLogoutLocal = useCallback(() => {
		clearAll();
		setShowModal(false);

		// 🚫 NO broadcast aquí
		void signOut({ callbackUrl: "/" });
	}, [clearAll]);

	/* =============================================================================
	 * 4️⃣ Logout GLOBAL (broadcast + signOut) — usado cuando ESTA pestaña expira
	 * =============================================================================
	 * WHY:
	 *   Esta pestaña “origina” la expiración y notifica a todas las demás.
	 */
	const forceLogoutGlobal = useCallback(() => {
		clearAll();
		setShowModal(false);

		const msg: SessionUpdateMessage = {
			type: "logout",
			sourceId: tabIdRef.current,
			ts: Date.now(),
		};

		postToChannel(msg);
		writeStorage("session-logout", msg);

		void signOut({ callbackUrl: "/" });
	}, [clearAll]);

	/* =============================================================================
	 * 5️⃣ Reset LOCAL timers (no broadcast)
	 * =============================================================================
	 * ES:
	 *   Reinicia timers de ESTA pestaña según `timeoutMinutes`.
	 * EN:
	 *   Restarts THIS tab timers based on `timeoutMinutes`.
	 */
	const resetTimerLocal = useCallback(() => {
		clearAll();
		setShowModal(false);
		setSecondsLeft(60);

		const minutes = timeoutMinutes > 0 ? timeoutMinutes : 1;
		const totalMs = minutes * 60 * 1000;
		const warnAtMs = totalMs - 60_000;

		// 60s warning
		warningTimer.current = setTimeout(
			() => {
				setShowModal(true);
				setSecondsLeft(60);

				if (countdown.current) clearInterval(countdown.current);

				countdown.current = setInterval(() => {
					setSecondsLeft((prev) => {
						if (prev <= 1) {
							if (countdown.current) clearInterval(countdown.current);
							forceLogoutGlobal(); // ✅ expiró aquí → GLOBAL
							return 0;
						}
						return prev - 1;
					});
				}, 1000);
			},
			Math.max(0, warnAtMs),
		);

		// final logout
		logoutTimer.current = setTimeout(() => {
			forceLogoutGlobal(); // ✅ expiró aquí → GLOBAL
		}, totalMs);
	}, [timeoutMinutes, clearAll, forceLogoutGlobal]);

	/* =============================================================================
	 * 6️⃣ Broadcast ACTIVITY (throttled)
	 * =============================================================================
	 * WHY:
	 *   Mousemove/scroll puede disparar cientos de eventos por segundo.
	 *   Throttle reduce ruido y evita loops de logs.
	 */
	const broadcastActivityThrottled = useCallback(() => {
		if (typeof window === "undefined") return;

		const now = Date.now();
		if (now - lastActivitySentAtRef.current < ACTIVITY_THROTTLE_MS) return;
		lastActivitySentAtRef.current = now;

		const msg: SessionUpdateMessage = {
			type: "activity",
			sourceId: tabIdRef.current,
			ts: now,
		};

		postToChannel(msg);
		writeStorage("session-activity", msg);
	}, []);

	const resetTimer = useCallback(() => {
		broadcastActivityThrottled();
		resetTimerLocal();
	}, [broadcastActivityThrottled, resetTimerLocal]);

	/* =============================================================================
	 * 7️⃣ Register local activity listeners
	 * =============================================================================
	 * ES:
	 *   Conecta eventos de usuario para resetear timers.
	 * EN:
	 *   Hooks into user activity events to reset timers.
	 */
	const registerActivity = useCallback(() => {
		const events: Array<keyof WindowEventMap> = [
			"mousemove",
			"keydown",
			"click",
			"scroll",
			"touchstart",
		];

		const handler = () => resetTimer();

		events.forEach((ev) =>
			window.addEventListener(ev, handler, { passive: true }),
		);

		return () => {
			events.forEach((ev) => window.removeEventListener(ev, handler));
		};
	}, [resetTimer]);

	/* =============================================================================
	 * 8️⃣ Cross-tab listeners: activity + logout
	 * =============================================================================
	 * ES:
	 *   - BroadcastChannel: mensajes entre tabs (preferido)
	 *   - storage: fallback
	 *
	 * REGLA ANTI-LOOP:
	 *   - activity externo → resetTimerLocal()
	 *   - logout externo   → forceLogoutLocal() (SIN broadcast)
	 */
	useEffect(() => {
		if (typeof window === "undefined") return;

		const channel = new BroadcastChannel(CHANNEL_NAME);

		const onMessage = (event: MessageEvent) => {
			const raw: unknown = event.data;
			if (!isSessionUpdateMessage(raw)) return;

			// ignore self
			if (raw.sourceId === tabIdRef.current) return;

			if (raw.type === "activity") {
				resetTimerLocal();
				return;
			}

			if (raw.type === "logout") {
				forceLogoutLocal();
				return;
			}
		};

		channel.addEventListener("message", onMessage);

		const onStorage = (e: StorageEvent) => {
			if (e.key !== "session-activity" && e.key !== "session-logout") return;

			const parsed = safeParseJSON<unknown>(e.newValue);
			if (!isSessionUpdateMessage(parsed)) return;

			if (parsed.sourceId === tabIdRef.current) return;

			if (parsed.type === "activity") {
				resetTimerLocal();
				return;
			}

			if (parsed.type === "logout") {
				forceLogoutLocal();
				return;
			}
		};

		window.addEventListener("storage", onStorage);

		return () => {
			channel.removeEventListener("message", onMessage);
			try {
				channel.close();
			} catch {
				/* ignore */
			}
			window.removeEventListener("storage", onStorage);
		};
	}, [resetTimerLocal, forceLogoutLocal]);

	/* =============================================================================
	 * 9️⃣ Session state changes
	 * =============================================================================
	 * ES:
	 *   Si NextAuth ya está unauthenticated, limpiamos timers y ocultamos modal.
	 */
	useEffect(() => {
		if (status === "unauthenticated") {
			clearAll();
			setShowModal(false);
		}
	}, [status, clearAll]);

	/* =============================================================================
	 * 🔟 Initialize when authenticated
	 * ============================================================================= */
	useEffect(() => {
		if (status !== "authenticated") return;
		void loadTimeout();
	}, [status, loadTimeout]);

	/* =============================================================================
	 * 1️⃣1️⃣ Restart timers when timeout changes / authenticated
	 * ============================================================================= */
	useEffect(() => {
		if (status !== "authenticated") return;

		resetTimerLocal();
		const unregister = registerActivity();

		return () => {
			unregister();
			clearAll();
		};
	}, [status, timeoutMinutes, registerActivity, resetTimerLocal, clearAll]);

	/* =============================================================================
	 * UI — expiration warning modal
	 * ============================================================================= */
	const t = {
		title:
			locale === "es"
				? "Tu sesión expirará pronto"
				: "Your session will expire soon",
		message:
			locale === "es" ? "Tu sesión expirará en" : "Your session will expire in",
		suffix:
			locale === "es"
				? "segundos por inactividad."
				: "seconds due to inactivity.",
		stay: locale === "es" ? "Seguir activo" : "Stay active",
	};

	if (!showModal || status !== "authenticated") return null;

	return (
		<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
			<div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-sm text-center space-y-4">
				<h2 className="text-xl font-bold text-yellow-400">{t.title}</h2>

				<p className="text-gray-300 text-sm">
					{t.message}{" "}
					<span className="text-yellow-400 text-lg font-bold">
						{secondsLeft}
					</span>{" "}
					{t.suffix}
				</p>

				<button
					onClick={resetTimer}
					className="px-4 py-2 bg-yellow-500 text-black rounded-md font-semibold hover:bg-yellow-400"
				>
					{t.stay}
				</button>
			</div>
		</div>
	);
}
