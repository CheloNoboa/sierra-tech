/**
 * =============================================================================
 * 📄 Types: Home
 * Path: src/types/home.ts
 * =============================================================================
 *
 * ES:
 *   Contrato tipado compartido del módulo Home de Sierra Tech.
 *
 *   Objetivo:
 *   - centralizar los tipos usados por:
 *     - admin Home
 *     - API admin Home
 *     - API pública Home
 *     - página pública Home
 *   - evitar duplicación de contratos
 *   - mantener una sola fuente de verdad para todo el módulo
 *
 *   Regla oficial del módulo:
 *   - todo asset visual o documental del Home debe persistirse como metadata
 *     estructurada de un archivo servido desde R2
 *   - no se deben mezclar URLs sueltas con assets tipados
 *   - Leadership, Partners y documentos comparten el mismo patrón base
 *
 * EN:
 *   Shared typed contract for Sierra Tech Home module.
 * =============================================================================
 */

export type Locale = "es" | "en";
export type AllowedRole = "admin" | "superadmin";

/**
 * Tipos de upload admitidos por el módulo Home.
 *
 * Regla:
 * - cada kind representa un flujo administrado de archivos dentro del Home
 * - todos terminan resolviéndose en metadata persistida de R2
 */
export type UploadKind =
	| "partner-logo"
	| "partner-document"
	| "leadership-image";

export interface LocalizedText {
	es: string;
	en: string;
}

export interface HomeCta {
	label: LocalizedText;
	href: string;
	enabled: boolean;
}

export interface HomeFeaturedCard {
	id: string;
	title: LocalizedText;
	description: LocalizedText;
	order: number;
	enabled: boolean;
}

export interface WhyChooseUsItem {
	title: LocalizedText;
	description: LocalizedText;
}

/**
 * Asset base reutilizable del módulo Home.
 *
 * Regla:
 * - representa un archivo ya subido y persistido en R2
 * - no contiene el archivo binario
 * - solo conserva la metadata necesaria para render, reemplazo y auditoría
 */
export interface HomeAsset {
	url: string;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	storageKey: string;
}

export interface PartnerDocument {
	id: string;
	title: LocalizedText;
	description: LocalizedText;
	label: LocalizedText;
	file: HomeAsset;
	order: number;
	enabled: boolean;
}

export interface PartnerItem {
	id: string;
	name: string;
	shortName: string;
	badgeLabel: LocalizedText;
	summary: LocalizedText;
	description: LocalizedText;
	logo: HomeAsset;
	coverageItems: LocalizedText[];
	tags: LocalizedText[];
	ctaLabel: LocalizedText;
	ctaHref: string;
	documents: PartnerDocument[];
	order: number;
	enabled: boolean;
}

export interface PartnerSection {
	enabled: boolean;
	eyebrow: LocalizedText;
	title: LocalizedText;
	description: LocalizedText;
	badgeLabel: LocalizedText;
	ctaLabel: LocalizedText;
	ctaHref: string;
	items: PartnerItem[];
}

export interface HomePayload {
	hero: {
		badge: {
			text: LocalizedText;
			enabled: boolean;
		};
		title: LocalizedText;
		subtitle: LocalizedText;
		primaryCta: HomeCta;
		secondaryCta: HomeCta;
	};

	highlightPanel: {
		coverageLabel: LocalizedText;
		enabled: boolean;
	};

	featuredCards: HomeFeaturedCard[];

	coverageSection: {
		eyebrow: LocalizedText;
		title: LocalizedText;
		description: LocalizedText;
		note: LocalizedText;
		openMapsLabel: LocalizedText;
		showOpenMapsLink: boolean;
		enabled: boolean;
	};

	aboutSection: {
		eyebrow: LocalizedText;
		title: LocalizedText;
		description: LocalizedText;
		highlights: LocalizedText[];
		enabled: boolean;
	};

	partnerSection: PartnerSection;

	/**
	 * Bloque institucional de liderazgo.
	 *
	 * Regla:
	 * - la imagen debe seguir el mismo patrón de asset estructurado del Home
	 * - no se permite un imageUrl suelto como contrato principal
	 */
	leadershipSection: {
		name: string;
		role: LocalizedText;
		message: LocalizedText;
		image: HomeAsset;
		enabled: boolean;
	};

	whyChooseUs: {
		title: LocalizedText;
		items: WhyChooseUsItem[];
		enabled: boolean;
	};

	mapSection: {
		enabled: boolean;
		useBrowserGeolocation: boolean;
		fallbackLat: number | null;
		fallbackLng: number | null;
		zoom: number;
	};

	updatedAt?: string;
	updatedBy?: string;
	updatedByEmail?: string;
}

export interface UploadResponseItem {
	url: string;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
	storageKey: string;
}

export interface UploadResponse {
	ok: boolean;
	item?: UploadResponseItem;
	error?: string;
}