export interface Tool {
  name: string;
  desc: string;
  icon: string;
  color: string;
}

export interface ToolCategory {
  category: string;
  items: Tool[];
}

export const tools: ToolCategory[] = [
  {
    category: "常用工具",
    items: [
      { name: "合并 PDF", desc: "将多个 PDF 文件合并为一个", icon: "merge", color: "#ef4444" },
      { name: "拆分 PDF", desc: "将 PDF 按页拆分为多个文件", icon: "split", color: "#f97316" },
      { name: "提取页面", desc: "从 PDF 中提取指定页面", icon: "extract", color: "#eab308" },
      { name: "删除页面", desc: "删除 PDF 中的指定页面", icon: "trash", color: "#dc2626" },
      { name: "页面排序", desc: "调整 PDF 页面顺序", icon: "order", color: "#a855f7" },
    ],
  },
  {
    category: "编辑工具",
    items: [
      { name: "旋转页面", desc: "旋转 PDF 页面方向", icon: "rotate", color: "#06b6d4" },
      { name: "添加水印", desc: "为 PDF 添加文字水印", icon: "water", color: "#8b5cf6" },
      { name: "去水印", desc: "移除图片和照片中的水印", icon: "dewater", color: "#06b6d4" },
      { name: "签名 PDF", desc: "为 PDF 添加文字签名", icon: "sign", color: "#10b981" },
    ],
  },
  {
    category: "转换工具",
    items: [
      { name: "图片转 PDF", desc: "将图片转换为 PDF 文件", icon: "photo", color: "#ec4899" },
      { name: "PDF 转图片", desc: "将 PDF 页面导出为图片", icon: "image", color: "#14b8a6" },
    ],
  },
  {
    category: "安全工具",
    items: [
      { name: "加密 PDF", desc: "为 PDF 设置访问密码", icon: "lock", color: "#6366f1" },
      { name: "解锁 PDF", desc: "移除 PDF 的密码保护", icon: "unlock2", color: "#22c55e" },
    ],
  },
  {
    category: "高级工具",
    items: [
      { name: "PDF 对比", desc: "对比两份 PDF 的文本差异", icon: "compare", color: "#f59e0b" },
      { name: "批量处理", desc: "批量压缩、加密或旋转", icon: "batch", color: "#3b82f6" },
    ],
  },
];

export function getAcceptTypes(toolName: string): { accept: string; multiple: boolean; hint: string } {
  if (toolName === "合并 PDF" || toolName === "批量处理") {
    return { accept: "application/pdf", multiple: true, hint: "选择 PDF 文件(可多选)" };
  }
  if (toolName === "图片转 PDF") {
    return { accept: "image/*", multiple: true, hint: "选择图片(可多选，支持 JPG/PNG)" };
  }
  if (toolName === "去水印") {
    return { accept: "image/*", multiple: true, hint: "选择图片(可多选)" };
  }
  if (toolName === "PDF 对比") {
    return { accept: "application/pdf", multiple: true, hint: "选择 2 份 PDF 文件进行对比" };
  }
  return { accept: "application/pdf", multiple: false, hint: "选择 PDF 文件" };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}