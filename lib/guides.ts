import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

const GUIDES_DIR = path.join(process.cwd(), "content/guides");

export interface GuideFrontmatter {
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: number; // minutes
  prerequisites: string[];
  featured?: boolean;
}

export interface Guide extends GuideFrontmatter {
  slug: string;
  content: string;
  readingTimeText: string;
}

export function getAllGuides(): Guide[] {
  if (!fs.existsSync(GUIDES_DIR)) return [];
  const files = fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith(".mdx"));

  return files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(GUIDES_DIR, filename), "utf8");
      const { data, content } = matter(raw);
      const rt = readingTime(content);
      return { slug, content, readingTimeText: rt.text, ...(data as GuideFrontmatter) };
    })
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getGuideBySlug(slug: string): Guide | null {
  const filepath = path.join(GUIDES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filepath)) return null;
  const raw = fs.readFileSync(filepath, "utf8");
  const { data, content } = matter(raw);
  const rt = readingTime(content);
  return { slug, content, readingTimeText: rt.text, ...(data as GuideFrontmatter) };
}

export function getAllGuideSlugs(): string[] {
  if (!fs.existsSync(GUIDES_DIR)) return [];
  return fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
}
