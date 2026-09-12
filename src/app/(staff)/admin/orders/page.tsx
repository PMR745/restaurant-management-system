import type { Metadata } from "next";
import { OrdersConsole } from "@/components/ops/orders-console";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return <OrdersConsole />;
}
