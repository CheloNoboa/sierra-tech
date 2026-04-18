"use client";

/**
 * =============================================================================
 * 📌 CloseButton — Navigation Back Button (Sierra Tech Standard)
 * =============================================================================
 *
 * ES:
 * - Navega de regreso al punto anterior usando sessionStorage.prevPath.
 * - Limpia prevPath después de usarlo (evita rutas obsoletas).
 * - Tiene fallback seguro según rol del usuario.
 *
 * EN:
 * - Navigates back using sessionStorage.prevPath.
 * - Cleans prevPath after use.
 * - Safe fallback based on user role.
 * =============================================================================
 */

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/hooks/useTranslation";

export default function CloseButton() {
	const router = useRouter();
	const { data: session } = useSession();
	const { locale } = useTranslation();

	const handleClose = () => {
		const prevPath = sessionStorage.getItem("prevPath");

		// 🧹 Evita navegación inconsistente en futuros usos
		sessionStorage.removeItem("prevPath");

		if (prevPath && !prevPath.includes("/login")) {
			router.push(prevPath);
			return;
		}

		// 🔐 Fallback por rol
		if (
			session?.user?.role === "admin" ||
			session?.user?.role === "superadmin"
		) {
			router.push("/admin/dashboard");
			return;
		}

		if (session?.user?.role === "user") {
			router.push("/user/home");
			return;
		}

		router.push("/");
	};

	return (
		<div className="text-center mt-12">
			<button
				type="button"
				onClick={handleClose}
				className="
          px-6 py-2 rounded-xl font-semibold transition
          bg-brand-primary
          text-text-primary
          hover:bg-brand-primaryStrong
          hover:text-white
        "
			>
				{locale === "es" ? "Cerrar" : "Close"}
			</button>
		</div>
	);
}
