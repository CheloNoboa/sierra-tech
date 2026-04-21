/**
 * =============================================================================
 * 📄 Home Upload Helpers
 * Path: src/lib/home/home.uploads.ts
 * =============================================================================
 *
 * ES:
 *   Cliente de uploads específicos del módulo Home.
 *   Reutiliza el endpoint administrativo global de uploads.
 *
 *   Reglas:
 *   - todos los uploads del módulo Home terminan resolviéndose como metadata
 *     estructurada de assets servidos desde R2
 *   - el helper soporta los tres flujos oficiales del Home:
 *       - partner-logo
 *       - partner-document
 *       - leadership-image
 *   - partnerId solo se envía cuando aplica a un flujo de partner
 *
 * EN:
 *   Upload client helpers specific to the Home module.
 *   Reuses the global admin uploads endpoint.
 * =============================================================================
 */

import type { UploadKind, UploadResponseItem } from "@/types/home";

interface AdminUploadsResponse {
	ok: boolean;
	message?: string;
	file?: {
		fileKey: string;
		fileName: string;
		mimeType: string;
		sizeBytes: number;
	};
}

type UploadHomeAssetParams =
	| {
		file: File;
		kind: "partner-logo" | "partner-document";
		partnerId: string;
	}
	| {
		file: File;
		kind: "leadership-image";
	};

function resolveScope(kind: UploadKind): string {
	switch (kind) {
		case "partner-logo":
			return "home/partners/logos";
		case "partner-document":
			return "home/partners/documents";
		case "leadership-image":
			return "home/leadership";
		default:
			return "home/misc";
	}
}

function buildViewUrl(fileKey: string): string {
	return `/api/admin/uploads/view?key=${encodeURIComponent(fileKey)}`;
}

export async function uploadHomeAsset(
	params: UploadHomeAssetParams,
): Promise<UploadResponseItem> {
	const formData = new FormData();
	formData.append("file", params.file);
	formData.append("scope", resolveScope(params.kind));
	formData.append("kind", params.kind);

	if ("partnerId" in params) {
		formData.append("partnerId", params.partnerId);
	}

	const response = await fetch("/api/admin/uploads", {
		method: "POST",
		body: formData,
	});

	const payload = (await response
		.json()
		.catch(() => null)) as AdminUploadsResponse | null;

	if (!response.ok || !payload?.ok || !payload.file) {
		throw new Error(payload?.message || "Upload failed.");
	}

	return {
		url: buildViewUrl(payload.file.fileKey),
		fileName: payload.file.fileName,
		mimeType: payload.file.mimeType,
		sizeBytes: payload.file.sizeBytes,
		storageKey: payload.file.fileKey,
	};
}