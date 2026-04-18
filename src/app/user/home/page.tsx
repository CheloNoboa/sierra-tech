/** ✅ src/app/user/home/page.tsx
 * Versión limpia y funcional:
 * - Sin mensajes ni textos de bienvenida.
 * - Pantalla vacía lista para el contenido real del usuario.
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UserHome() {
	const router = useRouter();

	useEffect(() => {
		// 🔹 Aquí puedes redirigir a otra sección si lo deseas:
		// router.replace("/user/dashboard");
	}, [router]);

	return (
		<main className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-6">
			{/* 🔸 Pantalla base sin textos de bienvenida */}
			<div className="text-center">
				{/* Aquí podrás colocar el contenido real del Home del usuario */}
			</div>
		</main>
	);
}
