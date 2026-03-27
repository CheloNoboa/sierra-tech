/**
 * src/models/CookiePolicy.ts
 * -------------------------------------------------------------------
 * 🍪 CookiePolicy — Política de Cookies
 * -------------------------------------------------------------------
 * Estructura equivalente a TermsPolicy y PrivacyPolicy:
 * - lang: Idioma ("es" | "en")
 * - title: Título principal de la política
 * - sections: Contenido dividido por bloques
 * - updatedAt: Última actualización manual
 * - lastModifiedBy / lastModifiedEmail: Auditoría básica
 * -------------------------------------------------------------------
 */

import { Schema, model, models, Document } from "mongoose";

/**
 * Sección individual de la política.
 */
export interface ICookieSection {
  heading: string;
  content: string;
}

/**
 * Documento completo de CookiePolicy.
 */
export interface ICookiePolicy extends Document {
  lang: "es" | "en";
  title: string;
  sections: ICookieSection[];
  updatedAt?: Date;
  lastModifiedBy?: string | null;
  lastModifiedEmail?: string | null;
}

const CookieSectionSchema = new Schema<ICookieSection>(
  {
    heading: {
      type: String,
      required: [true, "El encabezado de la sección es obligatorio"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "El contenido de la sección es obligatorio"],
      trim: true,
    },
  },
  {
    _id: false, // Evita IDs internos en cada sección
  }
);

const CookiePolicySchema = new Schema<ICookiePolicy>(
  {
    lang: {
      type: String,
      enum: ["es", "en"],
      required: [true, "El idioma es obligatorio"],
      index: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "El título es obligatorio"],
      trim: true,
    },
    sections: {
      type: [CookieSectionSchema],
      default: [],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastModifiedBy: {
      type: String,
      default: null,
      trim: true,
    },
    lastModifiedEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
  },
  {
    collection: "CookiePolicy",
    timestamps: true, // createdAt / updatedAt automáticos
    versionKey: false,
  }
);

/**
 * Previene recompilación del modelo durante Hot Reload en Next.js.
 */
export default models.CookiePolicy ||
  model<ICookiePolicy>("CookiePolicy", CookiePolicySchema);
