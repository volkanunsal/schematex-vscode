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

test("adds working Export PNG and Export PDF buttons after a successful render, forcing mode: preview", async () => {
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

  const buttons = element.querySelectorAll(".schematex-export-bar button");
  assert.equal(buttons.length, 2);

  (buttons[0] as HTMLElement).dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls, ["renderPreview", "svgToPngBlob", "downloadBlob"]);
  assert.equal(receivedConfigs[0]?.mode, "preview");
  assert.equal(receivedConfigs[0]?.theme, "dark");

  calls.length = 0;
  (buttons[1] as HTMLElement).dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }),
  );
  assert.deepEqual(calls, ["renderPreview", "printSvgAsPdf"]);
  assert.equal(receivedConfigs[1]?.mode, "preview");
  assert.equal(receivedConfigs[1]?.theme, "dark");
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

  const pngButton = element.querySelector(
    ".schematex-export-bar button",
  ) as HTMLElement;
  pngButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
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

  const buttons = element.querySelectorAll(".schematex-export-bar button");
  const pdfButton = buttons[1] as HTMLElement;
  pdfButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

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

  const pngButton = element.querySelector(
    ".schematex-export-bar button",
  ) as HTMLElement;
  pngButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.match(element.innerHTML, /schematex-error/);
  assert.match(element.innerHTML, /encode failed/);
});
