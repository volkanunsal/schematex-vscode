# SchemaTex VS Code Preview Extension — Design

Date: 2026-09-06

## Purpose

A VS Code extension that renders [SchemaTex](https://github.com/SchemaTex/SchemaTex) diagrams found in fenced ` ```schematex ` code blocks inside markdown files, inline in VS Code's built-in Markdown preview — the same experience the popular Mermaid preview extensions provide for Mermaid diagrams.

## Success criteria

- A ` ```schematex ` fenced block in a markdown file renders as a diagram in the Markdown preview pane, not as a raw code block.
- Editing the fenced block's contents updates the rendered diagram when the preview auto-refreshes (VS Code's built-in behavior — no custom watcher needed).
- Per-diagram appearance (colors, fonts, layout) is configurable via an optional config header inside the fence.
- A rendered diagram can be exported to PNG or PDF from the preview.
- Invalid SchemaTex syntax in one block shows an inline error card; it does not break rendering of the rest of the preview.

## Non-goals (out of scope for v1)

- In-preview interactive editing (SchemaTex's `<SchematexDiagram />` editing mode) with write-back to source.
- A custom/standalone preview panel independent of VS Code's built-in Markdown preview.
- Global `settings.json`-level defaults — v1 is per-diagram config only.

## License

SchemaTex is licensed **AGPL-3.0**. This extension bundles SchemaTex directly and will be published under **AGPL-3.0** as well, per the interconnection requirement of that license. (SchemaTex offers a separate commercial license for proprietary use, contact `victor@mymap.ai` — not needed here since this stays open source.)

## Architecture

The extension contributes:

1. A **markdown-it plugin**, registered via the `extendMarkdownIt` VS Code API, that recognizes fenced code blocks with the `schematex` info string.
2. A **preview runtime script**, contributed via `contributes.markdown.previewScripts`, loaded into the Markdown preview webview. It performs the actual SchemaTex rendering client-side, in the browser context VS Code's preview runs in.

Live updates come for free: VS Code's built-in Markdown preview already re-runs the markdown-it pipeline and refreshes the webview on document edit (with its own internal debounce). The preview script re-scans for unrendered diagram containers on every refresh via a `MutationObserver`, so no custom file-watching or debounce logic is needed in this extension.

## Components

### 1. Extension host module (`src/extension.ts`)
- `activate()`: registers the markdown-it plugin contribution and the export commands.
- Commands: `schematex.exportPng`, `schematex.exportPdf` — available from the preview pane's context menu and the command palette.

### 2. markdown-it plugin (`src/markdownItPlugin.ts`)
- Matches fenced code blocks with info string `schematex`.
- Splits the fence body into an optional leading config block (simple `key: value` lines, e.g. `theme: dark`, `layout: horizontal`) and the SchemaTex DSL body that follows.
- Emits `<div class="schematex-diagram" data-source="<base64 DSL>" data-config="<JSON config>"></div>` in place of the default `<pre><code>` block.

### 3. Preview runtime script (`media/previewScript.js`, bundled)
- Bundles the SchemaTex browser build (or the relevant per-diagram tree-shaken imports).
- On `DOMContentLoaded` and on `MutationObserver` callback, finds `.schematex-diagram` elements not yet marked rendered, decodes `data-source`/`data-config`, calls SchemaTex's `renderToContainer(el, source, options)`.
- Wraps the render call in try/catch; on failure, renders an inline error card (`<div class="schematex-error">`) showing the parse/render error message instead of throwing, so one bad diagram doesn't break the rest of the preview.
- Marks each container as rendered (e.g. `data-rendered="true"`) to avoid re-rendering unchanged diagrams unnecessarily on each mutation pass.

### 4. Export handling
- Export commands `postMessage` into the active preview webview requesting an export of a given diagram (identified by index or id).
- The preview script uses SchemaTex's built-in Canvas-based PNG (@2×) export and PDF printing, sends the resulting binary/data-URL back via `postMessage`.
- The extension host receives it, prompts via `vscode.window.showSaveDialog`, and writes the file via `workspace.fs.writeFile`.

**Implementation deviation:** the shipped implementation does not use `schematex.exportPng`/`schematex.exportPdf` commands or `postMessage` at all. Instead, `src/renderer.ts` injects a small hover-revealed ⚙ toggle button into the top-right corner of each rendered diagram; clicking it opens a dropdown menu with "Export PNG"/"Export PDF" items, and the click handlers call `schematex/export`'s `svgToPngBlob`/`downloadBlob`/`printSvgAsPdf` directly inside the webview. This avoids a host↔webview round-trip (no command registration, no message-passing protocol to keep in sync, no need to identify which diagram an export command applies to) and keeps export entirely within the already-tested `createRenderer` module. This was the better design and was adopted during implementation but never recorded as a deviation from this spec until the final-review fix pass. The hover-cog-menu presentation (as opposed to always-visible buttons) was a later refinement, also user-requested.

## Data flow

```
markdown source (.md)
  → VS Code Markdown preview pipeline
    → schematex markdown-it plugin (parse fence, emit placeholder div)
      → preview webview HTML
        → previewScript.js (renders SchemaTex diagram into placeholder)
```

Edit-driven refresh:
```
user edits fence contents
  → VS Code detects document change
    → built-in Markdown preview auto-refresh (debounced internally)
      → new webview HTML with updated data-source
        → previewScript.js MutationObserver re-renders changed diagram
```

## Error handling

- Malformed config header lines: ignored with a warning logged to the webview console, not a hard failure — the diagram still attempts to render with default options.
- Malformed SchemaTex DSL: caught at `renderToContainer()` call site, shown as an inline error card scoped to that diagram only.
- Export failure (e.g. user cancels save dialog): no-op, no error dialog needed for a user-initiated cancel; genuine failures show `vscode.window.showErrorMessage`.

**Clarification (added during the final-review fix pass):** invalid SchemaTex DSL is actually handled by schematex's own `mode: "preview"` diagnostic fallback — in preview mode, schematex returns a diagnostic SVG instead of throwing, so it never reaches `renderOne`'s catch block. This extension's `.schematex-error` catch/error-card path only fires for decode-time failures — malformed base64 or malformed JSON in the placeholder `<div>`'s `data-source`/`data-config` attributes.

## Testing

- **Unit tests** (Node test runner, no VS Code host needed): fence detection and config-block parsing in `markdownItPlugin.ts`, run against markdown fixture files covering valid blocks, blocks with config headers, blocks with malformed config, and non-schematex fences (must pass through untouched).
- **Manual/integration testing**: actual diagram rendering happens inside the webview's browser DOM context, which is not practical to unit-test from the extension host. This will be verified manually by opening the extension in the VS Code Extension Development Host and visually checking rendering, live update, per-diagram config, and export for a representative sample of SchemaTex diagram types — this is a real coverage gap, not something the plan should pretend to close with host-side tests.

## Open questions carried into implementation

None blocking — the plan should confirm the exact `schematex` npm package name/version and browser-build entry point when implementation starts, since that wasn't verified against the published package registry during this design pass (only the GitHub repo was checked).
