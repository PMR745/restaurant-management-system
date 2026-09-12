"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as React from "react";
import * as m from "motion/react-m";
import { ChefHat, ConciergeBell, Delete, LayoutGrid, Package } from "lucide-react";
import type { StaffRole } from "@/lib/domain/enums";
import { DEV_PINS } from "@/lib/auth/session";
import { useWaiters } from "@/lib/store/hooks";
import { useRmsStore } from "@/lib/store/store";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { DishImage, Initials } from "@/components/ui/misc";
import { DiamondRule, Surface } from "@/components/ui/surface";
import { IMG } from "@/lib/seed/images";

const ROLES: Array<{
  role: StaffRole;
  label: string;
  blurb: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { role: "admin", label: "Manager", blurb: "Floor, orders, menu and team", href: "/admin", icon: LayoutGrid },
  { role: "kitchen", label: "Kitchen", blurb: "The pass", href: "/kitchen", icon: ChefHat },
  { role: "waiter", label: "Waiter", blurb: "My section", href: "/waiter", icon: ConciergeBell },
  { role: "front_desk", label: "Front desk", blurb: "Takeaway and collection", href: "/takeaway", icon: Package },
];

export function LoginScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const waiters = useWaiters();
  const setIdentity = useRmsStore((s) => s.setIdentity);

  const [role, setRole] = React.useState<StaffRole | null>(null);
  const [staffId, setStaffId] = React.useState<string | null>(null);
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const reason = search.get("reason");
  const next = search.get("next");
  const chosen = ROLES.find((r) => r.role === role);
  const needsWaiter = role === "waiter" && !staffId;

  async function submit() {
    if (!role || pin.length < 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const name =
        role === "waiter"
          ? (waiters.find((w) => w.id === staffId)?.name ?? "Waiter")
          : (chosen?.label ?? role);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, pin, staffId, name }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "That PIN is not right.");
        setPin("");
        return;
      }

      setIdentity({ role, staffId, name });
      router.push(next ?? chosen?.href ?? "/admin");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center px-5 py-12">
      <div className="dish-frame absolute inset-0 opacity-30" data-kenburns>
        <DishImage src={IMG.roomDim} alt="" sizes="100vw" priority />
      </div>
      <div className="vignette absolute inset-0" aria-hidden />

      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="text-center">
          <h1 className="font-display text-4xl font-light tracking-display text-ink">
            Noir <span className="italic text-gold-300">&amp;</span> Gold
          </h1>
          <p className="mt-2 text-2xs uppercase tracking-luxe text-gold-300">
            Staff access
          </p>
          <DiamondRule className="mx-auto mt-6 max-w-40" />
        </div>

        {reason ? (
          <p className="mt-6 rounded-sm border border-warning/30 bg-warning/8 px-4 py-2.5 text-center text-xs text-warning">
            {reason === "forbidden"
              ? "That area belongs to a different role."
              : "Your session has ended. Please sign in again."}
          </p>
        ) : null}

        <Surface variant="gilded" className="mt-8 p-6">
          {!role ? (
            <>
              <p className="text-2xs font-medium uppercase tracking-label text-ink-3">
                Who are you this evening?
              </p>
              <div className="mt-4 grid gap-2">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setRole(r.role)}
                      className="group flex items-center gap-3 rounded-sm border border-line bg-surface-2 px-4 py-3 text-left transition-colors hover:border-line-gold hover:bg-surface-3"
                    >
                      <Icon className="size-4 shrink-0 text-ink-3 transition-colors group-hover:text-gold-300" strokeWidth={1.25} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink">{r.label}</span>
                        <span className="block text-xs text-ink-4">{r.blurb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : needsWaiter ? (
            <>
              <p className="text-2xs font-medium uppercase tracking-label text-ink-3">
                Which section is yours?
              </p>
              <div className="mt-4 grid gap-2">
                {waiters.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setStaffId(w.id)}
                    className="flex items-center gap-3 rounded-sm border border-line bg-surface-2 px-4 py-3 text-left transition-colors hover:border-line-gold hover:bg-surface-3"
                  >
                    <Initials initials={w.initials} />
                    <span className="text-sm text-ink">{w.name}</span>
                  </button>
                ))}
              </div>
              <Button
                variant="quiet"
                size="sm"
                className="mt-4"
                onClick={() => setRole(null)}
              >
                Back
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-2xs font-medium uppercase tracking-label text-ink-3">
                  {chosen?.label}
                  {staffId
                    ? ` · ${waiters.find((w) => w.id === staffId)?.name}`
                    : ""}
                </p>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    setRole(null);
                    setStaffId(null);
                    setPin("");
                    setError(null);
                  }}
                >
                  Change
                </Button>
              </div>

              <div className="mt-5 flex justify-center gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "size-3 rounded-full border transition-colors duration-[--duration-micro]",
                      i < pin.length
                        ? "border-gold-400 bg-gold-400"
                        : "border-ink-4",
                    )}
                  />
                ))}
              </div>

              {error ? (
                <p className="mt-4 text-center text-xs text-danger">{error}</p>
              ) : null}

              <div className="mx-auto mt-6 grid max-w-56 grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
                  (key, i) =>
                    key === "" ? (
                      <span key={i} />
                    ) : (
                      <button
                        key={i}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setError(null);
                          if (key === "⌫") setPin((p) => p.slice(0, -1));
                          else if (pin.length < 4) setPin((p) => p + key);
                        }}
                        className="grid h-12 place-items-center rounded-sm border border-line bg-surface-2 font-mono text-md tabular text-ink transition-colors hover:border-line-gold hover:bg-surface-3 active:bg-surface-4"
                      >
                        {key === "⌫" ? (
                          <Delete className="size-4 text-ink-3" strokeWidth={1.5} />
                        ) : (
                          key
                        )}
                      </button>
                    ),
                )}
              </div>

              <Button
                variant="gold"
                size="lg"
                luxe
                className="mt-6 w-full"
                disabled={pin.length < 4 || busy}
                onClick={submit}
              >
                {busy ? "Checking…" : "Sign in"}
              </Button>

              <p className="mt-4 text-center text-xs text-ink-4">
                Demo PIN ·{" "}
                <span className="font-mono text-gold-400">
                  {DEV_PINS[role]}
                </span>
              </p>
            </>
          )}
        </Surface>

        <p className="mt-6 text-center text-xs text-ink-4">
          Just exploring?{" "}
          <Link href="/" className="text-gold-300 underline-offset-4 hover:underline">
            Open the demo launcher
          </Link>{" "}
          — no sign-in needed.
        </p>
      </m.div>
    </div>
  );
}
