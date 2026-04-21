"use client";

/**
 * =============================================================================
 * ✅ Page: Admin Home Configuration
 * Path: src/app/admin/dashboard/home/page.tsx
 * =============================================================================
 *
 * ES:
 *   Pantalla administrativa para configurar la portada pública de Sierra Tech.
 *   Trabaja sobre una estructura fija y administrable, sin editor libre.
 *
 *   Alcance:
 *   - Hero principal
 *   - Panel destacado lateral
 *   - Cards destacadas
 *   - Cobertura / capacidad operativa
 *   - Mapa
 *   - Sección Nosotros
 *   - Sección de Partners / Alianzas (múltiples)
 *   - Sección de Liderazgo
 *   - Sección "Por qué elegirnos"
 *   - Upload real de logos y documentos de partners hacia R2
 *   - Guardado / restauración
 *
 *   Decisiones:
 *   - La página mantiene el contrato actual del Home sin tocar la página pública.
 *   - partnerSection.items[] es la fuente de verdad del bloque de alianzas.
 *   - Cada partner puede tener logo y múltiples documentos.
 *   - Los uploads reales existentes se mantienen solo para partners y documentos.
 *   - Leadership se administra respetando el contrato actual (`image: PartnerAsset`).
 *   - El orden administrativo se alinea al flujo de la portada pública.
 *
 * EN:
 *   Administrative page used to configure Sierra Tech's public home page.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
	Home as HomeIcon,
	Trash2,
	ArrowUp,
	ArrowDown,
	Plus,
	FileText,
	Building2,
	Upload,
	ChevronDown,
	ChevronUp,
	Eye,
	X,
	Image as ImageIcon,
	UserRound,
	Info,
	MapPinned,
	ShieldCheck,
} from "lucide-react";
import Image from "next/image";

import { useTranslation } from "@/hooks/useTranslation";
import { AdminPageHeader } from "@/components/ui/AdminPageHeader";
import { useToast } from "@/components/ui/GlobalToastProvider";
import type { AllowedRole, HomeAsset, HomePayload, Locale } from "@/types/home";

import { HOME_DEFAULTS } from "@/lib/home/home.defaults";

import {
	createEmptyCard,
	createEmptyLocalizedItem,
	createEmptyPartnerDocument,
	createEmptyPartnerItem,
	normalizeCards,
	normalizeHomePayload,
	normalizePartnerDocuments,
	safeNumberFromInput,
	sortCards,
	sortPartnerDocuments,
	sortPartnerItems,
} from "@/lib/home/home.normalize";

import { uploadHomeAsset } from "@/lib/home/home.uploads";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function isAllowedRole(role: unknown): role is AllowedRole {
	return role === "admin" || role === "superadmin";
}

type HomeValidationIssue = {
	path: string;
	messageEs: string;
	messageEn: string;
};

function hasLocalizedText(value: { es: string; en: string }): boolean {
	return value.es.trim().length > 0 || value.en.trim().length > 0;
}

function isEmptyLocalizedText(value: { es: string; en: string }): boolean {
	return value.es.trim().length === 0 && value.en.trim().length === 0;
}

function createEmptyHomeAsset(): HomeAsset {
	return {
		url: "",
		fileName: "",
		mimeType: "",
		sizeBytes: 0,
		storageKey: "",
	};
}

function hasPartnerContent(
	partner: HomePayload["partnerSection"]["items"][number],
): boolean {
	return (
		hasLocalizedText(partner.summary) ||
		hasLocalizedText(partner.description) ||
		partner.coverageItems.some((item) => hasLocalizedText(item)) ||
		partner.tags.some((item) => hasLocalizedText(item))
	);
}

function getPartnerNameForMessage(
	partner: HomePayload["partnerSection"]["items"][number],
): string {
	return partner.name.trim() || partner.shortName.trim() || `#${partner.order}`;
}

function getDocumentNameForMessage(
	document: HomePayload["partnerSection"]["items"][number]["documents"][number],
): string {
	return (
		document.title.es.trim() ||
		document.title.en.trim() ||
		document.file.fileName.trim() ||
		`#${document.order}`
	);
}

function hasPartnerLogo(
	partner: HomePayload["partnerSection"]["items"][number],
): boolean {
	return partner.logo.url.trim().length > 0;
}

function hasPartnerDocumentFile(
	document: HomePayload["partnerSection"]["items"][number]["documents"][number],
): boolean {
	return document.file.url.trim().length > 0;
}

function shouldKeepDocument(
	document: HomePayload["partnerSection"]["items"][number]["documents"][number],
): boolean {
	return (
		!isEmptyLocalizedText(document.title) ||
		!isEmptyLocalizedText(document.description) ||
		!isEmptyLocalizedText(document.label) ||
		hasPartnerDocumentFile(document)
	);
}

function shouldKeepPartner(
	partner: HomePayload["partnerSection"]["items"][number],
): boolean {
	return (
		partner.name.trim().length > 0 ||
		partner.shortName.trim().length > 0 ||
		!isEmptyLocalizedText(partner.badgeLabel) ||
		!isEmptyLocalizedText(partner.summary) ||
		!isEmptyLocalizedText(partner.description) ||
		!isEmptyLocalizedText(partner.ctaLabel) ||
		partner.ctaHref.trim().length > 0 ||
		hasPartnerLogo(partner) ||
		partner.coverageItems.some((item) => !isEmptyLocalizedText(item)) ||
		partner.tags.some((item) => !isEmptyLocalizedText(item)) ||
		partner.documents.some((document) => shouldKeepDocument(document))
	);
}

function validateHomeForm(payload: HomePayload): HomeValidationIssue[] {
	const issues: HomeValidationIssue[] = [];

	if (payload.partnerSection.enabled) {
		const enabledPartners = payload.partnerSection.items.filter(
			(partner) => partner.enabled,
		);

		for (const partner of enabledPartners) {
			const partnerName = getPartnerNameForMessage(partner);

			if (!partner.name.trim()) {
				issues.push({
					path: `partner:${partner.id}:name`,
					messageEs: `El partner ${partnerName} debe tener nombre.`,
					messageEn: `Partner ${partnerName} must have a name.`,
				});
			}

			if (!hasPartnerContent(partner)) {
				issues.push({
					path: `partner:${partner.id}:content`,
					messageEs: `El partner ${partnerName} debe tener resumen, descripción, alcance o etiquetas.`,
					messageEn: `Partner ${partnerName} must have summary, description, scope or tags.`,
				});
			}

			for (const document of partner.documents.filter((item) => item.enabled)) {
				const documentName = getDocumentNameForMessage(document);

				if (!hasLocalizedText(document.title)) {
					issues.push({
						path: `partner:${partner.id}:document:${document.id}:title`,
						messageEs: `El documento ${documentName} del partner ${partnerName} debe tener título.`,
						messageEn: `Document ${documentName} in partner ${partnerName} must have a title.`,
					});
				}

				if (!document.file.url.trim()) {
					issues.push({
						path: `partner:${partner.id}:document:${document.id}:file`,
						messageEs: `El documento ${documentName} del partner ${partnerName} no tiene archivo cargado.`,
						messageEn: `Document ${documentName} in partner ${partnerName} has no uploaded file.`,
					});
				}
			}
		}
	}

	return issues;
}

function sanitizeHomeBeforeSave(payload: HomePayload): HomePayload {
	const cleanedPartners = sortPartnerItems(
		payload.partnerSection.items
			.map((partner) => {
				const cleanedCoverageItems = partner.coverageItems.filter(
					(item) => !isEmptyLocalizedText(item),
				);

				const cleanedTags = partner.tags.filter(
					(item) => !isEmptyLocalizedText(item),
				);

				const cleanedDocuments = normalizePartnerDocuments(
					partner.documents.filter((document) => shouldKeepDocument(document)),
				);

				return {
					...partner,
					coverageItems: cleanedCoverageItems,
					tags: cleanedTags,
					documents: cleanedDocuments,
				};
			})
			.filter((partner) => shouldKeepPartner(partner)),
	).map((partner, index) => ({
		...partner,
		order: index + 1,
	}));

	const cleanedAboutHighlights = payload.aboutSection.highlights.filter(
		(item) => !isEmptyLocalizedText(item),
	);

	const cleanedWhyChooseUsItems = payload.whyChooseUs.items.filter(
		(item) =>
			!isEmptyLocalizedText(item.title) || !isEmptyLocalizedText(item.description),
	);

	return {
		...payload,
		aboutSection: {
			...payload.aboutSection,
			highlights: cleanedAboutHighlights,
		},
		partnerSection: {
			...payload.partnerSection,
			items: cleanedPartners,
		},
		whyChooseUs: {
			...payload.whyChooseUs,
			items: cleanedWhyChooseUsItems,
		},
	};
}

/* -------------------------------------------------------------------------- */
/* Small UI helpers                                                           */
/* -------------------------------------------------------------------------- */

function SectionCard(props: {
	title: string;
	subtitle?: string;
	icon?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
			<div className="mb-5 flex items-start gap-3">
				{props.icon ? (
					<div className="rounded-xl border border-border bg-background p-2 text-brand-primaryStrong">
						{props.icon}
					</div>
				) : null}

				<div>
					<h2 className="text-lg font-semibold text-text-primary">
						{props.title}
					</h2>
					{props.subtitle ? (
						<p className="mt-1 text-sm text-text-secondary">{props.subtitle}</p>
					) : null}
				</div>
			</div>

			<div className="space-y-5">{props.children}</div>
		</section>
	);
}

function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<h3 className="text-sm font-semibold text-text-primary">{children}</h3>
	);
}

function FieldLabel({ children }: { children: ReactNode }) {
	return (
		<label className="mb-1.5 block text-sm font-medium text-text-primary">
			{children}
		</label>
	);
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
	const { className, ...rest } = props;

	return (
		<input
			{...rest}
			className={`w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${className ?? ""}`}
		/>
	);
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	const { className, ...rest } = props;

	return (
		<textarea
			{...rest}
			className={`min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong ${className ?? ""}`}
		/>
	);
}

function Toggle(props: {
	label: string;
	checked: boolean;
	onChange: (value: boolean) => void;
}) {
	return (
		<label className="flex w-full cursor-pointer items-center gap-3 text-sm text-text-primary">
			<input
				type="checkbox"
				checked={props.checked}
				onChange={(e) => props.onChange(e.target.checked)}
				className="h-4 w-4 rounded border-border"
			/>
			<span>{props.label}</span>
		</label>
	);
}

function ActionButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const { className, ...rest } = props;

	return (
		<button
			{...rest}
			className={`inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
		/>
	);
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const { className, ...rest } = props;

	return (
		<button
			{...rest}
			className={`inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
		/>
	);
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function HomeAdminPage() {
	const { locale } = useTranslation();
	const lang: Locale = locale === "es" ? "es" : "en";
	const { data: session, status } = useSession();
	const toast = useToast();

	const logoFileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
	const documentFileInputsRef = useRef<Record<string, HTMLInputElement | null>>(
		{},
	);
	const leadershipImageInputRef = useRef<HTMLInputElement | null>(null);
	const hasLoadedInitialDataRef = useRef(false);
	const latestLangRef = useRef<Locale>(lang);
	const toastRef = useRef(toast);

	useEffect(() => {
		latestLangRef.current = lang;
		toastRef.current = toast;
	}, [lang, toast]);

	const [form, setForm] = useState<HomePayload>(() =>
		structuredClone(HOME_DEFAULTS),
	);
	const [initialData, setInitialData] = useState<HomePayload>(() =>
		structuredClone(HOME_DEFAULTS),
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploadingLogoPartnerId, setUploadingLogoPartnerId] = useState<
		string | null
	>(null);
	const [uploadingDocumentKey, setUploadingDocumentKey] = useState<
		string | null
	>(null);
	const [uploadingLeadershipImage, setUploadingLeadershipImage] =
		useState(false);
	const [expandedPartners, setExpandedPartners] = useState<
		Record<string, boolean>
	>({});
	const [expandedDocuments, setExpandedDocuments] = useState<
		Record<string, boolean>
	>({});

	const role = session?.user?.role;
	const hasAccess = isAllowedRole(role);

	const hasUnsavedChanges = useMemo(() => {
		return JSON.stringify(form) !== JSON.stringify(initialData);
	}, [form, initialData]);

	useEffect(() => {
		async function loadHome() {
			try {
				const response = await fetch("/api/admin/home", {
					method: "GET",
					cache: "no-store",
				});

				if (!response.ok) {
					throw new Error(`HTTP_${response.status}`);
				}

				const payload: Partial<HomePayload> | null = await response
					.json()
					.catch(() => null);
				const normalized = normalizeHomePayload(payload);

				setForm(structuredClone(normalized));
				setInitialData(structuredClone(normalized));
				hasLoadedInitialDataRef.current = true;
			} catch (error) {
				console.error("[HomeAdminPage] Error loading home config:", error);

				toastRef.current.error(
					latestLangRef.current === "es"
						? "No se pudo cargar la configuración de Home."
						: "Could not load Home configuration.",
				);
			} finally {
				setLoading(false);
			}
		}

		if (status !== "authenticated" || !hasAccess) {
			setLoading(false);
			return;
		}

		if (hasLoadedInitialDataRef.current) {
			return;
		}

		void loadHome();
	}, [status, hasAccess]);

	async function handleSave(): Promise<void> {
		const sanitizedForm = sanitizeHomeBeforeSave(form);
		const issues = validateHomeForm(sanitizedForm);

		if (issues.length > 0) {
			const firstIssue = issues[0];
			toast.error(lang === "es" ? firstIssue.messageEs : firstIssue.messageEn);
			return;
		}

		try {
			setSaving(true);

			const response = await fetch("/api/admin/home", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(sanitizedForm),
			});

			if (!response.ok) {
				throw new Error(`HTTP_${response.status}`);
			}

			const payload: Partial<HomePayload> | null = await response
				.json()
				.catch(() => form);

			const normalized = normalizeHomePayload(payload ?? sanitizedForm);

			setForm(structuredClone(normalized));
			setInitialData(structuredClone(normalized));

			toast.success(
				lang === "es"
					? "Home guardado correctamente."
					: "Home saved successfully.",
			);
		} catch (error) {
			console.error("[HomeAdminPage] Error saving home config:", error);

			toast.error(
				lang === "es" ? "Error al guardar Home." : "Error saving Home.",
			);
		} finally {
			setSaving(false);
		}
	}

	function handleReset(): void {
		setForm(structuredClone(initialData));
	}

	/* ---------------------------------------------------------------------- */
	/* Uploads                                                                */
	/* ---------------------------------------------------------------------- */

	async function handlePartnerLogoSelected(
		partnerId: string,
		file: File | null,
	): Promise<void> {
		if (!file) return;

		try {
			setUploadingLogoPartnerId(partnerId);

			const uploaded = await uploadHomeAsset({
				file,
				kind: "partner-logo",
				partnerId,
			});

			setForm((prev) => ({
				...prev,
				partnerSection: {
					...prev.partnerSection,
					items: prev.partnerSection.items.map((item) =>
						item.id === partnerId
							? {
								...item,
								logo: {
									url: uploaded.url,
									fileName: uploaded.fileName,
									mimeType: uploaded.mimeType,
									sizeBytes: uploaded.sizeBytes,
									storageKey: uploaded.storageKey,
								},
							}
							: item,
					),
				},
			}));

			toast.success(
				lang === "es"
					? "Logo cargado correctamente."
					: "Logo uploaded successfully.",
			);
		} catch (error) {
			console.error("[HomeAdminPage] Partner logo upload error:", error);
			toast.error(
				lang === "es"
					? "No se pudo cargar el logo."
					: "Could not upload the logo.",
			);
		} finally {
			setUploadingLogoPartnerId(null);

			const input = logoFileInputsRef.current[partnerId];
			if (input) {
				input.value = "";
			}
		}
	}

	async function handlePartnerDocumentSelected(
		partnerId: string,
		documentId: string,
		file: File | null,
	): Promise<void> {
		if (!file) return;

		const key = `${partnerId}:${documentId}`;

		try {
			setUploadingDocumentKey(key);

			const uploaded = await uploadHomeAsset({
				file,
				kind: "partner-document",
				partnerId,
			});

			setForm((prev) => ({
				...prev,
				partnerSection: {
					...prev.partnerSection,
					items: prev.partnerSection.items.map((item) =>
						item.id === partnerId
							? {
								...item,
								documents: item.documents.map((document) =>
									document.id === documentId
										? {
											...document,
											file: {
												url: uploaded.url,
												fileName: uploaded.fileName,
												mimeType: uploaded.mimeType,
												sizeBytes: uploaded.sizeBytes,
												storageKey: uploaded.storageKey,
											},
										}
										: document,
								),
							}
							: item,
					),
				},
			}));

			toast.success(
				lang === "es"
					? "Documento cargado correctamente."
					: "Document uploaded successfully.",
			);
		} catch (error) {
			console.error("[HomeAdminPage] Partner document upload error:", error);
			toast.error(
				lang === "es"
					? "No se pudo cargar el documento."
					: "Could not upload the document.",
			);
		} finally {
			setUploadingDocumentKey(null);

			const input = documentFileInputsRef.current[key];
			if (input) {
				input.value = "";
			}
		}
	}

	async function handleLeadershipImageSelected(
		file: File | null,
	): Promise<void> {
		if (!file) return;

		try {
			setUploadingLeadershipImage(true);

			const uploaded = await uploadHomeAsset({
				file,
				kind: "leadership-image",
			});

			setForm((prev) => ({
				...prev,
				leadershipSection: {
					...prev.leadershipSection,
					image: {
						url: uploaded.url,
						fileName: uploaded.fileName,
						mimeType: uploaded.mimeType,
						sizeBytes: uploaded.sizeBytes,
						storageKey: uploaded.storageKey,
					},
				},
			}));

			toast.success(
				lang === "es"
					? "Imagen de liderazgo cargada correctamente."
					: "Leadership image uploaded successfully.",
			);
		} catch (error) {
			console.error("[HomeAdminPage] Leadership image upload error:", error);

			toast.error(
				lang === "es"
					? "No se pudo cargar la imagen de liderazgo."
					: "Could not upload the leadership image.",
			);
		} finally {
			setUploadingLeadershipImage(false);

			if (leadershipImageInputRef.current) {
				leadershipImageInputRef.current.value = "";
			}
		}
	}

	/* ---------------------------------------------------------------------- */
	/* Hero                                                                   */
	/* ---------------------------------------------------------------------- */

	function updateHeroLocalized(
		field: "title" | "subtitle",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			hero: {
				...prev.hero,
				[field]: {
					...prev.hero[field],
					[localeKey]: value,
				},
			},
		}));
	}

	function updateHeroBadge(localeKey: Locale, value: string): void {
		setForm((prev) => ({
			...prev,
			hero: {
				...prev.hero,
				badge: {
					...prev.hero.badge,
					text: {
						...prev.hero.badge.text,
						[localeKey]: value,
					},
				},
			},
		}));
	}

	function updateHeroCta(
		ctaKey: "primaryCta" | "secondaryCta",
		field: "href" | "enabled",
		value: string | boolean,
	): void {
		setForm((prev) => ({
			...prev,
			hero: {
				...prev.hero,
				[ctaKey]: {
					...prev.hero[ctaKey],
					[field]: value,
				},
			},
		}));
	}

	function updateHeroCtaLabel(
		ctaKey: "primaryCta" | "secondaryCta",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			hero: {
				...prev.hero,
				[ctaKey]: {
					...prev.hero[ctaKey],
					label: {
						...prev.hero[ctaKey].label,
						[localeKey]: value,
					},
				},
			},
		}));
	}

	function updateHighlightCoverageLabel(
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			highlightPanel: {
				...prev.highlightPanel,
				coverageLabel: {
					...prev.highlightPanel.coverageLabel,
					[localeKey]: value,
				},
			},
		}));
	}

	function addCard(): void {
		setForm((prev) => ({
			...prev,
			featuredCards: [
				...prev.featuredCards,
				createEmptyCard(prev.featuredCards.length + 1),
			],
		}));
	}

	function updateCardLocalized(
		cardId: string,
		field: "title" | "description",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			featuredCards: prev.featuredCards.map((card) =>
				card.id === cardId
					? {
						...card,
						[field]: {
							...card[field],
							[localeKey]: value,
						},
					}
					: card,
			),
		}));
	}

	function updateCardEnabled(cardId: string, value: boolean): void {
		setForm((prev) => ({
			...prev,
			featuredCards: prev.featuredCards.map((card) =>
				card.id === cardId ? { ...card, enabled: value } : card,
			),
		}));
	}

	function removeCard(cardId: string): void {
		setForm((prev) => ({
			...prev,
			featuredCards: normalizeCards(
				prev.featuredCards.filter((card) => card.id !== cardId),
			),
		}));
	}

	function moveCard(cardId: string, direction: "up" | "down"): void {
		const sorted = sortCards(form.featuredCards);
		const index = sorted.findIndex((card) => card.id === cardId);

		if (index === -1) return;
		if (direction === "up" && index === 0) return;
		if (direction === "down" && index === sorted.length - 1) return;

		const swapIndex = direction === "up" ? index - 1 : index + 1;
		const copy = [...sorted];

		[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];

		setForm((prev) => ({
			...prev,
			featuredCards: normalizeCards(copy),
		}));
	}

	/* ---------------------------------------------------------------------- */
	/* Coverage + Map                                                         */
	/* ---------------------------------------------------------------------- */

	function updateCoverageLocalized(
		field: "eyebrow" | "title" | "description" | "note" | "openMapsLabel",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			coverageSection: {
				...prev.coverageSection,
				[field]: {
					...prev.coverageSection[field],
					[localeKey]: value,
				},
			},
		}));
	}

	function updateMapField(
		field:
			| "enabled"
			| "useBrowserGeolocation"
			| "fallbackLat"
			| "fallbackLng"
			| "zoom",
		value: boolean | number | null,
	): void {
		setForm((prev) => {
			const nextMapSection = {
				...prev.mapSection,
				[field]: value,
			};

			const shouldHideOpenMapsLink =
				field === "enabled" && value === false;

			return {
				...prev,
				mapSection: nextMapSection,
				coverageSection: shouldHideOpenMapsLink
					? {
						...prev.coverageSection,
						showOpenMapsLink: false,
					}
					: prev.coverageSection,
			};
		});
	}

	/* ---------------------------------------------------------------------- */
	/* About                                                                  */
	/* ---------------------------------------------------------------------- */

	function updateAboutLocalized(
		field: "eyebrow" | "title" | "description",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			aboutSection: {
				...prev.aboutSection,
				[field]: {
					...prev.aboutSection[field],
					[localeKey]: value,
				},
			},
		}));
	}

	function addAboutHighlight(): void {
		setForm((prev) => ({
			...prev,
			aboutSection: {
				...prev.aboutSection,
				highlights: [...prev.aboutSection.highlights, createEmptyLocalizedItem()],
			},
		}));
	}

	function updateAboutHighlight(
		index: number,
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			aboutSection: {
				...prev.aboutSection,
				highlights: prev.aboutSection.highlights.map((item, itemIndex) =>
					itemIndex === index
						? {
							...item,
							[localeKey]: value,
						}
						: item,
				),
			},
		}));
	}

	function removeAboutHighlight(index: number): void {
		setForm((prev) => ({
			...prev,
			aboutSection: {
				...prev.aboutSection,
				highlights: prev.aboutSection.highlights.filter(
					(_, itemIndex) => itemIndex !== index,
				),
			},
		}));
	}

	/* ---------------------------------------------------------------------- */
	/* Partners                                                               */
	/* ---------------------------------------------------------------------- */

	function updatePartnerSectionLocalized(
		field: "eyebrow" | "title" | "description" | "badgeLabel" | "ctaLabel",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				[field]: {
					...prev.partnerSection[field],
					[localeKey]: value,
				},
			},
		}));
	}

	function updatePartnerSectionField(
		field: "enabled" | "ctaHref",
		value: boolean | string,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				[field]: value,
			},
		}));
	}

	function addPartner(): void {
		const nextPartner = createEmptyPartnerItem(partnerItems.length + 1);

		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: [...prev.partnerSection.items, nextPartner],
			},
		}));

		setExpandedPartners((prev) => ({
			...prev,
			[nextPartner.id]: true,
		}));
	}

	function removePartner(partnerId: string): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: sortPartnerItems(
					prev.partnerSection.items.filter((item) => item.id !== partnerId),
				).map((item, index) => ({
					...item,
					order: index + 1,
				})),
			},
		}));
	}

	function movePartner(partnerId: string, direction: "up" | "down"): void {
		const items = sortPartnerItems(form.partnerSection.items);
		const index = items.findIndex((item) => item.id === partnerId);

		if (index === -1) return;
		if (direction === "up" && index === 0) return;
		if (direction === "down" && index === items.length - 1) return;

		const swapIndex = direction === "up" ? index - 1 : index + 1;
		const copy = [...items];

		[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];

		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: copy.map((item, itemIndex) => ({
					...item,
					order: itemIndex + 1,
				})),
			},
		}));
	}

	function updatePartnerField(
		partnerId: string,
		field: "name" | "shortName" | "ctaHref" | "enabled",
		value: string | boolean,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId ? { ...item, [field]: value } : item,
				),
			},
		}));
	}

	function updatePartnerLocalized(
		partnerId: string,
		field: "badgeLabel" | "summary" | "description" | "ctaLabel",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							[field]: {
								...item[field],
								[localeKey]: value,
							},
						}
						: item,
				),
			},
		}));
	}

	function addPartnerCoverageItem(partnerId: string): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							coverageItems: [
								...item.coverageItems,
								createEmptyLocalizedItem(),
							],
						}
						: item,
				),
			},
		}));
	}

	function updatePartnerCoverageItem(
		partnerId: string,
		index: number,
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							coverageItems: item.coverageItems.map(
								(coverageItem, itemIndex) =>
									itemIndex === index
										? {
											...coverageItem,
											[localeKey]: value,
										}
										: coverageItem,
							),
						}
						: item,
				),
			},
		}));
	}

	function removePartnerCoverageItem(partnerId: string, index: number): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							coverageItems: item.coverageItems.filter(
								(_, itemIndex) => itemIndex !== index,
							),
						}
						: item,
				),
			},
		}));
	}

	function addPartnerTag(partnerId: string): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							tags: [...item.tags, createEmptyLocalizedItem()],
						}
						: item,
				),
			},
		}));
	}

	function updatePartnerTag(
		partnerId: string,
		index: number,
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							tags: item.tags.map((tag, itemIndex) =>
								itemIndex === index
									? {
										...tag,
										[localeKey]: value,
									}
									: tag,
							),
						}
						: item,
				),
			},
		}));
	}

	function removePartnerTag(partnerId: string, index: number): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							tags: item.tags.filter((_, itemIndex) => itemIndex !== index),
						}
						: item,
				),
			},
		}));
	}

	function addPartnerDocument(partnerId: string): void {
		const partner = partnerItems.find((item) => item.id === partnerId);
		const nextDocument = createEmptyPartnerDocument(
			(partner?.documents.length ?? 0) + 1,
		);

		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							documents: [...item.documents, nextDocument],
						}
						: item,
				),
			},
		}));

		setExpandedDocuments((prev) => ({
			...prev,
			[`${partnerId}:${nextDocument.id}`]: true,
		}));
	}

	function removePartnerDocument(partnerId: string, documentId: string): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							documents: normalizePartnerDocuments(
								item.documents.filter(
									(document) => document.id !== documentId,
								),
							),
						}
						: item,
				),
			},
		}));
	}

	function movePartnerDocument(
		partnerId: string,
		documentId: string,
		direction: "up" | "down",
	): void {
		const partner = form.partnerSection.items.find(
			(item) => item.id === partnerId,
		);
		if (!partner) return;

		const documents = sortPartnerDocuments(partner.documents);
		const index = documents.findIndex((document) => document.id === documentId);

		if (index === -1) return;
		if (direction === "up" && index === 0) return;
		if (direction === "down" && index === documents.length - 1) return;

		const swapIndex = direction === "up" ? index - 1 : index + 1;
		const copy = [...documents];

		[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];

		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							documents: normalizePartnerDocuments(copy),
						}
						: item,
				),
			},
		}));
	}

	function updatePartnerDocumentLocalized(
		partnerId: string,
		documentId: string,
		field: "title" | "description" | "label",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							documents: item.documents.map((document) =>
								document.id === documentId
									? {
										...document,
										[field]: {
											...document[field],
											[localeKey]: value,
										},
									}
									: document,
							),
						}
						: item,
				),
			},
		}));
	}

	function updatePartnerDocumentField(
		partnerId: string,
		documentId: string,
		field: "enabled",
		value: boolean,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							documents: item.documents.map((document) =>
								document.id === documentId
									? { ...document, [field]: value }
									: document,
							),
						}
						: item,
				),
			},
		}));
	}

	function getPartnerDisplayName(
		partner: HomePayload["partnerSection"]["items"][number],
	): string {
		return partner.name.trim() || partner.shortName.trim() || "Nuevo partner";
	}

	function getDocumentDisplayName(
		document: HomePayload["partnerSection"]["items"][number]["documents"][number],
		locale: Locale,
	): string {
		return (
			(locale === "es" ? document.title.es : document.title.en).trim() ||
			document.title.es.trim() ||
			document.title.en.trim() ||
			document.file.fileName.trim() ||
			`Documento #${document.order}`
		);
	}

	function togglePartnerExpanded(partnerId: string): void {
		setExpandedPartners((prev) => ({
			...prev,
			[partnerId]: !prev[partnerId],
		}));
	}

	function toggleDocumentExpanded(documentKey: string): void {
		setExpandedDocuments((prev) => ({
			...prev,
			[documentKey]: !prev[documentKey],
		}));
	}

	function removePartnerLogo(partnerId: string): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							logo: {
								url: "",
								fileName: "",
								mimeType: "",
								sizeBytes: 0,
								storageKey: "",
							},
						}
						: item,
				),
			},
		}));
	}

	function removePartnerDocumentFile(
		partnerId: string,
		documentId: string,
	): void {
		setForm((prev) => ({
			...prev,
			partnerSection: {
				...prev.partnerSection,
				items: prev.partnerSection.items.map((item) =>
					item.id === partnerId
						? {
							...item,
							documents: item.documents.map((document) =>
								document.id === documentId
									? {
										...document,
										file: {
											url: "",
											fileName: "",
											mimeType: "",
											sizeBytes: 0,
											storageKey: "",
										},
									}
									: document,
							),
						}
						: item,
				),
			},
		}));
	}

	/* ---------------------------------------------------------------------- */
	/* Leadership                                                             */
	/* ---------------------------------------------------------------------- */

	function updateLeadershipLocalized(
		field: "role" | "message",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			leadershipSection: {
				...prev.leadershipSection,
				[field]: {
					...prev.leadershipSection[field],
					[localeKey]: value,
				},
			},
		}));
	}

	function removeLeadershipImage(): void {
		setForm((prev) => ({
			...prev,
			leadershipSection: {
				...prev.leadershipSection,
				image: createEmptyHomeAsset(),
			},
		}));
	}

	/* ---------------------------------------------------------------------- */
	/* Why choose us                                                          */
	/* ---------------------------------------------------------------------- */

	function updateWhyChooseUsTitle(localeKey: Locale, value: string): void {
		setForm((prev) => ({
			...prev,
			whyChooseUs: {
				...prev.whyChooseUs,
				title: {
					...prev.whyChooseUs.title,
					[localeKey]: value,
				},
			},
		}));
	}

	function addWhyChooseUsItem(): void {
		setForm((prev) => ({
			...prev,
			whyChooseUs: {
				...prev.whyChooseUs,
				items: [
					...prev.whyChooseUs.items,
					{
						title: { es: "", en: "" },
						description: { es: "", en: "" },
					},
				],
			},
		}));
	}

	function updateWhyChooseUsItem(
		index: number,
		field: "title" | "description",
		localeKey: Locale,
		value: string,
	): void {
		setForm((prev) => ({
			...prev,
			whyChooseUs: {
				...prev.whyChooseUs,
				items: prev.whyChooseUs.items.map((item, itemIndex) =>
					itemIndex === index
						? {
							...item,
							[field]: {
								...item[field],
								[localeKey]: value,
							},
						}
						: item,
				),
			},
		}));
	}

	function removeWhyChooseUsItem(index: number): void {
		setForm((prev) => ({
			...prev,
			whyChooseUs: {
				...prev.whyChooseUs,
				items: prev.whyChooseUs.items.filter(
					(_, itemIndex) => itemIndex !== index,
				),
			},
		}));
	}

	function moveWhyChooseUsItem(index: number, direction: "up" | "down"): void {
		const items = [...form.whyChooseUs.items];

		if (direction === "up" && index === 0) return;
		if (direction === "down" && index === items.length - 1) return;

		const swapIndex = direction === "up" ? index - 1 : index + 1;
		[items[index], items[swapIndex]] = [items[swapIndex], items[index]];

		setForm((prev) => ({
			...prev,
			whyChooseUs: {
				...prev.whyChooseUs,
				items,
			},
		}));
	}

	if (status === "loading") {
		return (
			<main className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
					{lang === "es" ? "Cargando sesión..." : "Loading session..."}
				</div>
			</main>
		);
	}

	if (!hasAccess) {
		return (
			<main className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="max-w-xl rounded-2xl border border-border bg-surface px-6 py-5 text-center text-status-error shadow-sm">
					{lang === "es"
						? "Acceso restringido a administradores."
						: "Admin access only."}
				</div>
			</main>
		);
	}

	if (loading) {
		return (
			<main className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="rounded-2xl border border-border bg-surface px-6 py-5 text-sm text-text-secondary shadow-sm">
					{lang === "es"
						? "Cargando configuración..."
						: "Loading configuration..."}
				</div>
			</main>
		);
	}

	const partnerItems = Array.isArray(form.partnerSection.items)
		? form.partnerSection.items
		: [];

	return (
		<main className="space-y-6">
			<AdminPageHeader
				icon={<HomeIcon className="h-6 w-6 text-brand-primaryStrong" />}
				title={lang === "es" ? "Página de Inicio" : "Home"}
				subtitle={
					lang === "es"
						? "Administra el contenido visible de la portada pública."
						: "Manage the visible content of the public landing page."
				}
			/>

			<div className="flex flex-wrap items-center gap-3">
				<PrimaryButton
					disabled={!hasUnsavedChanges || saving}
					onClick={handleSave}
				>
					{saving
						? lang === "es"
							? "Guardando..."
							: "Saving..."
						: lang === "es"
							? "Guardar cambios"
							: "Save changes"}
				</PrimaryButton>

				<ActionButton
					disabled={!hasUnsavedChanges || saving}
					onClick={handleReset}
				>
					{lang === "es" ? "Restaurar" : "Reset"}
				</ActionButton>

				<span className="text-sm text-text-secondary">
					{hasUnsavedChanges
						? lang === "es"
							? "Hay cambios sin guardar."
							: "There are unsaved changes."
						: lang === "es"
							? "Sin cambios pendientes."
							: "No pending changes."}
				</span>
			</div>

			<SectionCard
				icon={<HomeIcon className="h-5 w-5" />}
				title={lang === "es" ? "Hero principal" : "Main hero"}
				subtitle={
					lang === "es"
						? "Controla el mensaje principal y los CTAs de la portada."
						: "Controls the main message and CTAs of the landing page."
				}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Badge ES</FieldLabel>
						<TextInput
							value={form.hero.badge.text.es}
							onChange={(e) => updateHeroBadge("es", e.target.value)}
						/>
					</div>

					<div>
						<FieldLabel>Badge EN</FieldLabel>
						<TextInput
							value={form.hero.badge.text.en}
							onChange={(e) => updateHeroBadge("en", e.target.value)}
						/>
					</div>
				</div>

				<Toggle
					label={lang === "es" ? "Mostrar badge" : "Show badge"}
					checked={form.hero.badge.enabled}
					onChange={(value) =>
						setForm((prev) => ({
							...prev,
							hero: {
								...prev.hero,
								badge: {
									...prev.hero.badge,
									enabled: value,
								},
							},
						}))
					}
				/>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>
							{lang === "es" ? "Título principal ES" : "Main title ES"}
						</FieldLabel>
						<TextArea
							value={form.hero.title.es}
							onChange={(e) =>
								updateHeroLocalized("title", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>
							{lang === "es" ? "Título principal EN" : "Main title EN"}
						</FieldLabel>
						<TextArea
							value={form.hero.title.en}
							onChange={(e) =>
								updateHeroLocalized("title", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>{lang === "es" ? "Subtítulo ES" : "Subtitle ES"}</FieldLabel>
						<TextArea
							value={form.hero.subtitle.es}
							onChange={(e) =>
								updateHeroLocalized("subtitle", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Subtítulo EN" : "Subtitle EN"}</FieldLabel>
						<TextArea
							value={form.hero.subtitle.en}
							onChange={(e) =>
								updateHeroLocalized("subtitle", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-background p-4">
					<SectionTitle>
						{lang === "es" ? "CTA secundario" : "Secondary CTA"}
					</SectionTitle>

					<div className="mt-4 grid gap-5 md:grid-cols-2">
						<div>
							<FieldLabel>Label ES</FieldLabel>
							<TextInput
								value={form.hero.secondaryCta.label.es}
								onChange={(e) =>
									updateHeroCtaLabel("secondaryCta", "es", e.target.value)
								}
							/>
						</div>

						<div>
							<FieldLabel>Label EN</FieldLabel>
							<TextInput
								value={form.hero.secondaryCta.label.en}
								onChange={(e) =>
									updateHeroCtaLabel("secondaryCta", "en", e.target.value)
								}
							/>
						</div>
					</div>

					<div className="mt-4">
						<FieldLabel>Href</FieldLabel>
						<TextInput
							value={form.hero.secondaryCta.href}
							onChange={(e) =>
								updateHeroCta("secondaryCta", "href", e.target.value)
							}
						/>
					</div>

					<div className="mt-4">
						<Toggle
							label={
								lang === "es"
									? "CTA secundario activo"
									: "Secondary CTA enabled"
							}
							checked={form.hero.secondaryCta.enabled}
							onChange={(value) =>
								updateHeroCta("secondaryCta", "enabled", value)
							}
						/>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				icon={<Info className="h-5 w-5" />}
				title={lang === "es" ? "Panel destacado lateral" : "Highlight side panel"}
				subtitle={
					lang === "es"
						? "Controla la etiqueta visual del panel complementario."
						: "Controls the visual label of the complementary panel."
				}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Coverage Label ES</FieldLabel>
						<TextInput
							value={form.highlightPanel.coverageLabel.es}
							onChange={(e) =>
								updateHighlightCoverageLabel("es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Coverage Label EN</FieldLabel>
						<TextInput
							value={form.highlightPanel.coverageLabel.en}
							onChange={(e) =>
								updateHighlightCoverageLabel("en", e.target.value)
							}
						/>
					</div>
				</div>

				<Toggle
					label={lang === "es" ? "Mostrar panel destacado" : "Show highlight panel"}
					checked={form.highlightPanel.enabled}
					onChange={(value) =>
						setForm((prev) => ({
							...prev,
							highlightPanel: {
								...prev.highlightPanel,
								enabled: value,
							},
						}))
					}
				/>
			</SectionCard>

			<SectionCard
				icon={<FileText className="h-5 w-5" />}
				title={lang === "es" ? "Cards destacadas" : "Featured cards"}
				subtitle={
					lang === "es"
						? "Administra las tarjetas informativas de la portada."
						: "Manage the informational cards displayed on the landing page."
				}
			>
				<div className="flex items-center justify-between gap-3">
					<p className="text-sm text-text-secondary">
						{lang === "es"
							? "Puedes crear, editar, eliminar y reordenar cards."
							: "You can create, edit, remove and reorder cards."}
					</p>

					<ActionButton onClick={addCard}>
						<Plus className="mr-2 h-4 w-4" />
						{lang === "es" ? "Agregar card" : "Add card"}
					</ActionButton>
				</div>

				{form.featuredCards.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-text-secondary">
						{lang === "es"
							? "No hay cards creadas todavía."
							: "No cards have been created yet."}
					</div>
				) : (
					<div className="space-y-4">
						{sortCards(form.featuredCards).map((card, index, list) => (
							<div
								key={card.id}
								className="rounded-2xl border border-border bg-background p-4"
							>
								<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
									<div>
										<p className="text-sm font-semibold text-text-primary">
											{lang === "es" ? "Card" : "Card"} #{card.order}
										</p>
										<p className="text-xs text-text-secondary">
											{card.enabled
												? lang === "es"
													? "Activa"
													: "Enabled"
												: lang === "es"
													? "Inactiva"
													: "Disabled"}
										</p>
									</div>

									<div className="flex flex-wrap items-center gap-2">
										<ActionButton
											onClick={() => moveCard(card.id, "up")}
											disabled={index === 0}
										>
											<ArrowUp className="h-4 w-4" />
										</ActionButton>

										<ActionButton
											onClick={() => moveCard(card.id, "down")}
											disabled={index === list.length - 1}
										>
											<ArrowDown className="h-4 w-4" />
										</ActionButton>

										<ActionButton
											onClick={() => removeCard(card.id)}
											className="text-status-error hover:text-status-error"
										>
											<Trash2 className="h-4 w-4" />
										</ActionButton>
									</div>
								</div>

								<div className="grid gap-5 md:grid-cols-2">
									<div>
										<FieldLabel>{lang === "es" ? "Título ES" : "Title ES"}</FieldLabel>
										<TextInput
											value={card.title.es}
											onChange={(e) =>
												updateCardLocalized(card.id, "title", "es", e.target.value)
											}
										/>
									</div>

									<div>
										<FieldLabel>{lang === "es" ? "Título EN" : "Title EN"}</FieldLabel>
										<TextInput
											value={card.title.en}
											onChange={(e) =>
												updateCardLocalized(card.id, "title", "en", e.target.value)
											}
										/>
									</div>
								</div>

								<div className="mt-4 grid gap-5 md:grid-cols-2">
									<div>
										<FieldLabel>
											{lang === "es" ? "Descripción ES" : "Description ES"}
										</FieldLabel>
										<TextArea
											value={card.description.es}
											onChange={(e) =>
												updateCardLocalized(
													card.id,
													"description",
													"es",
													e.target.value,
												)
											}
										/>
									</div>

									<div>
										<FieldLabel>
											{lang === "es" ? "Descripción EN" : "Description EN"}
										</FieldLabel>
										<TextArea
											value={card.description.en}
											onChange={(e) =>
												updateCardLocalized(
													card.id,
													"description",
													"en",
													e.target.value,
												)
											}
										/>
									</div>
								</div>

								<div className="mt-4">
									<Toggle
										label={lang === "es" ? "Card activa" : "Card enabled"}
										checked={card.enabled}
										onChange={(value) => updateCardEnabled(card.id, value)}
									/>
								</div>
							</div>
						))}
					</div>
				)}
			</SectionCard>

			<SectionCard
				icon={<MapPinned className="h-5 w-5" />}
				title={
					lang === "es"
						? "Cobertura / capacidad operativa"
						: "Coverage / operational capability"
				}
				subtitle={
					lang === "es"
						? "Controla el bloque informativo institucional junto al mapa."
						: "Controls the institutional content block displayed next to the map."
				}
			>
				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Eyebrow ES</FieldLabel>
						<TextInput
							value={form.coverageSection.eyebrow.es}
							onChange={(e) =>
								updateCoverageLocalized("eyebrow", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Eyebrow EN</FieldLabel>
						<TextInput
							value={form.coverageSection.eyebrow.en}
							onChange={(e) =>
								updateCoverageLocalized("eyebrow", "en", e.target.value)
							}
						/>
					</div>
					<div>
						<FieldLabel>{lang === "es" ? "Título ES" : "Title ES"}</FieldLabel>
						<TextInput
							value={form.coverageSection.title.es}
							onChange={(e) =>
								updateCoverageLocalized("title", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Título EN" : "Title EN"}</FieldLabel>
						<TextInput
							value={form.coverageSection.title.en}
							onChange={(e) =>
								updateCoverageLocalized("title", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>{lang === "es" ? "Descripción ES" : "Description ES"}</FieldLabel>
						<TextArea
							value={form.coverageSection.description.es}
							onChange={(e) =>
								updateCoverageLocalized("description", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Descripción EN" : "Description EN"}</FieldLabel>
						<TextArea
							value={form.coverageSection.description.en}
							onChange={(e) =>
								updateCoverageLocalized("description", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>{lang === "es" ? "Nota ES" : "Note ES"}</FieldLabel>
						<TextArea
							value={form.coverageSection.note.es}
							onChange={(e) =>
								updateCoverageLocalized("note", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Nota EN" : "Note EN"}</FieldLabel>
						<TextArea
							value={form.coverageSection.note.en}
							onChange={(e) =>
								updateCoverageLocalized("note", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>
							{lang === "es" ? "Botón abrir mapas ES" : "Open maps button ES"}
						</FieldLabel>
						<TextInput
							value={form.coverageSection.openMapsLabel.es}
							onChange={(e) =>
								updateCoverageLocalized("openMapsLabel", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>
							{lang === "es" ? "Botón abrir mapas EN" : "Open maps button EN"}
						</FieldLabel>
						<TextInput
							value={form.coverageSection.openMapsLabel.en}
							onChange={(e) =>
								updateCoverageLocalized("openMapsLabel", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="rounded-xl border border-border bg-surface p-4 space-y-3">
					<p className="text-sm font-medium text-text-primary">
						{lang === "es" ? "Visibilidad del bloque de cobertura" : "Coverage block visibility"}
					</p>

					<Toggle
						label={lang === "es" ? "Mostrar bloque de cobertura" : "Show coverage block"}
						checked={form.coverageSection.enabled}
						onChange={(value) =>
							setForm((prev) => ({
								...prev,
								coverageSection: {
									...prev.coverageSection,
									enabled: value,
								},
							}))
						}
					/>
				</div>
			</SectionCard>

			<SectionCard
				icon={<MapPinned className="h-5 w-5" />}
				title={lang === "es" ? "Mapa" : "Map"}
				subtitle={
					lang === "es"
						? "Configura la referencia geográfica y el fallback del mapa."
						: "Configure the geographic reference and fallback map values."
				}
			>
				<div className="space-y-3">
					<Toggle
						label={lang === "es" ? "Mostrar mapa interactivo" : "Show interactive map"}
						checked={form.mapSection.enabled}
						onChange={(value) => updateMapField("enabled", value)}
					/>

					<Toggle
						label={
							lang === "es"
								? "Usar geolocalización del navegador"
								: "Use browser geolocation"
						}
						checked={form.mapSection.useBrowserGeolocation}
						onChange={(value) => updateMapField("useBrowserGeolocation", value)}
					/>
				</div>

				<div className="grid gap-5 md:grid-cols-3">
					<div>
						<FieldLabel>Latitude</FieldLabel>
						<TextInput
							type="number"
							step="any"
							value={form.mapSection.fallbackLat ?? ""}
							onChange={(e) =>
								updateMapField(
									"fallbackLat",
									safeNumberFromInput(e.target.value),
								)
							}
						/>
					</div>

					<div>
						<FieldLabel>Longitude</FieldLabel>
						<TextInput
							type="number"
							step="any"
							value={form.mapSection.fallbackLng ?? ""}
							onChange={(e) =>
								updateMapField(
									"fallbackLng",
									safeNumberFromInput(e.target.value),
								)
							}
						/>
					</div>

					<div>
						<FieldLabel>Zoom</FieldLabel>
						<TextInput
							type="number"
							min={1}
							max={20}
							value={form.mapSection.zoom}
							onChange={(e) =>
								updateMapField(
									"zoom",
									Number.isFinite(Number(e.target.value))
										? Number(e.target.value)
										: 7,
								)
							}
						/>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				icon={<Info className="h-5 w-5" />}
				title={lang === "es" ? "Nosotros" : "About"}
				subtitle={
					lang === "es"
						? "Administra el bloque institucional que presenta a Sierra Tech."
						: "Manage the institutional block that presents Sierra Tech."
				}
			>
				<Toggle
					label={lang === "es" ? "Mostrar sección" : "Show section"}
					checked={form.aboutSection.enabled}
					onChange={(value) =>
						setForm((prev) => ({
							...prev,
							aboutSection: {
								...prev.aboutSection,
								enabled: value,
							},
						}))
					}
				/>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Eyebrow ES</FieldLabel>
						<TextInput
							value={form.aboutSection.eyebrow.es}
							onChange={(e) =>
								updateAboutLocalized("eyebrow", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Eyebrow EN</FieldLabel>
						<TextInput
							value={form.aboutSection.eyebrow.en}
							onChange={(e) =>
								updateAboutLocalized("eyebrow", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>{lang === "es" ? "Título ES" : "Title ES"}</FieldLabel>
						<TextInput
							value={form.aboutSection.title.es}
							onChange={(e) =>
								updateAboutLocalized("title", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Título EN" : "Title EN"}</FieldLabel>
						<TextInput
							value={form.aboutSection.title.en}
							onChange={(e) =>
								updateAboutLocalized("title", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>
							{lang === "es" ? "Descripción ES" : "Description ES"}
						</FieldLabel>
						<TextArea
							value={form.aboutSection.description.es}
							onChange={(e) =>
								updateAboutLocalized("description", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>
							{lang === "es" ? "Descripción EN" : "Description EN"}
						</FieldLabel>
						<TextArea
							value={form.aboutSection.description.en}
							onChange={(e) =>
								updateAboutLocalized("description", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-background p-4">
					<div className="mb-4 flex items-center justify-between gap-3">
						<SectionTitle>
							{lang === "es" ? "Highlights" : "Highlights"}
						</SectionTitle>

						<ActionButton onClick={addAboutHighlight}>
							<Plus className="mr-2 h-4 w-4" />
							{lang === "es" ? "Agregar item" : "Add item"}
						</ActionButton>
					</div>

					{form.aboutSection.highlights.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-text-secondary">
							{lang === "es"
								? "No hay highlights todavía."
								: "No highlights yet."}
						</div>
					) : (
						<div className="space-y-4">
							{form.aboutSection.highlights.map((item, index) => (
								<div
									key={`about-highlight-${index}`}
									className="rounded-xl border border-border bg-surface p-4"
								>
									<div className="mb-3 flex items-center justify-between gap-3">
										<p className="text-sm font-medium text-text-primary">
											{lang === "es" ? "Item" : "Item"} #{index + 1}
										</p>

										<ActionButton onClick={() => removeAboutHighlight(index)}>
											<Trash2 className="h-4 w-4" />
										</ActionButton>
									</div>

									<div className="grid gap-5 md:grid-cols-2">
										<div>
											<FieldLabel>ES</FieldLabel>
											<TextInput
												value={item.es}
												onChange={(e) =>
													updateAboutHighlight(index, "es", e.target.value)
												}
											/>
										</div>

										<div>
											<FieldLabel>EN</FieldLabel>
											<TextInput
												value={item.en}
												onChange={(e) =>
													updateAboutHighlight(index, "en", e.target.value)
												}
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</SectionCard>

			<SectionCard
				icon={<Building2 className="h-5 w-5" />}
				title={
					lang === "es"
						? "Alianzas, representación técnica y comercial"
						: "Partnerships, technical and commercial representation"
				}
				subtitle={
					lang === "es"
						? "Administra un bloque general y múltiples partners, cada uno con logo, alcance, CTA y documentos."
						: "Manage a general block and multiple partners, each with logo, scope, CTA and documents."
				}
			>
				<Toggle
					label={lang === "es" ? "Mostrar sección" : "Show section"}
					checked={form.partnerSection.enabled}
					onChange={(value) => updatePartnerSectionField("enabled", value)}
				/>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Eyebrow ES</FieldLabel>
						<TextInput
							value={form.partnerSection.eyebrow.es}
							onChange={(e) =>
								updatePartnerSectionLocalized("eyebrow", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Eyebrow EN</FieldLabel>
						<TextInput
							value={form.partnerSection.eyebrow.en}
							onChange={(e) =>
								updatePartnerSectionLocalized("eyebrow", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Título ES</FieldLabel>
						<TextInput
							value={form.partnerSection.title.es}
							onChange={(e) =>
								updatePartnerSectionLocalized("title", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Título EN</FieldLabel>
						<TextInput
							value={form.partnerSection.title.en}
							onChange={(e) =>
								updatePartnerSectionLocalized("title", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Descripción ES</FieldLabel>
						<TextArea
							value={form.partnerSection.description.es}
							onChange={(e) =>
								updatePartnerSectionLocalized(
									"description",
									"es",
									e.target.value,
								)
							}
						/>
					</div>

					<div>
						<FieldLabel>Descripción EN</FieldLabel>
						<TextArea
							value={form.partnerSection.description.en}
							onChange={(e) =>
								updatePartnerSectionLocalized(
									"description",
									"en",
									e.target.value,
								)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>Badge ES</FieldLabel>
						<TextInput
							value={form.partnerSection.badgeLabel.es}
							onChange={(e) =>
								updatePartnerSectionLocalized("badgeLabel", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>Badge EN</FieldLabel>
						<TextInput
							value={form.partnerSection.badgeLabel.en}
							onChange={(e) =>
								updatePartnerSectionLocalized("badgeLabel", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-background p-4">
					<SectionTitle>
						{lang === "es" ? "CTA general del bloque" : "General block CTA"}
					</SectionTitle>

					<div className="mt-4 grid gap-5 md:grid-cols-2">
						<div>
							<FieldLabel>Label ES</FieldLabel>
							<TextInput
								value={form.partnerSection.ctaLabel.es}
								onChange={(e) =>
									updatePartnerSectionLocalized("ctaLabel", "es", e.target.value)
								}
							/>
						</div>

						<div>
							<FieldLabel>Label EN</FieldLabel>
							<TextInput
								value={form.partnerSection.ctaLabel.en}
								onChange={(e) =>
									updatePartnerSectionLocalized("ctaLabel", "en", e.target.value)
								}
							/>
						</div>
					</div>

					<div className="mt-4">
						<FieldLabel>Href</FieldLabel>
						<TextInput
							value={form.partnerSection.ctaHref}
							onChange={(e) =>
								updatePartnerSectionField("ctaHref", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="flex items-center justify-between gap-3">
					<div>
						<SectionTitle>{lang === "es" ? "Partners" : "Partners"}</SectionTitle>
						<p className="mt-1 text-sm text-text-secondary">
							{lang === "es"
								? "Crea y administra múltiples alianzas con su propio contenido."
								: "Create and manage multiple alliances with their own content."}
						</p>
					</div>

					<ActionButton onClick={addPartner}>
						<Plus className="mr-2 h-4 w-4" />
						{lang === "es" ? "Agregar partner" : "Add partner"}
					</ActionButton>
				</div>

				{partnerItems.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-text-secondary">
						{lang === "es"
							? "No hay partners creados todavía."
							: "No partners have been created yet."}
					</div>
				) : (
					<div className="space-y-5">
						{sortPartnerItems(partnerItems).map((partner, index, list) => {
							const isPartnerExpanded = expandedPartners[partner.id] ?? true;
							const partnerDisplayName = getPartnerDisplayName(partner);
							const partnerHasLogo = partner.logo.url.trim().length > 0;
							const enabledDocumentsCount = partner.documents.filter(
								(document) => document.enabled,
							).length;
							const documentsWithFileCount = partner.documents.filter(
								(document) => document.file.url.trim().length > 0,
							).length;
							const coverageCount = partner.coverageItems.length;
							const tagsCount = partner.tags.length;
							const partnerHasContent = hasPartnerContent(partner);
							const partnerIsValid = !partner.enabled
								? true
								: partner.name.trim().length > 0 && partnerHasContent;

							return (
								<div
									key={partner.id}
									className="rounded-2xl border border-border bg-background p-5"
								>
									<div className="mb-5 rounded-2xl border border-border bg-surface p-4">
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div className="flex min-w-0 items-start gap-3">
												<div className="rounded-xl border border-border bg-background p-2">
													<Building2 className="h-5 w-5 text-brand-primaryStrong" />
												</div>

												<div className="min-w-0">
													<p className="truncate text-base font-semibold text-text-primary">
														{partnerDisplayName}
													</p>

													<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
														<span>
															{lang === "es" ? "Partner" : "Partner"} #{partner.order}
														</span>
														<span>•</span>
														<span>
															{partner.enabled
																? lang === "es"
																	? "Activo"
																	: "Enabled"
																: lang === "es"
																	? "Inactivo"
																	: "Disabled"}
														</span>
														<span>•</span>
														<span>
															{partnerHasLogo
																? lang === "es"
																	? "Con logo"
																	: "Logo uploaded"
																: lang === "es"
																	? "Sin logo"
																	: "No logo"}
														</span>
														<span>•</span>
														<span>
															{enabledDocumentsCount}{" "}
															{lang === "es"
																? "documento(s) activos"
																: "active document(s)"}
														</span>
														<span>•</span>
														<span>
															{documentsWithFileCount}{" "}
															{lang === "es" ? "con archivo" : "with file"}
														</span>
														<span>•</span>
														<span>
															{coverageCount} {lang === "es" ? "alcance" : "scope"}
														</span>
														<span>•</span>
														<span>
															{tagsCount} {lang === "es" ? "tag(s)" : "tag(s)"}
														</span>
														<span>•</span>
														<span
															className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${partnerIsValid
																? "bg-emerald-100 text-emerald-700"
																: "bg-amber-100 text-amber-700"
																}`}
														>
															{partnerIsValid
																? lang === "es"
																	? "Listo"
																	: "Ready"
																: lang === "es"
																	? "Incompleto"
																	: "Incomplete"}
														</span>
													</div>
												</div>
											</div>

											<div className="flex flex-wrap items-center gap-2">
												<ActionButton
													type="button"
													onClick={() => togglePartnerExpanded(partner.id)}
												>
													{isPartnerExpanded ? (
														<ChevronUp className="h-4 w-4" />
													) : (
														<ChevronDown className="h-4 w-4" />
													)}
												</ActionButton>

												<ActionButton
													onClick={() => movePartner(partner.id, "up")}
													disabled={index === 0}
												>
													<ArrowUp className="h-4 w-4" />
												</ActionButton>

												<ActionButton
													onClick={() => movePartner(partner.id, "down")}
													disabled={index === list.length - 1}
												>
													<ArrowDown className="h-4 w-4" />
												</ActionButton>

												<ActionButton
													onClick={() => removePartner(partner.id)}
													className="text-status-error hover:text-status-error"
												>
													<Trash2 className="h-4 w-4" />
												</ActionButton>
											</div>
										</div>
									</div>

									{isPartnerExpanded ? (
										<div className="space-y-5">
											<Toggle
												label={lang === "es" ? "Partner activo" : "Partner enabled"}
												checked={partner.enabled}
												onChange={(value) =>
													updatePartnerField(partner.id, "enabled", value)
												}
											/>

											<div className="grid gap-5 md:grid-cols-2">
												<div>
													<FieldLabel>{lang === "es" ? "Nombre" : "Name"}</FieldLabel>
													<TextInput
														value={partner.name}
														onChange={(e) =>
															updatePartnerField(partner.id, "name", e.target.value)
														}
													/>
												</div>

												<div>
													<FieldLabel>
														{lang === "es" ? "Nombre corto" : "Short name"}
													</FieldLabel>
													<TextInput
														value={partner.shortName}
														onChange={(e) =>
															updatePartnerField(
																partner.id,
																"shortName",
																e.target.value,
															)
														}
													/>
												</div>
											</div>

											<div className="grid gap-5 md:grid-cols-2">
												<div>
													<FieldLabel>Badge ES</FieldLabel>
													<TextInput
														value={partner.badgeLabel.es}
														onChange={(e) =>
															updatePartnerLocalized(
																partner.id,
																"badgeLabel",
																"es",
																e.target.value,
															)
														}
													/>
												</div>

												<div>
													<FieldLabel>Badge EN</FieldLabel>
													<TextInput
														value={partner.badgeLabel.en}
														onChange={(e) =>
															updatePartnerLocalized(
																partner.id,
																"badgeLabel",
																"en",
																e.target.value,
															)
														}
													/>
												</div>
											</div>

											<div className="grid gap-5 md:grid-cols-2">
												<div>
													<FieldLabel>Resumen ES</FieldLabel>
													<TextArea
														value={partner.summary.es}
														onChange={(e) =>
															updatePartnerLocalized(
																partner.id,
																"summary",
																"es",
																e.target.value,
															)
														}
													/>
												</div>

												<div>
													<FieldLabel>Resumen EN</FieldLabel>
													<TextArea
														value={partner.summary.en}
														onChange={(e) =>
															updatePartnerLocalized(
																partner.id,
																"summary",
																"en",
																e.target.value,
															)
														}
													/>
												</div>
											</div>

											<div className="grid gap-5 md:grid-cols-2">
												<div>
													<FieldLabel>Descripción ES</FieldLabel>
													<TextArea
														value={partner.description.es}
														onChange={(e) =>
															updatePartnerLocalized(
																partner.id,
																"description",
																"es",
																e.target.value,
															)
														}
													/>
												</div>

												<div>
													<FieldLabel>Descripción EN</FieldLabel>
													<TextArea
														value={partner.description.en}
														onChange={(e) =>
															updatePartnerLocalized(
																partner.id,
																"description",
																"en",
																e.target.value,
															)
														}
													/>
												</div>
											</div>

											<div className="rounded-2xl border border-border bg-surface p-4">
												<div className="flex flex-wrap items-center justify-between gap-3">
													<SectionTitle>
														{lang === "es" ? "Logo del partner" : "Partner logo"}
													</SectionTitle>

													<input
														ref={(node) => {
															logoFileInputsRef.current[partner.id] = node;
														}}
														type="file"
														accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
														className="hidden"
														onChange={(event) => {
															const file =
																event.currentTarget.files?.[0] ?? null;
															void handlePartnerLogoSelected(partner.id, file);
														}}
													/>
												</div>

												<div className="mt-4 grid gap-5 lg:grid-cols-[220px_1fr]">
													<div className="rounded-2xl border border-dashed border-border bg-background p-4">
														<div className="flex h-40 items-center justify-center rounded-xl border border-border bg-surface">
															{partner.logo.url ? (
																<Image
																	src={partner.logo.url}
																	alt={partner.name || "Partner logo"}
																	width={320}
																	height={160}
																	unoptimized
																	className="max-h-32 max-w-full object-contain"
																/>
															) : (
																<div className="flex flex-col items-center gap-2 text-text-secondary">
																	<ImageIcon className="h-8 w-8" />
																	<span className="text-xs">
																		{lang === "es"
																			? "Sin logo cargado"
																			: "No logo uploaded"}
																	</span>
																</div>
															)}
														</div>
													</div>

													<div className="space-y-4">
														<div className="grid gap-4 md:grid-cols-2">
															<div>
																<FieldLabel>URL</FieldLabel>
																<TextInput value={partner.logo.url} readOnly />
															</div>

															<div>
																<FieldLabel>
																	{lang === "es" ? "Nombre de archivo" : "File name"}
																</FieldLabel>
																<TextInput
																	value={
																		partner.logo.fileName ||
																		(lang === "es" ? "Sin archivo" : "No file")
																	}
																	readOnly
																/>
															</div>

															<div>
																<FieldLabel>MIME Type</FieldLabel>
																<TextInput value={partner.logo.mimeType} readOnly />
															</div>

															<div>
																<FieldLabel>Storage Key</FieldLabel>
																<TextInput value={partner.logo.storageKey} readOnly />
															</div>

															<div>
																<FieldLabel>
																	{lang === "es" ? "Tamaño (bytes)" : "Size (bytes)"}
																</FieldLabel>
																<TextInput
																	value={String(partner.logo.sizeBytes)}
																	readOnly
																/>
															</div>
														</div>

														<div className="flex flex-wrap gap-2">
															<ActionButton
																type="button"
																disabled={uploadingLogoPartnerId === partner.id}
																onClick={() =>
																	logoFileInputsRef.current[partner.id]?.click()
																}
															>
																<Upload className="mr-2 h-4 w-4" />
																{uploadingLogoPartnerId === partner.id
																	? lang === "es"
																		? "Subiendo..."
																		: "Uploading..."
																	: partner.logo.url
																		? lang === "es"
																			? "Reemplazar logo"
																			: "Replace logo"
																		: lang === "es"
																			? "Subir logo"
																			: "Upload logo"}
															</ActionButton>

															{partner.logo.url ? (
																<>
																	<a
																		href={partner.logo.url}
																		target="_blank"
																		rel="noreferrer"
																		className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft"
																	>
																		<Eye className="mr-2 h-4 w-4" />
																		{lang === "es" ? "Ver" : "View"}
																	</a>

																	<ActionButton
																		type="button"
																		onClick={() => removePartnerLogo(partner.id)}
																		className="text-status-error hover:text-status-error"
																	>
																		<X className="mr-2 h-4 w-4" />
																		{lang === "es" ? "Quitar logo" : "Remove logo"}
																	</ActionButton>
																</>
															) : null}
														</div>
													</div>
												</div>
											</div>

											<div className="rounded-2xl border border-border bg-surface p-4">
												<div className="mb-4 flex items-center justify-between gap-3">
													<SectionTitle>
														{lang === "es" ? "Cobertura / alcance" : "Coverage / scope"}
													</SectionTitle>

													<ActionButton
														onClick={() => addPartnerCoverageItem(partner.id)}
													>
														<Plus className="mr-2 h-4 w-4" />
														{lang === "es" ? "Agregar item" : "Add item"}
													</ActionButton>
												</div>

												{partner.coverageItems.length === 0 ? (
													<div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-text-secondary">
														{lang === "es"
															? "No hay items de cobertura."
															: "No coverage items yet."}
													</div>
												) : (
													<div className="space-y-4">
														{partner.coverageItems.map((item, itemIndex) => (
															<div
																key={`${partner.id}-coverage-${itemIndex}`}
																className="rounded-xl border border-border bg-background p-4"
															>
																<div className="mb-3 flex items-center justify-between gap-3">
																	<p className="text-sm font-medium text-text-primary">
																		{lang === "es" ? "Item" : "Item"} #{itemIndex + 1}
																	</p>

																	<ActionButton
																		onClick={() =>
																			removePartnerCoverageItem(partner.id, itemIndex)
																		}
																	>
																		<Trash2 className="h-4 w-4" />
																	</ActionButton>
																</div>

																<div className="grid gap-5 md:grid-cols-2">
																	<div>
																		<FieldLabel>ES</FieldLabel>
																		<TextInput
																			value={item.es}
																			onChange={(e) =>
																				updatePartnerCoverageItem(
																					partner.id,
																					itemIndex,
																					"es",
																					e.target.value,
																				)
																			}
																		/>
																	</div>

																	<div>
																		<FieldLabel>EN</FieldLabel>
																		<TextInput
																			value={item.en}
																			onChange={(e) =>
																				updatePartnerCoverageItem(
																					partner.id,
																					itemIndex,
																					"en",
																					e.target.value,
																				)
																			}
																		/>
																	</div>
																</div>
															</div>
														))}
													</div>
												)}
											</div>

											<div className="rounded-2xl border border-border bg-surface p-4">
												<div className="mb-4 flex items-center justify-between gap-3">
													<SectionTitle>{lang === "es" ? "Etiquetas" : "Tags"}</SectionTitle>

													<ActionButton onClick={() => addPartnerTag(partner.id)}>
														<Plus className="mr-2 h-4 w-4" />
														{lang === "es" ? "Agregar etiqueta" : "Add tag"}
													</ActionButton>
												</div>

												{partner.tags.length === 0 ? (
													<div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-text-secondary">
														{lang === "es" ? "No hay etiquetas." : "No tags yet."}
													</div>
												) : (
													<div className="space-y-4">
														{partner.tags.map((item, itemIndex) => (
															<div
																key={`${partner.id}-tag-${itemIndex}`}
																className="rounded-xl border border-border bg-background p-4"
															>
																<div className="mb-3 flex items-center justify-between gap-3">
																	<p className="text-sm font-medium text-text-primary">
																		{lang === "es" ? "Etiqueta" : "Tag"} #{itemIndex + 1}
																	</p>

																	<ActionButton
																		onClick={() =>
																			removePartnerTag(partner.id, itemIndex)
																		}
																	>
																		<Trash2 className="h-4 w-4" />
																	</ActionButton>
																</div>

																<div className="grid gap-5 md:grid-cols-2">
																	<div>
																		<FieldLabel>ES</FieldLabel>
																		<TextInput
																			value={item.es}
																			onChange={(e) =>
																				updatePartnerTag(
																					partner.id,
																					itemIndex,
																					"es",
																					e.target.value,
																				)
																			}
																		/>
																	</div>

																	<div>
																		<FieldLabel>EN</FieldLabel>
																		<TextInput
																			value={item.en}
																			onChange={(e) =>
																				updatePartnerTag(
																					partner.id,
																					itemIndex,
																					"en",
																					e.target.value,
																				)
																			}
																		/>
																	</div>
																</div>
															</div>
														))}
													</div>
												)}
											</div>

											<div className="rounded-2xl border border-border bg-surface p-4">
												<SectionTitle>
													{lang === "es" ? "CTA del partner" : "Partner CTA"}
												</SectionTitle>

												<div className="mt-4 grid gap-5 md:grid-cols-2">
													<div>
														<FieldLabel>Label ES</FieldLabel>
														<TextInput
															value={partner.ctaLabel.es}
															onChange={(e) =>
																updatePartnerLocalized(
																	partner.id,
																	"ctaLabel",
																	"es",
																	e.target.value,
																)
															}
														/>
													</div>

													<div>
														<FieldLabel>Label EN</FieldLabel>
														<TextInput
															value={partner.ctaLabel.en}
															onChange={(e) =>
																updatePartnerLocalized(
																	partner.id,
																	"ctaLabel",
																	"en",
																	e.target.value,
																)
															}
														/>
													</div>
												</div>

												<div className="mt-4">
													<FieldLabel>Href</FieldLabel>
													<TextInput
														value={partner.ctaHref}
														onChange={(e) =>
															updatePartnerField(
																partner.id,
																"ctaHref",
																e.target.value,
															)
														}
													/>
												</div>
											</div>

											<div className="rounded-2xl border border-border bg-surface p-4">
												<div className="mb-4 flex items-center justify-between gap-3">
													<div className="flex items-center gap-2">
														<FileText className="h-4 w-4 text-brand-primaryStrong" />
														<SectionTitle>
															{lang === "es" ? "Documentos" : "Documents"}
														</SectionTitle>
													</div>

													<ActionButton
														onClick={() => addPartnerDocument(partner.id)}
													>
														<Plus className="mr-2 h-4 w-4" />
														{lang === "es" ? "Agregar documento" : "Add document"}
													</ActionButton>
												</div>

												{partner.documents.length === 0 ? (
													<div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-text-secondary">
														{lang === "es"
															? "No hay documentos para este partner."
															: "No documents for this partner yet."}
													</div>
												) : (
													<div className="space-y-4">
														{sortPartnerDocuments(partner.documents).map(
															(document, docIndex, docsList) => {
																const documentKey = `${partner.id}:${document.id}`;
																const isUploadingDocument =
																	uploadingDocumentKey === documentKey;
																const isDocumentExpanded =
																	expandedDocuments[documentKey] ?? true;
																const documentDisplayName =
																	getDocumentDisplayName(document, lang);
																const hasDocumentFile =
																	document.file.url.trim().length > 0;
																const documentHasTitle = hasLocalizedText(
																	document.title,
																);
																const documentIsValid =
																	!document.enabled ||
																	(documentHasTitle && hasDocumentFile);

																return (
																	<div
																		key={document.id}
																		className="rounded-xl border border-border bg-background p-4"
																	>
																		<div className="mb-4 rounded-2xl border border-border bg-surface p-4">
																			<div className="flex flex-wrap items-start justify-between gap-3">
																				<div className="min-w-0">
																					<p className="truncate text-sm font-semibold text-text-primary">
																						{documentDisplayName}
																					</p>

																					<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
																						<span>
																							{lang === "es" ? "Documento" : "Document"} #
																							{document.order}
																						</span>
																						<span>•</span>
																						<span>
																							{document.enabled
																								? lang === "es"
																									? "Activo"
																									: "Enabled"
																								: lang === "es"
																									? "Inactivo"
																									: "Disabled"}
																						</span>
																						<span>•</span>
																						<span>
																							{hasDocumentFile
																								? lang === "es"
																									? "Con archivo"
																									: "File uploaded"
																								: lang === "es"
																									? "Sin archivo"
																									: "No file"}
																						</span>
																						<span>•</span>
																						<span
																							className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${documentIsValid
																								? "bg-emerald-100 text-emerald-700"
																								: "bg-amber-100 text-amber-700"
																								}`}
																						>
																							{documentIsValid
																								? lang === "es"
																									? "Listo"
																									: "Ready"
																								: lang === "es"
																									? "Incompleto"
																									: "Incomplete"}
																						</span>
																					</div>
																				</div>

																				<div className="flex flex-wrap items-center gap-2">
																					<ActionButton
																						type="button"
																						onClick={() =>
																							toggleDocumentExpanded(documentKey)
																						}
																					>
																						{isDocumentExpanded ? (
																							<ChevronUp className="h-4 w-4" />
																						) : (
																							<ChevronDown className="h-4 w-4" />
																						)}
																					</ActionButton>

																					<ActionButton
																						onClick={() =>
																							movePartnerDocument(
																								partner.id,
																								document.id,
																								"up",
																							)
																						}
																						disabled={docIndex === 0}
																					>
																						<ArrowUp className="h-4 w-4" />
																					</ActionButton>

																					<ActionButton
																						onClick={() =>
																							movePartnerDocument(
																								partner.id,
																								document.id,
																								"down",
																							)
																						}
																						disabled={
																							docIndex === docsList.length - 1
																						}
																					>
																						<ArrowDown className="h-4 w-4" />
																					</ActionButton>

																					<ActionButton
																						onClick={() =>
																							removePartnerDocument(
																								partner.id,
																								document.id,
																							)
																						}
																						className="text-status-error hover:text-status-error"
																					>
																						<Trash2 className="h-4 w-4" />
																					</ActionButton>
																				</div>
																			</div>
																		</div>

																		{isDocumentExpanded ? (
																			<div className="space-y-4">
																				<Toggle
																					label={
																						lang === "es"
																							? "Documento activo"
																							: "Document enabled"
																					}
																					checked={document.enabled}
																					onChange={(value) =>
																						updatePartnerDocumentField(
																							partner.id,
																							document.id,
																							"enabled",
																							value,
																						)
																					}
																				/>

																				<div className="grid gap-5 md:grid-cols-2">
																					<div>
																						<FieldLabel>Título ES</FieldLabel>
																						<TextInput
																							value={document.title.es}
																							onChange={(e) =>
																								updatePartnerDocumentLocalized(
																									partner.id,
																									document.id,
																									"title",
																									"es",
																									e.target.value,
																								)
																							}
																						/>
																					</div>

																					<div>
																						<FieldLabel>Título EN</FieldLabel>
																						<TextInput
																							value={document.title.en}
																							onChange={(e) =>
																								updatePartnerDocumentLocalized(
																									partner.id,
																									document.id,
																									"title",
																									"en",
																									e.target.value,
																								)
																							}
																						/>
																					</div>
																				</div>

																				<div className="grid gap-5 md:grid-cols-2">
																					<div>
																						<FieldLabel>Descripción ES</FieldLabel>
																						<TextArea
																							value={document.description.es}
																							onChange={(e) =>
																								updatePartnerDocumentLocalized(
																									partner.id,
																									document.id,
																									"description",
																									"es",
																									e.target.value,
																								)
																							}
																						/>
																					</div>

																					<div>
																						<FieldLabel>Descripción EN</FieldLabel>
																						<TextArea
																							value={document.description.en}
																							onChange={(e) =>
																								updatePartnerDocumentLocalized(
																									partner.id,
																									document.id,
																									"description",
																									"en",
																									e.target.value,
																								)
																							}
																						/>
																					</div>
																				</div>

																				<div className="grid gap-5 md:grid-cols-2">
																					<div>
																						<FieldLabel>Label ES</FieldLabel>
																						<TextInput
																							value={document.label.es}
																							onChange={(e) =>
																								updatePartnerDocumentLocalized(
																									partner.id,
																									document.id,
																									"label",
																									"es",
																									e.target.value,
																								)
																							}
																						/>
																					</div>

																					<div>
																						<FieldLabel>Label EN</FieldLabel>
																						<TextInput
																							value={document.label.en}
																							onChange={(e) =>
																								updatePartnerDocumentLocalized(
																									partner.id,
																									document.id,
																									"label",
																									"en",
																									e.target.value,
																								)
																							}
																						/>
																					</div>
																				</div>

																				<div className="grid gap-5 lg:grid-cols-[220px_1fr]">
																					<div className="rounded-2xl border border-dashed border-border bg-surface p-4">
																						<div className="flex h-40 items-center justify-center rounded-xl border border-border bg-background">
																							{hasDocumentFile ? (
																								document.file.mimeType.startsWith(
																									"image/",
																								) ? (
																									<Image
																										src={document.file.url}
																										alt={documentDisplayName}
																										width={320}
																										height={160}
																										unoptimized
																										className="max-h-32 max-w-full object-contain"
																									/>
																								) : (
																									<div className="flex flex-col items-center gap-2 text-text-secondary">
																										<FileText className="h-8 w-8" />
																										<span className="text-xs">
																											{lang === "es"
																												? "Archivo cargado"
																												: "File uploaded"}
																										</span>
																									</div>
																								)
																							) : (
																								<div className="flex flex-col items-center gap-2 text-text-secondary">
																									<FileText className="h-8 w-8" />
																									<span className="text-xs">
																										{lang === "es" ? "Sin archivo" : "No file"}
																									</span>
																								</div>
																							)}
																						</div>
																					</div>

																					<div className="space-y-4">
																						<input
																							ref={(node) => {
																								documentFileInputsRef.current[
																									documentKey
																								] = node;
																							}}
																							type="file"
																							accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
																							className="hidden"
																							onChange={(event) => {
																								const file =
																									event.currentTarget.files?.[0] ?? null;
																								void handlePartnerDocumentSelected(
																									partner.id,
																									document.id,
																									file,
																								);
																							}}
																						/>

																						<div className="grid gap-4 md:grid-cols-2">
																							<div>
																								<FieldLabel>URL</FieldLabel>
																								<TextInput value={document.file.url} readOnly />
																							</div>

																							<div>
																								<FieldLabel>
																									{lang === "es"
																										? "Nombre de archivo"
																										: "File name"}
																								</FieldLabel>
																								<TextInput
																									value={
																										document.file.fileName ||
																										(lang === "es"
																											? "Sin archivo"
																											: "No file")
																									}
																									readOnly
																								/>
																							</div>

																							<div>
																								<FieldLabel>MIME Type</FieldLabel>
																								<TextInput
																									value={document.file.mimeType}
																									readOnly
																								/>
																							</div>

																							<div>
																								<FieldLabel>Storage Key</FieldLabel>
																								<TextInput
																									value={document.file.storageKey}
																									readOnly
																								/>
																							</div>

																							<div>
																								<FieldLabel>
																									{lang === "es"
																										? "Tamaño (bytes)"
																										: "Size (bytes)"}
																								</FieldLabel>
																								<TextInput
																									value={String(document.file.sizeBytes)}
																									readOnly
																								/>
																							</div>
																						</div>

																						<div className="flex flex-wrap gap-2">
																							<ActionButton
																								type="button"
																								disabled={isUploadingDocument}
																								onClick={() =>
																									documentFileInputsRef.current[
																										documentKey
																									]?.click()
																								}
																							>
																								<Upload className="mr-2 h-4 w-4" />
																								{isUploadingDocument
																									? lang === "es"
																										? "Subiendo..."
																										: "Uploading..."
																									: hasDocumentFile
																										? lang === "es"
																											? "Reemplazar archivo"
																											: "Replace file"
																										: lang === "es"
																											? "Subir archivo"
																											: "Upload file"}
																							</ActionButton>

																							{hasDocumentFile ? (
																								<>
																									<a
																										href={document.file.url}
																										target="_blank"
																										rel="noreferrer"
																										className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft"
																									>
																										<Eye className="mr-2 h-4 w-4" />
																										{lang === "es" ? "Ver" : "View"}
																									</a>

																									<ActionButton
																										type="button"
																										onClick={() =>
																											removePartnerDocumentFile(
																												partner.id,
																												document.id,
																											)
																										}
																										className="text-status-error hover:text-status-error"
																									>
																										<X className="mr-2 h-4 w-4" />
																										{lang === "es"
																											? "Quitar archivo"
																											: "Remove file"}
																									</ActionButton>
																								</>
																							) : null}
																						</div>
																					</div>
																				</div>
																			</div>
																		) : null}
																	</div>
																);
															},
														)}
													</div>
												)}
											</div>
										</div>
									) : null}
								</div>
							);
						})}
					</div>
				)}
			</SectionCard>

			<SectionCard
				icon={<UserRound className="h-5 w-5" />}
				title={lang === "es" ? "Liderazgo" : "Leadership"}
				subtitle={
					lang === "es"
						? "Administra el bloque visible de liderazgo de la portada."
						: "Manage the visible leadership block on the landing page."
				}
			>
				<Toggle
					label={lang === "es" ? "Mostrar sección" : "Show section"}
					checked={form.leadershipSection.enabled}
					onChange={(value) =>
						setForm((prev) => ({
							...prev,
							leadershipSection: {
								...prev.leadershipSection,
								enabled: value,
							},
						}))
					}
				/>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>{lang === "es" ? "Nombre" : "Name"}</FieldLabel>
						<TextInput
							value={form.leadershipSection.name}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									leadershipSection: {
										...prev.leadershipSection,
										name: e.target.value,
									},
								}))
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>{lang === "es" ? "Cargo ES" : "Role ES"}</FieldLabel>
						<TextInput
							value={form.leadershipSection.role.es}
							onChange={(e) =>
								updateLeadershipLocalized("role", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Cargo EN" : "Role EN"}</FieldLabel>
						<TextInput
							value={form.leadershipSection.role.en}
							onChange={(e) =>
								updateLeadershipLocalized("role", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>{lang === "es" ? "Mensaje ES" : "Message ES"}</FieldLabel>
						<TextArea
							value={form.leadershipSection.message.es}
							onChange={(e) =>
								updateLeadershipLocalized("message", "es", e.target.value)
							}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Mensaje EN" : "Message EN"}</FieldLabel>
						<TextArea
							value={form.leadershipSection.message.en}
							onChange={(e) =>
								updateLeadershipLocalized("message", "en", e.target.value)
							}
						/>
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-background p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<SectionTitle>
							{lang === "es" ? "Imagen de liderazgo" : "Leadership image"}
						</SectionTitle>

						<input
							ref={leadershipImageInputRef}
							type="file"
							accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
							className="hidden"
							onChange={(event) => {
								const file = event.currentTarget.files?.[0] ?? null;
								void handleLeadershipImageSelected(file);
							}}
						/>
					</div>

					<div className="mt-4 grid gap-5 lg:grid-cols-[220px_1fr]">
						<div className="rounded-2xl border border-dashed border-border bg-surface p-4">
							<div className="flex h-48 items-center justify-center rounded-xl border border-border bg-background">
								{form.leadershipSection.image.url ? (
									<Image
										src={form.leadershipSection.image.url}
										alt={form.leadershipSection.name || "Leadership"}
										width={320}
										height={240}
										unoptimized
										className="max-h-40 max-w-full object-contain"
									/>
								) : (
									<div className="flex flex-col items-center gap-2 text-text-secondary">
										<ImageIcon className="h-8 w-8" />
										<span className="text-xs">
											{lang === "es" ? "Sin imagen" : "No image"}
										</span>
									</div>
								)}
							</div>
						</div>

						<div className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<FieldLabel>URL</FieldLabel>
									<TextInput value={form.leadershipSection.image.url} readOnly />
								</div>

								<div>
									<FieldLabel>
										{lang === "es" ? "Nombre de archivo" : "File name"}
									</FieldLabel>
									<TextInput
										value={
											form.leadershipSection.image.fileName ||
											(lang === "es" ? "Sin archivo" : "No file")
										}
										readOnly
									/>
								</div>

								<div>
									<FieldLabel>MIME Type</FieldLabel>
									<TextInput value={form.leadershipSection.image.mimeType} readOnly />
								</div>

								<div>
									<FieldLabel>Storage Key</FieldLabel>
									<TextInput value={form.leadershipSection.image.storageKey} readOnly />
								</div>

								<div>
									<FieldLabel>
										{lang === "es" ? "Tamaño (bytes)" : "Size (bytes)"}
									</FieldLabel>
									<TextInput
										value={String(form.leadershipSection.image.sizeBytes)}
										readOnly
									/>
								</div>
							</div>

							<div className="flex flex-wrap gap-2">
								<ActionButton
									type="button"
									disabled={uploadingLeadershipImage}
									onClick={() => leadershipImageInputRef.current?.click()}
								>
									<Upload className="mr-2 h-4 w-4" />
									{uploadingLeadershipImage
										? lang === "es"
											? "Subiendo..."
											: "Uploading..."
										: form.leadershipSection.image.url
											? lang === "es"
												? "Reemplazar imagen"
												: "Replace image"
											: lang === "es"
												? "Subir imagen"
												: "Upload image"}
								</ActionButton>

								{form.leadershipSection.image.url ? (
									<>
										<a
											href={form.leadershipSection.image.url}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-surface-soft"
										>
											<Eye className="mr-2 h-4 w-4" />
											{lang === "es" ? "Ver" : "View"}
										</a>

										<ActionButton
											type="button"
											onClick={removeLeadershipImage}
											className="text-status-error hover:text-status-error"
										>
											<X className="mr-2 h-4 w-4" />
											{lang === "es" ? "Quitar imagen" : "Remove image"}
										</ActionButton>
									</>
								) : null}
							</div>
						</div>
					</div>
				</div>
			</SectionCard>

			<SectionCard
				icon={<ShieldCheck className="h-5 w-5" />}
				title={lang === "es" ? "Por qué elegirnos" : "Why choose us"}
				subtitle={
					lang === "es"
						? "Administra las razones clave visibles en la portada."
						: "Manage the key reasons shown on the landing page."
				}
			>
				<Toggle
					label={lang === "es" ? "Mostrar sección" : "Show section"}
					checked={form.whyChooseUs.enabled}
					onChange={(value) =>
						setForm((prev) => ({
							...prev,
							whyChooseUs: {
								...prev.whyChooseUs,
								enabled: value,
							},
						}))
					}
				/>

				<div className="grid gap-5 md:grid-cols-2">
					<div>
						<FieldLabel>{lang === "es" ? "Título ES" : "Title ES"}</FieldLabel>
						<TextInput
							value={form.whyChooseUs.title.es}
							onChange={(e) => updateWhyChooseUsTitle("es", e.target.value)}
						/>
					</div>

					<div>
						<FieldLabel>{lang === "es" ? "Título EN" : "Title EN"}</FieldLabel>
						<TextInput
							value={form.whyChooseUs.title.en}
							onChange={(e) => updateWhyChooseUsTitle("en", e.target.value)}
						/>
					</div>
				</div>

				<div className="rounded-2xl border border-border bg-background p-4">
					<div className="mb-4 flex items-center justify-between gap-3">
						<SectionTitle>
							{lang === "es" ? "Items" : "Items"}
						</SectionTitle>

						<ActionButton onClick={addWhyChooseUsItem}>
							<Plus className="mr-2 h-4 w-4" />
							{lang === "es" ? "Agregar item" : "Add item"}
						</ActionButton>
					</div>

					{form.whyChooseUs.items.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-text-secondary">
							{lang === "es" ? "No hay items todavía." : "No items yet."}
						</div>
					) : (
						<div className="space-y-4">
							{form.whyChooseUs.items.map((item, index, list) => (
								<div
									key={`why-choose-us-item-${index}`}
									className="rounded-xl border border-border bg-surface p-4"
								>
									<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
										<p className="text-sm font-medium text-text-primary">
											{lang === "es" ? "Item" : "Item"} #{index + 1}
										</p>

										<div className="flex flex-wrap items-center gap-2">
											<ActionButton
												onClick={() => moveWhyChooseUsItem(index, "up")}
												disabled={index === 0}
											>
												<ArrowUp className="h-4 w-4" />
											</ActionButton>

											<ActionButton
												onClick={() => moveWhyChooseUsItem(index, "down")}
												disabled={index === list.length - 1}
											>
												<ArrowDown className="h-4 w-4" />
											</ActionButton>

											<ActionButton
												onClick={() => removeWhyChooseUsItem(index)}
											>
												<Trash2 className="h-4 w-4" />
											</ActionButton>
										</div>
									</div>

									<div className="grid gap-5 md:grid-cols-2">
										<div>
											<FieldLabel>{lang === "es" ? "Título ES" : "Title ES"}</FieldLabel>
											<TextInput
												value={item.title.es}
												onChange={(e) =>
													updateWhyChooseUsItem(
														index,
														"title",
														"es",
														e.target.value,
													)
												}
											/>
										</div>

										<div>
											<FieldLabel>{lang === "es" ? "Título EN" : "Title EN"}</FieldLabel>
											<TextInput
												value={item.title.en}
												onChange={(e) =>
													updateWhyChooseUsItem(
														index,
														"title",
														"en",
														e.target.value,
													)
												}
											/>
										</div>
									</div>

									<div className="mt-4 grid gap-5 md:grid-cols-2">
										<div>
											<FieldLabel>
												{lang === "es" ? "Descripción ES" : "Description ES"}
											</FieldLabel>
											<TextArea
												value={item.description.es}
												onChange={(e) =>
													updateWhyChooseUsItem(
														index,
														"description",
														"es",
														e.target.value,
													)
												}
											/>
										</div>

										<div>
											<FieldLabel>
												{lang === "es" ? "Descripción EN" : "Description EN"}
											</FieldLabel>
											<TextArea
												value={item.description.en}
												onChange={(e) =>
													updateWhyChooseUsItem(
														index,
														"description",
														"en",
														e.target.value,
													)
												}
											/>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</SectionCard>

			<div className="flex flex-wrap items-center gap-3 pb-6">
				<PrimaryButton
					disabled={!hasUnsavedChanges || saving}
					onClick={handleSave}
				>
					{saving
						? lang === "es"
							? "Guardando..."
							: "Saving..."
						: lang === "es"
							? "Guardar cambios"
							: "Save changes"}
				</PrimaryButton>

				<ActionButton
					disabled={!hasUnsavedChanges || saving}
					onClick={handleReset}
				>
					{lang === "es" ? "Restaurar" : "Reset"}
				</ActionButton>
			</div>
		</main>
	);
}