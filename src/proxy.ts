import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  authSecret,
  rolesFor,
  verifySession,
} from "@/lib/auth/session";

/**
 * The staff route guard. (Next 16 renamed this convention from `middleware`
 * to `proxy`; the behaviour is unchanged.)
 *
 * Everything it touches must be Web-Crypto-only — see the note in
 * lib/auth/session.ts.
 *
 * Set `DEMO_OPEN_ACCESS=0` to enable the gate. It is OFF by default for this
 * POC deployment: the whole point is that anyone with the link can walk every
 * role without being handed four PINs first. The login screen still works, and
 * flipping this variable turns the guard on with no code change.
 */
export async function proxy(request: NextRequest) {
  if (process.env.DEMO_OPEN_ACCESS !== "0") return NextResponse.next();

  const { pathname } = request.nextUrl;
  const allowed = rolesFor(pathname);
  if (!allowed) return NextResponse.next();

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    authSecret(),
  );

  if (!session) {
    return redirectToLogin(request, pathname, "expired");
  }
  if (!allowed.includes(session.role)) {
    return redirectToLogin(request, pathname, "forbidden");
  }
  return NextResponse.next();
}

function redirectToLogin(
  request: NextRequest,
  next: string,
  reason: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(next)}&reason=${reason}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/kitchen/:path*",
    "/waiter/:path*",
    "/takeaway/:path*",
  ],
};
