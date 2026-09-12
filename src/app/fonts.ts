import { Cormorant_Garamond, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

/**
 * Three families, self-hosted by next/font (no CLS, no Google network hop).
 *
 * Display — Cormorant Garamond: a true Garamond revival with razor-thin
 * hairlines. It is *the* fine-dining menu face. Restricted to >=20px so the
 * hairlines survive.
 *
 * Sans — Instrument Sans: a slightly narrow neo-grotesque with real personality
 * and enough density for ops tables. Critically, it is not Inter, which is what
 * makes most dashboards look identical.
 *
 * Mono — IBM Plex Mono: ticket ids, aging timers, table numbers. Humanist
 * warmth rather than the cold dev-tool feel of JetBrains Mono.
 */

export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-cormorant",
  adjustFontFallback: true,
});

export const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const fontVariables = `${cormorant.variable} ${instrument.variable} ${plexMono.variable}`;
