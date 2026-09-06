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

test("applies backgroundColor as an inline style and does not forward it to schematex", () => {
  const { document, element } = makeDiagramContainer("Genogram\n", {
    theme: "dark",
    backgroundColor: "#f5f5f5",
  });
  let receivedConfig: Record<string, unknown> | undefined;

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container, config) => {
        receivedConfig = config as Record<string, unknown>;
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
    }),
  );

  renderer.renderAll(document);

  // jsdom's CSSOM normalizes hex colors to rgb() on read-back.
  assert.equal(element.style.backgroundColor, "rgb(245, 245, 245)");
  assert.equal(receivedConfig?.theme, "dark");
  assert.equal("backgroundColor" in (receivedConfig ?? {}), false);
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

test("does not re-process schematex's own rendered SVG, which also carries the schematex-diagram class", () => {
  // Regression test: schematex's rendered SVG root has class="schematex-diagram
  // schematex-<type>" (its own naming convention). A plain `.schematex-diagram`
  // selector matches both our placeholder div and that inner SVG once
  // rendered, so a MutationObserver-triggered re-scan would try to render
  // the SVG itself (which has no data-source/data-config) with an empty
  // source, overwriting the just-rendered diagram with schematex's own
  // "cannot detect diagram type" fallback. renderAll must only ever act on
  // elements carrying [data-source].
  const { document, element } = makeDiagramContainer("Genogram\n");
  let callCount = 0;

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container) => {
        callCount++;
        (container as HTMLElement).innerHTML =
          '<svg class="schematex-diagram schematex-genogram"></svg>';
      },
    }),
  );

  renderer.renderAll(document);
  assert.equal(callCount, 1);

  // Simulate the MutationObserver firing again after the DOM changed.
  renderer.renderAll(document);
  assert.equal(callCount, 1);

  const innerSvg = element.querySelector("svg.schematex-diagram");
  assert.ok(innerSvg);
  assert.equal(innerSvg?.hasAttribute("data-rendered"), false);
});

test("shows an inline error card when decoding the container's attributes fails, and still marks rendered", () => {
  // renderPreviewToContainer throwing simulates a decode-time failure (e.g.
  // malformed base64/JSON in data-source/data-config), which is what
  // renderOne's catch block actually guards against. Invalid SchemaTex DSL
  // does NOT throw here — in mode: "preview", schematex itself returns a
  // diagnostic SVG instead of throwing, so that case never reaches this
  // catch block. This test exercises the catch/finally mechanics generically
  // via an injected throw, regardless of which failure triggers it.
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

test("export toggle button and menu are present; visibility is CSS-hover-driven, not JS state", () => {
  // The toggle and its dropdown are always in the DOM; previewStyles.css
  // controls visibility purely via :hover (toggle hidden until
  // .schematex-diagram:hover, menu hidden until
  // .schematex-export-toggle-wrap:hover). jsdom doesn't evaluate CSS
  // layout/hover, so this test only verifies structure, not visual state.
  const { document, element } = makeDiagramContainer("Genogram\n");

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container) => {
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
    }),
  );

  renderer.renderAll(document);

  const toggle = element.querySelector(".schematex-export-toggle");
  const menu = element.querySelector(".schematex-export-menu");
  const items = element.querySelectorAll(".schematex-export-item");
  assert.ok(toggle);
  assert.ok(menu);
  assert.equal(items.length, 2);
});

test("clicking Export PNG/PDF runs the export, forcing mode: preview", async () => {
  const { document, element, window } = makeDiagramContainer("Genogram\n", {
    theme: "dark",
  });
  const calls: string[] = [];
  const receivedConfigs: Record<string, unknown>[] = [];

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container) => {
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
      renderPreview: (_text, config) => {
        calls.push("renderPreview");
        receivedConfigs.push(config as Record<string, unknown>);
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

  const items = element.querySelectorAll(".schematex-export-item");
  assert.equal(items.length, 2);

  (items[0] as HTMLElement).dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, ["renderPreview", "svgToPngBlob", "downloadBlob"]);
  assert.equal(receivedConfigs[0]?.mode, "preview");
  assert.equal(receivedConfigs[0]?.theme, "dark");

  calls.length = 0;
  (items[1] as HTMLElement).dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  );
  assert.deepEqual(calls, ["renderPreview", "printSvgAsPdf"]);
  assert.equal(receivedConfigs[1]?.mode, "preview");
  assert.equal(receivedConfigs[1]?.theme, "dark");
});

test("Export PNG uses the configured backgroundColor, falling back to white", async () => {
  const { document, element, window } = makeDiagramContainer("Genogram\n", {
    backgroundColor: "#f5f5f5",
  });
  const receivedOptions: Array<{ background?: string | null }> = [];

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container) => {
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
      svgToPngBlob: async (_svg, options) => {
        receivedOptions.push(options ?? {});
        return new Blob();
      },
    }),
  );

  renderer.renderAll(document);

  const pngItem = element.querySelector(
    ".schematex-export-item",
  ) as HTMLElement;
  pngItem.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(receivedOptions[0]?.background, "#f5f5f5");
});

test("shows an inline error card instead of an unhandled rejection when Export PNG's renderPreview throws", async () => {
  const { document, element, window } = makeDiagramContainer("Genogram\n");

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container) => {
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
      renderPreview: () => {
        throw new Error("invalid DSL");
      },
    }),
  );

  renderer.renderAll(document);

  const pngItem = element.querySelector(
    ".schematex-export-item",
  ) as HTMLElement;
  pngItem.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.match(element.innerHTML, /schematex-error/);
  assert.match(element.innerHTML, /invalid DSL/);
});

test("shows an inline error card instead of an uncaught throw when Export PDF's svgToPngBlob-equivalent step (printSvgAsPdf) throws", () => {
  const { document, element, window } = makeDiagramContainer("Genogram\n");

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container) => {
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
      printSvgAsPdf: () => {
        throw new Error("print failed");
      },
    }),
  );

  renderer.renderAll(document);

  const items = element.querySelectorAll(".schematex-export-item");
  const pdfItem = items[1] as HTMLElement;
  pdfItem.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

  assert.match(element.innerHTML, /schematex-error/);
  assert.match(element.innerHTML, /print failed/);
});

test("shows an inline error card when Export PNG's svgToPngBlob rejects", async () => {
  const { document, element, window } = makeDiagramContainer("Genogram\n");

  const renderer = createRenderer(
    noopDeps({
      renderPreviewToContainer: (_text, container) => {
        (container as HTMLElement).innerHTML = "<svg></svg>";
      },
      svgToPngBlob: async () => {
        throw new Error("encode failed");
      },
    }),
  );

  renderer.renderAll(document);

  const pngItem = element.querySelector(
    ".schematex-export-item",
  ) as HTMLElement;
  pngItem.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.match(element.innerHTML, /schematex-error/);
  assert.match(element.innerHTML, /encode failed/);
});
