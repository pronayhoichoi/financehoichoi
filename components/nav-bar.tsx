import Link from "next/link";
import { auth, signOut } from "@/auth";
import { canView } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

export async function NavBar() {
  const session = await auth();
  if (!session?.user) return null;

  const { role, name, email } = session.user;

  const links = [
    canView(role, "PROJECT") && { href: "/projects", label: "Projects" },
    canView(role, "PO") && { href: "/purchase-orders", label: "Purchase Orders" },
    canView(role, "VENDOR_MASTER") && { href: "/vendors", label: "Vendors" },
    canView(role, "VRF") && { href: "/vrf-review", label: "VRF Review" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="bg-hc-gradient shadow-brand inline-block size-7 rounded-[10px]" />
            <span className="text-hc-gradient font-heading text-lg font-extrabold tracking-tight">
              hoichoi
            </span>
            <span className="text-muted-foreground text-sm font-medium">
              Finance
            </span>
          </Link>
          <nav className="flex gap-4 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-hc-red transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {name} · {email} · {role}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
