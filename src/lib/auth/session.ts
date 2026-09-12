import type { StaffRole } from "@/lib/domain/enums";

/**
 * A demo gate that is honest about being a demo gate — but one that cannot be
 * bypassed from devtools, and that ships no credential to the browser.
 *
 * Shared per-role PINs, verified server-side, carried in an HMAC-signed
 * httpOnly cookie. ~90 lines and no dependencies.
 *
 * IMPORTANT: this module is imported by middleware.ts, which runs on the edge
 * runtime. Web Crypto only — importing `node:crypto` anywhere in this file's
 * dependency graph breaks the entire middleware at build time.
 */

export const SESSION_COOKIE = "rms_session";
const TTL_MS = 12 * 60 * 60 * 1000;

export interface SessionPayload {
  role: StaffRole;
  staffId: string | null;
  name: string;
  exp: number;
}

const enc = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  // Allocating the ArrayBuffer explicitly keeps this a Uint8Array<ArrayBuffer>
  // rather than the ArrayBufferLike union, which crypto.subtle won't accept.
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  payload: Omit<SessionPayload, "exp">,
  secret: string,
): Promise<string> {
  const full: SessionPayload = { ...payload, exp: Date.now() + TTL_MS };
  const body = b64urlEncode(enc.encode(JSON.stringify(full)));
  const sig = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(body));
  return `${body}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined,
  secret: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const ok = await crypto.subtle.verify(
    "HMAC",
    await key(secret),
    b64urlDecode(sig),
    enc.encode(body),
  );
  if (!ok) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(body)),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Which roles may enter which routes. Admin sees everything. */
export const ROUTE_ROLES: Array<{ prefix: string; roles: StaffRole[] }> = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/kitchen", roles: ["admin", "kitchen"] },
  { prefix: "/waiter", roles: ["admin", "waiter"] },
  { prefix: "/takeaway", roles: ["admin", "front_desk"] },
];

export function rolesFor(pathname: string): StaffRole[] | null {
  return ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix))?.roles ?? null;
}

/**
 * Dev PINs are visible on the login screen as hint chips — this is a demo, and
 * making someone guess helps nobody. In production they must come from the
 * environment.
 */
export const DEV_PINS: Record<StaffRole, string> = {
  admin: "4829",
  kitchen: "7712",
  waiter: "3305",
  front_desk: "9044",
};

export function pinFor(role: StaffRole): string {
  const fromEnv = {
    admin: process.env.ADMIN_PIN,
    kitchen: process.env.KITCHEN_PIN,
    waiter: process.env.WAITER_PIN,
    front_desk: process.env.FRONTDESK_PIN,
  }[role];
  return fromEnv || DEV_PINS[role];
}

export function authSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    // Deterministic fallback so the demo works with zero configuration. It is
    // not a secret, and the README says so — set AUTH_SECRET for anything real.
    "noir-and-gold-poc-development-secret-not-for-production"
  );
}

/** Timing-safe string compare. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
