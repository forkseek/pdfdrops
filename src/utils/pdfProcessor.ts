import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

// 配置 pdfjs worker（使用本地打包版本，避免 CDN 被墙）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

// ── 通用: File[] → ArrayBuffer[]
async function filesToBuffers(files: File[]): Promise<Uint8Array[]> {
  return Promise.all(files.map((f) => f.arrayBuffer().then((b) => new Uint8Array(b))));
}

// ── 结果收集 ──
const results: { blob: Blob; name: string }[] = [];

export function getResults(): { blob: Blob; name: string }[] {
  return [...results];
}

export function clearResults(): void {
  results.length = 0;
}

function downloadBuffer(buffer: Uint8Array, filename: string) {
  const blob = new Blob([buffer as BlobPart], { type: "application/pdf" });
  results.push({ blob, name: filename });
}

function downloadBlob(blob: Blob, filename: string) {
  results.push({ blob, name: filename });
}

// ══════════════════════════════════════
// 合并 PDF
// ══════════════════════════════════════
export async function mergePDFs(files: File[]): Promise<void> {
  const mergedPdf = await PDFDocument.create();
  const buffers = await filesToBuffers(files);
  for (const buf of buffers) {
    const pdf = await PDFDocument.load(buf);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((p) => mergedPdf.addPage(p));
  }
  const bytes = await mergedPdf.save();
  downloadBuffer(bytes, "merged.pdf");
}

// ══════════════════════════════════════
// 拆分 PDF（每页单独一个文件）
// ══════════════════════════════════════
export async function splitPDF(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  const count = pdf.getPageCount();

  if (count === 1) {
    downloadBuffer(bytes, file.name.replace(/\.pdf$/i, "_split.pdf"));
    return;
  }

  for (let i = 0; i < count; i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);
    const out = await newPdf.save();
    downloadBuffer(out, file.name.replace(/\.pdf$/i, `_page_${i + 1}.pdf`));
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ══════════════════════════════════════
// 提取页面
// ══════════════════════════════════════
export async function extractPages(file: File, pageNumbers: number[]): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  const newPdf = await PDFDocument.create();
  const indices = pageNumbers.map((n) => n - 1);
  const pages = await newPdf.copyPages(pdf, indices);
  pages.forEach((p) => newPdf.addPage(p));
  const out = await newPdf.save();
  downloadBuffer(out, file.name.replace(/\.pdf$/i, "_extracted.pdf"));
}

// ══════════════════════════════════════
// 压缩 PDF
// ══════════════════════════════════════
export async function compressPDF(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  const out = await pdf.save({ useObjectStreams: true });
  downloadBuffer(out, file.name.replace(/\.pdf$/i, "_compressed.pdf"));
}

// ══════════════════════════════════════
// 加密 PDF
// ══════════════════════════════════════
export async function encryptPDF(file: File, password: string): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  // @ts-expect-error - encrypt exists at runtime but missing in types
  pdf.encrypt({ userPassword: password, ownerPassword: password });
  const out = await pdf.save();
  downloadBuffer(out, file.name.replace(/\.pdf$/i, "_encrypted.pdf"));
}

// ══════════════════════════════════════
// 解锁 PDF
// ══════════════════════════════════════
export async function unlockPDF(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const out = await pdf.save();
    downloadBuffer(out, file.name.replace(/\.pdf$/i, "_unlocked.pdf"));
  } catch {
    throw new Error("此 PDF 已加密且无法忽略，需要密码才能处理");
  }
}

// ══════════════════════════════════════
// 旋转页面
// ══════════════════════════════════════
export async function rotatePDF(file: File, angle: 90 | 180 | 270): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  pdf.getPages().forEach((page) => {
    page.setRotation(degrees((page.getRotation().angle + angle) % 360));
  });
  const out = await pdf.save();
  downloadBuffer(out, file.name.replace(/\.pdf$/i, `_rotated_${angle}.pdf`));
}

// ══════════════════════════════════════
// 删除页面
// ══════════════════════════════════════
export async function deletePages(file: File, pageNumbers: number[]): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  const total = pdf.getPageCount();
  const toDelete = new Set(pageNumbers.map((n) => n - 1));
  const toKeep = Array.from({ length: total }, (_, i) => i).filter((i) => !toDelete.has(i));
  const newPdf = await PDFDocument.create();
  const pages = await newPdf.copyPages(pdf, toKeep);
  pages.forEach((p) => newPdf.addPage(p));
  const out = await newPdf.save();
  downloadBuffer(out, file.name.replace(/\.pdf$/i, "_removed.pdf"));
}

// ══════════════════════════════════════
// 添加水印（文字水印）
// ══════════════════════════════════════
export async function addWatermark(file: File, text: string): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const rgb2 = rgb(0.8, 0.8, 0.8);
  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    page.drawText(text, {
      x: width / 4,
      y: height / 2,
      size: 40,
      font,
      color: rgb2,
      opacity: 0.3,
      rotate: degrees(45),
    });
  });
  const out = await pdf.save();
  downloadBuffer(out, file.name.replace(/\.pdf$/i, "_watermarked.pdf"));
}

// ══════════════════════════════════════
// 图片转 PDF
// ══════════════════════════════════════
export async function imageToPDF(files: File[]): Promise<void> {
  const pdf = await PDFDocument.create();
  for (const file of files) {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let image;
    if (file.type === "image/png") {
      image = await pdf.embedPng(bytes);
    } else {
      image = await pdf.embedJpg(bytes);
    }
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  }
  const out = await pdf.save();
  downloadBuffer(out, "images.pdf");
}

// ══════════════════════════════════════
// PDF 转图片
// ══════════════════════════════════════
export async function pdfToImage(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pageCount = pdf.numPages;
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${file.name.replace(/\.pdf$/i, "")}_page_${i}.png`);
      }
    }, "image/png");
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ══════════════════════════════════════
// 签名 PDF（文本签名）
// ══════════════════════════════════════
export async function signPDF(file: File, signatureText: string): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.getPages().forEach((page) => {
    const { width } = page.getSize();
    page.drawText(signatureText, {
      x: width - 200,
      y: 30,
      size: 14,
      font,
      color: rgb(0.2, 0.2, 0.6),
    });
  });
  const out = await pdf.save();
  downloadBuffer(out, file.name.replace(/\.pdf$/i, "_signed.pdf"));
}

// ══════════════════════════════════════
// PDF 对比（文本差异对比）
// ══════════════════════════════════════
export async function comparePDFs(file1: File, file2: File): Promise<string> {
  const extractText = async (file: File) => {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    let t = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      t += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return t;
  };
  const text1 = await extractText(file1);
  const text2 = await extractText(file2);
  if (text1 === text2) return "两份文件内容完全相同";
  const lines1 = text1.split("\n");
  const lines2 = text2.split("\n");
  const diff: string[] = [];
  const max = Math.max(lines1.length, lines2.length);
  for (let i = 0; i < max; i++) {
    if (lines1[i] !== lines2[i]) {
      diff.push(`第 ${i + 1} 行:\n  文件1: ${lines1[i] ?? "(空)"}\n  文件2: ${lines2[i] ?? "(空)"}`);
    }
  }
  return diff.length > 0 ? diff.join("\n\n") : "内容略有差异，请手动查看";
}

// ══════════════════════════════════════
// 页面排序
// ══════════════════════════════════════
export async function getPageCount(file: File): Promise<number> {
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(new Uint8Array(buf));
  return pdf.getPageCount();
}

export async function reorderPDF(file: File, newOrder: number[]): Promise<void> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const pdf = await PDFDocument.load(bytes);
  const newPdf = await PDFDocument.create();
  const pages = await newPdf.copyPages(pdf, newOrder.map((n) => n - 1));
  pages.forEach((p) => newPdf.addPage(p));
  const out = await newPdf.save();
  downloadBuffer(out, file.name.replace(/\.pdf$/i, "_reordered.pdf"));
}

// ══════════════════════════════════════
// 批量处理
// ══════════════════════════════════════
export type BatchOperation = "compress" | "encrypt" | "rotate90" | "rotate180" | "rotate270";

export async function batchProcess(
  files: File[],
  operation: BatchOperation,
  password?: string
): Promise<void> {
  for (const file of files) {
    switch (operation) {
      case "compress":
        await compressPDF(file);
        break;
      case "encrypt":
        if (password) await encryptPDF(file, password);
        break;
      case "rotate90":
        await rotatePDF(file, 90);
        break;
      case "rotate180":
        await rotatePDF(file, 180);
        break;
      case "rotate270":
        await rotatePDF(file, 270);
        break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

// ══════════════════════════════════════
// 去水印 —— 辅助函数
// ══════════════════════════════════════

async function loadImageToCanvas(file: File): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([bytes]));
  await new Promise<void>((res) => { img.onload = () => res(); });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);
  return { canvas, ctx };
}

async function saveCanvasAsFile(canvas: HTMLCanvasElement, file: File, suffix: string): Promise<void> {
  const base = file.name.replace(/\.[^.]+$/, "");
  const ext = file.type === "image/png" ? "png" : "jpg";
  const mime = file.type || "image/png";
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${base}${suffix}.${ext}`);
  }, mime, 0.95);
}

/** 检测水印区域，返回 mask */
function detectWatermark(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
  }

  let globalSum = 0;
  for (let i = 0; i < w * h; i++) globalSum += gray[i];
  const globalMean = globalSum / (w * h);

  const WINDOW = 7;
  const halfW = Math.floor(WINDOW / 2);
  const localMean = new Float32Array(w * h);
  const localVar = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, sumSq = 0, cnt = 0;
      for (let dy = -halfW; dy <= halfW; dy++) {
        for (let dx = -halfW; dx <= halfW; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const v = gray[ny * w + nx];
            sum += v;
            sumSq += v * v;
            cnt++;
          }
        }
      }
      const m = sum / cnt;
      localMean[y * w + x] = m;
      localVar[y * w + x] = (sumSq / cnt) - m * m;
    }
  }

  const mask = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      const a = data[i + 3];
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const brightness = (r + g + b) / 3;
      const lm = localMean[idx];
      const lv = localVar[idx];

      let isWatermark = false;

      if (a > 30 && a < 220 && brightness > 130) {
        isWatermark = true;
      }
      if (!isWatermark && brightness > lm + 12 && lv < 350 && brightness > 135 && brightness < 248) {
        isWatermark = true;
      }
      if (!isWatermark && brightness > 195 && lv < 180 && brightness > lm + 8) {
        isWatermark = true;
      }
      if (!isWatermark && brightness > globalMean + 28 && lv < 280 && brightness < 242) {
        isWatermark = true;
      }
      const colorRange = Math.max(r, g, b) - Math.min(r, g, b);
      if (!isWatermark && brightness > 160 && colorRange < 25 && lv < 250 && brightness > lm + 5) {
        isWatermark = true;
      }

      if (isWatermark) {
        mask[idx] = 1;
      }
    }
  }

  const dilated = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              dilated[ny * w + nx] = 1;
            }
          }
        }
      }
    }
  }

  return dilated;
}

function inpaintWatermark(
  data: Uint8ClampedArray,
  mask: Uint8Array,
  w: number,
  h: number
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data);
  const FILL_R = 6;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      const i = (y * w + x) * 4;

      interface Neighbor { r: number; g: number; b: number; weight: number }
      const neighbors: Neighbor[] = [];

      for (let dy = -FILL_R; dy <= FILL_R; dy++) {
        for (let dx = -FILL_R; dx <= FILL_R; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && !mask[ny * w + nx]) {
            const ni = (ny * w + nx) * 4;
            const dist = Math.sqrt(dx * dx + dy * dy);
            neighbors.push({
              r: data[ni],
              g: data[ni + 1],
              b: data[ni + 2],
              weight: 1 / (dist + 0.5),
            });
          }
        }
      }

      if (neighbors.length === 0) {
        const BIG_R = FILL_R * 2;
        for (let dy = -BIG_R; dy <= BIG_R; dy++) {
          for (let dx = -BIG_R; dx <= BIG_R; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !mask[ny * w + nx]) {
              const ni = (ny * w + nx) * 4;
              const dist = Math.sqrt(dx * dx + dy * dy);
              neighbors.push({
                r: data[ni],
                g: data[ni + 1],
                b: data[ni + 2],
                weight: 1 / (dist + 1),
              });
            }
          }
        }
      }

      if (neighbors.length > 0) {
        neighbors.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
        const totalWeight = neighbors.reduce((s, n) => s + n.weight, 0);
        let cumWeight = 0;
        let medianIdx = 0;
        for (let k = 0; k < neighbors.length; k++) {
          cumWeight += neighbors[k].weight;
          if (cumWeight >= totalWeight / 2) {
            medianIdx = k;
            break;
          }
        }
        const m = neighbors[medianIdx];
        result[i] = m.r;
        result[i + 1] = m.g;
        result[i + 2] = m.b;
        result[i + 3] = 255;
      }
    }
  }

  return result;
}

// ══════════════════════════════════════
// 去水印 —— 智能去水印
// ══════════════════════════════════════
export async function dewaterImageAuto(files: File[]): Promise<void> {
  for (const file of files) {
    const { canvas, ctx } = await loadImageToCanvas(file);
    const w = canvas.width, h = canvas.height;
    if (w < 10 || h < 10) {
      await saveCanvasAsFile(canvas, file, "_dewatered");
      continue;
    }

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    const mask = detectWatermark(data, w, h);
    const result = inpaintWatermark(data, mask, w, h);

    const outData = new ImageData(result, w, h);
    ctx.putImageData(outData, 0, 0);
    await saveCanvasAsFile(canvas, file, "_dewatered");
  }
}

export async function previewDewaterDetection(file: File): Promise<{ preview: string }> {
  const { canvas, ctx } = await loadImageToCanvas(file);
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const mask = detectWatermark(data, w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) {
        const i = (y * w + x) * 4;
        data[i] = Math.min(255, data[i] * 0.3 + 200);
        data[i + 1] = Math.min(255, data[i + 1] * 0.3);
        data[i + 2] = Math.min(255, data[i + 2] * 0.3);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return { preview: canvas.toDataURL("image/jpeg", 0.85) };
}

// ══════════════════════════════════════
// 去水印 —— 画笔选区去水印
// ══════════════════════════════════════
export async function dewaterImageManual(file: File, maskData: ImageData): Promise<void> {
  const { canvas, ctx } = await loadImageToCanvas(file);
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const mask = maskData.data;

  const scaleX = maskData.width / w;
  const scaleY = maskData.height / h;
  const binaryMask = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const mx = Math.floor(x * scaleX);
      const my = Math.floor(y * scaleY);
      if (mx >= 0 && mx < maskData.width && my >= 0 && my < maskData.height) {
        const mi = (my * maskData.width + mx) * 4;
        if (mask[mi] > 128) {
          binaryMask[y * w + x] = 1;
        }
      }
    }
  }

  const FILL_R = 5;
  const result = new Uint8ClampedArray(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!binaryMask[y * w + x]) continue;
      const i = (y * w + x) * 4;

      interface Neighbor { r: number; g: number; b: number; weight: number }
      const neighbors: Neighbor[] = [];

      for (let dy = -FILL_R; dy <= FILL_R; dy++) {
        for (let dx = -FILL_R; dx <= FILL_R; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && !binaryMask[ny * w + nx]) {
            const ni = (ny * w + nx) * 4;
            const dist = Math.sqrt(dx * dx + dy * dy);
            neighbors.push({
              r: data[ni],
              g: data[ni + 1],
              b: data[ni + 2],
              weight: 1 / (dist + 0.5),
            });
          }
        }
      }

      if (neighbors.length > 0) {
        neighbors.sort((a, b) => (a.r + a.g + a.b) - (b.r + b.g + b.b));
        const totalWeight = neighbors.reduce((s, n) => s + n.weight, 0);
        let cumWeight = 0;
        let medianIdx = 0;
        for (let k = 0; k < neighbors.length; k++) {
          cumWeight += neighbors[k].weight;
          if (cumWeight >= totalWeight / 2) {
            medianIdx = k;
            break;
          }
        }
        const m = neighbors[medianIdx];
        result[i] = m.r;
        result[i + 1] = m.g;
        result[i + 2] = m.b;
        result[i + 3] = 255;
      }
    }
  }

  const outData = new ImageData(result, w, h);
  ctx.putImageData(outData, 0, 0);
  await saveCanvasAsFile(canvas, file, "_dewatered");
}

export async function dewaterImage(files: File[]): Promise<void> {
  return dewaterImageAuto(files);
}