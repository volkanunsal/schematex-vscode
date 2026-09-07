export interface FenceDiagnostic {
  line: number;
  startColumn: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning";
}
