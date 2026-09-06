import type MarkdownIt from "markdown-it";
import * as vscode from "vscode";

export function activate(_context: vscode.ExtensionContext) {
  return {
    extendMarkdownIt(markdownItInstance: MarkdownIt): MarkdownIt {
      return markdownItInstance;
    },
  };
}

export function deactivate(): void {}
