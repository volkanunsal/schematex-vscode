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
