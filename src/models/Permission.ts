/**
 * =============================================================================
 * 📌 Modelo: Permission
 * Ruta: src/models/Permission.ts
 * =============================================================================
 * ES:
 *   Modelo oficial de Permisos del sistema FastFood.
 *
 *   ✔ Ya NO convierte code a MAYÚSCULAS.
 *   ✔ Totalmente alineado con src/lib/security/permissions.ts.
 *   ✔ Acepta códigos tal como están definidos ("branches.view", etc.)
 *
 * EN:
 *   Official Permission model — now matches lowercase permission codes.
 *
 * Autor UI/UX: Marcelo Noboa
 * Mantención técnica: IA Asistida (ChatGPT)
 * Última actualización: 2025-12-09
 * =============================================================================
 */

import {
  Schema,
  model,
  models,
  Model,
  Document,
} from "mongoose";

/* =============================================================================
 * 🎯 Dominios de permisos
 * =============================================================================
 */

/** System modules where a permission can exist */
export type PermissionModule =
  | "system"
  | "branches"
  | "users"
  | "roles"
  | "products"
  | "categories"
  | "combos"
  | "orders"
  | "settings"
  | "policies";

/** Permission scope (global or branch-local) */
export type PermissionScope = "GLOBAL" | "BRANCH";

/* =============================================================================
 * 🧩 Interfaz IPermission
 * =============================================================================
 */

export interface IPermission extends Document {
  code: string;
  module: PermissionModule;
  scope: PermissionScope;

  name_es: string;
  name_en: string;

  description_es: string;
  description_en: string;

  createdAt: Date;
  updatedAt: Date;
}

/* =============================================================================
 * 🧱 Esquema de Permisos
 * =============================================================================
 */

const PermissionSchema = new Schema<IPermission>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,   // ❗ Ya no se usa uppercase: true
      index: true,
    },

    module: {
      type: String,
      enum: [
        "system",
        "branches",
        "users",
        "roles",
        "products",
        "categories",
        "combos",
        "orders",
        "settings",
        "policies",
      ],
      required: true,
    },

    scope: {
      type: String,
      enum: ["GLOBAL", "BRANCH"],
      default: "GLOBAL",
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

    description_es: {
      type: String,
      default: "",
      trim: true,
    },

    description_en: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    collection: "Permissions",
    timestamps: true,
  }
);

/* =============================================================================
 * 🚀 Export (dev-safe)
 * =============================================================================
 * ES:
 *   En Next.js (dev/hot-reload) Mongoose puede conservar el modelo anterior,
 *   ignorando cambios en enums del schema. En desarrollo, eliminamos el modelo
 *   existente para recompilar con el schema actualizado.
 *
 * EN:
 *   In Next.js dev/hot-reload, Mongoose may keep an old compiled model and
 *   ignore schema enum updates. In development, we delete the existing model
 *   to recompile with the updated schema.
 */

const modelRegistry = models as unknown as Record<string, Model<unknown>>;

if (process.env.NODE_ENV !== "production" && modelRegistry.Permission) {
  delete modelRegistry.Permission;
}

const Permission: Model<IPermission> = modelRegistry.Permission
  ? (modelRegistry.Permission as Model<IPermission>)
  : model<IPermission>("Permission", PermissionSchema);

export default Permission;
