/**
 * =============================================================================
 * 📄 Model: SystemSettings
 * Path: src/models/SystemSettings.ts
 * =============================================================================
 *
 * ES:
 *   Modelo central para configuraciones globales y operativas del sistema.
 *
 *   Este documento actúa como fuente persistente para parámetros administrativos
 *   reutilizables por múltiples módulos. Cada registro representa una
 *   configuración identificada por una clave única (`key`) y un valor flexible
 *   (`value`), permitiendo soportar distintos tipos de datos sin crear una
 *   colección nueva por cada necesidad de configuración.
 *
 *   Ejemplos de uso:
 *   - { key: "recordsPerPage", value: 10, module: "products" }
 *   - { key: "defaultCurrency", value: "USD" }
 *   - { key: "autoTranslate", value: true, module: "products" }
 *
 *   Responsabilidades del modelo:
 *   - Garantizar unicidad por `key`.
 *   - Soportar valores dinámicos mediante `Schema.Types.Mixed`.
 *   - Mantener metadatos administrativos para auditoría básica.
 *   - Permitir scope global o por módulo.
 *
 *   Correcciones aplicadas:
 *   - Se elimina el campo manual `updatedAt` del schema.
 *     Motivo: `timestamps: true` ya administra automáticamente `createdAt`
 *     y `updatedAt`. Mantener ambos enfoques al mismo tiempo introduce
 *     redundancia y puede causar inconsistencias.
 *
 *   - Se conserva una sola estrategia de indexación para `key`.
 *     Motivo: `unique: true` ya genera el índice único necesario. No se debe
 *     duplicar con `index: true` ni con `schema.index({ key: 1 })`, porque eso
 *     dispara el warning de Mongoose:
 *     "Duplicate schema index on { key: 1 }"
 *
 * EN:
 *   Central model for global and operational system settings.
 *   Uses a unique key and a flexible value to support reusable admin/runtime
 *   configuration across modules.
 * =============================================================================
 */

import { Schema, model, models, type Document, type Model } from "mongoose";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * -----------------------------------------------------------------------------
 * Interface: ISystemSetting
 * -----------------------------------------------------------------------------
 * ES:
 *   Contrato tipado del documento persistido en MongoDB para una configuración.
 *
 *   Campos:
 *   - key:
 *       Identificador único y estable del setting.
 *
 *   - value:
 *       Valor flexible del setting. Puede representar texto, número,
 *       booleano, objeto o arreglo, dependiendo de la necesidad funcional.
 *
 *   - description:
 *       Texto administrativo opcional para explicar el propósito del setting.
 *
 *   - module:
 *       Módulo al que pertenece el setting. Puede ser null si la configuración
 *       es global del sistema.
 *
 *   - autoTranslate:
 *       Flag administrativo usado en algunos módulos para habilitar o no
 *       comportamiento de traducción automática.
 *
 *   - lastModifiedBy / lastModifiedEmail:
 *       Metadatos de auditoría básicos del último usuario que modificó
 *       el setting.
 *
 *   - createdAt / updatedAt:
 *       Fechas administradas automáticamente por Mongoose mediante
 *       `timestamps: true`.
 * -----------------------------------------------------------------------------
 */
export interface ISystemSetting extends Document {
	key: string;
	value: unknown;
	description: string;
	module: string | null;
	autoTranslate: boolean;
	lastModifiedBy: string | null;
	lastModifiedEmail: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * -----------------------------------------------------------------------------
 * Schema: SystemSettingsSchema
 * -----------------------------------------------------------------------------
 * ES:
 *   Definición de la colección `SystemSettings`.
 *
 *   Decisiones importantes:
 *
 *   1) key
 *      - Usa `unique: true` como única estrategia de índice.
 *      - No agregar `index: true`.
 *      - No agregar `SystemSettingsSchema.index({ key: 1 })`.
 *      - No agregar `SystemSettingsSchema.index({ key: 1 }, { unique: true })`.
 *
 *      Razón:
 *      `unique: true` ya es suficiente para crear el índice único requerido.
 *      Duplicar esa definición provoca warnings de Mongoose durante build
 *      o runtime.
 *
 *   2) value
 *      - Usa `Schema.Types.Mixed` para admitir configuraciones flexibles.
 *
 *   3) timestamps
 *      - Se habilita `timestamps: true`.
 *      - Por eso no se declara manualmente `createdAt` ni `updatedAt`
 *        dentro de los campos del schema.
 * -----------------------------------------------------------------------------
 */
const SystemSettingsSchema = new Schema<ISystemSetting>(
	{
		key: {
			type: String,
			required: [true, "La clave del parámetro es obligatoria"],
			unique: true,
			trim: true,
		},

		value: {
			type: Schema.Types.Mixed,
			required: [true, "El valor del parámetro es obligatorio"],
		},

		description: {
			type: String,
			trim: true,
			default: "",
		},

		module: {
			type: String,
			trim: true,
			default: null,
		},

		autoTranslate: {
			type: Boolean,
			default: false,
		},

		lastModifiedBy: {
			type: String,
			trim: true,
			default: null,
		},

		lastModifiedEmail: {
			type: String,
			trim: true,
			lowercase: true,
			default: null,
		},
	},
	{
		collection: "SystemSettings",
		versionKey: false,
		timestamps: true,
	},
);

/* -------------------------------------------------------------------------- */
/* Model                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * -----------------------------------------------------------------------------
 * Model export
 * -----------------------------------------------------------------------------
 * ES:
 *   Protección contra recompilación múltiple en entornos con hot reload
 *   o ejecución repetida de módulos en Next.js.
 *
 *   Regla:
 *   - Si el modelo ya existe en `models`, reutilizarlo.
 *   - Si no existe, crearlo desde el schema actual.
 * -----------------------------------------------------------------------------
 */
const SystemSettingsModel =
	(models.SystemSettings as Model<ISystemSetting> | undefined) ||
	model<ISystemSetting>("SystemSettings", SystemSettingsSchema);

export default SystemSettingsModel;
