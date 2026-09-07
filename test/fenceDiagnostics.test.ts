import { test } from "node:test";
import assert from "node:assert/strict";
import { collectFenceDiagnostics } from "../src/diagnostics/fenceDiagnostics";

test("returns no diagnostics for a fully valid fence", () => {
  const fenceContent = "genogram\n  alice\n  bob\n";
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.deepEqual(diagnostics, []);
});

test("returns only header diagnostics when the header is invalid and the body is valid", () => {
  const fenceContent = "---\ntheme: light\n---\ngenogram\n  alice\n";
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0].message, /Invalid theme 'light'/);
  assert.equal(diagnostics[0].line, 1);
});

test("returns a body diagnostic offset past the header when the header is valid and the body is invalid", () => {
  const fenceContent = "---\ntheme: dark\n---\ngenogram\n  alice [bogus-sex]\n";
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 1);
  // Header is 3 lines (0, 1, 2 — the two "---" lines and "theme: dark"), so
  // body line 2 ("  alice [bogus-sex]", 1-indexed within the body) maps to
  // fenceContent-relative line 3 + (2 - 1) = 4.
  assert.equal(diagnostics[0].line, 4);
  assert.equal(diagnostics[0].severity, "error");
  assert.match(diagnostics[0].message, /bogus-sex/);
  // schematex returns column: 1 (1-indexed) and source: "  alice [bogus-sex]" (19 chars)
  // So startColumn should be 0 (0-indexed) and endColumn should be 19
  assert.equal(diagnostics[0].startColumn, 0);
  assert.equal(diagnostics[0].endColumn, 19);
});

test("returns both header and body diagnostics when both are invalid", () => {
  const fenceContent = "---\ntheme: light\n---\ngenogram\n  alice [bogus-sex]\n";
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 2);
  assert.match(diagnostics[0].message, /Invalid theme/);
  assert.match(diagnostics[1].message, /bogus-sex/);
});

test("does not run endColumn past the end of the line when schematex reports a column past 1", () => {
  const errorLine = "  a -> b [bogus]";
  const fenceContent = `flowchart\n${errorLine}\n`;
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 1);
  // Verified against real schematex output: it reports line 2, column 5,
  // source "  a -> b [bogus]" (16 chars) for this input.
  assert.equal(diagnostics[0].line, 1);
  assert.equal(diagnostics[0].startColumn, 4);
  assert.equal(diagnostics[0].endColumn, errorLine.length);
  assert.ok(diagnostics[0].endColumn <= errorLine.length);
  assert.ok(diagnostics[0].endColumn > diagnostics[0].startColumn);
});

test("strips the position prefix and source-echo suffix from a relocated body diagnostic message", () => {
  const fenceContent = "---\ntheme: dark\n---\ngenogram\n  alice [bogus-sex]\n";
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 1);
  const { message } = diagnostics[0];
  assert.ok(!message.startsWith("Line "), `message still carries a position prefix: ${message}`);
  assert.ok(!message.startsWith("[line "), `message still carries a position prefix: ${message}`);
  assert.ok(!message.includes("\n  →"), `message still carries a source echo: ${message}`);
  assert.match(message, /^Unknown property 'bogus-sex'\./);
});

test("strips the bracketed position prefix schematex uses for parser errors", () => {
  const diagnostics = collectFenceDiagnostics("flowchart\n  a -> b [bogus]\n");
  assert.equal(diagnostics.length, 1);
  assert.ok(
    diagnostics[0].message.startsWith('expected edge operator, got "-> b [bogu"'),
    `unexpected message: ${diagnostics[0].message}`,
  );
});

test("appends schematex's hint to the message when one is present", () => {
  const diagnostics = collectFenceDiagnostics("flowchart\n  a -> b [bogus]\n");
  assert.equal(diagnostics.length, 1);
  // Verified against real schematex output for this input.
  assert.equal(
    diagnostics[0].message,
    'expected edge operator, got "-> b [bogu" If this is label text, put it inside the ' +
      'node shape and quote it, for example A["label with spaces (and parentheses)"].',
  );
});

test('strips the "Line N:" position prefix that carries no column', () => {
  // Verified against real schematex output: the timeline family reports
  // { line: 2, message: "Line 2: Expected ':' after date: ..." } with no column.
  const diagnostics = collectFenceDiagnostics("timeline\n  2020-13-45 Something happened\n");
  assert.equal(diagnostics.length, 1);
  assert.ok(
    !diagnostics[0].message.startsWith("Line "),
    `message still carries a position prefix: ${diagnostics[0].message}`,
  );
  assert.match(diagnostics[0].message, /^Expected ':' after date:/);
});

test("anchors a diagnostic with no structured position to the fence's first body line", () => {
  // Verified against real schematex output: this circuit produces 5 diagnostics
  // (1 CIRCUIT_DUPLICATE_ID error + 4 CIRCUIT_FLOATING_NET warnings), none of
  // which carry line, column, or source.
  const fenceContent = '---\ntheme: dark\n---\ncircuit "demo" netlist\n  R1 a b 1k\n  R1 c d 2k\n';
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 5);
  for (const diagnostic of diagnostics) {
    assert.equal(diagnostic.line, 3);
    assert.equal(diagnostic.startColumn, 0);
    assert.equal(diagnostic.endColumn, 1);
  }
  assert.match(diagnostics[0].message, /^component id "R1" is declared 2 times/);
  assert.match(diagnostics[0].message, /Rename the duplicates \(e\.g\. R1, R1B\)\./);
});

test("preserves a warning severity on a body diagnostic instead of forcing error", () => {
  const fenceContent = 'circuit "demo" netlist\n  R1 a b 1k\n  R1 c d 2k\n';
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 5);
  assert.equal(diagnostics[0].severity, "error");
  assert.deepEqual(
    diagnostics.slice(1).map((diagnostic) => diagnostic.severity),
    ["warning", "warning", "warning", "warning"],
  );
});

test("keeps a message-embedded position when schematex reports no structured line", () => {
  // Verified against real schematex output: this erd yields a single diagnostic
  // whose message is "[line 2] Unexpected line: Customer" with line undefined,
  // so the bracketed prefix is the only location information available.
  const fenceContent = "erd\n  Customer\n    id int pk\n  Customer ||--o{ Bogus\n";
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 0);
  assert.equal(diagnostics[0].message, "[line 2] Unexpected line: Customer");
});

test("spans a positioned diagnostic to the end of its line when schematex reports no source", () => {
  // Verified against real schematex output: the @overrides machine section emits
  // PIN_INVALID with { severity: "warning", line: 4, column: 1 } and no source.
  const errorLine = "  garbage line here";
  const fenceContent = `genogram\n  alice\n@overrides\n${errorLine}\n`;
  const diagnostics = collectFenceDiagnostics(fenceContent);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].severity, "warning");
  assert.equal(diagnostics[0].line, 3);
  assert.equal(diagnostics[0].startColumn, 0);
  assert.equal(diagnostics[0].endColumn, errorLine.length);
  assert.notEqual(diagnostics[0].endColumn, diagnostics[0].startColumn + 1);
});

test("returns only header diagnostics when parseResult throws", () => {
  const fenceContent = "---\ntheme: light\n---\ngenogram\n  alice\n";
  const throwingParseResult = () => {
    throw new Error("boom");
  };
  const diagnostics = collectFenceDiagnostics(fenceContent, {
    parseResult: throwingParseResult as typeof import("schematex").parseResult,
  });
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0].message, /Invalid theme 'light'/);
});

test("skips body validation for a completely empty fence", () => {
  const diagnostics = collectFenceDiagnostics("");
  assert.deepEqual(diagnostics, []);
});

test("skips body validation when only whitespace follows the header", () => {
  const diagnostics = collectFenceDiagnostics("---\ntheme: dark\n---\n   \n");
  assert.deepEqual(diagnostics, []);
});

test("skips body validation for a freshly-typed fence with no body yet, but still reports header errors", () => {
  const diagnostics = collectFenceDiagnostics("---\ntheme: light\n---\n");
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0].message, /Invalid theme 'light'/);
});

test("clamps line and startColumn to non-negative when schematex reports column 0 and line 0 on a headerless fence", () => {
  const fenceContent = "genogram\n  alice\n";
  const fakeParseResult = () => ({
    ok: true as const,
    status: "partial" as const,
    type: "genogram" as const,
    ast: undefined,
    diagnostics: [
      {
        severity: "error" as const,
        message: "fabricated out-of-range position",
        line: 0,
        column: 0,
      },
    ],
  });
  const diagnostics = collectFenceDiagnostics(fenceContent, {
    parseResult: fakeParseResult as unknown as typeof import("schematex").parseResult,
  });
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 0);
  assert.equal(diagnostics[0].startColumn, 0);
  assert.ok(diagnostics[0].endColumn > diagnostics[0].startColumn);
});
