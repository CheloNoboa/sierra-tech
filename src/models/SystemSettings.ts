/**
 * src/models/SystemSettings.ts
 * -------------------------------------------------------------------
 * ⚙️ SystemSettings — Configuración Global del Sistema
 * -------------------------------------------------------------------
 * Almacena parámetros administrativos generales.
 * Ejemplos:
 *   - { key: "recordsPerPage", value: 10, module: "products" }
 *   - { key: "defaultCurrency", value: "USD" }
 *   - { key: "autoTranslate", value: true, module: "products" }
 * -------------------------------------------------------------------
 */

import { Schema, model, models, Document } from "mongoose";

/**
 * Estructura de un parámetro de configuración.
 */
export interface ISystemSetting extends Document {
  key: string; // Identificador único del parámetro
  value: unknown; // Valor flexible (string, number, boolean, object)
  description?: string;
  module?: string;
  autoTranslate?: boolean;
  updatedAt?: Date;
  lastModifiedBy?: string | null;
  lastModifiedEmail?: string | null;
}

const SystemSettingsSchema = new Schema<ISystemSetting>(
  {
    key: {
      type: String,
      required: [true, "La clave del parámetro es obligatoria"],
      unique: true,
      trim: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, "El valor del parámetro es obligatorio"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    module: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * Nuevo campo: indica si se habilita traducción automática en un módulo.
     */
    autoTranslate: {
      type: Boolean,
      default: false,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastModifiedBy: {
      type: String,
      trim: true,
      default: null,
    },
    lastModifiedEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
  },
  {
    collection: "SystemSettings",
    versionKey: false,
    timestamps: true, // createdAt / updatedAt automáticos
  }
);

/**
 * Evita recompilación del modelo durante Hot Reload en Next.js.
 */
export default models.SystemSettings ||
  model<ISystemSetting>("SystemSettings", SystemSettingsSchema);
