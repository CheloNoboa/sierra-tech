"use client";

/**
 * =============================================================================
 * 📌 Hook: useToast (Bilingüe automático) — VERSIÓN LIMPIA SIN ERRORES TS
 * -----------------------------------------------------------------------------
 * - Estado minimalista y funcional
 * - Traducción automática según idioma del navegador
 * - Diccionario tipado correctamente (sin errores TS7053)
 * - Soporte para mensajes:
 *      → string normal
 *      → objeto bilingüe { es, en }
 *
 * =============================================================================
 */

import { useState, useCallback } from "react";

export interface ToastMessage {
	id: number;
	type: "success" | "error";
	message: string;
}

/**
 * Diccionario interno (100% tipado).
 * - Se declara como Record<string, {es: string; en: string}>
 * - Esto permite indexar cualquier string sin violar TypeScript.
 */
const internalDictionary: Record<string, { es: string; en: string }> = {
	"Usuario creado": { es: "Usuario creado", en: "User created" },
	"Guardado correctamente": {
		es: "Guardado correctamente",
		en: "Saved successfully",
	},
	"Ocurrió un error": { es: "Ocurrió un error", en: "An error occurred" },
	"Acceso denegado": { es: "Acceso denegado", en: "Access denied" },
};

/** Detecta idioma actual del navegador */
function getCurrentLang(): "es" | "en" {
	if (typeof navigator === "undefined") return "es";
	return navigator.language.startsWith("en") ? "en" : "es";
}

export function useToast() {
	const [toasts, setToasts] = useState<ToastMessage[]>([]);

	/** Traducción automática, 100% sin errores de tipo */
	const translate = useCallback(
		(input: string | { es: string; en: string }) => {
			const lang = getCurrentLang();

			// Si ya viene bilingüe → usarlo
			if (typeof input === "object") {
				return input[lang];
			}

			// Buscar en el diccionario
			const entry = internalDictionary[input];
			if (entry) {
				return entry[lang];
			}

			// Si no existe traducción → dejarlo igual
			return input;
		},
		[],
	);

	/** Agregar toast */
	const push = useCallback(
		(
			type: "success" | "error",
			message: string | { es: string; en: string },
		) => {
			setToasts((prev) => [
				...prev,
				{
					id: Date.now(),
					type,
					message: translate(message),
				},
			]);
		},
		[translate],
	);

	/** Eliminar toast */
	const removeToast = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	/** API pública */
	const toast = {
		success: (msg: string | { es: string; en: string }) => push("success", msg),
		error: (msg: string | { es: string; en: string }) => push("error", msg),
	};

	return { toasts, removeToast, toast };
}
