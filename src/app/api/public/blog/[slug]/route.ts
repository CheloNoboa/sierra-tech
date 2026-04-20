// src/app/api/public/blog/[slug]/route.ts

/**
 * =============================================================================
 * 📡 API Route: Public Blog By Slug
 * Path: src/app/api/public/blog/[slug]/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint público oficial para obtener el detalle de un artículo
 *   publicado del blog.
 *
 *   Reglas públicas:
 *   - solo responde artículos con status "published"
 *   - la búsqueda se realiza por slug
 *   - solo retorna proyectos relacionados cuando el artículo los define
 *
 *   Decisiones:
 *   - si el artículo define `relatedProjectIds`, se usan esos proyectos
 *   - si no define relacionados, NO se usa fallback automático
 *   - solo se exponen proyectos que sigan autorizados para publicación pública
 *   - la categoría expone además su label bilingüe resuelto desde ServiceClass
 *
 *   Nota:
 *   - este endpoint conserva la respuesta con `item` porque el consumo
 *     público actual ya funciona con ese contrato
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import BlogPostModel from "@/models/BlogPost";
import Project from "@/models/Project";
import ServiceClass from "@/models/ServiceClass";
import type {
	BlogGalleryItem,
	BlogLocalizedText,
	BlogSeo,
	BlogStatus,
} from "@/types/blog";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

interface RouteContext {
	params: Promise<{
		slug: string;
	}>;
}

interface LeanPublicBlogDetailRecord {
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
	createdBy?: string;
	publishedAt?: Date | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

interface ServiceClassRecord {
	key?: string;
	label?: BlogLocalizedText;
}

interface PublicRelatedProject {
	_id: string;
	slug: string;
	title: BlogLocalizedText;
	summary: BlogLocalizedText;
	coverImage: string | null;
}

interface PublicBlogDetailItem {
	_id: string;
	slug: string;
	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	content: BlogLocalizedText;
	coverImage: string;
	gallery: BlogGalleryItem[];
	category: string;
	categoryLabel: BlogLocalizedText;
	tags: string[];
	relatedProjectIds: string[];
	featured: boolean;
	order: number;
	publishedAt: string | null;
	seo: BlogSeo;
	createdBy: string;
	createdAt: string | null;
	updatedAt: string | null;
	relatedProjects: PublicRelatedProject[];
}

interface PublicBlogDetailResponse {
	ok: boolean;
	item?: PublicBlogDetailItem;
	error?: string;
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

async function getServiceClassLabelMap(): Promise<Map<string, BlogLocalizedText>> {
	const items = await ServiceClass.find({ enabled: true })
		.sort({ order: 1 })
		.lean<ServiceClassRecord[]>();

	const map = new Map<string, BlogLocalizedText>();

	for (const item of items) {
		const key = typeof item.key === "string" ? item.key.trim() : "";

		if (!key) {
			continue;
		}

		map.set(key, {
			es: item.label?.es?.trim() ?? "",
			en: item.label?.en?.trim() ?? "",
		});
	}

	return map;
}

function serializeRelatedProject(
	item: ReturnType<typeof normalizeProjectEntity>
): PublicRelatedProject {
	return {
		_id: item._id,
		slug: item.slug,
		title: item.publicSiteSettings.showTitle ? item.title : cloneLocalizedText(),
		summary: item.publicSiteSettings.showSummary
			? item.summary
			: cloneLocalizedText(),
		coverImage:
			item.publicSiteSettings.showCoverImage && item.coverImage
				? item.coverImage.url?.trim() ||
				item.coverImage.storageKey?.trim() ||
				null
				: null,
	};
}

function serializePublicBlogDetail(
	doc: LeanPublicBlogDetailRecord,
	relatedProjects: PublicRelatedProject[],
	serviceClassLabelMap: Map<string, BlogLocalizedText>
): PublicBlogDetailItem {
	const categoryKey = doc.category ?? "";

	return {
		_id: doc._id.toString(),
		slug: doc.slug ?? "",
		title: doc.title ?? cloneLocalizedText(),
		excerpt: doc.excerpt ?? cloneLocalizedText(),
		content: doc.content ?? cloneLocalizedText(),
		coverImage: doc.coverImage ?? "",
		gallery: Array.isArray(doc.gallery) ? doc.gallery : [],
		category: categoryKey,
		categoryLabel: serviceClassLabelMap.get(categoryKey) ?? cloneLocalizedText(),
		tags: Array.isArray(doc.tags) ? doc.tags : [],
		relatedProjectIds: Array.isArray(doc.relatedProjectIds)
			? doc.relatedProjectIds
			: [],
		featured: Boolean(doc.featured),
		order: typeof doc.order === "number" ? doc.order : 0,
		publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
		seo: doc.seo ?? {
			metaTitle: { ...EMPTY_SEO.metaTitle },
			metaDescription: { ...EMPTY_SEO.metaDescription },
			ogImage: EMPTY_SEO.ogImage,
		},
		createdBy: doc.createdBy ?? "",
		createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
		updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
		relatedProjects,
	};
}

async function getExplicitRelatedProjects(
	relatedProjectIds: string[],
	limit = 3
): Promise<PublicRelatedProject[]> {
	const safeIds = Array.from(
		new Set(
			relatedProjectIds
				.map((id) => (typeof id === "string" ? id.trim() : ""))
				.filter((id) => id.length > 0)
		)
	);

	if (safeIds.length === 0) {
		return [];
	}

	const relatedProjectDocs = await Project.find({
		_id: { $in: safeIds },
		status: "published",
		visibility: "public",
		"publicSiteSettings.enabled": true,
	}).lean();

	const normalized = relatedProjectDocs.map((item) =>
		normalizeProjectEntity(item)
	);

	const byId = new Map(normalized.map((item) => [item._id, item]));

	return safeIds
		.map((id) => byId.get(id))
		.filter(
			(item): item is ReturnType<typeof normalizeProjectEntity> => Boolean(item)
		)
		.slice(0, limit)
		.map((item) => serializeRelatedProject(item));
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(_request: Request, context: RouteContext) {
	try {
		await connectToDB();

		const { slug } = await context.params;
		const safeSlug = typeof slug === "string" ? slug.trim().toLowerCase() : "";

		if (!safeSlug) {
			const response: PublicBlogDetailResponse = {
				ok: false,
				error: "Invalid blog slug.",
			};

			return NextResponse.json(response, { status: 400 });
		}

		const [post, serviceClassLabelMap] = await Promise.all([
			BlogPostModel.findOne({
				slug: safeSlug,
				status: "published",
			}).lean<LeanPublicBlogDetailRecord | null>(),
			getServiceClassLabelMap(),
		]);

		if (!post) {
			const response: PublicBlogDetailResponse = {
				ok: false,
				error: "Blog article not found.",
			};

			return NextResponse.json(response, { status: 404 });
		}

		const explicitRelatedProjectIds = Array.isArray(post.relatedProjectIds)
			? post.relatedProjectIds
			: [];

		const relatedProjects =
			explicitRelatedProjectIds.length > 0
				? await getExplicitRelatedProjects(explicitRelatedProjectIds, 3)
				: [];

		const response: PublicBlogDetailResponse = {
			ok: true,
			item: serializePublicBlogDetail(
				post,
				relatedProjects,
				serviceClassLabelMap
			),
		};

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("Public Blog By Slug GET error:", error);

		const response: PublicBlogDetailResponse = {
			ok: false,
			error:
				error instanceof Error ? error.message : "Could not load blog article.",
		};

		return NextResponse.json(response, { status: 500 });
	}
}