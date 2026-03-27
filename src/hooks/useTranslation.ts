/** ✅ src/hooks/useTranslation.ts
 * ---------------------------------------------------------------
 * 🔁 Diccionario global de traducciones — versión unificada y segura
 * ---------------------------------------------------------------
 * - Incluye secciones: common, products, settings, header, login, etc.
 * - Tipado con Record<string, string> para permitir claves dinámicas
 * - 100% compatible con LanguageContext.tsx
 * ---------------------------------------------------------------
 */
"use client";

type TranslationSection = Record<string, string>;

export const translations: Record<
  "es" | "en",
  {
    common: TranslationSection;
    products: TranslationSection;
    settings: TranslationSection;
    header: TranslationSection;
    login: TranslationSection;
    adminDashboard: TranslationSection;
    home: TranslationSection;
    signup: TranslationSection;
    userHome: TranslationSection;
    roles: TranslationSection;
  }
> = {
  es: {
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      translate: "Traducir",
      translating: "Traduciendo...",
    },
    products: {
      new: "Nuevo Producto",
      edit: "Editar Producto",
      name: "Nombre",
      description: "Descripción",
      ingredients: "Ingredientes",
      category: "Categoría",
      cost: "Costo",
      price: "Precio",
      profit: "Rentabilidad",
      image: "Imagen",
      branch: "Sucursal",
      save: "Guardar",
      translating: "Traduciendo...",
      translated: "Traducción completada",
    },
    settings: {
      title: "Configuraciones del Sistema",
      subtitle: "Ajustes generales del sistema",
      loading: "Cargando configuraciones...",
      save: "Guardar",
      saved: "Configuración guardada correctamente",
      error: "Error al cargar configuraciones",
      delete: "Eliminar",
      deleted: "Configuración eliminada",
      errorLoad: "Error al cargar configuraciones",
      errorSave: "Error al guardar configuración",
      errorDelete: "Error al eliminar configuración",
      cancel: "Cancelar",
      add: "Agregar",
      edit: "Editar",
      key: "Clave",
      value: "Valor",
      module: "Módulo",
      description: "Descripción",
      lastUpdate: "Última modificación",
      actions: "Acciones",
    },
    header: {
      who: "Quiénes Somos",
      menu: "Menú",
      location: "Nuestra Ubicación",
      contact: "Contacto",
      login: "Iniciar Sesión",
      signup: "Registrarse",
      cart: "Carrito",
    },
    login: {
      title: "Iniciar Sesión",
      email: "Correo electrónico",
      password: "Contraseña",
      submit: "Entrar",
      error: "Credenciales incorrectas. Inténtalo nuevamente.",
      welcome: "¡Bienvenido!",
      showPassword: "Mostrar contraseña",
      hidePassword: "Ocultar contraseña",
      loading: "Cargando sesión...",
      google: "Iniciar con Google",
      or: "o ingresa con tu correo",
    },
    adminDashboard: {
      title: "Panel de Administración",
      subtitle: "Gestiona productos, usuarios y pedidos desde aquí.",
      description: "Administra tu negocio de forma eficiente desde el panel.",
      logout: "Cerrar sesión",
    },
    home: {
      // ✅ SIN NOMBRE QUEMADO: el nombre viene de useBusinessBranding()
      welcome: "Bienvenido",
      description:
        "Sierra Tech es una empresa ecuatoriana especializada en soluciones ambientales y energéticas, con capacidad para desarrollar proyectos en todo el territorio nacional. Su enfoque integra ingeniería aplicada, sostenibilidad e innovación para resolver de manera eficiente desafíos en tratamiento de agua, gestión ambiental y energías limpias.",
      button: "Ver Menú",
    },
    signup: {
      title: "Crear una cuenta",
      name: "Nombre completo",
      email: "Correo electrónico",
      phone: "Teléfono",
      password: "Contraseña",
      submit: "Registrarse",
      google: "Continuar con Google",
      or: "o regístrate con tu correo",
      successTitle: "¡Registro exitoso!",
      successMsg: "Tu cuenta ha sido creada correctamente.",
      errorGeneric: "Hubo un problema al registrar tu cuenta. Intenta nuevamente.",
    },
    userHome: {
      // ✅ SIN NOMBRE QUEMADO: el nombre viene de useBusinessBranding()
      title: "Bienvenido",
      subtitle: "Explora el menú y disfruta de nuestros sabores caseros",
      welcome: "Nos alegra tenerte aquí.",
    },
    roles: {
      title: "Gestión de Roles",
      new: "Nuevo",
      edit: "Editar Rol",
      delete: "Eliminar Rol",
      confirmDelete: "¿Seguro que deseas eliminar este rol?",
      created: "Rol creado correctamente",
      updated: "Rol actualizado correctamente",
      deleted: "Rol eliminado correctamente",
      name: "Nombre",
      description: "Descripción",
      permissions: "Permisos",
      available: "Disponibles",
      assigned: "Asignados",
      save: "Guardar Cambios",
    },
  },

  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      translate: "Translate",
      translating: "Translating...",
    },
    products: {
      new: "New Product",
      edit: "Edit Product",
      name: "Name",
      description: "Description",
      ingredients: "Ingredients",
      category: "Category",
      cost: "Cost",
      price: "Price",
      profit: "Profit",
      image: "Image",
      branch: "Branch",
      save: "Save",
      translating: "Translating...",
      translated: "Translation complete",
    },
    settings: {
      title: "System Settings",
      subtitle: "General system configuration",
      loading: "Loading settings...",
      save: "Save",
      saved: "Setting saved successfully",
      error: "Error loading settings",
      delete: "Delete",
      deleted: "Setting deleted",
      errorLoad: "Error loading settings",
      errorSave: "Error saving setting",
      errorDelete: "Error deleting setting",
      cancel: "Cancel",
      add: "Add",
      edit: "Edit",
      key: "Key",
      value: "Value",
      module: "Module",
      description: "Description",
      lastUpdate: "Last update",
      actions: "Actions",
    },
    header: {
      who: "About Us",
      menu: "Menu",
      location: "Our Location",
      contact: "Contact",
      login: "Login",
      signup: "Sign Up",
      cart: "Cart",
    },
    login: {
      title: "Sign In",
      email: "Email",
      password: "Password",
      submit: "Login",
      error: "Invalid credentials. Please try again.",
      welcome: "Welcome back!",
      showPassword: "Show password",
      hidePassword: "Hide password",
      loading: "Loading session...",
      google: "Sign in with Google",
      or: "or sign in with your email",
    },
    adminDashboard: {
      title: "Admin Dashboard",
      subtitle: "Manage products, users, and orders from here.",
      description: "Use the tools to efficiently manage your business.",
      logout: "Log out",
    },
    home: {
      // ✅ SIN NOMBRE QUEMADO
      welcome: "Welcome",
      description:
        "Sierra Tech is an Ecuadorian company specializing in environmental and energy solutions, with the capacity to develop projects throughout the national territory. Its approach integrates applied engineering, sustainability, and innovation to efficiently address challenges in water treatment, environmental management, and clean energy.",
      button: "View Menu",
    },
    signup: {
      title: "Create an account",
      name: "Full name",
      email: "Email address",
      phone: "Phone number",
      password: "Password",
      submit: "Sign up",
      google: "Continue with Google",
      or: "or sign up with your email",
      successTitle: "Registration successful!",
      successMsg: "Your account has been created successfully.",
      errorGeneric: "There was a problem creating your account. Please try again.",
    },
    userHome: {
      // ✅ SIN NOMBRE QUEMADO
      title: "Welcome",
      subtitle: "Explore the menu and enjoy our homemade flavors",
      welcome: "We're glad to have you here.",
    },
    roles: {
      title: "Role Management",
      new: "New",
      edit: "Edit Role",
      delete: "Delete Role",
      confirmDelete: "Are you sure you want to delete this role?",
      created: "Role created successfully",
      updated: "Role updated successfully",
      deleted: "Role deleted successfully",
      name: "Name",
      description: "Description",
      permissions: "Permissions",
      available: "Available",
      assigned: "Assigned",
      save: "Save Changes",
    },
  },
};

import { useLanguage } from "@/context/LanguageContext";
export function useTranslation() {
  return useLanguage();
}