import mongoose, { Model, Schema } from "mongoose";

/**
 * =============================================================================
 * 📄 Model: ServiceClass
 * Path: src/models/ServiceClass.ts
 * =============================================================================
 *
 * ES:
 * Catálogo administrable de clases de servicio del negocio.
 *
 * Responsabilidades:
 * - Servir como fuente de verdad para formularios públicos y privados.
 * - Permitir clasificación comercial estable de solicitudes.
 * - Soportar contenido bilingüe (ES / EN).
 * - Permitir activación/desactivación sin eliminar referencias históricas.
 * - Mantener orden visual configurable.
 *
 * Reglas:
 * - `key` debe ser único.
 * - `label` es obligatorio en ES y EN.
 * - `description` se conserva bilingüe y puede iniciar vacía.
 * - `enabled` permite desactivar sin borrar.
 * - `order` controla el orden de presentación.
 *
 * Nota técnica:
 * - En desarrollo, Next.js + Mongoose pueden reutilizar un modelo viejo
 *   ya compilado en memoria.
 * - Para asegurar que cambios del schema (como `description`) se reflejen
 *   inmediatamente, este archivo elimina el modelo previo antes de recompilarlo.
 *
 * EN:
 * Administrable catalog of service classes used across the system.
 * =============================================================================
 */

export interface LocalizedTextValue {
  es: string;
  en: string;
}

export interface ServiceClassDocument extends mongoose.Document {
  key: string;
  label: LocalizedTextValue;
  description: LocalizedTextValue;
  enabled: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceClassSchema = new Schema<ServiceClassDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: {
      es: {
        type: String,
        required: true,
        trim: true,
      },
      en: {
        type: String,
        required: true,
        trim: true,
      },
    },
    description: {
      es: {
        type: String,
        trim: true,
        default: "",
      },
      en: {
        type: String,
        trim: true,
        default: "",
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "ServiceClass",
  }
);

ServiceClassSchema.index({ order: 1 });
ServiceClassSchema.index({ enabled: 1 });
ServiceClassSchema.index({ key: 1 }, { unique: true });

/**
 * -----------------------------------------------------------------------------
 * Dev-safe recompilation
 * -----------------------------------------------------------------------------
 * ES:
 * - Si el modelo ya existe en memoria con una versión anterior del schema,
 *   se elimina y se recompila para asegurar consistencia.
 *
 * EN:
 * - If a previous in-memory compiled version exists, remove it and rebuild it
 *   so schema changes are reflected immediately.
 * -----------------------------------------------------------------------------
 */
if (mongoose.models.ServiceClass) {
  delete mongoose.models.ServiceClass;
}

const ServiceClass: Model<ServiceClassDocument> = mongoose.model<ServiceClassDocument>(
  "ServiceClass",
  ServiceClassSchema
);

export default ServiceClass;