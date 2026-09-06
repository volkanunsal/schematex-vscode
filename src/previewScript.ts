import { renderPreviewToContainer } from "schematex/browser";
import { createRenderer } from "./renderer";

const renderer = createRenderer({
  renderPreviewToContainer,
});

renderer.renderAll(document);

const observer = new MutationObserver(() => {
  renderer.renderAll(document);
});

observer.observe(document.body, { childList: true, subtree: true });
