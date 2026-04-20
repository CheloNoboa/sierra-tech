/**
 * =============================================================================
 * 📡 API Route: Admin Blog Generate OG
 * Path: src/app/api/admin/blog/generate-og/route.ts
 * =============================================================================
 *
 * ES:
 *   Genera una imagen Open Graph para artículos del blog a partir de la portada,
 *   la sube a R2 y devuelve una URL de vista previa segura basada en fileKey.
 *
 *   Flujo:
 *   - recibe título, categoría y coverImage
 *   - resuelve URL absoluta de la portada
 *   - genera una imagen OG en formato PNG
 *   - guarda el resultado en R2 bajo admin/blog/seo/
 *   - retorna fileKey + previewUrl
 *
 *   Decisiones:
 *   - la vista previa se resuelve por /api/admin/uploads/view?key=...
 *   - no expone una URL pública directa
 *   - si no hay coverImage, se usa fondo degradado corporativo
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createElement } from "react";
import { connectToDB } from "@/lib/connectToDB";
import SiteSettings from "@/models/SiteSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/* Config                                                                     */
/* -------------------------------------------------------------------------- */

const BUCKET_NAME = "sierratech-admin-assets";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

interface GenerateOgPayload {
	title?: string;
	category?: string;
	coverImage?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getExtension(fileName: string): string {
	const parts = fileName.split(".");
	return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function generateSafeBaseName(value: string): string {
	const base = value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

	return base || "blog-og";
}

function getTimestamp(): string {
	return new Date()
		.toISOString()
		.replace(/-|:|\.|T|Z/g, "")
		.slice(0, 14);
}

function buildPreviewUrl(fileKey: string): string {
	return `/api/admin/uploads/view?key=${encodeURIComponent(fileKey)}`;
}

function resolveAbsoluteAssetUrl(value: string, requestUrl: string): string {
	if (!value.trim()) {
		return "";
	}

	if (value.startsWith("http://") || value.startsWith("https://")) {
		return value;
	}

	return new URL(value, requestUrl).toString();
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
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
	try {
		const body = (await request.json()) as GenerateOgPayload;

		await connectToDB();

		const settingsDoc = await SiteSettings.findOne({})
			.select("identity.siteName")
			.lean();

		const siteName =
			typeof settingsDoc?.identity?.siteName === "string" &&
				settingsDoc.identity.siteName.trim()
				? settingsDoc.identity.siteName.trim()
				: "Sierra Tech";

		const safeTitle =
			typeof body.title === "string" ? body.title.trim() : "";

		if (!safeTitle) {
			return NextResponse.json(
				{ ok: false, message: "Title is required." },
				{ status: 400 },
			);
		}

		const safeCategory =
			typeof body.category === "string" ? body.category.trim() : "";

		const safeCoverImage =
			typeof body.coverImage === "string" ? body.coverImage.trim() : "";

		const absoluteCoverImage = safeCoverImage
			? resolveAbsoluteAssetUrl(safeCoverImage, request.url)
			: "";

		const ogElement = createElement(
			"div",
			{
				style: {
					width: "1200px",
					height: "630px",
					display: "flex",
					position: "relative",
					overflow: "hidden",
					background:
						"linear-gradient(135deg, #f8fafc 0%, #dbeafe 45%, #e0f2fe 100%)",
					fontFamily:
						"Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
				},
			},
			absoluteCoverImage
				? createElement("img", {
					src: absoluteCoverImage,
					alt: safeTitle,
					width: 1200,
					height: 630,
					style: {
						position: "absolute",
						inset: 0,
						width: "100%",
						height: "100%",
						objectFit: "cover",
					},
				})
				: null,
			createElement("div", {
				style: {
					position: "absolute",
					inset: 0,
					background:
						"linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.78) 72%, rgba(15,23,42,0.92) 100%)",
				},
			}),
			createElement(
				"div",
				{
					style: {
						position: "relative",
						zIndex: "2",
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
						width: "100%",
						height: "100%",
						padding: "48px 56px",
						color: "#ffffff",
					},
				},
				createElement(
					"div",
					{
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "flex-start",
						},
					},
					createElement(
						"div",
						{
							style: {
								display: "flex",
								alignItems: "center",
								gap: "10px",
								padding: "10px 16px",
								borderRadius: "999px",
								background: "rgba(255,255,255,0.14)",
								border: "1px solid rgba(255,255,255,0.18)",
								fontSize: "20px",
								fontWeight: 600,
							},
						},
						safeCategory || "",
					),
					createElement(
						"div",
						{
							style: {
								fontSize: "26px",
								fontWeight: 700,
								letterSpacing: "-0.03em",
							},
						},
						siteName,
					),
				),
				createElement(
					"div",
					{
						style: {
							display: "flex",
							flexDirection: "column",
							gap: "18px",
							maxWidth: "880px",
						},
					},
					createElement(
						"div",
						{
							style: {
								fontSize: "60px",
								lineHeight: 1.05,
								fontWeight: 800,
								letterSpacing: "-0.04em",
								wordBreak: "break-word",
							},
						},
						safeTitle,
					),
					createElement("div", {
						style: {
							width: "180px",
							height: "6px",
							borderRadius: "999px",
							background:
								"linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.35) 100%)",
						},
					}),
				),
			),
		);

		const imageResponse = new ImageResponse(ogElement, {
			width: 1200,
			height: 630,
		});

		const pngBuffer = Buffer.from(await imageResponse.arrayBuffer());

		const baseName = generateSafeBaseName(safeTitle);
		const timestamp = getTimestamp();
		const fileName = `${timestamp}-${baseName}.png`;
		const fileKey = `admin/blog/seo/${fileName}`;

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
				Body: pngBuffer,
				ContentType: "image/png",
			}),
		);

		return NextResponse.json(
			{
				ok: true,
				data: {
					fileKey,
					fileName,
					extension: getExtension(fileName),
					previewUrl: buildPreviewUrl(fileKey),
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[API /admin/blog/generate-og] POST error:", error);

		return NextResponse.json(
			{
				ok: false,
				message:
					error instanceof Error ? error.message : "Failed to generate OG image.",
			},
			{ status: 500 },
		);
	}
}