"use client";

/**
 * =============================================================================
 * 📄 Component: ProjectImageUploader
 * Path: src/components/ProjectImageUploader.tsx
 * =============================================================================
 *
 * ES:
 * Uploader de imagen única para Projects.
 *
 * Patrón visual y técnico:
 * - Igual al usado en Site Settings / Home
 * - El valor persistido prioriza `storageKey` como fuente de verdad
 * - `url` se conserva solo si realmente representa una URL navegable
 * - La vista previa se resuelve vía /api/admin/uploads/view?key=...
 *   cuando existe storageKey o una key legacy
 *
 * Decisión importante:
 * - en Sierra Tech, los archivos viven en R2
 * - por tanto, `storageKey` es la referencia real del archivo
 * - este componente no debe asumir que fileKey es una URL pública
 * =============================================================================
 */

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

import { useTranslation } from "@/hooks/useTranslation";

import type { ProjectImage } from "@/types/project";

type UploadResult = {
	url: string;
	alt?: {
		es: string;
		en: string;
	};
	storageKey?: string;
};

type ProjectImageUploaderProps = {
	label: string;
	value: ProjectImage | null;
	onChange: (nextValue: ProjectImage | null) => void;
	onUpload: (file: File) => Promise<UploadResult>;
	disabled?: boolean;
	accept?: string;
	maxSizeMb?: number;
};

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

/**
 * -----------------------------------------------------------------------------
 * Determina si un string ya es una URL navegable real.
 * -----------------------------------------------------------------------------
 */
function isDirectUrl(value: string): boolean {
	return (
		value.startsWith("http://") ||
		value.startsWith("https://") ||
		value.startsWith("/")
	);
}

/**
 * -----------------------------------------------------------------------------
 * Resuelve una URL de preview consumible para la UI.
 *
 * Regla:
 * - primero usa storageKey si existe
 * - si no existe storageKey, intenta url
 * - si url ya es una URL real, la usa
 * - si url no es una URL real, la trata como key legacy
 * -----------------------------------------------------------------------------
 */
function resolvePreviewSrc(value: ProjectImage | null): string {
	if (!value) return "";

	const storageKey = normalizeString(value.storageKey);
	const url = normalizeString(value.url);

	if (storageKey) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(storageKey)}`;
	}

	if (!url) return "";

	if (isDirectUrl(url)) {
		return url;
	}

	return `/api/admin/uploads/view?key=${encodeURIComponent(url)}`;
}

/**
 * -----------------------------------------------------------------------------
 * Resuelve la etiqueta visible del archivo actual.
 *
 * Prioridad:
 * - storageKey
 * - url
 * -----------------------------------------------------------------------------
 */
function resolveFileLabel(value: ProjectImage | null): string {
	if (!value) return "";

	const storageKey = normalizeString(value.storageKey);
	const url = normalizeString(value.url);

	return storageKey || url;
}

export default function ProjectImageUploader({
	label,
	value,
	onChange,
	onUpload,
	disabled = false,
	accept = "image/*",
	maxSizeMb = 10,
}: ProjectImageUploaderProps) {
	const { locale } = useTranslation();
	const safeLocale: "es" | "en" = locale === "en" ? "en" : "es";

	const t = useMemo(
		() => ({
			addImage: safeLocale === "es" ? "Subir imagen" : "Upload image",
			replaceImage:
				safeLocale === "es" ? "Reemplazar imagen" : "Replace image",
			uploading: safeLocale === "es" ? "Subiendo..." : "Uploading...",
			altLabel: safeLocale === "es" ? "Texto alternativo" : "Alt text",
			currentFile: safeLocale === "es" ? "Archivo actual" : "Current file",
			preview: safeLocale === "es" ? "Vista previa" : "Preview",
			remove: safeLocale === "es" ? "Quitar" : "Remove",
			empty:
				safeLocale === "es"
					? "No hay imagen cargada."
					: "No image uploaded yet.",
			invalidType:
				safeLocale === "es"
					? "Selecciona un archivo de imagen válido."
					: "Select a valid image file.",
			invalidSize:
				safeLocale === "es"
					? `La imagen supera el máximo de ${maxSizeMb} MB.`
					: `The image exceeds the ${maxSizeMb} MB limit.`,
		}),
		[maxSizeMb, safeLocale],
	);

	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploading, setUploading] = useState(false);

	const previewSrc = resolvePreviewSrc(value);
	const currentFileLabel = resolveFileLabel(value);

	function openPicker() {
		if (disabled || uploading) return;
		inputRef.current?.click();
	}

	async function handleFileSelected(file: File | null) {
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			throw new Error(t.invalidType);
		}

		const maxBytes = maxSizeMb * 1024 * 1024;
		if (file.size > maxBytes) {
			throw new Error(t.invalidSize);
		}

		setUploading(true);

		try {
			const uploaded = await onUpload(file);

			const storageKey = normalizeString(uploaded.storageKey);
			const normalizedUrl = normalizeString(uploaded.url);

			/**
			 * Regla Sierra Tech:
			 * - storageKey = referencia real del archivo en R2
			 * - url solo se persiste si es realmente una URL navegable
			 * - no duplicar fileKey dentro de url
			 */
			onChange({
				url: isDirectUrl(normalizedUrl) ? normalizedUrl : "",
				alt: {
					es: normalizeString(uploaded.alt?.es),
					en: normalizeString(uploaded.alt?.en),
				},
				storageKey,
			});
		} finally {
			setUploading(false);
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		}
	}

	function updateAlt(localeKey: "es" | "en", nextAlt: string) {
		if (!value) return;

		onChange({
			...value,
			alt: {
				es: localeKey === "es" ? nextAlt : value.alt?.es || "",
				en: localeKey === "en" ? nextAlt : value.alt?.en || "",
			},
		});
	}

	function removeImage() {
		onChange(null);
	}

	return (
		<div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
			<div className="mb-5 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-sm font-medium text-text-primary">
					<ImageIcon size={16} />
					{label}
				</div>

				<button
					type="button"
					onClick={openPicker}
					disabled={disabled || uploading}
					className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span className="mr-2 inline-flex">
						{uploading ? (
							<Loader2 size={14} className="animate-spin" />
						) : (
							<Upload size={14} />
						)}
					</span>
					{uploading ? t.uploading : value ? t.replaceImage : t.addImage}
				</button>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept={accept}
				className="hidden"
				disabled={disabled || uploading}
				onChange={async (e) => {
					await handleFileSelected(e.currentTarget.files?.[0] ?? null);
				}}
			/>

			{!value ? (
				<div className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-secondary">
					{t.empty}
				</div>
			) : (
				<div className="space-y-4">
					<div>
						<label className="mb-1.5 block text-sm font-medium text-text-primary">
							{t.currentFile}
						</label>
						<div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-secondary">
							{currentFileLabel}
						</div>
					</div>

					{previewSrc ? (
						<div className="rounded-xl border border-border bg-background p-4">
							<div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
								{t.preview}
							</div>

							<Image
								src={previewSrc}
								alt={
									value.alt?.[safeLocale] ||
									value.alt?.es ||
									value.alt?.en ||
									"Project cover preview"
								}
								width={640}
								height={360}
								unoptimized
								className="max-h-72 w-auto rounded-lg object-contain"
							/>
						</div>
					) : null}

					<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
						<div>
							<label className="mb-1.5 block text-sm font-medium text-text-primary">
								{safeLocale === "es"
									? "Texto alternativo (ES)"
									: "Alt text (ES)"}
							</label>
							<input
								value={value.alt?.es || ""}
								onChange={(e) => updateAlt("es", e.currentTarget.value)}
								disabled={disabled || uploading}
								className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
							/>
						</div>

						<div>
							<label className="mb-1.5 block text-sm font-medium text-text-primary">
								{safeLocale === "es"
									? "Texto alternativo (EN)"
									: "Alt text (EN)"}
							</label>
							<input
								value={value.alt?.en || ""}
								onChange={(e) => updateAlt("en", e.currentTarget.value)}
								disabled={disabled || uploading}
								className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
							/>
						</div>
					</div>

					<div className="flex justify-end">
						<button
							type="button"
							onClick={removeImage}
							disabled={disabled || uploading}
							className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
						>
							<span className="mr-2 inline-flex">
								<Trash2 size={14} />
							</span>
							{t.remove}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}