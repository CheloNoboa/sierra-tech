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
 *
 *   Reglas:
 *   - Existe una sola entidad global.
 *   - Este módulo controla contenido editorial del Home.
 *   - No debe duplicar branding global de SiteSettings.
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
  { _id: false }
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
  { _id: false }
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
  { _id: false }
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
  }
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
    HomeSettingsSchema
  );

export default HomeSettings;