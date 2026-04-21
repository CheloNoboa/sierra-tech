/**
 * =============================================================================
 * 📦 Model: HomeSettings
 * Path: src/models/HomeSettings.ts
 * =============================================================================
 *
 * ES:
 *   Configuración administrable de la portada pública.
 *
 *   Responsabilidad:
 *   - Hero principal.
 *   - Panel de destaque.
 *   - Cards destacadas.
 *   - Sección de cobertura.
 *   - Sección de mapa.
 *   - Sección Nosotros.
 *   - Sección Liderazgo / Visión.
 *   - Sección Por qué elegirnos.
 *   - Sección de Partners / Alianzas.
 *
 *   Reglas:
 *   - Existe una sola entidad global.
 *   - Este módulo controla contenido editorial del Home.
 *   - No debe duplicar branding global de SiteSettings.
 *   - La sección de cobertura y la sección de mapa son independientes.
 *   - El botón/enlace hacia mapa se controla de forma explícita.
 *   - Los bloques institucionales del Home deben ser reutilizables y
 *     completamente administrables desde el panel.
 *
 *   Regla estructural:
 *   - todos los assets del Home deben mantener la misma estructura persistida
 *     basada en metadata útil de archivos servidos desde R2
 *   - no se deben mezclar strings sueltos con assets estructurados
 *
 * EN:
 *   Administrative configuration model for the public home page.
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

const HomeCtaSchema = new Schema(
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

const FeaturedCardSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },
		title: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		description: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		order: { type: Number, required: true, min: 1 },
		enabled: { type: Boolean, default: true },
	},
	{ _id: false },
);

const WhyChooseUsItemSchema = new Schema(
	{
		title: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		description: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
	},
	{ _id: false },
);

/* -------------------------------------------------------------------------- */
/* Home assets                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Asset reutilizable del módulo Home para archivos servidos desde R2.
 *
 * Regla:
 * - aquí no se sube el archivo binario
 * - solo se conserva la referencia persistente necesaria para render,
 *   descarga, reemplazo y auditoría
 * - este mismo schema se reutiliza en leadership, logos y documentos
 */
const HomeAssetSchema = new Schema(
	{
		url: { type: String, default: "" },
		fileName: { type: String, default: "" },
		mimeType: { type: String, default: "" },
		sizeBytes: { type: Number, default: 0, min: 0 },
		storageKey: { type: String, default: "" },
	},
	{ _id: false },
);

/* -------------------------------------------------------------------------- */
/* Partner / Alliances sub-schemas                                            */
/* -------------------------------------------------------------------------- */

/**
 * Documento público o institucional asociado a un partner.
 */
const PartnerDocumentSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },

		title: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		description: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		label: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		file: {
			type: HomeAssetSchema,
			default: () => ({
				url: "",
				fileName: "",
				mimeType: "",
				sizeBytes: 0,
				storageKey: "",
			}),
		},

		order: { type: Number, default: 1, min: 1 },
		enabled: { type: Boolean, default: true },
	},
	{ _id: false },
);

const PartnerItemSchema = new Schema(
	{
		id: { type: String, required: true, trim: true },

		name: { type: String, default: "", trim: true },

		shortName: { type: String, default: "", trim: true },

		badgeLabel: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		summary: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		description: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		logo: {
			type: HomeAssetSchema,
			default: () => ({
				url: "",
				fileName: "",
				mimeType: "",
				sizeBytes: 0,
				storageKey: "",
			}),
		},

		coverageItems: {
			type: [LocalizedTextSchema],
			default: [],
		},

		tags: {
			type: [LocalizedTextSchema],
			default: [],
		},

		ctaLabel: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		ctaHref: { type: String, default: "" },

		documents: {
			type: [PartnerDocumentSchema],
			default: [],
		},

		order: { type: Number, default: 1, min: 1 },
		enabled: { type: Boolean, default: true },
	},
	{ _id: false },
);

const PartnerSectionSchema = new Schema(
	{
		enabled: { type: Boolean, default: false },

		eyebrow: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		title: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		description: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		badgeLabel: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		ctaLabel: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},

		ctaHref: { type: String, default: "" },

		items: {
			type: [PartnerItemSchema],
			default: [],
		},
	},
	{ _id: false },
);

/* -------------------------------------------------------------------------- */
/* Main schema                                                                */
/* -------------------------------------------------------------------------- */

const HomeSettingsSchema = new Schema(
	{
		hero: {
			badge: {
				text: {
					type: LocalizedTextSchema,
					default: () => ({ es: "", en: "" }),
				},
				enabled: { type: Boolean, default: true },
			},

			title: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},

			subtitle: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},

			primaryCta: {
				type: HomeCtaSchema,
				default: () => ({
					label: { es: "", en: "" },
					href: "",
					enabled: true,
				}),
			},

			secondaryCta: {
				type: HomeCtaSchema,
				default: () => ({
					label: { es: "", en: "" },
					href: "",
					enabled: true,
				}),
			},
		},

		highlightPanel: {
			coverageLabel: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			enabled: { type: Boolean, default: true },
		},

		featuredCards: {
			type: [FeaturedCardSchema],
			default: [],
		},

		coverageSection: {
			eyebrow: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			title: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			description: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			note: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			openMapsLabel: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			showOpenMapsLink: { type: Boolean, default: false },
			enabled: { type: Boolean, default: true },
		},

		aboutSection: {
			eyebrow: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			title: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			description: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			highlights: {
				type: [LocalizedTextSchema],
				default: [],
			},
			enabled: { type: Boolean, default: true },
		},

		partnerSection: {
			type: PartnerSectionSchema,
			default: () => ({
				enabled: false,
				eyebrow: { es: "", en: "" },
				title: { es: "", en: "" },
				description: { es: "", en: "" },
				badgeLabel: { es: "", en: "" },
				ctaLabel: { es: "", en: "" },
				ctaHref: "",
				items: [],
			}),
		},

		/**
		 * Bloque de liderazgo institucional.
		 *
		 * Regla:
		 * - usa el mismo patrón estructural de assets que el resto del Home
		 * - evita strings sueltos para imágenes
		 * - mantiene metadata útil de R2 para render y administración
		 */
		leadershipSection: {
			name: { type: String, default: "" },
			role: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			message: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			image: {
				type: HomeAssetSchema,
				default: () => ({
					url: "",
					fileName: "",
					mimeType: "",
					sizeBytes: 0,
					storageKey: "",
				}),
			},
			enabled: { type: Boolean, default: true },
		},

		whyChooseUs: {
			title: {
				type: LocalizedTextSchema,
				default: () => ({ es: "", en: "" }),
			},
			items: {
				type: [WhyChooseUsItemSchema],
				default: [],
			},
			enabled: { type: Boolean, default: true },
		},

		mapSection: {
			enabled: { type: Boolean, default: true },
			useBrowserGeolocation: { type: Boolean, default: true },
			fallbackLat: { type: Number, default: null },
			fallbackLng: { type: Number, default: null },
			zoom: { type: Number, default: 7, min: 1, max: 20 },
		},

		updatedBy: { type: String, default: "" },
		updatedByEmail: { type: String, default: "" },
	},
	{
		timestamps: true,
		collection: "HomeSettings",
	},
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type HomeSettingsDocument = InferSchemaType<typeof HomeSettingsSchema>;
type HomeSettingsModel = Model<HomeSettingsDocument>;

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

const HomeSettings =
	(mongoose.models.HomeSettings as HomeSettingsModel | undefined) ||
	mongoose.model<HomeSettingsDocument, HomeSettingsModel>(
		"HomeSettings",
		HomeSettingsSchema,
	);

export default HomeSettings;