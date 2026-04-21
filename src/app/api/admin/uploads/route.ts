/**
 * =============================================================================
 * 📡 API Route: Admin Uploads
 * Path: src/app/api/admin/uploads/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint unificado para subida de archivos administrativos.
 *
 * Responsabilidades:
 * - Recibir archivo vía multipart/form-data
 * - Validar tipo, tamaño y scope permitido
 * - Generar nombre seguro
 * - Subir archivo a Cloudflare R2
 * - Retornar metadata estable para guardar en DB
 *
 * Seguridad:
 * - No expone URLs públicas
 * - No permite rutas arbitrarias
 * - Solo acepta scopes administrativos aprobados
 *
 * Contrato:
 * - Los archivos administrativos se guardan bajo prefijo `admin/`
 * - El frontend persiste `fileKey`
 * - La vista previa se resuelve por `/api/admin/uploads/view?key=<fileKey>`
 *
 * Reglas del módulo Home:
 * - todos los assets del Home deben terminar persistidos como metadata estable
 * - partners, leadership y documentos usan el mismo patrón de asset en DB
 * - este endpoint solo recibe el binario y devuelve metadata persistible
 *
 * EN:
 * Unified admin upload endpoint with validation and secure storage in R2.
 * =============================================================================
 */

import { NextResponse } from "next/server";

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

const ALLOWED_SCOPES = [
	"site-settings/logos",
	"site-settings/favicons",
	"site-settings/seo",
	"home/hero",
	"home/sections",
	"home/partners/logos",
	"home/partners/documents",
	"home/leadership",
	"services/covers",
	"services/gallery",
	"services/seo",
	"services/attachments",
	"documents/files",
	"documents/thumbnails",
	"projects/covers",
	"projects/gallery",
	"projects/maintenance",
	"blog/covers",
	"blog/gallery",
	"blog/seo",
] as const;

const IMAGE_MIME_TYPES = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/svg+xml",
	"image/x-icon",
];

const DOCUMENT_MIME_TYPES = ["application/pdf"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;

const BUCKET_NAME = "sierratech-admin-assets";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isValidScope(scope: string): boolean {
	return (ALLOWED_SCOPES as readonly string[]).includes(scope);
}

function getExtension(fileName: string): string {
	const parts = fileName.split(".");
	return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function generateSafeFileName(originalName: string): string {
	const ext = getExtension(originalName);
	const base = originalName
		.replace(/\.[^/.]+$/, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

	const timestamp = new Date()
		.toISOString()
		.replace(/-|:|\.|T|Z/g, "")
		.slice(0, 14);

	return ext ? `${timestamp}-${base}.${ext}` : `${timestamp}-${base}`;
}

function getR2Credentials() {
	const endpoint = process.env.R2_ENDPOINT;
	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

	if (!endpoint || !accessKeyId || !secretAccessKey) {
		throw new Error("Missing R2 environment variables.");
	}

	return {
		endpoint,
		accessKeyId,
		secretAccessKey,
	};
}

/* -------------------------------------------------------------------------- */
/* Upload Handler                                                             */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
	try {
		const formData = await req.formData();

		const rawFile = formData.get("file");
		const rawScope = formData.get("scope");

		const file = rawFile instanceof File ? rawFile : null;
		const scope = typeof rawScope === "string" ? rawScope.trim() : "";

		/* ---------------------------------------------------------------------- */
		/* Basic validation                                                       */
		/* ---------------------------------------------------------------------- */

		if (!file) {
			return NextResponse.json(
				{ ok: false, message: "No file provided." },
				{ status: 400 },
			);
		}

		if (!scope || !isValidScope(scope)) {
			return NextResponse.json(
				{ ok: false, message: "Invalid upload scope." },
				{ status: 400 },
			);
		}

		const mimeType = file.type;
		const size = file.size;

		const isImage = IMAGE_MIME_TYPES.includes(mimeType);
		const isDocument = DOCUMENT_MIME_TYPES.includes(mimeType);

		if (!isImage && !isDocument) {
			return NextResponse.json(
				{ ok: false, message: "Invalid file type." },
				{ status: 400 },
			);
		}

		if (isImage && size > MAX_IMAGE_SIZE) {
			return NextResponse.json(
				{ ok: false, message: "Image exceeds max size (5MB)." },
				{ status: 400 },
			);
		}

		if (isDocument && size > MAX_DOCUMENT_SIZE) {
			return NextResponse.json(
				{ ok: false, message: "Document exceeds max size (15MB)." },
				{ status: 400 },
			);
		}

		/* ---------------------------------------------------------------------- */
		/* File processing                                                        */
		/* ---------------------------------------------------------------------- */

		const originalName = file.name;
		const extension = getExtension(originalName);
		const safeName = generateSafeFileName(originalName);
		const fileKey = `admin/${scope}/${safeName}`;

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		/* ---------------------------------------------------------------------- */
		/* Upload to R2                                                           */
		/* ---------------------------------------------------------------------- */

		const { endpoint, accessKeyId, secretAccessKey } = getR2Credentials();
		const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

		const client = new S3Client({
			region: "auto",
			endpoint,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});

		await client.send(
			new PutObjectCommand({
				Bucket: BUCKET_NAME,
				Key: fileKey,
				Body: buffer,
				ContentType: mimeType || "application/octet-stream",
			}),
		);

		/* ---------------------------------------------------------------------- */
		/* Response                                                               */
		/* ---------------------------------------------------------------------- */

		return NextResponse.json(
			{
				ok: true,
				file: {
					storageProvider: "r2",
					bucket: BUCKET_NAME,
					fileKey,
					fileName: safeName,
					originalName,
					mimeType,
					sizeBytes: size,
					extension,
					url: null,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[API /admin/uploads] POST error:", error);

		return NextResponse.json(
			{
				ok: false,
				message:
					error instanceof Error ? error.message : "Internal server error.",
			},
			{ status: 500 },
		);
	}
}