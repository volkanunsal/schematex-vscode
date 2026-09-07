import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDocumentDiagnostics,
  type MarkdownItInstance,
} from "../src/diagnostics/documentDiagnostics";

test("returns no diagnostics for a document with no schematex fences", () => {
  const text = "# Title\n\nSome text.\n\n```js\nconsole.log(1);\n```\n";
  assert.deepEqual(computeDocumentDiagnostics(text), []);
});

test("returns no diagnostics for a fully valid schematex fence", () => {
  const text = "# Title\n\n```schematex\ngenogram\n  alice\n```\n";
  assert.deepEqual(computeDocumentDiagnostics(text), []);
});

test("offsets a header diagnostic to the correct absolute document line", () => {
  const text = [
    "# Title",
    "",
    "```schematex",
    "---",
    "theme: light",
    "---",
    "genogram",
    "  alice",
    "```",
    "",
  ].join("\n");
  const diagnostics = computeDocumentDiagnostics(text);
  assert.equal(diagnostics.length, 1);
  // Fence opens at document line 2 (0-indexed: "# Title"=0, ""=1, "```schematex"=2).
  // Content starts at line 3. Header diagnostic is at fenceContent-relative
  // line 1 ("theme: light" is the second line of the fence content: "---"=0,
  // "theme: light"=1). Absolute = 3 + 1 = 4.
  assert.equal(diagnostics[0].line, 4);
});

test("offsets diagnostics correctly across multiple fences in one document", () => {
  const text = [
    "# Title",
    "",
    "```schematex",
    "---",
    "theme: light",
    "---",
    "genogram",
    "```",
    "",
    "Some text between diagrams.",
    "",
    "```schematex",
    "---",
    "theme: monochrome",
    "---",
    "genogram",
    "```",
    "",
  ].join("\n");
  const diagnostics = computeDocumentDiagnostics(text);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 4);
  assert.match(diagnostics[0].message, /Invalid theme 'light'/);
});

test("ignores a fenced code block whose info string is not schematex", () => {
  const text = "```python\ntheme: light\n```\n";
  assert.deepEqual(computeDocumentDiagnostics(text), []);
});

test("returns an empty array rather than throwing when tokenization fails", () => {
  const throwingMarkdownIt = {
    parse: () => {
      throw new Error("boom");
    },
  };
  const diagnostics = computeDocumentDiagnostics("```schematex\ngenogram\n```\n", {
    markdownIt: throwingMarkdownIt as unknown as MarkdownItInstance,
  });
  assert.deepEqual(diagnostics, []);
});

test("shifts the column of a header diagnostic to account for a fence indented inside a list item", () => {
  const text = [
    "- item",
    "  ```schematex",
    "  ---",
    "  theme: light",
    "  ---",
    "  genogram",
    "  ```",
    "",
  ].join("\n");
  const diagnostics = computeDocumentDiagnostics(text);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 3);
  // Raw line 3 is "  theme: light" (2-space indent). "light" starts at
  // raw column 9 (0-indexed): "  theme: " is 9 characters.
  assert.equal(diagnostics[0].startColumn, 9);
  assert.equal(diagnostics[0].endColumn, 14);
});

test("produces identical coordinates for a CRLF document and its LF equivalent", () => {
  const lines = [
    "- item",
    "  ```schematex",
    "  ---",
    "  theme: light",
    "  ---",
    "  genogram",
    "  ```",
    "",
  ];
  const lfDiagnostics = computeDocumentDiagnostics(lines.join("\n"));
  const crlfDiagnostics = computeDocumentDiagnostics(lines.join("\r\n"));
  assert.equal(lfDiagnostics.length, 1);
  assert.deepEqual(crlfDiagnostics, lfDiagnostics);
  assert.equal(crlfDiagnostics[0].line, 3);
  assert.equal(crlfDiagnostics[0].startColumn, 9);
  assert.equal(crlfDiagnostics[0].endColumn, 14);
});

test("offsets a DSL body diagnostic inside a fence indented in a list item", () => {
  const lines = ["- item", "  ```schematex", "  flowchart", "  a -> b [bogus]", "  ```", ""];
  const diagnostics = computeDocumentDiagnostics(lines.join("\n"));
  assert.equal(diagnostics.length, 1);
  // Raw line 3 is "  a -> b [bogus]" (16 chars). markdown-it strips the 2-space
  // list indent, so the fence content line is "a -> b [bogus]" (14 chars) and
  // schematex reports column 3 on it -> fence-relative startColumn 2, endColumn
  // 14 (source length). Adding the 2-column indent gives 4 and 16.
  assert.equal(diagnostics[0].line, 3);
  assert.equal(diagnostics[0].startColumn, 4);
  assert.equal(diagnostics[0].endColumn, 16);
  assert.equal(diagnostics[0].endColumn, lines[3].length);
  assert.equal(diagnostics[0].severity, "error");
  assert.match(diagnostics[0].message, /expected edge operator/);
});

test("reports independently offset diagnostics for a header error and a body error in two fences", () => {
  const lines = [
    "# Title",
    "",
    "```schematex",
    "---",
    "theme: light",
    "---",
    "genogram",
    "```",
    "",
    "Text.",
    "",
    "```schematex",
    "flowchart",
    "  a -> b [bogus]",
    "```",
    "",
  ];
  const diagnostics = computeDocumentDiagnostics(lines.join("\n"));
  assert.equal(diagnostics.length, 2);

  assert.equal(diagnostics[0].line, 4);
  assert.equal(diagnostics[0].startColumn, 7);
  assert.equal(diagnostics[0].endColumn, 12);
  assert.match(diagnostics[0].message, /Invalid theme 'light'/);

  assert.equal(diagnostics[1].line, 13);
  assert.equal(diagnostics[1].startColumn, 4);
  assert.equal(diagnostics[1].endColumn, 16);
  assert.equal(diagnostics[1].endColumn, lines[13].length);
  assert.match(diagnostics[1].message, /expected edge operator/);
});

test("shifts the column of a header diagnostic to account for a fence inside a blockquote", () => {
  const text = [
    "> quoted",
    "> ```schematex",
    "> ---",
    "> theme: light",
    "> ---",
    "> genogram",
    "> ```",
    "",
  ].join("\n");
  const diagnostics = computeDocumentDiagnostics(text);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 3);
  // Raw line 3 is "> theme: light" (2-char "> " prefix). "light" starts
  // at raw column 9: "> theme: " is 9 characters.
  assert.equal(diagnostics[0].startColumn, 9);
  assert.equal(diagnostics[0].endColumn, 14);
});
