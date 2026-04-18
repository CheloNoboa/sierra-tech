"use client";

/**
 * =============================================================================
 * 📌 Component: SessionSyncClient
 * Path: src/components/SessionSyncClient.tsx
 * =============================================================================
 *
 * ES:
 * - Cliente responsable de sincronizar cambios de sesión entre pestañas
 *   usando `BroadcastChannel`.
 * - Escucha eventos emitidos por otras pestañas y actualiza la navegación
 *   local según corresponda.
 *
 * Responsabilidades:
 * - Refrescar la UI cuando otra pestaña notifica un login o refresh de sesión.
 * - Redirigir al home cuando otra pestaña notifica logout.
 * - Evitar reprocesar mensajes emitidos por la misma pestaña cuando el payload
 *   incluye `sourceId`.
 *
 * Reglas:
 * - No modifica la sesión.
 * - No llama a `getSession()`.
 * - No llama a `signOut()`.
 * - Solo reacciona mediante `router.refresh()` o `router.replace("/")`.
 * - Mantiene compatibilidad con mensajes legacy en formato string y mensajes
 *   modernos en formato objeto.
 *
 * EN:
 * - Client component responsible for synchronizing session-related events
 *   across tabs using `BroadcastChannel`.
 * - It reacts to cross-tab messages by refreshing the UI or redirecting home.
 * - Supports both legacy string messages and structured object messages.
 * =============================================================================
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type SessionUpdateMessage =
	| "refresh-session"
	| "logout"
	| { type: "refresh-session"; sourceId?: string }
	| { type: "logout"; sourceId?: string };

/**
 * ES:
 * - Genera un identificador único por pestaña para evitar eco de mensajes
 *   cuando el payload incluye `sourceId`.
 *
 * EN:
 * - Generates a unique per-tab identifier to avoid reprocessing self-emitted
 *   messages when `sourceId` is present.
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

export default function SessionSyncClient() {
	const router = useRouter();
	const tabIdRef = useRef<string>(makeTabId());

	useEffect(() => {
		if (typeof window === "undefined") return;

		const channel = new BroadcastChannel("session-updates");

		const handler = (event: MessageEvent) => {
			const msg = event.data as SessionUpdateMessage;

			if (msg === "refresh-session") {
				router.refresh();
				return;
			}

			if (msg === "logout") {
				router.replace("/");
				return;
			}

			if (typeof msg === "object" && msg?.type) {
				if (msg.sourceId && msg.sourceId === tabIdRef.current) return;

				if (msg.type === "refresh-session") {
					router.refresh();
					return;
				}

				if (msg.type === "logout") {
					router.replace("/");
					return;
				}
			}
		};

		channel.addEventListener("message", handler);

		return () => {
			channel.removeEventListener("message", handler);
			try {
				channel.close();
			} catch {
				/* silent cleanup */
			}
		};
	}, [router]);

	return null;
}
