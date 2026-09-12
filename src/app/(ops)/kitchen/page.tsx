import type { Metadata } from "next";
import { KitchenBoard } from "@/components/ops/kitchen-board";

export const metadata: Metadata = { title: "The Pass" };

export default function KitchenPage() {
  return <KitchenBoard />;
}
