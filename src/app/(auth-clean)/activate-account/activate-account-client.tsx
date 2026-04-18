"use client";

/**
 * =============================================================================
 * 📄 Component: Activate Account Client
 * Path: src/app/(auth-clean)/activate-account/activate-account-client.tsx
 * =============================================================================
 *
 * ES:
 *   Componente cliente del flujo de activación inicial.
 *
 *   Responsabilidades:
 *   - leer el token desde la URL
 *   - permitir al usuario definir su contraseña final
 *   - validar campos básicos en cliente para mejor UX
 *   - consumir el endpoint público /api/activate-account
 *   - redirigir al login al completar la activación
 *
 *   Reglas:
 *   - esta pantalla no reemplaza el login normal
 *   - se usa únicamente en el primer acceso por correo de activación
 *   - la contraseña final debe cumplir la regla media-fuerte definida
 * =============================================================================
 */

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

function validatePassword(value: string): string | null {
	if (value.length < 8) {
		return "La contraseña debe tener al menos 8 caracteres.";
	}

	if (!/[A-Z]/.test(value)) {
		return "La contraseña debe incluir al menos una mayúscula.";
	}

	if (!/[0-9]/.test(value)) {
		return "La contraseña debe incluir al menos un número.";
	}

	if (!/[!@#$%]/.test(value)) {
		return "La contraseña debe incluir al menos un carácter especial simple.";
	}

	return null;
}

export default function ActivateAccountClient() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const token = useMemo(
		() => searchParams.get("token")?.trim() ?? "",
		[searchParams],
	);

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const [status, setStatus] = useState<SubmitStatus>("idle");
	const [errorMessage, setErrorMessage] = useState("");

	const passwordRuleError = useMemo(
		() => validatePassword(password),
		[password],
	);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		setErrorMessage("");

		if (!token) {
			setStatus("error");
			setErrorMessage(
				"El enlace de activación no es válido o está incompleto.",
			);
			return;
		}

		if (!password) {
			setStatus("error");
			setErrorMessage("Debe ingresar una contraseña.");
			return;
		}

		const passwordValidationError = validatePassword(password);

		if (passwordValidationError) {
			setStatus("error");
			setErrorMessage(passwordValidationError);
			return;
		}

		if (!confirmPassword) {
			setStatus("error");
			setErrorMessage("Debe confirmar la contraseña.");
			return;
		}

		if (password !== confirmPassword) {
			setStatus("error");
			setErrorMessage("Las contraseñas no coinciden.");
			return;
		}

		try {
			setStatus("submitting");

			const response = await fetch("/api/activate-account", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					token,
					password,
					confirmPassword,
				}),
			});

			const result = (await response.json()) as {
				ok?: boolean;
				message?: string;
			};

			if (!response.ok || !result.ok) {
				throw new Error(result.message || "No se pudo activar la cuenta.");
			}

			setStatus("success");

			setTimeout(() => {
				router.push("/login");
			}, 1200);
		} catch (error) {
			setStatus("error");
			setErrorMessage(
				error instanceof Error
					? error.message
					: "No se pudo activar la cuenta.",
			);
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-white via-slate-50 to-amber-50 px-4 py-10">
			<div className="w-full max-w-md">
				<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
					<div className="mb-6">
						<p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
							Sierra Tech
						</p>

						<h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
							Activar cuenta
						</h1>

						<p className="mt-3 text-sm leading-6 text-slate-600">
							Defina su contraseña final para activar su acceso al portal.
						</p>
					</div>

					{!token ? (
						<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
							El enlace de activación no contiene un token válido.
						</div>
					) : (
						<form className="space-y-5" onSubmit={handleSubmit}>
							<div>
								<label
									htmlFor="password"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Nueva contraseña
								</label>

								<div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4">
									<input
										id="password"
										name="password"
										type={showPassword ? "text" : "password"}
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										autoComplete="new-password"
										className="h-12 w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
										placeholder="Ingrese su nueva contraseña"
									/>

									<button
										type="button"
										onClick={() => setShowPassword((current) => !current)}
										className="shrink-0 text-sm font-medium text-slate-500 transition hover:text-slate-800"
										aria-label={
											showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
										}
									>
										{showPassword ? "Ocultar" : "Ver"}
									</button>
								</div>

								<p className="mt-2 text-xs leading-5 text-slate-500">
									Debe tener al menos 8 caracteres, una mayúscula, un número y
									un carácter especial simple.
								</p>

								{password.length > 0 && passwordRuleError ? (
									<p className="mt-2 text-xs text-red-600">
										{passwordRuleError}
									</p>
								) : null}
							</div>

							<div>
								<label
									htmlFor="confirmPassword"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Confirmar contraseña
								</label>

								<div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4">
									<input
										id="confirmPassword"
										name="confirmPassword"
										type={showConfirmPassword ? "text" : "password"}
										value={confirmPassword}
										onChange={(event) => setConfirmPassword(event.target.value)}
										autoComplete="new-password"
										className="h-12 w-full border-0 bg-transparent text-sm text-slate-900 outline-none"
										placeholder="Repita su nueva contraseña"
									/>

									<button
										type="button"
										onClick={() =>
											setShowConfirmPassword((current) => !current)
										}
										className="shrink-0 text-sm font-medium text-slate-500 transition hover:text-slate-800"
										aria-label={
											showConfirmPassword
												? "Ocultar confirmación de contraseña"
												: "Mostrar confirmación de contraseña"
										}
									>
										{showConfirmPassword ? "Ocultar" : "Ver"}
									</button>
								</div>
							</div>

							{status === "error" && errorMessage ? (
								<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
									{errorMessage}
								</div>
							) : null}

							{status === "success" ? (
								<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
									Su cuenta ha sido activada correctamente. Redirigiendo al
									inicio de sesión...
								</div>
							) : null}

							<button
								type="submit"
								disabled={status === "submitting" || status === "success"}
								className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{status === "submitting" ? "Activando..." : "Activar cuenta"}
							</button>
						</form>
					)}

					<div className="mt-6 border-t border-slate-100 pt-5 text-center">
						<Link
							href="/login"
							className="inline-flex text-sm font-semibold text-amber-700 transition hover:text-amber-800"
						>
							Ir al inicio de sesión
						</Link>
					</div>
				</div>
			</div>
		</main>
	);
}
