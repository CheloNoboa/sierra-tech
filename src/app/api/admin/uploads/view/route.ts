/**
 * =============================================================================
 * 📡 API Route: Admin Upload View
 * Path: src/app/api/admin/uploads/view/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint privado para leer assets administrativos almacenados en R2.
 *
 *   Propósito:
 *   - Permitir preview controlado desde pantallas admin.
 *   - Evitar exponer URLs públicas directas del bucket.
 *   - Servir imágenes u otros archivos administrativos desde backend.
 *
 *   Contrato:
 *   - GET /api/admin/uploads/view?key=<fileKey>
 *
 *   Respuesta:
 *   - Devuelve el archivo si existe y el request es válido.
 *   - Devuelve error JSON si falta key o si ocurre un error.
 *
 * EN:
 *   Private endpoint for reading admin assets stored in R2.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

const BUCKET_NAME = "sierratech-admin-assets";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isValidAdminFileKey(value: string): boolean {
	return value.startsWith("admin/");
}

function getR2Client(): S3Client {
	const endpoint = process.env.R2_ENDPOINT;
	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

	if (!endpoint || !accessKeyId || !secretAccessKey) {
		throw new Error("Missing R2 environment variables.");
	}

	return new S3Client({
		region: "auto",
		endpoint,
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
	});
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET(req: NextRequest) {
	try {
		const key = req.nextUrl.searchParams.get("key")?.trim() ?? "";

		if (!key) {
			return NextResponse.json(
				{
					ok: false,
					message: "Missing file key.",
				},
				{ status: 400 },
			);
		}

		if (!isValidAdminFileKey(key)) {
			return NextResponse.json(
				{
					ok: false,
					message: "Invalid file key.",
				},
				{ status: 400 },
			);
		}

		const client = getR2Client();

		const result = await client.send(
			new GetObjectCommand({
				Bucket: BUCKET_NAME,
				Key: key,
			}),
		);

		if (!result.Body) {
			return NextResponse.json(
				{
					ok: false,
					message: "File not found.",
				},
				{ status: 404 },
			);
		}

		const contentType =
			typeof result.ContentType === "string" && result.ContentType.trim()
				? result.ContentType
				: "application/octet-stream";

		return new NextResponse(result.Body as ReadableStream, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "private, no-store, max-age=0",
			},
		});
	} catch (error) {
		console.error("[API /admin/uploads/view] GET error:", error);

		return NextResponse.json(
			{
				ok: false,
				message: "Internal server error.",
			},
			{ status: 500 },
		);
	}
}
