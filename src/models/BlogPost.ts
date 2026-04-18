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
 *   - `coverImage` se deja opcional en modelo para no bloquear borradores
 *   - `category` inicia simple como string
 *   - `tags` inicia como string[]
 *   - `publishedAt` solo se usa cuando el artículo se publica
 *   - `seo` se guarda estructurado por idioma
 *   - timestamps nativos de mongoose resuelven `createdAt` y `updatedAt`
 *
 *   Nota:
 *   - este modelo está pensado para integrarse luego con R2 en portada/galería
 *   - no depende todavía de editor rico; `content` es texto largo
 * =============================================================================
 */

import mongoose, { Model, Schema } from "mongoose";

/* -------------------------------------------------------------------------- */
/* Tipos auxiliares                                                           */
/* -------------------------------------------------------------------------- */

export type BlogStatus = "draft" | "published";

export interface LocalizedText {
	es: string;
	en: string;
}

export interface BlogGalleryItem {
	url: string;
	alt: LocalizedText;
	order: number;
}

export interface BlogSeo {
	metaTitle: LocalizedText;
	metaDescription: LocalizedText;
	ogImage?: string;
}

export interface BlogPostDocument {
	slug: string;
	title: LocalizedText;
	excerpt: LocalizedText;
	content: LocalizedText;
	coverImage?: string;
	gallery: BlogGalleryItem[];
	category: string;
	tags: string[];
	status: BlogStatus;
	featured: boolean;
	order: number;
	seo: BlogSeo;
	publishedAt: Date | null;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
}

/* -------------------------------------------------------------------------- */
/* Subschemas                                                                 */
/* -------------------------------------------------------------------------- */

const LocalizedTextSchema = new Schema<LocalizedText>(
	{
		es: { type: String, trim: true, default: "" },
		en: { type: String, trim: true, default: "" },
	},
	{ _id: false },
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
			default: () => ({ es: "", en: "" }),
		},
		order: {
			type: Number,
			default: 0,
			min: 0,
		},
	},
	{ _id: false },
);

const BlogSeoSchema = new Schema<BlogSeo>(
	{
		metaTitle: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		metaDescription: {
			type: LocalizedTextSchema,
			default: () => ({ es: "", en: "" }),
		},
		ogImage: {
			type: String,
			trim: true,
			default: "",
		},
	},
	{ _id: false },
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
			default: () => ({ es: "", en: "" }),
		},

		excerpt: {
			type: LocalizedTextSchema,
			required: true,
			default: () => ({ es: "", en: "" }),
		},

		content: {
			type: LocalizedTextSchema,
			required: true,
			default: () => ({ es: "", en: "" }),
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

		status: {
			type: String,
			enum: ["draft", "published"],
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
				metaTitle: { es: "", en: "" },
				metaDescription: { es: "", en: "" },
				ogImage: "",
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
	},
);

/* -------------------------------------------------------------------------- */
/* Índices                                                                    */
/* -------------------------------------------------------------------------- */

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

BlogPostSchema.pre("save", function normalizeTags(next) {
	if (Array.isArray(this.tags)) {
		this.tags = this.tags
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0);
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
