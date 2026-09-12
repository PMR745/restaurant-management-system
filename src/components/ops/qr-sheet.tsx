"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { useIsClient } from "@/lib/hooks/use-client-store";
import { useTableViews } from "@/lib/store/hooks";
import { RESTAURANT_SLUG } from "@/lib/seed/demo-data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { DiamondRule, SectionHeading, Surface } from "@/components/ui/surface";
import { HydrationGate } from "@/components/providers";

/**
 * Printable table tents.
 *
 * The codes are generated against `window.location.origin`, never a hardcoded
 * host — a QR pointing at localhost is unscannable from the phone you are
 * holding, which is the one device that matters here.
 */
export function QrSheet() {
  return (
    <HydrationGate fallback={<QrSkeleton />}>
      <QrContent />
    </HydrationGate>
  );
}

function QrContent() {
  const views = useTableViews();
  const isClient = useIsClient();

  // Built from the live origin, never a hardcoded host: a QR code pointing at
  // localhost is unscannable from the one device that matters here.
  const origin = isClient
    ? (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin)
    : "";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="print:hidden">
        <SectionHeading
          eyebrow="Table tents"
          title="QR codes"
          description={
            origin
              ? `Each code opens the guest menu for that table at ${origin}`
              : "Generating…"
          }
          action={
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-3.5" strokeWidth={1.5} />
              Print sheet
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {views.map((v) => (
          <QrCard
            key={v.table.id}
            code={v.table.code}
            label={v.table.label}
            seats={v.table.seats}
            url={origin ? `${origin}/t/${RESTAURANT_SLUG}/${v.table.code}` : ""}
          />
        ))}
      </div>
    </div>
  );
}

function QrCard({
  code,
  label,
  seats,
  url,
}: {
  code: string;
  label: string;
  seats: number;
  url: string;
}) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 480,
      margin: 1,
      errorCorrectionLevel: "M",
      // Warm palette even in the QR itself. Contrast stays far above the 3:1
      // a scanner needs, so legibility is not the trade.
      color: { dark: "#0D0C0Aff", light: "#E6CD98ff" },
    }).then((d) => {
      if (!cancelled) setDataUrl(d);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <Surface
      variant="gilded"
      className="flex flex-col items-center p-6 text-center print:border print:border-black print:bg-white print:shadow-none"
    >
      <p className="text-2xs font-medium uppercase tracking-luxe text-gold-300">
        Noir &amp; Gold
      </p>
      <p className="mt-3 font-display text-3xl font-light text-ink">{code}</p>
      <p className="text-2xs uppercase tracking-label text-ink-4">{label}</p>

      <div className="mt-5 rounded-sm bg-gold-300 p-2">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR code for ${label}`}
            className="size-36"
            width={144}
            height={144}
          />
        ) : (
          <Skeleton className="size-36 rounded-none" />
        )}
      </div>

      <DiamondRule className="mt-5 w-full max-w-24" />
      <p className="mt-3 text-xs leading-relaxed text-ink-3">
        Scan to view the menu
        <br />
        and order from your table
      </p>
      <p className="mt-2 text-[10px] text-ink-4">
        {seats} {seats === 1 ? "seat" : "seats"}
      </p>
    </Surface>
  );
}

function QrSkeleton() {
  return (
    <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-80 rounded-md" />
      ))}
    </div>
  );
}
