/**
 * =============================================================================
 * 📌 Model: User
 * Path: src/models/User.ts
 * =============================================================================
 *
 * ES:
 * Modelo Mongoose oficial para usuarios internos de Sierra Tech.
 *
 * Propósito:
 * - representar identidad autenticable de usuarios internos
 * - soportar login local por credentials y acceso por Google OAuth
 * - mantener rol dinámico resuelto desde la colección Roles
 * - exponer estado activo/inactivo para control de acceso
 * - conservar trazabilidad mínima de acceso y recuperación
 *
 * Alcance:
 * - este modelo representa únicamente usuarios internos del sistema
 * - NO representa usuarios cliente del portal
 * - los usuarios cliente viven en la colección OrganizationUsers
 *
 * Decisiones:
 * - role permanece dinámico como string
 * - status unifica reglas de acceso con OrganizationUsers
 * - collection se fija explícitamente como "Users"
 * - password puede ser null para usuarios OAuth
 * - los índices simples se definen directamente a nivel de campo
 *   para evitar duplicidad y ruido en runtime
 *
 * Responsabilidad:
 * - persistencia de identidad interna
 * - no contiene lógica de autenticación ni autorización
 *
 * EN:
 * Official Mongoose model for Sierra Tech internal users.
 * =============================================================================
 */

import { Schema, Document, Model, models, model, Types } from "mongoose";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Rol dinámico proveniente de la colección Roles.
 * No se quema como enum porque el catálogo es administrable.
 */
export type UserRole = string;

/**
 * Estado operativo del usuario interno.
 * Se utiliza para permitir o bloquear acceso a la plataforma.
 */
export type UserStatus = "active" | "inactive";

/* -------------------------------------------------------------------------- */
/* 📄 Documento                                                               */
/* -------------------------------------------------------------------------- */

export interface IUser extends Document {
  _id: Types.ObjectId;

  /**
   * Nombre visible del usuario interno.
   */
  name: string;

  /**
   * Email único global dentro de la colección Users.
   */
  email: string;

  /**
   * Hash de contraseña para provider = credentials.
   * Puede ser null en usuarios creados por OAuth.
   */
  password?: string | null;

  /**
   * Teléfono opcional.
   */
  phone?: string | null;

  /**
   * Código de rol dinámico.
   * Ejemplo: superadmin, admin, staff, etc.
   */
  role: UserRole;

  /**
   * Estado de activación del usuario.
   */
  status: UserStatus;

  /**
   * Proveedor de identidad.
   */
  provider: "credentials" | "google";

  /**
   * Marca histórica utilizada por la plataforma base.
   * Se conserva por compatibilidad.
   */
  isRegistered: boolean;

  /**
   * Último acceso conocido del usuario.
   */
  lastLogin?: Date | null;

  /**
   * Token temporal de recuperación.
   */
  resetToken?: string | null;

  /**
   * Expiración del token temporal de recuperación.
   */
  resetTokenExpiry?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* 🧩 Schema                                                                  */
/* -------------------------------------------------------------------------- */

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
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
      index: true,
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
    versionKey: false,
  }
);

/* -------------------------------------------------------------------------- */
/* 🧠 Modelo                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Safe export para entorno Next.js con hot reload.
 * Evita recompilar el modelo múltiples veces.
 */
const UserModel: Model<IUser> = models.User ?? model<IUser>("User", UserSchema);

export default UserModel;