import type { Metadata } from "next";
import { WaiterBoard } from "@/components/ops/waiter-board";

export const metadata: Metadata = { title: "Service" };

export default function Page() {
  return <WaiterBoard />;
}
