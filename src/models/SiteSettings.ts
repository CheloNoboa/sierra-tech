/**
 * =============================================================================
 * 📦 Model: SiteSettings
 * Path: src/models/SiteSettings.ts
 * =============================================================================
 *
 * ES:
 *   Configuración global del sitio público Sierra Tech.
 *
 *   Responsabilidad:
 *   - Identidad visual global.
 *   - Información de contacto global.
 *   - Cobertura general.
 *   - Redes sociales.
 *   - CTA principal global.
 *   - Footer global.
 *   - SEO global.
 *   - Configuración base de idioma.
 *
 *   Reglas:
 *   - Existe una sola entidad global.
 *   - No controla contenido editorial del Home.
 *   - Todo campo visible del módulo debe poder persistirse en base.
 *
 * EN:
 *   Global configuration model for the Sierra Tech public website.
 * =============================================================================
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/* -------------------------------------------------------------------------- */
/* Shared sub-schemas                                                         */
/* -------------------------------------------------------------------------- */

const LocalizedTextSchema = new Schema(
	{
		es: { type: String, default: "" },
		en: { type: String, default: "" },
	},
	{ _id: false },
);

const SocialLinksSchema = new Schema(
	{
		facebook: { type: String, default: "" },
		instagram: { type: String, default: "" },
		linkedin: { type: String, default: "" },
		youtube: { type: String, default: "" },
		x: { type: String, default: "" },
	},
	{ _id: false },
);

const GlobalCtaSchema = new Schema(
	{
		label: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		href: { type: String, default: "" },
		enabled: { type: Boolean, default: true },
	},
	{ _id: false },
);

const SeoSchema = new Schema(
	{
		defaultTitle: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		defaultDescription: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		defaultOgImage: { type: String, default: "" },
	},
	{ _id: false },
);

/* -------------------------------------------------------------------------- */
/* Main schema                                                                */
/* -------------------------------------------------------------------------- */

const SiteSettingsSchema = new Schema(
	{
		identity: {
			siteName: { type: String, default: "" },
			siteNameShort: { type: String, default: "" },
			tagline: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			logoLight: { type: String, default: "" },
			logoDark: { type: String, default: "" },
			favicon: { type: String, default: "" },
		},

		contact: {
			primaryEmail: { type: String, default: "" },
			secondaryEmail: { type: String, default: "" },
			phonePrimary: { type: String, default: "" },
			phoneSecondary: { type: String, default: "" },
			whatsapp: { type: String, default: "" },
			addressLine1: { type: String, default: "" },
			addressLine2: { type: String, default: "" },
			city: { type: String, default: "" },
			country: { type: String, default: "" },
		},

		socialLinks: {
			type: SocialLinksSchema,
			default: () => ({
				facebook: "",
				instagram: "",
				linkedin: "",
				youtube: "",
				x: "",
			}),
		},

		globalPrimaryCta: {
			type: GlobalCtaSchema,
			default: () => ({
				label: { es: "", en: "" },
				href: "",
				enabled: true,
			}),
		},

		footer: {
			aboutText: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			copyrightText: { type: String, default: "" },
			legalLinksEnabled: { type: Boolean, default: true },
		},

		seo: {
			type: SeoSchema,
			default: () => ({
				defaultTitle: { es: "", en: "" },
				defaultDescription: { es: "", en: "" },
				defaultOgImage: "",
			}),
		},

		i18n: {
			defaultLocale: {
				type: String,
				enum: ["es", "en"],
				default: "es",
			},
			supportedLocales: {
				type: [String],
				enum: ["es", "en"],
				default: ["es", "en"],
			},
		},

		updatedBy: { type: String, default: "" },
		updatedByEmail: { type: String, default: "" },
	},
	{
		timestamps: true,
		collection: "SiteSettings",
	},
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type SiteSettingsDocument = InferSchemaType<typeof SiteSettingsSchema>;
type SiteSettingsModel = Model<SiteSettingsDocument>;

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

const SiteSettings =
	(mongoose.models.SiteSettings as SiteSettingsModel | undefined) ||
	mongoose.model<SiteSettingsDocument, SiteSettingsModel>(
		"SiteSettings",
		SiteSettingsSchema,
	);

export default SiteSettings;
