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
    category: "去水印",
    items: [
      { name: "去水印", desc: "移除图片和照片中的水印", icon: "dewater", color: "#06b6d4" },
    ],
  },
];

// 根据工具类型决定接受的文件格式
export function getAcceptTypes(toolName: string): { accept: string; multiple: boolean; hint: string } {
  if (toolName.includes("去水印")) {
    return { accept: "image/*", multiple: true, hint: "选择图片(可多选)" };
  }
  return { accept: "application/pdf", multiple: false, hint: "选择 PDF 文件" };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}