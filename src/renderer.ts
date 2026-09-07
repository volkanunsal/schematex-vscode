import { attachZoomPan } from "./zoomPan";
import { hasDarkThemeContrastBug } from "./darkThemeContrastBugs";

export interface RendererDeps {
  renderPreviewToContainer: (
    text: string,
    container: Element,
    config?: Record<string, unknown>,
  ) => void;
  getDefaultTheme?: () => string;
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

function logDiagnostic(
  label: string,
  details: Record<string, unknown>,
): void {
  const serialized = JSON.stringify(
    details,
    (_key, value) =>
      value instanceof Error
        ? { name: value.name, message: value.message, stack: value.stack }
        : value,
    2,
  );
  // eslint-disable-next-line no-console
  console.error(`[schematex-vscode] ${label}\n${serialized}`);
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
  reRenderAll(root: ParentNode): void;
} {
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

      let defaultTheme = deps.getDefaultTheme?.();
      if (defaultTheme === "dark" && hasDarkThemeContrastBug(source)) {
        defaultTheme = undefined;
      }

      deps.renderPreviewToContainer(source, element, {
        theme: defaultTheme,
        ...schematexConfig,
        mode: "preview",
      });

      const svg = element.querySelector("svg");
      if (svg) {
        const viewport = element.ownerDocument.createElement("div");
        viewport.className = "schematex-zoom-viewport";
        viewport.appendChild(svg);
        element.appendChild(viewport);
        attachZoomPan(element, viewport, svg);
      }
    } catch (renderError) {
      logDiagnostic("render threw", {
        error: renderError,
        message: messageFromError(renderError),
      });
      showErrorCard(element, messageFromError(renderError));
    } finally {
      element.setAttribute("data-rendered", "true");
    }
  }

  function renderAll(root: ParentNode): void {
    root
      // [data-source] is required, not just .schematex-diagram: schematex's
      // own rendered SVG root also carries a "schematex-diagram" class (its
      // own naming convention, unrelated to ours), so a plain class selector
      // matches both our placeholder div AND the SVG we just rendered into
      // it. Re-processing that SVG (which has no data-source/data-config)
      // decodes an empty string and overwrites the just-rendered diagram
      // with schematex's own "cannot detect diagram type" fallback.
      .querySelectorAll(
        '.schematex-diagram[data-source]:not([data-rendered="true"])',
      )
      .forEach((element) => {
        renderOne(element as HTMLElement);
      });
  }

  function reRenderAll(root: ParentNode): void {
    root
      .querySelectorAll('.schematex-diagram[data-source]')
      .forEach((element) => {
        renderOne(element as HTMLElement);
      });
  }

  return { renderAll, renderOne, reRenderAll };
}
