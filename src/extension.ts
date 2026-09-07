import * as MarkdownItModule from "markdown-it";
import * as vscode from "vscode";
import { schematexPlugin } from "./markdownItPlugin";
import { computeDocumentDiagnostics } from "./diagnostics/documentDiagnostics";

type MarkdownItInstance = ReturnType<typeof MarkdownItModule.default>;

const DEBOUNCE_MS = 300;

function isDiagnosableDocument(document: vscode.TextDocument): boolean {
  return (
    document.languageId === "markdown" &&
    (document.uri.scheme === "file" || document.uri.scheme === "untitled")
  );
}

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("schematex");
  context.subscriptions.push(collection);

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  context.subscriptions.push({
    dispose: () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    },
  });

  function severityFor(severity: "error" | "warning"): vscode.DiagnosticSeverity {
    return severity === "error"
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning;
  }

  function refresh(document: vscode.TextDocument): void {
    if (!isDiagnosableDocument(document)) {
      return;
    }
    const diagnostics = computeDocumentDiagnostics(document.getText()).map(
      (diagnostic) =>
        new vscode.Diagnostic(
          new vscode.Range(diagnostic.line, diagnostic.startColumn, diagnostic.line, diagnostic.endColumn),
          diagnostic.message,
          severityFor(diagnostic.severity),
        ),
    );
    collection.set(document.uri, diagnostics);
  }

  function scheduleRefresh(document: vscode.TextDocument): void {
    if (!isDiagnosableDocument(document)) {
      return;
    }
    const key = document.uri.toString();
    const existingTimer = timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        refresh(document);
      }, DEBOUNCE_MS),
    );
  }

  function clearForUri(uri: vscode.Uri): void {
    const key = uri.toString();
    const existingTimer = timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timers.delete(key);
    }
    collection.delete(uri);
  }

  function isUriStillVisible(uri: vscode.Uri): boolean {
    const key = uri.toString();
    return vscode.window.tabGroups.all.some((group) =>
      group.tabs.some(
        (tab) => tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === key,
      ),
    );
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((event) => scheduleRefresh(event.document)),
    // Belt-and-suspenders: onDidCloseTextDocument fires on TextDocument disposal,
    // which is decoupled from "no editor tab shows this document anymore" and does
    // not reliably fire on a user closing a tab. collection.delete is idempotent, so
    // this is safe to keep, but the tabGroups listener below is what R7 relies on.
    vscode.workspace.onDidCloseTextDocument((document) => {
      if (!isUriStillVisible(document.uri)) {
        clearForUri(document.uri);
      }
    }),
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      for (const tab of event.closed) {
        if (!(tab.input instanceof vscode.TabInputText)) {
          continue;
        }
        const uri = tab.input.uri;
        if (!isUriStillVisible(uri)) {
          clearForUri(uri);
        }
      }
    }),
  );

  for (const document of vscode.workspace.textDocuments) {
    refresh(document);
  }

  return {
    extendMarkdownIt(markdownItInstance: MarkdownItInstance): MarkdownItInstance {
      schematexPlugin(markdownItInstance);
      return markdownItInstance;
    },
  };
}

export function deactivate(): void {}
