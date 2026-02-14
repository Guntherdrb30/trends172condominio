import "next-auth";
import "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: Role;
      tenantId: string;
    };
    privilegedUntil?: number;
  }

  interface User {
    id: string;
    role: Role;
    tenantId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    tenantId?: string;
  }
}

