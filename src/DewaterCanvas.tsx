import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  file: File;
  onProcess: (maskData: ImageData) => void;
}

export function DewaterCanvas({ file, onProcess }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [brushSize, setBrushSize] = useState(24);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [canUndo, setCanUndo] = useState(false);
  const maskRef = useRef<ImageData | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const historyRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // 初始化：加载图片到 canvas
  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      const containerW = parent?.clientWidth || 400;
      const maxW = Math.min(containerW - 4, 800);
      const maxH = 500;
      let w = img.naturalWidth, h = img.naturalHeight;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      maskRef.current = ctx.createImageData(w, h);
      historyRef.current = [];
      setCanUndo(false);
      setLoaded(true);
    };
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 保存历史
  const saveHistory = useCallback(() => {
    if (maskRef.current) {
      historyRef.current.push(new ImageData(
        new Uint8ClampedArray(maskRef.current.data),
        maskRef.current.width,
        maskRef.current.height
      ));
      if (historyRef.current.length > 20) historyRef.current.shift();
      setCanUndo(true);
    }
  }, []);

  // 重绘：图片 + 红色遮罩叠加层（使用临时 canvas 合成，避免 putImageData 覆盖）
  const redrawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current || !maskRef.current) return;
    const ctx = canvas.getContext("2d")!;
    const mask = maskRef.current;

    // 先画原图
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);

    // 在临时 canvas 上构建红色遮罩层
    const tmp = document.createElement("canvas");
    tmp.width = canvas.width;
    tmp.height = canvas.height;
    const tmpCtx = tmp.getContext("2d")!;
    const overlay = tmpCtx.createImageData(mask.width, mask.height);
    for (let i = 0; i < mask.data.length; i += 4) {
      if (mask.data[i] > 128) {
        overlay.data[i] = 255;
        overlay.data[i + 1] = 0;
        overlay.data[i + 2] = 0;
        overlay.data[i + 3] = 120;
      }
    }
    tmpCtx.putImageData(overlay, 0, 0);

    // 用 drawImage 合成（尊重 alpha 通道，不会覆盖原图）
    ctx.drawImage(tmp, 0, 0);
  }, []);

  // 撤销
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    maskRef.current = historyRef.current.pop()!;
    setCanUndo(historyRef.current.length > 0);
    redrawOverlay();
  }, [redrawOverlay]);

  // 获取 canvas 坐标
  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // 在 mask 上画圆
  const drawCircle = useCallback((cx: number, cy: number) => {
    const mask = maskRef.current;
    if (!mask) return;
    const r = brushSize;
    const isErase = tool === "eraser";
    const r2 = r * r;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const px = Math.round(cx + dx);
        const py = Math.round(cy + dy);
        if (px < 0 || px >= mask.width || py < 0 || py >= mask.height) continue;
        const i = (py * mask.width + px) * 4;
        if (isErase) {
          mask.data[i] = 0;
          mask.data[i + 1] = 0;
          mask.data[i + 2] = 0;
          mask.data[i + 3] = 0;
        } else {
          mask.data[i] = 255;
          mask.data[i + 1] = 0;
          mask.data[i + 2] = 0;
          mask.data[i + 3] = 255;
        }
      }
    }
  }, [brushSize, tool]);

  // 在两点之间插值画线（保证连续涂抹）
  const drawLine = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(1, brushSize / 4);
    const steps = Math.ceil(dist / step);
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      drawCircle(x0 + dx * t, y0 + dy * t);
    }
  }, [brushSize, drawCircle]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    saveHistory();
    drawingRef.current = true;
    const coords = getCanvasCoords(e);
    if (coords) {
      lastPosRef.current = coords;
      drawCircle(coords.x, coords.y);
      redrawOverlay();
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const last = lastPosRef.current;
    if (last) {
      drawLine(last.x, last.y, coords.x, coords.y);
    } else {
      drawCircle(coords.x, coords.y);
    }
    lastPosRef.current = coords;
    redrawOverlay();
  };

  const handleEnd = () => {
    drawingRef.current = false;
    lastPosRef.current = null;
  };

  const handleProcess = () => {
    if (maskRef.current) onProcess(maskRef.current);
  };

  const handleClear = () => {
    if (!canvasRef.current || !imgRef.current || !maskRef.current) return;
    saveHistory();
    const mask = maskRef.current;
    mask.data.fill(0);
    historyRef.current = [];
    setCanUndo(false);
    redrawOverlay();
  };

  return (
    <div className="space-y-3">
      <p className="font-sans text-xs text-[#9090aa]">
        {tool === "brush" ? "用手指或鼠标涂抹水印区域，红色为选中区域" : "涂抹擦除已选中的区域"}
      </p>

      {/* canvas 始终在 DOM 中，避免 ref 为 null */}
      <div className="relative overflow-hidden rounded-xl border border-[#32324f] bg-[#0a0a0f]">
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "auto",
            touchAction: "none",
            display: "block",
            cursor: tool === "brush" ? "crosshair" : "cell",
          }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          </div>
        )}
      </div>

      {/* 工具切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setTool("brush")}
          className={`flex-1 rounded-lg py-2 font-sans text-xs transition-all flex items-center justify-center gap-1.5 ${
            tool === "brush"
              ? "bg-cyan-500 text-white"
              : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" />
          </svg>
          画笔
        </button>
        <button
          onClick={() => setTool("eraser")}
          className={`flex-1 rounded-lg py-2 font-sans text-xs transition-all flex items-center justify-center gap-1.5 ${
            tool === "eraser"
              ? "bg-cyan-500 text-white"
              : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0L21 5.2c.8.8.8 2 0 2.8L12 17" />
          </svg>
          橡皮擦
        </button>
      </div>

      {/* 画笔大小 */}
      <div className="flex items-center gap-3">
        <span className="font-sans text-xs text-[#9090aa] shrink-0">
          {tool === "brush" ? "画笔:" : "橡皮:"}
        </span>
        <input
          type="range"
          min={8}
          max={60}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="h-1 flex-1 appearance-none rounded-full bg-[#32324f] accent-cyan-500"
        />
        <span className="font-mono text-xs text-[#6b6b8a] w-7 text-right">{brushSize}</span>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex items-center justify-center gap-1 rounded-lg border border-[#32324f] bg-[#1a1a24] px-3 py-2.5 font-sans text-xs text-[#e2e8f0] transition-all hover:border-[#4a4a6a] active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10h10a5 5 0 015 5v2" /><path d="M7 6l-4 4 4 4" />
          </svg>
          撤销
        </button>
        <button
          onClick={handleClear}
          className="flex-1 rounded-lg border border-[#32324f] bg-[#1a1a24] py-2.5 font-sans text-xs text-[#e2e8f0] transition-all hover:border-[#4a4a6a] active:scale-95"
        >
          清除全部
        </button>
        <button
          onClick={handleProcess}
          className="flex-1 rounded-lg bg-cyan-500 py-2.5 font-sans text-xs font-medium text-white transition-all hover:bg-cyan-600 active:scale-95 shadow-lg shadow-cyan-500/20"
        >
          开始去水印
        </button>
      </div>
    </div>
  );
}
