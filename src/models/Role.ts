/**
 * ============================================================================
 * 📌 Módulo: src/models/Role.ts
 * ----------------------------------------------------------------------------
 * ES:
 *   Modelo de Roles del sistema FastFood.
 *   Cada rol tiene:
 *     - code        → identificador interno (ej: "superadmin", "admin", "user")
 *     - name_es     → nombre visible en español
 *     - name_en     → nombre visible en inglés
 *     - permissions → lista de códigos de permiso (strings), NO ObjectId.
 *
 * EN:
 *   Role model for the FastFood system.
 *   Each role has:
 *     - code        → internal identifier (e.g. "superadmin", "admin", "user")
 *     - name_es     → display name in Spanish
 *     - name_en     → display name in English
 *     - permissions → list of permission codes (strings), NOT ObjectIds.
 *
 * Notas:
 *   - 100% tipado estricto (sin any).
 *   - Sin warnings de TypeScript.
 *   - Compatible con el seeder oficial de seguridad.
 * ============================================================================
 */

import {
  Schema,
  model,
  models,
  Model,
  Document,
  Types,
} from "mongoose";

/* ============================================================================
 * 🎯 Interfaz de Rol (TypeScript)
 * ========================================================================== */

export interface IRole extends Document<Types.ObjectId> {
  _id: Types.ObjectId;

  /** Código interno del rol (ej: "superadmin", "admin", "user") */
  code: string;

  /** Nombre visible en ES */
  name_es: string;

  /** Nombre visible en EN */
  name_en: string;

  /** Lista de códigos de permisos (ej: "products.view") */
  permissions: string[];

  /** Auditoría */
  createdAt: Date;
  updatedAt: Date;
}

/* ============================================================================
 * 🧱 Esquema de Roles
 * ========================================================================== */

const RoleSchema = new Schema<IRole>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    name_es: {
      type: String,
      required: true,
      trim: true,
    },

    name_en: {
      type: String,
      required: true,
      trim: true,
    },

    permissions: {
      type: [String],
      required: true,
      default: [],
    },
  },
  {
    collection: "Roles",
    timestamps: true,
  }
);

/* ============================================================================
 * 🚀 Exportación segura para Next.js (HMR safe)
 * ========================================================================== */

const Role: Model<IRole> =
  (models.Role as Model<IRole>) || model<IRole>("Role", RoleSchema);

export default Role;
