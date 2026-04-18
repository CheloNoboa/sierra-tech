/**
 * =============================================================================
 * ✅ src/components/AdminPolicyEditor.tsx
 * =============================================================================
 * Editor administrativo reutilizable para políticas institucionales.
 *
 * Propósito:
 * - Administrar políticas de Privacidad, Términos y Cookies.
 * - Mantener edición bilingüe ES / EN.
 * - Permitir trabajo normal incluso cuando la base de datos aún no contiene
 *   documentos para alguno de los idiomas.
 *
 * Reglas funcionales:
 * - El editor nunca debe depender de que existan documentos previos.
 * - Si el backend devuelve vacío, la UI debe inicializar un estado editable.
 * - El nombre del negocio se representa en UI con el valor real de settings,
 *   pero en persistencia se conserva el placeholder "__BUSINESS_NAME__".
 * - La persistencia se delega al endpoint recibido por props.
 *
 * Reglas de acceso:
 * - Puede editar quien cumpla al menos una:
 *   1) role === "superadmin"
 *   2) permissions incluye "*"
 *   3) permissions incluye "policies.update"
 * =============================================================================
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";

import {
	FileText,
	Scale,
	Cookie,
	Clock,
	GripVertical,
	Trash2,
	Plus,
	Save,
	AlertTriangle,
} from "lucide-react";

import {
	DragDropContext,
	Droppable,
	Draggable,
	type DropResult,
} from "@hello-pangea/dnd";

import GlobalConfirm from "@/components/ui/GlobalConfirm";
import { useToast } from "@/components/ui/GlobalToastProvider";

/* ----------------------------------------------------------------------------- */
/* Types                                                                         */
/* ----------------------------------------------------------------------------- */

type Lang = "es" | "en";
type AdminRole = "superadmin" | "admin";

interface Section {
	heading: string;
	content: string;
}

interface Policy {
	lang: Lang;
	title: string;
	sections: Section[];
	updatedAt?: string;
	lastModifiedBy?: string;
	lastModifiedEmail?: string;
}

interface AdminPolicyEditorProps {
	apiRoute: string;
	titleEs: string;
	titleEn: string;
}

/**
 * Usuario de sesión extendido con permisos.
 * Debe coincidir con la forma expuesta por next-auth en la sesión.
 */
interface AdminSessionUser {
	id: string;
	name: string;
	email: string;
	role: AdminRole;
	permissions: string[];
}

/* ----------------------------------------------------------------------------- */
/* Internal placeholder for businessName                                         */
/* ----------------------------------------------------------------------------- */

const BUSINESS_NAME_PLACEHOLDER = "__BUSINESS_NAME__";

/* ----------------------------------------------------------------------------- */
/* Helpers                                                                       */
/* ----------------------------------------------------------------------------- */

/**
 * Aplica el nombre real del negocio solamente en UI.
 * En base de datos se sigue usando el placeholder interno.
 */
function applyBusinessName(text: string, businessName: string): string {
	if (!text) return text;

	const normalizedBusinessName = businessName.trim();
	return normalizedBusinessName
		? text.replaceAll(BUSINESS_NAME_PLACEHOLDER, normalizedBusinessName)
		: text;
}

/**
 * Convierte el nombre real visible al placeholder interno para persistencia.
 */
function normalizeToPlaceholder(text: string, businessName: string): string {
	if (!text) return text;

	const normalizedBusinessName = businessName.trim();
	return normalizedBusinessName
		? text.replaceAll(normalizedBusinessName, BUSINESS_NAME_PLACEHOLDER)
		: text;
}

/**
 * Crea una política vacía editable para el idioma solicitado.
 * Esto permite trabajar correctamente en bases nuevas o incompletas.
 */
function createEmptyPolicy(lang: Lang): Policy {
	return {
		lang,
		title: "",
		sections: [],
	};
}

/**
 * Garantiza que el editor siempre disponga de ambos idiomas.
 * Si la API devuelve uno solo, o ninguno, se completan los faltantes.
 */
function normalizePolicies(input: unknown): Policy[] {
	const source = Array.isArray(input) ? input : [];

	const validPolicies = source
		.filter((item): item is Policy => {
			if (!item || typeof item !== "object") return false;

			const candidate = item as Partial<Policy>;
			return (
				(candidate.lang === "es" || candidate.lang === "en") &&
				typeof candidate.title === "string" &&
				Array.isArray(candidate.sections)
			);
		})
		.map((policy) => ({
			...policy,
			sections: policy.sections.map((section) => ({
				heading: typeof section.heading === "string" ? section.heading : "",
				content: typeof section.content === "string" ? section.content : "",
			})),
		}));

	const es =
		validPolicies.find((item) => item.lang === "es") ?? createEmptyPolicy("es");
	const en =
		validPolicies.find((item) => item.lang === "en") ?? createEmptyPolicy("en");

	return [es, en];
}

/* ----------------------------------------------------------------------------- */
/* Main component                                                                */
/* ----------------------------------------------------------------------------- */

export default function AdminPolicyEditor({
	apiRoute,
	titleEs,
	titleEn,
}: AdminPolicyEditorProps) {
	const toast = useToast();
	const { locale } = useTranslation();
	const { data: session, status } = useSession();

	const [policies, setPolicies] = useState<Policy[]>([
		createEmptyPolicy("es"),
		createEmptyPolicy("en"),
	]);

	const [activeLang, setActiveLang] = useState<Lang>("es");
	const [saving, setSaving] = useState(false);
	const [loadingPolicies, setLoadingPolicies] = useState(true);
	const [hasChanges, setHasChanges] = useState(false);

	const [showConfirm, setShowConfirm] = useState(false);
	const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
		null,
	);

	const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
	const [pendingLangChange, setPendingLangChange] = useState<Lang | null>(null);

	const [businessName, setBusinessName] = useState<string>("");

	/* --------------------------------------------------------------------------- */
	/* Access validation                                                           */
	/* --------------------------------------------------------------------------- */

	const user = session?.user as AdminSessionUser | undefined;
	const userPermissions = user?.permissions ?? [];

	const canEditPolicies =
		!!user &&
		(user.role === "superadmin" ||
			userPermissions.includes("*") ||
			userPermissions.includes("policies.update"));

	/**
	 * Hook debe vivir SIEMPRE antes de cualquier return condicional.
	 */
	const policy = useMemo(
		() =>
			policies.find((item) => item.lang === activeLang) ??
			createEmptyPolicy(activeLang),
		[policies, activeLang],
	);

	const isCurrentPolicyEmpty =
		policy.title.trim() === "" && policy.sections.length === 0;

	/* --------------------------------------------------------------------------- */
	/* Load policies                                                               */
	/* --------------------------------------------------------------------------- */

	useEffect(() => {
		async function loadPolicies() {
			try {
				setLoadingPolicies(true);

				const res = await fetch(apiRoute, {
					headers: { "accept-language": locale },
				});

				if (!res.ok) {
					throw new Error("Load failed");
				}

				const data: unknown = await res.json();
				setPolicies(normalizePolicies(data));
			} catch {
				/**
				 * En estado vacío o ante errores de lectura, el editor debe seguir
				 * siendo usable. Se inicializan ambos idiomas localmente.
				 */
				setPolicies([createEmptyPolicy("es"), createEmptyPolicy("en")]);

				toast.error(
					locale === "es"
						? "No se pudieron cargar las políticas. Se abrió un estado editable vacío."
						: "Policies could not be loaded. An empty editable state was opened.",
				);
			} finally {
				setLoadingPolicies(false);
			}
		}

		void loadPolicies();
	}, [apiRoute, locale, toast]);

	/* --------------------------------------------------------------------------- */
	/* Load businessName from settings                                             */
	/* --------------------------------------------------------------------------- */

	useEffect(() => {
		async function loadBusiness() {
			try {
				const res = await fetch("/api/admin/settings", {
					headers: { "accept-language": locale },
				});

				if (!res.ok) return;

				const data: Array<{ key: string; value: unknown }> = await res.json();
				const item = data.find((setting) => setting.key === "businessName");

				if (item && typeof item.value === "string") {
					setBusinessName(item.value.trim());
				}
			} catch {
				/**
				 * Fallback silencioso:
				 * el editor debe funcionar aunque no se haya podido resolver el nombre.
				 */
			}
		}

		void loadBusiness();
	}, [locale]);

	/* --------------------------------------------------------------------------- */
	/* Sync active language with global locale                                     */
	/* --------------------------------------------------------------------------- */

	useEffect(() => {
		if (hasChanges) return;

		if (locale === "es" && activeLang !== "es") {
			setActiveLang("es");
			return;
		}

		if (locale === "en" && activeLang !== "en") {
			setActiveLang("en");
		}
	}, [locale, hasChanges, activeLang]);

	/* --------------------------------------------------------------------------- */
	/* Unsaved changes reminder                                                    */
	/* --------------------------------------------------------------------------- */

	useEffect(() => {
		if (!hasChanges) return;

		const timeoutId = setTimeout(() => {
			toast.warning(
				locale === "es"
					? "Tienes cambios sin guardar."
					: "You have unsaved changes.",
			);
		}, 20000);

		return () => clearTimeout(timeoutId);
	}, [hasChanges, locale, toast]);

	if (status === "loading") {
		return (
			<div className="py-20 text-center text-text-secondary">
				{locale === "es" ? "Verificando sesión..." : "Checking session..."}
			</div>
		);
	}

	if (!user || !canEditPolicies) {
		return (
			<div className="py-20 text-center text-status-error">
				{locale === "es"
					? "No tienes permisos para acceder a este módulo."
					: "You do not have permission to access this module."}
			</div>
		);
	}

	/* --------------------------------------------------------------------------- */
	/* Dynamic header icon                                                         */
	/* --------------------------------------------------------------------------- */

	let HeaderIcon = FileText;

	if (apiRoute.includes("privacy")) HeaderIcon = FileText;
	if (apiRoute.includes("terms")) HeaderIcon = Scale;
	if (apiRoute.includes("cookies")) HeaderIcon = Cookie;
	if (apiRoute.includes("history")) HeaderIcon = Clock;

	/* --------------------------------------------------------------------------- */
	/* Mutators                                                                    */
	/* --------------------------------------------------------------------------- */

	function updateActivePolicy(updater: (current: Policy) => Policy) {
		setPolicies((currentPolicies) => {
			const exists = currentPolicies.some((item) => item.lang === activeLang);

			if (!exists) {
				const base = createEmptyPolicy(activeLang);
				const nextPolicy = updater(base);

				return [...currentPolicies, nextPolicy].sort((a, b) =>
					a.lang.localeCompare(b.lang),
				) as Policy[];
			}

			return currentPolicies.map((item) =>
				item.lang === activeLang ? updater(item) : item,
			);
		});

		setHasChanges(true);
	}

	/* --------------------------------------------------------------------------- */
	/* Add section                                                                 */
	/* --------------------------------------------------------------------------- */

	function handleAddSection() {
		updateActivePolicy((current) => ({
			...current,
			sections: [
				...current.sections,
				{
					heading: activeLang === "es" ? "Nuevo título" : "New heading",
					content: "",
				},
			],
		}));
	}

	/* --------------------------------------------------------------------------- */
	/* Delete section                                                              */
	/* --------------------------------------------------------------------------- */

	function handleDeleteSection(index: number) {
		setPendingDeleteIndex(index);
		setShowConfirm(true);
	}

	function confirmDelete() {
		if (pendingDeleteIndex === null) return;

		updateActivePolicy((current) => ({
			...current,
			sections: current.sections.filter((_, idx) => idx !== pendingDeleteIndex),
		}));

		setShowConfirm(false);
		setPendingDeleteIndex(null);

		toast.success(locale === "es" ? "Sección eliminada" : "Section deleted");
	}

	/* --------------------------------------------------------------------------- */
	/* Drag & drop                                                                 */
	/* --------------------------------------------------------------------------- */

	function handleDrag(result: DropResult) {
		if (!result.destination) return;

		const reordered = [...policy.sections];
		const [moved] = reordered.splice(result.source.index, 1);
		reordered.splice(result.destination.index, 0, moved);

		updateActivePolicy((current) => ({
			...current,
			sections: reordered,
		}));
	}

	/* --------------------------------------------------------------------------- */
	/* Save                                                                        */
	/* --------------------------------------------------------------------------- */

	async function handleSave() {
		const normalized: Policy = {
			...policy,
			title: normalizeToPlaceholder(policy.title, businessName),
			sections: policy.sections.map((section) => ({
				heading: normalizeToPlaceholder(section.heading, businessName),
				content: normalizeToPlaceholder(section.content, businessName),
			})),
		};

		try {
			setSaving(true);

			const res = await fetch(apiRoute, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(normalized),
			});

			if (!res.ok) {
				throw new Error("Save failed");
			}

			toast.success(locale === "es" ? "Cambios guardados" : "Changes saved");
			setHasChanges(false);

			/**
			 * Refresca desde backend para recuperar campos persistidos como updatedAt
			 * o datos normalizados por la API.
			 */
			const refreshRes = await fetch(apiRoute, {
				headers: { "accept-language": locale },
			});

			if (refreshRes.ok) {
				const freshData: unknown = await refreshRes.json();
				setPolicies(normalizePolicies(freshData));
			}
		} catch {
			toast.error(locale === "es" ? "Error al guardar" : "Save error");
		} finally {
			setSaving(false);
		}
	}

	/* --------------------------------------------------------------------------- */
	/* Manual language change                                                      */
	/* --------------------------------------------------------------------------- */

	function handleLangChange(lang: Lang) {
		if (hasChanges) {
			setPendingLangChange(lang);
			setShowUnsavedConfirm(true);
			return;
		}

		setActiveLang(lang);
	}

	function confirmLangChange() {
		if (!pendingLangChange) return;

		setActiveLang(pendingLangChange);
		setPendingLangChange(null);
		setShowUnsavedConfirm(false);
		setHasChanges(false);
	}

	/* --------------------------------------------------------------------------- */
	/* Render                                                                      */
	/* --------------------------------------------------------------------------- */

	return (
		<div className="mx-auto max-w-5xl p-6 pt-8 text-text-primary">
			<div className="mb-8 flex items-center gap-4">
				<HeaderIcon className="h-12 w-12 text-brand-primaryStrong" />
				<h1 className="text-3xl font-bold text-text-primary">
					{activeLang === "es" ? titleEs : titleEn}
				</h1>
			</div>

			<div className="sticky top-24 z-30 mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 shadow-sm backdrop-blur-sm">
				<div className="flex gap-2">
					{(["es", "en"] as const).map((lang) => (
						<button
							key={lang}
							id={`lang-btn-${lang}`}
							name={`lang-btn-${lang}`}
							type="button"
							onClick={() => handleLangChange(lang)}
							className={`rounded-md px-4 py-1.5 font-semibold transition ${
								activeLang === lang
									? "bg-brand-primary text-text-primary"
									: "bg-surface-soft text-text-secondary hover:bg-brand-secondary hover:text-text-primary"
							}`}
						>
							{lang.toUpperCase()}
						</button>
					))}
				</div>

				<div className="flex items-center gap-2">
					{hasChanges && (
						<div className="flex animate-pulse items-center gap-1 text-sm text-status-warning">
							<AlertTriangle size={14} />
							{locale === "es" ? "Cambios sin guardar" : "Unsaved changes"}
						</div>
					)}

					<button
						id="add-section"
						name="add-section"
						type="button"
						onClick={handleAddSection}
						className="flex items-center gap-2 rounded-md border border-border bg-surface-soft px-3 py-2 text-text-secondary transition hover:bg-brand-secondary hover:text-text-primary"
					>
						<Plus size={16} />
						{locale === "es" ? "Agregar sección" : "Add section"}
					</button>

					<button
						id="save-policy"
						name="save-policy"
						type="button"
						onClick={handleSave}
						disabled={saving || loadingPolicies}
						className="flex items-center gap-2 rounded-md bg-brand-primary px-3 py-2 text-text-primary transition hover:bg-brand-primaryStrong hover:text-white disabled:opacity-60"
					>
						<Save size={16} />
						{saving
							? locale === "es"
								? "Guardando..."
								: "Saving..."
							: locale === "es"
								? "Guardar"
								: "Save"}
					</button>
				</div>
			</div>

			{loadingPolicies ? (
				<p className="mt-10 text-center text-text-secondary">
					{locale === "es" ? "Cargando políticas..." : "Loading policies..."}
				</p>
			) : (
				<div className="space-y-6">
					{isCurrentPolicyEmpty && (
						<div className="rounded-xl border border-border bg-surface-soft px-4 py-4 text-sm text-text-secondary">
							{activeLang === "es"
								? "Todavía no existe contenido guardado para este idioma. Puedes empezar a crear la política desde aquí."
								: "There is no saved content for this language yet. You can start creating the policy here."}
						</div>
					)}

					<input
						id="policy-title"
						name="policy-title"
						type="text"
						value={applyBusinessName(policy.title, businessName)}
						onChange={(e) => {
							const internal = normalizeToPlaceholder(
								e.target.value,
								businessName,
							);

							updateActivePolicy((current) => ({
								...current,
								title: internal,
							}));
						}}
						className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-lg font-semibold text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
						placeholder={
							locale === "es" ? "Título de la política" : "Policy title"
						}
					/>

					<DragDropContext onDragEnd={handleDrag}>
						<Droppable droppableId="sections">
							{(provided) => (
								<div ref={provided.innerRef} {...provided.droppableProps}>
									{policy.sections.map((section, index) => (
										<Draggable
											key={index.toString()}
											draggableId={index.toString()}
											index={index}
										>
											{(prov) => (
												<div
													ref={prov.innerRef}
													{...prov.draggableProps}
													className="mb-4 rounded-xl border border-border bg-surface p-4 shadow-sm"
												>
													<div className="mb-3 flex items-center justify-between gap-2">
														<div
															{...prov.dragHandleProps}
															className="flex w-full items-center gap-2"
														>
															<GripVertical className="h-4 w-4 text-text-muted" />

															<input
																id={`section-heading-${index}`}
																name={`section-heading-${index}`}
																type="text"
																value={applyBusinessName(
																	section.heading,
																	businessName,
																)}
																onChange={(e) => {
																	const internal = normalizeToPlaceholder(
																		e.target.value,
																		businessName,
																	);

																	const updatedSections = [...policy.sections];
																	updatedSections[index] = {
																		...updatedSections[index],
																		heading: internal,
																	};

																	updateActivePolicy((current) => ({
																		...current,
																		sections: updatedSections,
																	}));
																}}
																className="w-full rounded-md border border-border bg-surface-soft px-3 py-2 text-text-primary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
																placeholder={
																	locale === "es"
																		? "Título de sección"
																		: "Section heading"
																}
															/>
														</div>

														<button
															id={`delete-section-${index}`}
															name={`delete-section-${index}`}
															type="button"
															onClick={() => handleDeleteSection(index)}
															className="ml-2 text-status-error transition hover:opacity-80"
														>
															<Trash2 size={16} />
														</button>
													</div>

													<textarea
														id={`section-content-${index}`}
														name={`section-content-${index}`}
														rows={4}
														value={applyBusinessName(
															section.content,
															businessName,
														)}
														onChange={(e) => {
															const internal = normalizeToPlaceholder(
																e.target.value,
																businessName,
															);

															const updatedSections = [...policy.sections];
															updatedSections[index] = {
																...updatedSections[index],
																content: internal,
															};

															updateActivePolicy((current) => ({
																...current,
																sections: updatedSections,
															}));
														}}
														className="w-full rounded-md border border-border bg-surface-soft p-3 text-sm leading-relaxed text-text-secondary outline-none focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
														placeholder={
															locale === "es"
																? "Contenido de la sección..."
																: "Section content..."
														}
													/>
												</div>
											)}
										</Draggable>
									))}

									{provided.placeholder}
								</div>
							)}
						</Droppable>
					</DragDropContext>
				</div>
			)}

			<GlobalConfirm
				open={showConfirm}
				title={locale === "es" ? "Confirmar eliminación" : "Delete section?"}
				message={
					locale === "es"
						? "¿Seguro que deseas eliminar esta sección?"
						: "Are you sure you want to delete this section?"
				}
				confirmLabel={locale === "es" ? "Eliminar" : "Delete"}
				cancelLabel={locale === "es" ? "Cancelar" : "Cancel"}
				onConfirm={confirmDelete}
				onCancel={() => {
					setShowConfirm(false);
					setPendingDeleteIndex(null);
				}}
			/>

			<GlobalConfirm
				open={showUnsavedConfirm}
				title={locale === "es" ? "Cambios sin guardar" : "Unsaved changes"}
				message={
					locale === "es"
						? "Tienes cambios sin guardar. ¿Deseas cambiar de idioma?"
						: "You have unsaved changes. Change language anyway?"
				}
				confirmLabel={locale === "es" ? "Cambiar idioma" : "Change language"}
				cancelLabel={locale === "es" ? "Cancelar" : "Cancel"}
				onConfirm={confirmLangChange}
				onCancel={() => {
					setShowUnsavedConfirm(false);
					setPendingLangChange(null);
				}}
			/>
		</div>
	);
}
