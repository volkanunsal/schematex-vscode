import * as vscode from "vscode";
import { schematexPlugin } from "./markdownItPlugin";

export function activate(_context: vscode.ExtensionContext) {
  return {
    extendMarkdownIt(markdownItInstance: any): any {
      schematexPlugin(markdownItInstance);
      return markdownItInstance;
    },
  };
}

export function deactivate(): void {}
