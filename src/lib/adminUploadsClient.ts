/**
 * =============================================================================
 * 📄 Helper: Admin Uploads Client
 * Path: src/lib/adminUploadsClient.ts
 * =============================================================================
 *
 * ES:
 *   Cliente reutilizable para consumir el endpoint administrativo de uploads.
 *
 *   Responsabilidades:
 *   - Enviar archivo + scope al endpoint /api/admin/uploads
 *   - Normalizar respuesta
 *   - Entregar un contrato simple para consumo de formularios y modales admin
 *
 * EN:
 *   Reusable client helper for the admin uploads endpoint.
 * =============================================================================
 */

export type AdminUploadScope =
  | "site-settings/logos"
  | "site-settings/favicons"
  | "home/hero"
  | "home/sections"
  | "services/covers"
  | "services/gallery"
  | "services/seo"
  | "services/attachments"
  | "documents/files"
  | "documents/thumbnails";

export interface UploadedAdminFile {
  storageProvider: "r2";
  bucket: string;
  fileKey: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
  url: string | null;
}

export interface AdminUploadResult {
  ok: boolean;
  file?: UploadedAdminFile;
  message?: string;
}

export async function uploadAdminFile(
  file: File,
  scope: AdminUploadScope
): Promise<AdminUploadResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("scope", scope);

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formData,
    });

    const json = (await response.json().catch(() => null)) as
      | {
          ok?: boolean;
          file?: UploadedAdminFile;
          message?: string;
        }
      | null;

    if (!response.ok || !json?.ok) {
      return {
        ok: false,
        message: json?.message || "Upload failed.",
      };
    }

    return {
      ok: true,
      file: json.file,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Upload failed.",
    };
  }
}