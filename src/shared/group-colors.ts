export const GROUP_COLORS = [
  { value: "#0099ff", label: "哆啦蓝" },
  { value: "#1a7f37", label: "构建绿" },
  { value: "#9a6700", label: "警示黄" },
  { value: "#cf222e", label: "发布红" },
  { value: "#8250df", label: "流程紫" },
  { value: "#0f766e", label: "环境青" },
  { value: "#d97706", label: "部署橙" },
  { value: "#bf3989", label: "测试桃" },
] as const;

export const DEFAULT_GROUP_COLOR = GROUP_COLORS[0].value;

export const isValidGroupColor = (color: unknown): color is string => {
  return typeof color === "string" && GROUP_COLORS.some((item) => item.value === color);
};

export const getDefaultGroupColor = (index: number): string => {
  return GROUP_COLORS[index % GROUP_COLORS.length].value;
};
