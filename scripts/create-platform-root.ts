import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

type RootUserInput = {
  email: string;
  password: string;
  name?: string;
};

type PlatformTenantSummary = {
  id: string;
  name: string;
  slug: string;
};

function printHelp() {
  console.log(
    [
      "Usage:",
      "  npx tsx scripts/create-platform-root.ts --email <email> --password <password> [--name <name>]",
      "",
      "Example:",
      '  npx tsx scripts/create-platform-root.ts --email "you@example.com" --password "SuperSecret123!" --name "System Owner"',
    ].join("\n"),
  );
}

function parseArgs(argv: string[]): RootUserInput {
  const args = new Map<string, string>();
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args.set(key, value);
    index += 1;
  }

  const email = (args.get("email") ?? positional[0])?.trim().toLowerCase();
  const password = args.get("password") ?? positional[1];
  const positionalName = positional.length > 2 ? positional.slice(2).join(" ").trim() : undefined;
  const name = (args.get("name") ?? positionalName)?.trim();

  if (!email || !password) {
    throw new Error("Both --email and --password are required.");
  }

  return {
    email,
    password,
    name: name && name.length > 0 ? name : undefined,
  };
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFiles() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = resolve(process.cwd(), file);
    if (!existsSync(fullPath)) continue;
    const raw = readFileSync(fullPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = stripWrappingQuotes(trimmed.slice(separator + 1));
      if (!key) continue;
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

async function resolveOrCreatePlatformTenant(prisma: PrismaClient): Promise<{
  tenant: PlatformTenantSummary;
  created: boolean;
}> {
  const existing = await prisma.tenant.findFirst({
    where: {
      OR: [{ type: "PLATFORM" }, { isPlatform: true }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return { tenant: existing, created: false };
  }

  const nowSuffix = Date.now().toString().slice(-6);
  const baseSlug = process.env.PLATFORM_TENANT_SLUG?.trim() || "platform";
  const fallbackSlug = `${baseSlug}-${nowSuffix}`;
  const platformName = process.env.PLATFORM_TENANT_NAME?.trim() || "Condo Sales OS Platform";

  try {
    const createdTenant = await prisma.tenant.create({
      data: {
        name: platformName,
        slug: baseSlug,
        type: "PLATFORM",
        isPlatform: true,
        selfSignupEnabled: false,
        defaultLanguage: "ES",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    return { tenant: createdTenant, created: true };
  } catch {
    const createdTenant = await prisma.tenant.create({
      data: {
        name: platformName,
        slug: fallbackSlug,
        type: "PLATFORM",
        isPlatform: true,
        selfSignupEnabled: false,
        defaultLanguage: "ES",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    return { tenant: createdTenant, created: true };
  }
}

async function run() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const input = parseArgs(process.argv.slice(2));

  loadEnvFiles();

  const unpooledUrl = process.env.DATABASE_URL_UNPOOLED;
  const pooledUrl = process.env.DATABASE_URL;
  if (!unpooledUrl && pooledUrl?.startsWith("prisma://")) {
    throw new Error(
      "DATABASE_URL is prisma://. Define DATABASE_URL_UNPOOLED with a direct postgresql:// URL for scripts.",
    );
  }

  const datasourceUrl = unpooledUrl ?? pooledUrl;
  if (datasourceUrl) {
    process.env.DATABASE_URL = datasourceUrl;
  }
  const prismaOptions = datasourceUrl
    ? ({
        datasources: {
          db: {
            url: datasourceUrl,
          },
        },
      } as ConstructorParameters<typeof PrismaClient>[0])
    : ({} as ConstructorParameters<typeof PrismaClient>[0]);

  const prisma = new PrismaClient({
    ...prismaOptions,
    // Some environments generate Prisma Client with `copyEngine: false`.
    // Force local engine usage so admin scripts can use postgresql:// URLs.
    __internal: {
      configOverride: (config: { copyEngine?: boolean }) => ({
        ...config,
        copyEngine: true,
      }),
    },
  } as ConstructorParameters<typeof PrismaClient>[0]);

  try {
    const { tenant: platformTenant, created: platformTenantCreated } =
      await resolveOrCreatePlatformTenant(prisma);

    const passwordHash = await hash(input.password, 10);
    const user = await prisma.user.upsert({
      where: {
        email: input.email,
      },
      update: {
        passwordHash,
        name: input.name,
      },
      create: {
        email: input.email,
        passwordHash,
        name: input.name,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const membership = await prisma.membership.upsert({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: platformTenant.id,
        },
      },
      update: {
        role: "ROOT",
        isActive: true,
      },
      create: {
        userId: user.id,
        tenantId: platformTenant.id,
        role: "ROOT",
        isActive: true,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    console.log("ROOT user ready.");
    if (platformTenantCreated) {
      console.log("platform tenant created automatically.");
    }
    console.log(`tenant: ${platformTenant.name} (${platformTenant.slug})`);
    console.log(`email : ${user.email}`);
    console.log(`name  : ${user.name ?? "(no name)"}`);
    console.log(`role  : ${membership.role}`);
    console.log(`active: ${membership.isActive}`);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  console.error(`Error: ${message}`);
  process.exitCode = 1;
});
