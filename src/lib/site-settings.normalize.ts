/**
 * =============================================================================
 * 📘 Site Settings Normalize Helpers
 * Path: src/lib/site-settings.normalize.ts
 * =============================================================================
 *
 * ES:
 *   Helpers puros para validar y normalizar payloads del módulo SiteSettings.
 *
 * EN:
 *   Pure helpers to validate and normalize SiteSettings payloads.
 * =============================================================================
 */

import type {
	AllowedRole,
	Locale,
	LocalizedText,
	SiteSettingsPayload,
} from "@/lib/site-settings.contract";
import { SITE_SETTINGS_DEFAULTS } from "@/lib/site-settings.contract";

export function isAllowedRole(role: unknown): role is AllowedRole {
	return role === "admin" || role === "superadmin";
}

export function normalizeString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

export function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

export function normalizeNumber(
	value: unknown,
	fallback: number | null,
): number | null {
	if (value === null) return null;
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return value;
}

export function normalizeLocale(value: unknown, fallback: Locale): Locale {
	return value === "es" || value === "en" ? value : fallback;
}

export function normalizeSupportedLocales(value: unknown): Locale[] {
	if (!Array.isArray(value)) return ["es", "en"];

	const locales = value.filter(
		(item): item is Locale => item === "es" || item === "en",
	);

	return locales.length > 0 ? Array.from(new Set(locales)) : ["es", "en"];
}

export function normalizeLocalizedText(
	value: unknown,
	fallback: LocalizedText,
): LocalizedText {
	if (!value || typeof value !== "object") return fallback;

	const record = value as Record<string, unknown>;

	return {
		es: typeof record.es === "string" ? record.es : fallback.es,
		en: typeof record.en === "string" ? record.en : fallback.en,
	};
}

export function normalizeSiteSettingsPayload(
	payload: unknown,
): SiteSettingsPayload {
	if (!payload || typeof payload !== "object") {
		return structuredClone(SITE_SETTINGS_DEFAULTS);
	}

	const record = payload as Record<string, unknown>;
	const identity = (record.identity ?? {}) as Record<string, unknown>;
	const contact = (record.contact ?? {}) as Record<string, unknown>;
	const socialLinks = (record.socialLinks ?? {}) as Record<string, unknown>;
	const globalPrimaryCta = (record.globalPrimaryCta ?? {}) as Record<
		string,
		unknown
	>;
	const footer = (record.footer ?? {}) as Record<string, unknown>;
	const seo = (record.seo ?? {}) as Record<string, unknown>;
	const i18n = (record.i18n ?? {}) as Record<string, unknown>;

	const supportedLocales = normalizeSupportedLocales(i18n.supportedLocales);
	const defaultLocale = normalizeLocale(i18n.defaultLocale, "es");

	return {
		identity: {
			siteName: normalizeString(identity.siteName),
			siteNameShort: normalizeString(identity.siteNameShort),
			tagline: normalizeLocalizedText(
				identity.tagline,
				SITE_SETTINGS_DEFAULTS.identity.tagline,
			),
			logoLight: normalizeString(identity.logoLight),
			logoDark: normalizeString(identity.logoDark),
			favicon: normalizeString(identity.favicon),
		},

		contact: {
			primaryEmail: normalizeString(contact.primaryEmail),
			secondaryEmail: normalizeString(contact.secondaryEmail),
			phonePrimary: normalizeString(contact.phonePrimary),
			phoneSecondary: normalizeString(contact.phoneSecondary),
			whatsapp: normalizeString(contact.whatsapp),
			addressLine1: normalizeString(contact.addressLine1),
			addressLine2: normalizeString(contact.addressLine2),
			city: normalizeString(contact.city),
			country: normalizeString(contact.country),
		},

		socialLinks: {
			facebook: normalizeString(socialLinks.facebook),
			instagram: normalizeString(socialLinks.instagram),
			linkedin: normalizeString(socialLinks.linkedin),
			youtube: normalizeString(socialLinks.youtube),
			x: normalizeString(socialLinks.x),
		},

		globalPrimaryCta: {
			label: normalizeLocalizedText(
				globalPrimaryCta.label,
				SITE_SETTINGS_DEFAULTS.globalPrimaryCta.label,
			),
			href: normalizeString(globalPrimaryCta.href),
			enabled: normalizeBoolean(globalPrimaryCta.enabled, true),
		},

		footer: {
			aboutText: normalizeLocalizedText(
				footer.aboutText,
				SITE_SETTINGS_DEFAULTS.footer.aboutText,
			),
			copyrightText: normalizeString(footer.copyrightText),
			legalLinksEnabled: normalizeBoolean(footer.legalLinksEnabled, true),
		},

		seo: {
			defaultTitle: normalizeLocalizedText(
				seo.defaultTitle,
				SITE_SETTINGS_DEFAULTS.seo.defaultTitle,
			),
			defaultDescription: normalizeLocalizedText(
				seo.defaultDescription,
				SITE_SETTINGS_DEFAULTS.seo.defaultDescription,
			),
			defaultOgImage: normalizeString(seo.defaultOgImage),
		},

		i18n: {
			defaultLocale: supportedLocales.includes(defaultLocale)
				? defaultLocale
				: supportedLocales[0],
			supportedLocales,
		},

		updatedAt: normalizeString(record.updatedAt),
		updatedBy: normalizeString(record.updatedBy),
		updatedByEmail: normalizeString(record.updatedByEmail),
	};
}

export function safeNumberFromInput(value: string): number | null {
	if (value.trim() === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}
