// File: src/components/SettingsDataGrid.tsx
"use client";

/**
 * =============================================================================
 * 📌 Component: SettingsDataGrid
 * Path: src/components/SettingsDataGrid.tsx
 * =============================================================================
 *
 * ES:
 * - Grilla administrativa para gestionar configuraciones globales del sistema.
 * - Permite listar, filtrar, paginar, crear, editar y eliminar configuraciones.
 * - Refresca branding público cuando cambian keys relacionadas con marca.
 *
 * Responsabilidades:
 * - Obtener configuraciones desde API.
 * - Normalizar la respuesta al contrato de UI esperado.
 * - Resolver el tipo visual de cada valor (`string`, `number`, `boolean`).
 * - Mantener filtros, paginación, selección y estado del modal.
 * - Notificar cambios de branding cuando corresponde.
 *
 * Reglas:
 * - El grid trabaja con valores serializables compatibles con UI:
 *   `string | number | boolean`.
 * - Si una key afecta branding público (`businessName`, `businessLogotipo`),
 *   se dispara `notifyBrandingUpdated()` después de crear, actualizar o eliminar.
 * - `recordsPerPageConfiguration` puede definir la paginación inicial del módulo.
 * - Se usa un objeto vacío estable cuando no existe registro en edición para
 *   evitar recreaciones innecesarias del modal.
 *
 * EN:
 * - Administrative grid for managing global system settings.
 * - Handles listing, filtering, pagination, create/edit via modal,
 *   single/bulk delete and branding refresh when required.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import {
	Plus,
	Trash2,
	RefreshCw,
	Edit3,
	Settings as SettingsIcon,
	Search,
} from "lucide-react";

import GlobalDataGridShell from "@/components/ui/GlobalDataGridShell";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalConfirm from "@/components/ui/GlobalConfirm";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/components/ui/GlobalToastProvider";

import SettingsModal, {
	type SettingsModalData,
} from "@/components/SettingsModal";

/* =============================================================================
 * Types
 * ============================================================================= */

type SettingValue = string | number | boolean;
type FormType = "string" | "number" | "boolean";

type ApiOk<T> = { ok: true; data: T };

interface SystemSetting {
	_id?: string;
	key: string;
	value: SettingValue;
	module?: string | null;
	description?: string;
}

/* =============================================================================
 * Helpers
 * ============================================================================= */

function isObj(x: unknown): x is Record<string, unknown> {
	return !!x && typeof x === "object";
}

function safeString(x: unknown): string {
	return typeof x === "string" ? x : "";
}

function isApiOk<T>(x: unknown): x is ApiOk<T> {
	return isObj(x) && x.ok === true && "data" in x;
}

/** Keys que afectan branding público. */
const BRANDING_KEYS = new Set<string>(["businessName", "businessLogotipo"]);

/**
 * Notifica al sitio público que el branding cambió.
 * Se mantiene local porque el hook/useBusinessBranding fue eliminado.
 */
function notifyBrandingUpdated(): void {
	if (typeof window === "undefined") return;

	try {
		const updatedAt = Date.now().toString();

		window.localStorage.setItem("ft.branding.updatedAt", updatedAt);
		window.dispatchEvent(
			new CustomEvent("ft:branding-updated", { detail: updatedAt }),
		);
	} catch {
		/* no-op */
	}
}

/** Objeto estable para evitar recreaciones innecesarias del modal. */
const EMPTY_SETTING: SettingsModalData = {
	key: "",
	value: "",
	module: "",
	description: "",
};

function coerceSettingValue(value: unknown): SettingValue {
	if (typeof value === "string") return value;
	if (typeof value === "number") return value;
	if (typeof value === "boolean") return value;

	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function normalizeSetting(x: SystemSetting): SystemSetting {
	return {
		_id: x._id,
		key: safeString(x.key),
		value: coerceSettingValue((x as { value?: unknown }).value),
		module:
			isObj(x) && "module" in x
				? typeof (x as { module?: unknown }).module === "string"
					? (x as { module?: string }).module
					: null
				: null,
		description:
			isObj(x) && "description" in x
				? safeString((x as { description?: unknown }).description)
				: "",
	};
}

function upsertSetting(
	prev: SystemSetting[],
	saved: SystemSetting,
): SystemSetting[] {
	const exists = !!saved._id && prev.some((item) => item._id === saved._id);

	if (!exists) {
		return [saved, ...prev];
	}

	return prev.map((item) => (item._id === saved._id ? saved : item));
}

export default function SettingsDataGrid() {
	const { locale } = useTranslation();
	const toast = useToast();

	/* =============================================================================
	 * Text
	 * ============================================================================= */

	const t = useMemo(
		() => ({
			title:
				locale === "es" ? "Configuraciones del Sistema" : "System Settings",
			subtitle:
				locale === "es"
					? "Crea y administra configuraciones globales."
					: "Create and manage global settings.",

			newSetting: locale === "es" ? "Nueva configuración" : "New setting",
			refresh: locale === "es" ? "Refrescar" : "Refresh",
			deleteSelected:
				locale === "es" ? "Eliminar seleccionados" : "Delete selected",

			key: "Key",
			value: "Value",
			type: "Type",
			module: "Module",
			description: "Description",
			actions: locale === "es" ? "Acciones" : "Actions",

			loading:
				locale === "es" ? "Cargando configuraciones..." : "Loading settings...",
			noResults: locale === "es" ? "Sin resultados." : "No results.",

			resultsShort: (n: number) =>
				n === 0
					? locale === "es"
						? "Sin resultados."
						: "No results."
					: locale === "es"
						? `Resultados: ${n}`
						: `Results: ${n}`,

			resultsLabel: (from: number, to: number, total: number) =>
				total === 0
					? locale === "es"
						? "Sin resultados."
						: "No results."
					: locale === "es"
						? `Mostrando ${from}–${to} de ${total}`
						: `Showing ${from}–${to} of ${total}`,

			pageLabel: (page: number, total: number) =>
				locale === "es"
					? `Página ${page} de ${total}`
					: `Page ${page} of ${total}`,

			loadError:
				locale === "es"
					? "Error al cargar configuraciones."
					: "Error loading settings.",
			createError:
				locale === "es"
					? "Error al crear configuración."
					: "Error creating setting.",
			updateError:
				locale === "es"
					? "Error al actualizar configuración."
					: "Error updating setting.",
			deleteError:
				locale === "es"
					? "Error al eliminar configuración."
					: "Error deleting setting.",
			bulkDeleteError:
				locale === "es"
					? "Error al eliminar seleccionadas."
					: "Error deleting selected settings.",

			createSuccess:
				locale === "es"
					? "Configuración creada correctamente."
					: "Setting created successfully.",
			updateSuccess:
				locale === "es"
					? "Configuración actualizada correctamente."
					: "Setting updated successfully.",
			deleteSuccess:
				locale === "es"
					? "Configuración eliminada correctamente."
					: "Setting deleted successfully.",

			bulkSummary: (success: number, fail: number) =>
				locale === "es"
					? `Se eliminaron ${success}, ${fail} fallaron.`
					: `${success} deleted, ${fail} failed.`,

			filterKeyPlaceholder:
				locale === "es" ? "Buscar por key..." : "Search key...",
			filterModulePlaceholder:
				locale === "es" ? "Buscar por módulo..." : "Search module...",

			confirmDeleteTitle:
				locale === "es" ? "Confirmar eliminación" : "Confirm delete",
			confirmDeleteMessage:
				locale === "es"
					? "¿Eliminar configuraciones seleccionadas?"
					: "Delete selected settings?",
			confirmDeleteWarning:
				locale === "es"
					? "Esta acción no se puede deshacer."
					: "This action cannot be undone.",

			cancel: locale === "es" ? "Cancelar" : "Cancel",
			delete: locale === "es" ? "Eliminar" : "Delete",

			tooltipEdit: locale === "es" ? "Editar" : "Edit",
			tooltipDelete: locale === "es" ? "Eliminar" : "Delete",
		}),
		[locale],
	);

	/* =============================================================================
	 * State
	 * ============================================================================= */

	const [settings, setSettings] = useState<SystemSetting[]>([]);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);

	const [page, setPage] = useState(1);
	const [recordsPerPage, setRecordsPerPage] = useState(10);

	const [searchKey, setSearchKey] = useState("");
	const [searchModule, setSearchModule] = useState("");

	const [modalOpen, setModalOpen] = useState(false);
	const [editing, setEditing] = useState<SystemSetting | null>(null);

	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [bulkDeleting, setBulkDeleting] = useState(false);

	/* =============================================================================
	 * Helper logic
	 * ============================================================================= */

	const detectType = (value: SettingValue): FormType => {
		if (typeof value === "boolean") return "boolean";
		if (typeof value === "number") return "number";
		return "string";
	};

	const normalizeValue = (value: unknown, type: FormType): SettingValue => {
		if (type === "number") return Number(value);
		if (type === "boolean") return value === "true" || value === true;
		return String(value);
	};

	function toModalData(s: SystemSetting): SettingsModalData {
		return {
			key: s.key,
			value: s.value,
			module: s.module ?? "",
			description: s.description ?? "",
		};
	}

	/* =============================================================================
	 * Load settings
	 * ============================================================================= */

	useEffect(() => {
		async function runInitialLoad() {
			try {
				setLoading(true);

				const res = await fetch("/api/admin/settings", {
					headers: { "accept-language": locale },
				});

				const json: unknown = await res.json().catch(() => null);

				if (!res.ok || !isApiOk<SystemSetting[]>(json)) {
					toast.error(t.loadError);
					return;
				}

				const raw = (json as ApiOk<SystemSetting[]>).data;

				const data: SystemSetting[] = raw.map(normalizeSetting);

				setSettings(data);

				const perPage = data.find(
					(x) => x.key === "recordsPerPageConfiguration",
				);

				if (perPage) {
					const parsed = Number(perPage.value);
					if (!Number.isNaN(parsed) && parsed > 0) {
						setRecordsPerPage(parsed);
					}
				}

				setPage(1);
				setSelectedIds([]);
			} catch {
				toast.error(t.loadError);
			} finally {
				setLoading(false);
			}
		}

		void runInitialLoad();
	}, [locale, toast, t.loadError]);

	useEffect(() => {
		setPage(1);
	}, [searchKey, searchModule]);

	useEffect(() => {
		const validIds = new Set(
			settings.map((s) => s._id).filter((id): id is string => !!id),
		);

		setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
	}, [settings]);

	/* =============================================================================
	 * Submit
	 * ============================================================================= */

	const handleSubmit = async (data: SettingsModalData) => {
		const type = detectType(data.value as SettingValue);
		const parsed = normalizeValue(data.value, type);
		const isEditing = !!editing;

		const keyTrim = safeString(data.key).trim();

		try {
			setSaving(true);

			const res = await fetch("/api/admin/settings", {
				method: isEditing ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					"accept-language": locale,
				},
				body: JSON.stringify({
					...data,
					key: keyTrim,
					value: parsed,
					_id: editing?._id,
				}),
			});

			const json: unknown = await res.json().catch(() => null);

			if (!res.ok || !isApiOk<SystemSetting>(json)) {
				toast.error(isEditing ? t.updateError : t.createError);
				return;
			}

			const saved = normalizeSetting((json as ApiOk<SystemSetting>).data);

			toast.success(isEditing ? t.updateSuccess : t.createSuccess);

			setSettings((prev) => upsertSetting(prev, saved));
			setModalOpen(false);
			setEditing(null);

			if (BRANDING_KEYS.has(keyTrim)) {
				notifyBrandingUpdated();
			}
		} catch {
			toast.error(isEditing ? t.updateError : t.createError);
		} finally {
			setSaving(false);
		}
	};

	/* =============================================================================
	 * Delete
	 * ============================================================================= */

	const deleteOne = async (id: string): Promise<boolean> => {
		try {
			const res = await fetch(`/api/admin/settings?id=${id}`, {
				method: "DELETE",
				headers: { "accept-language": locale },
			});

			const json: unknown = await res.json().catch(() => null);
			return res.ok && isApiOk<unknown>(json);
		} catch {
			return false;
		}
	};

	const deleteSelectedSettings = async () => {
		if (selectedIds.length === 0) return;

		const idsToDelete = [...selectedIds];

		const selectedBrandingHit = settings.some(
			(s) => s._id && idsToDelete.includes(s._id) && BRANDING_KEYS.has(s.key),
		);

		setBulkDeleting(true);

		try {
			let success = 0;
			let fail = 0;

			for (const id of idsToDelete) {
				if (await deleteOne(id)) success++;
				else fail++;
			}

			if (success > 0) {
				const deletedSet = new Set(idsToDelete);

				setSettings((prev) =>
					prev.filter((s) => !s._id || !deletedSet.has(s._id)),
				);
				setSelectedIds((prev) => prev.filter((id) => !deletedSet.has(id)));

				if (editing?._id && deletedSet.has(editing._id)) {
					setEditing(null);
					setModalOpen(false);
				}
			}

			if (fail === 0) toast.success(t.deleteSuccess);
			else toast.error(t.bulkSummary(success, fail));

			setShowDeleteModal(false);

			if (selectedBrandingHit && success > 0) {
				notifyBrandingUpdated();
			}
		} catch {
			toast.error(t.bulkDeleteError);
		} finally {
			setBulkDeleting(false);
		}
	};

	/* =============================================================================
	 * Filtering and pagination
	 * ============================================================================= */

	const filtered = settings.filter((s) => {
		const mKey =
			!searchKey || s.key.toLowerCase().includes(searchKey.toLowerCase());
		const mMod =
			!searchModule ||
			(s.module ?? "").toLowerCase().includes(searchModule.toLowerCase());
		return mKey && mMod;
	});

	const totalResults = filtered.length;
	const totalPages =
		totalResults > 0 ? Math.ceil(totalResults / recordsPerPage) : 1;

	const currentPage = Math.min(page, totalPages);

	const paginated = filtered.slice(
		(currentPage - 1) * recordsPerPage,
		currentPage * recordsPerPage,
	);

	const pageIds = paginated
		.map((s) => s._id)
		.filter((id): id is string => !!id);

	const allSelected =
		pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

	const toggleSelectAll = () => {
		if (allSelected) {
			setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
		} else {
			setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
		}
	};

	const toggleOne = (id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const pageFrom =
		totalResults === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
	const pageTo = Math.min(totalResults, currentPage * recordsPerPage);

	/* =============================================================================
	 * Render
	 * ============================================================================= */

	const deleteMessage = `${t.confirmDeleteMessage}\n\n${t.confirmDeleteWarning}`;

	return (
		<>
			<GlobalDataGridShell
				title={t.title}
				subtitle={t.subtitle}
				icon={<SettingsIcon className="h-7 w-7 text-brand-primaryStrong" />}
				actions={
					<div className="flex flex-wrap justify-end gap-2">
						<GlobalButton
							variant="secondary"
							size="sm"
							leftIcon={<RefreshCw size={14} />}
							loading={loading}
							className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
							onClick={async () => {
								try {
									setSearchKey("");
									setSearchModule("");
									setPage(1);
									setSelectedIds([]);
									setLoading(true);

									const res = await fetch("/api/admin/settings", {
										headers: { "accept-language": locale },
									});

									const json: unknown = await res.json().catch(() => null);

									if (!res.ok || !isApiOk<SystemSetting[]>(json)) {
										toast.error(t.loadError);
										return;
									}

									const raw = (json as ApiOk<SystemSetting[]>).data;
									const data: SystemSetting[] = raw.map(normalizeSetting);

									setSettings(data);

									const perPage = data.find(
										(x) => x.key === "recordsPerPageConfiguration",
									);

									if (perPage) {
										const parsed = Number(perPage.value);
										if (!Number.isNaN(parsed) && parsed > 0) {
											setRecordsPerPage(parsed);
										}
									}
								} catch {
									toast.error(t.loadError);
								} finally {
									setLoading(false);
								}
							}}
						>
							{t.refresh}
						</GlobalButton>

						<GlobalButton
							variant="danger"
							size="sm"
							leftIcon={<Trash2 size={14} />}
							disabled={selectedIds.length === 0}
							className="border border-status-error bg-surface text-status-error hover:bg-surface-soft disabled:border-border disabled:text-text-muted"
							onClick={() => setShowDeleteModal(true)}
						>
							{t.deleteSelected}
						</GlobalButton>

						<GlobalButton
							variant="primary"
							size="sm"
							leftIcon={<Plus size={14} />}
							className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
							onClick={() => {
								setEditing(null);
								setModalOpen(true);
							}}
						>
							{t.newSetting}
						</GlobalButton>
					</div>
				}
				filters={
					<div className="flex flex-col gap-3">
						<div className="grid max-w-2xl gap-2 md:grid-cols-2">
							<div className="flex flex-col">
								<label
									htmlFor="settings-filter-key"
									className="mb-1 text-[11px] text-text-secondary"
								>
									{t.key}
								</label>
								<div className="relative">
									<Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
									<input
										id="settings-filter-key"
										name="settings-filter-key"
										value={searchKey}
										onChange={(e) => setSearchKey(e.target.value)}
										placeholder={t.filterKeyPlaceholder}
										className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									/>
								</div>
							</div>

							<div className="flex flex-col">
								<label
									htmlFor="settings-filter-module"
									className="mb-1 text-[11px] text-text-secondary"
								>
									{t.module}
								</label>
								<div className="relative">
									<Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
									<input
										id="settings-filter-module"
										name="settings-filter-module"
										value={searchModule}
										onChange={(e) => setSearchModule(e.target.value)}
										placeholder={t.filterModulePlaceholder}
										className="w-full rounded-md border border-border bg-surface px-2 py-1 pl-7 text-xs text-text-primary outline-none placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
									/>
								</div>
							</div>
						</div>

						<span className="text-[11px] text-text-muted">
							{t.resultsShort(totalResults)}
						</span>
					</div>
				}
				footer={
					<div className="flex w-full items-center justify-between text-xs text-text-secondary">
						<span>{t.resultsLabel(pageFrom, pageTo, totalResults)}</span>

						<div className="flex items-center gap-2">
							<GlobalButton
								variant="secondary"
								size="sm"
								className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
								disabled={currentPage === 1}
								onClick={() => setPage(1)}
							>
								«
							</GlobalButton>

							<GlobalButton
								variant="secondary"
								size="sm"
								className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
								disabled={currentPage === 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								‹
							</GlobalButton>

							<span>{t.pageLabel(currentPage, totalPages)}</span>

							<GlobalButton
								variant="secondary"
								size="sm"
								className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
								disabled={currentPage === totalPages || totalResults === 0}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								›
							</GlobalButton>

							<GlobalButton
								variant="secondary"
								size="sm"
								className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
								disabled={currentPage === totalPages || totalResults === 0}
								onClick={() => setPage(totalPages)}
							>
								»
							</GlobalButton>
						</div>
					</div>
				}
			>
				<table className="w-full border-collapse text-left text-sm text-text-secondary">
					<thead>
						<tr className="border-b border-border bg-surface-soft text-text-primary">
							<th className="w-10 px-3 py-3">#</th>

							<th className="w-10 px-3 py-3 text-center">
								<div className="flex justify-center">
									<input
										id="settings-select-all"
										name="settings-select-all"
										type="checkbox"
										checked={allSelected}
										onChange={toggleSelectAll}
										className="h-4 w-4"
									/>
									<label htmlFor="settings-select-all" className="sr-only">
										Select all
									</label>
								</div>
							</th>

							<th className="px-3 py-3">{t.key}</th>
							<th className="px-3 py-3">{t.value}</th>
							<th className="px-3 py-3">{t.type}</th>
							<th className="px-3 py-3">{t.module}</th>
							<th className="px-3 py-3">{t.description}</th>
							<th className="px-3 py-3 text-right">{t.actions}</th>
						</tr>
					</thead>

					<tbody>
						{loading ? (
							<tr>
								<td
									colSpan={8}
									className="px-3 py-5 text-center text-text-secondary"
								>
									{t.loading}
								</td>
							</tr>
						) : paginated.length === 0 ? (
							<tr>
								<td
									colSpan={8}
									className="px-3 py-5 text-center text-text-muted"
								>
									{t.noResults}
								</td>
							</tr>
						) : (
							paginated.map((s, idx) => {
								const id = s._id as string;
								const checked = selectedIds.includes(id);

								return (
									<tr
										key={id}
										className={`border-b border-border transition ${
											checked ? "bg-surface-soft" : "bg-surface"
										} hover:bg-surface-soft`}
									>
										<td className="w-10 px-3 py-3 text-text-secondary">
											{(currentPage - 1) * recordsPerPage + idx + 1}
										</td>

										<td className="w-10 px-3 py-3 text-center">
											<input
												id={`settings-row-${id}`}
												name={`settings-row-${id}`}
												type="checkbox"
												checked={checked}
												onChange={() => toggleOne(id)}
												className="h-4 w-4"
											/>
										</td>

										<td className="px-3 py-3 font-semibold text-brand-primaryStrong">
											{s.key}
										</td>
										<td className="px-3 py-3 text-text-primary">
											{String(s.value)}
										</td>
										<td className="px-3 py-3 text-text-primary">
											{detectType(s.value)}
										</td>
										<td className="px-3 py-3 text-text-secondary">
											{s.module || "—"}
										</td>
										<td className="px-3 py-3 text-text-secondary">
											{s.description || "—"}
										</td>

										<td className="px-3 py-3 text-right">
											<div className="inline-flex gap-2">
												<button
													type="button"
													onClick={() => {
														setEditing(s);
														setModalOpen(true);
													}}
													className="rounded-md border border-border bg-surface p-1.5 text-text-primary transition hover:bg-surface-soft"
													title={t.tooltipEdit}
												>
													<Edit3 size={16} />
												</button>

												<button
													type="button"
													onClick={() => {
														setSelectedIds([id]);
														setShowDeleteModal(true);
													}}
													className="rounded-md border border-status-error bg-surface p-1.5 text-status-error transition hover:bg-surface-soft"
													title={t.tooltipDelete}
												>
													<Trash2 size={16} />
												</button>
											</div>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</GlobalDataGridShell>

			<GlobalConfirm
				open={showDeleteModal}
				title={t.confirmDeleteTitle}
				message={deleteMessage}
				cancelLabel={t.cancel}
				confirmLabel={t.delete}
				loading={bulkDeleting}
				onCancel={() => {
					if (!bulkDeleting) setShowDeleteModal(false);
				}}
				onConfirm={() => void deleteSelectedSettings()}
			/>

			<SettingsModal
				open={modalOpen}
				editing={!!editing}
				loading={saving}
				data={editing ? toModalData(editing) : EMPTY_SETTING}
				onClose={() => {
					if (!saving) {
						setModalOpen(false);
						setEditing(null);
					}
				}}
				onSubmit={handleSubmit}
			/>
		</>
	);
}
