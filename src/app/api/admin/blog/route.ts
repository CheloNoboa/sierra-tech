/**
 * =============================================================================
 * 📡 API Route: Admin Blog
 * Path: src/app/api/admin/blog/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo oficial del módulo Blog para Sierra Tech.
 *
 *   Responsabilidades:
 *   - listar artículos del blog para administración
 *   - crear nuevos artículos
 *   - normalizar payload antes de persistir
 *   - validar campos mínimos requeridos
 *
 *   Alcance inicial:
 *   - GET  -> listado administrativo completo
 *   - POST -> creación de artículo
 *
 *   Decisiones:
 *   - el admin puede crear borradores sin portada
 *   - `slug` se normaliza a minúsculas
 *   - `publishedAt` lo controla el modelo según `status`
 *   - `seo`, `gallery` y `tags` siempre se devuelven con forma estable
 *   - el listado administrativo devuelve todo, no solo publicados
 *
 *   Nota:
 *   - esta versión no incorpora todavía control de permisos/roles
 *   - si el proyecto ya protege admin por sesión/middleware, este endpoint
 *     puede integrarse después con esa misma lógica
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import BlogPostModel from "@/models/BlogPost";
import { connectToDB } from "@/lib/connectToDB";
import type {
	BlogGalleryItem,
	BlogLocalizedText,
	BlogPost,
	BlogPostListResponse,
	BlogPostMutationResponse,
	BlogSeo,
	BlogStatus,
} from "@/types/blog";

/* -------------------------------------------------------------------------- */
/* Tipos internos                                                             */
/* -------------------------------------------------------------------------- */

interface BlogPostCreatePayload {
	slug?: string;
	title?: Partial<BlogLocalizedText>;
	excerpt?: Partial<BlogLocalizedText>;
	content?: Partial<BlogLocalizedText>;
	coverImage?: string;
	gallery?: Partial<BlogGalleryItem>[];
	category?: string;
	tags?: string[];
	relatedProjectIds?: string[];
	status?: BlogStatus;
	featured?: boolean;
	order?: number;
	seo?: Partial<{
		metaTitle: Partial<BlogLocalizedText>;
		metaDescription: Partial<BlogLocalizedText>;
		ogImage?: string;
	}>;
	createdBy?: string;
}

interface LeanBlogPostRecord {
	_id: { toString(): string };
	slug?: string;
	title?: BlogLocalizedText;
	excerpt?: BlogLocalizedText;
	content?: BlogLocalizedText;
	coverImage?: string;
	gallery?: BlogGalleryItem[];
	category?: string;
	tags?: string[];
	relatedProjectIds?: string[];
	status?: BlogStatus;
	featured?: boolean;
	order?: number;
	seo?: BlogSeo;
	publishedAt?: Date | null;
	createdBy?: string;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

interface NormalizedBlogPostPayload {
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
	createdBy: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
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

function cloneLocalizedText(): BlogLocalizedText {
	return {
		es: EMPTY_LOCALIZED_TEXT.es,
		en: EMPTY_LOCALIZED_TEXT.en,
	};
}

function normalizeLocalizedText(
	value?: Partial<BlogLocalizedText> | null
): BlogLocalizedText {
	return {
		es: typeof value?.es === "string" ? value.es.trim() : "",
		en: typeof value?.en === "string" ? value.en.trim() : "",
	};
}

function normalizeSlug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function normalizeTags(tags?: string[]): string[] {
	if (!Array.isArray(tags)) {
		return [];
	}

	return Array.from(
		new Set(
			tags
				.map((tag) => (typeof tag === "string" ? tag.trim() : ""))
				.filter((tag) => tag.length > 0)
		)
	);
}

function normalizeRelatedProjectIds(value?: string[]): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return Array.from(
		new Set(
			value
				.map((item) => (typeof item === "string" ? item.trim() : ""))
				.filter((item) => item.length > 0)
		)
	);
}

function normalizeGallery(
	gallery?: Partial<BlogGalleryItem>[]
): BlogGalleryItem[] {
	if (!Array.isArray(gallery)) {
		return [];
	}

	return gallery
		.map((item, index) => {
			const url = typeof item?.url === "string" ? item.url.trim() : "";

			return {
				url,
				alt: normalizeLocalizedText(item?.alt),
				order:
					typeof item?.order === "number" && Number.isFinite(item.order)
						? Math.max(0, Math.floor(item.order))
						: index,
			};
		})
		.filter((item) => item.url.length > 0)
		.sort((a, b) => a.order - b.order);
}

function normalizeSeo(seo?: BlogPostCreatePayload["seo"]): BlogSeo {
	return {
		metaTitle: normalizeLocalizedText(seo?.metaTitle),
		metaDescription: normalizeLocalizedText(seo?.metaDescription),
		ogImage: typeof seo?.ogImage === "string" ? seo.ogImage.trim() : "",
	};
}

function normalizeStatus(value?: string): BlogStatus {
	return value === "published" ? "published" : "draft";
}

function normalizeOrder(value?: number): number {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		return 0;
	}

	return Math.floor(value);
}

function normalizePayload(
	payload: BlogPostCreatePayload
): NormalizedBlogPostPayload {
	return {
		slug: normalizeSlug(payload.slug ?? ""),
		title: normalizeLocalizedText(payload.title),
		excerpt: normalizeLocalizedText(payload.excerpt),
		content: normalizeLocalizedText(payload.content),
		coverImage:
			typeof payload.coverImage === "string" ? payload.coverImage.trim() : "",
		gallery: normalizeGallery(payload.gallery),
		category:
			typeof payload.category === "string" ? payload.category.trim() : "",
		tags: normalizeTags(payload.tags),
		relatedProjectIds: normalizeRelatedProjectIds(payload.relatedProjectIds),
		status: normalizeStatus(payload.status),
		featured: Boolean(payload.featured),
		order: normalizeOrder(payload.order),
		seo: normalizeSeo(payload.seo),
		createdBy:
			typeof payload.createdBy === "string" ? payload.createdBy.trim() : "",
	};
}

function validatePayload(payload: NormalizedBlogPostPayload): string[] {
	const errors: string[] = [];

	if (!payload.slug) {
		errors.push("Slug is required.");
	}

	if (!payload.title.es && !payload.title.en) {
		errors.push("At least one title is required.");
	}

	if (!payload.excerpt.es && !payload.excerpt.en) {
		errors.push("At least one excerpt is required.");
	}

	if (!payload.content.es && !payload.content.en) {
		errors.push("At least one content field is required.");
	}

	return errors;
}

function serializeBlogPost(doc: LeanBlogPostRecord): BlogPost {
	return {
		_id: doc._id.toString(),
		slug: doc.slug ?? "",
		title: doc.title ?? cloneLocalizedText(),
		excerpt: doc.excerpt ?? cloneLocalizedText(),
		content: doc.content ?? cloneLocalizedText(),
		coverImage: doc.coverImage ?? "",
		gallery: Array.isArray(doc.gallery) ? doc.gallery : [],
		category: doc.category ?? "",
		tags: Array.isArray(doc.tags) ? doc.tags : [],
		relatedProjectIds: Array.isArray(doc.relatedProjectIds)
			? doc.relatedProjectIds
			: [],
		status: doc.status === "published" ? "published" : "draft",
		featured: Boolean(doc.featured),
		order: typeof doc.order === "number" ? doc.order : 0,
		seo: doc.seo ?? {
			metaTitle: { ...EMPTY_SEO.metaTitle },
			metaDescription: { ...EMPTY_SEO.metaDescription },
			ogImage: EMPTY_SEO.ogImage,
		},
		publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
		createdBy: doc.createdBy ?? "",
		createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
		updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
	};
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(request: NextRequest) {
	try {
		await connectToDB();

		const searchParams = request.nextUrl.searchParams;
		const status = searchParams.get("status");
		const featured = searchParams.get("featured");
		const q = searchParams.get("q")?.trim() ?? "";

		const filters: Record<string, unknown> = {};

		if (status === "draft" || status === "published") {
			filters.status = status;
		}

		if (featured === "true") {
			filters.featured = true;
		} else if (featured === "false") {
			filters.featured = false;
		}

		if (q) {
			filters.$or = [
				{ "title.es": { $regex: q, $options: "i" } },
				{ "title.en": { $regex: q, $options: "i" } },
				{ "excerpt.es": { $regex: q, $options: "i" } },
				{ "excerpt.en": { $regex: q, $options: "i" } },
				{ category: { $regex: q, $options: "i" } },
				{ tags: { $elemMatch: { $regex: q, $options: "i" } } },
				{ slug: { $regex: q, $options: "i" } },
			];
		}

		const posts = await BlogPostModel.find(filters)
			.sort({
				featured: -1,
				order: 1,
				publishedAt: -1,
				createdAt: -1,
			})
			.lean<LeanBlogPostRecord[]>();

		const response: BlogPostListResponse = {
			ok: true,
			data: posts.map((post) => serializeBlogPost(post)),
		};

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("Admin Blog GET error:", error);

		const response: BlogPostListResponse = {
			ok: false,
			data: [],
			message: "Failed to fetch blog posts.",
		};

		return NextResponse.json(response, { status: 500 });
	}
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
	try {
		await connectToDB();

		const body = (await request.json()) as BlogPostCreatePayload;
		const payload = normalizePayload(body);
		const validationErrors = validatePayload(payload);

		if (validationErrors.length > 0) {
			const response: BlogPostMutationResponse = {
				ok: false,
				message: "Validation failed.",
				errors: validationErrors,
			};

			return NextResponse.json(response, { status: 400 });
		}

		const existingPost = await BlogPostModel.findOne({
			slug: payload.slug,
		})
			.select("_id")
			.lean<{ _id: { toString(): string } } | null>();

		if (existingPost) {
			const response: BlogPostMutationResponse = {
				ok: false,
				message: "A blog post with this slug already exists.",
			};

			return NextResponse.json(response, { status: 409 });
		}

		const createdPost = await BlogPostModel.create(payload);
		const serialized = serializeBlogPost(
			createdPost.toObject() as LeanBlogPostRecord
		);

		const response: BlogPostMutationResponse = {
			ok: true,
			message: "Blog post created successfully.",
			data: serialized,
		};

		return NextResponse.json(response, { status: 201 });
	} catch (error) {
		console.error("Admin Blog POST error:", error);

		const response: BlogPostMutationResponse = {
			ok: false,
			message: "Failed to create blog post.",
		};

		return NextResponse.json(response, { status: 500 });
	}
}