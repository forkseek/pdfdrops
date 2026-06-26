import { useState, useEffect, useCallback, useRef } from "react";
import { icons } from "./icons";
import { getAcceptTypes, formatFileSize, type Tool } from "./tools";
import { DewaterCanvas } from "./DewaterCanvas";

interface SelectedFile {
  name: string;
  size: number;
  type: string;
  file: File;
  previewUrl?: string;
}

interface ProcessedResult {
  blob: Blob;
  name: string;
  previewUrl?: string;
}

export function ToolModal({ tool, onClose, inline }: { tool: Tool | null; onClose: () => void; inline?: boolean }) {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [dewaterMode, setDewaterMode] = useState<"auto" | "manual">("auto");
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([]);
  const [previewDewater, setPreviewDewater] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);

  // 各工具参数
  const [password, setPassword] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [watermarkText, setWatermarkText] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [rotateAngle, setRotateAngle] = useState<90 | 180 | 270>(90);
  const [batchOp, setBatchOp] = useState<"compress" | "encrypt" | "rotate90" | "rotate180" | "rotate270">("compress");
  const [batchPassword, setBatchPassword] = useState("");
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderPages, setReorderPages] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tool && !inline) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      if (!inline) document.body.style.overflow = "";
    };
  }, [tool, inline]);

  useEffect(() => {
    if (!tool) {
      setFiles([]);
      setError(null);
      setStatus("idle");
      setStatusMsg("");
      setDewaterMode("auto");
      setProcessedResults([]);
      setPreviewDewater(null);
      setOriginalPreview(null);
      setPassword("");
      setPageInput("");
      setWatermarkText("");
      setSignatureText("");
      setRotateAngle(90);
      setBatchOp("compress");
      setBatchPassword("");
      setCompareResult(null);
      setReorderMode(false);
      setReorderPages([]);
    }
  }, [tool]);

  const acceptConfig = tool ? getAcceptTypes(tool.name) : { accept: "application/pdf", multiple: false, hint: "选择文件" };

  const addFile = useCallback((file: File) => {
    setError(null);
    if (tool && tool.name === "去水印") {
      if (!file.type.startsWith("image/")) {
        setError(`${file.name}: 仅支持图片格式`);
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        setError(`${file.name}: 文件超过 100MB 限制`);
        return;
      }
    }
    const entry: SelectedFile = {
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    };
    setProcessedResults([]);
    setPreviewDewater(null);
    setOriginalPreview(null);
    setCompareResult(null);
    setStatus("idle");
    if (acceptConfig.multiple) {
      setFiles((prev) => prev.some((f) => f.name === file.name && f.size === file.size) ? prev : [...prev, entry]);
    } else {
      setFiles([entry]);
    }
  }, [acceptConfig, tool]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) Array.from(e.target.files).forEach(addFile);
    e.target.value = "";
  };

  const removeFile = (i: number) => {
    const f = files[i];
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviewDewater(null);
    setOriginalPreview(null);
    setProcessedResults([]);
    setCompareResult(null);
    setStatus("idle");
  };

  // 解析页码范围："1,3,5-7" → [1,3,5,6,7]
  const parsePages = (raw: string): number[] => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const nums: number[] = [];
    for (const p of parts) {
      if (p.includes("-")) {
        const [start, end] = p.split("-").map(Number);
        if (isNaN(start) || isNaN(end) || start < 1 || end < start) throw new Error("页码范围格式错误");
        for (let i = start; i <= end; i++) nums.push(i);
      } else {
        const n = Number(p);
        if (isNaN(n) || n < 1) throw new Error("页码格式错误");
        nums.push(n);
      }
    }
    return [...new Set(nums)].sort((a, b) => a - b);
  };

  const generateBlobPreview = async (blob: Blob) => {
    return URL.createObjectURL(blob);
  };

  // 进入页面排序模式
  const enterReorderMode = async () => {
    if (files.length === 0) return;
    try {
      const pdf = await import("./utils/pdfProcessor");
      const count = await pdf.getPageCount(files[0].file);
      setReorderPages(Array.from({ length: count }, (_, i) => i + 1));
      setReorderMode(true);
    } catch (err: any) {
      setError(err.message || "无法读取页面信息");
    }
  };

  const movePage = (fromIndex: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (newIndex < 0 || newIndex >= reorderPages.length) return;
    const newPages = [...reorderPages];
    [newPages[fromIndex], newPages[newIndex]] = [newPages[newIndex], newPages[fromIndex]];
    setReorderPages(newPages);
  };

  // ── 处理入口 ──
  const handleProcess = async () => {
    if (files.length === 0) return;
    if (!tool) return;
    setStatus("processing");
    setStatusMsg("处理中...");
    setError(null);
    setProcessedResults([]);
    setCompareResult(null);

    try {
      const pdf = await import("./utils/pdfProcessor");
      pdf.clearResults();
      const fileObjs = files.map((f) => f.file);

      switch (tool.name) {
        case "合并 PDF":
          await pdf.mergePDFs(fileObjs);
          break;
        case "拆分 PDF":
          await pdf.splitPDF(fileObjs[0]);
          break;
        case "提取页面": {
          const pages = parsePages(pageInput);
          await pdf.extractPages(fileObjs[0], pages);
          break;
        }
        case "加密 PDF":
          if (!password) throw new Error("请输入密码");
          await pdf.encryptPDF(fileObjs[0], password);
          break;
        case "解锁 PDF":
          await pdf.unlockPDF(fileObjs[0]);
          break;
        case "旋转页面":
          await pdf.rotatePDF(fileObjs[0], rotateAngle);
          break;
        case "删除页面": {
          const pages = parsePages(pageInput);
          await pdf.deletePages(fileObjs[0], pages);
          break;
        }
        case "添加水印":
          if (!watermarkText) throw new Error("请输入水印文字");
          await pdf.addWatermark(fileObjs[0], watermarkText);
          break;
        case "图片转 PDF":
          await pdf.imageToPDF(fileObjs);
          break;
        case "PDF 转图片":
          await pdf.pdfToImage(fileObjs[0]);
          break;
        case "签名 PDF":
          if (!signatureText) throw new Error("请输入签名文字");
          await pdf.signPDF(fileObjs[0], signatureText);
          break;
        case "PDF 对比": {
          if (fileObjs.length < 2) throw new Error("请选择 2 份 PDF 文件");
          const diff = await pdf.comparePDFs(fileObjs[0], fileObjs[1]);
          setCompareResult(diff);
          setStatus("done");
          setStatusMsg("对比完成");
          return;
        }
        case "页面排序": {
          if (reorderPages.length === 0) throw new Error("请先调整页面顺序");
          await pdf.reorderPDF(fileObjs[0], reorderPages);
          setReorderMode(false);
          break;
        }
        case "批量处理":
          await pdf.batchProcess(fileObjs, batchOp, batchOp === "encrypt" ? batchPassword : undefined);
          break;
        default:
          throw new Error("未知工具: " + tool.name);
      }

      setStatus("done");
      setStatusMsg("处理完成！");
      const rawResults = pdf.getResults();
      const resultsWithPreview: ProcessedResult[] = await Promise.all(
        rawResults.map(async (r) => {
          const previewUrl = r.blob.type.startsWith("image/") ? URL.createObjectURL(r.blob) : await generateBlobPreview(r.blob);
          return { blob: r.blob, name: r.name, previewUrl };
        })
      );
      setProcessedResults(resultsWithPreview);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "处理失败，请重试");
    }
  };

  // ── 去水印相关 ──
  const isDewater = tool?.name === "去水印";

  const handleAutoDewater = async () => {
    if (files.length === 0) return;
    setStatus("processing");
    setStatusMsg("正在智能检测水印...");
    setError(null);
    setProcessedResults([]);
    setPreviewDewater(null);
    setOriginalPreview(null);

    try {
      const pdf = await import("./utils/pdfProcessor");
      pdf.clearResults();

      for (let i = 0; i < files.length; i++) {
        setStatusMsg(`正在处理 ${i + 1}/${files.length}...`);
        await pdf.dewaterImageAuto([files[i].file]);
      }

      setStatus("done");
      setStatusMsg("处理完成！");
      const rawResults = pdf.getResults();
      const resultsWithPreview: ProcessedResult[] = rawResults.map((r) => {
        const previewUrl = r.blob.type.startsWith("image/") ? URL.createObjectURL(r.blob) : undefined;
        return { blob: r.blob, name: r.name, previewUrl };
      });
      setProcessedResults(resultsWithPreview);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "处理失败，请重试");
    }
  };

  const handleManualDewater = async (maskData: ImageData) => {
    if (files.length === 0) return;
    setStatus("processing");
    setStatusMsg("正在去除选中区域水印...");
    setError(null);
    setProcessedResults([]);
    try {
      const pdf = await import("./utils/pdfProcessor");
      pdf.clearResults();
      await pdf.dewaterImageManual(files[0].file, maskData);
      setStatus("done");
      setStatusMsg("处理完成！");
      const rawResults = pdf.getResults();
      const resultsWithPreview: ProcessedResult[] = rawResults.map((r) => {
        const previewUrl = r.blob.type.startsWith("image/") ? URL.createObjectURL(r.blob) : undefined;
        return { blob: r.blob, name: r.name, previewUrl };
      });
      setProcessedResults(resultsWithPreview);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "处理失败，请重试");
    }
  };

  const handlePreviewDetection = async () => {
    if (files.length === 0) return;
    setStatus("processing");
    setStatusMsg("正在分析水印区域...");
    setError(null);
    try {
      const pdf = await import("./utils/pdfProcessor");
      const result = await pdf.previewDewaterDetection(files[0].file);
      setPreviewDewater(result.preview);
      setOriginalPreview(files[0].previewUrl || null);
      setStatus("idle");
      setStatusMsg("");
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "分析失败");
    }
  };

  if (!tool) return null;

  const isManualMode = dewaterMode === "manual";
  const showBrushCanvas = isDewater && isManualMode && files.length > 0 && status !== "processing" && processedResults.length === 0;
  const hasFiles = files.length > 0;
  const showAutoPreview = isDewater && dewaterMode === "auto" && hasFiles && !showBrushCanvas && processedResults.length === 0 && !previewDewater;

  // 需要参数的工具
  const needsPassword = tool.name === "加密 PDF" || (tool.name === "批量处理" && batchOp === "encrypt");
  const needsPageInput = tool.name === "提取页面" || tool.name === "删除页面";
  const needsWatermark = tool.name === "添加水印";
  const needsSignature = tool.name === "签名 PDF";
  const needsRotate = tool.name === "旋转页面";
  const needsBatchOp = tool.name === "批量处理";
  const needsCompare = tool.name === "PDF 对比";
  const needsReorder = tool.name === "页面排序";

  const content = (
    <>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16" style={{ background: tool.color + "20", color: tool.color }}>
        {icons[tool.icon]}
      </div>
      <h3 className="font-display text-xl text-white sm:text-2xl">{tool.name}</h3>
      <p className="mt-2 font-sans text-sm text-[#9090aa]">{tool.desc}</p>

      {/* 去水印模式切换 */}
      {isDewater && (
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => { setDewaterMode("auto"); setPreviewDewater(null); setOriginalPreview(null); setProcessedResults([]); }}
            className={`flex-1 rounded-lg py-2.5 font-sans text-sm transition-all duration-300 ${
              dewaterMode === "auto" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a]"
            }`}
          >
            智能去水印
          </button>
          <button
            onClick={() => { setDewaterMode("manual"); setPreviewDewater(null); setOriginalPreview(null); setProcessedResults([]); }}
            className={`flex-1 rounded-lg py-2.5 font-sans text-sm transition-all duration-300 ${
              dewaterMode === "manual" ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/20" : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a]"
            }`}
          >
            画笔选区
          </button>
        </div>
      )}

      {/* 文件选择器 */}
      {!showBrushCanvas && !reorderMode && (!hasFiles || !isDewater) && (
        <div className="mt-4 space-y-3 animate-scale-in">
          <label
            htmlFor="file-upload"
            className="relative flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-[#32324f] bg-[#1a1a24] p-6 text-center transition-all hover:border-[#4a4a6a] active:border-[#4a4a6a] active:scale-[0.98]"
          >
            <input id="file-upload" ref={fileInputRef} type="file" accept={acceptConfig.accept} multiple={acceptConfig.multiple} onChange={onFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer" />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="1.5" className="mb-3">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="font-sans text-sm text-[#e2e8f0]">点击或拖拽添加文件</p>
            <p className="mt-1 font-sans text-xs text-[#6b6b8a]">{acceptConfig.hint}</p>
          </label>

          {isDewater && (
            <div className="flex gap-2">
              <label htmlFor="gallery-upload" className="relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#32324f] bg-[#1a1a24] py-3 text-center transition-all active:border-[#4a4a6a] active:scale-95">
                <input id="gallery-upload" ref={galleryInputRef} type="file" accept="image/*" multiple={acceptConfig.multiple} onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9090aa]"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                <span className="font-sans text-sm text-[#e2e8f0]">相册</span>
              </label>
              <label htmlFor="camera-upload" className="relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#32324f] bg-[#1a1a24] py-3 text-center transition-all active:border-[#4a4a6a] active:scale-95">
                <input id="camera-upload" ref={cameraInputRef} type="file" accept="image/*" multiple={acceptConfig.multiple} capture="environment" onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#9090aa]"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
                <span className="font-sans text-sm text-[#e2e8f0]">拍照</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* 非去水印工具说明 */}
      {!isDewater && !hasFiles && (
        <p className="mt-3 font-sans text-xs text-[#6b6b8a]">选择文件后即可开始处理，处理结果将自动下载</p>
      )}

      {/* 状态提示 */}
      {error && (
        <div className="mt-3 animate-scale-in rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="whitespace-pre-line font-sans text-xs text-red-400">{error}</p>
        </div>
      )}
      {status === "processing" && (
        <div className="mt-3 animate-scale-in rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="font-sans text-xs text-cyan-400">{statusMsg}</p>
          </div>
        </div>
      )}
      {status === "done" && !isDewater && (
        <div className="mt-3 animate-scale-in rounded-lg border border-green-500/30 bg-green-500/10 p-3">
          <p className="font-sans text-xs text-green-400">{statusMsg}</p>
        </div>
      )}

      {/* =========== 去水印：图片预览 =========== */}
      {showAutoPreview && (
        <div className="mt-4 animate-slide-down">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-sans text-xs font-medium text-[#9090aa]">图片预览</p>
            <button onClick={() => removeFile(0)} className="flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-xs text-[#6b6b8a] transition-colors hover:bg-[#24243a] hover:text-red-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              重新选择
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#32324f] bg-[#0a0a0f]">
            <img src={files[0].previewUrl} alt={files[0].name} className="w-full object-contain" style={{ maxHeight: "400px" }} />
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#1a1a24] px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
            <span className="flex-1 truncate font-sans text-xs text-[#9090aa]">{files[0].name}</span>
            <span className="font-mono text-xs text-[#6b6b8a]">{formatFileSize(files[0].size)}</span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <button onClick={handlePreviewDetection} disabled={status === "processing"} className="flex-1 rounded-xl border border-[#32324f] bg-[#1a1a24] py-3 font-sans text-sm text-[#e2e8f0] transition-all hover:border-cyan-500/40 hover:text-white active:scale-95 disabled:opacity-50">
                预览检测
              </button>
              <button onClick={handleAutoDewater} disabled={status === "processing"} className="flex-1 rounded-xl bg-cyan-500 py-3 font-sans text-sm font-medium text-white transition-all hover:bg-cyan-600 active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-500/20">
                直接去水印
              </button>
            </div>
            <p className="text-center font-sans text-[11px] text-[#4a4a6a]">建议先「预览检测」查看水印位置，确认后再「直接去水印」</p>
          </div>
        </div>
      )}

      {/* 水印检测预览 */}
      {previewDewater && originalPreview && (
        <div className="mt-4 animate-slide-down space-y-2">
          <p className="font-sans text-xs font-medium text-[#9090aa]">检测到水印区域（红色标记）</p>
          <div className="overflow-hidden rounded-xl border border-[#32324f]">
            <img src={previewDewater} alt="水印检测预览" className="w-full" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setPreviewDewater(null); setOriginalPreview(null); }} className="flex-1 rounded-lg border border-[#32324f] bg-[#1a1a24] py-2.5 font-sans text-sm text-[#9090aa] transition-all hover:border-[#4a4a6a] active:scale-95">
              返回
            </button>
            <button onClick={handleAutoDewater} className="flex-1 rounded-lg bg-cyan-500 py-2.5 font-sans text-sm font-medium text-white transition-all hover:bg-cyan-600 active:scale-95 shadow-lg shadow-cyan-500/20">
              确认去除
            </button>
          </div>
        </div>
      )}

      {/* 画笔模式 */}
      {showBrushCanvas && (
        <div className="mt-4 animate-slide-down space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs font-medium text-[#9090aa]">画笔编辑</p>
            <button onClick={() => { removeFile(0); setDewaterMode("auto"); }} className="flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-xs text-[#6b6b8a] transition-colors hover:bg-[#24243a] hover:text-red-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              重新选择
            </button>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-[#24243a] bg-[#1a1a24] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: tool.color + "15", color: tool.color }}>
              {files[0].previewUrl ? <img src={files[0].previewUrl} alt="" className="h-full w-full object-cover" /> : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-sans text-sm text-white">{files[0].name}</p>
              <p className="font-sans text-xs text-[#6b6b8a]">{formatFileSize(files[0].size)}</p>
            </div>
          </div>
          <DewaterCanvas file={files[0].file} onProcess={handleManualDewater} />
        </div>
      )}

      {/* 手动模式：预览 */}
      {isDewater && dewaterMode === "manual" && hasFiles && !showBrushCanvas && processedResults.length === 0 && (
        <div className="mt-4 animate-slide-down space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-sans text-xs font-medium text-[#9090aa]">图片预览</p>
            <button onClick={() => removeFile(0)} className="flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-xs text-[#6b6b8a] transition-colors hover:bg-[#24243a] hover:text-red-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              重新选择
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#32324f] bg-[#0a0a0f]">
            <img src={files[0].previewUrl} alt={files[0].name} className="w-full object-contain" style={{ maxHeight: "300px" }} />
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-[#1a1a24] px-3 py-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b8a" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
            <span className="flex-1 truncate font-sans text-xs text-[#9090aa]">{files[0].name}</span>
            <span className="font-mono text-xs text-[#6b6b8a]">{formatFileSize(files[0].size)}</span>
          </div>
          <button onClick={() => setDewaterMode("manual")} className="w-full rounded-xl bg-cyan-500 py-3 font-sans text-sm font-medium text-white transition-all hover:bg-cyan-600 active:scale-95 shadow-lg shadow-cyan-500/20 animate-pulse-glow">
            进入画笔编辑
          </button>
        </div>
      )}

      {/* =========== 文件列表（非去水印工具） =========== */}
      {hasFiles && !isDewater && !showBrushCanvas && processedResults.length === 0 && !reorderMode && (
        <div className="mt-4 space-y-2">
          <p className="font-sans text-xs font-medium text-[#9090aa]">已选择 {files.length} 个文件</p>
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg border border-[#24243a] bg-[#1a1a24] p-3 animate-fade-in">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ background: tool.color + "15", color: tool.color }}>
                {icons[tool.icon]}
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

      {/* =========== 参数输入区 =========== */}
      {needsPassword && hasFiles && processedResults.length === 0 && (
        <div className="mt-4">
          <label className="font-sans text-xs text-[#9090aa]">设置密码</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码（至少 4 位）"
            className="mt-1 w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white outline-none transition-all focus:border-[#4a4a6a]" />
        </div>
      )}
      {needsPageInput && hasFiles && processedResults.length === 0 && (
        <div className="mt-4">
          <label className="font-sans text-xs text-[#9090aa]">页码范围</label>
          <input type="text" value={pageInput} onChange={(e) => setPageInput(e.target.value)} placeholder="如: 1,3,5-7"
            className="mt-1 w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white outline-none transition-all focus:border-[#4a4a6a]" />
          <p className="mt-1 font-sans text-[11px] text-[#4a4a6a]">用逗号分隔，支持范围如 5-10</p>
        </div>
      )}
      {needsWatermark && hasFiles && processedResults.length === 0 && (
        <div className="mt-4">
          <label className="font-sans text-xs text-[#9090aa]">水印文字</label>
          <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="如: 机密文件"
            className="mt-1 w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white outline-none transition-all focus:border-[#4a4a6a]" />
        </div>
      )}
      {needsSignature && hasFiles && processedResults.length === 0 && (
        <div className="mt-4">
          <label className="font-sans text-xs text-[#9090aa]">签名文字</label>
          <input type="text" value={signatureText} onChange={(e) => setSignatureText(e.target.value)} placeholder="输入签名"
            className="mt-1 w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white outline-none transition-all focus:border-[#4a4a6a]" />
        </div>
      )}
      {needsRotate && hasFiles && processedResults.length === 0 && (
        <div className="mt-4">
          <label className="font-sans text-xs text-[#9090aa]">旋转角度</label>
          <div className="mt-1 flex gap-2">
            {([90, 180, 270] as const).map((a) => (
              <button key={a} onClick={() => setRotateAngle(a)} className={`flex-1 rounded-lg py-2.5 font-sans text-sm transition-all ${
                rotateAngle === a ? "bg-cyan-500 text-white" : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a]"
              }`}>{a}°</button>
            ))}
          </div>
        </div>
      )}
      {needsBatchOp && hasFiles && processedResults.length === 0 && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="font-sans text-xs text-[#9090aa]">操作类型</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(["compress", "encrypt", "rotate90", "rotate180", "rotate270"] as const).map((op) => (
                <button key={op} onClick={() => setBatchOp(op)} className={`rounded-lg py-2.5 font-sans text-xs transition-all ${
                  batchOp === op ? "bg-cyan-500 text-white" : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a]"
                }`}>
                  {{ compress: "压缩", encrypt: "加密", rotate90: "旋转90°", rotate180: "旋转180°", rotate270: "旋转270°" }[op]}
                </button>
              ))}
            </div>
          </div>
          {batchOp === "encrypt" && (
            <div>
              <label className="font-sans text-xs text-[#9090aa]">设置密码</label>
              <input type="password" value={batchPassword} onChange={(e) => setBatchPassword(e.target.value)} placeholder="输入密码"
                className="mt-1 w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2.5 font-sans text-sm text-white outline-none transition-all focus:border-[#4a4a6a]" />
            </div>
          )}
        </div>
      )}
      {needsCompare && hasFiles && files.length >= 2 && !compareResult && processedResults.length === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-cyan-500/10 p-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
          <p className="font-sans text-xs text-cyan-400">点击「开始处理」对比两份文件</p>
        </div>
      )}
      {needsCompare && compareResult && (
        <div className="mt-4 animate-slide-down rounded-lg border border-[#24243a] bg-[#0f0f14] p-4">
          <p className="font-sans text-xs font-medium text-[#9090aa] mb-2">对比结果</p>
          <pre className="whitespace-pre-wrap font-mono text-xs text-[#e2e8f0] leading-relaxed">{compareResult}</pre>
        </div>
      )}

      {/* 页面排序 */}
      {needsReorder && reorderMode && (
        <div className="mt-4 animate-slide-down space-y-2">
          <p className="font-sans text-xs font-medium text-[#9090aa]">拖拽排序（点击上下箭头调整）</p>
          <div className="space-y-1">
            {reorderPages.map((p, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-[#24243a] bg-[#1a1a24] p-2">
                <span className="w-8 text-center font-mono text-xs text-[#6b6b8a]">{p}</span>
                <span className="flex-1 font-sans text-xs text-[#9090aa]">第 {p} 页</span>
                <div className="flex gap-1">
                  <button onClick={() => movePage(i, "up")} disabled={i === 0} className="flex h-6 w-6 items-center justify-center rounded text-[#6b6b8a] hover:bg-[#24243a] disabled:opacity-30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                  </button>
                  <button onClick={() => movePage(i, "down")} disabled={i === reorderPages.length - 1} className="flex h-6 w-6 items-center justify-center rounded text-[#6b6b8a] hover:bg-[#24243a] disabled:opacity-30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========== 处理结果 =========== */}
      {processedResults.length > 0 && (
        <div className="mt-4 animate-slide-down space-y-2">
          <p className="font-sans text-xs font-medium text-green-400">处理完成 {processedResults.length} 个文件</p>
          {processedResults.map((result, index) => (
            <div key={index} className="space-y-2 rounded-lg border border-green-500/20 bg-[#0f1a14] p-3 animate-scale-in">
              {isDewater && files[index]?.previewUrl && result.previewUrl && (
                <div className="flex gap-2">
                  <div className="flex-1 overflow-hidden rounded-lg border border-[#24243a]">
                    <div className="bg-[#1a1a24] px-2 py-1 text-center font-sans text-[10px] text-[#6b6b8a]">处理前</div>
                    <img src={files[index].previewUrl} alt="处理前" className="w-full" />
                  </div>
                  <div className="flex-1 overflow-hidden rounded-lg border border-green-500/20">
                    <div className="bg-[#0f1a14] px-2 py-1 text-center font-sans text-[10px] text-green-400">处理后</div>
                    <img src={result.previewUrl} alt="处理后" className="w-full" />
                  </div>
                </div>
              )}
              {(!isDewater || !files[index]?.previewUrl) && result.previewUrl && (
                <div className="overflow-hidden rounded-lg">
                  <img src={result.previewUrl} alt={result.name} className="w-full" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-sans text-sm text-white">{result.name}</p>
                  <p className="font-sans text-xs text-[#6b6b8a]">{formatFileSize(result.blob.size)}</p>
                </div>
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(result.blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = result.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/20 text-green-400 transition-all hover:bg-green-500/30 active:scale-95"
                  title="保存到本地"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setFiles([]);
              setProcessedResults([]);
              setPreviewDewater(null);
              setOriginalPreview(null);
              setCompareResult(null);
              setStatus("idle");
              setReorderMode(false);
              setReorderPages([]);
            }}
            className="w-full rounded-xl border border-[#32324f] bg-[#1a1a24] py-3 font-sans text-sm text-[#e2e8f0] transition-all hover:border-[#4a4a6a] active:scale-95"
          >
            处理另一个文件
          </button>
        </div>
      )}

      {/* =========== 操作按钮（非去水印） =========== */}
      {hasFiles && !isDewater && processedResults.length === 0 && !reorderMode && (
        <div className="mt-5">
          {needsReorder && !reorderMode && (
            <button onClick={enterReorderMode} className="w-full rounded-xl bg-cyan-500 py-3 font-sans text-sm font-medium text-white transition-all hover:bg-cyan-600 active:scale-95 shadow-lg shadow-cyan-500/20">
              进入排序模式
            </button>
          )}
          {!needsReorder && (
            <button onClick={handleProcess} disabled={status === "processing"} className={`w-full rounded-xl py-3 font-sans text-sm font-medium transition-all active:scale-95 ${
              status !== "processing" ? "bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/20" : "cursor-not-allowed bg-[#24243a] text-[#4a4a6a]"
            }`}>
              {status === "processing" ? "处理中..." : "开始处理"}
            </button>
          )}
        </div>
      )}
      {needsReorder && reorderMode && processedResults.length === 0 && (
        <div className="mt-5 flex gap-2">
          <button onClick={() => { setReorderMode(false); setReorderPages([]); }} className="flex-1 rounded-xl border border-[#32324f] bg-[#1a1a24] py-3 font-sans text-sm text-[#e2e8f0] transition-all hover:border-[#4a4a6a] active:scale-95">
            取消
          </button>
          <button onClick={handleProcess} disabled={status === "processing"} className={`flex-1 rounded-xl py-3 font-sans text-sm font-medium transition-all active:scale-95 ${
            status !== "processing" ? "bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/20" : "cursor-not-allowed bg-[#24243a] text-[#4a4a6a]"
          }`}>
            {status === "processing" ? "处理中..." : "确认排序"}
          </button>
        </div>
      )}

      <p className="mt-3 text-center font-sans text-xs text-[#4a4a6a]">文件仅在浏览器本地处理，不会上传到服务器</p>
    </>
  );

  if (inline) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="rounded-2xl border border-[#32324f] bg-[#0f0f14] p-6 sm:p-8">
          {content}
        </div>
      </div>
    );
  }

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
        {content}
      </div>
    </div>
  );
}