import * as MarkdownItModule from "markdown-it";
import * as vscode from "vscode";
import { schematexPlugin } from "./markdownItPlugin";

type MarkdownItInstance = ReturnType<typeof MarkdownItModule.default>;

export function activate(_context: vscode.ExtensionContext) {
  return {
    extendMarkdownIt(markdownItInstance: MarkdownItInstance): MarkdownItInstance {
      schematexPlugin(markdownItInstance);
      return markdownItInstance;
    },
  };
}

export function deactivate(): void {}
