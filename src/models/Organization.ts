/**
 * =============================================================================
 * 📄 Model: Organization
 * Path: src/models/Organization.ts
 * =============================================================================
 *
 * ES:
 *   Modelo de persistencia para Organizaciones.
 *
 *   Propósito:
 *   - Representar entidades corporativas dentro del sistema.
 *   - Servir como entidad raíz para:
 *     - usuarios de organización
 *     - proyectos (futuro)
 *     - documentos (futuro)
 *
 *   Decisiones:
 *   - No eliminación física → uso de status
 *   - taxId se maneja como string (no number)
 *   - timestamps habilitados para trazabilidad
 *   - índices en campos de búsqueda frecuente
 *   - colección fijada explícitamente como "Organizations"
 *     para mantener consistencia con la convención del proyecto
 *
 *   Responsabilidad:
 *   - Persistencia de datos corporativos
 *   - No contiene lógica de negocio
 *
 * EN:
 *   Persistence model for organizations.
 * =============================================================================
 */

import mongoose, { Schema, Model, models } from "mongoose";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

export type OrganizationStatus = "active" | "inactive";

export interface OrganizationDocument {
  _id: mongoose.Types.ObjectId;

  legalName: string;
  commercialName: string;
  taxId: string;

  primaryEmail: string;
  primaryPhone: string;

  website?: string;

  country?: string;
  city?: string;
  address?: string;

  status: OrganizationStatus;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* 🧩 Schema                                                                  */
/* -------------------------------------------------------------------------- */

const OrganizationSchema = new Schema<OrganizationDocument>(
  {
    legalName: {
      type: String,
      required: true,
      trim: true,
    },

    commercialName: {
      type: String,
      default: "",
      trim: true,
    },

    taxId: {
      type: String,
      required: true,
      trim: true,
    },

    primaryEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    primaryPhone: {
      type: String,
      required: true,
      trim: true,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    country: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "Organizations",
  }
);

/* -------------------------------------------------------------------------- */
/* 🔎 Índices                                                                 */
/* -------------------------------------------------------------------------- */

OrganizationSchema.index({ legalName: 1 });
OrganizationSchema.index({ commercialName: 1 });
OrganizationSchema.index({ taxId: 1 });
OrganizationSchema.index({ primaryEmail: 1 });

/* -------------------------------------------------------------------------- */
/* 🧠 Modelo                                                                  */
/* -------------------------------------------------------------------------- */

const OrganizationModel: Model<OrganizationDocument> =
  models.Organization ||
  mongoose.model<OrganizationDocument>(
    "Organization",
    OrganizationSchema,
    "Organizations"
  );

export default OrganizationModel;