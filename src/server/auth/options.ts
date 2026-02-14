import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Role } from "@prisma/client";

import { prisma } from "@/server/db";

const rolePriority: Role[] = ["ROOT", "ADMIN", "SELLER", "CLIENT"];

function sortByRolePriority<T extends { role: Role }>(items: T[]) {
  return [...items].sort((a, b) => rolePriority.indexOf(a.role) - rolePriority.indexOf(b.role));
}

export const authOptions: NextAuthOptions = {
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.ROOT_MASTER_KEY ??
    "replace-me-in-production",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            memberships: true,
          },
        });

        if (!user?.passwordHash) {
          return null;
        }

        const isValidPassword = await compare(credentials.password, user.passwordHash);
        if (!isValidPassword || user.memberships.length === 0) {
          return null;
        }

        const primaryMembership = sortByRolePriority(user.memberships)[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: primaryMembership.role,
          tenantId: primaryMembership.tenantId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id && token.role && token.tenantId) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.tenantId = token.tenantId;
      }
      return session;
    },
  },
};
