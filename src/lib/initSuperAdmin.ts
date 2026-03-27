/**
 * ===============================================================
 * ✅ initSuperAdmin.ts
 * ===============================================================
 * ES:
 *  Inicializa el SUPERADMIN automáticamente al arrancar el servidor.
 *  - Solo se crea si NO existe otro superadmin.
 *  - La contraseña viene de variables de entorno.
 *
 * EN:
 *  Automatically initializes the SUPERADMIN when the server starts.
 *  - Only created if NO superadmin exists.
 *  - Password comes from environment variables.
 *
 * IMPORTANTE:
 *  - Define estas variables en .env.local:
 *      SUPERADMIN_EMAIL="admin@fastfood.com"
 *      SUPERADMIN_PASSWORD="TuPasswordUltraSegura"
 * ===============================================================
 */

import bcrypt from "bcryptjs";
import { connectToDB } from "@/lib/connectToDB";
import User from "@/models/User";

/**
 * ===============================================================
 * 🚀 Ejecuta este método una vez al inicio del servidor
 * - Se llama desde authOptions.ts
 * - Evita múltiples ejecuciones utilizando un flag interno.
 * ===============================================================
 */
let initialized = false;

export async function initSuperAdmin() {
  if (initialized) return; // evitar llamadas duplicadas
  initialized = true;

  await connectToDB();

  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("⚠️ SUPERADMIN no creado: faltan variables de entorno.");
    return;
  }

  const existing = await User.findOne({ role: "superadmin" });

  if (existing) {
    console.log("🔁 SUPERADMIN detectado. No se crea uno nuevo.");
    return;
  }

  console.log("🚀 Creando SUPERADMIN inicial...");

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    name: "Super Administrador",
    email,
    password: hashed,
    role: "superadmin",
    provider: "credentials",
    isRegistered: true,
  });

  console.log(`✅ SUPERADMIN creado con email: ${email}`);
}
