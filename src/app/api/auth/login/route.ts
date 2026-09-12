import { NextResponse } from "next/server";
import { STAFF_ROLE, type StaffRole } from "@/lib/domain/enums";
import {
  SESSION_COOKIE,
  authSecret,
  pinFor,
  safeEqual,
  signSession,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { role?: string; pin?: string; staffId?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const role = body.role as StaffRole;
  if (!STAFF_ROLE.includes(role)) {
    return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  }

  // A small constant delay on every attempt: enough to make scripted guessing
  // tedious without making a legitimate sign-in feel slow.
  await new Promise((r) => setTimeout(r, 400));

  if (!body.pin || !safeEqual(body.pin, pinFor(role))) {
    return NextResponse.json({ error: "That PIN is not right." }, { status: 401 });
  }

  const token = await signSession(
    {
      role,
      staffId: body.staffId ?? null,
      name: body.name ?? role.replace("_", " "),
    },
    authSecret(),
  );

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}
