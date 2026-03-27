/**
 * =============================================================================
 * 📌 Model: User
 * Path: src/models/User.ts
 * =============================================================================
 *
 * ES:
 * Modelo Mongoose para usuarios de la plataforma base.
 *
 * Responsabilidades:
 * - Identidad básica del usuario
 * - Autenticación local / OAuth
 * - Rol dinámico desde la colección de roles
 * - Auditoría mínima de acceso y recuperación de contraseña
 *
 * Decisiones:
 * - NO usa enums quemados para roles
 * - Los roles provienen dinámicamente de la colección "Roles"
 * - Sin dependencia de sucursales o del dominio FastFood
 *
 * EN:
 * Mongoose model for platform users.
 * =============================================================================
 */

import { Schema, Document, Model, models, model, Types } from "mongoose";

/* =============================================================================
 * Dynamic user role
 * - Roles are stored and managed in the Roles collection.
 * ============================================================================= */
export type UserRole = string;

/* =============================================================================
 * User document interface
 * ============================================================================= */
export interface IUser extends Document {
  _id: Types.ObjectId;

  name: string;
  email: string;
  password?: string | null;
  phone?: string | null;
  role: UserRole;
  provider: "credentials" | "google";
  isRegistered: boolean;

  createdAt: Date;
  updatedAt: Date;

  lastLogin?: Date | null;

  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
}

/* =============================================================================
 * Mongoose schema
 * ============================================================================= */
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    password: {
      type: String,
      default: null,
    },

    phone: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },

    isRegistered: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    resetToken: {
      type: String,
      default: null,
    },

    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "Users",
    timestamps: true,
  }
);

/* =============================================================================
 * Safe export for Next.js hot reload
 * ============================================================================= */
const UserModel: Model<IUser> =
  models.User ?? model<IUser>("User", UserSchema);

export default UserModel;