/**
 * =============================================================================
 * 📄 Helper: Admin Uploads Client
 * Path: src/lib/adminUploadsClient.ts
 * =============================================================================
 *
 * ES:
 * Cliente reutilizable para consumir el endpoint administrativo de uploads.
 *
 * Responsabilidades:
 * - Enviar archivo + scope al endpoint /api/admin/uploads
 * - Normalizar respuesta
 * - Entregar un contrato simple para consumo de formularios y modales admin
 *
 * Criterios:
 * - no asumir que la respuesta del backend siempre viene completa
 * - no marcar una subida como exitosa si falta `file`
 * - mantener contrato estable para formularios administrativos
 *
 * Notas:
 * - `AdminUploadScope` debe reflejar todos los scopes válidos aceptados por
 *   el backend administrativo de uploads.
 * - Cuando se agregue un nuevo destino de archivos en admin, este contrato
 *   debe actualizarse para mantener tipado fuerte en frontend.
 * =============================================================================
 */

export type AdminUploadScope =
  | "site-settings/logos"
  | "site-settings/favicons"
  | "site-settings/seo"
  | "home/hero"
  | "home/sections"
  | "home/leadership"
  | "services/covers"
  | "services/gallery"
  | "services/seo"
  | "services/attachments"
  | "documents/files"
  | "documents/thumbnails"
  | "projects/covers"
  | "projects/gallery"
  | "projects/maintenance";

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

type UploadApiResponse = {
  ok?: boolean;
  file?: UploadedAdminFile;
  message?: string;
} | null;

function isValidUploadedAdminFile(value: unknown): value is UploadedAdminFile {
  if (!value || typeof value !== "object") return false;

  const file = value as Record<string, unknown>;

  return (
    file.storageProvider === "r2" &&
    typeof file.bucket === "string" &&
    typeof file.fileKey === "string" &&
    file.fileKey.trim().length > 0 &&
    typeof file.fileName === "string" &&
    typeof file.originalName === "string" &&
    typeof file.mimeType === "string" &&
    typeof file.sizeBytes === "number" &&
    Number.isFinite(file.sizeBytes) &&
    typeof file.extension === "string" &&
    (typeof file.url === "string" || file.url === null)
  );
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

    const json = (await response.json().catch(() => null)) as UploadApiResponse;

    if (!response.ok || !json?.ok) {
      return {
        ok: false,
        message: json?.message || "Upload failed.",
      };
    }

    if (!isValidUploadedAdminFile(json.file)) {
      return {
        ok: false,
        message: "Upload response is incomplete.",
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