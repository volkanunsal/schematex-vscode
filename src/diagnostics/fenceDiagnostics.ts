import { parseResult } from "schematex";
import { parseConfigHeader } from "../config";
import type { FenceDiagnostic } from "./types";

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

function stripRelocatedPosition(message: string): string {
  return message
    .replace(/^Line \d+, col \d+:\s*/, "")
    .replace(/^\[line \d+(?::\d+)?\]\s*/, "")
    .split("\n  → ")[0];
}

export function collectFenceDiagnostics(
  fenceContent: string,
  deps: { parseResult: typeof parseResult } = { parseResult },
): FenceDiagnostic[] {
  const { config, body, headerDiagnostics, headerLineCount } = parseConfigHeader(fenceContent);

  if (body.trim() === "") {
    return headerDiagnostics;
  }

  try {
    const result = deps.parseResult(body, config);
    const bodyDiagnostics: FenceDiagnostic[] = result.diagnostics.map((diagnostic) => {
      const startColumn = (diagnostic.column ?? 1) - 1;
      return {
        line: headerLineCount + ((diagnostic.line ?? 1) - 1),
        startColumn,
        endColumn: Math.max(startColumn + 1, diagnostic.source?.length ?? startColumn + 1),
        message: stripRelocatedPosition(diagnostic.message),
        severity: diagnostic.severity,
      };
    });
    return [...headerDiagnostics, ...bodyDiagnostics];
  } catch (error) {
    logDiagnostic("parseResult threw", { error, fenceContent });
    return headerDiagnostics;
  }
}
