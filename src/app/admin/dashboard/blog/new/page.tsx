/**
 * =============================================================================
 * 📄 Page: Admin Blog Create
 * Path: src/app/admin/dashboard/blog/new/page.tsx
 * =============================================================================
 *
 * ES:
 * Pantalla administrativa para crear un nuevo artículo del Blog.
 *
 * Responsabilidad:
 * - Renderizar el formulario unificado del módulo Blog en modo creación.
 *
 * Decisiones:
 * - No contiene lógica de formulario.
 * - No contiene lógica de API.
 * - Delega toda la operación a BlogFormPage.
 *
 * EN:
 * Admin page for creating a new Blog article.
 * =============================================================================
 */

import BlogFormPage from "@/components/blog/BlogFormPage";

export default function AdminBlogCreatePage() {
	return <BlogFormPage mode="create" />;
}