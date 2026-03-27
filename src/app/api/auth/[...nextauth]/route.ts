/**
 * =============================================================================
 * 📌 NextAuth Route — Platform Auth Gateway
 * Path: src/app/api/auth/[...nextauth]/route.ts
 * =============================================================================
 *
 * ES:
 * Gateway central de autenticación para la plataforma base.
 *
 * Objetivo:
 * - Centralizar autenticación de usuarios del sistema
 * - Exponer una sesión consistente para frontend, middleware y seguridad
 * - Mantener login con credentials y Google OAuth
 *
 * Contratos:
 * - Solo existe identidad de usuario del sistema (`User`)
 * - Los roles provienen dinámicamente de la colección `Roles`
 * - Los permisos se resuelven según el rol actual
 * - No existe lógica de customer, sucursal, pricing ni menú
 *
 * EN:
 * Central authentication gateway for the reusable platform base.
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

/* =============================================================================
 * Extended JWT
 * ============================================================================= */
type AppJWT = JWT & {
  _id?: string;
  role?: string;
  permissions?: string[];
  name?: string | null;
  email?: string | null;
  isRegistered?: boolean;
  phone?: string | null;
  exp?: number;
};

/* =============================================================================
 * Helpers
 * ============================================================================= */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pickDocString(doc: unknown, key: string): string | null {
  if (!isRecord(doc)) return null;
  const value = doc[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickPhoneOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

type UserLike = {
  id?: unknown;
  _id?: unknown;
  role?: unknown;
  permissions?: unknown;
  name?: unknown;
  email?: unknown;
  isRegistered?: unknown;
  phone?: unknown;
};

function getUserLike(u: User | AdapterUser): UserLike {
  return isRecord(u) ? (u as UserLike) : {};
}

/* =============================================================================
 * Session timeout from DB
 * ============================================================================= */
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

/* =============================================================================
 * NextAuth options
 * ============================================================================= */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
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
        isRegistered: boolean;
        phone: string | null;
      } | null> {
        if (!credentials?.email || !credentials.password) return null;

        await connectToDB();

        const email = credentials.email.trim().toLowerCase();
        const plain = credentials.password;

        const user = await UserModel.findOne({ email })
          .select("+password +passwordHash +provider +role +isRegistered +name +email +phone")
          .exec();

        if (!user) return null;

        const provider = pickDocString(user, "provider");
        if (provider && provider !== "credentials") return null;

        const hash =
          pickDocString(user, "password") ??
          pickDocString(user, "passwordHash");

        if (!hash) return null;

        const valid = await bcrypt.compare(plain, hash);
        if (!valid) return null;

        const roleCode =
          typeof user.role === "string" && user.role ? user.role : "user";

        const roleDoc = await RoleModel.findOne({ code: roleCode }).lean().exec();

        const permissions = Array.isArray(roleDoc?.permissions)
          ? roleDoc.permissions.filter((x): x is string => typeof x === "string")
          : [];

        const id = user._id.toString();

        return {
          id,
          _id: id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: roleCode,
          permissions,
          isRegistered: user.isRegistered ?? false,
          phone: pickPhoneOrNull((user as unknown as { phone?: unknown }).phone),
        };
      },
    }),

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

      /* -----------------------------------------------------------------------
       * Google user
       * -------------------------------------------------------------------- */
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
            isRegistered: true,
            phone: null,
          });
        }

        const roleDoc = await RoleModel.findOne({ code: existing.role }).lean().exec();

        const permissions = Array.isArray(roleDoc?.permissions)
          ? roleDoc.permissions.filter((x): x is string => typeof x === "string")
          : [];

        const id = existing._id.toString();

        t.sub = id;
        t._id = id;
        t.role = existing.role;
        t.permissions = permissions;
        t.name = existing.name ?? null;
        t.email = existing.email ?? null;
        t.isRegistered = existing.isRegistered ?? false;
        t.phone = pickPhoneOrNull((existing as unknown as { phone?: unknown }).phone);
      }

      /* -----------------------------------------------------------------------
       * Credentials user
       * -------------------------------------------------------------------- */
      if (user && account?.provider !== "google") {
        const u = getUserLike(user);

        const id = pickString(u._id) || pickString(u.id) || "";
        if (id) t.sub = id;

        t._id = pickString(u._id) ?? id;

        if (typeof u.role === "string") t.role = u.role;

        t.permissions = Array.isArray(u.permissions)
          ? u.permissions.filter((x): x is string => typeof x === "string")
          : (t.permissions ?? []);

        if (typeof u.name === "string") t.name = u.name;
        else if (u.name === null) t.name = null;

        if (typeof u.email === "string") t.email = u.email;
        else if (u.email === null) t.email = null;

        if (typeof u.isRegistered === "boolean") {
          t.isRegistered = u.isRegistered;
        } else {
          t.isRegistered = t.isRegistered ?? false;
        }

        t.phone = pickPhoneOrNull(u.phone) ?? (t.phone ?? null);
      }

      if (!t.sub && typeof t._id === "string" && t._id) {
        t.sub = t._id;
      }

      const minutes = await loadTimeout();
      t.exp = Math.floor(Date.now() / 1000) + minutes * 60;

      return token;
    },

    async session({ session, token }) {
      const t = token as AppJWT;

      session.user = {
        ...(session.user ?? {}),
        _id: (t._id as string) ?? (t.sub ?? ""),
        role: (t.role as string) ?? "",
        permissions: (t.permissions as string[]) ?? [],
        name: (t.name as string | null) ?? null,
        email: (t.email as string | null) ?? null,
        isRegistered: t.isRegistered ?? false,
        phone: typeof t.phone === "string" ? t.phone : null,
      };

      if (typeof t.exp === "number") {
        session.expires = new Date(t.exp * 1000).toISOString();
      }

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };