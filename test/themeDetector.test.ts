import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { detectVsCodeTheme } from "../src/themeDetector";

function documentWithBodyClass(bodyClassName: string): Document {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  dom.window.document.body.className = bodyClassName;
  return dom.window.document;
}

test("maps vscode-light to the default schematex theme", () => {
  assert.equal(detectVsCodeTheme(documentWithBodyClass("vscode-light")), "default");
});

test("maps vscode-dark to the dark schematex theme", () => {
  assert.equal(detectVsCodeTheme(documentWithBodyClass("vscode-dark")), "dark");
});

test("maps vscode-high-contrast to the monochrome schematex theme", () => {
  assert.equal(
    detectVsCodeTheme(documentWithBodyClass("vscode-high-contrast")),
    "monochrome",
  );
});

test("maps vscode-high-contrast-light to the monochrome schematex theme", () => {
  assert.equal(
    detectVsCodeTheme(documentWithBodyClass("vscode-high-contrast-light")),
    "monochrome",
  );
});

test("falls back to the default schematex theme when no vscode theme class is present", () => {
  assert.equal(detectVsCodeTheme(documentWithBodyClass("")), "default");
});
