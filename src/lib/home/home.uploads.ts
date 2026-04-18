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

function resolveScope(kind: UploadKind): string {
	switch (kind) {
		case "partner-logo":
			return "home/sections";
		case "partner-document":
			return "home/sections";
		default:
			return "home/sections";
	}
}

function buildViewUrl(fileKey: string): string {
	return `/api/admin/uploads/view?key=${encodeURIComponent(fileKey)}`;
}

export async function uploadHomeAsset(params: {
	file: File;
	kind: UploadKind;
	partnerId: string;
}): Promise<UploadResponseItem> {
	const formData = new FormData();
	formData.append("file", params.file);
	formData.append("scope", resolveScope(params.kind));
	formData.append("partnerId", params.partnerId);

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
