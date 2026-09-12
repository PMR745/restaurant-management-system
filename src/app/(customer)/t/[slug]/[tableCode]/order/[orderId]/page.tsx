import { TrackingScreen } from "@/components/customer/tracking-screen";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <TrackingScreen orderId={orderId} />;
}
