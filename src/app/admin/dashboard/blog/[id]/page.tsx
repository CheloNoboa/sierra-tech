/**
 * =============================================================================
 * 📄 Page: Admin Blog Detail
 * Path: src/app/admin/dashboard/blog/[id]/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa para editar un artículo existente del Blog.
 *
 * Responsabilidad:
 * - Recibir el id desde la ruta dinámica.
 * - Renderizar el formulario unificado del módulo Blog en modo edición.
 *
 * Decisiones:
 * - Compatible con Next.js 15.
 * - No contiene lógica de formulario.
 * - No contiene lógica de API.
 * - Delega toda la operación a BlogFormPage.
 *
 * EN:
 * Admin page for editing an existing Blog article.
 * =============================================================================
 */

import BlogFormPage from "@/components/blog/BlogFormPage";

type PageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function AdminBlogDetailPage({ params }: PageProps) {
	const { id } = await params;

	return <BlogFormPage mode="edit" blogId={id} />;
}