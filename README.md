<p align="center">
  <img src="https://raw.githubusercontent.com/volkanunsal/schematex-vscode/main/media/logo.png" alt="SchemaTex Diagrams logo" width="128" height="128">
</p>

<h1 align="center">SchemaTex Diagrams</h1>

<p align="center">Render SchemaTex diagrams inline in the VS Code Markdown preview.</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0--only-blue">
  <img alt="VS Code Marketplace" src="https://img.shields.io/visual-studio-marketplace/v/VolkanUnsal.schematex-vscode?label=VS%20Code%20Marketplace">
</p>

## How to use

Add a fenced code block with the `schematex` language tag to render a diagram inline in the Markdown preview:

````markdown
```schematex
Genogram
  Alice -- Bob
```
````

Optionally prefix the diagram body with a `---`-delimited config header to control rendering:

````markdown
```schematex
---
theme: dark
fontFamily: Georgia
---
Genogram
  Alice -- Bob
```
````

See [Configuration reference](#configuration-reference) below for the full list of supported keys.

The DSL inside a `schematex` fence gets syntax highlighting while editing (comments, strings, numbers, diagram-type keywords, relationship operators, and attribute/config keys).

Hover over a rendered diagram to reveal a small ⚙ button in the top-right corner; click it to open a menu with "Export PNG" and "Export PDF" options, for saving the diagram as an image or a print-ready PDF.

## Explanation

### What is SchemaTex

[SchemaTex](https://github.com/SchemaTex/SchemaTex) is a text-based DSL for describing diagrams — genograms, flowcharts, and similar node-and-edge structures — as plain text, then rendering them as SVG. This extension wires SchemaTex into VS Code's built-in Markdown preview via a `markdown-it` plugin, so a ` ```schematex ` fenced code block renders as a diagram instead of a plain code block whenever you open the Markdown preview.

### Licensing

SchemaTex is licensed AGPL-3.0. This extension bundles the `schematex` package directly (it is not an optional peer dependency), so the AGPL-3.0's copyleft terms extend to the extension as a whole. As a result, this extension is licensed AGPL-3.0-only rather than a more permissive license.

## Configuration reference

Config keys go in the optional `---`-delimited header at the top of a `schematex` fenced code block, before the diagram body.

| Key          | Type   | Description                                  |
| ------------ | ------ | --------------------------------------------- |
| `theme`      | string | Diagram color theme (e.g. `dark`, `light`).   |
| `fontFamily` | string | Font family used for diagram text.            |
| `width`      | number | Rendered diagram width, in pixels.            |
| `height`     | number | Rendered diagram height, in pixels.           |
| `padding`    | number | Padding around the diagram content, in pixels.|
| `scene`      | boolean | Opt in to derived geometry/source metadata and `data-sx-*` SVG hooks on the rendered diagram. |
| `backgroundColor` | string | Background color behind the diagram (e.g. `#f5f5f5`, `transparent`). Applied as the preview container's background, and used as the fill when exporting to PNG (falls back to white if unset). Not a SchemaTex option — handled entirely by this extension. |

## License

AGPL-3.0-only. Bundles [`schematex`](https://github.com/SchemaTex/SchemaTex) (AGPL-3.0).
