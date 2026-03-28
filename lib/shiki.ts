import { createHighlighter, type Highlighter } from "shiki";

// Singleton promise — created once per Node.js process
const highlighterPromise: Promise<Highlighter> = createHighlighter({
  themes: ["vitesse-dark"],
  langs: [
    "typescript",
    "javascript",
    "python",
    "bash",
    "json",
    "markdown",
    "sql",
    "yaml",
    "rust",
    "go",
    "tsx",
    "jsx",
    "css",
    "html",
  ],
});

export async function highlight(code: string, lang: string): Promise<string> {
  const hl = await highlighterPromise;
  const validLang = hl.getLoadedLanguages().includes(lang as never) ? lang : "text";
  return hl.codeToHtml(code, { lang: validLang, theme: "vitesse-dark" });
}
