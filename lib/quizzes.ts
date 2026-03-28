import fs from "fs";
import path from "path";

const QUIZZES_DIR = path.join(process.cwd(), "content/quizzes");

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface Quiz {
  slug: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  questions: QuizQuestion[];
}

export function getAllQuizzes(): Quiz[] {
  return fs
    .readdirSync(QUIZZES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(QUIZZES_DIR, f), "utf8");
      return JSON.parse(raw) as Quiz;
    });
}

export function getQuizBySlug(slug: string): Quiz | null {
  const filepath = path.join(QUIZZES_DIR, `${slug}.json`);
  if (!fs.existsSync(filepath)) return null;
  return JSON.parse(fs.readFileSync(filepath, "utf8")) as Quiz;
}
