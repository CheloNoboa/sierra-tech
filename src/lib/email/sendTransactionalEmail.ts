/**
 * =============================================================================
 * 📧 Helper: Send Sierra Email
 * Path: src/lib/email/sendTransactionalEmail.ts
 * =============================================================================
 *
 * ES:
 * Helper central para envío de correos transaccionales de Sierra Tech.
 *
 * Propósito:
 * - reutilizar la configuración SMTP existente
 * - evitar duplicar lógica de Nodemailer en cada endpoint/job
 * - mantener credenciales fuera del código
 * - estandarizar remitente, reply-to, asunto y HTML
 *
 * Reglas:
 * - las credenciales viven en variables de entorno
 * - no guarda ni persiste información
 * - no depende de React
 * - no usa any
 * =============================================================================
 */

import nodemailer from "nodemailer";

import { connectToDB } from "@/lib/connectToDB";
import SystemSettings from "@/models/SystemSettings";

type SendSierraEmailParams = {
	to: string | string[];
	subject: string;
	html: string;
	from?: string;
	replyTo?: string;
};

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

export async function resolveBrandName(): Promise<string> {
	try {
		await connectToDB();

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

export async function sendTransactionalEmail(
	params: SendSierraEmailParams,
): Promise<void> {
	const smtpHost = requireEnv("SMTP_HOST");
	const smtpPort = requireEnvInt("SMTP_PORT");
	const smtpUser = requireEnv("SMTP_USER");
	const smtpPass = requireEnv("SMTP_PASS");
	const smtpFrom = params.from?.trim() || requireEnv("SMTP_FROM");

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
		to: params.to,
		subject: params.subject,
		html: params.html,
		replyTo: params.replyTo?.trim() || undefined,
	});
}