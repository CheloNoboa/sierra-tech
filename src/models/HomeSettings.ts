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

      /**
       * Etiqueta editorial del CTA hacia Google Maps u otro destino equivalente.
       * El contenido se conserva aunque el botón esté oculto, para permitir
       * reutilización futura sin perder traducciones ya cargadas.
       */
      openMapsLabel: {
        type: LocalizedTextSchema,
        default: () => ({ es: "", en: "" }),
      },

      /**
       * Control explícito de visibilidad del botón de ubicación.
       * Regla:
       * - No depende de que exista texto en openMapsLabel.
       * - No depende de que el mapa embebido esté habilitado.
       * - Permite mostrar cobertura sin exponer CTA de ubicación.
       */
      showOpenMapsLink: { type: Boolean, default: false },

      enabled: { type: Boolean, default: true },
    },

    /**
     * Bloque institucional "Nosotros".
     * Permite explicar quiénes son, qué hacen y cuál es su enfoque,
     * acompañado de highlights breves y editables.
     */
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

    /**
     * Bloque de liderazgo / visión institucional.
     * Diseñado para mostrar una figura visible del negocio sin convertir
     * la portada en un perfil personal excesivo.
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
      imageUrl: { type: String, default: "" },
      enabled: { type: Boolean, default: true },
    },

    /**
     * Bloque "Por qué elegirnos".
     * Presenta razones breves y estructuradas en formato de cards o grid.
     */
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
      /**
       * Controla la visibilidad del mapa embebido.
       * Si está deshabilitado, cualquier lógica de geolocalización debe ignorarse
       * en la capa de frontend.
       */
      enabled: { type: Boolean, default: true },

      /**
       * Permite centrar el mapa usando la geolocalización del navegador.
       * Solo tiene efecto si el mapa está habilitado y renderizado.
       */
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