import type { Metadata } from "next";
import { FloorMap } from "@/components/ops/floor-map";

export const metadata: Metadata = { title: "Floor" };

export default function Page() {
  return <FloorMap />;
}
