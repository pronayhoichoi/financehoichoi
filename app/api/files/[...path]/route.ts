import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canView } from "@/lib/rbac";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = session.user;
  if (!canView(role, "VENDOR_MASTER") && !canView(role, "VRF")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { path: pathSegments } = await params;
  const relativePath = pathSegments.join("/");

  try {
    const data = await readStoredFile(relativePath);
    return new NextResponse(new Uint8Array(data));
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
