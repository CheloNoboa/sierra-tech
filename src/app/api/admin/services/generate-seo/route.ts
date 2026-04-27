/**
 * =============================================================================
 * 📡 API Route: Admin Services Generate SEO Image
 * Path: src/app/api/admin/services/generate-seo/route.ts
 * =============================================================================
 *
 * ES:
 * Genera una imagen SEO / Open Graph para servicios a partir de la portada,
 * la sube a R2 y devuelve una URL de vista previa segura basada en fileKey.
 *
 * Flujo:
 * - recibe title, subtitle, category y coverImage
 * - resuelve URL absoluta de la portada
 * - genera imagen PNG 1200x630
 * - guarda en R2 bajo admin/services/seo/
 * - retorna fileKey + previewUrl
 *
 * Reglas:
 * - NO se genera automáticamente
 * - solo se genera cuando el admin presiona "Generar SEO"
 * - si no hay coverImage, usa fondo degradado corporativo
 * - no expone URL pública directa
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
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface GenerateServiceSeoPayload {
	title?: string;
	subtitle?: string;
	category?: string;
	coverImage?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getExtension(fileName: string): string {
	const parts = fileName.split(".");
	return parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
}

function generateSafeBaseName(value: string): string {
	const base = value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

	return base || "service-seo";
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
	if (!value.trim()) return "";

	if (value.startsWith("http://") || value.startsWith("https://")) {
		return value;
	}

	if (value.startsWith("admin/")) {
		return new URL(
			`/api/admin/uploads/view?key=${encodeURIComponent(value)}`,
			requestUrl,
		).toString();
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
		const body = (await request.json()) as GenerateServiceSeoPayload;

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

		const safeSubtitle =
			typeof body.subtitle === "string" ? body.subtitle.trim() : "";

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
						"linear-gradient(135deg, #f8fafc 0%, #e0f2fe 45%, #ecfccb 100%)",
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
						"linear-gradient(90deg, rgba(15,23,42,0.86) 0%, rgba(15,23,42,0.55) 48%, rgba(15,23,42,0.16) 100%)",
				},
			}),
			createElement("div", {
				style: {
					position: "absolute",
					inset: 0,
					background:
						"linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(15,23,42,0.18) 100%)",
				},
			}),
			createElement(
				"div",
				{
					style: {
						position: "relative",
						zIndex: 2,
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
							width: "100%",
						},
					},
					createElement(
						"div",
						{
							style: {
								display: "flex",
								alignItems: "center",
								padding: "10px 16px",
								borderRadius: "999px",
								background: "rgba(255,255,255,0.14)",
								border: "1px solid rgba(255,255,255,0.22)",
								fontSize: "19px",
								fontWeight: 700,
								letterSpacing: "0.01em",
								maxWidth: "520px",
							},
						},
						safeCategory || "Servicio técnico",
					),
					createElement(
						"div",
						{
							style: {
								fontSize: "26px",
								fontWeight: 800,
								letterSpacing: "-0.03em",
								textShadow: "0 2px 14px rgba(15,23,42,0.30)",
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
							gap: "20px",
							maxWidth: "760px",
						},
					},
					createElement(
						"div",
						{
							style: {
								fontSize: "58px",
								lineHeight: 1.02,
								fontWeight: 850,
								letterSpacing: "-0.045em",
								wordBreak: "break-word",
								textShadow: "0 3px 18px rgba(15,23,42,0.35)",
							},
						},
						safeTitle,
					),
					safeSubtitle
						? createElement(
							"div",
							{
								style: {
									fontSize: "25px",
									lineHeight: 1.35,
									fontWeight: 500,
									color: "rgba(255,255,255,0.88)",
									maxWidth: "700px",
									textShadow: "0 2px 14px rgba(15,23,42,0.35)",
								},
							},
							safeSubtitle,
						)
						: null,
					createElement("div", {
						style: {
							width: "180px",
							height: "6px",
							borderRadius: "999px",
							background:
								"linear-gradient(90deg, rgba(190,242,100,0.95) 0%, rgba(255,255,255,0.55) 100%)",
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
		const fileKey = `admin/services/seo/${fileName}`;

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
		console.error("[API /admin/services/generate-seo] POST error:", error);

		return NextResponse.json(
			{
				ok: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to generate SEO image.",
			},
			{ status: 500 },
		);
	}
}