/**
 * =============================================================================
 * 📄 Home Normalize Helpers
 * Path: src/lib/home/home.normalize.ts
 * =============================================================================
 *
 * ES:
 *   Helpers compartidos para crear, ordenar y normalizar estructuras del Home.
 *
 *   Reglas:
 *   - aceptan datos desconocidos (`unknown`) cuando vienen de API o DB
 *   - normalizan el nuevo contrato de partnerSection.items[]
 *   - mantienen compatibilidad con estructura legacy de partner único
 *
 * EN:
 *   Shared helpers to create, sort and normalize Home structures.
 * =============================================================================
 */

import {
	DEFAULT_PARTNER_ASSET,
	DEFAULT_PARTNER_DOCUMENT,
	DEFAULT_PARTNER_ITEM,
	DEFAULT_PARTNER_SECTION,
	EMPTY_LOCALIZED_TEXT,
	HOME_DEFAULTS,
} from "@/lib/home/home.defaults";

import type {
	HomeFeaturedCard,
	HomePayload,
	LocalizedText,
	PartnerAsset,
	PartnerDocument,
	PartnerItem,
	PartnerSection,
	WhyChooseUsItem,
} from "@/types/home";

export function createStableId(prefix: string): string {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return `${prefix}-${crypto.randomUUID()}`;
	}

	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export function normalizeString(value: unknown, fallback = ""): string {
	return typeof value === "string" ? value : fallback;
}

export function normalizeBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

export function normalizeNumber(
	value: unknown,
	fallback: number | null,
): number | null {
	if (value === null) return null;
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return value;
}

export function normalizeLocalizedText(
	value: unknown,
	fallback: LocalizedText = EMPTY_LOCALIZED_TEXT,
): LocalizedText {
	if (!value || typeof value !== "object") {
		return { ...fallback };
	}

	const record = value as Record<string, unknown>;

	return {
		es: normalizeString(record.es, fallback.es),
		en: normalizeString(record.en, fallback.en),
	};
}

function normalizeCta(
	value: unknown,
	fallback: HomePayload["hero"]["primaryCta"],
): HomePayload["hero"]["primaryCta"] {
	if (!value || typeof value !== "object") {
		return {
			label: { ...fallback.label },
			href: fallback.href,
			enabled: fallback.enabled,
		};
	}

	const record = value as Record<string, unknown>;

	return {
		label: normalizeLocalizedText(record.label, fallback.label),
		href: normalizeString(record.href, fallback.href),
		enabled: normalizeBoolean(record.enabled, fallback.enabled),
	};
}

export function normalizeLocalizedTextArray(value: unknown): LocalizedText[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item): LocalizedText | null => {
			if (!item || typeof item !== "object") return null;
			return normalizeLocalizedText(item);
		})
		.filter((item): item is LocalizedText => item !== null);
}

export function createEmptyLocalizedItem(): LocalizedText {
	return { es: "", en: "" };
}

export function createEmptyCard(nextOrder: number): HomeFeaturedCard {
	return {
		id: createStableId("card"),
		title: { es: "", en: "" },
		description: { es: "", en: "" },
		order: nextOrder,
		enabled: true,
	};
}

export function sortCards(cards: HomeFeaturedCard[]): HomeFeaturedCard[] {
	return [...cards].sort((a, b) => a.order - b.order);
}

export function normalizeCards(cards: HomeFeaturedCard[]): HomeFeaturedCard[] {
	return sortCards(cards).map((card, index) => ({
		...card,
		order: index + 1,
	}));
}

export function createEmptyPartnerAsset(): PartnerAsset {
	return { ...DEFAULT_PARTNER_ASSET };
}

export function normalizePartnerAsset(
	asset: Partial<PartnerAsset> | unknown | null | undefined,
): PartnerAsset {
	if (!asset || typeof asset !== "object") {
		return createEmptyPartnerAsset();
	}

	const value = asset as Record<string, unknown>;

	return {
		url: normalizeString(value.url),
		fileName: normalizeString(value.fileName),
		mimeType: normalizeString(value.mimeType),
		sizeBytes:
			typeof value.sizeBytes === "number" && Number.isFinite(value.sizeBytes)
				? Math.max(0, value.sizeBytes)
				: 0,
		storageKey: normalizeString(value.storageKey),
	};
}

export function createEmptyPartnerDocument(nextOrder: number): PartnerDocument {
	return {
		...DEFAULT_PARTNER_DOCUMENT,
		id: createStableId("partner-doc"),
		title: { es: "", en: "" },
		description: { es: "", en: "" },
		label: { es: "", en: "" },
		file: createEmptyPartnerAsset(),
		order: nextOrder,
		enabled: true,
	};
}

export function sortPartnerDocuments(
	documents: PartnerDocument[],
): PartnerDocument[] {
	return [...documents].sort((a, b) => a.order - b.order);
}

export function normalizePartnerDocuments(
	documents: PartnerDocument[],
): PartnerDocument[] {
	return sortPartnerDocuments(documents).map((document, index) => ({
		...document,
		order: index + 1,
	}));
}

export function normalizePartnerDocumentsArray(
	value: unknown,
): PartnerDocument[] {
	if (!Array.isArray(value)) return [];

	return normalizePartnerDocuments(
		value.map((document, index) => {
			const record =
				typeof document === "object" && document !== null
					? (document as Record<string, unknown>)
					: {};

			return {
				id:
					typeof record.id === "string" && record.id.trim().length > 0
						? record.id
						: createStableId(`partner-doc-${index + 1}`),
				title: normalizeLocalizedText(record.title),
				description: normalizeLocalizedText(record.description),
				label: normalizeLocalizedText(record.label),
				file: normalizePartnerAsset(record.file),
				order:
					typeof record.order === "number" && Number.isFinite(record.order)
						? record.order
						: index + 1,
				enabled: normalizeBoolean(record.enabled, true),
			};
		}),
	);
}

export function createEmptyPartnerItem(nextOrder: number): PartnerItem {
	return {
		...DEFAULT_PARTNER_ITEM,
		id: createStableId("partner"),
		badgeLabel: { es: "", en: "" },
		summary: { es: "", en: "" },
		description: { es: "", en: "" },
		logo: createEmptyPartnerAsset(),
		coverageItems: [],
		tags: [],
		ctaLabel: { es: "", en: "" },
		documents: [],
		order: nextOrder,
		enabled: true,
	};
}

export function sortPartnerItems(items: PartnerItem[]): PartnerItem[] {
	return [...items].sort((a, b) => a.order - b.order);
}

export function normalizePartnerItemsArray(value: unknown): PartnerItem[] {
	if (!Array.isArray(value)) return [];

	return sortPartnerItems(
		value.map((item, index) => {
			const record =
				typeof item === "object" && item !== null
					? (item as Record<string, unknown>)
					: {};

			return {
				id:
					typeof record.id === "string" && record.id.trim().length > 0
						? record.id
						: createStableId(`partner-${index + 1}`),
				name: normalizeString(record.name),
				shortName: normalizeString(record.shortName),
				badgeLabel: normalizeLocalizedText(record.badgeLabel),
				summary: normalizeLocalizedText(record.summary),
				description: normalizeLocalizedText(record.description),
				logo: normalizePartnerAsset(record.logo),
				coverageItems: normalizeLocalizedTextArray(record.coverageItems),
				tags: normalizeLocalizedTextArray(record.tags),
				ctaLabel: normalizeLocalizedText(record.ctaLabel),
				ctaHref: normalizeString(record.ctaHref),
				documents: normalizePartnerDocumentsArray(record.documents),
				order:
					typeof record.order === "number" && Number.isFinite(record.order)
						? record.order
						: index + 1,
				enabled: normalizeBoolean(record.enabled, true),
			};
		}),
	).map((item, index) => ({
		...item,
		order: index + 1,
	}));
}

function normalizeWhyChooseUsItems(value: unknown): WhyChooseUsItem[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item): WhyChooseUsItem | null => {
			if (!item || typeof item !== "object") return null;

			const record = item as Record<string, unknown>;

			return {
				title: normalizeLocalizedText(record.title),
				description: normalizeLocalizedText(record.description),
			};
		})
		.filter((item): item is WhyChooseUsItem => item !== null);
}

function normalizeLegacyPartnerSection(
	value: Record<string, unknown>,
): PartnerSection {
	const partnerName = normalizeString(value.partnerName);
	const partnerLogo = normalizeString(value.partnerLogo);
	const summary = normalizeLocalizedText(value.summary);
	const coverageItems = normalizeLocalizedTextArray(value.coverageItems);
	const tags = normalizeLocalizedTextArray(value.tags);
	const ctaLabel = normalizeLocalizedText(value.ctaLabel);
	const ctaHref = normalizeString(value.ctaHref);
	const documentLabel = normalizeLocalizedText(value.documentLabel);
	const documentUrl = normalizeString(value.documentUrl);

	const hasLegacyContent =
		partnerName.trim().length > 0 ||
		partnerLogo.trim().length > 0 ||
		summary.es.trim().length > 0 ||
		summary.en.trim().length > 0 ||
		coverageItems.length > 0 ||
		tags.length > 0 ||
		ctaHref.trim().length > 0 ||
		documentUrl.trim().length > 0 ||
		documentLabel.es.trim().length > 0 ||
		documentLabel.en.trim().length > 0;

	const items: PartnerItem[] = hasLegacyContent
		? [
				{
					id: "partner-1",
					name: partnerName,
					shortName: "",
					badgeLabel: normalizeLocalizedText(value.badgeLabel),
					summary,
					description: { es: "", en: "" },
					logo: {
						...DEFAULT_PARTNER_ASSET,
						url: partnerLogo,
					},
					coverageItems,
					tags,
					ctaLabel,
					ctaHref,
					documents:
						documentUrl.trim().length > 0 ||
						documentLabel.es.trim().length > 0 ||
						documentLabel.en.trim().length > 0
							? [
									{
										id: "partner-doc-1",
										title: { es: "", en: "" },
										description: { es: "", en: "" },
										label: documentLabel,
										file: {
											...DEFAULT_PARTNER_ASSET,
											url: documentUrl,
										},
										order: 1,
										enabled: true,
									},
								]
							: [],
					order: 1,
					enabled: true,
				},
			]
		: [];

	return {
		enabled: normalizeBoolean(value.enabled, DEFAULT_PARTNER_SECTION.enabled),
		eyebrow: normalizeLocalizedText(value.eyebrow),
		title: normalizeLocalizedText(value.title),
		description: normalizeLocalizedText(value.description),
		badgeLabel: normalizeLocalizedText(value.badgeLabel),
		ctaLabel: normalizeLocalizedText(value.ctaLabel),
		ctaHref: normalizeString(value.ctaHref),
		items,
	};
}

function normalizePartnerSection(value: unknown): PartnerSection {
	if (!value || typeof value !== "object") {
		return structuredClone(DEFAULT_PARTNER_SECTION);
	}

	const record = value as Record<string, unknown>;
	const normalizedItems = normalizePartnerItemsArray(record.items);

	const baseSection: PartnerSection = {
		enabled: normalizeBoolean(record.enabled, DEFAULT_PARTNER_SECTION.enabled),
		eyebrow: normalizeLocalizedText(record.eyebrow),
		title: normalizeLocalizedText(record.title),
		description: normalizeLocalizedText(record.description),
		badgeLabel: normalizeLocalizedText(record.badgeLabel),
		ctaLabel: normalizeLocalizedText(record.ctaLabel),
		ctaHref: normalizeString(record.ctaHref),
		items: normalizedItems,
	};

	if (normalizedItems.length > 0) {
		return baseSection;
	}

	const legacySection = normalizeLegacyPartnerSection(record);

	return {
		...baseSection,
		items: legacySection.items ?? [],
	};
}

export function normalizeHomePayload(payload: unknown): HomePayload {
	if (!payload || typeof payload !== "object") {
		return structuredClone(HOME_DEFAULTS);
	}

	const record = payload as Record<string, unknown>;
	const hero = (record.hero ?? {}) as Record<string, unknown>;
	const badge = (hero.badge ?? {}) as Record<string, unknown>;
	const highlightPanel = (record.highlightPanel ?? {}) as Record<
		string,
		unknown
	>;
	const coverageSection = (record.coverageSection ?? {}) as Record<
		string,
		unknown
	>;
	const aboutSection = (record.aboutSection ?? {}) as Record<string, unknown>;
	const leadershipSection = (record.leadershipSection ?? {}) as Record<
		string,
		unknown
	>;
	const whyChooseUs = (record.whyChooseUs ?? {}) as Record<string, unknown>;
	const mapSection = (record.mapSection ?? {}) as Record<string, unknown>;

	return {
		hero: {
			badge: {
				text: normalizeLocalizedText(badge.text),
				enabled: normalizeBoolean(
					badge.enabled,
					HOME_DEFAULTS.hero.badge.enabled,
				),
			},
			title: normalizeLocalizedText(hero.title),
			subtitle: normalizeLocalizedText(hero.subtitle),
			primaryCta: normalizeCta(hero.primaryCta, HOME_DEFAULTS.hero.primaryCta),
			secondaryCta: normalizeCta(
				hero.secondaryCta,
				HOME_DEFAULTS.hero.secondaryCta,
			),
		},

		highlightPanel: {
			coverageLabel: normalizeLocalizedText(highlightPanel.coverageLabel),
			enabled: normalizeBoolean(
				highlightPanel.enabled,
				HOME_DEFAULTS.highlightPanel.enabled,
			),
		},

		featuredCards: normalizeFeaturedCards(record.featuredCards),

		coverageSection: {
			eyebrow: normalizeLocalizedText(coverageSection.eyebrow),
			title: normalizeLocalizedText(coverageSection.title),
			description: normalizeLocalizedText(coverageSection.description),
			note: normalizeLocalizedText(coverageSection.note),
			openMapsLabel: normalizeLocalizedText(coverageSection.openMapsLabel),
			showOpenMapsLink: normalizeBoolean(
				coverageSection.showOpenMapsLink,
				HOME_DEFAULTS.coverageSection.showOpenMapsLink,
			),
			enabled: normalizeBoolean(
				coverageSection.enabled,
				HOME_DEFAULTS.coverageSection.enabled,
			),
		},

		aboutSection: {
			eyebrow: normalizeLocalizedText(aboutSection.eyebrow),
			title: normalizeLocalizedText(aboutSection.title),
			description: normalizeLocalizedText(aboutSection.description),
			highlights: normalizeLocalizedTextArray(aboutSection.highlights),
			enabled: normalizeBoolean(
				aboutSection.enabled,
				HOME_DEFAULTS.aboutSection.enabled,
			),
		},

		partnerSection: normalizePartnerSection(record.partnerSection),

		leadershipSection: {
			...HOME_DEFAULTS.leadershipSection,
			name: normalizeString(leadershipSection.name),
			role: normalizeLocalizedText(leadershipSection.role),
			message: normalizeLocalizedText(leadershipSection.message),
			imageUrl: normalizeString(leadershipSection.imageUrl),
			enabled: normalizeBoolean(
				leadershipSection.enabled,
				HOME_DEFAULTS.leadershipSection.enabled,
			),
		},

		whyChooseUs: {
			title: normalizeLocalizedText(whyChooseUs.title),
			items: normalizeWhyChooseUsItems(whyChooseUs.items),
			enabled: normalizeBoolean(
				whyChooseUs.enabled,
				HOME_DEFAULTS.whyChooseUs.enabled,
			),
		},

		mapSection: {
			enabled: normalizeBoolean(
				mapSection.enabled,
				HOME_DEFAULTS.mapSection.enabled,
			),
			useBrowserGeolocation: normalizeBoolean(
				mapSection.useBrowserGeolocation,
				HOME_DEFAULTS.mapSection.useBrowserGeolocation,
			),
			fallbackLat: normalizeNumber(
				mapSection.fallbackLat,
				HOME_DEFAULTS.mapSection.fallbackLat,
			),
			fallbackLng: normalizeNumber(
				mapSection.fallbackLng,
				HOME_DEFAULTS.mapSection.fallbackLng,
			),
			zoom:
				typeof mapSection.zoom === "number" &&
				Number.isFinite(mapSection.zoom) &&
				mapSection.zoom >= 1 &&
				mapSection.zoom <= 20
					? mapSection.zoom
					: HOME_DEFAULTS.mapSection.zoom,
		},

		updatedAt: normalizeString(record.updatedAt),
		updatedBy: normalizeString(record.updatedBy),
		updatedByEmail: normalizeString(record.updatedByEmail),
	};
}

function normalizeFeaturedCards(value: unknown): HomeFeaturedCard[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item, index): HomeFeaturedCard | null => {
			if (!item || typeof item !== "object") return null;

			const record = item as Record<string, unknown>;

			return {
				id:
					typeof record.id === "string" && record.id.trim().length > 0
						? record.id
						: createStableId(`card-${index + 1}`),
				title: normalizeLocalizedText(record.title),
				description: normalizeLocalizedText(record.description),
				order:
					typeof record.order === "number" && Number.isFinite(record.order)
						? record.order
						: index + 1,
				enabled: normalizeBoolean(record.enabled, true),
			};
		})
		.filter((item): item is HomeFeaturedCard => item !== null)
		.sort((a, b) => a.order - b.order)
		.map((item, index) => ({
			...item,
			order: index + 1,
		}));
}

export function safeNumberFromInput(value: string): number | null {
	if (value.trim() === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}
