import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/connectToDB";
import ServiceClass from "@/models/ServiceClass";

/**
 * =============================================================================
 * 📡 API: Public Service Classes
 * =============================================================================
 * Devuelve catálogo activo ordenado.
 * =============================================================================
 */

export async function GET() {
	try {
		await connectToDB();

		const items = await ServiceClass.find({ enabled: true })
			.sort({ order: 1 })
			.lean();

		return NextResponse.json({
			ok: true,
			items: items.map((item) => ({
				key: item.key,
				label: item.label,
			})),
		});
	} catch (error) {
		console.error("[API service-classes public]", error);

		return NextResponse.json({
			ok: false,
			items: [],
		});
	}
}
