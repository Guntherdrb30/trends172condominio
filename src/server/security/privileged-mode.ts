import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "privileged_mode";
const TTL_SECONDS = 15 * 60;

type PrivilegedPayload = {
  userId: string;
  tenantId: string;
  exp: number;
};

function getSigningSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.ROOT_MASTER_KEY;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("AUTH_SECRET or ROOT_MASTER_KEY must be configured in production.");
  }
  return secret ?? "dev_secret";
}

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(data: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function createPrivilegedToken(userId: string, tenantId: string) {
  const payload: PrivilegedPayload = {
    userId,
    tenantId,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const payloadRaw = JSON.stringify(payload);
  const encoded = toBase64Url(payloadRaw);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyPrivilegedToken(token: string | undefined | null) {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = sign(encoded);
  if (!safeEqual(expectedSignature, signature)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as PrivilegedPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function readPrivilegedCookie() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(COOKIE_NAME)?.value;
  return verifyPrivilegedToken(rawToken);
}

export function getPrivilegedCookieName() {
  return COOKIE_NAME;
}

export function getPrivilegedTtlSeconds() {
  return TTL_SECONDS;
}
