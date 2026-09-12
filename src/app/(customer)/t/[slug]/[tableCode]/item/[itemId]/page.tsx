import { ItemScreen } from "@/components/customer/item-screen";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  return <ItemScreen itemId={itemId} />;
}
