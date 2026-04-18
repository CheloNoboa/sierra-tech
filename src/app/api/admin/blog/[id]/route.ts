// src/app/api/admin/blog/[id]/route.ts

/**
 * =============================================================================
 * 📡 API Route: Admin Blog By ID
 * Path: src/app/api/admin/blog/[id]/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo individual del módulo Blog para Sierra Tech.
 *
 *   Responsabilidades:
 *   - obtener un artículo específico por id
 *   - actualizar un artículo existente
 *   - eliminar un artículo
 *   - normalizar payload antes de persistir
 *   - validar campos mínimos requeridos
 *
 *   Alcance:
 *   - GET    -> obtener detalle administrativo
 *   - PUT    -> actualizar artículo
 *   - DELETE -> eliminar artículo
 *
 *   Decisiones:
 *   - la búsqueda se realiza por `_id`
 *   - `slug` se normaliza antes de guardar
 *   - si se cambia el slug, se valida colisión con otros artículos
 *   - `publishedAt` sigue siendo controlado por el modelo
 *   - DELETE elimina físicamente el documento
 *
 *   Nota:
 *   - este endpoint no elimina todavía archivos físicos en R2
 *   - si luego quieres borrado lógico o limpieza de assets, se agrega aparte
 * =============================================================================
 */

import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import BlogPostModel, {
	type BlogGalleryItem,
	type BlogPostDocument,
	type BlogSeo,
	type BlogStatus,
	type LocalizedText,
} from "@/models/BlogPost";
import { connectToDB } from "@/lib/connectToDB";

/* -------------------------------------------------------------------------- */
/* Tipos internos                                                             */
/* -------------------------------------------------------------------------- */

interface RouteContext {
	params: Promise<{
		id: string;
	}>;
}

interface BlogPostUpdatePayload {
	slug?: string;
	title?: Partial<LocalizedText>;
	excerpt?: Partial<LocalizedText>;
	content?: Partial<LocalizedText>;
	coverImage?: string;
	gallery?: Partial<BlogGalleryItem>[];
	category?: string;
	tags?: string[];
	status?: BlogStatus;
	featured?: boolean;
	order?: number;
	seo?: Partial<{
		metaTitle: Partial<LocalizedText>;
		metaDescription: Partial<LocalizedText>;
		ogImage?: string;
	}>;
	createdBy?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function emptyLocalizedText(): LocalizedText {
	return {
		es: "",
		en: "",
	};
}

function normalizeLocalizedText(
	value?: Partial<LocalizedText> | null,
): LocalizedText {
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
				.filter((tag) => tag.length > 0),
		),
	);
}

function normalizeGallery(
	gallery?: Partial<BlogGalleryItem>[],
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
						? item.order
						: index,
			};
		})
		.filter((item) => item.url.length > 0)
		.sort((a, b) => a.order - b.order);
}

function normalizeSeo(seo?: BlogPostUpdatePayload["seo"]): BlogSeo {
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

function normalizePayload(payload: BlogPostUpdatePayload) {
	const title = normalizeLocalizedText(payload.title);
	const excerpt = normalizeLocalizedText(payload.excerpt);
	const content = normalizeLocalizedText(payload.content);
	const slug = normalizeSlug(payload.slug ?? "");

	return {
		slug,
		title,
		excerpt,
		content,
		coverImage:
			typeof payload.coverImage === "string" ? payload.coverImage.trim() : "",
		gallery: normalizeGallery(payload.gallery),
		category:
			typeof payload.category === "string" ? payload.category.trim() : "",
		tags: normalizeTags(payload.tags),
		status: normalizeStatus(payload.status),
		featured: Boolean(payload.featured),
		order: normalizeOrder(payload.order),
		seo: normalizeSeo(payload.seo),
		createdBy:
			typeof payload.createdBy === "string" ? payload.createdBy.trim() : "",
	};
}

function validatePayload(
	payload: ReturnType<typeof normalizePayload>,
): string[] {
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

function isValidObjectId(value: string): boolean {
	return Types.ObjectId.isValid(value);
}

function serializeBlogPost(
	doc: BlogPostDocument & { _id: { toString(): string } },
) {
	return {
		_id: doc._id.toString(),
		slug: doc.slug,
		title: doc.title ?? emptyLocalizedText(),
		excerpt: doc.excerpt ?? emptyLocalizedText(),
		content: doc.content ?? emptyLocalizedText(),
		coverImage: doc.coverImage ?? "",
		gallery: Array.isArray(doc.gallery) ? doc.gallery : [],
		category: doc.category ?? "",
		tags: Array.isArray(doc.tags) ? doc.tags : [],
		status: doc.status,
		featured: Boolean(doc.featured),
		order: typeof doc.order === "number" ? doc.order : 0,
		seo: doc.seo ?? {
			metaTitle: emptyLocalizedText(),
			metaDescription: emptyLocalizedText(),
			ogImage: "",
		},
		publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
		createdBy: doc.createdBy ?? "",
		createdAt: doc.createdAt?.toISOString() ?? null,
		updatedAt: doc.updatedAt?.toISOString() ?? null,
	};
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(_request: NextRequest, context: RouteContext) {
	try {
		await connectToDB();

		const { id } = await context.params;

		if (!isValidObjectId(id)) {
			return NextResponse.json(
				{
					ok: false,
					message: "Invalid blog post id.",
				},
				{ status: 400 },
			);
		}

		const post = await BlogPostModel.findById(id).lean<
			(BlogPostDocument & { _id: { toString(): string } }) | null
		>();

		if (!post) {
			return NextResponse.json(
				{
					ok: false,
					message: "Blog post not found.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json(
			{
				ok: true,
				data: serializeBlogPost(post),
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Admin Blog By ID GET error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Failed to fetch blog post.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(request: NextRequest, context: RouteContext) {
	try {
		await connectToDB();

		const { id } = await context.params;

		if (!isValidObjectId(id)) {
			return NextResponse.json(
				{
					ok: false,
					message: "Invalid blog post id.",
				},
				{ status: 400 },
			);
		}

		const existingPost = await BlogPostModel.findById(id);

		if (!existingPost) {
			return NextResponse.json(
				{
					ok: false,
					message: "Blog post not found.",
				},
				{ status: 404 },
			);
		}

		const body = (await request.json()) as BlogPostUpdatePayload;
		const payload = normalizePayload(body);
		const validationErrors = validatePayload(payload);

		if (validationErrors.length > 0) {
			return NextResponse.json(
				{
					ok: false,
					message: "Validation failed.",
					errors: validationErrors,
				},
				{ status: 400 },
			);
		}

		const slugOwner = await BlogPostModel.findOne({
			slug: payload.slug,
			_id: { $ne: id },
		})
			.select("_id")
			.lean<{ _id: { toString(): string } } | null>();

		if (slugOwner) {
			return NextResponse.json(
				{
					ok: false,
					message: "A blog post with this slug already exists.",
				},
				{ status: 409 },
			);
		}

		existingPost.slug = payload.slug;
		existingPost.title = payload.title;
		existingPost.excerpt = payload.excerpt;
		existingPost.content = payload.content;
		existingPost.coverImage = payload.coverImage;
		existingPost.gallery = payload.gallery;
		existingPost.category = payload.category;
		existingPost.tags = payload.tags;
		existingPost.status = payload.status;
		existingPost.featured = payload.featured;
		existingPost.order = payload.order;
		existingPost.seo = payload.seo;
		existingPost.createdBy = payload.createdBy;

		await existingPost.save();

		return NextResponse.json(
			{
				ok: true,
				message: "Blog post updated successfully.",
				data: serializeBlogPost(
					existingPost.toObject() as BlogPostDocument & {
						_id: { toString(): string };
					},
				),
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Admin Blog By ID PUT error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Failed to update blog post.",
			},
			{ status: 500 },
		);
	}
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

export async function DELETE(_request: NextRequest, context: RouteContext) {
	try {
		await connectToDB();

		const { id } = await context.params;

		if (!isValidObjectId(id)) {
			return NextResponse.json(
				{
					ok: false,
					message: "Invalid blog post id.",
				},
				{ status: 400 },
			);
		}

		const deletedPost = await BlogPostModel.findByIdAndDelete(id)
			.select("_id slug")
			.lean<{ _id: { toString(): string }; slug: string } | null>();

		if (!deletedPost) {
			return NextResponse.json(
				{
					ok: false,
					message: "Blog post not found.",
				},
				{ status: 404 },
			);
		}

		return NextResponse.json(
			{
				ok: true,
				message: "Blog post deleted successfully.",
				data: {
					_id: deletedPost._id.toString(),
					slug: deletedPost.slug,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Admin Blog By ID DELETE error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Failed to delete blog post.",
			},
			{ status: 500 },
		);
	}
}
