import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
	return NextResponse.json(
		{
			ok: true,
			xUserId: req.headers.get("x-user-id"),
			xUserRole: req.headers.get("x-user-role"),
			xUserBranchId: req.headers.get("x-user-branch-id"),
			xUserPermissions: req.headers.get("x-user-permissions"),
		},
		{ status: 200 },
	);
}
