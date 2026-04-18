/**
 * =============================================================================
 * 📄 Page: Public Project Detail
 * Path: src/app/projects/[slug]/page.tsx
 * =============================================================================
 *
 * ES:
 * Página pública de detalle para un proyecto autorizado por el cliente.
 *
 * Objetivo:
 * - consumir el endpoint público GET /api/public/projects/[slug]
 * - mostrar identidad pública del proyecto
 * - presentar portada principal
 * - presentar resumen público
 * - presentar la galería en un carrusel pequeño y limpio
 *
 * Reglas:
 * - esta página NO expone documentos internos
 * - esta página NO expone mantenimientos
 * - solo usa el contrato público permitido por el endpoint
 * - debe mantenerse coherente con el estilo público de Sierra Tech
 *
 * Decisiones:
 * - la carga usa URL absoluta construida desde headers para evitar problemas
 *   de fetch en Server Components
 * - las imágenes públicas resuelven tanto URL completa como storageKey
 * - el idioma visible queda estable en español por ahora
 * =============================================================================
 */

import Link from "next/link";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import ProjectGalleryCarousel from "@/components/public/ProjectGalleryCarousel";

type LocalizedText = {
	es: string;
	en: string;
};

type ProjectImage = {
	url: string;
	alt: LocalizedText;
	storageKey: string;
};

type PublicProjectDocument = {
	documentId: string;
	title: string;
	description: string;
	documentType: string;
	fileUrl: string;
	fileName: string;
	mimeType: string;
	size: number | null;
	language: "none" | "es" | "en" | "both";
	documentDate: string | null;
};

type PublicProjectResponseItem = {
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

type PublicProjectResponse =
	| {
			ok: true;
			item: PublicProjectResponseItem;
	  }
	| {
			ok: false;
			error: string;
	  };

type PageProps = {
	params: Promise<{
		slug: string;
	}>;
};

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function resolveText(value: LocalizedText, locale: "es" | "en"): string {
	return locale === "en"
		? normalizeString(value.en) || normalizeString(value.es)
		: normalizeString(value.es) || normalizeString(value.en);
}

function resolveBaseUrl(host: string, forwardedProto: string | null): string {
	const safeHost = normalizeString(host);
	const safeProto = normalizeString(forwardedProto) || "http";

	if (!safeHost) {
		return "http://localhost:3000";
	}

	return `${safeProto}://${safeHost}`;
}

function resolveImageUrl(image: ProjectImage | null, baseUrl: string): string {
	if (!image) return "";

	const directUrl = normalizeString(image.url);
	const storageKey = normalizeString(image.storageKey);
	const raw = directUrl || storageKey;

	if (!raw) {
		return "";
	}

	if (raw.startsWith("http://") || raw.startsWith("https://")) {
		return raw;
	}

	if (raw.startsWith("/")) {
		return `${baseUrl}${raw}`;
	}

	if (raw.startsWith("admin/")) {
		return `${baseUrl}/api/admin/uploads/view?key=${encodeURIComponent(raw)}`;
	}

	return "";
}

function formatDocumentDate(value: string | null, locale: "es" | "en"): string {
	if (!value) return "";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";

	return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-EC", {
		year: "numeric",
		month: "short",
		day: "2-digit",
	}).format(date);
}

function resolveDocumentLink(fileUrl: string, baseUrl: string): string {
	const raw = normalizeString(fileUrl);

	if (!raw) return "#";

	if (raw.startsWith("http://") || raw.startsWith("https://")) {
		return raw;
	}

	if (raw.startsWith("/")) {
		return `${baseUrl}${raw}`;
	}

	if (raw.startsWith("admin/")) {
		return `${baseUrl}/api/admin/uploads/view?key=${encodeURIComponent(raw)}`;
	}

	return `${baseUrl}/${raw}`;
}

function resolveDocumentTypeLabel(type: string, locale: "es" | "en"): string {
	const mapEs: Record<string, string> = {
		contract: "Contrato",
		planning: "Planificación",
		schedule: "Cronograma",
		technical_design: "Diseño técnico",
		plan: "Plano",
		technical_report: "Informe técnico",
		technical_sheet: "Ficha técnica",
		operation_manual: "Manual de operación",
		maintenance_manual: "Manual de mantenimiento",
		inspection_report: "Informe de inspección",
		maintenance_report: "Informe de mantenimiento",
		delivery_record: "Acta de entrega",
		certificate: "Certificado",
		warranty: "Garantía",
		invoice: "Factura",
		permit: "Permiso",
		photo_evidence: "Evidencia fotográfica",
		other: "Documento",
	};

	const mapEn: Record<string, string> = {
		contract: "Contract",
		planning: "Planning",
		schedule: "Schedule",
		technical_design: "Technical design",
		plan: "Plan",
		technical_report: "Technical report",
		technical_sheet: "Technical sheet",
		operation_manual: "Operation manual",
		maintenance_manual: "Maintenance manual",
		inspection_report: "Inspection report",
		maintenance_report: "Maintenance report",
		delivery_record: "Delivery record",
		certificate: "Certificate",
		warranty: "Warranty",
		invoice: "Invoice",
		permit: "Permit",
		photo_evidence: "Photo evidence",
		other: "Document",
	};

	return locale === "en"
		? mapEn[type] || "Document"
		: mapEs[type] || "Documento";
}

function formatFileSize(size: number | null): string {
	if (!size || size <= 0) return "";

	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;

	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveFileExtension(fileName: string): string {
	const name = fileName.toLowerCase();

	if (name.endsWith(".pdf")) return "PDF";
	if (name.endsWith(".doc") || name.endsWith(".docx")) return "DOC";
	if (name.endsWith(".xls") || name.endsWith(".xlsx")) return "XLS";
	if (name.endsWith(".ppt") || name.endsWith(".pptx")) return "PPT";
	if (
		name.endsWith(".png") ||
		name.endsWith(".jpg") ||
		name.endsWith(".jpeg") ||
		name.endsWith(".webp") ||
		name.endsWith(".svg")
	) {
		return "IMG";
	}

	return "FILE";
}

async function getProjectBySlug(
	slug: string,
	baseUrl: string,
): Promise<PublicProjectResponseItem | null> {
	try {
		const response = await fetch(
			`${baseUrl}/api/public/projects/${encodeURIComponent(slug)}`,
			{
				cache: "no-store",
			},
		);

		const json = (await response
			.json()
			.catch(() => null)) as PublicProjectResponse | null;

		if (!response.ok || !json || !json.ok) {
			return null;
		}

		return json.item;
	} catch {
		return null;
	}
}

export default async function PublicProjectDetailPage({ params }: PageProps) {
	const { slug } = await params;

	const cookieStore = await cookies();
	const localeCookie = cookieStore.get("locale")?.value;
	const locale: "es" | "en" = localeCookie === "en" ? "en" : "es";

	const headersList = await headers();
	const host = headersList.get("host") || "localhost:3000";
	const forwardedProto = headersList.get("x-forwarded-proto");
	const baseUrl = resolveBaseUrl(host, forwardedProto);

	const project = await getProjectBySlug(slug, baseUrl);

	if (!project) {
		notFound();
	}

	const title = resolveText(project.title, locale);
	const summary = resolveText(project.summary, locale);
	const coverImageUrl = resolveImageUrl(project.coverImage, baseUrl);
	const publicDocuments = Array.isArray(project.documents)
		? project.documents
		: [];

	const coverImageAlt = resolveText(
		project.coverImage?.alt ?? { es: "", en: "" },
		locale,
	);

	const ui = {
		backToProjects:
			locale === "en" ? "← Back to projects" : "← Volver a proyectos",
		featuredProject:
			locale === "en" ? "Featured project" : "Proyecto destacado",
		authorizedProject:
			locale === "en" ? "Authorized project" : "Proyecto autorizado",
		noTitle: locale === "en" ? "Untitled project" : "Proyecto sin título",
		noSummary:
			locale === "en"
				? "This project does not have a public summary."
				: "Este proyecto no tiene resumen público.",
		noCover:
			locale === "en" ? "No cover image available" : "Sin portada disponible",
		mainImage: locale === "en" ? "Main image" : "Imagen principal",
		projectSummary:
			locale === "en" ? "Project summary" : "Resumen del proyecto",
		publicDocumentation:
			locale === "en" ? "Public documentation" : "Documentación pública",
		projectDocuments:
			locale === "en" ? "Project documents" : "Documentos del proyecto",
		publicDocumentsDescription:
			locale === "en"
				? "Files authorized for public viewing within this project."
				: "Archivos autorizados para consulta pública dentro de este proyecto.",
		genericDocument: locale === "en" ? "Document" : "Documento",
		viewDocument: locale === "en" ? "View document →" : "Ver documento →",
	};

	return (
		<main className="min-h-screen bg-white text-slate-900">
			<section className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-lime-50">
				<div className="mx-auto max-w-7xl px-6 pb-12 pt-24 md:px-10 md:pb-14 md:pt-28 lg:pb-16 lg:pt-32">
					<div className="mb-8">
						<Link
							href="/projects"
							className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 hover:text-lime-700"
						>
							{ui.backToProjects}
						</Link>
					</div>

					<div className="grid items-center gap-12 xl:grid-cols-[1.05fr_0.95fr] xl:gap-16">
						<div className="min-w-0">
							<span className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">
								{project.featured ? ui.featuredProject : ui.authorizedProject}
							</span>

							<h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] text-slate-950 md:text-5xl xl:text-[4rem]">
								{title || ui.noTitle}
							</h1>

							<p className="mt-7 max-w-3xl text-base leading-8 text-slate-600 md:text-lg md:leading-9">
								{summary || ui.noSummary}
							</p>
						</div>

						<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
							<div className="aspect-[16/10] bg-slate-100">
								{coverImageUrl ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={coverImageUrl}
										alt={coverImageAlt || title || ui.noTitle}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
										{ui.noCover}
									</div>
								)}
							</div>

							{coverImageAlt ? (
								<div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
									<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
										{ui.mainImage}
									</p>
									<p className="mt-1 text-sm leading-6 text-slate-700">
										{coverImageAlt}
									</p>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-12">
				<div className="grid grid-cols-1 gap-8">
					<section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-9">
						<h2 className="text-3xl font-semibold text-slate-950 md:text-[2.2rem]">
							{ui.projectSummary}
						</h2>
						<p className="mt-5 max-w-4xl text-base leading-8 text-slate-600 md:text-lg md:leading-9">
							{summary || ui.noSummary}
						</p>
					</section>

					{publicDocuments.length > 0 ? (
						<section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-9">
							<div className="max-w-3xl">
								<span className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-lime-700">
									{ui.publicDocumentation}
								</span>

								<h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
									{ui.projectDocuments}
								</h2>

								<p className="mt-3 text-base leading-7 text-slate-600">
									{ui.publicDocumentsDescription}
								</p>
							</div>

							<div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
								{publicDocuments.map((document) => {
									const href = resolveDocumentLink(document.fileUrl, baseUrl);
									const formattedDate = formatDocumentDate(
										document.documentDate,
										locale,
									);

									return (
										<a
											key={document.documentId}
											href={href}
											target="_blank"
											rel="noreferrer"
											className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-lime-300 hover:bg-white hover:shadow-md"
										>
											<div className="flex h-full flex-col">
												<div className="flex items-start justify-between gap-3">
													<div>
														<p className="text-xs font-semibold uppercase tracking-[0.14em] text-lime-700">
															{resolveDocumentTypeLabel(
																document.documentType,
																locale,
															)}
														</p>
														<h3 className="mt-2 text-lg font-semibold text-slate-900">
															{document.title || ui.genericDocument}
														</h3>
													</div>

													<span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
														{resolveFileExtension(document.fileName)}
													</span>
												</div>

												{document.description ? (
													<p className="mt-3 text-sm leading-7 text-slate-600">
														{document.description}
													</p>
												) : null}

												<div className="mt-5">
													<span className="inline-flex items-center gap-2 text-sm font-semibold text-lime-700">
														{ui.viewDocument}
													</span>
												</div>

												<div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
													{formattedDate ? (
														<span className="rounded-full border border-slate-200 bg-white px-3 py-1">
															{formattedDate}
														</span>
													) : null}

													{document.language !== "none" ? (
														<span className="rounded-full border border-slate-200 bg-white px-3 py-1">
															{document.language.toUpperCase()}
														</span>
													) : null}

													{document.size ? (
														<span className="rounded-full border border-slate-200 bg-white px-3 py-1">
															{formatFileSize(document.size)}
														</span>
													) : null}
												</div>
											</div>
										</a>
									);
								})}
							</div>
						</section>
					) : null}

					<section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-9">
						<ProjectGalleryCarousel
							items={project.gallery}
							projectTitle={title}
							baseUrl={baseUrl}
							locale={locale}
						/>
					</section>
				</div>
			</section>
		</main>
	);
}
