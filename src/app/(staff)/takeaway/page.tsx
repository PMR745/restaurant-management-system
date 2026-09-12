import type { Metadata } from "next";
import { TakeawayDesk } from "@/components/ops/takeaway-desk";

export const metadata: Metadata = { title: "Takeaway" };

export default function Page() {
  return <TakeawayDesk />;
}
