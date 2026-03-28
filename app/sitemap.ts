import type { MetadataRoute } from "next";
import { getAllArticleSlugs } from "@/lib/articles";
import { getAllCourses, getAllLessonParams } from "@/lib/courses";
import { getAllQuizzes } from "@/lib/quizzes";
import registry from "@/content/demos/registry.json";

const BASE = "https://gadaalabs.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const static_routes = ["/", "/learn", "/articles", "/demos", "/playground", "/quizzes"].map((r) => ({
    url: `${BASE}${r}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: r === "/" ? 1 : 0.8,
  }));

  const articles = getAllArticleSlugs().map((slug) => ({
    url: `${BASE}/articles/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const courses = getAllCourses().map((c) => ({
    url: `${BASE}/courses/${c.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const lessons = getAllLessonParams().map(({ slug, lesson }) => ({
    url: `${BASE}/courses/${slug}/${lesson}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const quizzes = getAllQuizzes().map((q) => ({
    url: `${BASE}/quizzes/${q.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const demos = (registry as { slug: string }[]).map((d) => ({
    url: `${BASE}/demos/${d.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...static_routes, ...articles, ...courses, ...lessons, ...quizzes, ...demos];
}
