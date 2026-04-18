"use client";

/**
 * =============================================================================
 * 📌 Component: ResetPasswordInner
 * Path: src/app/reset-password/reset-password-inner.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla cliente para restablecer contraseña.
 *
 * Funcionalidad:
 * - Lee token desde query string
 * - Valida nueva contraseña y confirmación
 * - Llama a /api/auth/update-password
 * - Redirige al inicio tras éxito
 *
 * UX:
 * - Campos visualmente consistentes con LoginModal / SignUpModal
 * - Íconos show/hide password centrados y estables
 * - Sin desplazamientos visuales en hover
 * =============================================================================
 */

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineEye, HiOutlineEyeOff } from "react-icons/hi";

import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/useToast";

export default function ResetPasswordInner() {
	const { locale } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();

	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [showPass, setShowPass] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleReset = async (
		e: React.FormEvent<HTMLFormElement>,
	): Promise<void> => {
		e.preventDefault();

		if (!token) {
			toast.error(locale === "es" ? "Token no válido." : "Invalid token.");
			return;
		}

		if (!password || password.length < 6) {
			toast.error(
				locale === "es"
					? "La contraseña debe tener al menos 6 caracteres."
					: "Password must be at least 6 characters.",
			);
			return;
		}

		if (password !== confirm) {
			toast.error(
				locale === "es"
					? "Las contraseñas no coinciden."
					: "Passwords do not match.",
			);
			return;
		}

		setLoading(true);

		try {
			const res = await fetch("/api/auth/update-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, newPassword: password }),
			});

			const data = (await res.json()) as { message?: string };

			if (!res.ok) {
				throw new Error(data.message || "Request failed");
			}

			toast.success(
				locale === "es"
					? "Contraseña actualizada correctamente."
					: "Password updated successfully.",
			);

			setTimeout(async () => {
				try {
					const res = await fetch("/api/auth/session", {
						method: "GET",
						cache: "no-store",
					});

					const session = await res.json();

					const user = session?.user;

					if (user?.userType === "internal") {
						router.push("/admin/dashboard");
						return;
					}

					if (user?.userType === "client") {
						router.push("/portal");
						return;
					}

					router.push("/login");
				} catch {
					router.push("/login");
				}
			}, 1500);
		} catch {
			toast.error(
				locale === "es"
					? "Error al actualizar la contraseña."
					: "Error updating password.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
			<div className="relative w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl transition-all md:max-w-2xl">
				<h1 className="mb-4 text-center text-3xl font-bold text-yellow-400">
					{locale === "es"
						? "Crear / Restablecer contraseña"
						: "Create / Reset password"}
				</h1>

				<p className="mb-8 text-center text-sm text-gray-400">
					{locale === "es"
						? "Define tu contraseña para acceder al sistema."
						: "Set your password to access the system."}
				</p>

				<form onSubmit={handleReset} className="flex flex-col space-y-5">
					{/* Nueva contraseña */}
					<div className="relative">
						<input
							type={showPass ? "text" : "password"}
							placeholder={
								locale === "es" ? "Nueva contraseña" : "New password"
							}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 pr-14 text-white focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
						/>

						<div className="absolute inset-y-0 right-0 flex items-center pr-3">
							<button
								type="button"
								onClick={() => setShowPass((prev) => !prev)}
								aria-label={
									showPass
										? locale === "es"
											? "Ocultar contraseña"
											: "Hide password"
										: locale === "es"
											? "Mostrar contraseña"
											: "Show password"
								}
								className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors duration-150 hover:bg-white/5 hover:text-yellow-400 focus:outline-none"
							>
								{showPass ? (
									<HiOutlineEyeOff className="h-5 w-5" />
								) : (
									<HiOutlineEye className="h-5 w-5" />
								)}
							</button>
						</div>
					</div>

					{/* Confirmar contraseña */}
					<div className="relative">
						<input
							type={showConfirm ? "text" : "password"}
							placeholder={
								locale === "es" ? "Confirmar contraseña" : "Confirm password"
							}
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
							required
							className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 pr-14 text-white focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
						/>

						<div className="absolute inset-y-0 right-0 flex items-center pr-3">
							<button
								type="button"
								onClick={() => setShowConfirm((prev) => !prev)}
								aria-label={
									showConfirm
										? locale === "es"
											? "Ocultar confirmación"
											: "Hide confirmation"
										: locale === "es"
											? "Mostrar confirmación"
											: "Show confirmation"
								}
								className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors duration-150 hover:bg-white/5 hover:text-yellow-400 focus:outline-none"
							>
								{showConfirm ? (
									<HiOutlineEyeOff className="h-5 w-5" />
								) : (
									<HiOutlineEye className="h-5 w-5" />
								)}
							</button>
						</div>
					</div>

					{/* Botón guardar */}
					<button
						type="submit"
						disabled={loading}
						className={`rounded-lg bg-yellow-600 py-3 font-semibold text-white transition hover:bg-yellow-700 ${
							loading ? "cursor-not-allowed opacity-60" : ""
						}`}
					>
						{loading
							? locale === "es"
								? "Actualizando..."
								: "Updating..."
							: locale === "es"
								? "Guardar nueva contraseña"
								: "Save new password"}
					</button>

					{/* Volver */}
					<div className="mt-3 text-center">
						<button
							type="button"
							onClick={() => router.push("/")}
							className="text-sm text-yellow-400 underline underline-offset-2 hover:text-yellow-300"
						>
							{locale === "es"
								? "Volver al inicio de sesión"
								: "Return to login"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
