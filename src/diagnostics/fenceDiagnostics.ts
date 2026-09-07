import { parseResult } from "schematex";
import { parseConfigHeader } from "../config";
import { logDiagnostic } from "./logger";
import type { FenceDiagnostic } from "./types";

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
      const line = Math.max(
        0,
        hasStructuredLine ? headerLineCount + (diagnostic.line! - 1) : headerLineCount,
      );
      const clampedStartColumn = Math.max(0, startColumn);
      return {
        line,
        startColumn: clampedStartColumn,
        endColumn: Math.max(
          clampedStartColumn + 1,
          diagnostic.source?.length ?? lineText?.length ?? clampedStartColumn + 1,
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
