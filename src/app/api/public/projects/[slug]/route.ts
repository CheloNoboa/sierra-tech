/**
 * =============================================================================
 * 📡 API Route: Public Project By Slug
 * Path: src/app/api/public/projects/[slug]/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint público para obtener un proyecto por slug.
 *
 * Reglas:
 * - solo expone proyectos publicados y habilitados para sitio público
 * - la salida pública se limita a identidad básica, resumen, portada y galería
 * - no expone datos internos, mantenimientos ni documentos internos
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/connectToDB";
import Project from "@/models/Project";
import { normalizeProjectEntity } from "@/lib/projects/projectPayload";
import type {
	LocalizedText,
	ProjectDocumentLink,
	ProjectEntity,
	ProjectImage,
} from "@/types/project";

type RouteContext = {
	params: Promise<{
		slug: string;
	}>;
};

type PublicProjectResponse = {
	_id: string;
	slug: string;
	title: LocalizedText;
	summary: LocalizedText;
	coverImage: ProjectImage | null;
	gallery: ProjectImage[];
	documents: PublicProjectDocument[];
	featured: boolean;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

type PublicProjectDocument = {
	documentId: string;
	title: string;
	description: string;
	documentType: ProjectDocumentLink["documentType"];
	fileUrl: string;
	fileName: string;
	mimeType: string;
	size: number | null;
	language: ProjectDocumentLink["language"];
	documentDate: string | null;
};

function serializePublicDocuments(
	project: ProjectEntity,
): PublicProjectDocument[] {
	return project.documents
		.filter(
			(document) =>
				document.visibleInPublicSite &&
				!document.visibleToInternalOnly &&
				!!document.fileUrl,
		)
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((document) => ({
			documentId: document.documentId || `${project._id}-${document.sortOrder}`,
			title: document.title || "Documento",
			description: document.description || "",
			documentType: document.documentType,
			fileUrl: document.fileUrl,
			fileName: document.fileName || "",
			mimeType: document.mimeType || "",
			size: document.size ?? null,
			language: document.language,
			documentDate: document.documentDate,
		}));
}

function serializePublicProject(project: ProjectEntity): PublicProjectResponse {
	return {
		_id: project._id,
		slug: project.slug,
		title: project.title,
		summary: project.summary,
		coverImage: project.publicSiteSettings.showCoverImage
			? project.coverImage
			: null,
		gallery: project.publicSiteSettings.showGallery ? project.gallery : [],
		documents: serializePublicDocuments(project),
		featured: project.featured,
		sortOrder: project.sortOrder,
		createdAt: project.createdAt,
		updatedAt: project.updatedAt,
	};
}

export async function GET(_: Request, context: RouteContext) {
	try {
		await connectToDB();

		const { slug } = await context.params;

		const doc = await Project.findOne({
			slug,
			status: "published",
			visibility: "public",
			"publicSiteSettings.enabled": true,
		})
			.lean()
			.exec();

		if (!doc) {
			return NextResponse.json(
				{
					ok: false,
					error: "Project not found.",
				},
				{ status: 404 },
			);
		}

		const item = serializePublicProject(normalizeProjectEntity(doc));

		return NextResponse.json(
			{
				ok: true,
				item,
			},
			{ status: 200 },
		);
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Could not load public project.",
			},
			{ status: 500 },
		);
	}
}
