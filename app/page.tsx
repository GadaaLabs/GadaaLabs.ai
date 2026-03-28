import { Hero } from "@/components/marketing/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { LiveDemoTeaser } from "@/components/marketing/LiveDemoTeaser";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <LiveDemoTeaser />
    </>
  );
}
