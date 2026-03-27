/**
 * =============================================================================
 * 📦 Model: Service
 * Path: src/models/Service.ts
 * =============================================================================
 *
 * ES:
 *   Modelo administrable para los servicios públicos de Sierra Tech.
 *
 *   Propósito:
 *   - Persistir servicios técnicos/comerciales del sitio público.
 *   - Mantener contenido bilingüe estructurado.
 *   - Soportar SEO, assets visuales, orden manual y adjuntos relacionados.
 *
 *   Reglas:
 *   - slug único por servicio.
 *   - status controla la visibilidad pública.
 *   - order controla el orden manual de despliegue.
 *   - attachments referencia documentos administrables.
 *   - technicalSpecs mantiene estructura fija, incluso con valores vacíos.
 *
 * EN:
 *   Manageable model for Sierra Tech public services.
 * =============================================================================
 */

import mongoose, {
  Schema,
  type InferSchemaType,
  type Model,
  Types,
} from "mongoose";

/* -------------------------------------------------------------------------- */
/* Shared sub-schemas                                                         */
/* -------------------------------------------------------------------------- */

const LocalizedTextSchema = new Schema(
  {
    es: { type: String, default: "", trim: true },
    en: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const ServiceGalleryItemSchema = new Schema(
  {
    url: { type: String, default: "", trim: true },
    alt: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },
    order: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const ServiceAttachmentRefSchema = new Schema(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    title: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const ServiceSeoSchema = new Schema(
  {
    metaTitle: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },
    metaDescription: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },
    image: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const ServiceTechnicalSpecsSchema = new Schema(
  {
    capacity: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },
    flowRate: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },
    material: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },
    application: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },
    technology: {
      type: LocalizedTextSchema,
      default: () => ({ es: "", en: "" }),
    },
  },
  { _id: false }
);

/* -------------------------------------------------------------------------- */
/* Main schema                                                                */
/* -------------------------------------------------------------------------- */

const ServiceSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    title: {
      type: LocalizedTextSchema,
      required: true,
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

    category: {
      type: String,
      required: true,
      default: "general",
      trim: true,
      lowercase: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    order: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      required: true,
      default: "draft",
    },

    coverImage: {
      type: String,
      default: "",
      trim: true,
    },

    gallery: {
      type: [ServiceGalleryItemSchema],
      default: [],
    },

    technicalSpecs: {
      type: ServiceTechnicalSpecsSchema,
      default: () => ({
        capacity: { es: "", en: "" },
        flowRate: { es: "", en: "" },
        material: { es: "", en: "" },
        application: { es: "", en: "" },
        technology: { es: "", en: "" },
      }),
    },

    seo: {
      type: ServiceSeoSchema,
      default: () => ({
        metaTitle: { es: "", en: "" },
        metaDescription: { es: "", en: "" },
        image: "",
      }),
    },

    attachments: {
      type: [ServiceAttachmentRefSchema],
      default: [],
    },

    updatedBy: {
      type: String,
      default: "",
      trim: true,
    },

    updatedByEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
    collection: "Service",
    minimize: false,
    versionKey: false,
  }
);

/* -------------------------------------------------------------------------- */
/* Indexes                                                                    */
/* -------------------------------------------------------------------------- */

ServiceSchema.index({ status: 1, order: 1 });
ServiceSchema.index({ category: 1, status: 1, order: 1 });
ServiceSchema.index({ featured: 1, status: 1, order: 1 });

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ServiceDocument = InferSchemaType<typeof ServiceSchema> & {
  _id: Types.ObjectId;
};

type ServiceModel = Model<ServiceDocument>;

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

const Service =
  (mongoose.models.Service as ServiceModel | undefined) ||
  mongoose.model<ServiceDocument, ServiceModel>("Service", ServiceSchema);

export default Service;