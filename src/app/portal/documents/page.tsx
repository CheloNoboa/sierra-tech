/**
 * =============================================================================
 * 📄 Page: Client Portal Documents
 * Path: src/app/portal/documents/page.tsx
 * =============================================================================
 *
 * ES:
 * Página oficial de Documentos para el portal cliente de Sierra Tech.
 *
 * Propósito:
 * - concentrar la biblioteca documental visible para la organización
 * - mostrar contratos, reportes, manuales, garantías y demás archivos
 *   autorizados desde una sola vista
 * - reutilizar la capa compartida de lectura documental del portal
 *
 * Alcance de esta versión:
 * - usa sesión autenticada server-side
 * - consume datos reales derivados del módulo Projects
 * - incorpora filtros simples y útiles para búsqueda documental
 * - prioriza claridad, confianza y acceso real al archivo
 *
 * Decisiones:
 * - la vista documental debe priorizar claridad y confianza
 * - los documentos visibles en esta fase provienen del módulo Projects
 * - no se expone información administrativa interna no relevante para cliente
 * - la carga se resuelve server-side para una primera versión estable
 * - los filtros viven en la URL para permitir navegación y recarga consistente
 * - no se agregan helpers innecesarios fuera de esta pantalla
 *
 * EN:
 * Official Documents page for the Sierra Tech client portal.
 * =============================================================================
 */

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
	ArrowRight,
	FileBadge,
	FileText,
	FileWarning,
	Search,
	ShieldCheck,
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPortalDocumentsByOrganization } from "@/lib/portal/portalDocuments";
import type { PortalDocumentItem } from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface PortalDocumentsPageProps {
	searchParams?: Promise<{
		q?: string;
		projectId?: string;
		source?: string;
	}>;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDateLabel(value: string | null | undefined): string {
	if (!value) return "—";

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "—";

	return new Intl.DateTimeFormat("es-EC", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

function formatCompactText(value: string | null | undefined): string {
	const safe = value?.trim() ?? "";
	return safe.length > 0 ? safe : "—";
}

function formatDocumentType(value: PortalDocumentItem["type"]): string {
	switch (value) {
		case "contract":
			return "Contrato";
		case "planning":
			return "Planificación";
		case "schedule":
			return "Cronograma";
		case "technical_design":
			return "Diseño técnico";
		case "plan":
			return "Plan";
		case "technical_report":
			return "Reporte técnico";
		case "technical_sheet":
			return "Ficha técnica";
		case "operation_manual":
			return "Manual de operación";
		case "maintenance_manual":
			return "Manual de mantenimiento";
		case "inspection_report":
			return "Reporte de inspección";
		case "maintenance_report":
			return "Reporte de mantenimiento";
		case "delivery_record":
			return "Acta de entrega";
		case "certificate":
			return "Certificado";
		case "warranty":
			return "Garantía";
		case "invoice":
			return "Factura";
		case "permit":
			return "Permiso";
		case "photo_evidence":
			return "Evidencia fotográfica";
		case "other":
			return "Otro";
		default:
			return "Documento";
	}
}

function normalizeFilterValue(value: string | undefined): string {
	return value?.trim() ?? "";
}

function buildSearchIndex(item: PortalDocumentItem): string {
	return [
		item.title,
		item.description,
		item.projectTitle,
		item.fileName,
		item.maintenanceTitle,
		formatDocumentType(item.type),
	]
		.filter(
			(value): value is string =>
				typeof value === "string" && value.trim().length > 0,
		)
		.join(" ")
		.toLowerCase();
}

function matchesTextQuery(item: PortalDocumentItem, query: string): boolean {
	if (!query) return true;
	return buildSearchIndex(item).includes(query.toLowerCase());
}

function matchesProjectFilter(
	item: PortalDocumentItem,
	projectId: string,
): boolean {
	if (!projectId || projectId === "all") return true;
	return (item.projectId ?? "") === projectId;
}

function matchesSourceFilter(
	item: PortalDocumentItem,
	source: string,
): boolean {
	if (!source || source === "all") return true;
	return item.source === source;
}

function getSourceLabel(item: PortalDocumentItem): string {
	return item.source === "maintenance_attachment"
		? "Adjunto de mantenimiento"
		: formatDocumentType(item.type);
}

function getUniqueProjectOptions(items: PortalDocumentItem[]): Array<{
	projectId: string;
	projectTitle: string;
}> {
	const map = new Map<string, string>();

	for (const item of items) {
		const projectId = item.projectId?.trim() ?? "";
		const projectTitle = item.projectTitle?.trim() ?? "";

		if (!projectId || !projectTitle) continue;
		if (!map.has(projectId)) {
			map.set(projectId, projectTitle);
		}
	}

	return Array.from(map.entries())
		.map(([projectId, projectTitle]) => ({ projectId, projectTitle }))
		.sort((a, b) =>
			a.projectTitle.localeCompare(b.projectTitle, "es", {
				sensitivity: "base",
			}),
		);
}

function countMaintenanceAttachments(items: PortalDocumentItem[]): number {
	return items.filter((item) => item.source === "maintenance_attachment")
		.length;
}

function countProjectDocuments(items: PortalDocumentItem[]): number {
	return items.filter((item) => item.source === "project_document").length;
}

/* -------------------------------------------------------------------------- */
/* UI                                                                         */
/* -------------------------------------------------------------------------- */

function SummaryCard({
	title,
	value,
	description,
	icon,
}: {
	title: string;
	value: number;
	description: string;
	icon: React.ReactNode;
}) {
	return (
		<div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
			<div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
				{icon}
			</div>

			<p className="text-sm font-medium text-text-secondary">{title}</p>
			<p className="mt-3 text-3xl font-bold text-text-primary">{value}</p>
			<p className="mt-2 text-sm leading-6 text-text-secondary">
				{description}
			</p>
		</div>
	);
}

function EmptyDocumentState() {
	return (
		<article className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="space-y-3">
				<span className="inline-flex rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primaryStrong">
					Sin documentos
				</span>

				<h2 className="text-xl font-bold tracking-tight text-text-primary">
					Aún no hay documentos visibles
				</h2>

				<p className="text-sm leading-7 text-text-secondary">
					Cuando Sierra Tech publique archivos autorizados para tu organización,
					aquí podrás consultarlos de manera centralizada dentro de esta
					biblioteca documental.
				</p>
			</div>
		</article>
	);
}

function EmptyFilterResultsState() {
	return (
		<article className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="space-y-3">
				<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
					Sin coincidencias
				</span>

				<h2 className="text-xl font-bold tracking-tight text-text-primary">
					No encontramos documentos con esos filtros
				</h2>

				<p className="text-sm leading-7 text-text-secondary">
					Ajusta la búsqueda, cambia el proyecto o revisa el origen documental
					para encontrar más resultados.
				</p>
			</div>
		</article>
	);
}

function FilterBar({
	query,
	projectId,
	source,
	projectOptions,
}: {
	query: string;
	projectId: string;
	source: string;
	projectOptions: Array<{
		projectId: string;
		projectTitle: string;
	}>;
}) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<form className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)_auto] xl:items-end">
				<div className="min-w-0">
					<label
						htmlFor="portal-documents-q"
						className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
					>
						Buscar
					</label>

					<div className="flex h-11 items-center gap-3 rounded-2xl border border-border bg-surface px-4">
						<Search className="h-4 w-4 shrink-0 text-text-secondary" />
						<input
							id="portal-documents-q"
							name="q"
							defaultValue={query}
							placeholder="Buscar por título, archivo, proyecto o mantenimiento"
							className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
						/>
					</div>
				</div>

				<div className="min-w-0">
					<label
						htmlFor="portal-documents-project"
						className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
					>
						Proyecto
					</label>

					<select
						id="portal-documents-project"
						name="projectId"
						defaultValue={projectId || "all"}
						className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
					>
						<option value="all">Todos los proyectos</option>
						{projectOptions.map((option) => (
							<option key={option.projectId} value={option.projectId}>
								{option.projectTitle}
							</option>
						))}
					</select>
				</div>

				<div className="min-w-0">
					<label
						htmlFor="portal-documents-source"
						className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong"
					>
						Origen
					</label>

					<select
						id="portal-documents-source"
						name="source"
						defaultValue={source || "all"}
						className="h-11 w-full rounded-2xl border border-border bg-surface px-4 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
					>
						<option value="all">Todos</option>
						<option value="project_document">Documento del proyecto</option>
						<option value="maintenance_attachment">
							Adjunto de mantenimiento
						</option>
					</select>
				</div>

				<div className="flex flex-wrap items-center gap-3 xl:self-end">
					<button
						type="submit"
						className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand-primary px-6 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white"
					>
						Aplicar
					</button>

					<Link
						href="/portal/documents"
						className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-white px-6 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
					>
						Limpiar
					</Link>
				</div>
			</form>
		</section>
	);
}

function ActiveFiltersSummary({
	query,
	projectId,
	source,
	projectOptions,
	totalVisible,
}: {
	query: string;
	projectId: string;
	source: string;
	projectOptions: Array<{
		projectId: string;
		projectTitle: string;
	}>;
	totalVisible: number;
}) {
	const selectedProject =
		projectOptions.find((option) => option.projectId === projectId)
			?.projectTitle ?? "Todos los proyectos";

	const selectedSource =
		source === "maintenance_attachment"
			? "Adjunto de mantenimiento"
			: source === "project_document"
				? "Documento del proyecto"
				: "Todos";

	const hasActiveFilters = Boolean(
		query || (projectId && projectId !== "all") || (source && source !== "all"),
	);

	if (!hasActiveFilters) {
		return null;
	}

	return (
		<section className="rounded-[24px] border border-border bg-white p-5 shadow-sm">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
						Filtros activos
					</p>

					<div className="flex flex-wrap gap-2">
						{query ? (
							<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
								Búsqueda: {query}
							</span>
						) : null}

						{projectId && projectId !== "all" ? (
							<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
								Proyecto: {selectedProject}
							</span>
						) : null}

						{source && source !== "all" ? (
							<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
								Origen: {selectedSource}
							</span>
						) : null}
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-surface px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
						Resultados visibles
					</p>
					<p className="mt-1 text-lg font-bold text-text-primary">
						{totalVisible}
					</p>
				</div>
			</div>
		</section>
	);
}

function DocumentCard({ item }: { item: PortalDocumentItem }) {
	const sourceLabel = getSourceLabel(item);

	return (
		<article className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 space-y-3">
					<div className="flex flex-wrap gap-2">
						<span className="inline-flex rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primaryStrong">
							{sourceLabel}
						</span>

						{item.maintenanceTitle ? (
							<span className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
								{item.maintenanceTitle}
							</span>
						) : null}
					</div>

					<h2 className="break-words text-xl font-bold tracking-tight text-text-primary">
						{item.title}
					</h2>

					<p className="break-words text-sm leading-7 text-text-secondary">
						{item.description ??
							"Documento autorizado visible dentro del portal cliente."}
					</p>
				</div>

				<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
					<FileText className="h-5 w-5" />
				</div>
			</div>

			<div className="mt-6 grid gap-3 sm:grid-cols-3">
				<div className="rounded-2xl border border-border bg-surface px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
						Proyecto
					</p>
					<p className="mt-2 break-words text-sm font-semibold text-text-primary">
						{formatCompactText(item.projectTitle)}
					</p>
				</div>

				<div className="rounded-2xl border border-border bg-surface px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
						Origen
					</p>
					<p className="mt-2 break-words text-sm font-semibold text-text-primary">
						{sourceLabel}
					</p>
				</div>

				<div className="rounded-2xl border border-border bg-surface px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
						Fecha relevante
					</p>
					<p className="mt-2 text-sm font-semibold text-text-primary">
						{formatDateLabel(
							item.expiresAt ?? item.documentDate ?? item.uploadedAt,
						)}
					</p>
				</div>
			</div>

			<div className="mt-5 flex flex-wrap gap-3">
				<a
					href={item.fileUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
				>
					Ver documento
					<ArrowRight className="h-4 w-4" />
				</a>

				{item.projectId ? (
					<Link
						href={`/portal/projects/${item.projectId}`}
						className="inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
					>
						Ver proyecto
						<ArrowRight className="h-4 w-4" />
					</Link>
				) : null}
			</div>
		</article>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function PortalDocumentsPage({
	searchParams,
}: PortalDocumentsPageProps) {
	const session = await getServerSession(authOptions);
	const user = session?.user;

	/**
	 * Defensa adicional server-side.
	 * El middleware ya protege /portal, pero la página no debe continuar si
	 * la sesión cliente no es válida.
	 */
	if (
		!user ||
		user.userType !== "client" ||
		user.status !== "active" ||
		!user.organizationId
	) {
		redirect("/login");
	}

	const resolvedSearchParams = searchParams ? await searchParams : {};
	const query = normalizeFilterValue(resolvedSearchParams.q);
	const projectId =
		normalizeFilterValue(resolvedSearchParams.projectId) || "all";
	const source = normalizeFilterValue(resolvedSearchParams.source) || "all";

	const documentsData = await getPortalDocumentsByOrganization(
		user.organizationId,
	);
	const projectOptions = getUniqueProjectOptions(documentsData.items);

	const filteredItems = documentsData.items.filter((item) => {
		return (
			matchesTextQuery(item, query) &&
			matchesProjectFilter(item, projectId) &&
			matchesSourceFilter(item, source)
		);
	});

	return (
		<div className="space-y-6">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="max-w-3xl space-y-4">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
						Biblioteca documental
					</p>

					<h1 className="text-3xl font-bold tracking-tight text-text-primary">
						Documentos de la organización
					</h1>

					<p className="text-base leading-8 text-text-secondary">
						En esta sección se concentran los documentos autorizados para tu
						organización: contratos, reportes técnicos, manuales, certificados,
						garantías y demás archivos visibles dentro del portal cliente de
						Sierra Tech.
					</p>
				</div>
			</section>

			<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title="Documentos visibles"
					value={documentsData.summary.totalDocuments}
					description="Archivos autorizados para consulta dentro del portal."
					icon={<FileText className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Contratos y actas"
					value={documentsData.summary.contractsAndRecords}
					description="Documentos contractuales y registros de entrega o recepción."
					icon={<FileBadge className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Manuales y garantías"
					value={documentsData.summary.manualsAndWarranties}
					description="Soportes técnicos, garantías y documentación operativa relevante."
					icon={<ShieldCheck className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Archivos con fecha crítica"
					value={documentsData.summary.criticalDateDocuments}
					description="Elementos que luego alimentan alertas y seguimiento."
					icon={<FileWarning className="h-5 w-5" />}
				/>
			</section>

			<FilterBar
				query={query}
				projectId={projectId}
				source={source}
				projectOptions={projectOptions}
			/>

			<ActiveFiltersSummary
				query={query}
				projectId={projectId}
				source={source}
				projectOptions={projectOptions}
				totalVisible={filteredItems.length}
			/>

			<section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
				<div className="space-y-4">
					<div className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
								Listado principal
							</p>

							<h2 className="text-xl font-bold tracking-tight text-text-primary">
								Biblioteca documental disponible
							</h2>

							<p className="text-sm leading-7 text-text-secondary">
								Aquí se muestran los documentos autorizados para tu
								organización, con referencia al proyecto relacionado, origen
								documental y fechas relevantes cuando apliquen.
							</p>
						</div>
					</div>

					{documentsData.items.length === 0 ? (
						<EmptyDocumentState />
					) : filteredItems.length === 0 ? (
						<EmptyFilterResultsState />
					) : (
						filteredItems.map((item) => (
							<DocumentCard key={item.documentId} item={item} />
						))
					)}
				</div>

				<div className="space-y-6">
					<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
								Contexto documental
							</p>

							<h2 className="text-xl font-bold tracking-tight text-text-primary">
								Alcance visible en portal
							</h2>
						</div>

						<div className="mt-5 space-y-3">
							<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
								Contratos y anexos
							</div>

							<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
								Reportes técnicos
							</div>

							<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
								Manuales de operación y mantenimiento
							</div>

							<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
								Certificados y garantías
							</div>

							<div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
								Evidencia documental del proyecto
							</div>
						</div>

						<div className="mt-5 space-y-3">
							<div className="rounded-2xl border border-border bg-surface px-4 py-4">
								<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
									Proyectos relacionados
								</p>
								<p className="mt-2 text-2xl font-bold text-text-primary">
									{documentsData.relatedProjectsCount}
								</p>
								<p className="mt-2 text-sm leading-6 text-text-secondary">
									Proyectos que aportan documentos visibles al portal.
								</p>
							</div>

							<div className="rounded-2xl border border-border bg-surface px-4 py-4">
								<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
									Adjuntos de mantenimiento
								</p>
								<p className="mt-2 text-2xl font-bold text-text-primary">
									{countMaintenanceAttachments(documentsData.items)}
								</p>
								<p className="mt-2 text-sm leading-6 text-text-secondary">
									Archivos operativos que suelen volver a solicitarse.
								</p>
							</div>

							<div className="rounded-2xl border border-border bg-surface px-4 py-4">
								<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
									Documentos del proyecto
								</p>
								<p className="mt-2 text-2xl font-bold text-text-primary">
									{countProjectDocuments(documentsData.items)}
								</p>
								<p className="mt-2 text-sm leading-6 text-text-secondary">
									Archivos documentales registrados directamente en los
									proyectos.
								</p>
							</div>
						</div>
					</section>

					<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
						<div className="space-y-3">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
								Siguiente módulo
							</p>

							<h2 className="text-xl font-bold tracking-tight text-text-primary">
								Alertas y seguimiento
							</h2>

							<p className="text-sm leading-7 text-text-secondary">
								La vista de alertas concentra mantenimientos próximos,
								documentos con fecha crítica y otros avisos relevantes visibles
								para tu organización.
							</p>
						</div>

						<div className="mt-5">
							<Link
								href="/portal/alerts"
								className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
							>
								Ir a alertas
								<ArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</section>
				</div>
			</section>
		</div>
	);
}
