/**
 * Money is integer minor units (paise) everywhere in the domain. One
 * `0.1 + 0.2` in a demo total is a credibility hit, so floats never enter.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 68000 (paise) -> "₹680" */
export function formatMoney(minorUnits: number): string {
  return inr.format(Math.round(minorUnits / 100));
}

/** Just the digits, for when the ₹ is rendered separately. */
export function formatAmount(minorUnits: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(minorUnits / 100));
}

export function formatSeq(seqNo: number): string {
  return `#${String(seqNo).padStart(4, "0")}`;
}

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return timeFmt.format(new Date(iso));
}

/** mm:ss for aging timers. Clamped at 0 so clock skew can't show negatives. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

/** The four aging bands. A separate axis from status — urgency may be loud. */
export type AgeBand = "fresh" | "warn" | "late" | "critical";

export function ageBand(elapsedMs: number): AgeBand {
  const minutes = elapsedMs / 60_000;
  if (minutes >= 18) return "critical";
  if (minutes >= 12) return "late";
  if (minutes >= 6) return "warn";
  return "fresh";
}

export const AGE_BAND_CLASS: Record<AgeBand, string> = {
  fresh: "text-age-fresh",
  warn: "text-age-warn",
  late: "text-age-late",
  critical: "text-age-critical",
};
