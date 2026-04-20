/**
 * =============================================================================
 * 📄 Model: BlogPost
 * Path: src/models/BlogPost.ts
 * =============================================================================
 *
 * ES:
 *   Modelo oficial del módulo Blog para Sierra Tech.
 *
 *   Objetivo:
 *   - persistir artículos bilingües (ES/EN)
 *   - soportar portada y galería
 *   - controlar publicación con draft / published
 *   - permitir featured para destacar artículos
 *   - preparar SEO desde el inicio
 *
 *   Decisiones:
 *   - `slug` es obligatorio y único
 *   - `title`, `excerpt` y `content` se separan por idioma
 *   - `coverImage` se deja opcional a nivel funcional usando default vacío
 *   - `category` inicia simple como string
 *   - `tags` inicia como string[]
 *   - `publishedAt` solo se usa cuando el artículo se publica
 *   - `seo` se guarda estructurado por idioma
 *   - timestamps nativos de mongoose resuelven `createdAt` y `updatedAt`
 *
 *   Nota:
 *   - este modelo reutiliza los contratos base de `@/types/blog`
 *   - el modelo mongoose define persistencia, índices y normalización
 *   - no depende todavía de editor rico; `content` es texto largo
 * =============================================================================
 */

import mongoose, { Model, Schema } from "mongoose";
import type {
	BlogGalleryItem,
	BlogLocalizedText,
	BlogPostBase,
	BlogSeo,
	BlogStatus,
} from "@/types/blog";

/* -------------------------------------------------------------------------- */
/* Tipos de persistencia                                                      */
/* -------------------------------------------------------------------------- */

export interface BlogPostDocument extends BlogPostBase {
	publishedAt: Date | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Helpers locales                                                            */
/* -------------------------------------------------------------------------- */

const EMPTY_LOCALIZED_TEXT: BlogLocalizedText = {
	es: "",
	en: "",
};

const EMPTY_SEO: BlogSeo = {
	metaTitle: { es: "", en: "" },
	metaDescription: { es: "", en: "" },
	ogImage: "",
};

/* -------------------------------------------------------------------------- */
/* Subschemas                                                                 */
/* -------------------------------------------------------------------------- */

const LocalizedTextSchema = new Schema<BlogLocalizedText>(
	{
		es: { type: String, trim: true, default: "" },
		en: { type: String, trim: true, default: "" },
	},
	{ _id: false }
);

const BlogGalleryItemSchema = new Schema<BlogGalleryItem>(
	{
		url: {
			type: String,
			trim: true,
			required: true,
			default: "",
		},
		alt: {
			type: LocalizedTextSchema,
			default: () => ({ ...EMPTY_LOCALIZED_TEXT }),
		},
		order: {
			type: Number,
			default: 0,
			min: 0,
		},
	},
	{ _id: false }
);

const BlogSeoSchema = new Schema<BlogSeo>(
	{
		metaTitle: {
			type: LocalizedTextSchema,
			default: () => ({ ...EMPTY_LOCALIZED_TEXT }),
		},
		metaDescription: {
			type: LocalizedTextSchema,
			default: () => ({ ...EMPTY_LOCALIZED_TEXT }),
		},
		ogImage: {
			type: String,
			trim: true,
			default: "",
		},
	},
	{ _id: false }
);

/* -------------------------------------------------------------------------- */
/* Schema principal                                                           */
/* -------------------------------------------------------------------------- */

const BlogPostSchema = new Schema<BlogPostDocument>(
	{
		slug: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
			index: true,
		},

		title: {
			type: LocalizedTextSchema,
			required: true,
			default: () => ({ ...EMPTY_LOCALIZED_TEXT }),
		},

		excerpt: {
			type: LocalizedTextSchema,
			required: true,
			default: () => ({ ...EMPTY_LOCALIZED_TEXT }),
		},

		content: {
			type: LocalizedTextSchema,
			required: true,
			default: () => ({ ...EMPTY_LOCALIZED_TEXT }),
		},

		coverImage: {
			type: String,
			trim: true,
			default: "",
		},

		gallery: {
			type: [BlogGalleryItemSchema],
			default: [],
		},

		category: {
			type: String,
			trim: true,
			default: "",
			index: true,
		},

		tags: {
			type: [String],
			default: [],
		},

		relatedProjectIds: {
			type: [String],
			default: [],
		},

		status: {
			type: String,
			enum: ["draft", "published"] satisfies BlogStatus[],
			default: "draft",
			index: true,
		},

		featured: {
			type: Boolean,
			default: false,
			index: true,
		},

		order: {
			type: Number,
			default: 0,
			min: 0,
		},

		seo: {
			type: BlogSeoSchema,
			default: () => ({
				metaTitle: { ...EMPTY_SEO.metaTitle },
				metaDescription: { ...EMPTY_SEO.metaDescription },
				ogImage: EMPTY_SEO.ogImage,
			}),
		},

		publishedAt: {
			type: Date,
			default: null,
			index: true,
		},

		createdBy: {
			type: String,
			trim: true,
			default: "",
		},
	},
	{
		timestamps: true,
		versionKey: false,
		collection: "BlogPosts",
	}
);

/* -------------------------------------------------------------------------- */
/* Índices                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * ES:
 *   Índice de texto principal para búsquedas administrativas simples.
 *
 * Nota:
 *   MongoDB permite un solo text index por colección.
 */
BlogPostSchema.index({
	"title.es": "text",
	"title.en": "text",
	"excerpt.es": "text",
	"excerpt.en": "text",
	"content.es": "text",
	"content.en": "text",
	category: "text",
	tags: "text",
});

/* -------------------------------------------------------------------------- */
/* Middleware                                                                 */
/* -------------------------------------------------------------------------- */

BlogPostSchema.pre("save", function normalizeBeforeSave(next) {
	if (typeof this.slug === "string") {
		this.slug = this.slug.trim().toLowerCase();
	}

	if (typeof this.category === "string") {
		this.category = this.category.trim();
	}

	if (typeof this.createdBy === "string") {
		this.createdBy = this.createdBy.trim();
	}

	if (Array.isArray(this.tags)) {
		this.tags = Array.from(
			new Set(
				this.tags
					.map((tag) => tag.trim())
					.filter((tag) => tag.length > 0)
			)
		);
	}

	if (Array.isArray(this.relatedProjectIds)) {
		this.relatedProjectIds = Array.from(
			new Set(
				this.relatedProjectIds
					.map((id) => id.trim())
					.filter((id) => id.length > 0)
			)
		);
	}

	if (Array.isArray(this.gallery)) {
		this.gallery = [...this.gallery].sort((a, b) => a.order - b.order);
	}

	next();
});

BlogPostSchema.pre("save", function syncPublishedAt(next) {
	if (this.status === "published" && !this.publishedAt) {
		this.publishedAt = new Date();
	}

	if (this.status === "draft") {
		this.publishedAt = null;
	}

	next();
});

/* -------------------------------------------------------------------------- */
/* Modelo                                                                     */
/* -------------------------------------------------------------------------- */

const BlogPostModel =
	(mongoose.models.BlogPost as Model<BlogPostDocument>) ||
	mongoose.model<BlogPostDocument>("BlogPost", BlogPostSchema);

export default BlogPostModel;