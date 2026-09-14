# 决策记录

> 本目录保存影响代码库的决策：为什么采用当前方案、放弃了什么、产生了什么后果。当前行为以源码和 [docs/architecture.md](../../docs/architecture.md) 为准。

## 存放与命名

路径格式为：

```text
.agents/notes/{lifecycle}/{class}/yyyy-mm-dd-主题.md
```

- `lifecycle`：`proposed`、`implemented`、`rejected`、`archived`。
- `class`：`architecture`、`process`、`feature`、`bug-fix`、`simplification`、`testing`。
- 文件名日期使用决策首次提出日。
- 不建立索引文件；相关笔记使用相对 Markdown 链接互相引用。

## 何时记录

影响其他开发者、影响后续设计或存在真实备选方案的改动必须记录。拼写修正、局部重命名和纯格式改动豁免。

## 生命周期

| 流转                   | 动作                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------- |
| proposed → implemented | 将 `## Proposal` 改为现在时的 `## Decision`，将验收与风险整理为 `## Consequences`。 |
| proposed → rejected    | 将 `Status` 改为 `rejected — 理由`，正文保留原提案。                                |
| implemented → archived | 决策不再指导当前工作时移入 `archived`，记录归档日期后永久冻结。                     |

## 强制规则

1. `implemented` 笔记必须与源码同步更新路径、名称和默认值；推翻决策时新建笔记并链接旧笔记。
2. `archived` 笔记不可编辑，只作为历史资料引用。
3. 每个真实备选方案都要写进 `## Alternatives considered`，并说明没有采用的原因。

## 格式检查

前 3 行固定为：

```markdown
# Agent Note: <标题>

Status: <状态>
```

状态与目录一致。章节要求：

| 生命周期    | 必须章节                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------- |
| proposed    | `## Problem`、`## Proposal`、`## Alternatives considered`、`## Acceptance criteria`、`## Risks` |
| implemented | `## Problem`、`## Decision`、`## Alternatives considered`、`## Consequences`                    |
| rejected    | `## Problem`、`## Proposal`、`## Alternatives considered`                                       |

模板见 [note-template.md](note-template.md)，格式由 [scripts/verify-docs.mjs](../../scripts/verify-docs.mjs) 检查。
