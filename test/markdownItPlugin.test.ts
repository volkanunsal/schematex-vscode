import { test } from "node:test";
import assert from "node:assert/strict";
import MarkdownIt from "markdown-it";
import { schematexPlugin } from "../src/markdownItPlugin";

function renderMarkdown(markdownSource: string): string {
  const markdownItInstance = new MarkdownIt();
  schematexPlugin(markdownItInstance);
  return markdownItInstance.render(markdownSource);
}

test("renders a schematex fence as a placeholder div", () => {
  const html = renderMarkdown("```schematex\nGenogram\n  Alice -- Bob\n```\n");
  assert.match(
    html,
    /<div class="schematex-diagram" data-source="[^"]+" data-config="[^"]+"><\/div>/,
  );
});

test("leaves non-schematex fences untouched", () => {
  const html = renderMarkdown("```js\nconst x = 1;\n```\n");
  assert.match(html, /<pre><code class="language-js">/);
  assert.doesNotMatch(html, /schematex-diagram/);
});

test("base64-encodes the DSL body without the config header, and the parsed config separately", () => {
  const html = renderMarkdown(
    "```schematex\n---\ntheme: dark\n---\nGenogram\n  Alice -- Bob\n```\n",
  );
  const sourceMatch = html.match(/data-source="([^"]+)"/);
  const configMatch = html.match(/data-config="([^"]+)"/);
  assert.ok(sourceMatch && configMatch);
  assert.equal(
    Buffer.from(sourceMatch![1], "base64").toString("utf8"),
    "Genogram\n  Alice -- Bob\n",
  );
  assert.deepEqual(
    JSON.parse(Buffer.from(configMatch![1], "base64").toString("utf8")),
    { theme: "dark" },
  );
});
