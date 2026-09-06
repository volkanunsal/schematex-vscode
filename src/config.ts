export interface SchematexConfig {
  theme?: string;
  fontFamily?: string;
  width?: number;
  height?: number;
  padding?: number;
  scene?: boolean;
  backgroundColor?: string;
}

const numericKeys = new Set(["width", "height", "padding"]);
const booleanKeys = new Set(["scene"]);
const allowedKeys = new Set([
  "theme",
  "fontFamily",
  "width",
  "height",
  "padding",
  "scene",
  "backgroundColor",
]);

function stripSurroundingQuotes(value: string): string {
  const isDoubleQuoted = value.length >= 2 && value.startsWith('"') && value.endsWith('"');
  const isSingleQuoted = value.length >= 2 && value.startsWith("'") && value.endsWith("'");
  if (isDoubleQuoted || isSingleQuoted) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseConfigHeader(raw: string): {
  config: SchematexConfig;
  body: string;
} {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  if (lines[0]?.trim() !== "---") {
    return { config: {}, body: raw };
  }

  const config: Record<string, unknown> = {};
  let closingDelimiterIndex = -1;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    if (lines[lineIndex].trim() === "---") {
      closingDelimiterIndex = lineIndex;
      break;
    }
  }

  if (closingDelimiterIndex === -1) {
    return { config: {}, body: raw };
  }

  for (let lineIndex = 1; lineIndex < closingDelimiterIndex; lineIndex++) {
    const match = lines[lineIndex].match(/^([a-zA-Z]+):\s*(.+)$/);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    if (!allowedKeys.has(key)) {
      continue;
    }
    if (numericKeys.has(key)) {
      const numericValue = Number(rawValue.trim());
      if (!Number.isNaN(numericValue)) {
        config[key] = numericValue;
      }
    } else if (booleanKeys.has(key)) {
      config[key] = rawValue.trim() === "true";
    } else {
      config[key] = stripSurroundingQuotes(rawValue.trim());
    }
  }

  const body = lines.slice(closingDelimiterIndex + 1).join("\n");
  return { config: config as SchematexConfig, body };
}
