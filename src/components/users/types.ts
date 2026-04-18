/**
 * ============================================================================
 * 📄 Types — src/components/users/types.ts
 * ============================================================================
 * ES:
 * Tipos front-end para el módulo de Usuarios en la base reusable.
 *
 * Alineado con:
 * - API /api/admin/users
 * - UserModal
 * - UsersDataGrid
 *
 * Reglas:
 * - Sin ANY
 * - Sin sucursales
 * - Sin branchId
 * - Tipado estricto y consistente
 *
 * EN:
 * Front-end types for the Users module in the reusable platform base.
 * ============================================================================
 */

import type { PhoneValue } from "@/components/phone/PhoneField";

/* ============================================================================
 * Role code
 * ========================================================================== */

export type UserRoleCode = string;

/* ============================================================================
 * User DTO — as returned by /api/admin/users
 * ========================================================================== */

export interface UserDTO {
	_id: string;

	/** Full display name */
	name: string;

	/** Normalized email */
	email: string;

	/** Dynamic role code */
	role: UserRoleCode;

	/** Phone in E.164 format (+1xxxxxxxxxx) */
	phone?: string | null;

	/** Active / inactive */
	active: boolean;

	/** Authentication provider */
	provider: "credentials" | "google";

	/** Whether the user completed registration */
	isRegistered: boolean;

	/** Last login as ISO string */
	lastLogin?: string | null;
}

/* ============================================================================
 * Role DTO — minimal shape used by Users module
 * ========================================================================== */

export interface RoleDTO {
	id: string;
	code: string;
	name_es: string;
	name_en: string;
	permissions: string[];
	createdAt: string;
	updatedAt: string;
}

/* ============================================================================
 * User form values — internal shape used by UserModal
 * ========================================================================== */

export interface UserFormValues {
	name: string;
	email: string;
	role: UserRoleCode;

	/** PhoneField object */
	phone: PhoneValue;

	/** Active / inactive */
	active: boolean;

	/** Password only required on create */
	password: string;
	confirmPassword: string;
}
