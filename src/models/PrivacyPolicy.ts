/**
 * ✅ src/models/PrivacyPolicy.ts
 * -------------------------------------------------------------------
 * 🔧 MODELO DE MONGOOSE — usa la colección “PrivacyPolicy”
 *  (tal como la tienes creada en MongoDB Atlas)
 * -------------------------------------------------------------------
 * Estructura:
 *   - lang: "es" | "en"
 *   - title: string
 *   - sections: [{ heading, content }]
 *   - updatedAt: Date (auto)
 *   - lastModifiedBy / lastModifiedEmail (auditoría admin)
 * -------------------------------------------------------------------
 */

import { Schema, Document, models, model } from "mongoose";

export interface IPrivacySection {
  heading: string;
  content: string;
}

export interface IPrivacyPolicy extends Document {
  lang: "es" | "en";
  title: string;
  sections: IPrivacySection[];
  updatedAt?: Date;
  lastModifiedBy?: string;
  lastModifiedEmail?: string;
}

const PrivacySectionSchema = new Schema<IPrivacySection>(
  {
    heading: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const PrivacyPolicySchema = new Schema<IPrivacyPolicy>(
  {
    lang: { type: String, enum: ["es", "en"], required: true, index: true },
    title: { type: String, required: true },
    sections: { type: [PrivacySectionSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },

    // 🆕 Auditoría
    lastModifiedBy: { type: String, default: null },
    lastModifiedEmail: { type: String, default: null },
  },
  {
    collection: "PrivacyPolicy", // 👈 Debe coincidir con Atlas
  }
);

// Usa el modelo existente o crea uno nuevo
export default models.PrivacyPolicy ||
  model<IPrivacyPolicy>("PrivacyPolicy", PrivacyPolicySchema);
