/**
 * =============================================================================
 * 📡 API Route: Resend Organization User Activation
 * Path: src/app/api/admin/organization-users/[id]/resend-activation/route.ts
 * =============================================================================
 *
 * ES:
 *   Endpoint administrativo para reenviar el correo de activación a un usuario
 *   de organización que todavía no completa su registro.
 *
 *   Responsabilidades:
 *   - validar sesión administrativa
 *   - validar existencia del usuario de organización
 *   - impedir reenvío si el usuario ya activó su cuenta
 *   - regenerar token de activación y expiración
 *   - enviar un nuevo correo de activación
 *
 *   Reglas:
 *   - no cambia la contraseña del usuario
 *   - solo renueva el enlace de activación
 *   - si el usuario ya está registrado, el endpoint rechaza la operación
 *
 * EN:
 *   Administrative endpoint used to resend activation email to an
 *   organization user who has not completed activation yet.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import nodemailer from "nodemailer";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import OrganizationUser from "@/models/OrganizationUser";
import SystemSettings from "@/models/SystemSettings";
import {
  buildActivationUrl,
  generateActivationToken,
  getActivationTokenExpiresAt,
  hashActivationToken,
} from "@/lib/auth/organization-user-credentials";

/* -------------------------------------------------------------------------- */
/* 🧱 Tipos                                                                   */
/* -------------------------------------------------------------------------- */

interface SessionUserLike {
  role?: string;
  permissions?: string[];
}

/* -------------------------------------------------------------------------- */
/* 🧠 Helpers                                                                 */
/* -------------------------------------------------------------------------- */

function isAdminSession(session: unknown): boolean {
  const user = (session as { user?: SessionUserLike } | null)?.user;

  if (!user) {
    return false;
  }

  if (user.role === "superadmin" || user.role === "admin") {
    return true;
  }

  if (Array.isArray(user.permissions) && user.permissions.includes("*")) {
    return true;
  }

  return Array.isArray(user.permissions)
    ? user.permissions.includes("organization-users.read") ||
        user.permissions.includes("organization-users.create") ||
        user.permissions.includes("organization-users.update")
    : false;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required env variable: ${name}`);
  }

  return value.trim();
}

function requireEnvInt(name: string): number {
  const raw = requireEnv(name);
  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env variable: ${name}`);
  }

  return parsed;
}

async function resolveBrandName(): Promise<string> {
  try {
    const setting = await SystemSettings.findOne({ key: "businessName" })
      .lean()
      .exec();

    const value =
      setting && typeof setting === "object" && "value" in setting
        ? (setting as { value?: unknown }).value
        : null;

    return typeof value === "string" && value.trim()
      ? value.trim()
      : "Sierra Tech";
  } catch {
    return "Sierra Tech";
  }
}

async function sendOrganizationUserActivationEmail(params: {
  email: string;
  fullName: string;
  activationUrl: string;
}) {
  const smtpHost = requireEnv("SMTP_HOST");
  const smtpPort = requireEnvInt("SMTP_PORT");
  const smtpUser = requireEnv("SMTP_USER");
  const smtpPass = requireEnv("SMTP_PASS");
  const smtpFrom = requireEnv("SMTP_FROM");

  const brandName = await resolveBrandName();

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: params.email,
    subject: `${brandName} - Activación de acceso`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #333333; line-height: 1.6;">
        <h2 style="color:#D97706; margin-bottom:16px;">${brandName}</h2>

        <p>Hola ${params.fullName || "usuario"},</p>

        <p>Su acceso al portal ya fue creado. Hemos generado un nuevo enlace para que pueda activar su cuenta.</p>

        <p style="margin:24px 0;">
          <a
            href="${params.activationUrl}"
            style="
              display:inline-block;
              padding:12px 24px;
              background:#D97706;
              color:#FFFFFF;
              text-decoration:none;
              border-radius:8px;
              font-weight:bold;
            "
          >
            Activar cuenta
          </a>
        </p>

        <p style="margin-top:16px;">
          Si el botón no funciona, copie y pegue este enlace en su navegador:
        </p>

        <p style="word-break:break-all; color:#92400E;">
          ${params.activationUrl}
        </p>

        <p style="margin-top:15px; font-size:12px; color:#777777;">
          Este enlace tiene vigencia limitada.
        </p>
      </div>
    `,
  });
}

/* -------------------------------------------------------------------------- */
/* 📤 POST                                                                    */
/* -------------------------------------------------------------------------- */

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!isAdminSession(session)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    await connectToDB();

    const { id } = await context.params;
    const userId = normalizeString(id);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          message: "User id is required.",
        },
        { status: 400 }
      );
    }

    const user = await OrganizationUser.findById(userId).exec();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "Organization user not found.",
        },
        { status: 404 }
      );
    }

    if (user.isRegistered) {
      return NextResponse.json(
        {
          ok: false,
          message: "This user has already activated the account.",
        },
        { status: 409 }
      );
    }

    const activationToken = generateActivationToken();
    const activationTokenHash = hashActivationToken(activationToken);
    const activationTokenExpiresAt = getActivationTokenExpiresAt();
    const activationUrl = buildActivationUrl(activationToken);

    user.activationTokenHash = activationTokenHash;
    user.activationTokenExpiresAt = activationTokenExpiresAt;

    await user.save();

    await sendOrganizationUserActivationEmail({
      email: user.email,
      fullName: user.fullName,
      activationUrl,
    });

    return NextResponse.json({
      ok: true,
      message: "Activation email resent successfully.",
    });
  } catch (error) {
    console.error(
      "POST /api/admin/organization-users/[id]/resend-activation error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        message: "Failed to resend activation email.",
      },
      { status: 500 }
    );
  }
}