export interface IgnoreRule {
  pattern: string;
  negate: boolean;
  regex: RegExp;
  matchDir: boolean;
}

export const compileRules = (rulesText: string): IgnoreRule[] => {
  const rules: IgnoreRule[] = [];

  for (const line of rulesText.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    let pattern = trimmed;
    let negate = false;

    if (pattern.startsWith("!")) {
      negate = true;
      pattern = pattern.slice(1);
    }

    const matchDir = pattern.endsWith("/");

    if (matchDir) {
      pattern = pattern.slice(0, -1);
    }

    const regex = patternToRegex(pattern);

    rules.push({ pattern: trimmed, negate, regex, matchDir });
  }

  return rules;
};

export const isIgnored = (
  relativePath: string,
  isDirectory: boolean,
  rules: IgnoreRule[],
): boolean => {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\//, "");
  // Directory paths from scanFiles end with '/'; strip for regex matching
  const stripped = normalized.replace(/\/$/, "");
  let ignored = false;

  for (const rule of rules) {
    if (rule.matchDir && !isDirectory) {
      continue;
    }

    // Test: original (with trailing /), stripped (without), and last path segment
    if (
      rule.regex.test(normalized) ||
      rule.regex.test(stripped) ||
      rule.regex.test(stripped.split("/").pop() ?? "")
    ) {
      ignored = !rule.negate;
    }
  }

  return ignored;
};

const escapeRegex = (s: string): string => s.replace(/[.+^${}()|[\]\\]/g, "\\$&");

const patternToRegex = (pattern: string): RegExp => {
  let regexStr = "^";
  const parts = pattern.split("/");

  if (pattern.startsWith("/")) {
    parts.shift();
  }

  for (let i = 0; i < parts.length; i++) {
    if (i > 0) regexStr += "/";

    const part = parts[i];

    if (part === "**") {
      regexStr += ".*";
    } else {
      const tokens = part.split(/(\*\*?)/g);
      for (const token of tokens) {
        if (token === "**") {
          regexStr += ".*";
        } else if (token === "*") {
          regexStr += "[^/]*";
        } else {
          regexStr += escapeRegex(token);
        }
      }
    }
  }

  regexStr += "$";

  try {
    return new RegExp(regexStr);
  } catch {
    return /^$/;
  }
};
