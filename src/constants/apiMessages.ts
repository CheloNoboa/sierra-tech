/**
 * ✅ src/constants/apiMessages.ts
 * -------------------------------------------------------------------
 * Diccionario bilingüe centralizado de mensajes del sistema.
 * -------------------------------------------------------------------
 * - Compatible con getApiMessage() y useUiMessage()
 * - Totalmente tipado y coherente entre secciones
 * - Incluye mensajes globales reutilizables y específicos por módulo
 * -------------------------------------------------------------------
 */

export const apiMessages = {
	es: {
		/* =========================================================
       🌐 Mensajes globales reutilizables
    ========================================================= */
		global: {
			fetchError: "Error al obtener los datos.",
			createError: "No se pudo crear el registro.",
			updateError: "No se pudo actualizar el registro.",
			deleteError: "No se pudo eliminar el registro.",
			invalid: "Datos inválidos o incompletos.",
			notFound: "No se encontraron resultados.",
			unauthorized: "No tienes permisos para realizar esta acción.",
			idMissing: "Falta el identificador del registro.",
			unknown: "Ocurrió un error desconocido.",
			success: "Operación realizada con éxito.",
			saved: "Cambios guardados correctamente.",
			cancel: "Cancelar",
			save: "Guardar",
		},

		/* =========================================================
       👥 Roles
    ========================================================= */
		roles: {
			created: "Rol creado correctamente.",
			updated: "Rol actualizado correctamente.",
			deleted: "Rol eliminado correctamente.",
			fetchError: "Error al obtener la lista de roles.",
			createError: "Error al crear el rol.",
			updateError: "Error al actualizar el rol.",
			deleteError: "Error al eliminar el rol.",
			notFound: "No se encontró el rol especificado.",
			idMissing: "Falta el ID del rol.",
			invalid: "Datos del rol inválidos o incompletos.",
			deleteConfirm: "¿Estás seguro de eliminar este rol?",

			title: "Gestión de Roles",
			new: "Nuevo Rol",
			edit: "Editar Rol",
			save: "Guardar",
			cancel: "Cancelar",
			name: "Nombre",
			description: "Descripción",
			nameEs: "Nombre (Español)",
			nameEn: "Nombre (Inglés)",
			descEs: "Descripción (Español)",
			descEn: "Descripción (Inglés)",
			actions: "Acciones",
			assignPermissions: "Asignar permisos",
		},

		/* =========================================================
       👤 Usuarios
    ========================================================= */
		users: {
			created: "Usuario creado correctamente.",
			updated: "Usuario actualizado correctamente.",
			deleted: "Usuario eliminado correctamente.",
			notFound: "Usuario no encontrado.",
			fetchError: "Error al obtener los usuarios.",
			createError: "Error al crear el usuario.",
			updateError: "Error al actualizar el usuario.",
			deleteError: "Error al eliminar el usuario.",
			invalid: "Datos de usuario inválidos.",
		},

		/* =========================================================
       ⚙️ Configuración
    ========================================================= */
		settings: {
			updated: "Configuración actualizada correctamente.",
			fetchError: "Error al obtener la configuración.",
			updateError: "No se pudo actualizar la configuración.",
		},
	},

	en: {
		/* =========================================================
       🌐 Global reusable messages
    ========================================================= */
		global: {
			fetchError: "Error fetching data.",
			createError: "Failed to create record.",
			updateError: "Failed to update record.",
			deleteError: "Failed to delete record.",
			invalid: "Invalid or incomplete data.",
			notFound: "No results found.",
			unauthorized: "You don't have permission to perform this action.",
			idMissing: "Record identifier is missing.",
			unknown: "An unknown error occurred.",
			success: "Operation completed successfully.",
			saved: "Changes saved successfully.",
			cancel: "Cancel",
			save: "Save",
		},

		/* =========================================================
       👥 Roles
    ========================================================= */
		roles: {
			created: "Role created successfully.",
			updated: "Role updated successfully.",
			deleted: "Role deleted successfully.",
			fetchError: "Error fetching role list.",
			createError: "Error creating role.",
			updateError: "Error updating role.",
			deleteError: "Error deleting role.",
			notFound: "Specified role not found.",
			idMissing: "Role ID is missing.",
			invalid: "Invalid or incomplete role data.",
			deleteConfirm: "Are you sure you want to delete this role?",

			title: "Role Management",
			new: "New Role",
			edit: "Edit Role",
			save: "Save",
			cancel: "Cancel",
			name: "Name",
			description: "Description",
			nameEs: "Name (Spanish)",
			nameEn: "Name (English)",
			descEs: "Description (Spanish)",
			descEn: "Description (English)",
			actions: "Actions",
			assignPermissions: "Assign permissions",
		},

		/* =========================================================
       👤 Users
    ========================================================= */
		users: {
			created: "User created successfully.",
			updated: "User updated successfully.",
			deleted: "User deleted successfully.",
			notFound: "User not found.",
			fetchError: "Error fetching users.",
			createError: "Error creating user.",
			updateError: "Error updating user.",
			deleteError: "Error deleting user.",
			invalid: "Invalid user data.",
		},

		/* =========================================================
       ⚙️ Settings
    ========================================================= */
		settings: {
			updated: "Settings updated successfully.",
			fetchError: "Error fetching settings.",
			updateError: "Failed to update settings.",
		},
	},
} as const;

/* -------------------------------------------------------------------
   🔒 Tipado exportado — mantiene coherencia con getApiMessage / useUiMessage
------------------------------------------------------------------- */
export type ApiMessages = typeof apiMessages;
export type ApiLocale = keyof typeof apiMessages; // "es" | "en"
export type ApiSection<L extends ApiLocale> = keyof (typeof apiMessages)[L];
export type ApiKey<
	L extends ApiLocale,
	S extends ApiSection<L>,
> = keyof (typeof apiMessages)[L][S];
