/**
 * =============================================================================
 * 📄 Type Definitions: Organization
 * Path: src/types/organization.ts
 * =============================================================================
 *
 * ES:
 *   Contratos tipados del módulo de Organizaciones.
 *
 *   Propósito:
 *   - Definir la forma estable de una organización dentro del sistema.
 *   - Servir como contrato compartido entre:
 *     - modelos
 *     - endpoints administrativos
 *     - formularios
 *     - DataGrid
 *     - vistas futuras relacionadas
 *
 *   Alcance:
 *   - Tipos base de estado
 *   - Entidad principal Organization
 *   - Payloads administrativos para creación y actualización
 *   - Filtros básicos para listados
 *
 *   Regla:
 *   - taxId se maneja como string
 *   - status usa estados lógicos, no eliminación física
 *
 * EN:
 *   Shared type contracts for the Organizations module.
 * =============================================================================
 */

export type OrganizationStatus = "active" | "inactive";

/**
 * Entidad principal de organización.
 *
 * Representa una empresa o entidad corporativa registrada en Sierra Tech.
 */
export interface Organization {
	_id: string;
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
	createdAt: string;
	updatedAt: string;
}

/**
 * Payload administrativo para crear una organización.
 *
 * createdAt / updatedAt / _id son resueltos por persistencia.
 */
export interface CreateOrganizationInput {
	legalName: string;
	commercialName?: string;
	taxId: string;
	primaryEmail: string;
	primaryPhone: string;
	website?: string;
	country?: string;
	city?: string;
	address?: string;
	status?: OrganizationStatus;
	notes?: string;
}

/**
 * Payload administrativo para actualizar una organización.
 *
 * Mantiene el mismo contrato de negocio del create, pero de forma parcial.
 */
export interface UpdateOrganizationInput {
	legalName?: string;
	commercialName?: string;
	taxId?: string;
	primaryEmail?: string;
	primaryPhone?: string;
	website?: string;
	country?: string;
	city?: string;
	address?: string;
	status?: OrganizationStatus;
	notes?: string;
}

/**
 * Filtros mínimos para listados administrativos.
 *
 * Pueden ser usados por DataGrid, endpoints y utilitarios de búsqueda.
 */
export interface OrganizationFilters {
	query: string;
	status: OrganizationStatus | "all";
}

/**
 * Opción simple reutilizable para selectores de organización.
 *
 * Útil en formularios de usuarios, proyectos y otras relaciones futuras.
 */
export interface OrganizationOption {
	_id: string;
	label: string;
	legalName: string;
	commercialName: string;
	status: OrganizationStatus;
}
