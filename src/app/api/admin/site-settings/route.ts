/**
 * =============================================================================
 * 📡 API Route: Admin Site Settings
 * Path: src/app/api/admin/site-settings/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para consultar y actualizar la configuración global
 *   del sitio público Sierra Tech.
 *
 *   Métodos:
 *   - GET: devuelve la configuración actual
 *   - PUT: actualiza o crea la configuración global
 *
 *   Seguridad:
 *   - Acceso permitido solo para admin y superadmin
 *
 *   Reglas:
 *   - Se maneja una sola entidad global.
 *   - GET garantiza existencia de documento global.
 *   - PUT normaliza y persiste el payload completo.
 *   - La respuesta mantiene contrato estable para la UI admin.
 *
 * EN:
 *   Administrative endpoint for reading and updating global public-site settings.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import SiteSettings from "@/models/SiteSettings";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Locale = "es" | "en";
type AllowedRole = "admin" | "superadmin";

interface LocalizedText {
	es: string;
	en: string;
}

interface SiteSettingsPayload {
	identity: {
		siteName: string;
		siteNameShort: string;
		tagline: LocalizedText;
		logoLight: string;
		logoDark: string;
		favicon: string;
	};

	contact: {
		primaryEmail: string;
		secondaryEmail: string;
		phonePrimary: string;
		phoneSecondary: string;
		whatsapp: string;
		addressLine1: string;
		addressLine2: string;
		city: string;
		country: string;
	};

	socialLinks: {
		facebook: string;
		instagram: string;
		linkedin: string;
		youtube: string;
		x: string;
	};

	globalPrimaryCta: {
		label: LocalizedText;
		href: string;
		enabled: boolean;
	};

	footer: {
		aboutText: LocalizedText;
		copyrightText: string;
		legalLinksEnabled: boolean;
	};

	seo: {
		defaultTitle: LocalizedText;
		defaultDescription: LocalizedText;
		defaultOgImage: string;
	};

	i18n: {
		defaultLocale: Locale;
		supportedLocales: Locale[];
	};

	updatedAt?: string;
	updatedBy?: string;
	updatedByEmail?: string;
}

type AdminGuardResult =
	| { ok: true; role: AllowedRole; userName: string; userEmail: string }
	| { ok: false; response: NextResponse };

/* -------------------------------------------------------------------------- */
/* Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const SITE_SETTINGS_DEFAULTS: SiteSettingsPayload = {
	identity: {
		siteName: "",
		siteNameShort: "",
		tagline: { es: "", en: "" },
		logoLight: "",
		logoDark: "",
		favicon: "",
	},

	contact: {
		primaryEmail: "",
		secondaryEmail: "",
		phonePrimary: "",
		phoneSecondary: "",
		whatsapp: "",
		addressLine1: "",
		addressLine2: "",
		city: "",
		country: "",
	},

	socialLinks: {
		facebook: "",
		instagram: "",
		linkedin: "",
		youtube: "",
		x: "",
	},

	globalPrimaryCta: {
		label: { es: "", en: "" },
		href: "",
		enabled: true,
	},

	footer: {
		aboutText: { es: "", en: "" },
		copyrightText: "",
		legalLinksEnabled: true,
	},

	seo: {
		defaultTitle: { es: "", en: "" },
		defaultDescription: { es: "", en: "" },
		defaultOgImage: "",
	},

	i18n: {
		defaultLocale: "es",
		supportedLocales: ["es", "en"],
	},

	updatedAt: "",
	updatedBy: "",
	updatedByEmail: "",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
	return role === "admin" || role === "superadmin";
}

function normalizeString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function normalizeLocale(value: unknown, fallback: Locale): Locale {
	return value === "es" || value === "en" ? value : fallback;
}

function normalizeSupportedLocales(value: unknown): Locale[] {
	if (!Array.isArray(value)) return ["es", "en"];

	const locales = value.filter(
		(item): item is Locale => item === "es" || item === "en",
	);

	return locales.length > 0 ? Array.from(new Set(locales)) : ["es", "en"];
}

function normalizeLocalizedText(
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

function normalizeSiteSettingsPayload(value: unknown): SiteSettingsPayload {
	if (!value || typeof value !== "object") {
		return structuredClone(SITE_SETTINGS_DEFAULTS);
	}

	const record = value as Record<string, unknown>;
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

function toResponsePayload(
	doc: {
		identity?: unknown;
		contact?: unknown;
		socialLinks?: unknown;
		globalPrimaryCta?: unknown;
		footer?: unknown;
		seo?: unknown;
		i18n?: unknown;
		updatedAt?: Date | string;
		updatedBy?: string;
		updatedByEmail?: string;
	} | null,
): SiteSettingsPayload {
	if (!doc) return structuredClone(SITE_SETTINGS_DEFAULTS);

	return normalizeSiteSettingsPayload({
		identity: doc.identity,
		contact: doc.contact,
		socialLinks: doc.socialLinks,
		globalPrimaryCta: doc.globalPrimaryCta,
		footer: doc.footer,
		seo: doc.seo,
		i18n: doc.i18n,
		updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
		updatedBy: doc.updatedBy ?? "",
		updatedByEmail: doc.updatedByEmail ?? "",
	});
}

async function requireAdmin(): Promise<AdminGuardResult> {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					error_es: "Sesión no válida o expirada.",
					error_en: "Invalid or expired session.",
				},
				{ status: 401 },
			),
		};
	}

	const role = session.user.role;

	if (!isAllowedRole(role)) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					error_es: "No tienes permisos para acceder a este recurso.",
					error_en: "You do not have permission to access this resource.",
				},
				{ status: 403 },
			),
		};
	}

	return {
		ok: true,
		role,
		userName: typeof session.user.name === "string" ? session.user.name : "",
		userEmail: typeof session.user.email === "string" ? session.user.email : "",
	};
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		await connectToDB();

		let doc = await SiteSettings.findOne({});

		if (!doc) {
			doc = await SiteSettings.create({
				identity: SITE_SETTINGS_DEFAULTS.identity,
				contact: SITE_SETTINGS_DEFAULTS.contact,
				socialLinks: SITE_SETTINGS_DEFAULTS.socialLinks,
				globalPrimaryCta: SITE_SETTINGS_DEFAULTS.globalPrimaryCta,
				footer: SITE_SETTINGS_DEFAULTS.footer,
				seo: SITE_SETTINGS_DEFAULTS.seo,
				i18n: SITE_SETTINGS_DEFAULTS.i18n,
				updatedBy: "",
				updatedByEmail: "",
			});
		}

		const payload = toResponsePayload(doc.toObject());

		return NextResponse.json(payload, { status: 200 });
	} catch (error) {
		console.error("Error fetching admin site settings:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al obtener Site Settings.",
				error_en: "Internal error while fetching Site Settings.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(request: Request) {
	try {
		const guard = await requireAdmin();
		if (!guard.ok) return guard.response;

		await connectToDB();

		const body: unknown = await request.json().catch(() => null);
		const normalized = normalizeSiteSettingsPayload(body);

		const update = {
			identity: normalized.identity,
			contact: normalized.contact,
			socialLinks: normalized.socialLinks,
			globalPrimaryCta: normalized.globalPrimaryCta,
			footer: normalized.footer,
			seo: normalized.seo,
			i18n: normalized.i18n,
			updatedBy: guard.userName,
			updatedByEmail: guard.userEmail,
		};

		const doc = await SiteSettings.findOneAndUpdate(
			{},
			{ $set: update },
			{
				new: true,
				upsert: true,
				setDefaultsOnInsert: true,
			},
		).lean();

		const payload = toResponsePayload(doc);

		return NextResponse.json(payload, { status: 200 });
	} catch (error) {
		console.error("Error saving admin site settings:", error);

		return NextResponse.json(
			{
				error_es: "Error interno al guardar Site Settings.",
				error_en: "Internal error while saving Site Settings.",
			},
			{ status: 500 },
		);
	}
}
