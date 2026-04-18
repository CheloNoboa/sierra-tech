/**
 * =============================================================================
 * 📌 src/context/LanguageContext.tsx
 * -----------------------------------------------------------------------------
 * 🌐 Contexto Global de Idioma — Versión con sincronización MULTITAB
 * -----------------------------------------------------------------------------
 * ES:
 *   - Controla idioma global (ES/EN)
 *   - Sincroniza idioma entre TODAS las pestañas:
 *       ✔ BroadcastChannel → rápido y moderno
 *       ✔ localStorage → fallback universal
 *   - Persiste idioma en localStorage
 *   - Expone: { locale, setLocale, t }
 *   - 100% compatible con tu arquitectura actual
 *
 * EN:
 *   Full multi-tab language sync using BroadcastChannel + storage fallback.
 * =============================================================================
 */

"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useRef,
} from "react";
import { translations } from "@/hooks/useTranslation";

export type Locale = "es" | "en";

interface LanguageContextProps {
	locale: Locale;
	setLocale: (lang: Locale) => void;
	t: (typeof translations)["es"];
}

const LanguageContext = createContext<LanguageContextProps | undefined>(
	undefined,
);

export const LanguageProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const [locale, setLocale] = useState<Locale>("es");

	// 🛑 Evitar loops de sincronización entre pestañas
	const suppressBroadcast = useRef(false);

	/* ==========================================================================
	 * 1️⃣ Cargar idioma inicial (localStorage → navegador)
	 * ======================================================================== */
	useEffect(() => {
		const saved = localStorage.getItem("locale") as Locale | null;

		const browserLang: Locale = navigator.language.startsWith("en")
			? "en"
			: "es";

		const finalLang = saved || browserLang;

		setLocale(finalLang);
		document.documentElement.lang = finalLang;
	}, []);

	/* ==========================================================================
	 * 2️⃣ Sincronización MULTITAB — escuchar cambios externos
	 * ======================================================================== */
	useEffect(() => {
		if (typeof window === "undefined") return;

		// BroadcastChannel (moderno)
		let channel: BroadcastChannel | null = null;

		if ("BroadcastChannel" in window) {
			channel = new BroadcastChannel("language-sync");
			channel.onmessage = (ev) => {
				const newLang = ev.data;

				if (newLang === "es" || newLang === "en") {
					suppressBroadcast.current = true; // evitar echo back
					setLocale(newLang);
					document.documentElement.lang = newLang;
				}
			};
		}

		// Fallback universal: storage event
		const storageListener = (ev: StorageEvent) => {
			if (ev.key === "locale" && ev.newValue) {
				const newLang = ev.newValue as Locale;
				suppressBroadcast.current = true; // evitar rebote
				setLocale(newLang);
				document.documentElement.lang = newLang;
			}
		};

		window.addEventListener("storage", storageListener);

		return () => {
			window.removeEventListener("storage", storageListener);
			if (channel) channel.close();
		};
	}, []);

	/* ==========================================================================
	 * 3️⃣ Cambio de idioma (local + broadcast + storage)
	 * ======================================================================== */
	const changeLanguage = (lang: Locale) => {
		setLocale(lang);
		document.documentElement.lang = lang;
		localStorage.setItem("locale", lang);

		// ⛔ Si viene de otra pestaña → NO reenviar broadcast
		if (suppressBroadcast.current) {
			suppressBroadcast.current = false;
			return;
		}

		// BroadcastChannel (rápido)
		if ("BroadcastChannel" in window) {
			const ch = new BroadcastChannel("language-sync");
			ch.postMessage(lang);
			ch.close();
		}
	};

	/* ==========================================================================
	 * 4️⃣ Diccionario activo
	 * ======================================================================== */
	const t = translations[locale];

	return (
		<LanguageContext.Provider value={{ locale, setLocale: changeLanguage, t }}>
			{children}
		</LanguageContext.Provider>
	);
};

/* ==========================================================================
 * 🪶 Hook de acceso rápido
 * ======================================================================== */
export const useLanguage = () => {
	const ctx = useContext(LanguageContext);
	if (!ctx)
		throw new Error("useLanguage must be used within a LanguageProvider");
	return ctx;
};
