"use client";

/**
 * =============================================================================
 * 📄 Page: Public Home
 * Path: src/app/page.tsx
 * =============================================================================
 *
 * ES:
 *   Portada pública principal de Sierra Tech.
 *
 *   Responsabilidades:
 *   - Consumir SiteSettings para branding global mínimo.
 *   - Consumir HomeSettings para el contenido editorial de portada.
 *   - Mantener coherencia visual con la página pública de Servicios.
 *   - Dirigir al usuario hacia la navegación principal del sitio.
 *
 *   Decisiones de UI:
 *   - Home y Services comparten la misma base visual:
 *     ancho, espaciados, jerarquía tipográfica y estilo de botones.
 *   - El CTA secundario del hero dirige a /services.
 *   - Las cards destacadas de Home muestran solo títulos.
 *   - El detalle completo de servicios vive en la página /services.
 *
 *   Reglas:
 *   - SiteSettings solo aporta branding global.
 *   - HomeSettings controla el contenido editorial de portada.
 *   - No inventar contenido si HomeSettings está vacío.
 *   - No duplicar en Home el nivel de detalle que corresponde a /services.
 *   - El botón de ubicación depende de una bandera explícita separada del mapa.
 *   - La geolocalización del navegador solo se usa si el mapa está habilitado.
 *   - Los bloques institucionales adicionales deben renderizarse solo cuando
 *     tengan contenido real o estén habilitados explícitamente.
 *   - Leadership Section consume un asset estructurado sin alterar la UI.
 *   - Todos los assets del Home deben resolverse con la misma lógica estable,
 *     incluyendo imágenes y documentos servidos desde R2 o rutas admin/*.
 *
 *   Navegación interna:
 *   - La home expone anclas estables para navegación pública.
 *   - Actualmente:
 *       #home   -> hero principal
 *       #about  -> bloque institucional "Nosotros"
 *
 * EN:
 *   Main public landing page for Sierra Tech.
 * =============================================================================
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { getPublicBranding, listenBrandingUpdates } from "@/lib/publicBranding";
import { HOME_DEFAULTS } from "@/lib/home/home.defaults";

import type { HomePayload, Locale, LocalizedText } from "@/types/home";

interface SiteSettingsPublic {
	identity: {
		siteName: string;
		siteNameShort: string;
		logoLight: string;
		logoDark: string;
	};
}

interface Coordinates {
	lat: number;
	lng: number;
}

/* -------------------------------------------------------------------------- */
/* Empty payloads                                                             */
/* -------------------------------------------------------------------------- */

const EMPTY_SITE_SETTINGS: SiteSettingsPublic = {
	identity: {
		siteName: "",
		siteNameShort: "",
		logoLight: "",
		logoDark: "",
	},
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeImageSrc(value: string | null | undefined): string {
	const trimmed = value?.trim() ?? "";

	if (!trimmed) {
		return "";
	}

	if (/^https?:\/\//i.test(trimmed)) {
		return trimmed;
	}

	if (trimmed.startsWith("/")) {
		return trimmed;
	}

	if (trimmed.startsWith("admin/")) {
		return `/api/admin/uploads/view?key=${encodeURIComponent(trimmed)}`;
	}

	return "";
}

function getLocalizedText(value: LocalizedText, locale: Locale): string {
	return locale === "es" ? value.es : value.en;
}

function hasLocalizedText(value: LocalizedText | undefined | null): boolean {
	if (!value) return false;
	return value.es.trim().length > 0 || value.en.trim().length > 0;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
	const { locale } = useTranslation();
	const lang: Locale = locale === "es" ? "es" : "en";

	const [homeContent, setHomeContent] = useState<HomePayload>(HOME_DEFAULTS);
	const [siteSettings, setSiteSettings] =
		useState<SiteSettingsPublic>(EMPTY_SITE_SETTINGS);

	const [coords, setCoords] = useState<Coordinates>({
		lat: -0.1807,
		lng: -78.4678,
	});

	useEffect(() => {
		async function loadHomeContent() {
			try {
				const response = await fetch("/api/home", {
					method: "GET",
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error(`HTTP_${response.status}`);
				}

				const payload = (await response
					.json()
					.catch(() => null)) as HomePayload | null;

				const nextHomeContent = payload ?? HOME_DEFAULTS;

				setHomeContent(nextHomeContent);
				setCoords((prev) => ({
					lat: nextHomeContent.mapSection.fallbackLat ?? prev.lat,
					lng: nextHomeContent.mapSection.fallbackLng ?? prev.lng,
				}));
			} catch (error) {
				console.error("[HomePage] Error loading home content:", error);
				setHomeContent(HOME_DEFAULTS);
			}
		}

		async function loadSiteSettings() {
			try {
				const branding = await getPublicBranding();

				setSiteSettings({
					identity: {
						siteName: branding.siteName,
						siteNameShort: branding.siteNameShort,
						logoLight: branding.logoLight,
						logoDark: branding.logoDark,
					},
				});
			} catch (error) {
				console.error("[HomePage] Error loading site settings:", error);
				setSiteSettings(EMPTY_SITE_SETTINGS);
			}
		}

		void loadHomeContent();
		void loadSiteSettings();
	}, []);

	useEffect(() => {
		const unsubscribe = listenBrandingUpdates(() => {
			async function reloadBranding() {
				try {
					const branding = await getPublicBranding();

					setSiteSettings({
						identity: {
							siteName: branding.siteName,
							siteNameShort: branding.siteNameShort,
							logoLight: branding.logoLight,
							logoDark: branding.logoDark,
						},
					});
				} catch (error) {
					console.error("[HomePage] Branding sync error:", error);
				}
			}

			void reloadBranding();
		});

		return unsubscribe;
	}, []);

	useEffect(() => {
		if (!homeContent.mapSection.enabled) return;
		if (!homeContent.mapSection.useBrowserGeolocation) return;
		if (!navigator.geolocation) return;

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const { latitude, longitude } = position.coords;
				setCoords({ lat: latitude, lng: longitude });
			},
			() => {
				/* Keep fallback coordinates */
			},
		);
	}, [
		homeContent.mapSection.enabled,
		homeContent.mapSection.useBrowserGeolocation,
	]);

	useEffect(() => {
		function scrollToHashTarget(hash: string): void {
			const safeId = hash.replace(/^#/, "");
			if (!safeId) return;

			let attempts = 12;

			const tryScroll = () => {
				const element = document.getElementById(safeId);

				if (element) {
					const headerOffset = 96;
					const top =
						element.getBoundingClientRect().top + window.scrollY - headerOffset;

					window.scrollTo({
						top: Math.max(top, 0),
						behavior: "smooth",
					});
					return;
				}

				attempts -= 1;
				if (attempts <= 0) return;

				window.setTimeout(tryScroll, 120);
			};

			tryScroll();
		}

		const handleHashChange = () => {
			if (!window.location.hash) return;
			scrollToHashTarget(window.location.hash);
		};

		const initialTimer = window.setTimeout(() => {
			handleHashChange();
		}, 120);

		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.clearTimeout(initialTimer);
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, [homeContent]);

	const businessName = siteSettings.identity.siteName.trim() || "Sierra Tech";
	const businessLogotipo = normalizeImageSrc(siteSettings.identity.logoLight);

	const featuredCards = useMemo(() => {
		return homeContent.featuredCards
			.filter((card) => card.enabled)
			.sort((a, b) => a.order - b.order);
	}, [homeContent.featuredCards]);

	const aboutHighlights = useMemo(() => {
		const highlights = Array.isArray(homeContent.aboutSection?.highlights)
			? homeContent.aboutSection.highlights
			: [];

		return highlights.filter((item) => hasLocalizedText(item));
	}, [homeContent.aboutSection]);

	const whyChooseUsItems = useMemo(() => {
		const items = Array.isArray(homeContent.whyChooseUs?.items)
			? homeContent.whyChooseUs.items
			: [];

		return items.filter(
			(item) =>
				hasLocalizedText(item.title) || hasLocalizedText(item.description),
		);
	}, [homeContent.whyChooseUs]);

	const leadershipImageSrc = normalizeImageSrc(
		homeContent.leadershipSection.image.url,
	);

	const showHeroBadge =
		homeContent.hero.badge.enabled &&
		hasLocalizedText(homeContent.hero.badge.text);

	const showHeroTitle = hasLocalizedText(homeContent.hero.title);
	const showHeroSubtitle = hasLocalizedText(homeContent.hero.subtitle);

	const showPrimaryCta =
		homeContent.hero.primaryCta.enabled &&
		hasLocalizedText(homeContent.hero.primaryCta.label);

	const showHighlightPanel =
		homeContent.highlightPanel.enabled &&
		hasLocalizedText(homeContent.highlightPanel.coverageLabel);

	const showCoverageSection = homeContent.coverageSection.enabled;
	const showCoverageEyebrow = hasLocalizedText(
		homeContent.coverageSection.eyebrow,
	);
	const showCoverageTitle = hasLocalizedText(homeContent.coverageSection.title);
	const showCoverageDescription = hasLocalizedText(
		homeContent.coverageSection.description,
	);
	const showCoverageNote = hasLocalizedText(homeContent.coverageSection.note);

	const showOpenMapsButton =
		homeContent.coverageSection.enabled &&
		homeContent.coverageSection.showOpenMapsLink &&
		hasLocalizedText(homeContent.coverageSection.openMapsLabel);

	const showMapSection = homeContent.mapSection.enabled;
	const showCoverageAndMapSection = showCoverageSection || showMapSection;

	const showAboutSection =
		homeContent.aboutSection.enabled &&
		(hasLocalizedText(homeContent.aboutSection.eyebrow) ||
			hasLocalizedText(homeContent.aboutSection.title) ||
			hasLocalizedText(homeContent.aboutSection.description) ||
			aboutHighlights.length > 0);

	const showAboutEyebrow = hasLocalizedText(homeContent.aboutSection.eyebrow);
	const showAboutTitle = hasLocalizedText(homeContent.aboutSection.title);
	const showAboutDescription = hasLocalizedText(
		homeContent.aboutSection.description,
	);

	const partnerItems = useMemo(() => {
		const items = Array.isArray(homeContent.partnerSection?.items)
			? homeContent.partnerSection.items
			: [];

		return items
			.filter((item) => item.enabled)
			.filter((item) => {
				const coverageItems = Array.isArray(item.coverageItems)
					? item.coverageItems.filter((entry) => hasLocalizedText(entry))
					: [];

				const tags = Array.isArray(item.tags)
					? item.tags.filter((entry) => hasLocalizedText(entry))
					: [];

				const documents = Array.isArray(item.documents)
					? item.documents.filter(
						(document) =>
							document.enabled &&
							(hasLocalizedText(document.label) ||
								hasLocalizedText(document.title) ||
								document.file.url.trim().length > 0),
					)
					: [];

				return (
					item.name.trim().length > 0 ||
					item.shortName.trim().length > 0 ||
					hasLocalizedText(item.badgeLabel) ||
					hasLocalizedText(item.summary) ||
					hasLocalizedText(item.description) ||
					item.logo.url.trim().length > 0 ||
					coverageItems.length > 0 ||
					tags.length > 0 ||
					(hasLocalizedText(item.ctaLabel) && item.ctaHref.trim().length > 0) ||
					documents.length > 0
				);
			})
			.sort((a, b) => a.order - b.order);
	}, [homeContent.partnerSection]);

	const showPartnerSection =
		homeContent.partnerSection.enabled &&
		(hasLocalizedText(homeContent.partnerSection.eyebrow) ||
			hasLocalizedText(homeContent.partnerSection.title) ||
			hasLocalizedText(homeContent.partnerSection.description) ||
			hasLocalizedText(homeContent.partnerSection.badgeLabel) ||
			(hasLocalizedText(homeContent.partnerSection.ctaLabel) &&
				homeContent.partnerSection.ctaHref.trim().length > 0) ||
			partnerItems.length > 0);

	const showPartnerEyebrow = hasLocalizedText(
		homeContent.partnerSection.eyebrow,
	);
	const showPartnerTitle = hasLocalizedText(homeContent.partnerSection.title);
	const showPartnerDescription = hasLocalizedText(
		homeContent.partnerSection.description,
	);
	const showPartnerBadge = hasLocalizedText(
		homeContent.partnerSection.badgeLabel,
	);

	const showPartnerSectionCta =
		hasLocalizedText(homeContent.partnerSection.ctaLabel) &&
		homeContent.partnerSection.ctaHref.trim().length > 0;

	const showLeadershipSection =
		homeContent.leadershipSection.enabled &&
		(homeContent.leadershipSection.name.trim().length > 0 ||
			hasLocalizedText(homeContent.leadershipSection.role) ||
			hasLocalizedText(homeContent.leadershipSection.message) ||
			leadershipImageSrc.length > 0);

	const showLeadershipRole = hasLocalizedText(
		homeContent.leadershipSection.role,
	);
	const showLeadershipMessage = hasLocalizedText(
		homeContent.leadershipSection.message,
	);

	const showWhyChooseUsSection =
		homeContent.whyChooseUs.enabled &&
		(hasLocalizedText(homeContent.whyChooseUs.title) ||
			whyChooseUsItems.length > 0);

	const coverageGridClass =
		showCoverageSection && showMapSection
			? "grid gap-10 xl:grid-cols-[0.95fr_1.05fr]"
			: "grid gap-10";

	const googleLink = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
	const mapEmbedSrc = `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=${homeContent.mapSection.zoom}&output=embed`;

	const primaryCtaHref = homeContent.hero.primaryCta.href.trim() || "/contact";
	const primaryCtaLabel =
		getLocalizedText(homeContent.hero.primaryCta.label, lang).trim() ||
		(lang === "es" ? "Solicitar cotización" : "Request a quote");

	const servicesCtaLabel = lang === "es" ? "Ver servicios" : "View services";

	return (
		<main className="min-h-screen bg-white text-slate-900">
			<div className="bg-white">
				<section id="home" className="bg-white scroll-mt-28">
					<div className="mx-auto max-w-7xl px-6 pb-10 pt-24 md:px-10 md:pb-12 md:pt-28 lg:pb-14 lg:pt-32">
						<div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] xl:gap-16">
							<div className="max-w-4xl">
								{showHeroBadge ? (
									<span className="inline-flex rounded-full border border-lime-200 bg-lime-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-lime-700">
										{getLocalizedText(homeContent.hero.badge.text, lang)}
									</span>
								) : null}

								<p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-lime-700">
									{businessName}
								</p>

								{showHeroTitle ? (
									<h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] text-slate-950 md:text-5xl xl:text-[4.35rem]">
										{getLocalizedText(homeContent.hero.title, lang)}
									</h1>
								) : null}

								{showHeroSubtitle ? (
									<p className="mt-7 max-w-3xl text-base leading-8 text-slate-600 md:text-lg md:leading-9">
										{getLocalizedText(homeContent.hero.subtitle, lang)}
									</p>
								) : null}

								<div className="mt-9 flex flex-wrap gap-4">
									{showPrimaryCta ? (
										<Link
											href={primaryCtaHref}
											className="inline-flex items-center gap-2 rounded-full bg-lime-500 px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-lime-400"
										>
											{primaryCtaLabel}
										</Link>
									) : null}

									<Link
										href="/services"
										className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
									>
										{servicesCtaLabel}
									</Link>
								</div>

								{featuredCards.length > 0 ? (
									<div className="mt-16 grid gap-5 sm:grid-cols-2">
										{featuredCards.map((card) => (
											<div
												key={card.id}
												className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm transition hover:-translate-y-0.5 hover:border-lime-300 hover:shadow-md"
											>
												<h2 className="text-base font-semibold text-slate-900 md:text-lg">
													{getLocalizedText(card.title, lang)}
												</h2>
											</div>
										))}
									</div>
								) : null}
							</div>

							<div className="flex justify-center lg:justify-end">
								<div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
									<div className="flex flex-col items-center text-center">
										{businessLogotipo ? (
											<Image
												src={businessLogotipo}
												alt={
													businessName
														? `${businessName} logo`
														: "Business logo"
												}
												width={360}
												height={360}
												priority
												unoptimized
												className="h-[340px] w-full object-contain"
											/>
										) : (
											<div
												className="h-[240px] w-full rounded-2xl border border-slate-200 bg-slate-50"
												aria-label="Logo placeholder"
											/>
										)}

										<div className="mt-6 text-xl font-semibold text-slate-900">
											{businessName}
										</div>

										{showHighlightPanel ? (
											<div className="mt-4 rounded-full bg-slate-100 px-4 py-2.5 text-sm text-slate-600">
												{getLocalizedText(
													homeContent.highlightPanel.coverageLabel,
													lang,
												)}
											</div>
										) : null}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{showCoverageAndMapSection ? (
					<section className="mx-auto max-w-7xl px-6 pb-18 pt-16 md:px-10 md:pb-24 md:pt-20">
						<div className={coverageGridClass}>
							{showCoverageSection ? (
								<div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-8">
									{showCoverageEyebrow ? (
										<p className="text-sm font-semibold uppercase tracking-[0.16em] text-lime-700">
											{getLocalizedText(
												homeContent.coverageSection.eyebrow,
												lang,
											)}
										</p>
									) : null}

									{showCoverageTitle ? (
										<h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-slate-950 md:text-[2.55rem]">
											{getLocalizedText(
												homeContent.coverageSection.title,
												lang,
											)}
										</h2>
									) : null}

									{showCoverageDescription ? (
										<p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
											{getLocalizedText(
												homeContent.coverageSection.description,
												lang,
											)}
										</p>
									) : null}

									{showCoverageNote ? (
										<div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
											{getLocalizedText(homeContent.coverageSection.note, lang)}
										</div>
									) : null}

									{showOpenMapsButton ? (
										<button
											type="button"
											onClick={() =>
												window.open(googleLink, "_blank", "noopener,noreferrer")
											}
											className="mt-7 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
										>
											{getLocalizedText(
												homeContent.coverageSection.openMapsLabel,
												lang,
											)}
										</button>
									) : null}
								</div>
							) : null}

							{showMapSection ? (
								<div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
									<iframe
										src={mapEmbedSrc}
										width="100%"
										height="410"
										style={{ border: 0 }}
										allowFullScreen
										loading="lazy"
										className="rounded-[22px]"
										title="Sierra Tech map reference"
									/>
								</div>
							) : null}
						</div>
					</section>
				) : null}
			</div>

			<section
				id="about"
				className="mx-auto max-w-7xl scroll-mt-28 px-6 py-2 md:px-10 md:py-4"
			>
				{showAboutSection ? (
					<div className="overflow-hidden rounded-[34px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 shadow-sm">
						<div className="grid lg:grid-cols-[1.08fr_0.92fr]">
							<div className="px-7 py-9 md:px-10 md:py-11 lg:px-12 lg:py-12">
								{showAboutEyebrow ? (
									<p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-300">
										{getLocalizedText(homeContent.aboutSection.eyebrow, lang)}
									</p>
								) : null}

								{showAboutTitle ? (
									<h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight text-white md:text-[2.65rem]">
										{getLocalizedText(homeContent.aboutSection.title, lang)}
									</h2>
								) : null}

								{showAboutDescription ? (
									<p className="mt-7 max-w-3xl text-base leading-8 text-slate-300 md:text-lg md:leading-9">
										{getLocalizedText(
											homeContent.aboutSection.description,
											lang,
										)}
									</p>
								) : null}
							</div>

							{aboutHighlights.length > 0 ? (
								<div className="border-t border-white/10 bg-white/5 px-6 py-6 backdrop-blur-sm md:px-8 md:py-8 lg:border-l lg:border-t-0 lg:px-9 lg:py-9">
									<div className="grid gap-4">
										{aboutHighlights.map((item, index) => (
											<div
												key={`about-highlight-${index}`}
												className="rounded-2xl border border-white/10 bg-white/10 p-4 md:p-5"
											>
												<div className="text-sm leading-7 text-slate-100 md:text-[0.96rem]">
													{getLocalizedText(item, lang)}
												</div>
											</div>
										))}
									</div>
								</div>
							) : null}
						</div>
					</div>
				) : null}
			</section>

			{showPartnerSection ? (
				<section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-12">
					<div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-9">
						<div className="max-w-3xl">
							{showPartnerEyebrow ? (
								<p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-700">
									{getLocalizedText(homeContent.partnerSection.eyebrow, lang)}
								</p>
							) : null}

							{showPartnerTitle ? (
								<h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 md:text-[2.6rem]">
									{getLocalizedText(homeContent.partnerSection.title, lang)}
								</h2>
							) : null}

							{showPartnerDescription ? (
								<p className="mt-6 text-base leading-8 text-slate-600 md:text-lg md:leading-9">
									{getLocalizedText(
										homeContent.partnerSection.description,
										lang,
									)}
								</p>
							) : null}

							{showPartnerBadge ? (
								<div className="mt-6">
									<span className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-4 py-2 text-sm font-medium text-lime-700">
										{getLocalizedText(
											homeContent.partnerSection.badgeLabel,
											lang,
										)}
									</span>
								</div>
							) : null}

							{showPartnerSectionCta ? (
								<div className="mt-6">
									<Link
										href={homeContent.partnerSection.ctaHref}
										className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
									>
										{getLocalizedText(
											homeContent.partnerSection.ctaLabel,
											lang,
										)}
									</Link>
								</div>
							) : null}
						</div>

						{partnerItems.length > 0 ? (
							<div className="mt-10 grid gap-6 lg:grid-cols-2">
								{partnerItems.map((partner) => {
									const partnerLogoSrc = normalizeImageSrc(partner.logo.url);
									const partnerCoverageItems = partner.coverageItems.filter(
										(item) => hasLocalizedText(item),
									);
									const partnerTags = partner.tags.filter((item) =>
										hasLocalizedText(item),
									);
									const partnerDocuments = partner.documents
										.filter(
											(document) =>
												document.enabled &&
												document.file.url.trim().length > 0 &&
												(hasLocalizedText(document.label) ||
													hasLocalizedText(document.title)),
										)
										.sort((a, b) => a.order - b.order);

									const showPartnerName =
										partner.name.trim().length > 0 ||
										partner.shortName.trim().length > 0;
									const partnerDisplayName =
										partner.name.trim() || partner.shortName.trim();

									const showPartnerItemBadge = hasLocalizedText(
										partner.badgeLabel,
									);
									const showPartnerSummary = hasLocalizedText(partner.summary);
									const showPartnerItemDescription = hasLocalizedText(
										partner.description,
									);
									const showPartnerItemCta =
										hasLocalizedText(partner.ctaLabel) &&
										partner.ctaHref.trim().length > 0;

									return (
										<article
											key={partner.id}
											className="rounded-[28px] border border-slate-200 bg-slate-50 p-6 shadow-sm"
										>
											{showPartnerItemBadge ? (
												<span className="inline-flex rounded-full border border-lime-200 bg-lime-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-lime-700">
													{getLocalizedText(partner.badgeLabel, lang)}
												</span>
											) : null}

											<div className="mt-5 flex items-center gap-4">
												{partnerLogoSrc ? (
													<div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
														<Image
															src={partnerLogoSrc}
															alt={partnerDisplayName || "Partner logo"}
															width={80}
															height={80}
															className="h-full w-full object-contain"
															unoptimized
														/>
													</div>
												) : null}

												<div className="min-w-0">
													{showPartnerName ? (
														<h3 className="text-xl font-semibold text-slate-950">
															{partnerDisplayName}
														</h3>
													) : null}
												</div>
											</div>

											{showPartnerSummary ? (
												<p className="mt-5 text-sm leading-7 text-slate-600 md:text-[0.96rem]">
													{getLocalizedText(partner.summary, lang)}
												</p>
											) : null}

											{showPartnerItemDescription ? (
												<p className="mt-4 text-sm leading-7 text-slate-600 md:text-[0.96rem]">
													{getLocalizedText(partner.description, lang)}
												</p>
											) : null}

											{partnerTags.length > 0 ? (
												<div className="mt-5 flex flex-wrap gap-2">
													{partnerTags.map((item, index) => (
														<span
															key={`${partner.id}-tag-${index}`}
															className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
														>
															{getLocalizedText(item, lang)}
														</span>
													))}
												</div>
											) : null}

											{partnerCoverageItems.length > 0 ? (
												<div className="mt-6">
													<p className="text-sm font-semibold text-slate-900">
														{lang === "es"
															? "Cobertura autorizada"
															: "Authorized coverage"}
													</p>

													<ul className="mt-3 space-y-2">
														{partnerCoverageItems.map((item, index) => (
															<li
																key={`${partner.id}-coverage-${index}`}
																className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
															>
																{getLocalizedText(item, lang)}
															</li>
														))}
													</ul>
												</div>
											) : null}

											{partnerDocuments.length > 0 ? (
												<div className="mt-6">
													<p className="text-sm font-semibold text-slate-900">
														{lang === "es" ? "Documentos" : "Documents"}
													</p>

													<div className="mt-3 flex flex-wrap gap-3">
														{partnerDocuments.map((document) => {
															const label =
																getLocalizedText(document.label, lang).trim() ||
																getLocalizedText(document.title, lang).trim() ||
																(lang === "es"
																	? "Abrir documento"
																	: "Open document");

															const documentHref = normalizeImageSrc(
																document.file.url,
															);

															if (!documentHref) {
																return null;
															}

															return (
																<Link
																	key={document.id}
																	href={documentHref}
																	target="_blank"
																	rel="noreferrer"
																	className="inline-flex items-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
																>
																	{label}
																</Link>
															);
														})}
													</div>
												</div>
											) : null}

											{showPartnerItemCta ? (
												<div className="mt-6">
													<Link
														href={partner.ctaHref}
														target="_blank"
														rel="noreferrer noopener"
														className="inline-flex items-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-lime-600"
													>
														{getLocalizedText(partner.ctaLabel, lang)}
													</Link>
												</div>
											) : null}
										</article>
									);
								})}
							</div>
						) : null}
					</div>
				</section>
			) : null}

			{showLeadershipSection ? (
				<section className="mx-auto max-w-7xl px-6 py-10 md:px-10 md:py-12">
					<div className="grid gap-8 rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-9 lg:grid-cols-[0.42fr_0.58fr] lg:items-center">
						<div className="flex justify-center lg:justify-start">
							{leadershipImageSrc ? (
								<div className="relative h-[430px] w-full max-w-[350px] overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100 shadow-sm">
									<Image
										src={leadershipImageSrc}
										alt={
											homeContent.leadershipSection.name.trim() ||
											"Leadership image"
										}
										fill
										sizes="(max-width: 1024px) 350px, 350px"
										className="object-contain object-center"
									/>
								</div>
							) : (
								<div className="flex h-[430px] w-full max-w-[350px] items-center justify-center rounded-[26px] border border-slate-200 bg-slate-50 text-sm text-slate-400">
									{lang === "es" ? "Imagen pendiente" : "Image pending"}
								</div>
							)}
						</div>

						<div className="max-w-3xl">
							<p className="text-sm font-semibold uppercase tracking-[0.18em] text-lime-700">
								{lang === "es" ? "Liderazgo" : "Leadership"}
							</p>

							{homeContent.leadershipSection.name.trim() ? (
								<h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 md:text-[2.6rem]">
									{homeContent.leadershipSection.name}
								</h2>
							) : null}

							{showLeadershipRole ? (
								<p className="mt-3 text-base font-medium text-slate-600 md:text-lg">
									{getLocalizedText(homeContent.leadershipSection.role, lang)}
								</p>
							) : null}

							{showLeadershipMessage ? (
								<div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 md:px-6 md:py-6">
									<p className="text-base leading-8 text-slate-600 md:text-lg md:leading-9">
										{getLocalizedText(
											homeContent.leadershipSection.message,
											lang,
										)}
									</p>
								</div>
							) : null}
						</div>
					</div>
				</section>
			) : null}

			{showWhyChooseUsSection ? (
				<section className="mx-auto max-w-7xl px-6 pb-24 pt-6 md:px-10 md:pt-8">
					<div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm md:p-9">
						{hasLocalizedText(homeContent.whyChooseUs.title) ? (
							<h2 className="text-3xl font-semibold text-slate-950 md:text-[2.45rem]">
								{getLocalizedText(homeContent.whyChooseUs.title, lang)}
							</h2>
						) : null}

						{whyChooseUsItems.length > 0 ? (
							<div className="mt-9 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
								{whyChooseUsItems.map((item, index) => (
									<article
										key={`why-choose-us-item-${index}`}
										className="min-h-[240px] rounded-3xl border border-slate-200 bg-slate-50 p-6"
									>
										{hasLocalizedText(item.title) ? (
											<h3 className="text-xl font-semibold leading-snug text-slate-950">
												{getLocalizedText(item.title, lang)}
											</h3>
										) : null}

										{hasLocalizedText(item.description) ? (
											<p className="mt-4 text-sm leading-7 text-slate-600 md:text-[0.96rem]">
												{getLocalizedText(item.description, lang)}
											</p>
										) : null}
									</article>
								))}
							</div>
						) : null}
					</div>
				</section>
			) : null}
		</main>
	);
}