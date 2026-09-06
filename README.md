# SchemaTex Diagrams for VS Code

Renders [SchemaTex](https://github.com/SchemaTex/SchemaTex) diagrams inline in the Markdown preview.

## Usage

Add a fenced code block with the `schematex` language tag:

```schematex
Genogram
  Alice -- Bob
```

Optionally prefix the DSL body with a `---`-delimited config header:

```schematex
---
theme: dark
fontFamily: Georgia
---
Genogram
  Alice -- Bob
```

Supported config keys: `theme`, `fontFamily`, `width`, `height`, `padding`, `scene`.

## License

AGPL-3.0-only. Bundles [`schematex`](https://github.com/SchemaTex/SchemaTex) (AGPL-3.0).
