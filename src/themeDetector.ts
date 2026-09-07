type ThemeName = "default" | "monochrome" | "dark";

const themeClassMap: Record<string, ThemeName> = {
  "vscode-light": "default",
  "vscode-dark": "dark",
  "vscode-high-contrast": "monochrome",
  "vscode-high-contrast-light": "monochrome",
};

export function detectVsCodeTheme(document: Document): ThemeName {
  const bodyClassList = document.body.classList;
  for (const [vscodeClass, themeName] of Object.entries(themeClassMap)) {
    if (bodyClassList.contains(vscodeClass)) {
      return themeName;
    }
  }
  return "default";
}
