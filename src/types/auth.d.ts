/**
 * Tipos estrictos para FastFood Auth
 * ----------------------------------
 * - Usuario que NextAuth debe aceptar en authorize()
 * - Usuario completo (con superadmin) tomado desde MongoDB
 */

export interface AuthUserPayload {
  id: string;
  name: string;
  email: string;
  // authorize() NO acepta superadmin → lo suavizamos
  role: "user" | "admin";
}

export interface FullDBUser {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "superadmin";
  password?: string;
}
