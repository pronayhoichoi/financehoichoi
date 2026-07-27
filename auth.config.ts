import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/app/generated/prisma/client";

// Edge-safe half of the NextAuth config: no Prisma/bcrypt imports here, since
// this file is also loaded by middleware.ts, which runs in the Edge Runtime.
// The Credentials provider (which needs Node APIs) lives in auth.ts instead.

declare module "next-auth" {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }
}

export type AppToken = {
  role: Role;
  id: string;
  [key: string]: unknown;
};

export const authConfig = {
  // Trust the host header behind Railway's (or any) reverse proxy so Auth.js
  // can derive callback URLs from the deployed domain. Safe here because the
  // app always sits behind the platform proxy.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      const t = token as AppToken;
      if (user) {
        t.role = user.role;
        t.id = user.id as string;
      }
      return t;
    },
    session({ session, token }) {
      const t = token as AppToken;
      session.user.id = t.id;
      session.user.role = t.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
