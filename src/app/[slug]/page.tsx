import { SimulatorClient } from "./SimulatorClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantPage({ params }: PageProps) {
  const { slug } = await params;

  return <SimulatorClient slug={slug} />;
}
