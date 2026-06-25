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
    category: "合并与拆分",
    items: [
      { name: "合并 PDF", desc: "多文件合并为一个", icon: "merge", color: "#ef4444" },
      { name: "拆分 PDF", desc: "按页数或范围拆分", icon: "split", color: "#f97316" },
      { name: "提取页面", desc: "提取指定页面生成新文件", icon: "extract", color: "#eab308" },
    ],
  },
  {
    category: "格式转换",
    items: [
      { name: "PDF 转 Word", desc: "提取文本内容", icon: "word", color: "#3b82f6" },
      { name: "PDF 转图片", desc: "导出 PNG / JPG", icon: "image", color: "#22c55e" },
      { name: "图片转 PDF", desc: "多图合成一个文件", icon: "photo", color: "#a855f7" },
    ],
  },
  {
    category: "压缩与加密",
    items: [
      { name: "压缩 PDF", desc: "减小文件体积", icon: "compress", color: "#ec4899" },
      { name: "加密 PDF", desc: "设置访问密码", icon: "lock", color: "#f43f5e" },
      { name: "解锁 PDF", desc: "移除密码保护", icon: "unlock", color: "#14b8a6" },
    ],
  },
  {
    category: "编辑与签名",
    items: [
      { name: "添加水印", desc: "文字或图片水印", icon: "water", color: "#0ea5e9" },
      { name: "去水印", desc: "移除 PDF 和照片中的水印", icon: "dewater", color: "#06b6d4" },
      { name: "旋转页面", desc: "90° / 180° / 270°", icon: "rotate", color: "#8b5cf6" },
      { name: "删除页面", desc: "批量移除指定页面", icon: "trash", color: "#f59e0b" },
    ],
  },
  {
    category: "签名与识别",
    items: [
      { name: "签名 PDF", desc: "手写签名或上传图片", icon: "sign", color: "#10b981" },
      { name: "OCR 识别", desc: "图片型 PDF 转可搜索文本", icon: "ocr", color: "#6366f1" },
      { name: "PDF 对比", desc: "两份文件差异对比", icon: "compare", color: "#84cc16" },
    ],
  },
  {
    category: "更多工具",
    items: [
      { name: "页面排序", desc: "拖拽调整页面顺序", icon: "order", color: "#a78bfa" },
      { name: "批量处理", desc: "多个文件执行同一操作", icon: "batch", color: "#f97316" },
      { name: "PDF 解锁", desc: "移除打印 / 复制限制", icon: "unlock2", color: "#22d3ee" },
    ],
  },
];

export const stats = [
  { value: "2.4M+", label: "处理文件数" },
  { value: "50+", label: "工具功能" },
  { value: "99.9%", label: "服务可用性" },
  { value: "3s", label: "平均处理时间" },
];

// 根据工具类型决定接受的文件格式
export function getAcceptTypes(toolName: string): { accept: string; multiple: boolean; hint: string } {
  if (toolName.includes("图片转 PDF") || toolName.includes("签名")) {
    return { accept: "image/*", multiple: true, hint: "选择图片(可多选)" };
  }
  if (toolName.includes("PDF 转图片") || toolName.includes("OCR")) {
    return { accept: "application/pdf", multiple: false, hint: "选择 PDF 文件" };
  }
  if (toolName.includes("合并") || toolName.includes("批量")) {
    return { accept: "application/pdf", multiple: true, hint: "选择 PDF 文件(可多选)" };
  }
  if (toolName.includes("去水印")) {
    return { accept: "image/*,application/pdf", multiple: true, hint: "选择图片或 PDF(可多选)" };
  }
  return { accept: "application/pdf", multiple: false, hint: "选择 PDF 文件" };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
