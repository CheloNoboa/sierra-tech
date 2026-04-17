/**
 * =============================================================================
 * 📌 NextAuth Route — Sierra Tech Auth Gateway
 * Path: src/app/api/auth/[...nextauth]/route.ts
 * =============================================================================
 *
 * ES:
 * Gateway central de autenticación para Sierra Tech.
 *
 * Propósito:
 * - centralizar autenticación de usuarios internos y usuarios cliente
 * - exponer una sesión consistente para frontend, middleware y seguridad
 * - mantener login por credentials
 * - mantener Google OAuth solo para usuarios internos
 *
 * Alcance:
 * - valida credentials contra la colección Users
 * - si no hay coincidencia en Users, valida contra OrganizationUsers
 * - construye un JWT/session con identidad suficiente para:
 *   - separar admin vs portal cliente
 *   - proteger rutas por middleware
 *   - propagar headers mínimos hacia APIs internas
 *
 * Decisiones:
 * - userType distingue audiencias:
 *   - "internal" → usuario interno del sistema
 *   - "client"   → usuario del portal cliente
 * - Google OAuth permanece limitado a Users en esta fase
 * - OrganizationUsers no usan Google OAuth en esta versión
 * - el middleware será el responsable final de redirección según userType
 *
 * Contratos:
 * - Users:
 *   - colección: Users
 *   - rol dinámico desde Roles
 *   - permisos resueltos desde la colección Roles
 * - OrganizationUsers:
 *   - colección: OrganizationUsers
 *   - acceso ligado a una organización activa
 *   - no cargan permisos internos de plataforma
 *
 * EN:
 * Central authentication gateway for Sierra Tech.
 * =============================================================================
 */

import NextAuth, { type NextAuthOptions } from "next-auth";
import type { Account, Profile, User } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";

import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { connectToDB } from "@/lib/connectToDB";
import UserModel from "@/models/User";
import RoleModel from "@/models/Role";
import SystemSettings from "@/models/SystemSettings";
import OrganizationModel from "@/models/Organization";
import OrganizationUserModel from "@/models/OrganizationUser";

/* -------------------------------------------------------------------------- */
/* 🧱 JWT extendido                                                           */
/* -------------------------------------------------------------------------- */

type AppJWT = JWT & {
  _id?: string;
  role?: string;
  permissions?: string[];

  userType?: "internal" | "client";
  status?: "active" | "inactive";

  name?: string | null;
  email?: string | null;

  organizationId?: string | null;
  organizationName?: string | null;
  organizationUserRole?: string | null;

  isRegistered?: boolean;
  phone?: string | null;
  exp?: number;
};

/* -------------------------------------------------------------------------- */
/* 🧰 Helpers generales                                                       */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickDocString(doc: unknown, key: string): string | null {
  if (!isRecord(doc)) return null;
  return pickString(doc[key]);
}

function pickPhoneOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStatus(value: unknown): "active" | "inactive" {
  return value === "inactive" ? "inactive" : "active";
}

function normalizeUserType(value: unknown): "internal" | "client" | null {
  if (value === "internal" || value === "client") return value;
  return null;
}

/**
 * Extrae string seguro desde ObjectId/string/unknown.
 */
function toIdString(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const parsed = value.toString().trim();
    return parsed;
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* 🧾 Tipado interno para hydration de user en callback jwt                   */
/* -------------------------------------------------------------------------- */

type UserLike = {
  id?: unknown;
  _id?: unknown;
  role?: unknown;
  permissions?: unknown;

  userType?: unknown;
  status?: unknown;

  name?: unknown;
  email?: unknown;

  organizationId?: unknown;
  organizationName?: unknown;
  organizationUserRole?: unknown;

  isRegistered?: unknown;
  phone?: unknown;
};

function getUserLike(user: User | AdapterUser): UserLike {
  return isRecord(user) ? (user as UserLike) : {};
}

/* -------------------------------------------------------------------------- */
/* ⏱️ Timeout de sesión desde DB                                              */
/* -------------------------------------------------------------------------- */

/**
 * Obtiene timeout de sesión configurable desde SystemSettings.
 * Fallback seguro: 60 minutos.
 */
async function loadTimeout(): Promise<number> {
  await connectToDB();

  const setting = await SystemSettings.findOne({ key: "sessionTimeoutMinutes" })
    .lean()
    .exec();

  const raw =
    setting && typeof setting === "object" && "value" in setting
      ? (setting as { value?: unknown }).value
      : undefined;

  const parsed =
    typeof raw === "string"
      ? Number(raw)
      : typeof raw === "number"
        ? raw
        : undefined;

  return parsed && parsed > 0 ? parsed : 60;
}

/* -------------------------------------------------------------------------- */
/* 🔐 NextAuth options                                                        */
/* -------------------------------------------------------------------------- */

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },

  /**
   * Ruta oficial de login.
   * Separar landing pública del formulario de autenticación evita
   * mezclar flujo comercial con flujo de acceso.
   */
  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials): Promise<{
        id: string;
        _id: string;
        name: string | null;
        email: string | null;
        role: string;
        permissions: string[];
        userType: "internal" | "client";
        status: "active" | "inactive";
        organizationId?: string | null;
        organizationName?: string | null;
        organizationUserRole?: string | null;
        isRegistered?: boolean;
        phone?: string | null;
      } | null> {
        if (!credentials?.email || !credentials.password) return null;

        await connectToDB();

        const email = credentials.email.trim().toLowerCase();
        const plainPassword = credentials.password;

        /* ------------------------------------------------------------------ */
        /* 1) USERS — autenticación interna                                   */
        /* ------------------------------------------------------------------ */

        const internalUser = await UserModel.findOne({ email })
          .select(
            "+password +passwordHash +provider +role +status +isRegistered +name +email +phone"
          )
          .exec();

        if (internalUser) {
          const provider = pickDocString(internalUser, "provider");
          if (provider && provider !== "credentials") {
            return null;
          }

          const hash =
            pickDocString(internalUser, "password") ??
            pickDocString(internalUser, "passwordHash");

          if (!hash) return null;

          const validPassword = await bcrypt.compare(plainPassword, hash);
          if (!validPassword) return null;

          const internalStatus = normalizeStatus(
            (internalUser as unknown as { status?: unknown }).status
          );

          if (internalStatus !== "active") return null;

          const roleCode =
            typeof internalUser.role === "string" && internalUser.role.trim()
              ? internalUser.role.trim()
              : "user";

          const roleDoc = await RoleModel.findOne({ code: roleCode })
            .lean()
            .exec();

          const permissions = Array.isArray(roleDoc?.permissions)
            ? roleDoc.permissions.filter(
                (value): value is string => typeof value === "string"
              )
            : [];

          const id = internalUser._id.toString();

          return {
            id,
            _id: id,
            name: internalUser.name ?? null,
            email: internalUser.email ?? null,
            role: roleCode,
            permissions,
            userType: "internal",
            status: internalStatus,
            organizationId: null,
            organizationName: null,
            organizationUserRole: null,
            isRegistered: internalUser.isRegistered ?? false,
            phone: pickPhoneOrNull(
              (internalUser as unknown as { phone?: unknown }).phone
            ),
          };
        }

        /* ------------------------------------------------------------------ */
        /* 2) ORGANIZATION USERS — portal cliente                             */
        /* ------------------------------------------------------------------ */

        const organizationUser = await OrganizationUserModel.findOne({ email })
          .select(
            "+passwordHash +firstName +lastName +fullName +email +role +status +organizationId +isRegistered +lastLoginAt"
          )
          .exec();

        if (!organizationUser) return null;

        const passwordHash =
          typeof organizationUser.passwordHash === "string"
            ? organizationUser.passwordHash
            : "";

        if (!passwordHash) return null;

        const validPassword = await bcrypt.compare(plainPassword, passwordHash);
        if (!validPassword) return null;

        const organizationUserStatus = normalizeStatus(organizationUser.status);
        if (organizationUserStatus !== "active") return null;

        const isRegistered =
          typeof organizationUser.isRegistered === "boolean"
            ? organizationUser.isRegistered
            : false;

        /**
         * ES:
         * El portal cliente solo permite acceso después de la activación inicial.
         * Esto evita que una contraseña temporal enviada por correo se use como
         * acceso definitivo sin completar el proceso de onboarding.
         */
        if (!isRegistered) {
          return null;
        }

        const organizationId = toIdString(organizationUser.organizationId);
        if (!organizationId) return null;

        /**
         * ES:
         * El último acceso debe persistirse en el momento en que las credenciales
         * ya fueron validadas correctamente. Esto alimenta la grilla administrativa
         * y evita mostrar "Nunca" para usuarios que ya ingresaron al portal.
         */
        organizationUser.lastLoginAt = new Date();
        await organizationUser.save();

        const organization = await OrganizationModel.findById(organizationId)
          .select("legalName commercialName status")
          .lean()
          .exec();

        if (!organization) return null;

        const organizationStatus = normalizeStatus(organization.status);
        if (organizationStatus !== "active") return null;

        const organizationName =
          pickString(organization.commercialName) ??
          pickString(organization.legalName) ??
          null;

        const organizationUserId = toIdString(organizationUser._id);
        if (!organizationUserId) return null;

        return {
          id: organizationUserId,
          _id: organizationUserId,
          name: pickString(organizationUser.fullName),
          email: pickString(organizationUser.email),
          role: "organization_user",
          permissions: [],
          userType: "client",
          status: organizationUserStatus,
          organizationId,
          organizationName,
          organizationUserRole: pickString(organizationUser.role),
          isRegistered:
            typeof organizationUser.isRegistered === "boolean"
              ? organizationUser.isRegistered
              : false,
          phone: null,
        };
      },
    }),

    /**
     * Google OAuth se mantiene solo para usuarios internos.
     * No se extiende a portal cliente en esta fase para evitar
     * mezclar onboarding de organizaciones con OAuth externo.
     */
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.callback-url"
          : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-next-auth.csrf-token"
          : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  callbacks: {
    /**
     * ------------------------------------------------------------------------
     * JWT callback
     * ------------------------------------------------------------------------
     * Responsabilidad:
     * - normalizar identidad autenticada
     * - enriquecer token para middleware y session callback
     * - mantener expiración dinámica desde DB
     */
    async jwt(params: {
      token: JWT;
      user?: User | AdapterUser;
      account?: Account | null;
      profile?: Profile;
      trigger?: "signIn" | "signUp" | "update";
      isNewUser?: boolean;
      session?: unknown;
    }): Promise<JWT> {
      const { token, user, account } = params;
      const t = token as AppJWT;

      /* -------------------------------------------------------------------- */
      /* Google OAuth → solo Users                                            */
      /* -------------------------------------------------------------------- */
      if (account?.provider === "google" && user) {
        await connectToDB();

        const email = (user.email ?? "").toString().trim().toLowerCase();
        let existing = await UserModel.findOne({ email }).exec();

        if (!existing) {
          existing = await UserModel.create({
            name: user.name,
            email,
            provider: "google",
            role: "user",
            status: "active",
            isRegistered: true,
            phone: null,
          });
        }

        const internalStatus = normalizeStatus(
          (existing as unknown as { status?: unknown }).status
        );

        const roleDoc = await RoleModel.findOne({ code: existing.role })
          .lean()
          .exec();

        const permissions = Array.isArray(roleDoc?.permissions)
          ? roleDoc.permissions.filter(
              (value): value is string => typeof value === "string"
            )
          : [];

        const id = existing._id.toString();

        t.sub = id;
        t._id = id;
        t.role = existing.role;
        t.permissions = permissions;

        t.userType = "internal";
        t.status = internalStatus;

        t.name = existing.name ?? null;
        t.email = existing.email ?? null;

        t.organizationId = null;
        t.organizationName = null;
        t.organizationUserRole = null;

        t.isRegistered = existing.isRegistered ?? false;
        t.phone = pickPhoneOrNull(
          (existing as unknown as { phone?: unknown }).phone
        );
      }

      /* -------------------------------------------------------------------- */
      /* Credentials → Users / OrganizationUsers                              */
      /* -------------------------------------------------------------------- */
      if (user && account?.provider !== "google") {
        const normalizedUser = getUserLike(user);

        const id =
          pickString(normalizedUser._id) ??
          pickString(normalizedUser.id) ??
          "";

        if (id) t.sub = id;
        t._id = pickString(normalizedUser._id) ?? id;

        if (typeof normalizedUser.role === "string") {
          t.role = normalizedUser.role;
        }

        t.permissions = Array.isArray(normalizedUser.permissions)
          ? normalizedUser.permissions.filter(
              (value): value is string => typeof value === "string"
            )
          : (t.permissions ?? []);

        const userType = normalizeUserType(normalizedUser.userType);
        if (userType) t.userType = userType;

        t.status = normalizeStatus(normalizedUser.status);

        if (typeof normalizedUser.name === "string") {
          t.name = normalizedUser.name;
        } else if (normalizedUser.name === null) {
          t.name = null;
        }

        if (typeof normalizedUser.email === "string") {
          t.email = normalizedUser.email;
        } else if (normalizedUser.email === null) {
          t.email = null;
        }

        t.organizationId = pickString(normalizedUser.organizationId) ?? null;
        t.organizationName = pickString(normalizedUser.organizationName) ?? null;
        t.organizationUserRole =
          pickString(normalizedUser.organizationUserRole) ?? null;

        if (typeof normalizedUser.isRegistered === "boolean") {
          t.isRegistered = normalizedUser.isRegistered;
        } else {
          t.isRegistered = t.isRegistered ?? false;
        }

        t.phone = pickPhoneOrNull(normalizedUser.phone) ?? (t.phone ?? null);
      }

      if (!t.sub && typeof t._id === "string" && t._id) {
        t.sub = t._id;
      }

      const minutes = await loadTimeout();
      t.exp = Math.floor(Date.now() / 1000) + minutes * 60;

      return token;
    },

    /**
     * ------------------------------------------------------------------------
     * Session callback
     * ------------------------------------------------------------------------
     * Responsabilidad:
     * - exponer al frontend un shape estable y suficiente
     * - evitar que UI y middleware tengan que adivinar el tipo de usuario
     */
    async session({ session, token }) {
      const t = token as AppJWT;

      session.user = {
        ...(session.user ?? {}),
        _id: typeof t._id === "string" && t._id ? t._id : (t.sub ?? ""),
        role: typeof t.role === "string" ? t.role : "",
        permissions: Array.isArray(t.permissions) ? t.permissions : [],
        userType: t.userType === "client" ? "client" : "internal",
        status: t.status === "inactive" ? "inactive" : "active",
        name: typeof t.name === "string" ? t.name : null,
        email: typeof t.email === "string" ? t.email : null,
        organizationId:
          typeof t.organizationId === "string" ? t.organizationId : null,
        organizationName:
          typeof t.organizationName === "string" ? t.organizationName : null,
        organizationUserRole:
          typeof t.organizationUserRole === "string"
            ? t.organizationUserRole
            : null,
        isRegistered: typeof t.isRegistered === "boolean" ? t.isRegistered : false,
        phone: typeof t.phone === "string" ? t.phone : null,
      };

      if (typeof t.exp === "number") {
        session.expires = new Date(t.exp * 1000).toISOString();
      }

      return session;
    },

    /**
     * ------------------------------------------------------------------------
     * Redirect callback
     * ------------------------------------------------------------------------
     * Mantiene política segura por defecto.
     * La separación final de audiencias vive en middleware.
     */
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
};

/* -------------------------------------------------------------------------- */
/* 🚪 Export handler                                                          */
/* -------------------------------------------------------------------------- */

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };