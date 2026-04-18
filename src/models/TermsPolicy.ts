/**
 * src/models/TermsPolicy.ts
 * -------------------------------------------------------------------
 * 📄 TermsPolicy — Términos de Servicio
 * -------------------------------------------------------------------
 * Cada documento representa los términos en un idioma específico.
 *
 * Estructura:
 * - lang: Idioma ("es" | "en"), único por documento
 * - title: Título general de la política
 * - sections: Secciones dinámicas de contenido
 * - updatedAt: Fecha de última actualización manual
 * - lastModifiedBy / lastModifiedEmail: Auditoría básica
 *
 * Nota: El schema utiliza timestamps automáticos para createdAt y updatedAt.
 * -------------------------------------------------------------------
 */

import { Schema, model, models, Document } from "mongoose";

/**
 * Representa una sección individual de términos.
 */
export interface ITermsSection {
	heading: string;
	content: string;
}

/**
 * Representa el documento completo de Términos en un idioma.
 */
export interface ITermsPolicy extends Document {
	lang: "es" | "en";
	title: string;
	sections: ITermsSection[];
	updatedAt?: Date;
	lastModifiedBy?: string | null;
	lastModifiedEmail?: string | null;
}

const TermsSectionSchema = new Schema<ITermsSection>(
	{
		heading: {
			type: String,
			required: [true, "El encabezado de la sección es obligatorio"],
			trim: true,
		},
		content: {
			type: String,
			required: [true, "El contenido de la sección es obligatorio"],
			trim: true,
		},
	},
	{
		_id: false, // Evita IDs innecesarios dentro de secciones
	},
);

const TermsPolicySchema = new Schema<ITermsPolicy>(
	{
		lang: {
			type: String,
			enum: ["es", "en"],
			required: [true, "El idioma es obligatorio"],
			index: true,
			unique: true, // Solo un documento por idioma
			trim: true,
		},
		title: {
			type: String,
			required: [true, "El título es obligatorio"],
			trim: true,
		},
		sections: {
			type: [TermsSectionSchema],
			default: [],
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
		lastModifiedBy: {
			type: String,
			default: null,
			trim: true,
		},
		lastModifiedEmail: {
			type: String,
			default: null,
			lowercase: true,
			trim: true,
		},
	},
	{
		collection: "TermsPolicy",
		timestamps: true, // createdAt / updatedAt automáticos
		versionKey: false,
	},
);

/**
 * Previene recompilación del modelo durante Hot Reload en Next.js.
 */
export default models.TermsPolicy ||
	model<ITermsPolicy>("TermsPolicy", TermsPolicySchema);
