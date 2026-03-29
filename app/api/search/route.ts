import { getAllArticles } from "@/lib/articles";
import { getAllGuides } from "@/lib/guides";
import { getAllCourses } from "@/lib/courses";

export interface SearchResult {
  type: "article" | "guide" | "course" | "lesson";
  title: string;
  description: string;
  href: string;
  tags?: string[];
  difficulty?: string;
}

// Build a flat search index at request time (cached by Next.js route caching)
function buildIndex(): SearchResult[] {
  const results: SearchResult[] = [];

  for (const a of getAllArticles()) {
    results.push({
      type: "article",
      title: a.title,
      description: a.description,
      href: `/articles/${a.slug}`,
      tags: a.tags,
      difficulty: a.difficulty,
    });
  }

  for (const g of getAllGuides()) {
    results.push({
      type: "guide",
      title: g.title,
      description: g.description,
      href: `/guides/${g.slug}`,
      tags: g.tags,
      difficulty: g.difficulty,
    });
  }

  for (const c of getAllCourses()) {
    results.push({
      type: "course",
      title: c.title,
      description: c.description,
      href: `/courses/${c.slug}`,
      tags: c.tags,
      difficulty: c.difficulty,
    });
    for (const l of c.lessons) {
      results.push({
        type: "lesson",
        title: l.title,
        description: l.description ?? c.description,
        href: `/courses/${c.slug}/${l.slug}`,
        difficulty: c.difficulty,
      });
    }
  }

  return results;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();

  const index = buildIndex();

  if (!q || q.length < 2) {
    return Response.json([]);
  }

  // Simple multi-field scoring search (no extra dep needed)
  const scored = index
    .map((item) => {
      const haystack = [item.title, item.description, ...(item.tags ?? [])].join(" ").toLowerCase();
      let score = 0;
      if (item.title.toLowerCase().includes(q)) score += 10;
      if (item.description.toLowerCase().includes(q)) score += 4;
      if ((item.tags ?? []).some((t) => t.toLowerCase().includes(q))) score += 3;
      if (haystack.includes(q)) score += 1;
      return { ...item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ score: _s, ...rest }) => rest);

  return Response.json(scored);
}
