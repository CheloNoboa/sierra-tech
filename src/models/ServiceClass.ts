/**
 * =============================================================================
 * 📄 Model: ServiceClass
 * Path: src/models/ServiceClass.ts
 * =============================================================================
 *
 * ES:
 *   Modelo administrativo para clases de servicio.
 *
 *   Propósito:
 *   - Mantener un catálogo reutilizable de clases de servicio.
 *   - Exponer una clave técnica única y estable (`key`).
 *   - Soportar contenido bilingüe para etiqueta y descripción.
 *   - Permitir control administrativo de habilitación y orden visual.
 *
 *   Contrato esperado por:
 *   - src/app/api/admin/service-classes/route.ts
 *
 *   Campos requeridos por el contrato:
 *   - key: string
 *   - label: { es, en }
 *   - description: { es, en }
 *   - enabled: boolean
 *   - order: number
 *   - createdAt / updatedAt
 *
 *   Regla crítica de indexación:
 *   - `key` usa únicamente `unique: true`.
 *   - No se debe duplicar el índice con:
 *       - `index: true`
 *       - `ServiceClassSchema.index({ key: 1 })`
 *       - `ServiceClassSchema.index({ key: 1 }, { unique: true })`
 *
 *   Motivo:
 *   - `unique: true` ya genera el índice requerido.
 *   - Duplicarlo provoca el warning de Mongoose:
 *     "Duplicate schema index on { key: 1 }"
 *
 * EN:
 *   Administrative model for service classes with a unique stable key and
 *   localized label/description fields.
 * =============================================================================
 */

import { Schema, model, models, type Document, type Model } from "mongoose";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Texto bilingüe reutilizable.
 */
export interface LocalizedText {
	es: string;
	en: string;
}

/**
 * Documento persistido para una clase de servicio.
 */
export interface ServiceClassDocument extends Document {
	key: string;
	label: LocalizedText;
	description: LocalizedText;
	enabled: boolean;
	order: number;
	createdAt: Date;
	updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Sub-schemas                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Sub-schema de texto localizado.
 *
 * Decisión:
 * - `_id: false` evita identificadores innecesarios en objetos embebidos.
 */
const LocalizedTextSchema = new Schema<LocalizedText>(
	{
		es: {
			type: String,
			trim: true,
			default: "",
		},
		en: {
			type: String,
			trim: true,
			default: "",
		},
	},
	{
		_id: false,
	},
);

/* -------------------------------------------------------------------------- */
/* Main schema                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Schema principal de clases de servicio.
 *
 * Notas:
 * - `key` queda como identificador único estable.
 * - `timestamps: true` administra automáticamente `createdAt` y `updatedAt`.
 * - No agregar índices adicionales para `key`.
 */
const ServiceClassSchema = new Schema<ServiceClassDocument>(
	{
		key: {
			type: String,
			required: [true, "La clave es obligatoria"],
			trim: true,
			unique: true,
		},

		label: {
			type: LocalizedTextSchema,
			required: true,
			default: () => ({
				es: "",
				en: "",
			}),
		},

		description: {
			type: LocalizedTextSchema,
			required: true,
			default: () => ({
				es: "",
				en: "",
			}),
		},

		enabled: {
			type: Boolean,
			default: true,
		},

		order: {
			type: Number,
			default: 0,
		},
	},
	{
		collection: "ServiceClass",
		versionKey: false,
		timestamps: true,
	},
);

/* -------------------------------------------------------------------------- */
/* Model export                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Reutiliza el modelo existente en hot reload para evitar recompilación
 * múltiple del schema en entornos de desarrollo y build de Next.js.
 */
const ServiceClassModel =
	(models.ServiceClass as Model<ServiceClassDocument> | undefined) ||
	model<ServiceClassDocument>("ServiceClass", ServiceClassSchema);

export default ServiceClassModel;
