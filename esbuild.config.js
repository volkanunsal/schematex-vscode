const esbuild = require("esbuild");
const fs = require("fs");

const watchMode = process.argv.includes("--watch");

// previewScript.js embeds non-ASCII regex literals (schematex's CJK/wide-
// character detection uses raw Unicode characters as regex range
// boundaries, not \u escapes). VS Code's webview resource loader does not
// reliably declare charset=utf-8 for markdown.previewScripts resources, so
// without a BOM those bytes can be decoded as a non-UTF-8 encoding,
// corrupting the character ranges into "Range out of order in character
// class" SyntaxErrors at runtime. A UTF-8 BOM unambiguously forces correct
// decoding regardless of what (if any) charset the loader assumes.
const utf8Bom = "﻿";

function prependUtf8Bom(filePath) {
  const contents = fs.readFileSync(filePath, "utf8");
  if (contents.startsWith(utf8Bom)) {
    return;
  }
  fs.writeFileSync(filePath, utf8Bom + contents, "utf8");
}

async function build() {
  const extensionContext = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    external: ["vscode"],
    outfile: "dist/extension.js",
    sourcemap: true,
  });

  const previewScriptContext = await esbuild.context({
    entryPoints: ["src/previewScript.ts"],
    bundle: true,
    platform: "browser",
    format: "iife",
    target: "es2020",
    outfile: "media/previewScript.js",
    sourcemap: true,
    plugins: [
      {
        name: "prepend-utf8-bom",
        setup(pluginBuild) {
          pluginBuild.onEnd((result) => {
            if (result.errors.length === 0) {
              prependUtf8Bom("media/previewScript.js");
            }
          });
        },
      },
    ],
  });

  if (watchMode) {
    await extensionContext.watch();
    await previewScriptContext.watch();
  } else {
    await extensionContext.rebuild();
    await previewScriptContext.rebuild();
    await extensionContext.dispose();
    await previewScriptContext.dispose();
  }
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
