import type { Metadata } from "next";
import { MenuManager } from "@/components/ops/menu-manager";

export const metadata: Metadata = { title: "Menu" };

export default function Page() {
  return <MenuManager />;
}
