/**
 * =============================================================================
 * 📄 Page: Client Portal Projects
 * Path: src/app/portal/projects/page.tsx
 * =============================================================================
 *
 * ES:
 * Página oficial de Proyectos para el portal cliente de Sierra Tech.
 *
 * Propósito:
 * - consumir el listado real de proyectos visibles para la organización
 * - presentar cards limpias y útiles para acceso al detalle
 * - mantener una UX estable y corporativa
 *
 * Alcance de esta versión:
 * - consume la capa compartida de lectura del portal
 * - no implementa filtros todavía
 * - no mezcla lógica de detalle en esta pantalla
 *
 * Decisiones:
 * - la carga se resuelve server-side para una primera versión estable
 * - la página usa exclusivamente el contrato PortalProjectCard
 * - si no hay datos, muestra un estado vacío serio y útil
 * - se evita fetch interno server-to-server para no depender de URLs absolutas,
 *   cookies manuales ni complejidad innecesaria
 *
 * EN:
 * Official Projects page for the Sierra Tech client portal.
 * =============================================================================
 */

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
	ArrowRight,
	FileText,
	FolderKanban,
	TriangleAlert,
	Wrench,
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPortalProjectsByOrganization } from "@/lib/portal/portalProjects";
import type { PortalProjectCard } from "@/types/portal";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatVisibleStatus(
	value: PortalProjectCard["visibleStatus"],
): string {
	switch (value) {
		case "active":
			return "Activo";
		case "follow_up":
			return "En seguimiento";
		case "completed":
			return "Completado";
		case "maintenance":
			return "Con mantenimiento";
		default:
			return "Proyecto";
	}
}

/* -------------------------------------------------------------------------- */
/* UI                                                                         */
/* -------------------------------------------------------------------------- */

function ProjectCard({ project }: { project: PortalProjectCard }) {
	return (
		<article className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-3">
					<span className="inline-flex rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primaryStrong">
						{formatVisibleStatus(project.visibleStatus)}
					</span>

					<h2 className="text-xl font-bold tracking-tight text-text-primary">
						{project.title}
					</h2>

					<p className="text-sm leading-7 text-text-secondary">
						{project.summary}
					</p>
				</div>

				<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
					<FolderKanban className="h-5 w-5" />
				</div>
			</div>

			<div className="mt-6 grid gap-3 sm:grid-cols-3">
				<div className="rounded-2xl border border-border bg-surface px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
						Documentos
					</p>
					<p className="mt-2 text-sm font-semibold text-text-primary">
						{project.documentsCount}
					</p>
				</div>

				<div className="rounded-2xl border border-border bg-surface px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
						Alertas activas
					</p>
					<p className="mt-2 text-sm font-semibold text-text-primary">
						{project.activeAlertsCount}
					</p>
				</div>

				<div className="rounded-2xl border border-border bg-surface px-4 py-3">
					<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
						Próxima fecha
					</p>
					<p className="mt-2 text-sm font-semibold text-text-primary">
						{project.nextRelevantDate ?? "—"}
					</p>
				</div>
			</div>

			<div className="mt-5 flex justify-end">
				<Link
					href={`/portal/projects/${project.projectId}`}
					className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
				>
					Ver detalle
					<ArrowRight className="h-4 w-4" />
				</Link>
			</div>
		</article>
	);
}

function EmptyProjectsState() {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="space-y-3">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
					Listado principal
				</p>

				<h2 className="text-xl font-bold tracking-tight text-text-primary">
					Aún no hay proyectos visibles
				</h2>

				<p className="text-sm leading-7 text-text-secondary">
					Cuando Sierra Tech publique proyectos autorizados para tu
					organización, aquí podrás consultar su información general, su
					documentación asociada y el seguimiento relevante dentro del portal.
				</p>
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function PortalProjectsPage() {
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

	const projects = await getPortalProjectsByOrganization(user.organizationId);

	const totalDocuments = projects.reduce(
		(accumulator, item) => accumulator + item.documentsCount,
		0,
	);
	const totalAlerts = projects.reduce(
		(accumulator, item) => accumulator + item.activeAlertsCount,
		0,
	);

	return (
		<div className="space-y-6">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="max-w-3xl space-y-4">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
						Proyectos autorizados
					</p>

					<h1 className="text-3xl font-bold tracking-tight text-text-primary">
						Proyectos de la organización
					</h1>

					<p className="text-base leading-8 text-text-secondary">
						En esta sección se muestran los proyectos visibles para tu
						organización, junto con su contexto general, documentación asociada,
						alertas relevantes y próximas fechas de seguimiento.
					</p>
				</div>
			</section>

			<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
				<div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
					<div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
						<FolderKanban className="h-5 w-5" />
					</div>
					<p className="text-sm font-medium text-text-secondary">
						Proyectos visibles
					</p>
					<p className="mt-3 text-3xl font-bold text-text-primary">
						{projects.length}
					</p>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						Proyectos autorizados para consulta en el portal.
					</p>
				</div>

				<div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
					<div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
						<FileText className="h-5 w-5" />
					</div>
					<p className="text-sm font-medium text-text-secondary">
						Documentos asociados
					</p>
					<p className="mt-3 text-3xl font-bold text-text-primary">
						{totalDocuments}
					</p>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						Archivos visibles vinculados a proyectos.
					</p>
				</div>

				<div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
					<div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
						<TriangleAlert className="h-5 w-5" />
					</div>
					<p className="text-sm font-medium text-text-secondary">
						Alertas por proyecto
					</p>
					<p className="mt-3 text-3xl font-bold text-text-primary">
						{totalAlerts}
					</p>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						Avisos relevantes vinculados a proyectos visibles.
					</p>
				</div>

				<div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
					<div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
						<Wrench className="h-5 w-5" />
					</div>
					<p className="text-sm font-medium text-text-secondary">
						Seguimiento operativo
					</p>
					<p className="mt-3 text-3xl font-bold text-text-primary">
						{projects.length > 0 ? "Activo" : "—"}
					</p>
					<p className="mt-2 text-sm leading-6 text-text-secondary">
						Base para mantenimientos y próximas fechas relevantes.
					</p>
				</div>
			</section>

			{projects.length === 0 ? (
				<EmptyProjectsState />
			) : (
				<section className="space-y-4">
					{projects.map((project) => (
						<ProjectCard key={project.projectId} project={project} />
					))}
				</section>
			)}
		</div>
	);
}
