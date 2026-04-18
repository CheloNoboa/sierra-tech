"use client";

/**
 * =============================================================================
 * 📌 Component: SettingsModal
 * Path: src/components/SettingsModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal administrativo para crear y editar configuraciones del sistema.
 * - Permite definir:
 *   - key
 *   - value
 *   - type
 *   - module
 *   - description
 *
 * Responsabilidades:
 * - Cargar una referencia inicial estable al abrirse.
 * - Mantener el formulario editable sin reinicializaciones innecesarias.
 * - Detectar cambios sin guardar.
 * - Normalizar el valor según el tipo seleccionado antes de enviar.
 * - Delegar persistencia al callback `onSubmit`.
 *
 * Reglas:
 * - El modal no persiste directamente en API.
 * - Cuando `editing === true`, no permite cambiar `key` ni `type`.
 * - El estado inicial se toma solo cuando `open` cambia a abierto.
 * - El cierre se bloquea con confirmación si existen cambios sin guardar.
 *
 * EN:
 * - Administrative modal for creating and editing system settings.
 * - Keeps a stable initial snapshot, tracks unsaved changes, normalizes the
 *   typed value before submit and delegates persistence through `onSubmit`.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import GlobalModal from "@/components/ui/GlobalModal";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";
import { useTranslation } from "@/hooks/useTranslation";

type SettingValueType = "string" | "number" | "boolean";

export interface SettingsModalData {
	key: string;
	value: string | number | boolean;
	type?: SettingValueType;
	module?: string;
	description?: string;
}

interface Props {
	open: boolean;
	editing: boolean;
	loading?: boolean;
	data: SettingsModalData;
	onClose: () => void;
	onSubmit: (data: SettingsModalData) => void;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function inferTypeFromValue(
	value: string | number | boolean,
): SettingValueType {
	if (typeof value === "boolean") {
		return "boolean";
	}

	if (typeof value === "number") {
		return "number";
	}

	return "string";
}

function normalizeType(value: unknown): SettingValueType | null {
	return value === "string" || value === "number" || value === "boolean"
		? value
		: null;
}

function cloneModalData(data: SettingsModalData): SettingsModalData {
	return {
		key: typeof data.key === "string" ? data.key : "",
		value:
			typeof data.value === "string" ||
			typeof data.value === "number" ||
			typeof data.value === "boolean"
				? data.value
				: "",
		type: normalizeType(data.type) ?? inferTypeFromValue(data.value),
		module: typeof data.module === "string" ? data.module : "",
		description: typeof data.description === "string" ? data.description : "",
	};
}

export default function SettingsModal({
	open,
	editing,
	loading = false,
	data,
	onClose,
	onSubmit,
}: Props) {
	const { locale } = useTranslation();

	/* ------------------------------------------------------------------------ */
	/* Stable snapshot                                                          */
	/* ------------------------------------------------------------------------ */

	const initialRef = useRef<SettingsModalData | null>(null);
	const previousOpenRef = useRef<boolean>(false);

	const [form, setForm] = useState<SettingsModalData>({
		key: "",
		value: "",
		type: "string",
		module: "",
		description: "",
	});

	const [type, setType] = useState<SettingValueType>("string");
	const [showUnsaved, setShowUnsaved] = useState(false);

	/* ------------------------------------------------------------------------ */
	/* Copy                                                                     */
	/* ------------------------------------------------------------------------ */

	const t = useMemo(
		() => ({
			title: editing
				? locale === "es"
					? "Editar configuración"
					: "Edit setting"
				: locale === "es"
					? "Nueva configuración"
					: "New setting",

			save: locale === "es" ? "Guardar" : "Save",
			cancel: locale === "es" ? "Cancelar" : "Cancel",

			key: locale === "es" ? "Clave" : "Key",
			value: locale === "es" ? "Valor" : "Value",
			module: locale === "es" ? "Módulo" : "Module",
			description: locale === "es" ? "Descripción" : "Description",
			type: locale === "es" ? "Tipo" : "Type",

			stringType: locale === "es" ? "Texto" : "String",
			numberType: locale === "es" ? "Número" : "Number",
			booleanType: locale === "es" ? "Booleano" : "Boolean",

			booleanTrue: locale === "es" ? "Verdadero" : "True",
			booleanFalse: locale === "es" ? "Falso" : "False",

			unsavedTitle: locale === "es" ? "Cambios sin guardar" : "Unsaved changes",
			unsavedMessage:
				locale === "es"
					? "Tienes cambios sin guardar. ¿Deseas salir sin guardar?"
					: "You have unsaved changes. Leave without saving?",
			unsavedCancel: locale === "es" ? "Seguir editando" : "Continue editing",
			unsavedConfirm: locale === "es" ? "Descartar cambios" : "Discard changes",
		}),
		[editing, locale],
	);

	/* ------------------------------------------------------------------------ */
	/* Load initial data only on closed -> open transition                      */
	/* ------------------------------------------------------------------------ */

	useEffect(() => {
		const isOpening = open && !previousOpenRef.current;

		if (isOpening) {
			const snapshot = cloneModalData(data);

			initialRef.current = snapshot;
			setForm(snapshot);
			setType(snapshot.type ?? inferTypeFromValue(snapshot.value));
			setShowUnsaved(false);
		}

		if (!open) {
			setShowUnsaved(false);
		}

		previousOpenRef.current = open;
	}, [open, data]);

	/* ------------------------------------------------------------------------ */
	/* Unsaved changes detection                                                */
	/* ------------------------------------------------------------------------ */

	const hasChanges = useMemo(() => {
		if (!initialRef.current) {
			return false;
		}

		const initial = initialRef.current;

		return (
			form.key !== initial.key ||
			String(form.value) !== String(initial.value) ||
			type !== (initial.type ?? inferTypeFromValue(initial.value)) ||
			(form.module ?? "") !== (initial.module ?? "") ||
			(form.description ?? "") !== (initial.description ?? "")
		);
	}, [form, type]);

	/* ------------------------------------------------------------------------ */
	/* Validation + normalization                                               */
	/* ------------------------------------------------------------------------ */

	const normalizedValue = useMemo(() => {
		if (type === "boolean") {
			return form.value === true || String(form.value) === "true";
		}

		if (type === "number") {
			const parsed = Number(form.value);
			return Number.isFinite(parsed) ? parsed : NaN;
		}

		return String(form.value);
	}, [form.value, type]);

	const isValid = useMemo(() => {
		const keyIsValid = form.key.trim().length > 0;

		if (!keyIsValid) {
			return false;
		}

		if (type === "boolean") {
			return true;
		}

		if (type === "number") {
			return (
				typeof normalizedValue === "number" && Number.isFinite(normalizedValue)
			);
		}

		return String(form.value).trim().length > 0;
	}, [form.key, form.value, normalizedValue, type]);

	const canSave = hasChanges && isValid && !loading;

	/* ------------------------------------------------------------------------ */
	/* Submit                                                                   */
	/* ------------------------------------------------------------------------ */

	const handleSave = () => {
		if (!canSave) {
			return;
		}

		onSubmit({
			key: form.key.trim(),
			value: normalizedValue,
			type,
			module: (form.module ?? "").trim(),
			description: (form.description ?? "").trim(),
		});
	};

	/* ------------------------------------------------------------------------ */
	/* Close handling                                                           */
	/* ------------------------------------------------------------------------ */

	const requestClose = () => {
		if (loading) {
			return;
		}

		if (hasChanges) {
			setShowUnsaved(true);
			return;
		}

		onClose();
	};

	/* ------------------------------------------------------------------------ */
	/* Render                                                                   */
	/* ------------------------------------------------------------------------ */

	return (
		<>
			<GlobalModal
				open={open}
				onClose={requestClose}
				title={t.title}
				size="lg"
				showCloseButton={false}
				footer={
					<div className="flex justify-end gap-3">
						<GlobalButton
							variant="secondary"
							size="sm"
							className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
							onClick={requestClose}
							disabled={loading}
						>
							{t.cancel}
						</GlobalButton>

						<GlobalButton
							variant="primary"
							size="sm"
							className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
							disabled={!canSave}
							onClick={handleSave}
							loading={loading}
						>
							{t.save}
						</GlobalButton>
					</div>
				}
			>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label
							htmlFor="settings-key"
							className="text-xs font-medium text-text-secondary"
						>
							{t.key}
						</label>
						<input
							id="settings-key"
							disabled={editing}
							className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-60"
							value={form.key}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, key: event.target.value }))
							}
						/>
					</div>

					<div>
						<label
							htmlFor="settings-type"
							className="text-xs font-medium text-text-secondary"
						>
							{t.type}
						</label>

						<select
							id="settings-type"
							disabled={editing}
							className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary disabled:cursor-not-allowed disabled:opacity-60"
							value={type}
							onChange={(event) =>
								setType(event.target.value as SettingValueType)
							}
						>
							<option value="string">{t.stringType}</option>
							<option value="number">{t.numberType}</option>
							<option value="boolean">{t.booleanType}</option>
						</select>
					</div>

					<div className="md:col-span-2">
						<label
							htmlFor="settings-value"
							className="text-xs font-medium text-text-secondary"
						>
							{t.value}
						</label>

						{type === "boolean" ? (
							<select
								id="settings-value"
								className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								value={String(
									form.value === true || String(form.value) === "true",
								)}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, value: event.target.value }))
								}
							>
								<option value="true">{t.booleanTrue}</option>
								<option value="false">{t.booleanFalse}</option>
							</select>
						) : (
							<input
								id="settings-value"
								type={type === "number" ? "number" : "text"}
								inputMode={type === "number" ? "decimal" : "text"}
								className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
								value={String(form.value)}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, value: event.target.value }))
								}
							/>
						)}
					</div>

					<div>
						<label
							htmlFor="settings-module"
							className="text-xs font-medium text-text-secondary"
						>
							{t.module}
						</label>
						<input
							id="settings-module"
							className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
							value={form.module ?? ""}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, module: event.target.value }))
							}
						/>
					</div>

					<div>
						<label
							htmlFor="settings-description"
							className="text-xs font-medium text-text-secondary"
						>
							{t.description}
						</label>
						<input
							id="settings-description"
							className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
							value={form.description ?? ""}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									description: event.target.value,
								}))
							}
						/>
					</div>
				</div>
			</GlobalModal>

			<GlobalUnsavedChangesConfirm
				open={showUnsaved}
				title={t.unsavedTitle}
				message={t.unsavedMessage}
				cancelLabel={t.unsavedCancel}
				confirmLabel={t.unsavedConfirm}
				onCancel={() => setShowUnsaved(false)}
				onConfirm={() => {
					setShowUnsaved(false);
					onClose();
				}}
			/>
		</>
	);
}
