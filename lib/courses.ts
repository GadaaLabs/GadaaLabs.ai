import fs from "fs";
import path from "path";
import matter from "gray-matter";

const COURSES_DIR = path.join(process.cwd(), "content/courses");

export interface LessonMeta {
  slug: string;
  title: string;
  duration: number;
  description?: string;
}

export interface CourseFrontmatter {
  title: string;
  description: string;
  author: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  lessons: LessonMeta[];
}

export interface Course extends CourseFrontmatter {
  slug: string;
  content: string;
}

export interface Lesson {
  slug: string;
  courseSlug: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  content: string;
}

export function getAllCourses(): Course[] {
  const dirs = fs
    .readdirSync(COURSES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  return dirs
    .map((slug) => {
      const indexPath = path.join(COURSES_DIR, slug, "index.mdx");
      if (!fs.existsSync(indexPath)) return null;
      const raw = fs.readFileSync(indexPath, "utf8");
      const { data, content } = matter(raw);
      return { slug, content, ...(data as CourseFrontmatter) };
    })
    .filter(Boolean) as Course[];
}

export function getCourseBySlug(slug: string): Course | null {
  const indexPath = path.join(COURSES_DIR, slug, "index.mdx");
  if (!fs.existsSync(indexPath)) return null;
  const raw = fs.readFileSync(indexPath, "utf8");
  const { data, content } = matter(raw);
  return { slug, content, ...(data as CourseFrontmatter) };
}

export function getLessonBySlug(courseSlug: string, lessonSlug: string): Lesson | null {
  const filePath = path.join(COURSES_DIR, courseSlug, "lessons", `${lessonSlug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return {
    slug: lessonSlug,
    courseSlug,
    content,
    title: data.title,
    description: data.description,
    order: data.order,
    duration: data.duration,
  };
}

export function getAllLessonParams(): { slug: string; lesson: string }[] {
  const courses = getAllCourses();
  const params: { slug: string; lesson: string }[] = [];
  for (const course of courses) {
    for (const lesson of course.lessons) {
      params.push({ slug: course.slug, lesson: lesson.slug });
    }
  }
  return params;
}
