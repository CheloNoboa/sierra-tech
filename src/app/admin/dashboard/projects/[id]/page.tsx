"use client";

/**
 * =============================================================================
 * 📄 Page: Admin Projects Edit
 * Path: src/app/admin/dashboard/projects/[id]/page.tsx
 * =============================================================================
 */

import { useParams } from "next/navigation";

import ProjectFormPage from "@/components/projects/ProjectFormPage";

export default function AdminProjectsEditPage() {
	const params = useParams<{ id: string }>();

	return <ProjectFormPage mode="edit" projectId={params.id} />;
}