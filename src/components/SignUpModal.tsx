"use client";

/**
 * =============================================================================
 * 📌 Component: SignUpModal — Public Registration Modal
 * Path: src/components/SignUpModal.tsx
 * =============================================================================
 *
 * ES:
 * - Modal público de registro para Sierra Tech.
 * - Incluye:
 *   - preloader corto al abrir
 *   - registro manual con nombre, email, teléfono y contraseña
 *   - registro con Google
 *   - PhoneField permanece intacto
 *
 * UX:
 * - Comparte exactamente la misma base visual que LoginModal
 * - Ícono del ojo estable y centrado
 * - Sin dependencias del dominio anterior
 *
 * Nota importante:
 * - La mayor parte del look visual del modal se controla desde:
 *   "@/components/auth/authModalStyles"
 * - Este archivo corrige únicamente los estilos hardcodeados locales para
 *   mantener coherencia con Sierra Tech.
 *
 * EN:
 * - Public signup modal for Sierra Tech.
 * =============================================================================
 */

import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

import { useTranslation } from "@/hooks/useTranslation";
import PhoneField, { type PhoneValue } from "@/components/phone/PhoneField";
import { AUTH_MODAL_STYLES } from "@/components/auth/authModalStyles";

const DEFAULT_PHONE: PhoneValue = {
	countryCode: "EC",
	dialCode: "+593",
	nationalNumber: "",
	e164: "+593",
};

interface SignUpModalProps {
	isOpen: boolean;
	onClose: () => void;
}

interface RegisterResponse {
	message?: string;
}

export default function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
	const { t, locale } = useTranslation();

	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState<PhoneValue>(DEFAULT_PHONE);
	const [password, setPassword] = useState("");

	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showPreloader, setShowPreloader] = useState(false);

	const [errName, setErrName] = useState("");
	const [errEmail, setErrEmail] = useState("");
	const [errPhone, setErrPhone] = useState("");
	const [errPassword, setErrPassword] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		if (isOpen) return;

		setShowPassword(false);
		setShowPreloader(false);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		setShowPreloader(true);

		const timer = setTimeout(() => {
			setShowPreloader(false);
		}, 700);

		return () => clearTimeout(timer);
	}, [isOpen, locale]);

	const validateManual = (): boolean => {
		let ok = true;

		setErrName("");
		setErrEmail("");
		setErrPhone("");
		setErrPassword("");
		setError("");

		if (!name.trim()) {
			ok = false;
			setErrName(locale === "es" ? "Ingresa tu nombre." : "Enter your name.");
		}

		if (!email.trim() || !email.includes("@")) {
			ok = false;
			setErrEmail(locale === "es" ? "Correo inválido." : "Invalid email.");
		}

		if (!phone.nationalNumber.trim()) {
			ok = false;
			setErrPhone(locale === "es" ? "Teléfono inválido." : "Invalid phone.");
		}

		if (!password.trim() || password.length < 6) {
			ok = false;
			setErrPassword(
				locale === "es"
					? "Debe tener al menos 6 caracteres."
					: "Must be at least 6 characters.",
			);
		}

		return ok;
	};

	const handleManualRegister = async (
		ev: React.FormEvent<HTMLFormElement>,
	): Promise<void> => {
		ev.preventDefault();

		if (!validateManual()) return;

		setLoading(true);

		try {
			const res = await fetch("/api/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					email: email.trim(),
					phone: phone.e164,
					password,
					provider: "credentials",
				}),
			});

			const json = (await res.json()) as RegisterResponse;

			if (!res.ok) {
				setError(json.message || "Error");
				return;
			}

			setSuccess(true);
			setTimeout(() => onClose(), 1500);
		} finally {
			setLoading(false);
		}
	};

	const handleGoogleRegister = async (): Promise<void> => {
		setLoading(true);
		setError("");

		try {
			await signIn("google", { callbackUrl: "/user/home" });
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	if (showPreloader) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
				<div className={`${AUTH_MODAL_STYLES.panel} text-center`}>
					<p className="text-lg font-semibold text-text-primary">
						{locale === "es" ? "Preparando registro..." : "Preparing signup..."}
					</p>
					<p className="mt-1 text-text-secondary">
						{locale === "es" ? "Cargando formulario" : "Loading form"}
					</p>

					<div className="mt-5 flex justify-center">
						<div className="relative h-12 w-12">
							<div className="absolute inset-0 animate-pulse rounded-full border-4 border-brand-secondary/50" />
							<div className="h-full w-full animate-spin rounded-full border-4 border-r-brand-primaryStrong border-t-brand-secondary border-b-transparent border-l-transparent" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={AUTH_MODAL_STYLES.overlay}>
			<div
				className={AUTH_MODAL_STYLES.panel}
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					aria-label={locale === "es" ? "Cerrar modal" : "Close modal"}
					className={AUTH_MODAL_STYLES.closeButton}
				>
					✕
				</button>

				{success ? (
					<div className="flex flex-col items-center justify-center py-10">
						<h2 className="text-2xl font-bold text-status-success">
							{t.signup.successTitle}
						</h2>
						<p className="mt-1 text-center text-text-secondary">
							{t.signup.successMsg}
						</p>
					</div>
				) : (
					<>
						<h2 className={AUTH_MODAL_STYLES.title}>{t.signup.title}</h2>

						<button
							type="button"
							onClick={handleGoogleRegister}
							disabled={loading}
							className={AUTH_MODAL_STYLES.googleButton}
						>
							<Image
								src="/icons/google_logo.png"
								alt="Google"
								width={20}
								height={20}
							/>
							{t.signup.google}
						</button>

						<div className={AUTH_MODAL_STYLES.dividerWrap}>
							<div className={AUTH_MODAL_STYLES.dividerLine} />
							<span className={AUTH_MODAL_STYLES.dividerText}>
								{t.signup.or}
							</span>
							<div className={AUTH_MODAL_STYLES.dividerLine} />
						</div>

						<form
							onSubmit={handleManualRegister}
							className="flex flex-col space-y-4"
						>
							<div className="flex flex-col">
								<label className="mb-1 text-xs text-text-secondary">
									{t.signup.name}
								</label>
								<input
									type="text"
									value={name}
									name="name"
									onChange={(e) => setName(e.target.value)}
									className={`${AUTH_MODAL_STYLES.inputBase} ${
										errName
											? AUTH_MODAL_STYLES.inputErrorBorder
											: AUTH_MODAL_STYLES.inputNormalBorder
									}`}
								/>
								{errName ? (
									<p className={AUTH_MODAL_STYLES.helperError}>{errName}</p>
								) : null}
							</div>

							<div className="flex flex-col">
								<label className="mb-1 text-xs text-text-secondary">
									{t.signup.email}
								</label>
								<input
									type="email"
									value={email}
									name="email"
									onChange={(e) => setEmail(e.target.value)}
									className={`${AUTH_MODAL_STYLES.inputBase} ${
										errEmail
											? AUTH_MODAL_STYLES.inputErrorBorder
											: AUTH_MODAL_STYLES.inputNormalBorder
									}`}
								/>
								{errEmail ? (
									<p className={AUTH_MODAL_STYLES.helperError}>{errEmail}</p>
								) : null}
							</div>

							<label className="mb-1 text-xs text-text-secondary">
								{t.signup.phone}
							</label>
							<div
								id="signup-phone-wrapper"
								className={
									errPhone ? "rounded border border-status-error p-1" : ""
								}
							>
								<PhoneField value={phone} onChange={setPhone} />
							</div>
							{errPhone ? (
								<p className={AUTH_MODAL_STYLES.helperError}>{errPhone}</p>
							) : null}

							<div className="flex flex-col">
								<label className="mb-1 text-xs text-text-secondary">
									{t.signup.password}
								</label>

								<div className="relative">
									<input
										type={showPassword ? "text" : "password"}
										name="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className={`${AUTH_MODAL_STYLES.inputPassword} ${
											errPassword
												? AUTH_MODAL_STYLES.inputErrorBorder
												: AUTH_MODAL_STYLES.inputNormalBorder
										}`}
									/>

									<div className={AUTH_MODAL_STYLES.eyeWrap}>
										<button
											type="button"
											onClick={() => setShowPassword((prev) => !prev)}
											aria-label={
												showPassword
													? locale === "es"
														? "Ocultar contraseña"
														: "Hide password"
													: locale === "es"
														? "Mostrar contraseña"
														: "Show password"
											}
											aria-pressed={showPassword}
											className={AUTH_MODAL_STYLES.eyeButton}
										>
											{showPassword ? (
												<HiOutlineEyeOff className="h-5 w-5" />
											) : (
												<HiOutlineEye className="h-5 w-5" />
											)}
										</button>
									</div>
								</div>

								{errPassword ? (
									<p className={AUTH_MODAL_STYLES.helperError}>{errPassword}</p>
								) : null}
							</div>

							{error ? (
								<p className="text-center text-sm text-status-error">{error}</p>
							) : null}

							<button
								type="submit"
								disabled={loading}
								className={AUTH_MODAL_STYLES.submitButton}
							>
								{loading ? "⏳" : t.signup.submit}
							</button>
						</form>
					</>
				)}
			</div>
		</div>
	);
}
