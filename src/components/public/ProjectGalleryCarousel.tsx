"use client";

/**
 * =============================================================================
 * 📄 Component: Public Project Gallery Carousel
 * Path: src/components/public/ProjectGalleryCarousel.tsx
 * =============================================================================
 *
 * ES:
 * Carrusel público visual para la galería de proyectos.
 *
 * Objetivo:
 * - mostrar una imagen principal activa
 * - mostrar texto alternativo visible como caption
 * - permitir navegación manual anterior / siguiente
 * - autoplay con pausa al hover
 * - mostrar miniaturas seleccionables
 * - mantener una UI pública limpia, moderna y coherente con Sierra Tech
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";

type LocalizedText = {
	es: string;
	en: string;
};

type ProjectImage = {
	url: string;
	alt: LocalizedText;
	storageKey: string;
};

type Props = {
	items: ProjectImage[];
	projectTitle: string;
	baseUrl: string;
	locale: "es" | "en";
};

function normalizeString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function resolveLocalizedText(
	value: LocalizedText | null | undefined,
	locale: "es" | "en",
): string {
	if (!value) return "";

	return locale === "en"
		? normalizeString(value.en) || normalizeString(value.es)
		: normalizeString(value.es) || normalizeString(value.en);
}

function resolveImageUrl(image: ProjectImage | null, baseUrl: string): string {
	if (!image) return "";

	const directUrl = normalizeString(image.url);
	const storageKey = normalizeString(image.storageKey);
	const raw = directUrl || storageKey;

	if (!raw) return "";

	if (raw.startsWith("http://") || raw.startsWith("https://")) {
		return raw;
	}

	if (raw.startsWith("/")) {
		return `${baseUrl}${raw}`;
	}

	if (raw.startsWith("admin/")) {
		return `${baseUrl}/api/admin/uploads/view?key=${encodeURIComponent(raw)}`;
	}

	return `${baseUrl}/${raw}`;
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="h-5 w-5"
			aria-hidden="true"
		>
			{direction === "left" ? (
				<path d="M15 18l-6-6 6-6" />
			) : (
				<path d="M9 18l6-6-6-6" />
			)}
		</svg>
	);
}

export default function ProjectGalleryCarousel({
	items,
	projectTitle,
	baseUrl,
	locale,
}: Props) {
	const validItems = useMemo(() => items.filter(Boolean), [items]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isPaused, setIsPaused] = useState(false);

	const ui = {
		gallery: locale === "en" ? "Gallery" : "Galería",
		galleryDescription:
			locale === "en"
				? "Visual view of the project authorized for publication."
				: "Vista visual del proyecto autorizado para publicación.",
		previousImage: locale === "en" ? "Previous image" : "Imagen anterior",
		nextImage: locale === "en" ? "Next image" : "Imagen siguiente",
		noImage: locale === "en" ? "No image" : "Sin imagen",
		imageCounter:
			locale === "en"
				? `Image ${currentIndex + 1} of ${validItems.length}`
				: `Imagen ${currentIndex + 1} de ${validItems.length}`,
		goToImage: (index: number) =>
			locale === "en" ? `Go to image ${index + 1}` : `Ir a imagen ${index + 1}`,
		viewImage: (index: number) =>
			locale === "en" ? `View image ${index + 1}` : `Ver imagen ${index + 1}`,
		imageAltFallback: (index: number) =>
			locale === "en"
				? `${projectTitle} - image ${index + 1}`
				: `${projectTitle} - imagen ${index + 1}`,
		thumbnailAltFallback: (index: number) =>
			locale === "en"
				? `${projectTitle} - thumbnail ${index + 1}`
				: `${projectTitle} - miniatura ${index + 1}`,
	};

	useEffect(() => {
		if (validItems.length <= 1) return;
		if (isPaused) return;

		const interval = window.setInterval(() => {
			setCurrentIndex((prev) =>
				prev === validItems.length - 1 ? 0 : prev + 1,
			);
		}, 4500);

		return () => {
			window.clearInterval(interval);
		};
	}, [validItems.length, isPaused]);

	useEffect(() => {
		if (currentIndex > validItems.length - 1) {
			setCurrentIndex(0);
		}
	}, [currentIndex, validItems.length]);

	if (validItems.length === 0) return null;

	const currentItem = validItems[currentIndex];
	const currentImageUrl = resolveImageUrl(currentItem, baseUrl);

	const currentAlt =
		resolveLocalizedText(currentItem.alt, locale) ||
		ui.imageAltFallback(currentIndex);

	function goPrev() {
		setCurrentIndex((prev) => (prev === 0 ? validItems.length - 1 : prev - 1));
	}

	function goNext() {
		setCurrentIndex((prev) => (prev === validItems.length - 1 ? 0 : prev + 1));
	}

	return (
		<div
			className="space-y-6"
			onMouseEnter={() => setIsPaused(true)}
			onMouseLeave={() => setIsPaused(false)}
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-slate-900">
						{ui.gallery}
					</h2>
					<p className="mt-1 text-sm text-slate-600">{ui.galleryDescription}</p>
				</div>

				{validItems.length > 1 ? (
					<div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-2 py-2 shadow-sm backdrop-blur">
						<button
							type="button"
							onClick={goPrev}
							aria-label={ui.previousImage}
							className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors duration-200 hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700"
						>
							<ArrowIcon direction="left" />
						</button>

						<button
							type="button"
							onClick={goNext}
							aria-label={ui.nextImage}
							className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors duration-200 hover:border-lime-400 hover:bg-lime-50 hover:text-lime-700"
						>
							<ArrowIcon direction="right" />
						</button>
					</div>
				) : null}
			</div>

			<div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
				<div className="relative aspect-[16/9] bg-slate-100">
					{currentImageUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={currentImageUrl}
							alt={currentAlt}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
							{ui.noImage}
						</div>
					)}

					{validItems.length > 1 ? (
						<>
							<button
								type="button"
								onClick={goPrev}
								aria-label={ui.previousImage}
								className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-900/45 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-lime-500 hover:text-white"
								style={{ transform: "translateY(-50%)" }}
							>
								<ArrowIcon direction="left" />
							</button>

							<button
								type="button"
								onClick={goNext}
								aria-label={ui.nextImage}
								className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-slate-900/45 text-white shadow-lg backdrop-blur-md transition-colors duration-200 hover:bg-lime-500 hover:text-white"
								style={{ transform: "translateY(-50%)" }}
							>
								<ArrowIcon direction="right" />
							</button>
						</>
					) : null}
				</div>

				<div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0">
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
								{ui.imageCounter}
							</p>
							<p className="mt-1 text-sm leading-6 text-slate-700">
								{resolveLocalizedText(currentItem.alt, locale) || currentAlt}
							</p>
						</div>

						{validItems.length > 1 ? (
							<div className="flex items-center gap-2">
								{validItems.map((_, index) => {
									const isActive = index === currentIndex;

									return (
										<button
											key={`dot-${index}`}
											type="button"
											aria-label={ui.goToImage(index)}
											onClick={() => setCurrentIndex(index)}
											className={[
												"h-2.5 rounded-full transition-all duration-200",
												isActive
													? "w-8 bg-lime-500"
													: "w-2.5 bg-slate-300 hover:bg-slate-400",
											].join(" ")}
										/>
									);
								})}
							</div>
						) : null}
					</div>
				</div>
			</div>

			{validItems.length > 1 ? (
				<div className="flex flex-wrap gap-3">
					{validItems.map((item, index) => {
						const thumbUrl = resolveImageUrl(item, baseUrl);
						const thumbAlt =
							resolveLocalizedText(item.alt, locale) ||
							ui.thumbnailAltFallback(index);

						const isActive = index === currentIndex;

						return (
							<button
								key={`${item.storageKey || item.url || "gallery"}-${index}`}
								type="button"
								onClick={() => setCurrentIndex(index)}
								aria-label={ui.viewImage(index)}
								className={[
									"overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200",
									isActive
										? "border-lime-500 ring-2 ring-lime-200"
										: "border-slate-200 hover:border-slate-300 hover:shadow-md",
								].join(" ")}
							>
								<div className="relative h-20 w-28 bg-slate-100">
									{thumbUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={thumbUrl}
											alt={thumbAlt}
											className="h-full w-full object-cover"
										/>
									) : (
										<div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
											{ui.noImage}
										</div>
									)}
								</div>
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
