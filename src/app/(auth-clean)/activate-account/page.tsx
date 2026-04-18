import { Suspense } from "react";
import ActivateAccountClient from "./activate-account-client";

/**
 * =============================================================================
 * 📄 Page: Activate Account
 * Path: src/app/(auth-clean)/activate-account/page.tsx
 * =============================================================================
 *
 * ES:
 *   Contenedor estable de la pantalla pública de activación.
 *
 *   En App Router, useSearchParams() debe vivir en un componente cliente
 *   envuelto por Suspense para evitar errores de prerender.
 * =============================================================================
 */

export default function ActivateAccountPage() {
	return (
		<Suspense
			fallback={
				<main className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-amber-50 px-4 py-10">
					<div className="mx-auto w-full max-w-md">
						<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
							<p className="text-sm text-slate-600">Cargando activación...</p>
						</div>
					</div>
				</main>
			}
		>
			<ActivateAccountClient />
		</Suspense>
	);
}
