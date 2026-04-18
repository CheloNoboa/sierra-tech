"use client";

/**
 * =============================================================================
 * 📌 Page: ResetPasswordPageWrapper
 * Path: src/app/reset-password/page.tsx
 * =============================================================================
 *
 * ES:
 * Wrapper cliente con Suspense para la pantalla de restablecimiento.
 * Requerido para lectura segura de searchParams en Next.js App Router.
 *
 * EN:
 * Client wrapper with Suspense for the reset password screen.
 * =============================================================================
 */

import { Suspense } from "react";
import ResetPasswordInner from "./reset-password-inner";

function ResetPasswordFallback() {
	return (
		<div className="flex min-h-screen items-center justify-center text-gray-400">
			Loading...
		</div>
	);
}

export default function ResetPasswordPageWrapper() {
	return (
		<Suspense fallback={<ResetPasswordFallback />}>
			<ResetPasswordInner />
		</Suspense>
	);
}
