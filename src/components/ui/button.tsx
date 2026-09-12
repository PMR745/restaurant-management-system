"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Five variants, one of which is solid gold.
 *
 * The discipline that matters: at most ONE `gold` button is visible per screen.
 * Gold as a large fill stops reading as precious the moment there are three of
 * them. Everything secondary is a hairline or a ghost.
 *
 * Text on gold is `gold-ink`, never white — white on gold-500 is 2.0:1, which
 * is unreadable and the single most common way this palette gets ruined.
 */
const button = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-medium tracking-label transition-[transform,background-color,border-color,color,box-shadow] duration-[--duration-fast] ease-[--ease-standard] disabled:pointer-events-none disabled:opacity-40 active:translate-y-0",
  {
    variants: {
      variant: {
        gold:
          "sheen specular bg-gold-500 text-gold-ink hover:-translate-y-px hover:bg-gold-400 hover:shadow-[--shadow-gold] active:bg-gold-600",
        outline:
          "border border-line-gold bg-transparent text-gold-300 hover:-translate-y-px hover:border-line-gold-hot hover:bg-gold-500/8 hover:text-gold-200",
        solid:
          "specular border border-line-strong bg-surface-3 text-ink hover:-translate-y-px hover:bg-surface-4",
        ghost: "text-ink-2 hover:bg-surface-3 hover:text-ink",
        quiet:
          "px-0 text-ink-3 underline-offset-4 hover:text-gold-300 hover:underline",
        danger:
          "border border-danger/30 bg-danger/10 text-danger hover:border-danger/50 hover:bg-danger/18",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-sm",
        icon: "size-10 px-0",
        "icon-sm": "size-8 px-0",
      },
      /** Uppercase + wide tracking. Reserved for the primary customer CTA. */
      luxe: {
        true: "text-2xs uppercase tracking-luxe",
        false: "",
      },
    },
    defaultVariants: { variant: "solid", size: "md", luxe: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant, size, luxe, asChild = false, ...props },
    ref,
  ) {
    const Comp = asChild ? Slot.Root : "button";
    return (
      <Comp
        ref={ref}
        className={cn(button({ variant, size, luxe }), className)}
        {...props}
      />
    );
  },
);

export { button as buttonVariants };
