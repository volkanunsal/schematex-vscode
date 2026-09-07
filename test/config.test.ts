import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfigHeader } from "../src/config";

test("returns the whole input as body when no config header is present", () => {
  const { config, body } = parseConfigHeader("Genogram\n  Alice -- Bob\n");
  assert.deepEqual(config, {});
  assert.equal(body, "Genogram\n  Alice -- Bob\n");
});

test("parses a --- delimited config header", () => {
  const raw = "---\ntheme: dark\nwidth: 400\n---\nGenogram\n  Alice -- Bob\n";
  const { config, body } = parseConfigHeader(raw);
  assert.deepEqual(config, { theme: "dark", width: 400 });
  assert.equal(body, "Genogram\n  Alice -- Bob\n");
});

test("ignores unknown keys and non-numeric values for numeric fields", () => {
  const raw =
    "---\ntheme: dark\nbogus: nope\nwidth: notanumber\n---\nGenogram\n";
  const { config, body } = parseConfigHeader(raw);
  assert.deepEqual(config, { theme: "dark" });
  assert.equal(body, "Genogram\n");
});

test("coerces scene to a boolean", () => {
  const raw = "---\nscene: true\n---\nGenogram\n";
  const { config } = parseConfigHeader(raw);
  assert.deepEqual(config, { scene: true });
});

test("parses backgroundColor as a string", () => {
  const raw = "---\nbackgroundColor: #f5f5f5\n---\nGenogram\n";
  const { config } = parseConfigHeader(raw);
  assert.deepEqual(config, { backgroundColor: "#f5f5f5" });
});

test("strips surrounding double or single quotes from string values", () => {
  const doubleQuoted = parseConfigHeader(
    '---\nbackgroundColor: "#f5f5f5"\ntheme: "dark"\n---\nGenogram\n',
  );
  assert.deepEqual(doubleQuoted.config, {
    backgroundColor: "#f5f5f5",
    theme: "dark",
  });

  const singleQuoted = parseConfigHeader(
    "---\nbackgroundColor: '#f5f5f5'\n---\nGenogram\n",
  );
  assert.deepEqual(singleQuoted.config, { backgroundColor: "#f5f5f5" });
});

test("does not strip a lone quote character or mismatched quotes", () => {
  const raw = '---\nfontFamily: "Georgia\n---\nGenogram\n';
  const { config } = parseConfigHeader(raw);
  assert.deepEqual(config, { fontFamily: '"Georgia' });
});

test("treats an unterminated config header as no header at all", () => {
  const raw = "---\ntheme: dark\nGenogram\n  Alice -- Bob\n";
  const { config, body } = parseConfigHeader(raw);
  assert.deepEqual(config, {});
  assert.equal(body, raw);
});

test("flags an unknown header key as a warning covering the key", () => {
  const raw = "---\nbogus: nope\n---\nGenogram\n";
  const { headerDiagnostics } = parseConfigHeader(raw);
  assert.deepEqual(headerDiagnostics, [
    {
      line: 1,
      startColumn: 0,
      endColumn: 5,
      message: "Unknown SchemaTex config key 'bogus'.",
      severity: "warning",
    },
  ]);
});

test("flags an invalid theme value as an error covering the value", () => {
  const raw = "---\ntheme: light\n---\nGenogram\n";
  const { headerDiagnostics } = parseConfigHeader(raw);
  assert.deepEqual(headerDiagnostics, [
    {
      line: 1,
      startColumn: 7,
      endColumn: 12,
      message: "Invalid theme 'light'. Valid values: default, monochrome, dark.",
      severity: "error",
    },
  ]);
});

test("does not flag a valid theme value", () => {
  const raw = "---\ntheme: dark\n---\nGenogram\n";
  const { headerDiagnostics } = parseConfigHeader(raw);
  assert.deepEqual(headerDiagnostics, []);
});

test("flags a non-numeric width value as an error covering the value", () => {
  const raw = "---\nwidth: abc\n---\nGenogram\n";
  const { headerDiagnostics } = parseConfigHeader(raw);
  assert.deepEqual(headerDiagnostics, [
    {
      line: 1,
      startColumn: 7,
      endColumn: 10,
      message: "'width' must be a number, got 'abc'.",
      severity: "error",
    },
  ]);
});

test("flags an empty numeric value as an error rather than coercing it to 0", () => {
  const raw = "---\nwidth:  \n---\nGenogram\n";
  const { config, headerDiagnostics } = parseConfigHeader(raw);
  assert.deepEqual(config, {});
  assert.equal(headerDiagnostics.length, 1);
  assert.equal(headerDiagnostics[0].severity, "error");
  assert.equal(headerDiagnostics[0].message, "'width' must be a number, got ''.");
});

test("flags a non-finite numeric value as an error", () => {
  const raw = "---\nwidth: Infinity\n---\nGenogram\n";
  const { config, headerDiagnostics } = parseConfigHeader(raw);
  assert.deepEqual(config, {});
  assert.equal(headerDiagnostics.length, 1);
  assert.equal(headerDiagnostics[0].severity, "error");
  assert.equal(headerDiagnostics[0].message, "'width' must be a number, got 'Infinity'.");
});

test("flags a non-boolean scene value as an error covering the value", () => {
  const raw = "---\nscene: yes\n---\nGenogram\n";
  const { headerDiagnostics } = parseConfigHeader(raw);
  assert.deepEqual(headerDiagnostics, [
    {
      line: 1,
      startColumn: 7,
      endColumn: 10,
      message: "'scene' must be 'true' or 'false', got 'yes'.",
      severity: "error",
    },
  ]);
});

test("reports no header diagnostics for a fully valid header", () => {
  const raw = "---\ntheme: dark\nwidth: 400\nscene: true\n---\nGenogram\n";
  const { headerDiagnostics } = parseConfigHeader(raw);
  assert.deepEqual(headerDiagnostics, []);
});

test("reports headerLineCount as the number of lines through the closing delimiter", () => {
  const raw = "---\ntheme: dark\nwidth: 400\n---\nGenogram\n  Alice -- Bob\n";
  const { headerLineCount, body } = parseConfigHeader(raw);
  assert.equal(headerLineCount, 4);
  assert.equal(body, "Genogram\n  Alice -- Bob\n");
});

test("reports headerLineCount 0 when there is no header", () => {
  const raw = "Genogram\n  Alice -- Bob\n";
  const { headerLineCount } = parseConfigHeader(raw);
  assert.equal(headerLineCount, 0);
});

test("floors a degenerate empty value to a 1-column-wide range, not a zero-width one", () => {
  // "theme:  " (colon, two trailing spaces, no visible value) — the regex's
  // (.+) is forced to match a single space character, which trims to "".
  const raw = "---\ntheme:  \n---\nGenogram\n";
  const { headerDiagnostics } = parseConfigHeader(raw);
  assert.equal(headerDiagnostics.length, 1);
  assert.equal(headerDiagnostics[0].startColumn, 6);
  assert.equal(headerDiagnostics[0].endColumn, 7);
});
