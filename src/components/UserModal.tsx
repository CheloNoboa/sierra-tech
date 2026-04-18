"use client";

/**
 * =============================================================================
 * 📌 Component: UserModal
 * Path: src/components/UserModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal administrativo para crear o editar usuarios del sistema.
 * - Permite capturar:
 *   - nombre
 *   - email
 *   - rol
 *   - teléfono
 *   - estado activo
 *   - contraseña y confirmación en creación
 *
 * Responsabilidades:
 * - Funcionar de forma consistente en creación y edición.
 * - Integrar `PhoneField` con formato persistente E.164.
 * - Validar contraseñas únicamente cuando se crea un usuario.
 * - Confirmar cierre cuando existen cambios sin guardar.
 * - Enviar payload final al endpoint administrativo de usuarios.
 * - Devolver al padre el usuario persistido para upsert local sin reload.
 *
 * Reglas:
 * - Esta base reusable no maneja sucursales.
 * - No envía `branchId` al backend.
 * - En edición no se envían contraseñas.
 * - El botón guardar solo se habilita si hay cambios reales.
 *
 * EN:
 * - Administrative modal for creating or editing system users.
 * - Returns the persisted user to the parent for local upsert.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import PhoneField, { type PhoneValue } from "@/components/phone/PhoneField";
import {
	extractNationalFromE164,
	DEFAULT_COUNTRY,
} from "@/components/phone/PhoneUtils";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/components/ui/GlobalToastProvider";

import GlobalModal from "@/components/ui/GlobalModal";
import GlobalButton from "@/components/ui/GlobalButton";
import GlobalUnsavedChangesConfirm from "@/components/ui/GlobalUnsavedChangesConfirm";

import type { RoleDTO, UserDTO, UserFormValues } from "./users/types";

/* =============================================================================
 * Helpers
 * ============================================================================= */

const DEFAULT_PHONE: PhoneValue = {
	countryCode: "US",
	dialCode: "+1",
	nationalNumber: "",
	e164: "+1",
};

function isObj(x: unknown): x is Record<string, unknown> {
	return !!x && typeof x === "object" && !Array.isArray(x);
}

function getString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function getBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function phoneValueFromE164(phone?: string | null): PhoneValue {
	if (!phone) return DEFAULT_PHONE;

	const { country, nationalNumber } = extractNationalFromE164(phone);
	const dial = `+${country.dialCode || DEFAULT_COUNTRY.dialCode}`;

	return {
		countryCode: (country.code ||
			DEFAULT_COUNTRY.code) as PhoneValue["countryCode"],
		dialCode: dial,
		nationalNumber,
		e164: `${dial}${nationalNumber}`,
	};
}

function buildInitialForm(
	user: UserDTO | null,
	roles: RoleDTO[],
): UserFormValues {
	return {
		name: user?.name ?? "",
		email: user?.email ?? "",
		role: user?.role ?? (roles.length > 0 ? roles[0].code : ""),
		phone: phoneValueFromE164(user?.phone ?? null),
		active: user?.active ?? true,
		password: "",
		confirmPassword: "",
	};
}

function serializeForm(values: UserFormValues): string {
	return JSON.stringify({
		name: values.name.trim(),
		email: values.email.trim(),
		role: values.role,
		phone: values.phone.e164,
		active: values.active,
		password: values.password,
		confirmPassword: values.confirmPassword,
	});
}

function isUserDTO(value: unknown): value is UserDTO {
	if (!isObj(value)) return false;
	if (typeof value._id !== "string") return false;
	if (typeof value.name !== "string") return false;
	if (typeof value.email !== "string") return false;
	if (typeof value.role !== "string") return false;
	if (typeof value.active !== "boolean") return false;

	if (
		value.phone !== undefined &&
		value.phone !== null &&
		typeof value.phone !== "string"
	) {
		return false;
	}

	return true;
}

function extractSavedUserCandidate(raw: unknown): unknown {
	if (!isObj(raw)) return null;

	if (isObj(raw.user)) return raw.user;
	if (isObj(raw.data)) return raw.data;
	if (isObj(raw.item)) return raw.item;

	return raw;
}

function normalizeSavedUser(
	raw: unknown,
	context: {
		existingUser: UserDTO | null;
		values: UserFormValues;
	},
): UserDTO | null {
	const candidate = extractSavedUserCandidate(raw);

	if (isUserDTO(candidate)) {
		return candidate;
	}

	if (context.existingUser) {
		const source = isObj(candidate) ? candidate : null;

		const merged: UserDTO = {
			...context.existingUser,
			_id: getString(source?._id) || context.existingUser._id,
			name: getString(source?.name) || context.values.name.trim(),
			email: getString(source?.email) || context.values.email.trim(),
			role: getString(source?.role) || context.values.role,
			phone:
				typeof source?.phone === "string"
					? source.phone
					: source?.phone === null
						? null
						: context.values.phone.e164,
			active: getBoolean(source?.active, context.values.active),
		};

		return merged;
	}

	return null;
}

/* =============================================================================
 * Component
 * ============================================================================= */

interface UserModalProps {
	isOpen: boolean;
	user: UserDTO | null;
	roles: RoleDTO[];
	onClose: () => void;
	onSaved: (savedUser: UserDTO) => void;
}

export default function UserModal({
	isOpen,
	user,
	roles,
	onClose,
	onSaved,
}: UserModalProps) {
	const { locale } = useTranslation();
	const toast = useToast();
	const isEditing = !!user;

	const t = useMemo(
		() => ({
			newUser: locale === "es" ? "Nuevo usuario" : "New user",
			editUser: locale === "es" ? "Editar usuario" : "Edit user",

			name: locale === "es" ? "Nombre" : "Name",
			email: "Email",
			role: locale === "es" ? "Rol" : "Role",
			phone: locale === "es" ? "Teléfono" : "Phone",
			active: locale === "es" ? "Activo" : "Active",

			password: locale === "es" ? "Contraseña temporal" : "Temporary password",
			confirmPassword:
				locale === "es" ? "Confirmar contraseña" : "Confirm password",
			mismatch:
				locale === "es"
					? "Las contraseñas no coinciden"
					: "Passwords do not match",

			cancel: locale === "es" ? "Cancelar" : "Cancel",
			save: locale === "es" ? "Guardar" : "Save",
			saving: locale === "es" ? "Guardando..." : "Saving...",

			unsavedTitle: locale === "es" ? "Cambios sin guardar" : "Unsaved changes",
			unsavedMessage:
				locale === "es"
					? "Tienes cambios sin guardar. ¿Salir sin guardar?"
					: "You have unsaved changes. Leave without saving?",
			unsavedCancel: locale === "es" ? "Seguir editando" : "Keep editing",
			unsavedConfirm:
				locale === "es" ? "Salir sin guardar" : "Leave without saving",

			createdOk:
				locale === "es"
					? "Usuario creado correctamente."
					: "User created successfully.",
			updatedOk:
				locale === "es"
					? "Usuario actualizado correctamente."
					: "User updated successfully.",

			genericError: locale === "es" ? "Error al guardar." : "Error saving.",
			invalidSavedUser:
				locale === "es"
					? "El backend no devolvió un usuario válido para actualizar la grilla."
					: "The backend did not return a valid user for grid update.",

			showPassword: locale === "es" ? "Mostrar contraseña" : "Show password",
			hidePassword: locale === "es" ? "Ocultar contraseña" : "Hide password",
			showConfirm:
				locale === "es"
					? "Mostrar confirmación de contraseña"
					: "Show password confirmation",
			hideConfirm:
				locale === "es"
					? "Ocultar confirmación de contraseña"
					: "Hide password confirmation",
		}),
		[locale],
	);

	const [form, setForm] = useState<UserFormValues>(
		buildInitialForm(user, roles),
	);
	const [initialSnapshot, setInitialSnapshot] = useState<string>("");

	const [saving, setSaving] = useState(false);
	const [showUnsaved, setShowUnsaved] = useState(false);

	const [showPass, setShowPass] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);

	useEffect(() => {
		if (!isOpen) return;

		const built = buildInitialForm(user, roles);
		setForm(built);
		setInitialSnapshot(serializeForm(built));
		setShowPass(false);
		setShowConfirm(false);
		setShowUnsaved(false);
	}, [isOpen, user, roles]);

	if (!isOpen) return null;

	const hasChanges = serializeForm(form) !== initialSnapshot;

	const isFormValid = (): boolean => {
		if (!form.name.trim()) return false;
		if (!form.email.trim()) return false;
		if (!form.role.trim()) return false;
		if (!form.phone.nationalNumber.trim()) return false;

		if (
			(form.phone.countryCode === "US" || form.phone.countryCode === "CA") &&
			form.phone.nationalNumber.length !== 10
		) {
			return false;
		}

		if (!isEditing) {
			if (!form.password.trim() || !form.confirmPassword.trim()) return false;
			if (form.password !== form.confirmPassword) return false;
		}

		return true;
	};

	const canSave = hasChanges && isFormValid() && !saving;

	const requestClose = () => {
		if (hasChanges) {
			setShowUnsaved(true);
			return;
		}

		onClose();
	};

	const handleSave = async () => {
		if (!canSave) return;

		try {
			setSaving(true);

			const payload = {
				name: form.name.trim(),
				email: form.email.trim(),
				role: form.role,
				phone: form.phone.e164,
				active: form.active,
			};

			const res = await fetch("/api/admin/users", {
				method: isEditing ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					"x-lang": locale,
				},
				body: JSON.stringify(
					isEditing
						? { _id: user?._id, ...payload }
						: { ...payload, password: form.password },
				),
			});

			const json = (await res.json().catch(() => null)) as {
				error?: string;
				message?: string;
				user?: unknown;
				data?: unknown;
				item?: unknown;
			} | null;

			if (!res.ok) {
				toast.error(json?.error ?? json?.message ?? t.genericError);
				return;
			}

			const savedUser = normalizeSavedUser(json, {
				existingUser: user,
				values: form,
			});

			if (!savedUser) {
				toast.error(t.invalidSavedUser);
				return;
			}

			toast.success(json?.message ?? (isEditing ? t.updatedOk : t.createdOk));
			onSaved(savedUser);
			setShowUnsaved(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<GlobalModal
				open={isOpen}
				onClose={requestClose}
				title={isEditing ? t.editUser : t.newUser}
				size="lg"
				showCloseButton={false}
				footer={
					<div className="flex justify-end gap-3">
						<GlobalButton
							variant="secondary"
							size="sm"
							className="border border-border bg-surface text-text-primary hover:bg-surface-soft"
							onClick={requestClose}
						>
							{t.cancel}
						</GlobalButton>

						<GlobalButton
							variant="primary"
							size="sm"
							className="bg-brand-primary text-text-primary hover:bg-brand-primaryStrong hover:text-white"
							disabled={!canSave}
							onClick={() => void handleSave()}
						>
							{saving ? t.saving : t.save}
						</GlobalButton>
					</div>
				}
			>
				<div className="grid grid-cols-2 gap-4">
					<div className="col-span-2">
						<label
							htmlFor="user-name"
							className="text-xs font-medium text-text-secondary"
						>
							{t.name}
						</label>
						<input
							id="user-name"
							name="user-name"
							className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
							value={form.name}
							onChange={(e) =>
								setForm((current) => ({ ...current, name: e.target.value }))
							}
							required
						/>
					</div>

					<div className="col-span-2">
						<label
							htmlFor="user-email"
							className="text-xs font-medium text-text-secondary"
						>
							{t.email}
						</label>
						<input
							id="user-email"
							name="user-email"
							type="email"
							className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
							value={form.email}
							onChange={(e) =>
								setForm((current) => ({ ...current, email: e.target.value }))
							}
							required
						/>
					</div>

					<div className="col-span-2">
						<label
							htmlFor="user-role"
							className="text-xs font-medium text-text-secondary"
						>
							{t.role}
						</label>
						<select
							id="user-role"
							name="user-role"
							className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
							value={form.role}
							onChange={(e) =>
								setForm((current) => ({ ...current, role: e.target.value }))
							}
						>
							{roles.map((role) => (
								<option key={role.code} value={role.code}>
									{locale === "es" ? role.name_es : role.name_en}
								</option>
							))}
						</select>
					</div>

					<div className="col-span-2 mt-1 flex items-center gap-2 rounded-lg border border-border bg-surface-soft px-3 py-2">
						<input
							id="user-active"
							name="user-active"
							type="checkbox"
							checked={form.active}
							onChange={(e) =>
								setForm((current) => ({
									...current,
									active: e.target.checked,
								}))
							}
							className="h-4 w-4"
						/>
						<label htmlFor="user-active" className="text-sm text-text-primary">
							{t.active}
						</label>
					</div>

					<div className="col-span-2">
						<label
							htmlFor="user-phone"
							className="text-xs font-medium text-text-secondary"
						>
							{t.phone}
						</label>
						<div className="mt-1">
							<PhoneField
								id="user-phone"
								name="user-phone"
								autoComplete="tel"
								value={form.phone}
								onChange={(phone) =>
									setForm((current) => ({ ...current, phone }))
								}
								required
							/>
						</div>
					</div>

					{!isEditing && (
						<>
							<div>
								<label
									htmlFor="user-password"
									className="text-xs font-medium text-text-secondary"
								>
									{t.password}
								</label>

								<div className="relative mt-1">
									<input
										id="user-password"
										name="user-password"
										type={showPass ? "text" : "password"}
										className="w-full rounded-md border border-border bg-surface px-3 py-2 pr-12 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
										value={form.password}
										onChange={(e) =>
											setForm((current) => ({
												...current,
												password: e.target.value,
											}))
										}
										required
									/>

									<div className="absolute inset-y-0 right-0 flex items-center pr-2">
										<button
											type="button"
											aria-label={showPass ? t.hidePassword : t.showPassword}
											onClick={() => setShowPass((value) => !value)}
											className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
										>
											{showPass ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
								</div>
							</div>

							<div>
								<label
									htmlFor="user-confirm-password"
									className="text-xs font-medium text-text-secondary"
								>
									{t.confirmPassword}
								</label>

								<div className="relative mt-1">
									<input
										id="user-confirm-password"
										name="user-confirm-password"
										type={showConfirm ? "text" : "password"}
										className="w-full rounded-md border border-border bg-surface px-3 py-2 pr-12 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-brand-primaryStrong focus:ring-2 focus:ring-brand-secondary"
										value={form.confirmPassword}
										onChange={(e) =>
											setForm((current) => ({
												...current,
												confirmPassword: e.target.value,
											}))
										}
										required
									/>

									<div className="absolute inset-y-0 right-0 flex items-center pr-2">
										<button
											type="button"
											aria-label={showConfirm ? t.hideConfirm : t.showConfirm}
											onClick={() => setShowConfirm((value) => !value)}
											className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition hover:bg-surface-soft hover:text-text-primary"
										>
											{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
										</button>
									</div>
								</div>
							</div>
						</>
					)}
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
