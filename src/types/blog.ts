// src/types/blog.ts

/**
 * =============================================================================
 * 📄 Types: Blog
 * Path: src/types/blog.ts
 * =============================================================================
 *
 * ES:
 *   Contrato oficial del módulo Blog para Sierra Tech.
 *
 *   Objetivo:
 *   - centralizar los tipos compartidos del blog
 *   - unificar el shape entre modelo, APIs, admin y sitio público
 *   - reducir duplicación y evitar contratos inconsistentes
 *
 *   Decisiones:
 *   - el blog es bilingüe (ES/EN)
 *   - `status` controla publicación
 *   - `featured` permite destacar artículos
 *   - `coverImage` y `gallery` soportan media cargada en R2
 *   - `seo` se mantiene estructurado desde el inicio
 *   - las fechas expuestas hacia UI/APIs se manejan como string | null
 *
 *   Nota:
 *   - este archivo define contratos de aplicación
 *   - el modelo mongoose puede tener sus propios tipos internos de persistencia
 * =============================================================================
 */

export type BlogLocale = "es" | "en";

export type BlogStatus = "draft" | "published";

export interface BlogLocalizedText {
	es: string;
	en: string;
}

export interface BlogGalleryItem {
	url: string;
	alt: BlogLocalizedText;
	order: number;
}

export interface BlogSeo {
	metaTitle: BlogLocalizedText;
	metaDescription: BlogLocalizedText;
	ogImage: string;
}

export interface BlogPost {
	_id: string;
	slug: string;

	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	content: BlogLocalizedText;

	coverImage: string;
	gallery: BlogGalleryItem[];

	category: string;
	tags: string[];

	status: BlogStatus;
	featured: boolean;
	order: number;

	seo: BlogSeo;

	publishedAt: string | null;
	createdBy: string;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface BlogPostFormValues {
	slug: string;

	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	content: BlogLocalizedText;

	coverImage: string;
	gallery: BlogGalleryItem[];

	category: string;
	tags: string[];

	status: BlogStatus;
	featured: boolean;
	order: number;

	seo: BlogSeo;

	createdBy: string;
}

export interface BlogPostListResponse {
	ok: boolean;
	data: BlogPost[];
	message?: string;
}

export interface BlogPostSingleResponse {
	ok: boolean;
	data?: BlogPost;
	message?: string;
	errors?: string[];
}

export interface BlogPostMutationResponse {
	ok: boolean;
	data?: BlogPost;
	message?: string;
	errors?: string[];
}

export interface BlogAdminFilters {
	q: string;
	status: "" | BlogStatus;
	featured: "" | "true" | "false";
}

export interface BlogListItem {
	_id: string;
	slug: string;
	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	coverImage: string;
	category: string;
	tags: string[];
	status: BlogStatus;
	featured: boolean;
	order: number;
	publishedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}
