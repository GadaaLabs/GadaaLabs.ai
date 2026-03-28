import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthSessionProvider } from "@/components/auth/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GadaaLabs — AI Education for Engineers",
    template: "%s | GadaaLabs",
  },
  description:
    "Learn AI engineering through interactive demos, deep-dive articles, hands-on courses, and live API playgrounds. Built for developers.",
  metadataBase: new URL("https://gadaalabs.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gadaalabs.com",
    siteName: "GadaaLabs",
    title: "GadaaLabs — AI Education for Engineers",
    description:
      "Learn AI engineering through interactive demos, deep-dive articles, hands-on courses, and live API playgrounds.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GadaaLabs — AI Education for Engineers",
    description: "Learn AI engineering. Ship real products.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthSessionProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
