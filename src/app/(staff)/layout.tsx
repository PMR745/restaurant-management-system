import { OpsShell } from "@/components/ops/ops-shell";

/**
 * Everything except the kitchen board, which deliberately has no chrome —
 * it lives on a wall, where a sidebar would be wasted pixels.
 */
export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OpsShell>{children}</OpsShell>;
}
