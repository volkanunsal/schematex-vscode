import { renderPreviewToContainer } from "schematex/browser";
import { createRenderer } from "./renderer";
import { detectVsCodeTheme } from "./themeDetector";

const renderer = createRenderer({
  renderPreviewToContainer,
  getDefaultTheme: () => detectVsCodeTheme(document),
});

renderer.renderAll(document);

const contentObserver = new MutationObserver(() => {
  renderer.renderAll(document);
});

contentObserver.observe(document.body, { childList: true, subtree: true });

const themeObserver = new MutationObserver(() => {
  renderer.reRenderAll(document);
});

themeObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
});
