"use client";

import { useEffect, useState } from "react";

function storageKey(userId?: string) {
  return userId ? `gadaalabs_progress_${userId}` : "gadaalabs_progress";
}

interface ProgressStore {
  [courseSlug: string]: string[]; // array of completed lesson slugs
}

function readStore(userId?: string): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? "{}");
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore, userId?: string) {
  localStorage.setItem(storageKey(userId), JSON.stringify(store));
}

export function useProgress(courseSlug: string, userId?: string) {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const store = readStore(userId);
    setCompleted(store[courseSlug] ?? []);
  }, [courseSlug, userId]);

  const markComplete = (lessonSlug: string) => {
    const store = readStore(userId);
    const current = store[courseSlug] ?? [];
    if (current.includes(lessonSlug)) return;
    const updated = [...current, lessonSlug];
    store[courseSlug] = updated;
    writeStore(store, userId);
    setCompleted(updated);
  };

  const isComplete = (lessonSlug: string) => completed.includes(lessonSlug);

  return { completed, markComplete, isComplete };
}
