# AGENTS.md

SchemaTex Diagrams — a VS Code extension that renders SchemaTex diagrams inline in the Markdown preview.

## Setup

- Package manager: pnpm. Run `pnpm install` after cloning.
- Node 18+ (matches `target: "node18"` in `esbuild.config.js`).

## Common commands

- `pnpm run typecheck` — type-check with `tsc`, no emit.
- `pnpm run build` — bundle with esbuild.
- `pnpm run compile` — typecheck then build (also runs automatically as `vscode:prepublish`).
- `pnpm run watch` — esbuild in watch mode.
- `pnpm run test` — run the test suite (`node --test` over `test/*.test.ts`).

Run `pnpm run compile` and `pnpm run test` before committing — both must pass. `compile` already runs `typecheck` then `build`.

To run a single test file: `pnpm exec node --test --import tsx test/<file>.test.ts` (`--import tsx` is required for `node --test` to run TypeScript at all).

## Layout

- `src/` — extension source (`extension.ts` is the entry point; `markdownItPlugin.ts`, `renderer.ts`, `themeDetector.ts`, `zoomPan.ts`, `config.ts`, `darkThemeContrastBugs.ts`, `previewScript.ts` implement the preview integration).
- `test/` — one test file per `src/` module, same basename, with two exceptions: `extension.ts` and `previewScript.ts` have no test file.
- `syntaxes/` — TextMate grammars for `.stx` files and Markdown-embedded `schematex` code fences.
- `media/` — preview-side styles injected into the Markdown preview webview, plus `previewScript.js`/`previewScript.js.map`, which are generated from `src/previewScript.ts` by `esbuild.config.js` and gitignored — do not edit them directly.
- `examples/` — sample `.stx`/Markdown files for manual verification.

## Conventions

- Commit messages: short, imperative. This repo does not enforce Conventional Commits.
- The extension's user-visible configuration is the per-diagram `---` fence header parsed by `src/config.ts`; the README documents its keys in a Configuration reference table, so a change to those keys needs a matching README update. A change to `package.json`'s `contributes` block that affects user-visible behavior (grammars, languages, preview-script/style registration) also needs a matching README update.
- This is a `vsce`-packaged extension — `dist/` and `media/previewScript.js`/`.map` are gitignored build outputs, nothing built is committed. `pnpm run compile` (which runs automatically as `vscode:prepublish`) must run before `vsce package`.
