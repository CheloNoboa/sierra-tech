import mongoose, { Model, Schema } from "mongoose";

/**
 * =============================================================================
 * 📄 Model: ContactRequest
 * Path: src/models/ContactRequest.ts
 * =============================================================================
 *
 * ES:
 * Modelo persistente para solicitudes públicas de contacto del sitio.
 *
 * Responsabilidades:
 * - Almacenar solicitudes generales, de asesoría, cotización y soporte.
 * - Persistir clasificación de servicio usando:
 *   - serviceClassKey
 *   - serviceClassSnapshot
 * - Servir como fuente de verdad para módulos admin/CRM futuros.
 *
 * Reglas:
 * - source identifica el origen del lead.
 * - status permite gestionar el flujo comercial después.
 * - serviceClassKey puede venir vacío en flujos donde no aplique.
 * - serviceClassSnapshot conserva el nombre visible al momento del envío.
 *
 * EN:
 * Persistent model for public website contact requests.
 * =============================================================================
 */

export type ContactIntent = "general" | "advisory" | "quote" | "support";
export type ContactSource = "public_site";
export type ContactStatus = "new" | "in_review" | "closed";

export interface LocalizedSnapshot {
  es: string;
  en: string;
}

export interface ContactRequestDocument extends mongoose.Document {
  intent: ContactIntent;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  location?: string;
  serviceClassKey?: string;
  serviceClassSnapshot: LocalizedSnapshot;
  message: string;
  source: ContactSource;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ALLOWED_INTENTS: ContactIntent[] = [
  "general",
  "advisory",
  "quote",
  "support",
];

const ALLOWED_STATUSES: ContactStatus[] = ["new", "in_review", "closed"];

const ContactRequestSchema = new Schema<ContactRequestDocument>(
  {
    intent: {
      type: String,
      enum: ALLOWED_INTENTS,
      required: true,
      default: "general",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    serviceClassKey: {
      type: String,
      trim: true,
      default: "",
    },
    serviceClassSnapshot: {
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
    message: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      required: true,
      default: "public_site",
    },
    status: {
      type: String,
      enum: ALLOWED_STATUSES,
      required: true,
      default: "new",
    },
  },
  {
    timestamps: true,
    collection: "ContactRequest",
  }
);

ContactRequestSchema.index({ createdAt: -1 });
ContactRequestSchema.index({ intent: 1, createdAt: -1 });
ContactRequestSchema.index({ email: 1, createdAt: -1 });
ContactRequestSchema.index({ status: 1, createdAt: -1 });
ContactRequestSchema.index({ serviceClassKey: 1, createdAt: -1 });

const ContactRequest: Model<ContactRequestDocument> =
  mongoose.models.ContactRequest ||
  mongoose.model<ContactRequestDocument>(
    "ContactRequest",
    ContactRequestSchema
  );

export default ContactRequest;