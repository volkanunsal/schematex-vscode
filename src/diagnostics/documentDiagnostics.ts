import * as MarkdownItModule from "markdown-it";
import { collectFenceDiagnostics } from "./fenceDiagnostics";
import type { FenceDiagnostic } from "./types";

export type MarkdownItInstance = ReturnType<typeof MarkdownItModule.default>;

function logDiagnostic(label: string, details: Record<string, unknown>): void {
  const serialized = JSON.stringify(
    details,
    (_key, value) =>
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value,
    2,
  );
  // eslint-disable-next-line no-console
  console.error(`[schematex-vscode] ${label}\n${serialized}`);
}

export function computeDocumentDiagnostics(
  text: string,
  deps: { markdownIt: MarkdownItInstance } = { markdownIt: new MarkdownItModule.default() },
): FenceDiagnostic[] {
  let tokens;
  try {
    tokens = deps.markdownIt.parse(text, {});
  } catch (error) {
    logDiagnostic("markdown-it tokenization threw", { error });
    return [];
  }

  const rawLines = text.replace(/\r\n?/g, "\n").split("\n");
  const diagnostics: FenceDiagnostic[] = [];
  for (const token of tokens) {
    if (token.type !== "fence" || token.info.trim() !== "schematex" || !token.map) {
      continue;
    }
    const contentStartLine = token.map[0] + 1;
    const contentLines = token.content.split("\n");
    for (const diagnostic of collectFenceDiagnostics(token.content)) {
      const absoluteLine = contentStartLine + diagnostic.line;
      const rawLine = rawLines[absoluteLine] ?? "";
      const contentLine = contentLines[diagnostic.line] ?? "";
      const indent = Math.max(0, rawLine.length - contentLine.length);
      diagnostics.push({
        ...diagnostic,
        line: absoluteLine,
        startColumn: diagnostic.startColumn + indent,
        endColumn: diagnostic.endColumn + indent,
      });
    }
  }
  return diagnostics;
}
