import { Hero } from "@/components/marketing/Hero";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { LiveDemoTeaser } from "@/components/marketing/LiveDemoTeaser";
import { getAllCourses } from "@/lib/courses";

export default function HomePage() {
  const courseCount = getAllCourses().length;
  return (
    <>
      <Hero courseCount={courseCount} />
      <FeatureGrid />
      <LiveDemoTeaser />
    </>
  );
}
