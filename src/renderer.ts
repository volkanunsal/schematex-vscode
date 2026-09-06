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
      try {
        const svgMarkup = deps.renderPreview(source, {
          ...config,
          mode: "preview",
        });
        const pngBlob = await deps.svgToPngBlob(svgMarkup, {
          scale: 2,
          background: "white",
        });
        deps.downloadBlob(pngBlob, "diagram.png");
      } catch (exportError) {
        showErrorCard(element, messageFromError(exportError));
      }
    });

    const exportPdfButton = ownerDocument.createElement("button");
    exportPdfButton.textContent = "Export PDF";
    exportPdfButton.addEventListener("click", () => {
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
