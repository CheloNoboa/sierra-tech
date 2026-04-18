/**
 * =============================================================================
 * 📡 API Route: Admin Project Upload
 * Path: src/app/api/admin/projects/upload/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint oficial de subida de archivos para el módulo Projects.
 *
 * Responsabilidades:
 * - Recibir archivos vía multipart/form-data
 * - Subir archivos a Cloudflare R2
 * - Devolver estructura estable esperada por el frontend
 *
 * Contrato de salida:
 * {
 *   ok: true,
 *   item: {
 *     url: string;
 *     storageKey: string;
 *   }
 * }
 *
 * Requisitos:
 * - Variables de entorno válidas:
 *   - R2_ENDPOINT
 *   - R2_ACCESS_KEY_ID
 *   - R2_SECRET_ACCESS_KEY
 *   - R2_BUCKET
 *   - R2_PUBLIC_BASE_URL
 *
 * Notas:
 * - No se generan URLs temporales (signed URLs)
 * - Se utiliza URL pública directa para preview inmediato
 * - storageKey es la referencia persistente del archivo en R2
 *
 * EN:
 * Official upload endpoint for Projects module using Cloudflare R2.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

const {
	R2_ENDPOINT,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET_NAME,
	R2_PUBLIC_BASE_URL,
} = process.env;

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function requireEnv(value: string | undefined, name: string): string {
	if (!value) {
		throw new Error(`Missing env variable: ${name}`);
	}
	return value;
}

const R2_ENDPOINT_SAFE = requireEnv(R2_ENDPOINT, "R2_ENDPOINT");
const R2_ACCESS_KEY_ID_SAFE = requireEnv(R2_ACCESS_KEY_ID, "R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY_SAFE = requireEnv(
	R2_SECRET_ACCESS_KEY,
	"R2_SECRET_ACCESS_KEY",
);
const R2_BUCKET_NAME_SAFE = requireEnv(R2_BUCKET_NAME, "R2_BUCKET_NAME");
const R2_PUBLIC_BASE_URL_SAFE = requireEnv(
	R2_PUBLIC_BASE_URL,
	"R2_PUBLIC_BASE_URL",
);

/* -------------------------------------------------------------------------- */
/* R2 Client                                                                  */
/* -------------------------------------------------------------------------- */

const r2Client = new S3Client({
	region: "auto",
	endpoint: R2_ENDPOINT_SAFE,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID_SAFE,
		secretAccessKey: R2_SECRET_ACCESS_KEY_SAFE,
	},
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function sanitizeFileName(value: string): string {
	return value
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9._-]/g, "");
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
	try {
		const formData = await req.formData();
		const rawFile = formData.get("file");

		if (!(rawFile instanceof File)) {
			return NextResponse.json(
				{
					ok: false,
					error: "File is required.",
				},
				{ status: 400 },
			);
		}

		/* ---------------------------------------------------------------------- */
		/* Prepare file                                                           */
		/* ---------------------------------------------------------------------- */

		const buffer = Buffer.from(await rawFile.arrayBuffer());

		const safeName = sanitizeFileName(rawFile.name || "file");
		const timestamp = Date.now();

		const storageKey = `projects/${timestamp}-${safeName}`;

		/* ---------------------------------------------------------------------- */
		/* Upload to R2                                                           */
		/* ---------------------------------------------------------------------- */

		await r2Client.send(
			new PutObjectCommand({
				Bucket: R2_BUCKET_NAME_SAFE,
				Key: storageKey,
				Body: buffer,
				ContentType: rawFile.type || "application/octet-stream",
			}),
		);

		/* ---------------------------------------------------------------------- */
		/* Public URL                                                             */
		/* ---------------------------------------------------------------------- */

		const baseUrl = R2_PUBLIC_BASE_URL_SAFE.replace(/\/+$/, "");
		const url = `${baseUrl}/${storageKey}`;

		/* ---------------------------------------------------------------------- */
		/* Response                                                               */
		/* ---------------------------------------------------------------------- */

		return NextResponse.json({
			ok: true,
			item: {
				url,
				storageKey,
			},
		});
	} catch (error) {
		console.error("[admin/projects/upload] Upload error:", error);

		return NextResponse.json(
			{
				ok: false,
				error:
					error instanceof Error ? error.message : "Unexpected upload error.",
			},
			{ status: 500 },
		);
	}
}
