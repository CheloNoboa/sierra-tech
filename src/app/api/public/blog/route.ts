// src/app/api/public/blog/route.ts

/**
 * =============================================================================
 * 📡 API Route: Public Blog
 * Path: src/app/api/public/blog/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint público oficial para listar artículos visibles del blog
 *   en el sitio Sierra Tech.
 *
 *   Reglas públicas:
 *   - solo salen artículos con status "published"
 *   - featured va primero
 *   - luego se respeta order asc
 *   - después publishedAt desc y createdAt desc
 *
 *   Decisiones:
 *   - se expone solo la información necesaria para listado público
 *   - se mantiene estructura bilingüe estable
 *   - seo se devuelve para soportar mejoras futuras y metadata de apoyo
 *   - este endpoint conserva la respuesta con `items`
 *   - la categoría expone además su label bilingüe resuelto desde ServiceClass
 *
 *   Nota:
 *   - no expone borradores ni contenido interno del artículo
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import BlogPostModel from "@/models/BlogPost";
import ServiceClass from "@/models/ServiceClass";
import type {
	BlogLocalizedText,
	BlogSeo,
	BlogStatus,
} from "@/types/blog";

/* -------------------------------------------------------------------------- */
/* Tipos internos                                                             */
/* -------------------------------------------------------------------------- */

interface LeanPublicBlogRecord {
	_id: { toString(): string };
	slug?: string;
	title?: BlogLocalizedText;
	excerpt?: BlogLocalizedText;
	coverImage?: string;
	category?: string;
	tags?: string[];
	featured?: boolean;
	order?: number;
	seo?: BlogSeo;
	status?: BlogStatus;
	publishedAt?: Date | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
}

interface ServiceClassRecord {
	key?: string;
	label?: BlogLocalizedText;
}

interface PublicBlogListItem {
	_id: string;
	slug: string;
	title: BlogLocalizedText;
	excerpt: BlogLocalizedText;
	coverImage: string;
	category: string;
	categoryLabel: BlogLocalizedText;
	tags: string[];
	featured: boolean;
	order: number;
	publishedAt: string | null;
	seo: BlogSeo;
	createdAt: string | null;
	updatedAt: string | null;
}

interface PublicBlogListResponse {
	ok: boolean;
	items: PublicBlogListItem[];
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

function serializePublicBlogListItem(
	doc: LeanPublicBlogRecord,
	serviceClassLabelMap: Map<string, BlogLocalizedText>
): PublicBlogListItem {
	const categoryKey = doc.category ?? "";

	return {
		_id: doc._id.toString(),
		slug: doc.slug ?? "",
		title: doc.title ?? cloneLocalizedText(),
		excerpt: doc.excerpt ?? cloneLocalizedText(),
		coverImage: doc.coverImage ?? "",
		category: categoryKey,
		categoryLabel: serviceClassLabelMap.get(categoryKey) ?? cloneLocalizedText(),
		tags: Array.isArray(doc.tags) ? doc.tags : [],
		featured: Boolean(doc.featured),
		order: typeof doc.order === "number" ? doc.order : 0,
		publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
		seo: doc.seo ?? {
			metaTitle: { ...EMPTY_SEO.metaTitle },
			metaDescription: { ...EMPTY_SEO.metaDescription },
			ogImage: EMPTY_SEO.ogImage,
		},
		createdAt: doc.createdAt ? doc.createdAt.toISOString() : null,
		updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
	};
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
	try {
		await connectToDB();

		const [items, serviceClassLabelMap] = await Promise.all([
			BlogPostModel.find({
				status: "published",
			})
				.sort({
					featured: -1,
					order: 1,
					publishedAt: -1,
					createdAt: -1,
				})
				.lean<LeanPublicBlogRecord[]>(),
			getServiceClassLabelMap(),
		]);

		const response: PublicBlogListResponse = {
			ok: true,
			items: items.map((item) =>
				serializePublicBlogListItem(item, serviceClassLabelMap)
			),
		};

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("Public Blog GET error:", error);

		const response: PublicBlogListResponse = {
			ok: false,
			items: [],
			error:
				error instanceof Error
					? error.message
					: "Could not load public blog.",
		};

		return NextResponse.json(response, { status: 500 });
	}
}