"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { LogIn, LogOut, LayoutDashboard } from "lucide-react";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: "var(--color-bg-elevated)" }} />;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("github")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-default)",
          color: "var(--color-text-secondary)",
        }}
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/dashboard"
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-default)",
          color: "var(--color-text-secondary)",
        }}>
        {session.user?.image ? (
          <Image src={session.user.image} alt={session.user.name ?? "User"} width={20} height={20}
            className="rounded-full" />
        ) : (
          <LayoutDashboard className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline max-w-[100px] truncate">{session.user?.name}</span>
      </Link>
      <button onClick={() => signOut()}
        className="p-1.5 rounded-lg transition-all"
        style={{ color: "var(--color-text-muted)", border: "1px solid var(--color-border-subtle)" }}
        title="Sign out">
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
