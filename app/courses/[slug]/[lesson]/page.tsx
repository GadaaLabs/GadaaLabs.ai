import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseBySlug, getLessonBySlug, getAllLessonParams } from "@/lib/courses";
import { MDXContent } from "@/components/content/MDXContent";
import { LessonSidebar } from "@/components/content/LessonSidebar";
import { LessonProgress } from "@/components/content/LessonProgress";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";

export async function generateStaticParams() {
  return getAllLessonParams();
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string; lesson: string }> }): Promise<Metadata> {
  const { slug, lesson: lessonSlug } = await params;
  const lesson = getLessonBySlug(slug, lessonSlug);
  if (!lesson) return {};
  return { title: lesson.title, description: lesson.description };
}

export default async function LessonPage({
  params,
}: { params: Promise<{ slug: string; lesson: string }> }) {
  const { slug, lesson: lessonSlug } = await params;
  const course = getCourseBySlug(slug);
  if (!course) notFound();

  const lesson = getLessonBySlug(slug, lessonSlug);
  if (!lesson) notFound();

  const lessonIndex = course.lessons.findIndex((l) => l.slug === lessonSlug);
  const prevLesson = lessonIndex > 0 ? course.lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex < course.lessons.length - 1 ? course.lessons[lessonIndex + 1] : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="hidden lg:block">
          <LessonSidebar
            courseSlug={slug}
            courseTitle={course.title}
            lessons={course.lessons}
            currentLesson={lessonSlug}
          />
        </div>

        {/* Main */}
        <div className="min-w-0 flex-1 max-w-3xl">
          {/* Breadcrumb */}
          <Link href={`/courses/${slug}`} className="inline-flex items-center gap-1.5 text-sm mb-6"
            style={{ color: "var(--color-text-muted)" }}>
            <ArrowLeft className="h-3.5 w-3.5" /> {course.title}
          </Link>

          {/* Lesson header */}
          <div className="mb-6">
            <span className="text-xs font-semibold uppercase tracking-widest mb-2 block"
              style={{ color: "var(--color-purple-400)" }}>
              Lesson {lesson.order}
            </span>
            <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
              {lesson.title}
            </h1>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              <Clock className="h-3.5 w-3.5" /> {lesson.duration} min
            </div>
          </div>

          {/* MDX body */}
          <MDXContent source={lesson.content} />

          {/* Mark complete + navigation */}
          <LessonProgress
            courseSlug={slug}
            lessonSlug={lessonSlug}
            prevLesson={prevLesson ? { slug: prevLesson.slug, title: prevLesson.title } : null}
            nextLesson={nextLesson ? { slug: nextLesson.slug, title: nextLesson.title } : null}
          />
        </div>
      </div>
    </div>
  );
}
