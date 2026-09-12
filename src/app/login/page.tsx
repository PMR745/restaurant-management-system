import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginScreen } from "@/components/ops/login-screen";

export const metadata: Metadata = { title: "Staff access" };

export default function LoginPage() {
  // `useSearchParams` inside LoginScreen opts the route into client-side
  // rendering; without a boundary Next refuses to prerender the page.
  return (
    <Suspense fallback={<div className="min-h-dvh bg-obsidian" />}>
      <LoginScreen />
    </Suspense>
  );
}
