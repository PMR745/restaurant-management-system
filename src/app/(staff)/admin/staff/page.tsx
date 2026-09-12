import type { Metadata } from "next";
import { StaffBoard } from "@/components/ops/staff-board";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <StaffBoard />;
}
