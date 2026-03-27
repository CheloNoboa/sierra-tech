/**
 * =============================================================================
 * 📡 API Route: Admin Services Page
 * Path: src/app/api/admin/services-page/route.ts
 * =============================================================================
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { connectToDB } from "@/lib/connectToDB";
import ServicesPage from "@/models/ServicesPage";

/* -------------------------------------------------------------------------- */

type AllowedRole = "admin" | "superadmin";

function isAllowedRole(role: unknown): role is AllowedRole {
  return role === "admin" || role === "superadmin";
}

/* -------------------------------------------------------------------------- */

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAllowedRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* -------------------------------------------------------------------------- */

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  await connectToDB();

  let doc = await ServicesPage.findOne().lean();

  if (!doc) {
    doc = await ServicesPage.create({}).then((d) => d.toObject());
  }

  return NextResponse.json(doc, { status: 200 });
}

/* -------------------------------------------------------------------------- */
/* PUT                                                                        */
/* -------------------------------------------------------------------------- */

export async function PUT(request: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  await connectToDB();

  const body = await request.json().catch(() => null);

  let doc = await ServicesPage.findOne();

  if (!doc) {
    doc = new ServicesPage({});
  }

  doc.header = body?.header ?? doc.header;

  await doc.save();

  return NextResponse.json(doc.toObject(), { status: 200 });
}