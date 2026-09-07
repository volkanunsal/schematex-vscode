# AGENTS.md

SchemaTex Diagrams — a VS Code extension that renders SchemaTex diagrams inline in the Markdown preview.

## Setup

- Package manager: pnpm. Run `pnpm install` after cloning.
- Node/pnpm versions come from `package.json`'s `engines`/`packageManager` fields — check those rather than assuming a version.

## Common commands

- `pnpm run typecheck` — type-check with `tsc`, no emit.
- `pnpm run build` — bundle with esbuild.
- `pnpm run compile` — typecheck then build (also runs automatically as `vscode:prepublish`).
- `pnpm run watch` — esbuild in watch mode.
- `pnpm run test` — run the test suite (`node --test` over `test/*.test.ts`).

Run `typecheck`, `build`, and `test` before committing — all three must pass.

## Layout

- `src/` — extension source (`extension.ts` is the entry point; `markdownItPlugin.ts`, `renderer.ts`, `themeDetector.ts`, `zoomPan.ts`, `config.ts`, `darkThemeContrastBugs.ts` implement the preview integration).
- `test/` — one test file per `src/` module, same basename.
- `syntaxes/` — TextMate grammars for `.stx` files and Markdown-embedded `schematex` code fences.
- `media/` — preview-side script and styles injected into the Markdown preview webview.
- `examples/` — sample `.stx`/Markdown files for manual verification.

## Conventions

- Commit messages: short, imperative. This repo does not enforce Conventional Commits.
- A change to `package.json`'s `contributes` block that affects user-visible behavior needs a matching README update.
- This is a `vsce`-packaged extension — `pnpm run compile` runs as `vscode:prepublish` before packaging.
