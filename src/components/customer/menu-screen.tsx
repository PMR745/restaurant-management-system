"use client";

import Link from "next/link";
import * as React from "react";
import * as m from "motion/react-m";
import { ArrowDown, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import {
  useCategories,
  useMenuItems,
  useRestaurant,
  useSignatureItems,
  useTableByCode,
} from "@/lib/store/hooks";
import { useRmsStore } from "@/lib/store/store";
import { cn } from "@/lib/utils/cn";
import { DishImage, EmptyState, Skeleton } from "@/components/ui/misc";
import { DiamondRule } from "@/components/ui/surface";
import {
  MenuItemFeature,
  MenuItemRow,
} from "@/components/domain/menu-item-card";
import { HydrationGate } from "@/components/providers";
import { useTableRoute } from "./customer-shell";

/**
 * The QR landing plus the full menu on one scrolling page.
 *
 * One page rather than a landing that navigates to a menu: a guest who has
 * just scanned a code wants to see food, not a splash screen with a button.
 * The hero occupies the first viewport and the menu begins immediately below
 * it, so the scroll itself is the call to action.
 */
export function MenuScreen() {
  return (
    <HydrationGate fallback={<MenuSkeleton />}>
      <MenuContent />
    </HydrationGate>
  );
}

function MenuContent() {
  const { tableCode, base } = useTableRoute();
  const restaurant = useRestaurant();
  const table = useTableByCode(tableCode);
  const categories = useCategories();
  const items = useMenuItems();
  const signatures = useSignatureItems();
  const addToCart = useRmsStore((s) => s.addToCart);

  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});

  // Scroll-spy so the rail pill tracks the section you are actually reading.
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveCategory(visible.target.id);
      },
      { rootMargin: "-112px 0px -70% 0px", threshold: 0 },
    );
    for (const el of Object.values(sectionRefs.current)) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [categories.length]);

  if (!table) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="We couldn't find that table"
        description={`No table is registered under the code “${tableCode}”. Please ask a member of staff, or scan the code on your table again.`}
      />
    );
  }

  return (
    <div className="page-enter">
      {/* ── the curtain-raiser ─────────────────────────────────────────── */}
      <header className="relative -mt-14 flex h-[100dvh] flex-col justify-end overflow-hidden">
        <div className="dish-frame absolute inset-0" data-kenburns data-scrim="hero">
          <DishImage
            src={restaurant?.heroImageUrl ?? ""}
            alt="The dining room at Noir & Gold"
            sizes="100vw"
            priority
          />
        </div>

        <m.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative z-[3] px-6 pb-16 text-center"
        >
          <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
            {table.label} · {table.seats} {table.seats === 1 ? "seat" : "seats"}
          </p>

          <h1 className="text-engrave mt-4 font-display text-[clamp(2.75rem,13vw,4.5rem)] font-light leading-[0.95] tracking-display text-ink">
            Noir <span className="italic text-gold-300">&amp;</span> Gold
          </h1>

          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-ink-2">
            {restaurant?.tagline}
          </p>

          <DiamondRule className="mx-auto mt-8 max-w-[12rem]" />

          <p className="mt-8 inline-flex items-center gap-2 text-2xs uppercase tracking-luxe text-ink-3">
            The menu follows
            <ArrowDown className="size-3.5 animate-bounce" strokeWidth={1.5} />
          </p>
        </m.div>
      </header>

      {/* ── category rail ──────────────────────────────────────────────── */}
      {/* Opaque enough to stand on its own: backdrop-blur is a progressive
          enhancement, and a rail that lets dish names read through it looks
          broken rather than glassy. */}
      <nav className="sticky top-14 z-30 border-b border-line bg-obsidian/95 backdrop-blur-2xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0))]:bg-obsidian">
        <div className="edge-fade-x no-scrollbar mx-auto flex max-w-[560px] snap-x gap-1 overflow-x-auto px-4 py-2.5">
          {categories.map((c) => {
            const active = activeCategory === c.slug;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  sectionRefs.current[c.slug]?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                }
                className={cn(
                  "relative shrink-0 snap-start rounded-full px-3 py-1.5 text-2xs uppercase tracking-label transition-colors duration-[--duration-micro]",
                  active ? "text-gold-200" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {active ? (
                  <m.span
                    layoutId="rail-pill"
                    className="absolute inset-0 rounded-full border border-line-gold bg-surface-2"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <span className="relative">{c.name}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto max-w-[560px] px-5 pb-36">
        {/* ── chef's selection ─────────────────────────────────────────── */}
        {signatures.length ? (
          <section className="pt-10">
            <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
              Chef&apos;s selection
            </p>
            <div className="no-scrollbar -mx-5 mt-4 flex snap-x gap-3 overflow-x-auto px-5">
              {signatures.slice(0, 6).map((item, i) => (
                <MenuItemFeature
                  key={item.id}
                  item={item}
                  href={`${base}/item/${item.id}`}
                  priority={i < 2}
                  className="w-44 shrink-0 snap-start"
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* ── the menu proper ──────────────────────────────────────────── */}
        {categories.map((category) => {
          const categoryItems = items.filter((i) => i.categoryId === category.id);
          if (!categoryItems.length) return null;

          return (
            <section
              key={category.id}
              id={category.slug}
              ref={(el) => {
                sectionRefs.current[category.slug] = el;
              }}
              className="scroll-mt-[104px] pt-12"
            >
              <div className="text-center">
                <h2 className="font-display text-2xl font-light text-ink">
                  {category.name}
                </h2>
                {category.description ? (
                  <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-3">
                    {category.description}
                  </p>
                ) : null}
                <DiamondRule className="mx-auto mt-5 max-w-[9rem]" />
              </div>

              <ul className="mt-2 divide-y divide-line">
                {categoryItems.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    href={`${base}/item/${item.id}`}
                    onAdd={() => {
                      addToCart(item.id, 1);
                      toast.success(`${item.name} added`, {
                        description: "Tap the bar below to review your order.",
                      });
                    }}
                  />
                ))}
              </ul>
            </section>
          );
        })}

        <footer className="pt-14 text-center">
          <DiamondRule className="mx-auto max-w-[6rem]" />
          <p className="mt-6 text-xs leading-relaxed text-ink-4">
            Prices in Indian Rupees. Please tell us about any allergies —
            <br />
            our team will guide you.
          </p>
          <Link
            href={`${base}/cart`}
            className="mt-4 inline-block text-2xs uppercase tracking-luxe text-gold-300 hover:text-gold-200"
          >
            Review your order
          </Link>
        </footer>
      </div>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div>
      <Skeleton className="h-[100dvh] rounded-none" />
      <div className="mx-auto max-w-[560px] space-y-6 px-5 py-10">
        <Skeleton className="mx-auto h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="size-24 shrink-0 rounded-sm" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
