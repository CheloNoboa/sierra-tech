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
 * - permitir ejecución controlada del demonio de Maintenance
 * - servir como destino para Vercel Cron
 * - proteger la ejecución mediante un secret interno
 *
 * Reglas:
 * - no debe usarse desde UI
 * - no expone datos sensibles
 * - no modifica Projects
 * - ejecuta únicamente runMaintenanceSchedulerJob()
 * =============================================================================
 */

import { NextResponse } from "next/server";

import { runMaintenanceSchedulerJob } from "@/lib/maintenance/maintenanceSchedulerJob";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
	const expectedSecret = process.env.MAINTENANCE_SCHEDULER_SECRET;

	if (!expectedSecret) return false;

	const authHeader = req.headers.get("authorization") || "";
	const cronSecret = req.headers.get("x-cron-secret") || "";

	return (
		authHeader === `Bearer ${expectedSecret}` ||
		cronSecret === expectedSecret
	);
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

		return NextResponse.json(result);
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