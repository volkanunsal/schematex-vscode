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

function showErrorCard(element: HTMLElement, message: string): void {
  const ownerDocument = element.ownerDocument;
  const errorCard = ownerDocument.createElement("div");
  errorCard.className = "schematex-error";
  errorCard.textContent = `SchemaTex error: ${message}`;
  element.innerHTML = "";
  element.append(errorCard);
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function splitBackgroundColor(config: Record<string, unknown>): {
  backgroundColor: string | undefined;
  schematexConfig: Record<string, unknown>;
} {
  const { backgroundColor, ...schematexConfig } = config;
  return {
    backgroundColor: typeof backgroundColor === "string" ? backgroundColor : undefined,
    schematexConfig,
  };
}

export function createRenderer(deps: RendererDeps): {
  renderAll(root: ParentNode): void;
  renderOne(element: HTMLElement): void;
} {
  function attachExportButtons(
    element: HTMLElement,
    source: string,
    config: Record<string, unknown>,
    backgroundColor: string | undefined,
  ): void {
    if (element.querySelector(".schematex-export-toggle")) {
      return;
    }

    const ownerDocument = element.ownerDocument;

    const toggleButton = ownerDocument.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "schematex-export-toggle";
    toggleButton.setAttribute("aria-label", "Export diagram");
    toggleButton.setAttribute("aria-haspopup", "true");
    toggleButton.textContent = "⚙";

    const menu = ownerDocument.createElement("div");
    menu.className = "schematex-export-menu";

    const exportPngItem = ownerDocument.createElement("button");
    exportPngItem.type = "button";
    exportPngItem.className = "schematex-export-item";
    exportPngItem.textContent = "Export PNG";
    exportPngItem.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        const svgMarkup = deps.renderPreview(source, {
          ...config,
          mode: "preview",
        });
        const pngBlob = await deps.svgToPngBlob(svgMarkup, {
          scale: 2,
          background: backgroundColor ?? "white",
        });
        deps.downloadBlob(pngBlob, "diagram.png");
      } catch (exportError) {
        showErrorCard(element, messageFromError(exportError));
      }
    });

    const exportPdfItem = ownerDocument.createElement("button");
    exportPdfItem.type = "button";
    exportPdfItem.className = "schematex-export-item";
    exportPdfItem.textContent = "Export PDF";
    exportPdfItem.addEventListener("click", (event) => {
      event.stopPropagation();
      try {
        const svgMarkup = deps.renderPreview(source, {
          ...config,
          mode: "preview",
        });
        deps.printSvgAsPdf(svgMarkup, "SchemaTex diagram");
      } catch (exportError) {
        showErrorCard(element, messageFromError(exportError));
      }
    });

    menu.append(exportPngItem, exportPdfItem);

    const toggleWrap = ownerDocument.createElement("div");
    toggleWrap.className = "schematex-export-toggle-wrap";
    toggleWrap.append(toggleButton, menu);
    element.prepend(toggleWrap);
  }

  function renderOne(element: HTMLElement): void {
    try {
      const source = decodeBase64Attribute(element, "data-source");
      const rawConfig = decodeBase64Attribute(element, "data-config");
      const config: Record<string, unknown> = rawConfig
        ? JSON.parse(rawConfig)
        : {};
      const { backgroundColor, schematexConfig } = splitBackgroundColor(config);

      if (backgroundColor) {
        element.style.backgroundColor = backgroundColor;
      }

      deps.renderPreviewToContainer(source, element, {
        ...schematexConfig,
        mode: "preview",
      });
      attachExportButtons(element, source, schematexConfig, backgroundColor);
    } catch (renderError) {
      showErrorCard(element, messageFromError(renderError));
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
