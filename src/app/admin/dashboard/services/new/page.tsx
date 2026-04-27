/**
 * =============================================================================
 * 📄 Page: Admin Service Create
 * Path: src/app/admin/dashboard/services/new/page.tsx
 * =============================================================================
 *
 * ES:
 * Página wrapper para crear servicios.
 * La UI y lógica real viven en ServiceFormPage.
 * =============================================================================
 */

import ServiceFormPage from "@/components/services/ServiceFormPage";

export default function AdminServiceCreatePage() {
	return <ServiceFormPage mode="create" />;
}