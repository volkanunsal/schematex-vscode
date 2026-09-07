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
    .replace(/^Line \d+(?:, col \d+)?:\s*/, "")
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
    const bodyLines = body.split("\n");
    const bodyDiagnostics: FenceDiagnostic[] = result.diagnostics.map((diagnostic) => {
      const startColumn = (diagnostic.column ?? 1) - 1;
      const hasStructuredLine = typeof diagnostic.line === "number";
      // A diagnostic with no structured line may still carry its only location
      // hint inside the message text, so that text is left intact.
      const positionedMessage = hasStructuredLine
        ? stripRelocatedPosition(diagnostic.message)
        : diagnostic.message;
      const message = diagnostic.hint
        ? `${positionedMessage} ${diagnostic.hint}`
        : positionedMessage;
      const lineText = hasStructuredLine ? bodyLines[diagnostic.line! - 1] : undefined;
      return {
        line: hasStructuredLine ? headerLineCount + (diagnostic.line! - 1) : headerLineCount,
        startColumn,
        endColumn: Math.max(
          startColumn + 1,
          diagnostic.source?.length ?? lineText?.length ?? startColumn + 1,
        ),
        message,
        severity: diagnostic.severity,
      };
    });
    return [...headerDiagnostics, ...bodyDiagnostics];
  } catch (error) {
    logDiagnostic("parseResult threw", { error, fenceContent });
    return headerDiagnostics;
  }
}
