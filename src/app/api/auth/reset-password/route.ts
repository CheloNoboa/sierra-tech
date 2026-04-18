/**
 * =============================================================================
 * 📌 API: /api/auth/reset-password
 * Path: src/app/api/auth/reset-password/route.ts
 * =============================================================================
 *
 * ES:
 * Envía un correo con enlace de restablecimiento de contraseña.
 *
 * Funcionalidad:
 * - Soporta usuarios de la plataforma base
 * - SMTP usando variables SMTP_*
 * - JWT válido por 1 hora
 * - Respuesta genérica para evitar enumeración de emails
 * - 100% tipado, sin any
 *
 * EN:
 * Sends a password reset email for platform users.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

import { connectToDB } from "@/lib/connectToDB";
import User from "@/models/User";
import SystemSettings from "@/models/SystemSettings";
import OrganizationUser from "@/models/OrganizationUser";

interface ResetPasswordPayload {
	email: string;
}

interface ResetJwtPayload {
	email: string;
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env variable: ${name}`);
	}
	return value;
}

function requireEnvInt(name: string): number {
	const raw = requireEnv(name);
	const parsed = Number(raw);

	if (!Number.isFinite(parsed)) {
		throw new Error(`Invalid numeric env variable: ${name}`);
	}

	return parsed;
}

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function genericOk() {
	return NextResponse.json({
		message: "If the email exists, a reset link will be sent.",
	});
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
			: "Platform";
	} catch {
		return "Platform";
	}
}

export async function POST(req: Request) {
	try {
		const body = (await req.json()) as Partial<ResetPasswordPayload>;
		const email =
			typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

		if (!email || !isValidEmail(email)) {
			return NextResponse.json(
				{ message: "Email is required" },
				{ status: 400 },
			);
		}

		await connectToDB();

		const internalUser = await User.findOne({ email }).exec();
		const organizationUser = internalUser
			? null
			: await OrganizationUser.findOne({ email }).exec();

		if (!internalUser && !organizationUser) {
			return genericOk();
		}

		let nameForEmail = "user";

		if (
			internalUser &&
			typeof internalUser.name === "string" &&
			internalUser.name.trim()
		) {
			nameForEmail = internalUser.name.trim();
		}

		if (
			organizationUser &&
			typeof organizationUser.fullName === "string" &&
			organizationUser.fullName.trim()
		) {
			nameForEmail = organizationUser.fullName.trim();
		}

		const token = jwt.sign(
			{
				email,
				audience: organizationUser
					? "organization_user_activation"
					: "password_reset",
			} satisfies ResetJwtPayload & { audience: string },
			requireEnv("JWT_SECRET"),
			{ expiresIn: "1h" },
		);

		const baseUrl = requireEnv("NEXTAUTH_URL");
		const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

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
			to: email,
			subject: "Password Reset / Restablecimiento de contraseña",
			html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color:#D97706;">${brandName}</h2>

          <p>${nameForEmail ? `Hello ${nameForEmail},` : "Hello,"}</p>

          <p>We received a request to reset your password.</p>
          <p>Click the link below to create a new password:</p>

          <a
            href="${resetUrl}"
            style="display:inline-block; padding:12px 24px; background:#D97706; color:white; text-decoration:none; border-radius:6px; font-weight:bold;"
          >
            Reset password
          </a>

          <p style="margin-top:15px; font-size:12px; color:#777;">
            This link is valid for 1 hour. If you did not request a password change,
            you can ignore this message.
          </p>
        </div>
      `,
		});

		return genericOk();
	} catch (error) {
		console.error("❌ Error in reset-password:", error);
		return NextResponse.json(
			{ message: "Internal server error" },
			{ status: 500 },
		);
	}
}
