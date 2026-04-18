"use client";

/**
 * =============================================================================
 * 📄 Component: ProjectGalleryUploader
 * Path: src/components/ProjectGalleryUploader.tsx
 * =============================================================================
 *
 * ES:
 * Uploader de galería para Projects.
 *
 * Patrón visual y técnico:
 * - Igual al usado en Site Settings / Home
 * - La vista previa usa /api/admin/uploads/view?key=...
 * - Cada imagen muestra:
 *   - preview
 *   - referencia técnica del archivo
 *   - texto alternativo
 *   - acción para quitar
 *
 * Decisión UX:
 * - La referencia técnica del archivo SÍ se mantiene visible para admin.
 * - En galería se presenta como metadata secundaria, pequeña y truncada.
 * - El path completo queda disponible en title para inspección visual rápida.
 * =============================================================================
 */

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Images, Loader2, Trash2, Upload } from "lucide-react";

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

type ProjectGalleryUploaderProps = {
	label: string;
	value: ProjectImage[];
	onChange: (nextValue: ProjectImage[]) => void;
	onUpload: (file: File) => Promise<UploadResult>;
	disabled?: boolean;
	accept?: string;
	maxSizeMb?: number;
};

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function isAdminFileKey(value: string): boolean {
	return value.startsWith("admin/");
}

function resolvePreviewSrc(value: ProjectImage): string {
	const storageKey = normalizeString(value.storageKey);
	const url = normalizeString(value.url);

	if (storageKey && isAdminFileKey(storageKey)) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(storageKey)}`;
	}

	if (url && isAdminFileKey(url)) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(url)}`;
	}

	return url;
}

function resolveFileLabel(value: ProjectImage): string {
	const storageKey = normalizeString(value.storageKey);
	const url = normalizeString(value.url);

	return storageKey || url;
}

export default function ProjectGalleryUploader({
	label,
	value,
	onChange,
	onUpload,
	disabled = false,
	accept = "image/*",
	maxSizeMb = 10,
}: ProjectGalleryUploaderProps) {
	const { locale } = useTranslation();
	const safeLocale: "es" | "en" = locale === "en" ? "en" : "es";

	const t = useMemo(
		() => ({
			addImages: safeLocale === "es" ? "Subir imágenes" : "Upload images",
			uploading: safeLocale === "es" ? "Subiendo..." : "Uploading...",
			altLabel: safeLocale === "es" ? "Texto alternativo" : "Alt text",
			preview: safeLocale === "es" ? "Vista previa" : "Preview",
			remove: safeLocale === "es" ? "Quitar" : "Remove",
			empty:
				safeLocale === "es"
					? "No hay imágenes en la galería."
					: "No gallery images yet.",
			invalidType:
				safeLocale === "es"
					? "Selecciona solo archivos de imagen válidos."
					: "Select valid image files only.",
			invalidSize:
				safeLocale === "es"
					? `Una o más imágenes superan el máximo de ${maxSizeMb} MB.`
					: `One or more images exceed the ${maxSizeMb} MB limit.`,
		}),
		[maxSizeMb, safeLocale],
	);

	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploading, setUploading] = useState(false);

	function openPicker() {
		if (disabled || uploading) return;
		inputRef.current?.click();
	}

	async function handleFilesSelected(files: FileList | null) {
		if (!files || files.length === 0) return;

		const picked = Array.from(files);

		const invalidType = picked.some((file) => !file.type.startsWith("image/"));
		if (invalidType) {
			throw new Error(t.invalidType);
		}

		const maxBytes = maxSizeMb * 1024 * 1024;
		const invalidSize = picked.some((file) => file.size > maxBytes);
		if (invalidSize) {
			throw new Error(t.invalidSize);
		}

		setUploading(true);

		try {
			const uploadedItems: ProjectImage[] = [];

			for (const file of picked) {
				const uploaded = await onUpload(file);

				const storageKey = normalizeString(uploaded.storageKey);
				const normalizedUrl = normalizeString(uploaded.url);

				uploadedItems.push({
					url: normalizedUrl || storageKey,
					alt: {
						es: normalizeString(uploaded.alt?.es),
						en: normalizeString(uploaded.alt?.en),
					},
					storageKey,
				});
			}

			onChange([...value, ...uploadedItems]);
		} finally {
			setUploading(false);
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		}
	}

	function removeAt(index: number) {
		onChange(value.filter((_, itemIndex) => itemIndex !== index));
	}

	function updateAlt(index: number, localeKey: "es" | "en", alt: string) {
		onChange(
			value.map((item, itemIndex) =>
				itemIndex === index
					? {
							...item,
							alt: {
								es: localeKey === "es" ? alt : item.alt?.es || "",
								en: localeKey === "en" ? alt : item.alt?.en || "",
							},
						}
					: item,
			),
		);
	}

	return (
		<div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
			<div className="mb-5 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-sm font-medium text-text-primary">
					<Images size={16} />
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
					{uploading ? t.uploading : t.addImages}
				</button>
			</div>

			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple
				className="hidden"
				disabled={disabled || uploading}
				onChange={async (e) => {
					await handleFilesSelected(e.currentTarget.files);
				}}
			/>

			{value.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-secondary">
					{t.empty}
				</div>
			) : (
				<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{value.map((item, index) => {
						const previewSrc = resolvePreviewSrc(item);
						const currentFileLabel = resolveFileLabel(item);

						return (
							<div
								key={`${item.storageKey}-${index}`}
								className="rounded-xl border border-border bg-background p-4"
							>
								{previewSrc ? (
									<div className="rounded-xl border border-border bg-surface p-4">
										<div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
											{t.preview}
										</div>

										<Image
											src={previewSrc}
											alt={
												item.alt?.[safeLocale] ||
												item.alt?.es ||
												item.alt?.en ||
												`Gallery image ${index + 1}`
											}
											width={480}
											height={320}
											unoptimized
											className="h-44 w-full rounded-lg object-contain"
										/>
									</div>
								) : null}

								<p
									className="mt-3 truncate text-[11px] text-text-muted"
									title={currentFileLabel}
								>
									{currentFileLabel}
								</p>

								<div className="mt-3 grid grid-cols-1 gap-3">
									<div>
										<label className="mb-1.5 block text-sm font-medium text-text-primary">
											{safeLocale === "es"
												? "Texto alternativo (ES)"
												: "Alt text (ES)"}
										</label>
										<input
											value={item.alt?.es || ""}
											onChange={(e) =>
												updateAlt(index, "es", e.currentTarget.value)
											}
											disabled={disabled || uploading}
											className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
										/>
									</div>

									<div>
										<label className="mb-1.5 block text-sm font-medium text-text-primary">
											{safeLocale === "es"
												? "Texto alternativo (EN)"
												: "Alt text (EN)"}
										</label>
										<input
											value={item.alt?.en || ""}
											onChange={(e) =>
												updateAlt(index, "en", e.currentTarget.value)
											}
											disabled={disabled || uploading}
											className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong"
										/>
									</div>
								</div>

								<div className="mt-4 flex justify-end">
									<button
										type="button"
										onClick={() => removeAt(index)}
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
						);
					})}
				</div>
			)}
		</div>
	);
}
