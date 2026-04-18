/**
 * ===============================================================
 * ✅ src/components/phone/PhoneUtils.ts
 * ===============================================================
 * Utilidades de telefonía para la plataforma Sierra Tech
 * ---------------------------------------------------------------
 *
 * ES:
 * - Centraliza la lógica utilitaria para trabajar con teléfonos en formato E.164.
 * - Permite:
 *   - detectar país desde un número E.164
 *   - extraer número nacional
 *   - formatear teléfonos para visualización en UI
 * - Soporta actualmente: EC, US, CA, MX, CO.
 * - Ecuador se define como país por defecto del sistema.
 *
 * Responsabilidades:
 * - Mantener una lista tipada de países soportados.
 * - Resolver país y número nacional desde cadenas E.164.
 * - Formatear números para lectura humana en tablas y vistas administrativas.
 *
 * Reglas:
 * - El almacenamiento persistente esperado es E.164.
 * - Si no se puede detectar el país, se usa `DEFAULT_COUNTRY`.
 * - Estas utilidades no reemplazan una librería completa de telefonía.
 *
 * EN:
 * - Centralized phone utilities for Sierra Tech.
 * - Handles E.164 parsing, country detection, national number extraction
 *   and UI-friendly formatting.
 * - Ecuador is the system default country.
 * ---------------------------------------------------------------
 */

export interface CountryInfo {
	code: string;
	nameEs: string;
	nameEn: string;
	dialCode: string;
	flag: string;
}

/**
 * Lista de países soportados actualmente.
 * Ecuador se coloca primero para que sea el default del sistema.
 */
export const SUPPORTED_COUNTRIES: CountryInfo[] = [
	{
		code: "EC",
		nameEs: "Ecuador",
		nameEn: "Ecuador",
		dialCode: "593",
		flag: "🇪🇨",
	},
	{
		code: "US",
		nameEs: "Estados Unidos",
		nameEn: "United States",
		dialCode: "1",
		flag: "🇺🇸",
	},
	{
		code: "CA",
		nameEs: "Canadá",
		nameEn: "Canada",
		dialCode: "1",
		flag: "🇨🇦",
	},
	{
		code: "MX",
		nameEs: "México",
		nameEn: "Mexico",
		dialCode: "52",
		flag: "🇲🇽",
	},
	{
		code: "CO",
		nameEs: "Colombia",
		nameEn: "Colombia",
		dialCode: "57",
		flag: "🇨🇴",
	},
];

/**
 * País por defecto si no se puede inferir otro.
 */
export const DEFAULT_COUNTRY: CountryInfo = SUPPORTED_COUNTRIES[0];

/* ===============================================================
 * Helpers internos
 * =============================================================== */

/**
 * Normaliza una cadena de teléfono conservando solo `+` y dígitos.
 */
function normalizeE164(phone: string): string {
	if (!phone) return "";
	return phone.replace(/[^+\d]/g, "");
}

/**
 * Intenta detectar el país a partir del prefijo E.164.
 *
 * ES:
 * - Recibe un teléfono potencialmente en formato E.164.
 * - Si encuentra coincidencia por prefijo, devuelve el país soportado.
 * - Si no hay coincidencia, devuelve `undefined`.
 *
 * EN:
 * - Attempts to detect country from an E.164 prefix.
 */
export function detectCountryFromE164(
	phone?: string | null,
): CountryInfo | undefined {
	if (!phone) return undefined;

	const normalized = normalizeE164(phone);
	if (!normalized.startsWith("+")) return undefined;

	const digits = normalized.slice(1);

	const sorted = [...SUPPORTED_COUNTRIES].sort(
		(a, b) => b.dialCode.length - a.dialCode.length,
	);

	for (const country of sorted) {
		if (digits.startsWith(country.dialCode)) {
			return country;
		}
	}

	return undefined;
}

/**
 * Extrae país y número nacional desde un E.164.
 *
 * ES:
 * - Si no detecta país, usa `DEFAULT_COUNTRY`.
 * - Si el número no viene con `+`, lo trata como número nacional crudo.
 *
 * EN:
 * - Extracts country and national number from an E.164 string.
 * - Falls back to `DEFAULT_COUNTRY` when detection fails.
 */
export function extractNationalFromE164(phone?: string | null): {
	country: CountryInfo;
	nationalNumber: string;
} {
	if (!phone) {
		return {
			country: DEFAULT_COUNTRY,
			nationalNumber: "",
		};
	}

	const normalized = normalizeE164(phone);

	if (!normalized.startsWith("+")) {
		return {
			country: DEFAULT_COUNTRY,
			nationalNumber: normalized,
		};
	}

	const digits = normalized.slice(1);
	const detected = detectCountryFromE164(normalized);

	if (!detected) {
		return {
			country: DEFAULT_COUNTRY,
			nationalNumber: digits,
		};
	}

	const nationalNumber = digits.slice(detected.dialCode.length);

	return {
		country: detected,
		nationalNumber,
	};
}

/**
 * Formatea un número nacional según país.
 *
 * ES:
 * - Devuelve una representación legible para UI.
 * - No intenta cubrir todos los casos internacionales posibles.
 *
 * EN:
 * - Returns a human-readable representation for UI.
 * - Intentionally simple, not a full phone-number library replacement.
 */
export function formatNationalNumber(
	country: CountryInfo,
	nationalNumber: string,
): string {
	const digits = nationalNumber.replace(/\D/g, "");

	if (!digits) return "";

	if (country.code === "US" || country.code === "CA") {
		if (digits.length === 10) {
			const area = digits.slice(0, 3);
			const mid = digits.slice(3, 6);
			const last = digits.slice(6);
			return `(${area}) ${mid}-${last}`;
		}

		return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
	}

	if (country.code === "MX") {
		if (digits.length === 10) {
			const p1 = digits.slice(0, 2);
			const p2 = digits.slice(2, 6);
			const p3 = digits.slice(6);
			return `${p1} ${p2} ${p3}`;
		}

		return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
	}

	if (country.code === "EC") {
		if (digits.length === 10) {
			const p1 = digits.slice(0, 3);
			const p2 = digits.slice(3, 6);
			const p3 = digits.slice(6);
			return `${p1} ${p2} ${p3}`;
		}

		if (digits.length === 9) {
			const p1 = digits.slice(0, 2);
			const p2 = digits.slice(2, 5);
			const p3 = digits.slice(5);
			return `${p1} ${p2} ${p3}`;
		}

		return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
	}

	if (country.code === "CO") {
		if (digits.length === 10) {
			const p1 = digits.slice(0, 3);
			const p2 = digits.slice(3, 6);
			const p3 = digits.slice(6);
			return `${p1} ${p2} ${p3}`;
		}

		return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
	}

	return digits.replace(/(\d{3})(?=\d)/g, "$1 ");
}

/**
 * Formatea un E.164 para mostrarse en la grilla.
 *
 * ES:
 * - Devuelve un string amigable como:
 *   `🇪🇨 +593 099 123 4567`
 * - Si no puede formatear el número nacional, muestra el valor normalizado.
 *
 * EN:
 * - Formats an E.164 value for grid/table display.
 */
export function formatPhoneForGrid(phone?: string | null): string {
	if (!phone) return "—";

	const normalized = normalizeE164(phone);
	if (!normalized) return "—";

	const { country, nationalNumber } = extractNationalFromE164(normalized);
	const pretty = formatNationalNumber(country, nationalNumber);

	if (!pretty) {
		return `${country.flag} ${normalized}`;
	}

	return `${country.flag} +${country.dialCode} ${pretty}`;
}
