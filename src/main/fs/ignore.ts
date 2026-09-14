export type { Ignore } from "ignore";

import ignore, { type Ignore } from "ignore";

export const compileRules = (rulesText: string): Ignore => ignore().add(rulesText);

export const isIgnored = (relativePath: string, isDirectory: boolean, matcher: Ignore): boolean => {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return false;

  const pathname = isDirectory
    ? `${normalized.replace(/\/+$/, "")}/`
    : normalized.replace(/\/+$/, "");

  return matcher.ignores(pathname);
};
