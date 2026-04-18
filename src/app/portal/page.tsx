/**
 * =============================================================================
 * 📄 Page: Client Portal Home
 * Path: src/app/portal/page.tsx
 * =============================================================================
 *
 * ES:
 * Página inicial oficial del portal cliente de Sierra Tech.
 *
 * Propósito:
 * - servir como punto de entrada real del usuario cliente
 * - utilizar el contrato tipado oficial del portal
 * - consumir la capa compartida de lectura de la home del portal
 * - priorizar proyectos, documentos, alertas y mantenimientos
 *
 * Alcance de esta versión:
 * - usa la sesión autenticada disponible
 * - consume datos reales derivados del módulo Projects
 * - presenta estados vacíos útiles cuando aún no existan datos visibles
 *
 * Decisiones:
 * - la home debe responder "qué puedo revisar aquí"
 * - no se exponen detalles técnicos de sesión como foco principal
 * - el contrato visual se alinea con src/types/portal.ts
 * - la carga se resuelve server-side para mantener una primera versión estable
 * - se reutiliza una sola capa de lectura:
 *   src/lib/portal/portalHome.ts
 * - la experiencia prioriza lectura rápida y acciones útiles
 *
 * EN:
 * Official client portal home page for Sierra Tech.
 * =============================================================================
 */

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
	ArrowRight,
	Building2,
	FileText,
	FolderKanban,
	TriangleAlert,
	Wrench,
} from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getPortalHomeDataByOrganization } from "@/lib/portal/portalHome";
import type {
	PortalAlertItem,
	PortalDocumentItem,
	PortalHomeData,
	PortalProjectCard,
} from "@/types/portal";

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

function formatAlertType(value: PortalAlertItem["type"]): string {
	switch (value) {
		case "maintenance_upcoming":
			return "Mantenimiento próximo";
		case "maintenance_overdue":
			return "Mantenimiento vencido";
		case "document_expiring":
			return "Documento por vencer";
		case "warranty_expiring":
			return "Garantía por vencer";
		case "scheduled_review":
			return "Revisión programada";
		case "critical":
			return "Crítica";
		default:
			return "Alerta";
	}
}

function countUpcomingMaintenancesFromProjects(
	projects: PortalProjectCard[],
): number {
	return projects.filter((project) => Boolean(project.nextMaintenanceDate))
		.length;
}

function getUrgentAlerts(alerts: PortalAlertItem[]): PortalAlertItem[] {
	return alerts.slice(0, 3);
}

/* -------------------------------------------------------------------------- */
/* UI helpers                                                                 */
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
		<article className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="mb-4 inline-flex rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
				{icon}
			</div>

			<p className="text-sm font-medium text-text-secondary">{title}</p>
			<p className="mt-3 text-3xl font-bold text-text-primary">{value}</p>
			<p className="mt-2 text-sm leading-6 text-text-secondary">
				{description}
			</p>
		</article>
	);
}

function EmptyStateBlock({
	eyebrow,
	title,
	description,
	href,
	hrefLabel,
}: {
	eyebrow: string;
	title: string;
	description: string;
	href: string;
	hrefLabel: string;
}) {
	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<div className="space-y-3">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
					{eyebrow}
				</p>

				<h2 className="text-xl font-bold tracking-tight text-text-primary">
					{title}
				</h2>

				<p className="text-sm leading-7 text-text-secondary">{description}</p>
			</div>

			<div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
				<p className="text-sm font-medium text-text-primary">
					Aún no hay información disponible
				</p>
				<p className="mt-2 text-sm leading-7 text-text-secondary">
					Esta sección se activará cuando el portal tenga información visible
					para la organización.
				</p>
			</div>

			<div className="mt-5">
				<Link
					href={href}
					className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
				>
					{hrefLabel}
					<ArrowRight className="h-4 w-4" />
				</Link>
			</div>
		</section>
	);
}

function SectionHeader({
	eyebrow,
	title,
	href,
	hrefLabel,
	icon,
}: {
	eyebrow: string;
	title: string;
	href: string;
	hrefLabel: string;
	icon: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div className="flex items-center gap-3">
				<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
					{icon}
				</div>

				<div className="space-y-1">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
						{eyebrow}
					</p>
					<h2 className="text-xl font-bold tracking-tight text-text-primary">
						{title}
					</h2>
				</div>
			</div>

			<Link
				href={href}
				className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
			>
				{hrefLabel}
				<ArrowRight className="h-4 w-4" />
			</Link>
		</div>
	);
}

function ProjectListBlock({ projects }: { projects: PortalProjectCard[] }) {
	if (projects.length === 0) {
		return (
			<div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
				<p className="text-sm font-medium text-text-primary">
					Aún no hay proyectos destacados
				</p>
				<p className="mt-2 text-sm leading-7 text-text-secondary">
					Cuando Sierra Tech publique proyectos visibles para tu organización,
					aparecerán aquí como acceso rápido.
				</p>
			</div>
		);
	}

	return (
		<div className="mt-6 space-y-4">
			{projects.map((project) => (
				<article
					key={project.projectId}
					className="rounded-2xl border border-border bg-surface px-5 py-5"
				>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0 space-y-3">
							<h3 className="text-lg font-semibold text-text-primary">
								{project.title}
							</h3>

							<p className="text-sm leading-7 text-text-secondary">
								{project.summary}
							</p>

							<div className="flex flex-wrap gap-2">
								{project.category ? (
									<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
										{project.category}
									</span>
								) : null}

								{project.nextRelevantDate ? (
									<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
										Próxima fecha: {formatDateLabel(project.nextRelevantDate)}
									</span>
								) : null}
							</div>
						</div>

						<Link
							href={`/portal/projects/${project.projectId}`}
							className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
						>
							Ver proyecto
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</article>
			))}
		</div>
	);
}

function DocumentListBlock({ documents }: { documents: PortalDocumentItem[] }) {
	if (documents.length === 0) {
		return (
			<div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
				<p className="text-sm font-medium text-text-primary">
					Aún no hay documentos recientes
				</p>
				<p className="mt-2 text-sm leading-7 text-text-secondary">
					Los archivos autorizados para tu organización aparecerán aquí cuando
					estén disponibles.
				</p>
			</div>
		);
	}

	return (
		<div className="mt-6 space-y-4">
			{documents.map((document) => (
				<article
					key={document.documentId}
					className="rounded-2xl border border-border bg-surface px-5 py-5"
				>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0 space-y-3">
							<h3 className="text-lg font-semibold text-text-primary">
								{document.title}
							</h3>

							<p className="text-sm leading-7 text-text-secondary">
								{document.description ??
									"Documento autorizado visible en el portal."}
							</p>

							<div className="flex flex-wrap gap-2">
								{document.projectTitle ? (
									<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
										{document.projectTitle}
									</span>
								) : null}

								{document.maintenanceTitle ? (
									<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
										{document.maintenanceTitle}
									</span>
								) : null}
							</div>
						</div>

						<div className="flex flex-wrap gap-3">
							<a
								href={document.fileUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
							>
								Ver documento
								<ArrowRight className="h-4 w-4" />
							</a>

							{document.projectId ? (
								<Link
									href={`/portal/projects/${document.projectId}`}
									className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
								>
									Ver proyecto
									<ArrowRight className="h-4 w-4" />
								</Link>
							) : null}
						</div>
					</div>
				</article>
			))}
		</div>
	);
}

function AlertsListBlock({ alerts }: { alerts: PortalAlertItem[] }) {
	if (alerts.length === 0) {
		return (
			<div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center">
				<p className="text-sm font-medium text-text-primary">
					No hay alertas activas por el momento
				</p>
				<p className="mt-2 text-sm leading-7 text-text-secondary">
					Aquí se mostrarán mantenimientos próximos, vencimientos documentales y
					otros avisos relevantes para tu organización.
				</p>
			</div>
		);
	}

	return (
		<div className="mt-6 space-y-4">
			{alerts.map((alert) => (
				<article
					key={alert.alertId}
					className="rounded-2xl border border-border bg-surface px-5 py-5"
				>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0 space-y-3">
							<div className="flex flex-wrap gap-2">
								<span className="inline-flex rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-xs font-medium text-brand-primaryStrong">
									{formatAlertType(alert.type)}
								</span>

								<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
									Prioridad{" "}
									{alert.priority === "high"
										? "alta"
										: alert.priority === "medium"
											? "media"
											: "baja"}
								</span>
							</div>

							<h3 className="text-lg font-semibold text-text-primary">
								{alert.title}
							</h3>

							<p className="text-sm leading-7 text-text-secondary">
								{alert.description}
							</p>
						</div>

						<Link
							href={
								alert.projectId
									? `/portal/projects/${alert.projectId}`
									: "/portal/alerts"
							}
							className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
						>
							Revisar
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</article>
			))}
		</div>
	);
}

function MaintenanceOverviewBlock({
	projects,
}: {
	projects: PortalProjectCard[];
}) {
	const maintenanceProjects = projects.filter((project) =>
		Boolean(project.nextMaintenanceDate),
	);

	if (maintenanceProjects.length === 0) {
		return (
			<EmptyStateBlock
				eyebrow="Mantenimientos"
				title="Mantenimientos y próximas fechas"
				description="Esta sección resume mantenimientos próximos y actividades de seguimiento relevantes para la organización, alimentando también el módulo global de alertas."
				href="/portal/alerts"
				hrefLabel="Ir a alertas"
			/>
		);
	}

	return (
		<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
			<SectionHeader
				eyebrow="Mantenimientos"
				title="Próximas actividades"
				href="/portal/alerts"
				hrefLabel="Ver alertas"
				icon={<Wrench className="h-5 w-5" />}
			/>

			<div className="mt-6 space-y-4">
				{maintenanceProjects.slice(0, 3).map((project) => (
					<article
						key={`maintenance-${project.projectId}`}
						className="rounded-2xl border border-border bg-surface px-5 py-5"
					>
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							<div className="min-w-0 space-y-2">
								<h3 className="text-lg font-semibold text-text-primary">
									{project.title}
								</h3>

								<p className="text-sm leading-7 text-text-secondary">
									Próxima fecha de mantenimiento:
								</p>

								<span className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary">
									{formatDateLabel(project.nextMaintenanceDate)}
								</span>
							</div>

							<Link
								href={`/portal/projects/${project.projectId}`}
								className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
							>
								Ver proyecto
								<ArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function PortalHomePage() {
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

	const homeData: PortalHomeData = await getPortalHomeDataByOrganization({
		organizationId: user.organizationId,
		organizationName: user.organizationName ?? "Organización",
		userName: user.name ?? "Cliente",
	});

	const urgentAlerts = getUrgentAlerts(homeData.alerts);
	const upcomingMaintenances = countUpcomingMaintenancesFromProjects(
		homeData.featuredProjects,
	);

	return (
		<div className="space-y-6">
			<section className="rounded-[30px] border border-border bg-white p-8 shadow-sm">
				<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
					<div className="max-w-3xl space-y-4">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-primaryStrong">
							Portal cliente Sierra Tech
						</p>

						<h1 className="text-3xl font-bold tracking-tight text-text-primary">
							Bienvenido, {homeData.userName}.
						</h1>

						<p className="text-base leading-8 text-text-secondary">
							Este espacio privado fue preparado para que{" "}
							<strong>{homeData.organizationName}</strong> pueda consultar la
							información autorizada relacionada con proyectos, documentos,
							mantenimientos y alertas relevantes dentro de Sierra Tech.
						</p>

						<div className="flex flex-wrap gap-3">
							<Link
								href="/portal/projects"
								className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
							>
								Ver proyectos
								<ArrowRight className="h-4 w-4" />
							</Link>

							<Link
								href="/portal/documents"
								className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-brand-primary/40 hover:bg-brand-primary/5"
							>
								Ver documentos
								<ArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</div>

					<div className="rounded-2xl border border-border bg-surface px-4 py-4">
						<div className="flex items-start gap-3">
							<div className="rounded-2xl bg-brand-primary/10 p-3 text-brand-primaryStrong">
								<Building2 className="h-5 w-5" />
							</div>

							<div>
								<p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
									Organización
								</p>
								<p className="mt-1 text-sm font-semibold text-text-primary">
									{homeData.organizationName}
								</p>
								<p className="text-xs text-text-secondary">
									Usuario: {user.email ?? "—"}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
				<SummaryCard
					title="Proyectos activos"
					value={homeData.summary.activeProjects}
					description="Proyectos visibles para la organización."
					icon={<FolderKanban className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Documentos recientes"
					value={homeData.summary.recentDocuments}
					description="Archivos autorizados disponibles en el portal."
					icon={<FileText className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Alertas activas"
					value={homeData.summary.activeAlerts}
					description="Avisos relevantes visibles para seguimiento."
					icon={<TriangleAlert className="h-5 w-5" />}
				/>

				<SummaryCard
					title="Mantenimientos próximos"
					value={upcomingMaintenances}
					description="Proyectos con próxima fecha relevante."
					icon={<Wrench className="h-5 w-5" />}
				/>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
				<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
					<SectionHeader
						eyebrow="Proyectos"
						title="Proyectos destacados"
						href="/portal/projects"
						hrefLabel="Ver todos"
						icon={<FolderKanban className="h-5 w-5" />}
					/>

					<ProjectListBlock projects={homeData.featuredProjects} />
				</section>

				<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
					<SectionHeader
						eyebrow="Alertas"
						title="Seguimiento inmediato"
						href="/portal/alerts"
						hrefLabel="Ver alertas"
						icon={<TriangleAlert className="h-5 w-5" />}
					/>

					<AlertsListBlock alerts={urgentAlerts} />
				</section>
			</section>

			<section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
				<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
					<SectionHeader
						eyebrow="Documentos"
						title="Documentos recientes"
						href="/portal/documents"
						hrefLabel="Ver biblioteca"
						icon={<FileText className="h-5 w-5" />}
					/>

					<DocumentListBlock documents={homeData.recentDocuments} />
				</section>

				<MaintenanceOverviewBlock projects={homeData.featuredProjects} />
			</section>

			<section className="rounded-[28px] border border-border bg-white p-6 shadow-sm">
				<div className="space-y-3">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-primaryStrong">
						Alcance del portal
					</p>

					<h2 className="text-xl font-bold tracking-tight text-text-primary">
						Espacio privado para consulta documental y operativa
					</h2>

					<p className="max-w-4xl text-sm leading-7 text-text-secondary">
						El portal cliente de Sierra Tech está diseñado para brindar acceso
						privado y controlado a la información autorizada de cada
						organización. Esta home resume proyectos visibles, documentos
						recientes, mantenimientos próximos y alertas relevantes sin exponer
						estructuras internas del sistema administrativo.
					</p>
				</div>
			</section>
		</div>
	);
}
