/**
 * =============================================================================
 * 📄 Model: OrganizationUser
 * Path: src/models/OrganizationUser.ts
 * =============================================================================
 *
 * ES:
 *   Modelo de persistencia para usuarios de organización.
 *
 *   Propósito:
 *   - Representar usuarios autenticables vinculados a una organización.
 *   - Controlar acceso al portal cliente.
 *
 *   Decisiones:
 *   - Relación obligatoria con Organization
 *   - email único global
 *   - password almacenado como hash
 *   - fullName persistido para optimizar UI y búsquedas
 *   - no eliminación física → uso de status
 *
 *   Responsabilidad:
 *   - Persistencia de identidad de usuario
 *   - No contiene lógica de autenticación
 *
 * EN:
 *   Persistence model for organization users.
 * =============================================================================
 */

import mongoose, { Schema, Model, models } from "mongoose";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

export type OrganizationUserRole = "org_admin" | "org_user";
export type OrganizationUserStatus = "active" | "inactive";

export interface OrganizationUserDocument {
  _id: mongoose.Types.ObjectId;

  organizationId: mongoose.Types.ObjectId;

  firstName: string;
  lastName: string;
  fullName: string;

  email: string;
  passwordHash: string;

  role: OrganizationUserRole;
  status: OrganizationUserStatus;

  lastLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* 🧩 Schema                                                                  */
/* -------------------------------------------------------------------------- */

const OrganizationUserSchema = new Schema<OrganizationUserDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["org_admin", "org_user"],
      default: "org_user",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* -------------------------------------------------------------------------- */
/* 🧠 Modelo                                                                  */
/* -------------------------------------------------------------------------- */

const OrganizationUserModel: Model<OrganizationUserDocument> =
  models.OrganizationUser ||
  mongoose.model<OrganizationUserDocument>(
    "OrganizationUser",
    OrganizationUserSchema
  );

export default OrganizationUserModel;