# SchemaTex VS Code Preview Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render SchemaTex diagrams inline in VS Code's built-in Markdown preview, with live updates on edit, per-diagram color/font/size config, and PNG/PDF export.

**Architecture:** A markdown-it plugin (registered via VS Code's `extendMarkdownIt` API) rewrites ` ```schematex ` fenced blocks into placeholder `<div>`s carrying base64-encoded DSL source and config. A bundled preview-webview script (contributed via `markdown.previewScripts`) finds those placeholders and renders them client-side using the `schematex` npm package's browser build, with export buttons using `schematex/export`.

**Tech Stack:** TypeScript, VS Code Extension API, `markdown-it`, `schematex` (npm, v1.0.14+, AGPL-3.0), esbuild for bundling, Node's built-in test runner (`node --test`) with `tsx` for TS support, `jsdom` for DOM-dependent unit tests. Package manager: pnpm.

**Spec:** `docs/superpowers/specs/2026-09-06-schematex-preview-design.md`

## Global Constraints

- Package manager is **pnpm** for all installs and scripts — never `npm`/`yarn`.
- Extension is licensed **AGPL-3.0-only** (bundles `schematex`, which is AGPL-3.0).
- Use descriptive variable names throughout (user's standing preference).
- No comments in generated code unless required by the language/tooling (e.g. a `// @ts-expect-error` with reason).
- `schematex` npm package (verified against the published registry, v1.0.14): browser build at subpath `schematex/browser` exports `renderPreviewToContainer(text: string, container: Element, config?: SchematexConfig): void` and `renderPreview(text: string, config?: SchematexConfig): string`; `SchematexConfig` has fields `type?, width?, height?, padding?, theme?, fontFamily?, mode?: "strict"|"preview", scene?`. Export helpers at subpath `schematex/export`: `svgToPngBlob(svgString: string, options?: { scale?: number; background?: string | null }): Promise<Blob>`, `downloadBlob(blob: Blob, filename: string): void`, `printSvgAsPdf(svgString: string, title?: string): void`. Every task below argues from these exact signatures — do not substitute assumed ones.
- After every task's commit (starting from Task 1's), push to the `origin` remote's copy of the current branch: `git push origin HEAD`. Implementation happens on an isolated worktree/feature branch (not `main`), so this pushes that branch, not `main` — see the SDD ledger's ruling on this. This keeps the GitHub repo an incremental, near-real-time record of the work rather than a single dump at the end.
- Any image generation (the extension/marketplace/README logo, Task 6) MUST go through the `nano-banana` skill, not an ad hoc image call — this is a standing tool requirement, not specific to this plan. **Exception, ruled by the user:** `nano-banana`'s Gemini API key hit its daily free-tier quota mid-execution with no image produced; the user explicitly waived this requirement for Task 6 only. Task 6 now builds the logo as a hand-authored SVG rasterized locally — see Task 6 Step 1.
- README content (Task 6) MUST go through the `documentation-writing` skill (Diátaxis framework) per explicit user instruction.

---

## Task 1: Project scaffolding & build pipeline

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.js`
- Create: `src/extension.ts`
- Create: `.vscode/launch.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `README.md`

**Interfaces:**

- Produces: `activate(context: vscode.ExtensionContext)` exported from `src/extension.ts`, returning `{ extendMarkdownIt(md: MarkdownIt): MarkdownIt }` — Task 3 fills in the real plugin call here.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "schematex-vscode",
  "displayName": "SchemaTex Diagrams",
  "description": "Render SchemaTex diagrams inline in the VS Code Markdown preview",
  "version": "0.1.0",
  "license": "AGPL-3.0-only",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "markdown.markdownItPlugins": true,
    "markdown.previewScripts": ["./media/previewScript.js"],
    "markdown.previewStyles": ["./media/previewStyles.css"]
  },
  "scripts": {
    "typecheck": "tsc -p . --noEmit",
    "build": "node esbuild.config.js",
    "watch": "node esbuild.config.js --watch",
    "compile": "pnpm run typecheck && pnpm run build",
    "test": "node --test --import tsx test/",
    "vscode:prepublish": "pnpm run compile"
  },
  "dependencies": {
    "schematex": "^1.0.14"
  },
  "devDependencies": {
    "@types/markdown-it": "^14.1.2",
    "@types/node": "^20.14.0",
    "@types/vscode": "^1.85.0",
    "esbuild": "^0.23.0",
    "jsdom": "^24.1.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `esbuild.config.js`**

```js
const esbuild = require("esbuild");

const watchMode = process.argv.includes("--watch");

async function build() {
  const extensionContext = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    external: ["vscode"],
    outfile: "dist/extension.js",
    sourcemap: true,
  });

  const previewScriptContext = await esbuild.context({
    entryPoints: ["src/previewScript.ts"],
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2020",
    outfile: "media/previewScript.js",
    sourcemap: true,
  });

  if (watchMode) {
    await extensionContext.watch();
    await previewScriptContext.watch();
  } else {
    await extensionContext.rebuild();
    await previewScriptContext.rebuild();
    await extensionContext.dispose();
    await previewScriptContext.dispose();
  }
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Write the stub `src/extension.ts`**

```typescript
import type MarkdownIt from "markdown-it";
import * as vscode from "vscode";

export function activate(_context: vscode.ExtensionContext) {
  return {
    extendMarkdownIt(markdownItInstance: MarkdownIt): MarkdownIt {
      return markdownItInstance;
    },
  };
}

export function deactivate(): void {}
```

- [ ] **Step 5: Write `.vscode/launch.json`**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

- [ ] **Step 6: Write `.gitignore`**

If `.gitignore` already exists with a `.worktrees/` entry (from workspace setup), keep that line and add the entries below to the same file rather than overwriting it.

```
node_modules/
dist/
media/previewScript.js
media/previewScript.js.map
*.vsix
.worktrees/
```

- [ ] **Step 7: Fetch the official AGPL-3.0 license text into `LICENSE`**

Run: `curl -fsSL https://www.gnu.org/licenses/agpl-3.0.txt -o LICENSE`
Expected: `LICENSE` created, non-empty, starts with `GNU AFFERO GENERAL PUBLIC LICENSE`.

- [ ] **Step 8: Write a minimal `README.md`**

````markdown
# SchemaTex Diagrams for VS Code

Renders [SchemaTex](https://github.com/SchemaTex/SchemaTex) diagrams inline in the Markdown preview.

## Usage

Add a fenced code block with the `schematex` language tag:

    ```schematex
    Genogram
      Alice -- Bob
    ```

Optionally prefix the DSL body with a `---`-delimited config header:

    ```schematex
    ---
    theme: dark
    fontFamily: Georgia
    ---
    Genogram
      Alice -- Bob
    ```

Supported config keys: `theme`, `fontFamily`, `width`, `height`, `padding`, `scene`.

## License

AGPL-3.0-only. Bundles [`schematex`](https://github.com/SchemaTex/SchemaTex) (AGPL-3.0).
````

- [ ] **Step 9: Install dependencies**

Run: `pnpm install`
Expected: exits 0, creates `pnpm-lock.yaml` and `node_modules/`.

- [ ] **Step 10: Verify the build pipeline runs end-to-end**

Run: `pnpm run compile`
Expected: exits 0, creates `dist/extension.js` and `media/previewScript.js` (the latter will be nearly empty until Task 5 adds real content to `src/previewScript.ts` — a placeholder empty file is needed for this step to succeed; create `src/previewScript.ts` containing only `export {};` for now).

- [ ] **Step 11: Commit**

```bash
git add package.json tsconfig.json esbuild.config.js src/extension.ts src/previewScript.ts .vscode/launch.json .gitignore LICENSE README.md pnpm-lock.yaml
git commit -m "Scaffold SchemaTex VS Code extension project and build pipeline"
```

- [ ] **Step 12: Push to the already-created GitHub remote**

The GitHub repo and `origin` remote already exist (created outside this plan) — no `gh repo create` needed here, just push.

Run: `git remote -v`
Expected: `origin` is listed with a `github.com` URL.

Run: `git push -u origin main`
Expected: the current branch pushed to `origin` with upstream tracking set — every subsequent task's commit only needs `git push origin HEAD` from here on (see Global Constraints).

---

## Task 2: Per-diagram config header parsing

**Files:**

- Create: `src/config.ts`
- Test: `test/config.test.ts`

**Interfaces:**

- Produces: `SchematexConfig` interface and `parseConfigHeader(raw: string): { config: SchematexConfig; body: string }`, exported from `src/config.ts`. Task 3 and Task 4 both import this.

- [ ] **Step 1: Write the failing tests**

```typescript
// test/config.test.ts
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

test("treats an unterminated config header as no header at all", () => {
  const raw = "---\ntheme: dark\nGenogram\n  Alice -- Bob\n";
  const { config, body } = parseConfigHeader(raw);
  assert.deepEqual(config, {});
  assert.equal(body, raw);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module '../src/config'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/config.ts
export interface SchematexConfig {
  theme?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
  padding?: number;
  scene?: boolean;
}

const numericKeys = new Set(["width", "height", "padding"]);
const booleanKeys = new Set(["scene"]);
const allowedKeys = new Set([
  "theme",
  "fontFamily",
  "width",
  "height",
  "padding",
  "scene",
]);

export function parseConfigHeader(raw: string): {
  config: SchematexConfig;
  body: string;
} {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  if (lines[0]?.trim() !== "---") {
    return { config: {}, body: raw };
  }

  const config: Record<string, unknown> = {};
  let closingDelimiterIndex = -1;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    if (lines[lineIndex].trim() === "---") {
      closingDelimiterIndex = lineIndex;
      break;
    }
  }

  if (closingDelimiterIndex === -1) {
    return { config: {}, body: raw };
  }

  for (let lineIndex = 1; lineIndex < closingDelimiterIndex; lineIndex++) {
    const match = lines[lineIndex].match(/^([a-zA-Z]+):\s*(.+)$/);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    if (!allowedKeys.has(key)) {
      continue;
    }
    if (numericKeys.has(key)) {
      const numericValue = Number(rawValue.trim());
      if (!Number.isNaN(numericValue)) {
        config[key] = numericValue;
      }
    } else if (booleanKeys.has(key)) {
      config[key] = rawValue.trim() === "true";
    } else {
      config[key] = rawValue.trim();
    }
  }

  const body = lines.slice(closingDelimiterIndex + 1).join("\n");
  return { config: config as SchematexConfig, body };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS, all 5 tests in `test/config.test.ts` green.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts test/config.test.ts
git commit -m "Add per-diagram config header parsing"
```

- [ ] **Step 6: Push**

Run: `git push origin HEAD`

---

## Task 3: markdown-it plugin & extension wiring

**Files:**

- Create: `src/markdownItPlugin.ts`
- Modify: `src/extension.ts`
- Test: `test/markdownItPlugin.test.ts`

**Interfaces:**

- Consumes: `parseConfigHeader` from `src/config.ts` (Task 2).
- Produces: `schematexPlugin(markdownItInstance: MarkdownIt): void`, exported from `src/markdownItPlugin.ts`. Task 5 does not need this directly (only `extension.ts` does), but its output contract — `<div class="schematex-diagram" data-source="BASE64" data-config="BASE64">` — is what Task 4's renderer parses.

- [ ] **Step 1: Add `markdown-it` as a devDependency for types and test usage**

Run: `pnpm add -D markdown-it`
Expected: `package.json` devDependencies gains `markdown-it`.

- [ ] **Step 2: Write the failing tests**

````typescript
// test/markdownItPlugin.test.ts
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
````

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module '../src/markdownItPlugin'`.

- [ ] **Step 4: Write the implementation**

```typescript
// src/markdownItPlugin.ts
import type MarkdownIt from "markdown-it";
import { parseConfigHeader } from "./config";

export function schematexPlugin(markdownItInstance: MarkdownIt): void {
  const defaultFenceRenderer = markdownItInstance.renderer.rules.fence!.bind(
    markdownItInstance.renderer.rules,
  );

  markdownItInstance.renderer.rules.fence = (
    tokens,
    tokenIndex,
    options,
    env,
    self,
  ) => {
    const token = tokens[tokenIndex];
    const fenceInfo = token.info.trim();

    if (fenceInfo !== "schematex") {
      return defaultFenceRenderer(tokens, tokenIndex, options, env, self);
    }

    const { config, body } = parseConfigHeader(token.content);
    const encodedSource = Buffer.from(body, "utf8").toString("base64");
    const encodedConfig = Buffer.from(JSON.stringify(config), "utf8").toString(
      "base64",
    );

    return `<div class="schematex-diagram" data-source="${encodedSource}" data-config="${encodedConfig}"></div>\n`;
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS, all 3 tests in `test/markdownItPlugin.test.ts` green, plus Task 2's tests still green.

- [ ] **Step 6: Wire the plugin into the extension**

```typescript
// src/extension.ts
import type MarkdownIt from "markdown-it";
import * as vscode from "vscode";
import { schematexPlugin } from "./markdownItPlugin";

export function activate(_context: vscode.ExtensionContext) {
  return {
    extendMarkdownIt(markdownItInstance: MarkdownIt): MarkdownIt {
      schematexPlugin(markdownItInstance);
      return markdownItInstance;
    },
  };
}

export function deactivate(): void {}
```

- [ ] **Step 7: Verify the build still compiles**

Run: `pnpm run compile`
Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/markdownItPlugin.ts src/extension.ts test/markdownItPlugin.test.ts package.json pnpm-lock.yaml
git commit -m "Add markdown-it plugin for schematex fences and wire into extension"
```

- [ ] **Step 9: Push**

Run: `git push origin HEAD`

---

## Task 4: Preview renderer core (render, errors, dedup, export)

**Files:**

- Create: `src/renderer.ts`
- Test: `test/renderer.test.ts`

**Interfaces:**

- Produces: `RendererDeps` interface and `createRenderer(deps: RendererDeps): { renderAll(root: ParentNode): void; renderOne(el: HTMLElement): void }`, exported from `src/renderer.ts`. Task 5's `src/previewScript.ts` is the only consumer — it supplies the real `schematex/browser` and `schematex/export` functions as `deps` and calls `renderAll(document)` on load and from a `MutationObserver`.
- The renderer expects each target element to carry `data-source` and `data-config` attributes exactly as produced by Task 3's `schematexPlugin` (base64-encoded UTF-8 strings; `data-config` is a base64-encoded JSON object).

- [ ] **Step 1: Add `jsdom` as a devDependency (already listed in Task 1's `package.json`; verify it installed)**

Run: `pnpm list jsdom`
Expected: shows the installed `jsdom` version. If missing, run `pnpm add -D jsdom`.

- [ ] **Step 2: Write the failing tests**

```typescript
// test/renderer.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createRenderer, type RendererDeps } from "../src/renderer";

function makeDiagramContainer(
  source: string,
  config: Record<string, unknown> = {},
) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const document = dom.window.document;
  (globalThis as any).atob = (base64: string) =>
    Buffer.from(base64, "base64").toString("binary");

  const element = document.createElement("div");
  element.className = "schematex-diagram";
  element.setAttribute(
    "data-source",
    Buffer.from(source, "utf8").toString("base64"),
  );
  element.setAttribute(
    "data-config",
    Buffer.from(JSON.stringify(config), "utf8").toString("base64"),
  );
  document.body.appendChild(element);

  return { document, element, window: dom.window };
}

function noopDeps(overrides: Partial<RendererDeps> = {}): RendererDeps {
  return {
    renderPreviewToContainer: () => {},
    renderPreview: () => "<svg></svg>",
    svgToPngBlob: async () => new Blob(),
    downloadBlob: () => {},
    printSvgAsPdf: () => {},
    ...overrides,
  };
}

test("renders a diagram container, passing decoded source and config with mode forced to preview", () => {
  const { document, element } = makeDiagramContainer(
    "Genogram\n  Alice -- Bob\n",
    { theme: "dark" },
  );
  let received:
    | { text: string; container: Element; config: Record<string, unknown> }
    | undefined;

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (text, container, config) => {
        received = {
          text,
          container,
          config: config as Record<string, unknown>,
        };
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
    }),
  );

  renderer.renderAll(document);

  assert.equal(element.getAttribute("data-rendered"), "true");
  assert.equal(received?.text, "Genogram\n  Alice -- Bob\n");
  assert.equal(received?.config.theme, "dark");
  assert.equal(received?.config.mode, "preview");
  assert.match(element.innerHTML, /<svg><\/svg>/);
});

test("does not re-render a container already marked rendered", () => {
  const { document, element } = makeDiagramContainer("Genogram\n");
  element.setAttribute("data-rendered", "true");
  let callCount = 0;

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: () => {
        callCount++;
      },
    }),
  );

  renderer.renderAll(document);

  assert.equal(callCount, 0);
});

test("shows an inline error card and still marks rendered when rendering throws", () => {
  const { document, element } = makeDiagramContainer("Genogram\n");

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: () => {
        throw new Error("boom");
      },
    }),
  );

  renderer.renderAll(document);

  assert.equal(element.getAttribute("data-rendered"), "true");
  assert.match(element.innerHTML, /schematex-error/);
  assert.match(element.innerHTML, /boom/);
});

test("adds working Export PNG and Export PDF buttons after a successful render", async () => {
  const { document, element, window } = makeDiagramContainer("Genogram\n", {
    theme: "dark",
  });
  const calls: string[] = [];

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container) => {
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
      renderPreview: () => {
        calls.push("renderPreview");
        return "<svg></svg>";
      },
      svgToPngBlob: async () => {
        calls.push("svgToPngBlob");
        return new Blob();
      },
      downloadBlob: () => {
        calls.push("downloadBlob");
      },
      printSvgAsPdf: () => {
        calls.push("printSvgAsPdf");
      },
    }),
  );

  renderer.renderAll(document);

  const buttons = element.querySelectorAll(".schematex-export-bar button");
  assert.equal(buttons.length, 2);

  (buttons[0] as HTMLElement).dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, ["renderPreview", "svgToPngBlob", "downloadBlob"]);

  calls.length = 0;
  (buttons[1] as HTMLElement).dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  );
  assert.deepEqual(calls, ["renderPreview", "printSvgAsPdf"]);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test`
Expected: FAIL — `Cannot find module '../src/renderer'`.

- [ ] **Step 4: Write the implementation**

```typescript
// src/renderer.ts
export interface RendererDeps {
  renderPreviewToContainer: (
    text: string,
    container: Element,
    config?: Record<string, unknown>,
  ) => void;
  renderPreview: (text: string, config?: Record<string, unknown>) => string;
  svgToPngBlob: (
    svg: string,
    options?: { scale?: number; background?: string | null },
  ) => Promise<Blob>;
  downloadBlob: (blob: Blob, filename: string) => void;
  printSvgAsPdf: (svg: string, title?: string) => void;
}

function decodeBase64Attribute(
  element: Element,
  attributeName: string,
): string {
  const encodedValue = element.getAttribute(attributeName) || "";
  return atob(encodedValue);
}

export function createRenderer(deps: RendererDeps): {
  renderAll(root: ParentNode): void;
  renderOne(element: HTMLElement): void;
} {
  function attachExportButtons(
    element: HTMLElement,
    source: string,
    config: Record<string, unknown>,
  ): void {
    if (element.querySelector(".schematex-export-bar")) {
      return;
    }

    const ownerDocument = element.ownerDocument;
    const exportBar = ownerDocument.createElement("div");
    exportBar.className = "schematex-export-bar";

    const exportPngButton = ownerDocument.createElement("button");
    exportPngButton.textContent = "Export PNG";
    exportPngButton.addEventListener("click", async () => {
      const svgMarkup = deps.renderPreview(source, config);
      const pngBlob = await deps.svgToPngBlob(svgMarkup, {
        scale: 2,
        background: "white",
      });
      deps.downloadBlob(pngBlob, "diagram.png");
    });

    const exportPdfButton = ownerDocument.createElement("button");
    exportPdfButton.textContent = "Export PDF";
    exportPdfButton.addEventListener("click", () => {
      const svgMarkup = deps.renderPreview(source, config);
      deps.printSvgAsPdf(svgMarkup, "SchemaTex diagram");
    });

    exportBar.append(exportPngButton, exportPdfButton);
    element.prepend(exportBar);
  }

  function renderOne(element: HTMLElement): void {
    try {
      const source = decodeBase64Attribute(element, "data-source");
      const rawConfig = decodeBase64Attribute(element, "data-config");
      const config: Record<string, unknown> = rawConfig
        ? JSON.parse(rawConfig)
        : {};

      deps.renderPreviewToContainer(source, element, {
        ...config,
        mode: "preview",
      });
      attachExportButtons(element, source, config);
    } catch (renderError) {
      const message =
        renderError instanceof Error
          ? renderError.message
          : String(renderError);
      element.innerHTML = `<div class="schematex-error">SchemaTex error: ${message}</div>`;
    } finally {
      element.setAttribute("data-rendered", "true");
    }
  }

  function renderAll(root: ParentNode): void {
    root
      .querySelectorAll('.schematex-diagram:not([data-rendered="true"])')
      .forEach((element) => {
        renderOne(element as HTMLElement);
      });
  }

  return { renderAll, renderOne };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test`
Expected: PASS, all 4 tests in `test/renderer.test.ts` green, plus all earlier tests still green.

- [ ] **Step 6: Commit**

```bash
git add src/renderer.ts test/renderer.test.ts
git commit -m "Add preview renderer core with error handling and PNG/PDF export"
```

- [ ] **Step 7: Push**

Run: `git push origin HEAD`

---

## Task 5: Preview script bundle entry, styles, and manifest wiring

**Files:**

- Modify: `src/previewScript.ts` (replace the `export {};` placeholder from Task 1)
- Create: `media/previewStyles.css`

**Interfaces:**

- Consumes: `createRenderer` from `src/renderer.ts` (Task 4); `renderPreviewToContainer`, `renderPreview` from `schematex/browser`; `svgToPngBlob`, `downloadBlob`, `printSvgAsPdf` from `schematex/export`.
- This task has no automated test — it is thin wiring around already-tested logic (`createRenderer`), plus the actual `schematex` rendering which only runs correctly inside a browser DOM (VS Code's preview webview). This gap is called out explicitly in the spec's Testing section; verification here is manual, in the Extension Development Host.

- [ ] **Step 1: Write the real `src/previewScript.ts`**

```typescript
import { renderPreviewToContainer, renderPreview } from "schematex/browser";
import { svgToPngBlob, downloadBlob, printSvgAsPdf } from "schematex/export";
import { createRenderer } from "./renderer";

const renderer = createRenderer({
  renderPreviewToContainer,
  renderPreview,
  svgToPngBlob,
  downloadBlob,
  printSvgAsPdf,
});

renderer.renderAll(document);

const observer = new MutationObserver(() => {
  renderer.renderAll(document);
});

observer.observe(document.body, { childList: true, subtree: true });
```

- [ ] **Step 2: Write `media/previewStyles.css`**

```css
.schematex-diagram {
  margin: 1em 0;
  overflow-x: auto;
}

.schematex-diagram svg {
  max-width: 100%;
  height: auto;
}

.schematex-export-bar {
  display: flex;
  gap: 0.5em;
  margin-bottom: 0.5em;
}

.schematex-export-bar button {
  font-size: 0.85em;
  padding: 2px 8px;
  cursor: pointer;
}

.schematex-error {
  border: 1px solid var(--vscode-inputValidation-errorBorder, #a1260d);
  background: var(
    --vscode-inputValidation-errorBackground,
    rgba(161, 38, 13, 0.1)
  );
  color: var(--vscode-editor-foreground, inherit);
  padding: 0.75em;
  font-family: var(--vscode-editor-font-family, monospace);
  white-space: pre-wrap;
}
```

- [ ] **Step 3: Rebuild the bundle**

Run: `pnpm run compile`
Expected: exits 0, `media/previewScript.js` now contains the bundled renderer plus `schematex/browser` and `schematex/export` code (file size noticeably larger than the Task 1 placeholder).

- [ ] **Step 4: Manual verification in the Extension Development Host**

1. Open this repo folder in VS Code.
2. Press F5 (Run Extension) to launch the Extension Development Host.
3. In the new window, create a scratch file `test.md` with:

   ````
   # Test

   ```schematex
   ---
   theme: dark
   ---
   Genogram
     Alice -- Bob
   ````

   ```

   ```

4. Open the Markdown preview (`Cmd+Shift+V` / `Ctrl+Shift+V`).
5. Confirm: the fence renders as an SVG diagram, not a code block.
6. Edit the DSL body (e.g. add a third person) and confirm the preview updates without manually reopening it.
7. Click "Export PNG" and "Export PDF" on the rendered diagram; confirm a save/print flow triggers.
8. Add a fence with intentionally invalid DSL (e.g. `schematex` fence containing just `???`) and confirm it shows a `.schematex-error` card instead of breaking the rest of the preview.

Expected: all checks pass. If any function name/signature from `schematex/browser` or `schematex/export` doesn't match what's bundled (e.g. a version bump changed the API), note the actual signature found and fix `src/previewScript.ts` and/or `src/renderer.ts`'s `RendererDeps` accordingly before proceeding — don't silently paper over a mismatch.

- [ ] **Step 5: Commit**

```bash
git add src/previewScript.ts media/previewStyles.css
git commit -m "Wire preview script bundle entry and diagram/error styles"
```

- [ ] **Step 6: Push**

Run: `git push origin HEAD`

---

## Task 6: Extension icon/logo and marketplace-ready README

**Files:**

- Create: `media/icon.png` (128×128, PNG, opaque or transparent background per VS Code Marketplace requirements)
- Create: `media/logo.png` (512×512, same artwork, for the GitHub README header — same visual identity everywhere per the requirement that extension, Marketplace listing, and README all show the same logo)
- Modify: `package.json` (add `icon`, `repository`, `galleryBanner`)
- Modify: `README.md` (logo header, badges, Diátaxis-shaped content)

**Interfaces:**

- None — this task produces static assets and docs, consumed only by the VS Code packaging step in Task 7 and by GitHub's rendering of `README.md`.

- [ ] **Step 1: Build the logo as a hand-authored SVG, then rasterize it**

`nano-banana` is waived for this task (user ruling, see Global Constraints) — its Gemini API key hit its daily free-tier quota with no image produced. Build the logo directly instead:

1. Write an SVG at `media/logo-source.svg`: a simple, modern, friendly square icon representing diagram/schema visualization — interconnected nodes or a stylized flowchart glyph, legible at small sizes (VS Code renders extension icons as small as 24×24 in some UI), on a solid or transparent background, no text. A `viewBox="0 0 512 512"` square canvas with a handful of `<circle>`/`<line>` or `<rect>`/`<path>` elements is enough — keep it simple and geometric rather than attempting anything photorealistic.
2. Rasterize it to PNG using macOS's built-in QuickLook thumbnailer (no extra install needed): `qlmanage -t -s 1024 -o media/ media/logo-source.svg` — this writes `media/logo-source.svg.png` at 1024×1024. If `qlmanage` isn't available or fails, report BLOCKED with what you tried rather than guessing at another tool.
3. Verify the rasterized PNG actually has visible content (not blank/transparent-only) by checking its file size is more than a few KB.

- [ ] **Step 2: Derive `media/icon.png` (128×128) and `media/logo.png` (512×512) from the rasterized artwork**

Run: `mkdir -p media`
Run: `sips -z 512 512 media/logo-source.svg.png --out media/logo.png`
Run: `sips -z 128 128 media/logo-source.svg.png --out media/icon.png`
Expected: both files exist, correct dimensions (`sips -g pixelWidth -g pixelHeight media/icon.png` reports 128×128; same check for `media/logo.png` at 512×512). Delete `media/logo-source.svg.png` afterward (the raw QuickLook rasterization) but keep `media/logo-source.svg` (the hand-authored source, useful if the logo needs regenerating at a different size later).

- [ ] **Step 3: Add `icon`, `repository`, and `galleryBanner` to `package.json`**

```json
{
  "icon": "media/icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/<github-username>/schematex-vscode"
  },
  "galleryBanner": {
    "color": "#1e1e1e",
    "theme": "dark"
  }
}
```

Replace `<github-username>` with the account that owns the already-created `origin` remote (check `git remote -v` if unsure). Merge these keys into the existing `package.json` object (written in Task 1) rather than replacing the whole file.

- [ ] **Step 4: Rewrite `README.md` via the `documentation-writing` skill**

Invoke the `documentation-writing` skill (Diátaxis framework) to rewrite `README.md`, replacing Task 1's minimal draft. Requirements to give the skill:

- Header: `media/logo.png` image, project name, one-line description.
- Badges row directly under the header, using shields.io, at minimum: License (`AGPL--3.0--only`), and a VS Code Marketplace version badge pointing at `https://marketplace.visualstudio.com/items?itemName=<publisher>.schematex-vscode` (placeholder `<publisher>` until Task 7 assigns a real publisher id — mark it clearly as a placeholder to fill in after publishing).
- A how-to-use section (already drafted content from Task 1's README is reusable source material: fence syntax, config header keys, supported keys table).
- An explanation section: what SchemaTex is, link to `https://github.com/SchemaTex/SchemaTex`, and the AGPL-3.0 licensing note (this extension bundles SchemaTex, which is AGPL-3.0, so the whole extension is AGPL-3.0 too).
- A short reference section: full list of supported config keys (`theme`, `fontFamily`, `width`, `height`, `padding`, `scene`) with types.

- [ ] **Step 5: Commit**

```bash
git add media/icon.png media/logo.png package.json README.md
git commit -m "Add extension icon/logo and marketplace-ready README"
```

- [ ] **Step 6: Push**

Run: `git push origin HEAD`

---

## Task 7: Publish to the VS Code Marketplace

**Files:**

- Modify: `package.json` (add real `publisher` id once created)
- Create: `.vscodeignore`

**Interfaces:**

- None — this task packages and ships the artifact built by Tasks 1–6; it doesn't change runtime behavior.

Marketplace publishing has manual, one-time account-setup steps that can't be automated (they require a human at a browser, MFA, and accepting terms). Those are called out explicitly below rather than scripted around.

The Azure DevOps Personal Access Token already exists and is saved in 1Password: vault `Personal`, item `Azure Personal Access Token`. Read it with the `op` CLI rather than creating a new one or pasting it manually — this also means it never needs to be typed interactively or land in shell history.

- [ ] **Step 1: Verify the existing Personal Access Token is still valid**

**Never run `op item get "Azure Personal Access Token" ...` bare (with or without `--format json`) and let its output reach the terminal/transcript unfiltered — 1Password's default output includes the credential field's plaintext value, and that value has no business appearing anywhere except directly inside `VSCE_PAT` in Step 5. A prior run of this exact step leaked the token into a subagent's local transcript file this way (contained, not committed, but real — the token was rotated afterward as a precaution).**

Check the item exists and its expiry, without ever printing field values, by filtering to just non-secret metadata:

Run: `op item get "Azure Personal Access Token" --vault Personal --format json | jq -r '{title, category, fields: [.fields[] | {label, purpose, type}]}'`

This shows the item's title/category and each field's `label`/`purpose`/`type` only (never `.value`) — use it to confirm the item exists and to find which field label holds the credential (commonly `credential` or `password` for an API Credential item type; the `type` will be `CONCEALED`). Step 5 below assumes the field is named `credential` — adjust the `op read` path if it's actually named something else.

To check expiry specifically (also safe — expiry is not a secret): `op item get "Azure Personal Access Token" --vault Personal --format json | jq -r '.fields[] | select(.label == "expires") | .value'` (adjust the label if the item's expiry field is named differently, or check for it in the field list above). If the item's expiry has passed, or `op` reports it can't find the item, stop and get a fresh token from `https://dev.azure.com` (User Settings → Personal Access Tokens, **Marketplace: Manage** scope) and update the 1Password item before continuing — don't silently work around a missing/expired token.

- [x] **Step 2 (manual, human): Create a Marketplace publisher** — already done. Publisher id is `VolkanUnsal`.

- [ ] **Step 3: Add the publisher id to `package.json` and install the packaging CLI**

Merge this key into the existing `package.json` object (do not replace the whole file — it already has `name`, `dependencies`, `contributes.icon`, etc. from earlier tasks).

```json
{
  "publisher": "VolkanUnsal"
}
```

Run: `pnpm add -D @vscode/vsce`

- [ ] **Step 4: Write `.vscodeignore`**

```
node_modules/**
src/**
test/**
docs/**
.vscode/**
*.map
tsconfig.json
esbuild.config.js
pnpm-lock.yaml
```

- [ ] **Step 5: Load the Personal Access Token into the environment via `op`**

Run: `export VSCE_PAT="$(op read 'op://Personal/Azure Personal Access Token/credential')"`
(Use the field name confirmed in Step 1 if it isn't `credential`.)
Expected: the command succeeds silently (no output) and `VSCE_PAT` is set for the rest of this shell session. `vsce` reads `VSCE_PAT` from the environment automatically for both `package`/`publish` operations below — no separate `vsce login` step needed, and the token never appears as a command-line argument or gets typed interactively.

Do not `echo "$VSCE_PAT"` or otherwise print it — treat it as a live secret for the rest of this task.

- [ ] **Step 6: Package the extension and inspect the output**

Run: `pnpm run compile`
Run: `pnpm exec vsce package`
Expected: a `schematex-vscode-0.1.0.vsix` file is created. Run `pnpm exec vsce ls` first (or unzip the `.vsix`) to confirm it contains `dist/extension.js`, `media/`, and excludes `src/`/`test/`/`node_modules/` — a bloated or incomplete package here is a packaging-config bug, not something to ship and fix later.

- [ ] **Step 7 (requires user confirmation): Publish**

This makes the extension publicly installable — confirm with the user before running.

Run: `pnpm exec vsce publish`
Expected: extension appears at `https://marketplace.visualstudio.com/items?itemName=VolkanUnsal.schematex-vscode` within a few minutes (Marketplace review for a first publish is typically automated/fast for extensions with no flagged content, not a long manual queue — but first-time publishers should expect it can take up to a day).

- [ ] **Step 8: Fix the placeholder Marketplace badge in `README.md`**

Replace whatever placeholder Task 6 left in the Marketplace version badge (its brief said to mark `<publisher>` clearly and placeholder it since the publisher id wasn't known yet at that point) with `VolkanUnsal`, now that the listing exists. Check `README.md` for the actual placeholder text Task 6 used — it may not be the literal string `<publisher>`.

- [ ] **Step 9: Commit and push**

```bash
git add package.json .vscodeignore README.md pnpm-lock.yaml
git commit -m "Add VS Code Marketplace publishing config and publish v0.1.0"
git push origin HEAD
```

---

## Plan self-review notes

- **Spec coverage:** fence detection + live update (Task 3, riding VS Code's built-in preview refresh per the spec's data-flow section) — covered; per-diagram config (Task 2) — covered; render + error card (Task 4) — covered; PNG/PDF export (Task 4 + 5) — covered, but implemented as in-webview "Export PNG"/"Export PDF" buttons injected into each diagram, not as the spec's `schematex.exportPng`/`schematex.exportPdf` VS Code commands with `postMessage` — see the spec's Export handling deviation note added in the final-review fix pass; AGPL-3.0 licensing (Task 1) — covered; testing gap for actual SVG rendering — called out explicitly in Task 5 rather than hidden.
- **Post-spec additions (from user follow-up, not in the original spec document):** GitHub repository creation and an after-every-commit push cadence — covered (Task 1 Step 12, Global Constraints, and a push step appended to every task's commit). Shared logo/icon across the extension, Marketplace listing, and README, generated via the `nano-banana` skill, plus a `documentation-writing`-skill README with badges — covered (Task 6). VS Code Marketplace publishing, including publisher account creation and submission — covered (Task 7), with the genuinely manual, human-only steps (Azure DevOps account, PAT, publisher creation, the final `vsce publish`) marked as such rather than scripted as if automatable.
- **Placeholder scan:** no TBD/TODO markers; the one intentional placeholder (`export {};` in Task 1) is explicitly flagged as temporary and replaced in Task 5 Step 1; the `<publisher>` and `<github-username>` placeholders in Task 6 are explicitly resolved in Task 7.
- **Type consistency:** `RendererDeps` (Task 4) matches the real `schematex/browser`/`schematex/export` signatures used in Task 5's `previewScript.ts` exactly — same parameter names and order throughout (`text` before `container`, matching the verified `renderToContainer`/`renderPreviewToContainer` signature, not the container-first order that would be a natural but wrong guess).
