/**
 * =============================================================================
 * 📘 Public Branding Helper (Client-safe)
 * Path: src/lib/publicBranding.ts
 * =============================================================================
 *
 * ES:
 * - Fuente única de verdad en cliente para branding público.
 * - Evita múltiples fetch a /api/site-settings.
 * - Mantiene cache en memoria + localStorage.
 * - Soporta sync entre tabs.
 *
 * EN:
 * - Client-side single source of truth for public branding.
 * =============================================================================
 */

type Branding = {
	siteName: string;
	siteNameShort: string;
	logoLight: string;
	logoDark: string;
};

const STORAGE_KEY = "st.branding";
const STORAGE_TS_KEY = "st.branding.ts";

let inMemoryCache: Branding | null = null;

/* -------------------------------------------------------------------------- */
/* Fetch                                                                      */
/* -------------------------------------------------------------------------- */

async function fetchBranding(): Promise<Branding> {
	const res = await fetch("/api/site-settings", {
		method: "GET",
		cache: "no-store",
	});

	if (!res.ok) {
		throw new Error(`HTTP_${res.status}`);
	}

	const json = await res.json();

	return {
		siteName: json?.identity?.siteName ?? "",
		siteNameShort: json?.identity?.siteNameShort ?? "",
		logoLight: json?.identity?.logoLight ?? "",
		logoDark: json?.identity?.logoDark ?? "",
	};
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function getPublicBranding(): Promise<Branding> {
	// 1. Memory
	if (inMemoryCache) {
		return inMemoryCache;
	}

	// 2. localStorage
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as Branding;
			inMemoryCache = parsed;
			return parsed;
		}
	} catch {
		// ignore
	}

	// 3. fetch
	const data = await fetchBranding();

	inMemoryCache = data;

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		localStorage.setItem(STORAGE_TS_KEY, Date.now().toString());
	} catch {
		// ignore
	}

	return data;
}

/* -------------------------------------------------------------------------- */
/* Sync                                                                       */
/* -------------------------------------------------------------------------- */

export function notifyBrandingUpdated(): void {
	inMemoryCache = null;

	try {
		localStorage.removeItem(STORAGE_KEY);
		localStorage.setItem(STORAGE_TS_KEY, Date.now().toString());
	} catch {
		// ignore
	}

	window.dispatchEvent(new Event("st:branding-updated"));
}

export function listenBrandingUpdates(callback: () => void): () => void {
	const handleWindowEvent = () => {
		inMemoryCache = null;
		callback();
	};

	const handleStorageEvent = (event: StorageEvent) => {
		if (event.key !== STORAGE_TS_KEY) {
			return;
		}

		inMemoryCache = null;
		callback();
	};

	window.addEventListener("st:branding-updated", handleWindowEvent);
	window.addEventListener("storage", handleStorageEvent);

	return () => {
		window.removeEventListener("st:branding-updated", handleWindowEvent);
		window.removeEventListener("storage", handleStorageEvent);
	};
}
