/**
 * ============================================================================
 * 📌 File: src/lib/security/roles.ts
 * ============================================================================
 *
 * ES:
 * Definición oficial de roles del sistema para la plataforma base.
 *
 * Propósito:
 * - Centralizar la definición de roles del sistema
 * - Declarar los permisos explícitos asignados a cada rol
 * - Servir como fuente única de verdad para el seeder de seguridad
 *
 * Alcance:
 * - Este archivo define únicamente la estructura y el catálogo base de roles
 * - La persistencia en base de datos se realiza desde el seeder de seguridad
 * - Los permisos referenciados deben existir en `src/lib/security/permissions.ts`
 *
 * Diseño:
 * - Cada rol tiene un `code` único y estable
 * - Los nombres localizados (`name_es`, `name_en`) están orientados a UI administrativa
 * - La propiedad `permissions` contiene códigos de permisos explícitos
 * - `scope` y `branch_limited` se mantienen como parte del contrato del modelo,
 *   aunque en esta base los roles definidos operan con alcance global
 *
 * EN:
 * Official system role definitions for the reusable platform base.
 * ============================================================================
 */

export interface RoleDef {
  /**
   * Internal unique role identifier.
   * Used as the canonical code across backend, seeders and UI.
   */
  code: string;

  /**
   * Localized role names for administrative interfaces.
   */
  name_es: string;
  name_en: string;

  /**
   * Explicit list of assigned permission codes.
   *
   * Conventions:
   * - "*" grants full access
   * - "module.action" references a concrete permission defined in permissions.ts
   */
  permissions: string[];

  /**
   * Logical role scope.
   * Preserved as part of the security contract.
   */
  scope: "GLOBAL" | "BRANCH";

  /**
   * Indicates whether the role is restricted to branch-level visibility.
   * Preserved for compatibility with the role model contract.
   */
  branch_limited: boolean;
}

/* ============================================================================
 * Official roles
 * ----------------------------------------------------------------------------
 * Notes:
 * - The order is intentional and reflects privilege hierarchy
 * - `superadmin` has unrestricted access
 * - `admin` has full operational access within the base administrative modules
 * - `user` is the minimal authenticated administrative profile
 * ========================================================================== */
export const ROLES: RoleDef[] = [
  {
    code: "superadmin",
    name_es: "Super Administrador",
    name_en: "Super Administrator",
    permissions: ["*"],
    scope: "GLOBAL",
    branch_limited: false,
  },
  {
    code: "admin",
    name_es: "Administrador",
    name_en: "Administrator",
    permissions: [
      "system.dashboard.view",

      "users.view",
      "users.create",
      "users.update",
      "users.delete",

      "roles.view",
      "roles.update",

      "settings.view",
      "settings.update",

      "policies.view",
      "policies.update",
      "policies.history",
    ],
    scope: "GLOBAL",
    branch_limited: false,
  },
  {
    code: "user",
    name_es: "Usuario",
    name_en: "User",
    permissions: ["system.dashboard.view"],
    scope: "GLOBAL",
    branch_limited: false,
  },
];