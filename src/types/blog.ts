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

/* -------------------------------------------------------------------------- */
/* Base contracts                                                             */
/* -------------------------------------------------------------------------- */

/**
 * ES:
 *   Shape base compartido entre formulario, modelo expuesto y APIs.
 *
 * EN:
 *   Shared base shape used by forms, exposed model and APIs.
 */
export interface BlogPostBase {
	slug: string;

	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	content: BlogLocalizedText;

	coverImage: string;
	gallery: BlogGalleryItem[];

	category: string;
	tags: string[];
	relatedProjectIds: string[];

	status: BlogStatus;
	featured: boolean;
	order: number;

	seo: BlogSeo;
}

/**
 * ES:
 *   Entidad completa expuesta por APIs y consumida por admin/sitio público.
 *
 * EN:
 *   Full entity exposed by APIs and consumed by admin/public site.
 */
export interface BlogPost extends BlogPostBase {
	_id: string;
	publishedAt: string | null;
	createdBy: string;
	createdAt: string | null;
	updatedAt: string | null;
}

/**
 * ES:
 *   Valores del formulario administrativo del blog.
 *
 *   Nota:
 *   - conserva `createdBy` porque la creación inicial puede requerir enviarlo
 *     desde la capa admin si así lo decide la API actual
 *   - no incluye campos calculados/persistidos por backend como `_id`,
 *     `createdAt`, `updatedAt` o `publishedAt`
 *
 * EN:
 *   Blog admin form values.
 */
export interface BlogPostFormValues extends BlogPostBase {
	createdBy: string;
}

/**
 * ES:
 *   Shape resumido para listados administrativos.
 *
 * EN:
 *   Lightweight shape for admin listings.
 */
export type BlogListItem = Pick<
	BlogPost,
	| "_id"
	| "slug"
	| "title"
	| "excerpt"
	| "coverImage"
	| "category"
	| "tags"
	| "relatedProjectIds"
	| "status"
	| "featured"
	| "order"
	| "publishedAt"
	| "createdAt"
	| "updatedAt"
>;

/* -------------------------------------------------------------------------- */
/* Public contracts                                                           */
/* -------------------------------------------------------------------------- */

/**
 * ES:
 *   Item resumido para el listado público del blog.
 *
 *   Decisión:
 *   - el listado público no necesita `content`, `gallery`,
 *     `relatedProjectIds` ni `createdBy`
 *
 * EN:
 *   Public lightweight blog list item.
 */
export interface PublicBlogListItem {
	_id: string;
	slug: string;
	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	coverImage: string;
	category: string;
	tags: string[];
	featured: boolean;
	order: number;
	publishedAt: string | null;
	seo: BlogSeo;
	createdAt: string | null;
	updatedAt: string | null;
}

/**
 * ES:
 *   Respuesta del listado público del blog.
 *
 *   Nota:
 *   - se conserva `items` porque el endpoint público actual ya funciona así
 *
 * EN:
 *   Public blog listing response.
 */
export interface PublicBlogListResponse {
	ok: boolean;
	items: PublicBlogListItem[];
	error?: string;
}

/* -------------------------------------------------------------------------- */
/* API responses                                                              */
/* -------------------------------------------------------------------------- */

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

export interface BlogPostDeleteResponse {
	ok: boolean;
	data?: {
		_id: string;
		slug: string;
	};
	message?: string;
	errors?: string[];
}

/* -------------------------------------------------------------------------- */
/* Admin filters                                                              */
/* -------------------------------------------------------------------------- */

export interface BlogAdminFilters {
	q: string;
	status: "" | BlogStatus;
	featured: "" | "true" | "false";
}