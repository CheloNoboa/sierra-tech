"use client";

/**
 * =============================================================================
 * 📌 Page: /admin — Redirect to Admin Dashboard
 * Path: src/app/admin/page.tsx
 * =============================================================================
 *
 * ES:
 * - Esta ruta actúa únicamente como redirección cliente hacia
 *   /admin/dashboard.
 * - No renderiza interfaz.
 * - Se mantiene como Client Component porque usa useRouter + useEffect.
 *
 * EN:
 * - This route only acts as a client-side redirect to /admin/dashboard.
 * - It does not render any UI.
 * - It must remain a Client Component because it uses useRouter + useEffect.
 * =============================================================================
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return null;
}