import * as MarkdownItModule from "markdown-it";
import type { RendererRule } from "markdown-it";
import { parseConfigHeader } from "./config";

type MarkdownItInstance = ReturnType<typeof MarkdownItModule.default>;

export function schematexPlugin(markdownItInstance: MarkdownItInstance): void {
  const defaultFenceRenderer = markdownItInstance.renderer.rules.fence!.bind(
    markdownItInstance.renderer.rules,
  );

  const schematexFenceRenderer: RendererRule = (
    tokens,
    tokenIndex,
    options,
    env,
    self,
  ) => {
    const token = tokens[tokenIndex];
    const fenceInfo = token.info.trim();

    if (fenceInfo !== "schematex") {
      return defaultFenceRenderer(tokens, tokenIndex, options, env, self);
    }

    const { config, body } = parseConfigHeader(token.content);
    const encodedSource = Buffer.from(body, "utf8").toString("base64");
    const encodedConfig = Buffer.from(JSON.stringify(config), "utf8").toString(
      "base64",
    );

    return `<div class="schematex-diagram" data-source="${encodedSource}" data-config="${encodedConfig}"></div>\n`;
  };

  markdownItInstance.renderer.rules.fence = schematexFenceRenderer;
}
