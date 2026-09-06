import { parseConfigHeader } from "./config";

export function schematexPlugin(markdownItInstance: any): void {
  const defaultFenceRenderer = markdownItInstance.renderer.rules.fence!.bind(
    markdownItInstance.renderer.rules,
  );

  markdownItInstance.renderer.rules.fence = (
    tokens: any,
    tokenIndex: any,
    options: any,
    env: any,
    self: any,
  ): string => {
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
}
