import { test } from "node:test";
import assert from "node:assert/strict";
import { hasDarkThemeContrastBug } from "../src/darkThemeContrastBugs";

test("flags a decisiontree diagram", () => {
  assert.equal(
    hasDarkThemeContrastBug('decisiontree "Laptop troubleshoot"\n  question "Does it power on?"\n'),
    true,
  );
});

test("flags a decisiontree diagram with a mode suffix and no title", () => {
  assert.equal(hasDarkThemeContrastBug("decisiontree:influence\n  process A\n"), true);
});

test("flags a decisiontree diagram regardless of case", () => {
  assert.equal(hasDarkThemeContrastBug('DecisionTree "Title"\n  question "Q"\n'), true);
});

test("flags a decisiontree diagram preceded by blank lines", () => {
  assert.equal(hasDarkThemeContrastBug('\n\n  decisiontree "Title"\n  question "Q"\n'), true);
});

test("does not flag other diagram types", () => {
  assert.equal(hasDarkThemeContrastBug("Genogram\n  Alice -- Bob\n"), false);
});

test("does not flag an empty source", () => {
  assert.equal(hasDarkThemeContrastBug(""), false);
});
