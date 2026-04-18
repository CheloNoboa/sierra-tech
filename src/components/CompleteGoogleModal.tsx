"use client";

/**
 * =============================================================================
 * 📌 Component: CompleteGoogleModal
 * Path: src/components/CompleteGoogleModal.tsx
 * =============================================================================
 *
 * ES:
 * Modal genérica para completar perfil después de login con Google.
 *
 * Campos actuales:
 * - name
 * - phone
 *
 * Importante:
 * - Ya NO depende de sucursal
 * - Ya NO depende de branchId
 * - Queda lista para ampliarse más adelante con address/map si se necesita
 *
 * EN:
 * Generic modal for completing profile data after Google sign-in.
 * =============================================================================
 */

import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import PhoneField, { type PhoneValue } from "@/components/phone/PhoneField";

interface CompleteGoogleModalProps {
	isOpen: boolean;
	initialName?: string;
	onComplete: (data: { name: string; phone: string }) => void;
	onClose?: () => void;
}

const DEFAULT_PHONE: PhoneValue = {
	countryCode: "US",
	dialCode: "+1",
	nationalNumber: "",
	e164: "",
};

export default function CompleteGoogleModal({
	isOpen,
	initialName = "",
	onComplete,
	onClose,
}: CompleteGoogleModalProps) {
	const { locale } = useTranslation();

	const [name, setName] = useState(initialName);
	const [phone, setPhone] = useState<PhoneValue>(DEFAULT_PHONE);
	const [errName, setErrName] = useState("");
	const [errPhone, setErrPhone] = useState("");

	if (!isOpen) return null;

	const validate = (): boolean => {
		let ok = true;

		setErrName("");
		setErrPhone("");

		if (!name.trim()) {
			setErrName(locale === "es" ? "Ingresa tu nombre." : "Enter your name.");
			ok = false;
		}

		if (!phone.e164.trim()) {
			setErrPhone(
				locale === "es" ? "Ingresa tu teléfono." : "Enter your phone.",
			);
			ok = false;
		}

		return ok;
	};

	const handleComplete = (): void => {
		if (!validate()) return;

		onComplete({
			name: name.trim(),
			phone: phone.e164,
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="relative w-96 rounded-lg bg-gray-800 p-6 text-white">
				{onClose ? (
					<button
						type="button"
						onClick={onClose}
						className="absolute right-2 top-2 text-gray-400 hover:text-white"
						aria-label={locale === "es" ? "Cerrar modal" : "Close modal"}
					>
						✕
					</button>
				) : null}

				<h2 className="mb-4 text-center text-xl font-semibold">
					{locale === "es"
						? "Completa tu registro"
						: "Complete your registration"}
				</h2>

				{/* Nombre */}
				<div className="mb-3">
					<input
						type="text"
						placeholder={locale === "es" ? "Nombre" : "Name"}
						value={name}
						onChange={(e) => setName(e.target.value)}
						className={`w-full rounded border bg-gray-700 p-2 ${
							errName ? "border-red-500" : "border-gray-600"
						}`}
					/>
					{errName ? (
						<p className="mt-1 text-xs text-red-400">{errName}</p>
					) : null}
				</div>

				{/* Teléfono */}
				<div
					className={
						errPhone ? "mb-1 rounded border border-red-500 p-1" : "mb-1"
					}
				>
					<PhoneField value={phone} onChange={setPhone} />
				</div>
				{errPhone ? (
					<p className="mb-3 text-xs text-red-400">{errPhone}</p>
				) : null}

				{/* Botón */}
				<button
					type="button"
					className="mt-4 w-full rounded bg-yellow-600 py-2 font-semibold hover:bg-yellow-700"
					onClick={handleComplete}
				>
					{locale === "es" ? "Guardar" : "Save"}
				</button>
			</div>
		</div>
	);
}
