import Link from "next/link";
import {
  ArrowRight,
  ChefHat,
  ConciergeBell,
  LayoutGrid,
  Package,
  QrCode,
  Smartphone,
} from "lucide-react";
import { DishImage } from "@/components/ui/misc";
import { DiamondRule, Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { IMG } from "@/lib/seed/images";

/**
 * The demo launcher.
 *
 * Not part of the product — a real deployment would land staff on /login and
 * guests on a QR link. It exists so the whole system can be explored without
 * anyone explaining which URL does what, which is what a POC is actually for.
 */

const ROLES = [
  {
    href: "/t/noir/T07",
    label: "Guest",
    title: "Scan the table",
    blurb:
      "Table 07 · the Chef's Counter. Browse the menu, build an order and watch it move through the kitchen.",
    icon: Smartphone,
    featured: true,
  },
  {
    href: "/kitchen",
    label: "Kitchen",
    title: "The pass",
    blurb: "Four lanes, aging timers, tickets that fly between stations.",
    icon: ChefHat,
  },
  {
    href: "/waiter",
    label: "Service",
    title: "Waiter board",
    blurb: "Assigned sections and every dish waiting to be run.",
    icon: ConciergeBell,
  },
  {
    href: "/admin/tables",
    label: "Front desk",
    title: "Floor map",
    blurb: "Twelve tables, live status, waiter assignment.",
    icon: LayoutGrid,
  },
  {
    href: "/takeaway",
    label: "Front desk",
    title: "Takeaway & online",
    blurb: "Build a collection order, or simulate a Zomato feed.",
    icon: Package,
  },
  {
    href: "/admin/qr",
    label: "Setup",
    title: "QR codes",
    blurb: "Printable table tents, generated against this deployment.",
    icon: QrCode,
  },
];

export default function LauncherPage() {
  return (
    <div className="relative min-h-dvh">
      <div className="dish-frame absolute inset-x-0 top-0 h-[70vh]" data-scrim="hero">
        <DishImage
          src={IMG.heroRoom}
          alt="The dining room at Noir & Gold"
          sizes="100vw"
          priority
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 pb-20 pt-[28vh] sm:px-8">
        <header className="text-center">
          <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
            Restaurant management · Proof of concept
          </p>
          <h1 className="text-engrave mt-5 font-display text-[clamp(3rem,10vw,5.5rem)] font-light leading-[0.95] tracking-display text-ink">
            Noir <span className="italic text-gold-300">&amp;</span> Gold
          </h1>
          {/* Letterpress here too: this paragraph sits over the photograph,
              where plain body text loses its edges against the highlights. */}
          <p className="text-engrave mx-auto mt-5 max-w-lg text-base leading-relaxed text-ink">
            One system, six vantage points. A guest orders from their table and
            the kitchen, the floor and the service team all know about it before
            they have put their phone down.
          </p>
          <DiamondRule className="mx-auto mt-10 max-w-64" />
        </header>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.href}
                href={role.href}
                className={role.featured ? "sm:col-span-2 lg:col-span-1" : ""}
              >
                <Surface
                  variant={role.featured ? "gilded" : "flat"}
                  interactive
                  className="group h-full p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon
                      className={
                        role.featured
                          ? "size-5 text-gold-300"
                          : "size-5 text-ink-3"
                      }
                      strokeWidth={1.25}
                    />
                    <span className="text-2xs uppercase tracking-luxe text-ink-4">
                      {role.label}
                    </span>
                  </div>
                  <h2 className="mt-4 font-display text-xl font-light text-ink">
                    {role.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-3">
                    {role.blurb}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-2xs uppercase tracking-luxe text-gold-300 transition-transform duration-[--duration-fast] group-hover:translate-x-0.5">
                    Open
                    <ArrowRight className="size-3.5" strokeWidth={1.5} />
                  </span>
                </Surface>
              </Link>
            );
          })}
        </section>

        <Surface variant="flat" className="mt-10 p-6">
          <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
            How to see it working
          </p>
          <ol className="mt-4 grid gap-3 text-sm leading-relaxed text-ink-2 sm:grid-cols-2">
            <li className="flex gap-3">
              <span className="font-mono text-gold-400">01</span>
              Open <span className="text-ink">the guest view</span> and{" "}
              <span className="text-ink">the pass</span> in two windows, side by
              side.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-gold-400">02</span>
              Place an order as the guest. It appears in the kitchen&apos;s New
              lane immediately.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-gold-400">03</span>
              Accept, start and mark it ready. The guest&apos;s timeline follows
              every step.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-gold-400">04</span>
              Serve it from <span className="text-ink">the waiter board</span>,
              and watch the table settle on the floor map.
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="gold" size="sm" asChild>
              <Link href="/t/noir/T07">Start as a guest</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/kitchen">Open the pass</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Staff sign in</Link>
            </Button>
          </div>
        </Surface>

        <p className="mt-10 text-center text-xs leading-relaxed text-ink-4">
          Billing, payment, guest reviews and the sales dashboard are out of
          scope for this build — the flow ends at <em>Served</em>.
        </p>
      </div>
    </div>
  );
}
