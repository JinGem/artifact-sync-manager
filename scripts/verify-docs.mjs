#!/usr/bin/env node
/**
 * verify-docs.mjs — 零依赖文档校验脚本(链接 / 字数预算 / 决策记录格式)
 *
 * 用法:
 *   node scripts/verify-docs.mjs            # 全部检查
 *   node scripts/verify-docs.mjs --links    # 只查相对链接与锚点
 *   node scripts/verify-docs.mjs --budgets  # 只查字数预算
 *   node scripts/verify-docs.mjs --notes    # 只查决策记录格式
 *   node scripts/verify-docs.mjs --root <dir>   # 指定仓库根(默认脚本所在目录的上级)
 *
 * 退出码:0 通过;1 存在违规。无第三方依赖,Node 18+ 可直接运行。
 */
import fs from "node:fs";
import path from "node:path";

// ---------- 配置(可按项目调整) ----------
const BUDGETS_FILE = "scripts/doc-budgets.json"; // 预算清单,相对仓库根
const NOTES_DIR = ".agents/notes";
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".history",
  ".codebuddy",
  ".codex",
  "dist",
  "out",
  ".generated",
  ".cache",
  "coverage",
  "vendor",
  "outputs",
]);
const NOTES_SKIP = new Set(["README.md", "AGENTS.md", "note-template.md"]);

// 决策记录章节要求
const NOTE_REQUIREMENTS = {
  proposed: {
    require: [
      "## Problem",
      "## Proposal",
      "## Alternatives considered",
      "## Acceptance criteria",
      "## Risks",
    ],
    forbid: [],
  },
  implemented: {
    require: ["## Problem", "## Decision", "## Alternatives considered", "## Consequences"],
    forbid: ["## Proposal", "## Plan", "## Migration plan", "## Acceptance criteria"],
  },
  rejected: { require: ["## Problem", "## Proposal", "## Alternatives considered"], forbid: [] },
};
// ---------- 配置结束 ----------

const args = process.argv.slice(2);
const root = path.resolve(
  option("--root") ?? path.join(path.dirname(process.argv[1] ?? "."), ".."),
);
// 修正:默认全跑;显式指定任一单项时只跑该项
const explicit = ["--links", "--budgets", "--notes"].filter((a) => args.includes(a));
const runLinks = explicit.length === 0 || explicit.includes("--links");
const runBudgets = explicit.length === 0 || explicit.includes("--budgets");
const runNotes = explicit.length === 0 || explicit.includes("--notes");

let failures = [];
function fail(file, msg) {
  failures.push(`${file}: ${msg}`);
}

// ---------- 遍历 ----------
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

// ---------- 链接与锚点 ----------
function slugify(text) {
  let s = String(text).toLowerCase().trim().replace(/`/g, "");
  s = s.replace(/[^\p{L}\p{N}\s-]/gu, "");
  s = s.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s;
}

function headingsOf(file) {
  const src = fs.readFileSync(file, "utf8");
  const slugs = new Set();
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = m[2];
    const anchor = text.match(/\{#([^}]+)\}$/);
    if (anchor) slugs.add(anchor[1]);
    else {
      slugs.add(slugify(text));
      slugs.add(text);
    }
  }
  return slugs;
}

function checkLinks() {
  const files = walk(root);
  let checked = 0,
    broken = 0;
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    const re = /\[[^\]]*\]\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      let target = m[1].trim();
      if (!target || /^(https?:|mailto:|tel:)/i.test(target)) continue;
      const hashIdx = target.indexOf("#");
      const frag = hashIdx >= 0 ? target.slice(hashIdx + 1) : "";
      const rel = hashIdx >= 0 ? target.slice(0, hashIdx) : target;
      const base = rel ? path.resolve(path.dirname(file), rel) : file;
      if (!fs.existsSync(base)) {
        fail(path.relative(root, file), `链接目标不存在: ${target}`);
        broken++;
        continue;
      }
      if (frag) {
        const isMd = fs.statSync(base).isFile() && base.toLowerCase().endsWith(".md");
        if (isMd && !headingsOf(base).has(decodeURIComponent(frag))) {
          fail(path.relative(root, file), `锚点不存在: ${target}`);
          broken++;
        }
      }
      checked++;
    }
  }
  return { files: files.length, checked, broken };
}

// ---------- 字数预算 ----------
function wordCount(text) {
  const cjkPattern = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
  const cjkCount = text.match(cjkPattern)?.length ?? 0;
  const remainder = text.replace(cjkPattern, " ");
  return cjkCount + remainder.split(/\s+/).filter((word) => word.length > 0).length;
}

function checkBudgets() {
  const budgetPath = path.join(root, BUDGETS_FILE);
  if (!fs.existsSync(budgetPath)) {
    failures.push(`${BUDGETS_FILE}: 预算清单不存在(先创建,或删除 --budgets 检查)`);
    return { files: 0, over: 0, missing: 0 };
  }
  const budgets = JSON.parse(fs.readFileSync(budgetPath, "utf8"));
  let over = 0,
    missing = 0;
  for (const [rel, ceiling] of Object.entries(budgets)) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) {
      fail(rel, `预算文件缺失(改名会静默抛弃预算,应更新清单或恢复文件)`);
      missing++;
      continue;
    }
    const count = wordCount(fs.readFileSync(file, "utf8"));
    if (count > ceiling) {
      fail(rel, `字数 ${count} > 上限 ${ceiling}(先迁移/精简,确需提高请在 PR 说明理由)`);
      over++;
    }
  }
  return { files: Object.keys(budgets).length, over, missing };
}

// ---------- 决策记录格式 ----------
function checkNotes() {
  const notesRoot = path.join(root, NOTES_DIR);
  if (!fs.existsSync(notesRoot)) return { files: 0, bad: 0 };
  const files = [];
  walk(notesRoot).forEach((f) => {
    const rel = path.relative(notesRoot, f);
    if (rel.split(path.sep).includes("archived")) return;
    const base = path.basename(f);
    if (NOTES_SKIP.has(base) || base.endsWith(".zh.md")) return;
    files.push(f);
  });
  let bad = 0;
  for (const file of files) {
    const rel = path.relative(root, file);
    const base = path.basename(file);
    if (!/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(base)) {
      fail(rel, `文件名必须以 yyyy-mm-dd-主题.md 命名`);
      bad++;
      continue;
    }
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    if (lines[0] !== undefined && !lines[0].startsWith("# Agent Note: ")) {
      fail(rel, `第 1 行必须是 "# Agent Note: <标题>"`);
      bad++;
    }
    if ((lines[1] ?? "") !== "") {
      fail(rel, `第 2 行必须为空行`);
      bad++;
    }
    if (!(lines[2] ?? "").startsWith("Status: ")) {
      fail(rel, `第 3 行必须是 "Status: <状态>"`);
      bad++;
    }
    const relPosix = rel.split(path.sep).join("/");
    const lifecycle = ["proposed", "implemented", "rejected"].find((l) =>
      relPosix.includes(`/${l}/`),
    );
    if (!lifecycle) {
      fail(rel, `路径必须包含 proposed|implemented|rejected 之一`);
      bad++;
      continue;
    }
    const statusLine = lines[2] ?? "";
    if (lifecycle === "rejected") {
      if (!/^Status: rejected( — .+)?$/.test(statusLine)) {
        fail(rel, `rejected 状态行必须是 "Status: rejected — <理由>"`);
        bad++;
      }
    } else if (statusLine !== `Status: ${lifecycle}`) {
      fail(rel, `状态行 "${statusLine}" 与目录 ${lifecycle} 不一致`);
      bad++;
    }
    const headings = new Set(lines.filter((l) => /^## /.test(l)).map((l) => l.trim()));
    const req = NOTE_REQUIREMENTS[lifecycle];
    for (const h of req.require)
      if (!headings.has(h)) {
        fail(rel, `缺少章节 ${h}`);
        bad++;
      }
    for (const h of req.forbid)
      if (headings.has(h)) {
        fail(rel, `implemented 笔记禁止章节 ${h}(spec-speak)`);
        bad++;
      }
  }
  return { files: files.length, bad };
}

function option(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

// ---------- 主流程 ----------
console.log(`仓库根: ${root}\n`);
if (runLinks) {
  const r = checkLinks();
  console.log(`[链接] 扫描 ${r.files} 个 md 文件,检查 ${r.checked} 个链接,断链 ${r.broken}`);
}
if (runBudgets) {
  const r = checkBudgets();
  console.log(`[预算] 清单 ${r.files} 个文件,超标 ${r.over},缺失 ${r.missing}`);
}
if (runNotes) {
  const r = checkNotes();
  console.log(`[笔记] 扫描 ${r.files} 个决策记录,违规 ${r.bad}`);
}

if (failures.length > 0) {
  console.error("\n违规清单:");
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`\n共 ${failures.length} 处违规。修复后重跑。`);
  process.exit(1);
} else {
  console.log("\n✓ verify:docs 全部通过");
}
