import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canEdit, canView, type ModuleKey } from "@/lib/rbac";

export async function requireView(module: ModuleKey) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canView(session.user.role, module)) redirect("/forbidden");
  return session;
}

export async function requireEdit(module: ModuleKey) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canEdit(session.user.role, module)) redirect("/forbidden");
  return session;
}
