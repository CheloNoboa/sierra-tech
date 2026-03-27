/**
 * ============================================================================
 * 📌 File: src/lib/security/permissions.ts
 * ============================================================================
 *
 * ES:
 * Sistema oficial de permisos para la base reusable.
 *
 * Estructura alineada con el modelo Mongoose Permission.ts:
 * - code
 * - module
 * - scope
 * - name_es / name_en
 * - description_es / description_en
 *
 * Decisiones:
 * - Se eliminan permisos del dominio anterior:
 *   products, categories, branches, combos, etc.
 * - Se conservan únicamente permisos administrativos base:
 *   system, users, roles, settings, policies
 * - Sin ANY
 * - Fuente única de verdad (SSOT)
 *
 * EN:
 * Official permissions registry for the reusable platform base.
 * ============================================================================
 */

import type { PermissionModule, PermissionScope } from "@/models/Permission";

export interface PermissionDef {
  code: string;
  module: PermissionModule;
  scope: PermissionScope;
  name_es: string;
  name_en: string;
  description_es: string;
  description_en: string;
}

/* ============================================================================
 * Official permissions
 * ========================================================================== */
export const PERMISSIONS: PermissionDef[] = [
  // ========================== SYSTEM ==========================
  {
    code: "system.dashboard.view",
    module: "system",
    scope: "GLOBAL",
    name_es: "Ver dashboard",
    name_en: "View dashboard",
    description_es: "Permite ver el panel principal administrativo.",
    description_en: "Allows viewing the main admin dashboard.",
  },

  // ========================== USERS ==========================
  {
    code: "users.view",
    module: "users",
    scope: "GLOBAL",
    name_es: "Ver usuarios",
    name_en: "View users",
    description_es: "Puede visualizar usuarios del sistema.",
    description_en: "Can view system users.",
  },
  {
    code: "users.create",
    module: "users",
    scope: "GLOBAL",
    name_es: "Crear usuarios",
    name_en: "Create users",
    description_es: "Puede crear nuevos usuarios.",
    description_en: "Can create new users.",
  },
  {
    code: "users.update",
    module: "users",
    scope: "GLOBAL",
    name_es: "Editar usuarios",
    name_en: "Edit users",
    description_es: "Puede editar usuarios existentes.",
    description_en: "Can edit existing users.",
  },
  {
    code: "users.delete",
    module: "users",
    scope: "GLOBAL",
    name_es: "Eliminar usuarios",
    name_en: "Delete users",
    description_es: "Puede eliminar usuarios.",
    description_en: "Can delete users.",
  },

  // ========================== ROLES ==========================
  {
    code: "roles.view",
    module: "roles",
    scope: "GLOBAL",
    name_es: "Ver roles",
    name_en: "View roles",
    description_es: "Puede visualizar roles del sistema.",
    description_en: "Can view system roles.",
  },
  {
    code: "roles.update",
    module: "roles",
    scope: "GLOBAL",
    name_es: "Editar roles",
    name_en: "Edit roles",
    description_es: "Puede editar roles del sistema.",
    description_en: "Can edit system roles.",
  },

  // ========================== SETTINGS ==========================
  {
    code: "settings.view",
    module: "settings",
    scope: "GLOBAL",
    name_es: "Ver configuraciones",
    name_en: "View settings",
    description_es: "Puede visualizar configuraciones del sistema.",
    description_en: "Can view system settings.",
  },
  {
    code: "settings.update",
    module: "settings",
    scope: "GLOBAL",
    name_es: "Editar configuraciones",
    name_en: "Update settings",
    description_es: "Puede modificar configuraciones del sistema.",
    description_en: "Can update system settings.",
  },

  // ========================== POLICIES ==========================
  {
    code: "policies.view",
    module: "policies",
    scope: "GLOBAL",
    name_es: "Ver políticas",
    name_en: "View policies",
    description_es: "Puede visualizar políticas del sistema.",
    description_en: "Can view system policies.",
  },
  {
    code: "policies.update",
    module: "policies",
    scope: "GLOBAL",
    name_es: "Editar políticas",
    name_en: "Edit policies",
    description_es: "Puede editar políticas del sistema.",
    description_en: "Can edit system policies.",
  },
  {
    code: "policies.history",
    module: "policies",
    scope: "GLOBAL",
    name_es: "Ver historial de políticas",
    name_en: "View policy history",
    description_es: "Puede ver el historial de cambios en políticas.",
    description_en: "Can view policy change history.",
  },
];