/**
 * ✅ src/app/api/admin/privacy/history/route.ts
 * ---------------------------------------------------------------
 * 📜 API: Historial de auditoría (solo administradores)
 * ---------------------------------------------------------------
 * Devuelve todos los registros de PrivacyAuditLog ordenados
 * por fecha descendente.
 * ---------------------------------------------------------------
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import PrivacyAuditLog from "@/models/PrivacyAuditLog";

export async function GET() {
	try {
		const session = await getServerSession(authOptions);

		// 🔐 Validación segura sin errores de tipo
		if (!session || session.user?.role !== "admin") {
			return NextResponse.json(
				{ error: "Acceso denegado. Solo administradores." },
				{ status: 403 },
			);
		}

		await connectToDB();

		const logs = await PrivacyAuditLog.find()
			.sort({ modifiedAt: -1 })
			.limit(100)
			.lean();

		return NextResponse.json(logs, { status: 200 });
	} catch (err) {
		console.error("❌ Error al obtener el historial de auditoría:", err);
		return NextResponse.json(
			{ error: "Error interno al cargar el historial de auditoría." },
			{ status: 500 },
		);
	}
}
