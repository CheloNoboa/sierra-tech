/**
 * src/models/PrivacyAuditLog.ts
 * -------------------------------------------------------------------
 * 🧾 PrivacyAuditLog — Registro de Auditoría de Cambios
 * -------------------------------------------------------------------
 * Guarda cada modificación realizada por un administrador en las
 * políticas de privacidad.
 *
 * Campos:
 * - lang: Idioma de la política ("es" | "en")
 * - modifiedBy: Nombre del administrador que realizó el cambio
 * - modifiedEmail: Email del admin
 * - modifiedAt: Fecha/hora del cambio (auto)
 * - changes: Descripción del cambio realizado
 * -------------------------------------------------------------------
 */

import { Schema, model, models, Document } from "mongoose";

/**
 * Interface del registro de auditoría
 */
export interface IPrivacyAuditLog extends Document {
  lang: "es" | "en";
  modifiedBy: string;
  modifiedEmail: string;
  modifiedAt: Date;
  changes: string;
}

const PrivacyAuditLogSchema = new Schema<IPrivacyAuditLog>(
  {
    lang: {
      type: String,
      enum: ["es", "en"],
      required: [true, "El idioma es obligatorio"],
      trim: true,
    },
    modifiedBy: {
      type: String,
      required: [true, "El nombre del administrador es obligatorio"],
      trim: true,
    },
    modifiedEmail: {
      type: String,
      required: [true, "El email del administrador es obligatorio"],
      trim: true,
      lowercase: true,
    },
    modifiedAt: {
      type: Date,
      default: Date.now,
    },
    changes: {
      type: String,
      required: [true, "La descripción del cambio es obligatoria"],
      trim: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
    collection: "PrivacyAuditLog",
  }
);

/**
 * Previene recompilación del modelo durante Hot Reload en Next.js
 */
export default models.PrivacyAuditLog ||
  model<IPrivacyAuditLog>("PrivacyAuditLog", PrivacyAuditLogSchema);
