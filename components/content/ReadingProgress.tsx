"use client";

import { useEffect, useState } from "react";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-0.5"
      style={{ background: "var(--color-bg-elevated)" }}
    >
      <div
        className="h-full transition-all duration-75"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--color-purple-600), var(--color-cyan-500))",
          boxShadow: "0 0 8px rgba(124,58,237,0.5)",
        }}
      />
    </div>
  );
}
