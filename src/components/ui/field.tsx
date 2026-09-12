"use client";

import { Select, Switch } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Labels sit above the control in eyebrow style rather than floating inside
 * it. Floating labels read as consumer-app; an engraved small-caps label reads
 * as a form in a hotel.
 */

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-2xs font-medium uppercase tracking-label text-ink-3",
        className,
      )}
      {...props}
    />
  );
}

const fieldBase =
  "w-full rounded-xs border border-line-strong bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-4 transition-colors duration-[--duration-micro] hover:border-line-gold focus:border-line-gold-hot disabled:opacity-40";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(fieldBase, "min-h-20 resize-y py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
});

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-4">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── select ──────────────────────────────────────────────────────────────── */

export function SelectField({
  value,
  onValueChange,
  placeholder,
  options,
  className,
  ariaLabel,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          fieldBase,
          "flex h-10 items-center justify-between gap-2 text-left",
          className,
        )}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDown className="size-3.5 text-ink-3" strokeWidth={1.5} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-[60] max-h-72 min-w-[--radix-select-trigger-width] overflow-hidden rounded-sm border border-line-strong bg-surface-2 p-1 shadow-lg"
        >
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item
                key={o.value}
                value={o.value}
                className="relative flex h-8 cursor-pointer select-none items-center rounded-xs pl-7 pr-3 text-sm text-ink-2 outline-none data-[highlighted]:bg-surface-3 data-[highlighted]:text-ink"
              >
                <Select.ItemIndicator className="absolute left-2">
                  <Check className="size-3.5 text-gold-300" strokeWidth={2} />
                </Select.ItemIndicator>
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

/* ── switch ──────────────────────────────────────────────────────────────── */

export function Toggle({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-3", className)}>
      <Switch.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 shrink-0 rounded-full border border-line-strong bg-surface-4 transition-colors duration-[--duration-fast] data-[state=checked]:border-gold-600 data-[state=checked]:bg-gold-600"
      >
        <Switch.Thumb className="block size-4 translate-x-1 rounded-full bg-ink-3 shadow-sm transition-transform duration-[--duration-fast] ease-[--ease-swift] data-[state=checked]:translate-x-6 data-[state=checked]:bg-gold-100" />
      </Switch.Root>
      {label ? <span className="text-sm text-ink-2">{label}</span> : null}
    </label>
  );
}
