/**
 * =============================================================================
 * 📦 Model: ServicesPage
 * Path: src/models/ServicesPage.ts
 * =============================================================================
 *
 * ES:
 *   Configuración global de la página pública /services.
 *
 *   Propósito:
 *   - Persistir el contenido superior de la página de Servicios.
 *   - Evitar duplicar datos globales dentro de cada servicio.
 *   - Permitir administración centralizada de hero/encabezado y CTAs.
 *
 *   Regla:
 *   - Debe existir un solo documento activo para este módulo.
 *
 * EN:
 *   Global configuration for the public /services page.
 * =============================================================================
 */

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/* -------------------------------------------------------------------------- */
/* Subschemas                                                                 */
/* -------------------------------------------------------------------------- */

const LocalizedTextSchema = new Schema(
	{
		es: { type: String, default: "", trim: true },
		en: { type: String, default: "", trim: true },
	},
	{ _id: false },
);

const ServicesPageHeaderSchema = new Schema(
	{
		eyebrow: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		title: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		subtitle: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		primaryCtaLabel: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		primaryCtaHref: {
			type: String,
			default: "",
			trim: true,
		},
		secondaryCtaLabel: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		secondaryCtaHref: {
			type: String,
			default: "",
			trim: true,
		},
	},
	{ _id: false },
);

/* -------------------------------------------------------------------------- */
/* Main Schema                                                                */
/* -------------------------------------------------------------------------- */

const ServicesPageSchema = new Schema(
	{
		header: {
			type: ServicesPageHeaderSchema,
			default: () => ({
				eyebrow: { es: "", en: "" },
				title: { es: "", en: "" },
				subtitle: { es: "", en: "" },
				primaryCtaLabel: { es: "", en: "" },
				primaryCtaHref: "",
				secondaryCtaLabel: { es: "", en: "" },
				secondaryCtaHref: "",
			}),
		},
	},
	{
		timestamps: true,
		collection: "ServicesPage",
		minimize: false,
		versionKey: false,
	},
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ServicesPageDocument = InferSchemaType<typeof ServicesPageSchema>;

type ServicesPageModel = Model<ServicesPageDocument>;

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

const ServicesPage =
	(mongoose.models.ServicesPage as ServicesPageModel | undefined) ||
	mongoose.model<ServicesPageDocument, ServicesPageModel>(
		"ServicesPage",
		ServicesPageSchema,
	);

export default ServicesPage;
