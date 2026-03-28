import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import registry from "@/content/demos/registry.json";
import { ChatDemo } from "@/components/demos/ChatDemo";
import { TokenizerDemo } from "@/components/demos/TokenizerDemo";
import { ArrowLeft } from "lucide-react";

type DemoEntry = { slug: string; title: string; description: string; tags: string[]; component: string };

const componentMap: Record<string, React.ComponentType> = {
  ChatDemo,
  TokenizerDemo,
};

export function generateStaticParams() {
  return registry.map((d: DemoEntry) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const demo = (registry as DemoEntry[]).find((d) => d.slug === slug);
  if (!demo) return {};
  return { title: demo.title, description: demo.description };
}

export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = (registry as DemoEntry[]).find((d) => d.slug === slug);
  if (!demo) notFound();

  const DemoComponent = componentMap[demo.component];
  if (!DemoComponent) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/demos" className="inline-flex items-center gap-1.5 text-sm mb-8"
        style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft className="h-3.5 w-3.5" /> All Demos
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          {demo.tags.map((tag) => (
            <span key={tag} className="text-xs px-2.5 py-0.5 rounded-full"
              style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", color: "var(--color-cyan-400)" }}>
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{demo.title}</h1>
        <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>{demo.description}</p>
      </div>

      <DemoComponent />
    </div>
  );
}
