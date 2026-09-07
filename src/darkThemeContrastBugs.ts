const decisionTreeHeaderPattern = /^decisiontree(?::\w+)?(?:\s+".*")?\s*$/i;

export function hasDarkThemeContrastBug(source: string): boolean {
  const headerLine = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return headerLine !== undefined && decisionTreeHeaderPattern.test(headerLine);
}
