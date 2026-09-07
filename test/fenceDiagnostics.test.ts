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
