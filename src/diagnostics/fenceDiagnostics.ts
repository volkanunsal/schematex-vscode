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
        endColumn: startColumn + (diagnostic.source?.length ?? 1),
        message: diagnostic.message,
        severity: diagnostic.severity,
      };
    });
    return [...headerDiagnostics, ...bodyDiagnostics];
  } catch (error) {
    logDiagnostic("parseResult threw", { error, fenceContent });
    return headerDiagnostics;
  }
}
