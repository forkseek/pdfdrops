import { useState, useEffect, useCallback } from "react";
import { icons } from "./icons";
import { getAcceptTypes, formatFileSize, type Tool } from "./tools";

interface SelectedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

export function ToolModal({ tool, onClose }: { tool: Tool | null; onClose: () => void }) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [watermarkText, setWatermarkText] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [batchOp, setBatchOp] = useState("compress");
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderPages, setReorderPages] = useState<number[]>([]);

  useEffect(() => {
    if (tool) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setFiles([]);
      setError(null);
      setPassword("");
      setPageInput("");
      setWatermarkText("");
      setSignatureText("");
      setRotateAngle(90);
      setStatus("idle");
      setStatusMsg("");
      setPageCount(null);
      setCompareResult(null);
      setReorderMode(false);
      setReorderPages([]);
    }
    return () => { document.body.style.overflow = ""; };
  }, [tool]);

  const acceptConfig = tool ? getAcceptTypes(tool.name) : { accept: "application/pdf", multiple: false, hint: "" };

  const addFile = useCallback((file: File) => {
    setError(null);
    if (acceptConfig.accept === "application/pdf" && file.type !== "application/pdf") {
      setError(`${file.name}: 仅支持 PDF 格式`);
      return;
    }
    if (acceptConfig.accept === "image/*" && !file.type.startsWith("image/")) {
      setError(`${file.name}: 仅支持图片格式`);
      return;
    }
    if (acceptConfig.accept === "image/*,application/pdf" && !file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError(`${file.name}: 仅支持图片或 PDF 格式`);
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError(`${file.name}: 文件超过 100MB 限制`);
      return;
    }
    const entry: SelectedFile = { name: file.name, size: file.size, type: file.type, file };
    if (acceptConfig.multiple) {
      setFiles((prev) => prev.some((f) => f.name === file.name && f.size === file.size) ? prev : [...prev, entry]);
    } else {
      setFiles([entry]);
    }
  }, [acceptConfig]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(addFile);
    e.target.value = "";
  };

  const removeFile = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  // 解析页码输入: "1,3,5-7" → [1,3,5,6,7]
  const parsePages = (input: string): number[] =>
    input.split(",").flatMap((s) => {
      const t = s.trim();
      if (!t) return [];
      if (t.includes("-")) {
        const [a, b] = t.split("-").map(Number);
        return Array.from({ length: b - a + 1 }, (_, i) => a + i);
      }
      return [parseInt(t)];
    }).filter((n) => !isNaN(n) && n > 0);

  // 动态加载处理模块
  const handleProcess = async () => {
    if (files.length === 0) return;
    setStatus("processing");
    setStatusMsg("正在加载处理引擎...");
    setError(null);

    try {
      // 按需加载 PDF 处理库（动态 import，不阻塞首屏）
      const pdf = await import("./utils/pdfProcessor");
      const fileObjs = files.map((f) => f.file);

      setStatusMsg("处理中，请稍候...");

      switch (tool?.name) {
        case "合并 PDF":
          await pdf.mergePDFs(fileObjs);
          break;
        case "拆分 PDF":
          await pdf.splitPDF(fileObjs[0]);
          break;
        case "提取页面": {
          const nums = parsePages(pageInput);
          if (!nums.length) throw new Error("请输入有效的页码，例如 1,3,5-7");
          await pdf.extractPages(fileObjs[0], nums);
          break;
        }
        case "压缩 PDF":
          for (const f of fileObjs) await pdf.compressPDF(f);
          break;
        case "加密 PDF":
          if (!password) throw new Error("请输入密码");
          for (const f of fileObjs) await pdf.encryptPDF(f, password);
          break;
        case "解锁 PDF":
        case "PDF 解锁":
          for (const f of fileObjs) await pdf.unlockPDF(f);
          break;
        case "旋转页面":
          for (const f of fileObjs) await pdf.rotatePDF(f, rotateAngle);
          break;
        case "删除页面": {
          const nums = parsePages(pageInput);
          if (!nums.length) throw new Error("请输入要删除的页码，例如 1,3,5-7");
          await pdf.deletePages(fileObjs[0], nums);
          break;
        }
        case "添加水印":
          if (!watermarkText.trim()) throw new Error("请输入水印文字");
          for (const f of fileObjs) await pdf.addWatermark(f, watermarkText);
          break;
        case "去水印":
          for (const f of fileObjs) await pdf.dewaterImage([f]);
          break;
        case "图片转 PDF":
          await pdf.imageToPDF(fileObjs);
          break;
        case "PDF 转图片":
          await pdf.pdfToImage(fileObjs[0]);
          break;
        case "PDF 转 Word":
          await pdf.pdfToWord(fileObjs[0]);
          break;
        case "签名 PDF":
          if (!signatureText.trim()) throw new Error("请输入签名文字");
          for (const f of fileObjs) await pdf.signPDF(f, signatureText);
          break;
        case "PDF 对比":
          if (fileObjs.length < 2) throw new Error("请上传两份 PDF 文件进行对比");
          setCompareResult(await pdf.comparePDFs(fileObjs[0], fileObjs[1]));
          setStatus("done");
          setStatusMsg("对比完成");
          return;
        case "页面排序":
          if (reorderPages.length > 0) await pdf.reorderPDF(fileObjs[0], reorderPages);
          break;
        case "批量处理":
          for (const f of fileObjs) await pdf.batchProcess([f], batchOp as any, batchOp === "encrypt" ? password : undefined);
          break;
        default:
          throw new Error("该功能正在开发中");
      }

      setStatus("done");
      setStatusMsg("处理完成！文件已开始下载");
      setTimeout(() => { setStatus("idle"); setFiles([]); }, 3000);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "处理失败，请重试");
    }
  };

  if (!tool) return null;

  const isImageTool = acceptConfig.accept.includes("image");
  const isMerge = tool.name === "合并 PDF" || tool.name === "批量处理";
  const needsPassword = tool.name === "加密 PDF";
  const needsPageInput = tool.name === "提取页面" || tool.name === "删除页面";
  const needsWatermark = tool.name === "添加水印";
  const needsSignature = tool.name === "签名 PDF";
  const needsRotate = tool.name === "旋转页面";
  const needsCompare = tool.name === "PDF 对比";
  const needsReorder = tool.name === "页面排序";
  const needsDeWater = tool.name === "去水印";

  const enterReorderMode = async () => {
    if (files.length === 1) {
      const pdf = await import("./utils/pdfProcessor");
      const cnt = await pdf.getPageCount(files[0].file);
      setPageCount(cnt);
      setReorderPages(Array.from({ length: cnt }, (_, i) => i + 1));
    }
    setReorderMode(true);
  };

  const movePage = (idx: number, dir: -1 | 1) => {
    setReorderPages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#32324f] bg-[#0f0f14] p-6 shadow-2xl animate-fade-up sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-[#6b6b8a] transition-colors hover:bg-[#1a1a24] hover:text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16" style={{ background: tool.color + "20", color: tool.color }}>
          {icons[tool.icon]}
        </div>
        <h3 className="font-display text-xl text-white sm:text-2xl">{tool.name}</h3>
        <p className="mt-2 font-sans text-sm text-[#9090aa]">{tool.desc}</p>

        {/* 文件选择器 */}
        <div className="mt-6 space-y-3">
          <label className="relative flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[#32324f] bg-[#1a1a24] p-6 text-center transition-all active:border-[#4a4a6a] active:scale-[0.98]">
            <input type="file" accept={acceptConfig.accept} multiple={acceptConfig.multiple} onChange={onFileChange}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.001, cursor: "pointer", fontSize: "16px" }} />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="1.5" className="mb-3">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="font-sans text-sm text-[#e2e8f0]">{isMerge ? "点击添加多个文件" : "点击选择文件"}</p>
            <p className="mt-1 font-sans text-xs text-[#6b6b8a]">{acceptConfig.hint}</p>
          </label>

          {isImageTool && (
            <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#32324f] bg-[#1a1a24] py-3 text-center transition-all active:border-[#4a4a6a] active:scale-95">
              <input type="file" accept="image/*" multiple={acceptConfig.multiple} capture="environment" onChange={onFileChange}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0.001, cursor: "pointer", fontSize: "16px" }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9090aa]">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
              </svg>
              <span className="font-sans text-sm text-[#e2e8f0]">拍照上传</span>
            </label>
          )}
        </div>

        {/* 参数输入 */}
        {needsPageInput && (
          <div className="mt-4">
            <label className="mb-1 block font-sans text-xs text-[#9090aa]">页码 <span className="text-[#6b6b8a]">(用逗号分隔，如 1,3,5-7)</span></label>
            <input type="text" value={pageInput} onChange={(e) => setPageInput(e.target.value)} placeholder="1,3,5-7"
              className="w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-mono text-sm text-white placeholder-[#4a4a6a] outline-none focus:border-red-500/50" />
          </div>
        )}
        {needsPassword && (
          <div className="mt-4">
            <label className="mb-1 block font-sans text-xs text-[#9090aa]">密码</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入访问密码"
              className="w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white placeholder-[#4a4a6a] outline-none focus:border-red-500/50" />
          </div>
        )}
        {needsWatermark && (
          <div className="mt-4">
            <label className="mb-1 block font-sans text-xs text-[#9090aa]">水印文字</label>
            <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="例如: 机密 / CONFIDENTIAL"
              className="w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white placeholder-[#4a4a6a] outline-none focus:border-red-500/50" />
          </div>
        )}
        {needsSignature && (
          <div className="mt-4">
            <label className="mb-1 block font-sans text-xs text-[#9090aa]">签名文字</label>
            <input type="text" value={signatureText} onChange={(e) => setSignatureText(e.target.value)} placeholder="例如: 张三 2025.06"
              className="w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white placeholder-[#4a4a6a] outline-none focus:border-red-500/50" />
          </div>
        )}
        {needsRotate && (
          <div className="mt-4">
            <label className="mb-2 block font-sans text-xs text-[#9090aa]">旋转角度</label>
            <div className="flex gap-2">
              {([90, 180, 270] as const).map((a) => (
                <button key={a} onClick={() => setRotateAngle(a)}
                  className={`flex-1 rounded-lg py-2 font-sans text-sm transition-all ${rotateAngle === a ? "bg-red-500 text-white" : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a]"}`}>
                  {a}°
                </button>
              ))}
            </div>
          </div>
        )}
        {tool.name === "批量处理" && (
          <div className="mt-4">
            <label className="mb-1 block font-sans text-xs text-[#9090aa]">批量操作</label>
            <select value={batchOp} onChange={(e) => setBatchOp(e.target.value)}
              className="w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white outline-none focus:border-red-500/50">
              <option value="compress">压缩所有文件</option>
              <option value="rotate90">顺时针旋转 90°</option>
              <option value="rotate180">旋转 180°</option>
              <option value="rotate270">逆时针旋转 90°</option>
              <option value="encrypt">加密所有文件</option>
            </select>
          </div>
        )}
        {needsCompare && (
          <div className="mt-4 rounded-lg border border-[#32324f] bg-[#1a1a24] p-3">
            <p className="font-sans text-xs text-[#6b6b8a]">请上传两份 PDF，系统将对比文本内容差异</p>
            {files.length === 1 && <p className="mt-1 font-sans text-xs text-yellow-400">还需要上传第 2 个文件</p>}
          </div>
        )}
        {needsReorder && files.length === 1 && !reorderMode && (
          <button onClick={enterReorderMode} className="mt-4 w-full rounded-lg border border-[#32324f] bg-[#1a1a24] py-2.5 font-sans text-sm text-[#9090aa] transition-all hover:border-[#4a4a6a] hover:text-white">
            进入页面排序模式
          </button>
        )}
        {needsReorder && reorderMode && pageCount !== null && (
          <div className="mt-4">
            <p className="mb-2 font-sans text-xs text-[#9090aa]">点击箭头调整页面顺序</p>
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {reorderPages.map((pageNum, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-[#24243a] bg-[#1a1a24] p-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#24243a] font-mono text-xs text-[#6b6b8a]">{pageNum}</span>
                  <button onClick={() => setReorderPages((p) => p.filter((_, i) => i !== idx))} className="ml-auto text-[#4a4a6a] hover:text-red-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                  <button onClick={() => movePage(idx, -1)} className="text-[#4a4a6a] hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                  </button>
                  <button onClick={() => movePage(idx, 1)} className="text-[#4a4a6a] hover:text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {needsDeWater && (
          <div className="mt-4 rounded-lg border border-[#24243a] bg-[#1a1a24] p-3">
            <p className="font-sans text-xs text-[#6b6b8a]">自动检测并去除图片右下角区域的半透明水印。处理后文件将直接下载。</p>
          </div>
        )}

        {/* 状态提示 */}
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="whitespace-pre-line font-sans text-xs text-red-400">{error}</p>
          </div>
        )}
        {status === "processing" && (
          <div className="mt-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              <p className="font-sans text-xs text-blue-400">{statusMsg}</p>
            </div>
          </div>
        )}
        {status === "done" && (
          <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            <p className="font-sans text-xs text-green-400">{statusMsg}</p>
          </div>
        )}
        {compareResult && (
          <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-[#32324f] bg-[#1a1a24] p-3">
            <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#9090aa]">{compareResult}</p>
          </div>
        )}

        {/* 文件列表 */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="font-sans text-xs font-medium text-[#9090aa]">已选择 {files.length} 个文件</p>
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-3 rounded-lg border border-[#24243a] bg-[#1a1a24] p-3 animate-fade-in">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: tool.color + "15", color: tool.color }}>
                  {file.type === "application/pdf" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-sans text-sm text-white">{file.name}</p>
                  <p className="font-sans text-xs text-[#6b6b8a]">{formatFileSize(file.size)}</p>
                </div>
                <button onClick={() => removeFile(index)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#6b6b8a] transition-colors hover:bg-[#24243a] hover:text-red-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#32324f] bg-[#1a1a24] py-3 font-sans text-sm text-[#e2e8f0] transition-all hover:border-[#4a4a6a] active:scale-95">取消</button>
          <button disabled={files.length === 0 || status === "processing" || (needsCompare && files.length < 2)} onClick={handleProcess}
            className={`flex-1 rounded-xl py-3 font-sans text-sm font-medium transition-all active:scale-95 ${files.length > 0 && status !== "processing" && !(needsCompare && files.length < 2) ? "bg-red-500 text-white hover:bg-red-600" : "cursor-not-allowed bg-[#24243a] text-[#4a4a6a]"}`}>
            {status === "processing" ? "处理中..." : "开始处理"}
          </button>
        </div>
        <p className="mt-3 text-center font-sans text-xs text-[#4a4a6a]">文件仅在浏览器本地处理,不会上传到服务器</p>
      </div>
    </div>
  );
}
