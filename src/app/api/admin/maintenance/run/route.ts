/**
 * =============================================================================
 * 📡 API Route: Admin Maintenance Run
 * Path: src/app/api/admin/maintenance/run/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo para ejecutar manualmente el scheduler de Maintenance.
 *
 * Propósito:
 * - permitir pruebas controladas desde admin
 * - ejecutar el job sin esperar al cron
 * - forzar revisión inmediata de alertas pendientes
 *
 * Reglas:
 * - requiere sesión administrativa
 * - no modifica Projects
 * - delega toda la lógica al job oficial
 * - sin any
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { runMaintenanceSchedulerJob } from "@/lib/maintenance/maintenanceSchedulerJob";

type SessionUserLike = {
	role?: string;
	permissions?: string[];
};

function isAdminSession(session: unknown): boolean {
	const user = (session as { user?: SessionUserLike } | null)?.user;

	if (!user) return false;
	if (user.role === "superadmin" || user.role === "admin") return true;
	if (Array.isArray(user.permissions) && user.permissions.includes("*")) return true;

	return Array.isArray(user.permissions)
		? user.permissions.includes("maintenance.update") ||
		user.permissions.includes("maintenance.create")
		: false;
}

export async function POST() {
	try {
		const session = await getServerSession(authOptions);

		if (!isAdminSession(session)) {
			return NextResponse.json(
				{ ok: false, message: "Unauthorized." },
				{ status: 401 },
			);
		}

		const result = await runMaintenanceSchedulerJob({
			mode: "manual",
			force: true,
		});

		return NextResponse.json({
			ok: true,
			result,
			message: "Maintenance scheduler executed successfully.",
		});
	} catch (error) {
		return NextResponse.json(
			{
				ok: false,
				message:
					error instanceof Error
						? error.message
						: "Maintenance scheduler execution failed.",
			},
			{ status: 500 },
		);
	}
}