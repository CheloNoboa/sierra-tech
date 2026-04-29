/**
 * =============================================================================
 * 🤖 API Route: Internal Maintenance Scheduler
 * Path: src/app/api/internal/maintenance/scheduler/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint interno para ejecutar el job automático de Maintenance.
 *
 * Propósito:
 * - servir como destino oficial para Vercel Cron
 * - permitir ejecución programada diaria del scheduler
 * - proteger la ejecución mediante secret interno
 * - centralizar la llamada a runMaintenanceSchedulerJob()
 *
 * Seguridad:
 * - Vercel Cron envía CRON_SECRET automáticamente en:
 *   Authorization: Bearer <CRON_SECRET>
 * - también se acepta MAINTENANCE_SCHEDULER_SECRET como fallback interno
 * - no debe ser llamado desde UI pública
 *
 * Reglas:
 * - no expone datos sensibles
 * - no modifica Projects directamente
 * - no contiene lógica del scheduler
 * - solo valida autorización y ejecuta runMaintenanceSchedulerJob()
 *
 * EN:
 * Internal endpoint used by Vercel Cron to run the Maintenance scheduler job.
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { runMaintenanceSchedulerJob } from "@/lib/maintenance/maintenanceSchedulerJob";

export const dynamic = "force-dynamic";

function getExpectedSecrets(): string[] {
	return [
		process.env.CRON_SECRET,
		process.env.MAINTENANCE_SCHEDULER_SECRET,
	].filter((value): value is string => {
		return typeof value === "string" && value.trim().length > 0;
	});
}

function isAuthorized(req: Request): boolean {
	const expectedSecrets = getExpectedSecrets();

	if (expectedSecrets.length === 0) return false;

	const authHeader = req.headers.get("authorization") ?? "";
	const cronSecretHeader = req.headers.get("x-cron-secret") ?? "";

	return expectedSecrets.some((secret) => {
		return (
			authHeader === `Bearer ${secret}` ||
			cronSecretHeader === secret
		);
	});
}

export async function GET(req: Request) {
	try {
		if (!isAuthorized(req)) {
			return NextResponse.json(
				{
					ok: false,
					error: "Unauthorized.",
				},
				{ status: 401 },
			);
		}

		const result = await runMaintenanceSchedulerJob();

		return NextResponse.json({
			ok: true,
			source: "internal-cron",
			result,
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error
						? error.message
						: "Error running maintenance scheduler.",
			},
			{ status: 500 },
		);
	}
}