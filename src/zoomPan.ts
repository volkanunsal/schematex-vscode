const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ZOOM_STEP = 1.2;

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getNaturalSize(
  svg: SVGElement,
): { width: number; height: number } | null {
  const width = Number.parseFloat(svg.getAttribute("width") ?? "");
  const height = Number.parseFloat(svg.getAttribute("height") ?? "");
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }

  const viewBoxAttr = svg.getAttribute("viewBox");
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
    if (
      parts.length === 4 &&
      parts.every((value) => Number.isFinite(value)) &&
      parts[2] > 0 &&
      parts[3] > 0
    ) {
      return { width: parts[2], height: parts[3] };
    }
  }

  return null;
}

function computeFitState(
  svg: SVGElement,
  viewport: HTMLElement,
): ZoomPanState {
  const naturalSize = getNaturalSize(svg);
  const rect = viewport.getBoundingClientRect();
  if (!naturalSize || rect.width <= 0 || rect.height <= 0) {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  const fitScale = Math.min(
    rect.width / naturalSize.width,
    rect.height / naturalSize.height,
    1,
  );
  const scaledWidth = naturalSize.width * fitScale;
  const scaledHeight = naturalSize.height * fitScale;
  return {
    scale: fitScale,
    translateX: Math.max(0, (rect.width - scaledWidth) / 2),
    translateY: Math.max(0, (rect.height - scaledHeight) / 2),
  };
}

function isPanModifierPressed(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export function attachZoomPan(
  diagramElement: HTMLElement,
  viewport: HTMLElement,
  svg: SVGElement,
): void {
  const ownerDocument = diagramElement.ownerDocument;
  const initialState = computeFitState(svg, viewport);
  const state: ZoomPanState = { ...initialState };

  function applyTransform(): void {
    svg.style.transformOrigin = "0 0";
    svg.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
  }

  function updateIdleCursor(event?: MouseEvent): void {
    const canPan = state.scale > 1 || (event ? isPanModifierPressed(event) : false);
    viewport.style.cursor = canPan ? "grab" : "default";
  }

  function zoomAt(anchorX: number, anchorY: number, factor: number): void {
    const newScale = clamp(state.scale * factor, MIN_SCALE, MAX_SCALE);
    if (newScale === state.scale) {
      return;
    }
    const ratio = newScale / state.scale;
    state.translateX = anchorX - (anchorX - state.translateX) * ratio;
    state.translateY = anchorY - (anchorY - state.translateY) * ratio;
    state.scale = newScale;
    applyTransform();
  }

  function zoomAtViewportCenter(factor: number): void {
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  }

  function reset(): void {
    state.scale = initialState.scale;
    state.translateX = initialState.translateX;
    state.translateY = initialState.translateY;
    applyTransform();
  }

  const controls = ownerDocument.createElement("div");
  controls.className = "schematex-zoom-controls";

  const zoomOutButton = ownerDocument.createElement("button");
  zoomOutButton.type = "button";
  zoomOutButton.className = "schematex-zoom-out";
  zoomOutButton.setAttribute("aria-label", "Zoom out");
  zoomOutButton.textContent = "−";
  zoomOutButton.addEventListener("click", () => {
    zoomAtViewportCenter(1 / ZOOM_STEP);
  });

  const resetButton = ownerDocument.createElement("button");
  resetButton.type = "button";
  resetButton.className = "schematex-zoom-reset";
  resetButton.setAttribute("aria-label", "Reset zoom");
  resetButton.textContent = "⟲";
  resetButton.addEventListener("click", reset);

  const zoomInButton = ownerDocument.createElement("button");
  zoomInButton.type = "button";
  zoomInButton.className = "schematex-zoom-in";
  zoomInButton.setAttribute("aria-label", "Zoom in");
  zoomInButton.textContent = "+";
  zoomInButton.addEventListener("click", () => {
    zoomAtViewportCenter(ZOOM_STEP);
  });

  controls.append(zoomOutButton, resetButton, zoomInButton);
  diagramElement.prepend(controls);

  viewport.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(anchorX, anchorY, factor);
    },
    { passive: false },
  );

  let dragging = false;
  let dragStartClientX = 0;
  let dragStartClientY = 0;
  let dragStartTranslateX = 0;
  let dragStartTranslateY = 0;

  viewport.addEventListener("mousedown", (event: MouseEvent) => {
    if (state.scale <= 1 && !isPanModifierPressed(event)) {
      return;
    }
    dragging = true;
    dragStartClientX = event.clientX;
    dragStartClientY = event.clientY;
    dragStartTranslateX = state.translateX;
    dragStartTranslateY = state.translateY;
    viewport.classList.add("schematex-zoom-dragging");
    viewport.style.cursor = "grabbing";
  });

  viewport.addEventListener("mousemove", (event: MouseEvent) => {
    if (!dragging) {
      updateIdleCursor(event);
    }
  });

  ownerDocument.addEventListener("mousemove", (event: MouseEvent) => {
    if (!dragging) {
      return;
    }
    state.translateX = dragStartTranslateX + (event.clientX - dragStartClientX);
    state.translateY = dragStartTranslateY + (event.clientY - dragStartClientY);
    applyTransform();
  });

  ownerDocument.addEventListener("mouseup", (event: MouseEvent) => {
    if (!dragging) {
      return;
    }
    dragging = false;
    viewport.classList.remove("schematex-zoom-dragging");
    updateIdleCursor(event);
  });

  applyTransform();
  updateIdleCursor();
}
