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

test("treats an unterminated config header as no header at all", () => {
  const raw = "---\ntheme: dark\nGenogram\n  Alice -- Bob\n";
  const { config, body } = parseConfigHeader(raw);
  assert.deepEqual(config, {});
  assert.equal(body, raw);
});
