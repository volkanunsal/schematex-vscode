import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { attachZoomPan } from "../src/zoomPan";

function makeViewport(
  width = 200,
  height = 100,
  svgSize?: { width: number; height: number },
) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const document = dom.window.document;

  const diagramElement = document.createElement("div");
  diagramElement.className = "schematex-diagram";

  const viewport = document.createElement("div");
  viewport.className = "schematex-zoom-viewport";
  Object.defineProperty(viewport, "getBoundingClientRect", {
    value: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON() {},
    }),
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  if (svgSize) {
    svg.setAttribute("width", String(svgSize.width));
    svg.setAttribute("height", String(svgSize.height));
  }
  viewport.appendChild(svg);
  diagramElement.appendChild(viewport);
  document.body.appendChild(diagramElement);

  return { document, window: dom.window, diagramElement, viewport, svg };
}

function currentScale(svg: SVGElement): number {
  const match = svg.style.transform.match(/scale\(([^)]+)\)/);
  return match ? Number(match[1]) : 1;
}

test("attaches zoom-out, reset, and zoom-in controls, and applies an identity transform initially", () => {
  const { diagramElement, svg } = makeViewport();
  attachZoomPan(diagramElement, diagramElement.querySelector(".schematex-zoom-viewport") as HTMLElement, svg);

  const controls = diagramElement.querySelector(".schematex-zoom-controls");
  assert.ok(controls);
  assert.equal(controls?.querySelectorAll("button").length, 3);
  assert.equal(svg.style.transform, "translate(0px, 0px) scale(1)");
});

test("zoom-in button increases scale; zoom-out decreases it", () => {
  const { diagramElement, viewport, svg, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  const zoomInButton = diagramElement.querySelector(
    ".schematex-zoom-in",
  ) as HTMLElement;
  zoomInButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.ok(currentScale(svg) > 1);

  const scaleAfterZoomIn = currentScale(svg);
  const zoomOutButton = diagramElement.querySelector(
    ".schematex-zoom-out",
  ) as HTMLElement;
  zoomOutButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  zoomOutButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.ok(currentScale(svg) < scaleAfterZoomIn);
});

test("zoom is clamped within [0.2, 5]", () => {
  const { diagramElement, viewport, svg, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  const zoomInButton = diagramElement.querySelector(
    ".schematex-zoom-in",
  ) as HTMLElement;
  for (let i = 0; i < 50; i++) {
    zoomInButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  }
  assert.ok(currentScale(svg) <= 5);

  const zoomOutButton = diagramElement.querySelector(
    ".schematex-zoom-out",
  ) as HTMLElement;
  for (let i = 0; i < 50; i++) {
    zoomOutButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  }
  assert.ok(currentScale(svg) >= 0.2);
});

test("reset restores scale 1 and translate 0,0 after zooming and panning", () => {
  const { diagramElement, viewport, svg, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  const zoomInButton = diagramElement.querySelector(
    ".schematex-zoom-in",
  ) as HTMLElement;
  zoomInButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.notEqual(svg.style.transform, "translate(0px, 0px) scale(1)");

  const resetButton = diagramElement.querySelector(
    ".schematex-zoom-reset",
  ) as HTMLElement;
  resetButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.equal(svg.style.transform, "translate(0px, 0px) scale(1)");
});

test("wheel without ctrl/meta does not zoom and does not preventDefault", () => {
  const { diagramElement, viewport, svg, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  const event = new window.WheelEvent("wheel", {
    deltaY: -100,
    clientX: 10,
    clientY: 10,
    cancelable: true,
  });
  viewport.dispatchEvent(event);

  assert.equal(currentScale(svg), 1);
  assert.equal(event.defaultPrevented, false);
});

test("ctrl+wheel zooms in on negative deltaY and calls preventDefault", () => {
  const { diagramElement, viewport, svg, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  const event = new window.WheelEvent("wheel", {
    deltaY: -100,
    clientX: 10,
    clientY: 10,
    ctrlKey: true,
    cancelable: true,
  });
  viewport.dispatchEvent(event);

  assert.ok(currentScale(svg) > 1);
  assert.equal(event.defaultPrevented, true);
});

test("meta+wheel with positive deltaY zooms out", () => {
  const { diagramElement, viewport, svg, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  // Zoom in first so there's room to zoom out from.
  viewport.dispatchEvent(
    new window.WheelEvent("wheel", {
      deltaY: -100,
      clientX: 10,
      clientY: 10,
      metaKey: true,
      cancelable: true,
    }),
  );
  const scaleAfterZoomIn = currentScale(svg);

  viewport.dispatchEvent(
    new window.WheelEvent("wheel", {
      deltaY: 100,
      clientX: 10,
      clientY: 10,
      metaKey: true,
      cancelable: true,
    }),
  );
  assert.ok(currentScale(svg) < scaleAfterZoomIn);
});

test("dragging pans only once zoomed in past scale 1; no-op at scale 1", () => {
  const { diagramElement, viewport, svg, document, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  // At scale 1, mousedown+move should not pan.
  viewport.dispatchEvent(
    new window.MouseEvent("mousedown", { clientX: 0, clientY: 0, bubbles: true }),
  );
  document.dispatchEvent(
    new window.MouseEvent("mousemove", { clientX: 50, clientY: 50, bubbles: true }),
  );
  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
  assert.equal(svg.style.transform, "translate(0px, 0px) scale(1)");

  const zoomInButton = diagramElement.querySelector(
    ".schematex-zoom-in",
  ) as HTMLElement;
  zoomInButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const transformAfterZoom = svg.style.transform;

  viewport.dispatchEvent(
    new window.MouseEvent("mousedown", { clientX: 0, clientY: 0, bubbles: true }),
  );
  assert.equal(viewport.classList.contains("schematex-zoom-dragging"), true);

  document.dispatchEvent(
    new window.MouseEvent("mousemove", { clientX: 30, clientY: 20, bubbles: true }),
  );
  assert.notEqual(svg.style.transform, transformAfterZoom);

  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
  assert.equal(viewport.classList.contains("schematex-zoom-dragging"), false);
});

test("initial scale fits an oversized diagram entirely within the viewport, centered", () => {
  // Viewport is 200x100; SVG is natively 400x100 (twice as wide as the
  // viewport) -- the whole diagram must be visible by default, not clipped
  // at scale 1.
  const { diagramElement, viewport, svg } = makeViewport(200, 100, {
    width: 400,
    height: 100,
  });
  attachZoomPan(diagramElement, viewport, svg);

  assert.equal(currentScale(svg), 0.5);
  // Fit-to-width leaves no horizontal slack (translateX 0) and centers
  // vertically (scaled height 50 inside a 100-tall viewport -> 25px each side).
  assert.equal(svg.style.transform, "translate(0px, 25px) scale(0.5)");
});

test("initial scale stays at 1 (no upscaling) when the diagram already fits", () => {
  const { diagramElement, viewport, svg } = makeViewport(200, 100, {
    width: 100,
    height: 50,
  });
  attachZoomPan(diagramElement, viewport, svg);

  assert.equal(currentScale(svg), 1);
});

test("reset returns to the fit-to-view baseline, not always scale 1", () => {
  const { diagramElement, viewport, svg, window } = makeViewport(200, 100, {
    width: 400,
    height: 100,
  });
  attachZoomPan(diagramElement, viewport, svg);
  const fitTransform = svg.style.transform;

  const zoomInButton = diagramElement.querySelector(
    ".schematex-zoom-in",
  ) as HTMLElement;
  zoomInButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.notEqual(svg.style.transform, fitTransform);

  const resetButton = diagramElement.querySelector(
    ".schematex-zoom-reset",
  ) as HTMLElement;
  resetButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.equal(svg.style.transform, fitTransform);
});

test("Ctrl/Cmd+drag pans even at scale 1, unlike a plain drag", () => {
  const { diagramElement, viewport, svg, document, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  // Plain drag at scale 1: no-op (covered by the earlier no-op test too).
  viewport.dispatchEvent(
    new window.MouseEvent("mousedown", { clientX: 0, clientY: 0, bubbles: true }),
  );
  assert.equal(viewport.classList.contains("schematex-zoom-dragging"), false);
  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));

  // Ctrl+drag at scale 1: pans.
  viewport.dispatchEvent(
    new window.MouseEvent("mousedown", {
      clientX: 0,
      clientY: 0,
      ctrlKey: true,
      bubbles: true,
    }),
  );
  assert.equal(viewport.classList.contains("schematex-zoom-dragging"), true);
  document.dispatchEvent(
    new window.MouseEvent("mousemove", { clientX: 40, clientY: 10, bubbles: true }),
  );
  assert.equal(svg.style.transform, "translate(40px, 10px) scale(1)");
  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
});

test("Cmd+drag at scale 1 also pans (metaKey, not just ctrlKey)", () => {
  const { diagramElement, viewport, svg, document, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  viewport.dispatchEvent(
    new window.MouseEvent("mousedown", {
      clientX: 0,
      clientY: 0,
      metaKey: true,
      bubbles: true,
    }),
  );
  assert.equal(viewport.classList.contains("schematex-zoom-dragging"), true);
  document.dispatchEvent(new window.MouseEvent("mouseup", { bubbles: true }));
});

test("cursor becomes grab on hover while a pan modifier is held, even without clicking", () => {
  const { diagramElement, viewport, svg, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  assert.equal(viewport.style.cursor, "default");

  viewport.dispatchEvent(
    new window.MouseEvent("mousemove", {
      clientX: 5,
      clientY: 5,
      ctrlKey: true,
      bubbles: true,
    }),
  );
  assert.equal(viewport.style.cursor, "grab");

  viewport.dispatchEvent(
    new window.MouseEvent("mousemove", { clientX: 6, clientY: 6, bubbles: true }),
  );
  assert.equal(viewport.style.cursor, "default");
});

test("cursor is grabbing while actively dragging, and reverts to grab on mouseup with the modifier still held", () => {
  const { diagramElement, viewport, svg, document, window } = makeViewport();
  attachZoomPan(diagramElement, viewport, svg);

  viewport.dispatchEvent(
    new window.MouseEvent("mousedown", {
      clientX: 0,
      clientY: 0,
      metaKey: true,
      bubbles: true,
    }),
  );
  assert.equal(viewport.style.cursor, "grabbing");

  document.dispatchEvent(
    new window.MouseEvent("mouseup", { metaKey: true, bubbles: true }),
  );
  assert.equal(viewport.style.cursor, "grab");
});
