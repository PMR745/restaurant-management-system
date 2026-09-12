import type { Metadata } from "next";
import { QrSheet } from "@/components/ops/qr-sheet";

export const metadata: Metadata = { title: "QR codes" };

export default function Page() {
  return <QrSheet />;
}
