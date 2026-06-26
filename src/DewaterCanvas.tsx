import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  file: File;
  onProcess: (maskData: ImageData) => void;
}

export function DewaterCanvas({ file, onProcess }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [brushSize, setBrushSize] = useState(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const maskRef = useRef<ImageData | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    img.onload = () => {
      imgRef.current = img;
      // 适配容器宽度
      const containerW = containerRef.current?.clientWidth || 400;
      const maxW = Math.min(containerW - 4, 800);
      const maxH = 500;
      let w = img.naturalWidth, h = img.naturalHeight;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      setCanvasSize({ w, h });

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        maskRef.current = ctx.createImageData(w, h);
      }
      setLoaded(true);
    };
    img.onerror = () => setLoaded(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const drawBrush = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);

    const mask = maskRef.current!;
    const r = brushSize;

    // 绘制圆形画笔到 mask
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const px = x + dx, py = y + dy;
        if (px < 0 || px >= mask.width || py < 0 || py >= mask.height) continue;
        const i = (py * mask.width + px) * 4;
        mask.data[i] = 255;
        mask.data[i + 1] = 0;
        mask.data[i + 2] = 0;
        mask.data[i + 3] = 255;
      }
    }

    // 重绘：图片 + 红色半透明覆盖层
    if (imgRef.current) {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
      // 绘制红色选区覆盖
      const overlay = ctx.createImageData(mask.width, mask.height);
      for (let i = 0; i < mask.data.length; i += 4) {
        if (mask.data[i] > 128) {
          overlay.data[i] = 255;
          overlay.data[i + 1] = 0;
          overlay.data[i + 2] = 0;
          overlay.data[i + 3] = 100;
        }
      }
      ctx.putImageData(overlay, 0, 0);
    }
  }, [isDrawing, brushSize]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    drawBrush(e);
  };

  const handleEnd = () => setIsDrawing(false);

  const handleProcess = () => {
    if (maskRef.current) onProcess(maskRef.current);
  };

  const handleClear = () => {
    if (!canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    maskRef.current = ctx.createImageData(canvas.width, canvas.height);
  };

  return (
    <div className="space-y-3">
      <p className="font-sans text-xs text-[#9090aa]">用手指或鼠标在水印区域涂抹，红色标记为选中区域</p>

      {loaded ? (
        <>
          <div ref={containerRef} className="overflow-hidden rounded-xl border border-[#32324f] bg-[#0a0a0f]">
            <canvas
              ref={canvasRef}
              width={canvasSize.w}
              height={canvasSize.h}
              style={{ width: "100%", height: "auto", touchAction: "none", display: "block" }}
              onMouseDown={handleStart}
              onMouseMove={drawBrush}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={drawBrush}
              onTouchEnd={handleEnd}
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="font-sans text-xs text-[#9090aa] shrink-0">画笔:</span>
            <input type="range" min={8} max={60} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))}
              className="h-1 flex-1 appearance-none rounded-full bg-[#32324f] accent-red-500" />
            <span className="font-mono text-xs text-[#6b6b8a] w-7 text-right">{brushSize}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={handleClear} className="flex-1 rounded-xl border border-[#32324f] bg-[#1a1a24] py-2.5 font-sans text-sm text-[#e2e8f0] transition-all hover:border-[#4a4a6a] active:scale-95">
              清除选区
            </button>
            <button onClick={handleProcess} className="flex-1 rounded-xl bg-red-500 py-2.5 font-sans text-sm font-medium text-white transition-all hover:bg-red-600 active:scale-95">
              开始去水印
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
        </div>
      )}
    </div>
  );
}