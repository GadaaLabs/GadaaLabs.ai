import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { getAllCourses } from "@/lib/courses";
import { getAllQuizzes } from "@/lib/quizzes";
import { DashboardProgress } from "@/components/auth/DashboardProgress";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your GadaaLabs learning progress and achievements.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/api/auth/signin?callbackUrl=/dashboard");

  const courses = getAllCourses();
  const quizzes = getAllQuizzes();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-10 pb-8"
        style={{ borderBottom: "1px solid var(--color-border-subtle)" }}>
        {session.user?.image && (
          <Image src={session.user.image} alt={session.user.name ?? "User"} width={56} height={56}
            className="rounded-full" style={{ border: "2px solid var(--color-purple-600)" }} />
        )}
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Welcome back, {session.user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {session.user?.email}
          </p>
        </div>
      </div>

      <DashboardProgress
        userId={session.user.id}
        courses={courses.map((c) => ({
          slug: c.slug,
          title: c.title,
          difficulty: c.difficulty,
          totalLessons: c.lessons.length,
        }))}
        quizSlugs={quizzes.map((q) => q.slug)}
      />
    </div>
  );
}
