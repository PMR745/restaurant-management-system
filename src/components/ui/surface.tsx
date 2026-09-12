import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * The workhorse container.
 *
 * `glass` is deliberately restricted to surfaces that sit over imagery — a
 * blur over flat colour is the glassmorphism trap: it costs a compositing
 * layer and looks like nothing at all.
 */
const surface = cva("relative rounded-md", {
  variants: {
    variant: {
      flat: "border border-line bg-surface-1 specular shadow-sm",
      elevated: "border border-line bg-surface-2 specular shadow-md",
      gilded: "gilded bg-surface-2 specular shadow-md",
      glass:
        "border border-line bg-surface-1/55 backdrop-blur-2xl backdrop-saturate-150 shadow-md supports-[not(backdrop-filter:blur(0))]:bg-surface-1/95",
      bare: "",
    },
    interactive: {
      true: "transition-[transform,background-color,box-shadow] duration-[--duration-fast] ease-[--ease-standard] hover:-translate-y-0.5 hover:shadow-lg",
      false: "",
    },
  },
  defaultVariants: { variant: "flat", interactive: false },
});

export interface SurfaceProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surface> {
  as?: "div" | "section" | "article" | "aside" | "li";
}

export const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
  function Surface({ className, variant, interactive, as = "div", ...props }, ref) {
    // The element type is dynamic, so the per-tag prop unions can't be
    // reconciled statically. The public surface stays typed as a div.
    const Comp = as as React.ElementType;
    return (
      <Comp
        ref={ref}
        className={cn(surface({ variant, interactive }), className)}
        {...props}
      />
    );
  },
);

/**
 * Sticky headers, floating bars, the customer cart pill. Always over content
 * that scrolls beneath it, which is what makes the blur do real work.
 */
export function GlassPanel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-obsidian/72 backdrop-blur-2xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(0))]:bg-obsidian/95",
        className,
      )}
      {...props}
    />
  );
}

/** Eyebrow + serif title + optional gold rule. Carries most of the luxury. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-6", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-2xs font-medium uppercase tracking-luxe text-gold-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-2xl font-light text-ink">{title}</h2>
        {description ? (
          <p className="mt-1.5 max-w-prose text-sm text-ink-3">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** The printed-menu divider: a hairline either side of a small diamond. */
export function DiamondRule({ className }: { className?: string }) {
  return (
    <div
      className={cn("rule-diamond select-none text-[10px]", className)}
      aria-hidden
    >
      ◆
    </div>
  );
}
