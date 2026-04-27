"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Service Detail
 * Path: src/app/admin/dashboard/services/[id]/page.tsx
 * =============================================================================
 *
 * ES:
 * Página wrapper para editar servicios.
 * La UI y lógica real viven en ServiceFormPage.
 * =============================================================================
 */

import { useParams } from "next/navigation";

import ServiceFormPage from "@/components/services/ServiceFormPage";

export default function AdminServiceDetailPage() {
	const params = useParams<{ id: string }>();
	const serviceId = typeof params?.id === "string" ? params.id.trim() : "";

	return <ServiceFormPage mode="edit" serviceId={serviceId} />;
}