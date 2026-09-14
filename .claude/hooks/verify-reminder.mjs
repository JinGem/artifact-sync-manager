// PostToolUse hook: 修改代码或文档后给出收尾自检提醒。
// 输入：stdin 传入 hook 输入 JSON（含 tool_name / tool_input / cwd）
// 输出：命中项目源文件或 Markdown 时通过 additionalContext 返回提醒。

import path from "node:path";

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    process.stdin.on("error", reject);
  });
}

const input = await readStdin().catch(() => null);
if (!input) process.exit(0);

if (!["Edit", "Write", "NotebookEdit"].includes(input.tool_name)) process.exit(0);

const filePath = input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "";
if (!filePath) process.exit(0);

const projectRoot = path.resolve(input.cwd ?? process.cwd());
const relative = path.relative(projectRoot, path.resolve(projectRoot, String(filePath)));
const normalized = relative.split(path.sep).join("/");

if (normalized.startsWith("../") || path.isAbsolute(relative)) process.exit(0);

let reminder = "";
if (normalized.startsWith("src/")) {
  reminder = `已修改 ${normalized}。收尾时检查 doc-sync 并运行 \`npm run verify:docs\`；代码验证运行 \`npm run typecheck\` 与 \`npm run build\`。`;
} else if (normalized.endsWith(".md")) {
  reminder = `已修改 ${normalized}。收尾时运行 \`npm run verify:docs\`，并检查是否需要新的决策记录。`;
} else {
  process.exit(0);
}

const output = {
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: reminder,
  },
};

process.stdout.write(JSON.stringify(output));
