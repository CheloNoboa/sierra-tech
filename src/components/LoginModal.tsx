// File: src/components/LoginModal.tsx
"use client";

/**
 * =============================================================================
 * 📌 Component: LoginModal — Public Authentication Modal
 * Path: src/components/LoginModal.tsx
 * =============================================================================
 *
 * ES:
 * Modal público oficial de autenticación para Sierra Tech.
 *
 * Objetivo:
 * - permitir login con credentials
 * - permitir login con Google para usuarios internos
 * - permitir recuperación de contraseña
 * - resolver redirección post-login según la sesión real
 *
 * Contrato de redirección:
 * - userType = "internal" -> /admin/dashboard
 * - userType = "client"   -> /portal
 *
 * Decisiones:
 * - NO usa getSession()
 * - resuelve la sesión consultando /api/auth/session después del signIn
 * - NO depende de rutas heredadas como /user/home
 * - la separación final de audiencias sigue viviendo en middleware
 *
 * EN:
 * Official public authentication modal for Sierra Tech.
 * =============================================================================
 */

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";
import { AUTH_MODAL_STYLES } from "@/components/auth/authModalStyles";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

interface LoginModalProps {
	isOpen: boolean;
	onClose: () => void;
	staffGoogle?: boolean;
}

interface SessionResponseUser {
	role?: string | null;
	userType?: "internal" | "client" | null;
	status?: "active" | "inactive" | null;
	organizationId?: string | null;
}

interface SessionResponse {
	user?: SessionResponseUser | null;
}

/* -------------------------------------------------------------------------- */
/* 🧰 Helpers                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Resuelve ruta post-login desde la sesión real.
 *
 * Reglas:
 * - internal activo -> admin dashboard
 * - client activo con organizationId -> portal
 * - fallback seguro -> /login
 */
function mapSessionToPostLoginPath(
	user: SessionResponseUser | null | undefined,
): string {
	if (!user) return "/login";

	const userType = user.userType ?? null;
	const status = user.status ?? null;
	const organizationId = user.organizationId ?? null;

	if (status !== "active") {
		return "/login";
	}

	if (userType === "internal") {
		return "/admin/dashboard";
	}

	if (userType === "client" && organizationId) {
		return "/portal";
	}

	return "/login";
}

/* -------------------------------------------------------------------------- */
/* 🧩 Component                                                               */
/* -------------------------------------------------------------------------- */

export default function LoginModal({
	isOpen,
	onClose,
	staffGoogle = false,
}: LoginModalProps) {
	const { t, locale } = useTranslation();
	const router = useRouter();
	const { toast } = useToast();

	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const [showRecovery, setShowRecovery] = useState(false);
	const [recoveryEmail, setRecoveryEmail] = useState("");

	useEffect(() => {
		if (typeof window === "undefined") return;

		const savedEmail = localStorage.getItem("lastEmail");
		if (savedEmail) {
			setEmail(savedEmail);
		}
	}, []);

	const handleClose = (): void => {
		setError("");
		setShowRecovery(false);
		setRecoveryEmail("");
		setShowPassword(false);
		onClose();
	};

	/**
	 * Consulta la sesión actual después de autenticar.
	 * Esto permite decidir la ruta correcta sin depender de shape viejo.
	 */
	async function resolvePostLoginPathFromSession(): Promise<string> {
		try {
			const response = await fetch("/api/auth/session", {
				method: "GET",
				cache: "no-store",
			});

			const data = (await response
				.json()
				.catch(() => null)) as SessionResponse | null;

			return mapSessionToPostLoginPath(data?.user ?? null);
		} catch {
			return "/login";
		}
	}

	const handleLogin = async (
		e: React.FormEvent<HTMLFormElement>,
	): Promise<void> => {
		e.preventDefault();
		setError("");

		if (typeof window !== "undefined") {
			localStorage.setItem("lastEmail", email);
		}

		const result = await signIn("credentials", {
			redirect: false,
			email,
			password,
		});

		if (!result || result.error) {
			setError(t.login.error);
			return;
		}

		/**
		 * Notifica a otras pestañas que la sesión cambió.
		 */
		try {
			if (typeof window !== "undefined" && "BroadcastChannel" in window) {
				const channel = new BroadcastChannel("session-updates");
				channel.postMessage("refresh-session");
				channel.close();
			}
		} catch {
			/* noop */
		}

		const nextPath = await resolvePostLoginPathFromSession();

		/**
		 * Si por alguna razón no pudimos resolver una ruta válida,
		 * mostramos error en lugar de empujar a una ruta incorrecta.
		 */
		if (nextPath === "/login") {
			setError(
				locale === "es"
					? "No se pudo resolver el destino de acceso."
					: "Could not resolve the access destination.",
			);
			return;
		}

		handleClose();
		router.refresh();
		router.push(nextPath);
	};

	const handleGoogleLogin = async (): Promise<void> => {
		setError("");

		/**
		 * En esta fase Google permanece orientado a usuarios internos.
		 * El middleware terminará de corregir la audiencia si aplica.
		 */
		if (staffGoogle) {
			await signIn("google", { callbackUrl: "/admin/dashboard" });
			return;
		}

		await signIn("google", { callbackUrl: "/admin/dashboard" });
	};

	const handlePasswordReset = async (): Promise<void> => {
		if (!recoveryEmail.trim()) {
			toast.error(locale === "es" ? "Ingresa tu correo." : "Enter your email.");
			return;
		}

		try {
			const response = await fetch("/api/auth/reset-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: recoveryEmail }),
			});

			if (!response.ok) {
				toast.error(
					locale === "es"
						? "No se pudo enviar el correo."
						: "Could not send email.",
				);
				return;
			}

			toast.success(
				locale === "es"
					? "Te enviamos un enlace de recuperación."
					: "We sent you a recovery link.",
			);

			setShowRecovery(false);
			setRecoveryEmail("");
		} catch {
			toast.error(
				locale === "es"
					? "No se pudo enviar el correo."
					: "Could not send email.",
			);
		}
	};

	if (!isOpen) return null;

	return (
		<div className={AUTH_MODAL_STYLES.overlay}>
			<div className={AUTH_MODAL_STYLES.panel}>
				<button
					type="button"
					onClick={handleClose}
					aria-label={locale === "es" ? "Cerrar modal" : "Close modal"}
					className={AUTH_MODAL_STYLES.closeButton}
				>
					✕
				</button>

				<h2 className={AUTH_MODAL_STYLES.title}>{t.login.title}</h2>

				<button
					type="button"
					onClick={() => void handleGoogleLogin()}
					className={AUTH_MODAL_STYLES.googleButton}
				>
					<Image
						src="/icons/google_logo.png"
						alt="Google"
						width={20}
						height={20}
					/>
					{t.login.google}
				</button>

				<div className={AUTH_MODAL_STYLES.dividerWrap}>
					<div className={AUTH_MODAL_STYLES.dividerLine} />
					<span className={AUTH_MODAL_STYLES.dividerText}>{t.login.or}</span>
					<div className={AUTH_MODAL_STYLES.dividerLine} />
				</div>

				<form onSubmit={handleLogin} className="flex flex-col space-y-4">
					<label htmlFor="login-email" className="sr-only">
						Email
					</label>

					<input
						id="login-email"
						name="login-email"
						type="email"
						required
						autoComplete="username"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder={t.login.email}
						className={`${AUTH_MODAL_STYLES.inputBase} ${AUTH_MODAL_STYLES.inputNormalBorder}`}
					/>

					<label htmlFor="login-password" className="sr-only">
						Password
					</label>

					<div className="relative">
						<input
							id="login-password"
							name="login-password"
							type={showPassword ? "text" : "password"}
							required
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder={t.login.password}
							className={`${AUTH_MODAL_STYLES.inputPassword} ${AUTH_MODAL_STYLES.inputNormalBorder}`}
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

					{error ? <p className="text-sm text-status-error">{error}</p> : null}

					<button type="submit" className={AUTH_MODAL_STYLES.submitButton}>
						{t.login.submit}
					</button>
				</form>

				<div className="mt-3 text-center">
					<button
						type="button"
						onClick={() => setShowRecovery(true)}
						className="text-sm text-brand-primaryStrong underline transition hover:opacity-80"
					>
						{locale === "es"
							? "¿Olvidaste tu contraseña?"
							: "Forgot your password?"}
					</button>
				</div>
			</div>

			{showRecovery && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
					<div className={AUTH_MODAL_STYLES.panel}>
						<h3 className="text-center text-lg font-semibold text-text-primary">
							{locale === "es" ? "Recuperar contraseña" : "Password recovery"}
						</h3>

						<input
							type="email"
							value={recoveryEmail}
							onChange={(e) => setRecoveryEmail(e.target.value)}
							placeholder={
								locale === "es" ? "Correo electrónico" : "Email address"
							}
							className={AUTH_MODAL_STYLES.inputFull}
						/>

						<div className="flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setShowRecovery(false)}
								className="rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text-secondary transition hover:bg-surface-soft hover:text-text-primary"
							>
								{locale === "es" ? "Cancelar" : "Cancel"}
							</button>

							<button
								type="button"
								onClick={() => void handlePasswordReset()}
								className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-text-primary transition hover:bg-brand-primaryStrong hover:text-white"
							>
								{locale === "es" ? "Enviar enlace" : "Send link"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
