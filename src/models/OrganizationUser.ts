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
 *   - colección fijada explícitamente como "OrganizationUsers"
 *     para mantener consistencia con la convención del proyecto
 *   - el flujo inicial usa contraseña temporal + token de activación
 *   - el token de activación se guarda como hash, no en texto plano
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

	isRegistered: boolean;

	activationTokenHash?: string | null;
	activationTokenExpiresAt?: Date | null;
	temporaryPasswordExpiresAt?: Date | null;

	resetToken?: string | null;
	resetTokenExpiry?: Date | null;

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

		isRegistered: {
			type: Boolean,
			default: false,
			index: true,
		},

		activationTokenHash: {
			type: String,
			default: null,
			index: true,
		},

		activationTokenExpiresAt: {
			type: Date,
			default: null,
		},

		temporaryPasswordExpiresAt: {
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

		lastLoginAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
		versionKey: false,
		collection: "OrganizationUsers",
	},
);

/* -------------------------------------------------------------------------- */
/* 🧠 Modelo                                                                  */
/* -------------------------------------------------------------------------- */

const OrganizationUserModel: Model<OrganizationUserDocument> =
	models.OrganizationUser ||
	mongoose.model<OrganizationUserDocument>(
		"OrganizationUser",
		OrganizationUserSchema,
		"OrganizationUsers",
	);

export default OrganizationUserModel;
