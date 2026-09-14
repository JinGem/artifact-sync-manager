// PreToolUse hook: 保护敏感文件（CI 配置 / .env* / release-please），强制人工确认。
// 输入：stdin 传入 hook 输入 JSON（含 tool_name / tool_input）
// 输出：命中敏感文件时返回 permissionDecision: "ask"；否则 exit 0 放行。
// 任何异常静默退出（exit 0），保证不阻塞流程。

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
      } catch (err) {
        reject(err);
      }
    });
    process.stdin.on("error", reject);
  });
}

const SENSITIVE_PATTERNS = [
  // .env、.env.local、.env.production 等
  /(^|\/)\.env([^/]*)?$/,
  // .github/workflows/*.yml / *.yaml
  /(^|\/)\.github\/workflows\/.+\.ya?ml$/,
  // release-please 相关配置
  /release-please/,
];

function isSensitivePath(filePath) {
  const normalized = String(filePath ?? "").replace(/\\/g, "/");
  return SENSITIVE_PATTERNS.some((re) => re.test(normalized));
}

const input = await readStdin().catch(() => null);
if (!input) process.exit(0);

if (input.tool_name !== "Edit" && input.tool_name !== "Write") process.exit(0);

const filePath = input.tool_input?.file_path ?? "";
if (!isSensitivePath(filePath)) process.exit(0);

const output = {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: `敏感文件（${filePath}）的修改需要人工确认。除非用户明确要求，否则请勿自动修改 CI 配置 / .env 文件 / release-please 配置。`,
  },
};

process.stdout.write(JSON.stringify(output));
