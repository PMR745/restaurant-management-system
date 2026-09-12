"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Radix supplies the behaviour worth not rebuilding — focus trap and return,
 * scroll lock, Escape, outside-click, aria wiring, and the `data-state`
 * attributes that make exit animations possible at all. The skin is entirely
 * ours; nothing here inherits a component-library look.
 *
 * Two placements: `right` for ops (a detail panel beside the list you came
 * from) and `bottom` for phones (thumb-reachable, with a grab handle).
 */

export const SheetRoot = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  side = "right",
  className,
  children,
  title,
  description,
  width = "md",
}: {
  side?: "right" | "bottom";
  className?: string;
  children: React.ReactNode;
  title: string;
  description?: string;
  width?: "md" | "lg";
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-void/70 backdrop-blur-sm",
          "data-[state=open]:animate-[fade-in_320ms_var(--ease-standard)]",
          "data-[state=closed]:animate-[fade-out_200ms_var(--ease-in-luxe)]",
        )}
      />
      <Dialog.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface-1 shadow-xl outline-none",
          side === "right" && [
            "inset-y-0 right-0 w-full border-l border-line-gold",
            width === "md" ? "sm:max-w-[27.5rem]" : "sm:max-w-[32.5rem]",
            "data-[state=open]:animate-[slide-in-right_420ms_var(--ease-swift)]",
            "data-[state=closed]:animate-[slide-out-right_260ms_var(--ease-in-luxe)]",
          ],
          side === "bottom" && [
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl border-t border-line-gold",
            "data-[state=open]:animate-[slide-in-bottom_420ms_var(--ease-swift)]",
            "data-[state=closed]:animate-[slide-out-bottom_260ms_var(--ease-in-luxe)]",
          ],
          className,
        )}
      >
        {side === "bottom" ? (
          <div className="flex justify-center pt-3" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-ink-4/60" />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <Dialog.Title className="font-display text-xl font-light text-ink">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm text-ink-3">
                {description}
              </Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">{title}</Dialog.Description>
            )}
          </div>
          <Dialog.Close
            className="-mr-1 grid size-8 shrink-0 place-items-center rounded-sm text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={1.5} />
          </Dialog.Close>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

/* ── centred modal ───────────────────────────────────────────────────────── */

export const DialogRoot = Dialog.Root;
export const DialogTrigger = Dialog.Trigger;
export const DialogClose = Dialog.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
}: {
  className?: string;
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-void/75 backdrop-blur-sm data-[state=open]:animate-[fade-in_320ms_var(--ease-standard)] data-[state=closed]:animate-[fade-out_200ms_var(--ease-in-luxe)]" />
      <Dialog.Content
        className={cn(
          "gilded fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface-2 p-6 shadow-xl outline-none",
          "data-[state=open]:animate-[modal-in_320ms_var(--ease-luxe)]",
          "data-[state=closed]:animate-[fade-out_200ms_var(--ease-in-luxe)]",
          className,
        )}
      >
        <Dialog.Title className="font-display text-xl font-light text-ink">
          {title}
        </Dialog.Title>
        {description ? (
          <Dialog.Description className="mt-2 text-sm text-ink-3">
            {description}
          </Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
        )}
        <div className="mt-5">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
