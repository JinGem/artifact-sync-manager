import assert from "node:assert/strict";
import test from "node:test";

import { compileRules, isIgnored } from "./ignore.ts";

test("doc/**/* ignores all descendants and re-includes a root-level file", () => {
  const rules = compileRules("doc/**/*\n!doc/test.txt");

  assert.equal(isIgnored("doc/test.txt", false, rules), false);
  assert.equal(isIgnored("doc/other.txt", false, rules), true);
  assert.equal(isIgnored("doc/a/file.txt", false, rules), true);
  assert.equal(isIgnored("doc/a/b/file.txt", false, rules), true);
});

test("ignoring a parent directory prevents child negation", () => {
  const rules = compileRules("doc/\n!doc/test.txt");

  assert.equal(isIgnored("doc/other.txt", false, rules), true);
  assert.equal(isIgnored("doc/test.txt", false, rules), true);
  assert.equal(isIgnored("doc/a/file.txt", false, rules), true);
});

test("Windows separators are normalized before matching", () => {
  const rules = compileRules("doc/**/*\n!doc/test.txt");

  assert.equal(isIgnored("doc\\test.txt", false, rules), false);
  assert.equal(isIgnored("doc\\nested\\file.txt", false, rules), true);
});

test("basename patterns and later negation follow gitignore semantics", () => {
  const rules = compileRules("*.log\n!keep.log");

  assert.equal(isIgnored("app.log", false, rules), true);
  assert.equal(isIgnored("nested/app.log", false, rules), true);
  assert.equal(isIgnored("keep.log", false, rules), false);
  assert.equal(isIgnored("nested/keep.log", false, rules), false);
});
