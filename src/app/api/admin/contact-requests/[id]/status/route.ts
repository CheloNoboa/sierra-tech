/**
 * =============================================================================
 * 📡 API Route: Admin Contact Request Status
 * Path: src/app/api/admin/contact-requests/[id]/status/route.ts
 * =============================================================================
 *
 * ES:
 * Endpoint administrativo para actualizar el estado operativo de una solicitud.
 *
 * Método:
 * - PATCH
 *
 * Body:
 * {
 *   status: "new" | "in_review" | "closed"
 * }
 *
 * EN:
 * Administrative endpoint for updating a contact request status.
 * =============================================================================
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDB } from "@/lib/connectToDB";
import ContactRequest from "@/models/ContactRequest";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ContactStatus = "new" | "in_review" | "closed";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeStatus(value: unknown): ContactStatus | "" {
  if (value === "new" || value === "in_review" || value === "closed") {
    return value;
  }

  return "";
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDB();

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid request id.",
        },
        { status: 400 }
      );
    }

    const body: unknown = await req.json().catch(() => null);
    const record =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const nextStatus = normalizeStatus(record.status);

    if (!nextStatus) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid status.",
        },
        { status: 400 }
      );
    }

    const updated = await ContactRequest.findByIdAndUpdate(
      id,
      { status: nextStatus },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          message: "Request not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        item: {
          _id: String(updated._id),
          status: updated.status ?? "new",
          updatedAt: updated.updatedAt ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /admin/contact-requests/[id]/status] PATCH error:", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error.",
      },
      { status: 500 }
    );
  }
}