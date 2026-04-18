/**
 * =============================================================================
 * 📡 API Route: Admin Home Upload
 * Path: src/app/api/admin/home/upload/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint oficial de subida de archivos para la configuración Home,
 * especialmente para la sección de Partners / Alianzas.
 *
 * Responsabilidades:
 * - Recibir archivos vía multipart/form-data
 * - Validar sesión y permisos administrativos
 * - Subir archivos a Cloudflare R2
 * - Devolver estructura estable esperada por Home Partners
 *
 * Casos de uso:
 * - Logo de partner
 * - Documentos de partner
 *
 * Contrato de salida:
 * {
 *   ok: true,
 *   item: {
 *     url: string;
 *     fileName: string;
 *     mimeType: string;
 *     sizeBytes: number;
 *     storageKey: string;
 *   }
 * }
 *
 * Requisitos:
 * - Variables de entorno válidas:
 *   - R2_ENDPOINT
 *   - R2_ACCESS_KEY_ID
 *   - R2_SECRET_ACCESS_KEY
 *   - R2_BUCKET_NAME
 *   - R2_PUBLIC_BASE_URL
 *
 * Notas:
 * - No se generan signed URLs
 * - Se utiliza URL pública directa para preview inmediato
 * - storageKey es la referencia persistente del archivo en R2
 * - Se organiza por carpetas internas según el tipo de asset
 *
 * EN:
 * Official upload endpoint for Home configuration using Cloudflare R2.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AllowedRole = "admin" | "superadmin";
type UploadKind = "partner-logo" | "partner-document";

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

function isAllowedRole(role: unknown): role is AllowedRole {
	return role === "admin" || role === "superadmin";
}

function sanitizeFileName(value: string): string {
	const trimmed = value.trim();

	if (!trimmed) return "file";

	return trimmed.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
}

function sanitizeSegment(value: string): string {
	const trimmed = value.trim();

	if (!trimmed) return "general";

	return trimmed
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9._-]/g, "");
}

function isValidUploadKind(value: unknown): value is UploadKind {
	return value === "partner-logo" || value === "partner-document";
}

function getFolderForKind(kind: UploadKind): string {
	return kind === "partner-logo"
		? "home/partners/logos"
		: "home/partners/documents";
}

function isAcceptedMimeType(kind: UploadKind, mimeType: string): boolean {
	if (kind === "partner-logo") {
		return (
			mimeType === "image/png" ||
			mimeType === "image/jpeg" ||
			mimeType === "image/jpg" ||
			mimeType === "image/webp" ||
			mimeType === "image/svg+xml"
		);
	}

	return (
		mimeType === "application/pdf" ||
		mimeType === "image/png" ||
		mimeType === "image/jpeg" ||
		mimeType === "image/jpg" ||
		mimeType === "image/webp"
	);
}

function getMaxBytesForKind(kind: UploadKind): number {
	return kind === "partner-logo" ? 5 * 1024 * 1024 : 15 * 1024 * 1024;
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);

		if (!session?.user) {
			return NextResponse.json(
				{
					ok: false,
					error: "Invalid or expired session.",
				},
				{ status: 401 },
			);
		}

		if (!isAllowedRole(session.user.role)) {
			return NextResponse.json(
				{
					ok: false,
					error: "You do not have permission to upload files.",
				},
				{ status: 403 },
			);
		}

		const formData = await request.formData();

		const rawFile = formData.get("file");
		const rawKind = formData.get("kind");
		const rawPartnerId = formData.get("partnerId");

		if (!(rawFile instanceof File)) {
			return NextResponse.json(
				{
					ok: false,
					error: "File is required.",
				},
				{ status: 400 },
			);
		}

		if (!isValidUploadKind(rawKind)) {
			return NextResponse.json(
				{
					ok: false,
					error: "Invalid upload kind.",
				},
				{ status: 400 },
			);
		}

		const partnerId =
			typeof rawPartnerId === "string" && rawPartnerId.trim().length > 0
				? sanitizeSegment(rawPartnerId)
				: "general";

		const mimeType = rawFile.type || "application/octet-stream";
		const sizeBytes = rawFile.size;

		if (!isAcceptedMimeType(rawKind, mimeType)) {
			return NextResponse.json(
				{
					ok: false,
					error:
						rawKind === "partner-logo"
							? "Invalid logo file type."
							: "Invalid document file type.",
				},
				{ status: 400 },
			);
		}

		const maxBytes = getMaxBytesForKind(rawKind);

		if (sizeBytes > maxBytes) {
			return NextResponse.json(
				{
					ok: false,
					error:
						rawKind === "partner-logo"
							? "Logo file exceeds maximum allowed size."
							: "Document file exceeds maximum allowed size.",
				},
				{ status: 400 },
			);
		}

		const safeName = sanitizeFileName(rawFile.name || "file");
		const timestamp = Date.now();
		const folder = getFolderForKind(rawKind);

		const storageKey = `${folder}/${partnerId}/${timestamp}-${safeName}`;

		const buffer = Buffer.from(await rawFile.arrayBuffer());

		await r2Client.send(
			new PutObjectCommand({
				Bucket: R2_BUCKET_NAME_SAFE,
				Key: storageKey,
				Body: buffer,
				ContentType: mimeType,
			}),
		);

		const publicBaseUrl = R2_PUBLIC_BASE_URL_SAFE.replace(/\/+$/, "");
		const url = `${publicBaseUrl}/${storageKey}`;

		return NextResponse.json({
			ok: true,
			item: {
				url,
				fileName: safeName,
				mimeType,
				sizeBytes,
				storageKey,
			},
		});
	} catch (error) {
		console.error("[admin/home/upload] Upload error:", error);

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
