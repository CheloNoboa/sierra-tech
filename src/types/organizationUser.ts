/**
 * =============================================================================
 * 📄 Type Definitions: Organization User
 * Path: src/types/organizationUser.ts
 * =============================================================================
 *
 * ES:
 *   Contratos tipados del módulo de Usuarios de Organización.
 *
 *   Propósito:
 *   - Definir la forma estable de los usuarios cliente asociados
 *     a una organización.
 *   - Compartir un contrato único entre:
 *     - modelos
 *     - endpoints administrativos
 *     - formularios
 *     - DataGrid
 *     - autenticación y vistas futuras
 *
 *   Alcance:
 *   - Tipos base de rol y estado
 *   - Entidad principal OrganizationUser
 *   - Payloads administrativos para creación y actualización
 *   - Filtros mínimos para listados
 *
 *   Reglas:
 *   - Un usuario de organización siempre pertenece a una organización
 *   - email debe tratarse como identificador lógico único
 *   - passwordHash no debe exponerse en respuestas públicas o administrativas
 *
 * EN:
 *   Shared type contracts for the Organization Users module.
 * =============================================================================
 */

export type OrganizationUserRole = "org_admin" | "org_user";
export type OrganizationUserStatus = "active" | "inactive";

/**
 * Entidad principal de usuario de organización.
 *
 * Representa una persona con acceso autenticado al sistema en nombre
 * de una organización específica.
 */
export interface OrganizationUser {
  _id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: OrganizationUserRole;
  status: OrganizationUserStatus;
  isRegistered: boolean;
  activationStatus: "pending" | "completed";
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Variante interna usada cuando se necesita transportar también el password hash.
 *
 * Debe reservarse para backend/modelo y no para respuestas UI.
 */
export interface OrganizationUserRecord extends OrganizationUser {
  passwordHash: string;
}

/**
 * Payload administrativo para crear un usuario de organización.
 *
 * password plano se recibe solo en entrada; el hash se resuelve en backend.
 */
export interface CreateOrganizationUserInput {
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: OrganizationUserRole;
  status?: OrganizationUserStatus;
}

/**
 * Payload administrativo para actualizar un usuario.
 *
 * password es opcional y solo aplica cuando se desea reemplazar la credencial.
 */
export interface UpdateOrganizationUserInput {
  organizationId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  role?: OrganizationUserRole;
  status?: OrganizationUserStatus;
}

/**
 * Filtros mínimos para listados administrativos de usuarios.
 */
export interface OrganizationUserFilters {
  query: string;
  organizationId: string | "all";
  role: OrganizationUserRole | "all";
  status: OrganizationUserStatus | "all";
}

/**
 * Resumen listo para grillas administrativas.
 *
 * Incluye datos resueltos de organización para evitar lógica repetida en UI.
 */
export interface OrganizationUserRow extends OrganizationUser {
  organizationName: string;
}