/**
 * =============================================================================
 * 📄 API Route: Portal Maintenance Complete
 * Path: src/app/api/portal/maintenance/[maintenanceId]/complete/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint protegido del portal cliente para marcar como realizada una fila
 * específica de la programación de mantenimiento.
 *
 * Propósito:
 * - permitir que un usuario cliente confirme la ejecución de un mantenimiento
 * - actualizar únicamente el campo permitido dentro del schedule
 * - conservar el schedule como fuente de verdad operativa
 * - mantener separado el flujo cliente del flujo administrativo
 *
 * Responsabilidades:
 * - validar sesión activa mediante NextAuth
 * - aceptar únicamente usuarios de tipo cliente
 * - validar que la sesión tenga organización asociada
 * - validar que el mantenimiento pertenezca a la organización del cliente
 * - validar que el índice recibido exista dentro del schedule
 * - marcar la fila seleccionada como completed = true
 * - persistir el cambio sin alterar fechas, alertas ni configuración base
 *
 * Reglas funcionales:
 * - el cliente NO crea mantenimientos
 * - el cliente NO edita la configuración del mantenimiento
 * - el cliente NO modifica fechas programadas
 * - el cliente NO modifica fechas de alerta
 * - el cliente NO fuerza estados derivados
 * - el cliente SOLO confirma realización sobre una fila existente
 *
 * Decisiones:
 * - schedule es la fuente de verdad del mantenimiento
 * - completed es el único campo editable por el cliente en este endpoint
 * - los estados visibles del portal deben derivarse desde normalizadores,
 *   consultas o procesos backend, no escribirse manualmente aquí
 * - no se escriben propiedades que no existan en MaintenanceScheduleEntry
 * - updatedAt se actualiza a nivel de documento Maintenance, no por fila
 *
 * Seguridad:
 * - requiere sesión válida
 * - requiere userType = "client"
 * - requiere organizationId en la sesión
 * - bloquea acceso cruzado entre organizaciones
 *
 * EN:
 * Protected client portal endpoint used to mark one maintenance schedule row
 * as completed.
 *
 * Purpose:
 * - allow a client user to confirm that a scheduled maintenance execution
 *   was completed
 * - update only the allowed field inside the schedule
 * - preserve the schedule as the operational source of truth
 * - keep the client flow separated from the admin maintenance flow
 *
 * Responsibilities:
 * - validate the active NextAuth session
 * - allow only client users
 * - validate the organization context from the session
 * - validate ownership between the maintenance and the client organization
 * - validate the received schedule index
 * - mark the selected schedule row as completed = true
 * - persist the change without altering dates, alerts or base configuration
 *
 * Functional rules:
 * - the client does NOT create maintenance records
 * - the client does NOT edit maintenance configuration
 * - the client does NOT modify scheduled dates
 * - the client does NOT modify alert dates
 * - the client does NOT force derived statuses
 * - the client ONLY confirms completion on an existing schedule row
 *
 * Decisions:
 * - schedule is the maintenance source of truth
 * - completed is the only client-editable field in this endpoint
 * - visible portal statuses must be derived by normalizers, queries or
 *   backend jobs, not manually written here
 * - this route does not write properties missing from MaintenanceScheduleEntry
 * - updatedAt is updated at Maintenance document level, not row level
 *
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import Maintenance from "@/models/Maintenance";

type CompleteMaintenanceBody = {
	scheduleIndex?: number;
};

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ maintenanceId: string }> }
) {
	try {
		const session = await getServerSession(authOptions);

		if (!session || session.user?.userType !== "client") {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const organizationId = session.user.organizationId;

		if (!organizationId) {
			return NextResponse.json(
				{ error: "No organization context" },
				{ status: 400 }
			);
		}

		const { maintenanceId } = await params;
		const body = (await req.json()) as CompleteMaintenanceBody;

		if (
			typeof body.scheduleIndex !== "number" ||
			Number.isNaN(body.scheduleIndex)
		) {
			return NextResponse.json(
				{ error: "Invalid scheduleIndex" },
				{ status: 400 }
			);
		}

		await connectToDB();

		const maintenance = await Maintenance.findById(maintenanceId);

		if (!maintenance) {
			return NextResponse.json(
				{ error: "Maintenance not found" },
				{ status: 404 }
			);
		}

		if (String(maintenance.organizationId) !== String(organizationId)) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		if (
			!Array.isArray(maintenance.schedule) ||
			body.scheduleIndex < 0 ||
			body.scheduleIndex >= maintenance.schedule.length
		) {
			return NextResponse.json(
				{ error: "Invalid schedule index" },
				{ status: 400 }
			);
		}

		maintenance.set(`schedule.${body.scheduleIndex}.completed`, true);
		maintenance.set("updatedAt", new Date());

		await maintenance.save();

		return NextResponse.json({
			success: true,
			data: {
				maintenanceId,
				scheduleIndex: body.scheduleIndex,
				completed: true,
			},
		});
	} catch (error) {
		console.error("Portal maintenance complete error:", error);

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}