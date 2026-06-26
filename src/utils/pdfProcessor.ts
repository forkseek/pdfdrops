import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

// 配置 pdfjs worker（使用本地打包版本，避免 CDN 被墙）
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;

// ── 通用: File[] → ArrayBuffer[]
async function filesToBuffers(files: File[]): Promise<Uint8Array[]> {
  return Promise.all(files.map((f) => f.arrayBuffer().then((b) => new Uint8Array(b))));
}

// ── 结果收集（供 UI 展示处理后的文件预览） ──
const results: { blob: Blob; name: string }[] = [];

export function getResults(): { blob: Blob; name: string }[] {
  return [...results];
}

export function clearResults(): void {
  results.length = 0;
}

// ── 下载
function downloadBuffer(buffer: Uint8Array, filename: string) {
  const blob = new Blob([buffer as BlobPart], { type: "application/pdf" });
  results.push({ blob, name: filename });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  results.push({ blob, name: filename });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
    // 小延迟避免浏览器拦截
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
  // pdf-lib 保存时自动丢弃元数据实现压缩
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
  // pdf-lib 1.17 类型定义缺 encrypt，但运行时存在
  // @ts-expect-error - encrypt exists at runtime but missing in types
  pdf.encrypt({ userPassword: password, ownerPassword: password });
  const out = await pdf.save();
  downloadBuffer(out, file.name.replace(/\.pdf$/i, "_encrypted.pdf"));
}

// ══════════════════════════════════════
// 解锁 PDF（移除密码，仅适用于未加密时提示）
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
// PDF 转 Word（生成真正的 .docx 文件）
// ══════════════════════════════════════
export async function pdfToWord(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: { paras: string[]; width: number; height: number }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    // 按 y 坐标分组（同行文字合并为一个段落）
    const items = content.items as any[];
    const lines: Map<number, string> = new Map();
    for (const item of items) {
      if (!item.str?.trim()) continue;
      const y = Math.round(item.transform[5] / 2) * 2; // 按 y 坐标分组
      const existing = lines.get(y) || "";
      lines.set(y, existing + item.str);
    }
    const sorted = [...lines.entries()]
      .sort((a, b) => b[0] - a[0]) // y 从大到小（从上到下）
      .map((e) => e[1]);
    pages.push({ paras: sorted, width: viewport.width, height: viewport.height });
  }

  const docx = buildDocx(pages);
  downloadBlob(docx, file.name.replace(/\.pdf$/i, ".docx"));
}

// ── DOCX 生成器（纯前端，无需依赖） ──
function buildDocx(pages: { paras: string[] }[]): Blob {
  const docXml = buildDocumentXml(pages);
  const files: { name: string; data: Uint8Array }[] = [
    { name: "[Content_Types].xml", data: new TextEncoder().encode(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`) },
    { name: "_rels/.rels", data: new TextEncoder().encode(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`) },
    { name: "word/_rels/document.xml.rels", data: new TextEncoder().encode(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`) },
    { name: "word/document.xml", data: new TextEncoder().encode(docXml) },
  ];
  return buildZip(files);
}

function buildDocumentXml(pages: { paras: string[] }[]): string {
  const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let body = "";
  for (const page of pages) {
    for (const para of page.paras) {
      if (!para.trim()) continue;
      body += `<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(para)}</w:t></w:r></w:p>`;
    }
    body += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
}

// ── 最小 ZIP 生成器 ──
function buildZip(files: { name: string; data: Uint8Array }[]): Blob {
  const chunks: Uint8Array[] = [];
  const cdEntries: { header: Uint8Array; offset: number }[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    // Local file header
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true);          // version
    lv.setUint16(6, 0x0800, true);      // flags (UTF-8)
    lv.setUint16(8, 0, true);           // compression: store
    lv.setUint16(10, 0, true);          // mod time
    lv.setUint16(12, 0, true);          // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);          // extra field length
    lh.set(nameBytes, 30);

    cdEntries.push({ header: lh, offset });
    chunks.push(lh, file.data);
    offset += lh.length + size;
  }

  // Central directory
  let cdSize = 0;
  for (const entry of cdEntries) {
    const lh = entry.header;
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x02014b50, true); // central dir signature
    dv.setUint16(4, 20, true);          // version made by
    dv.setUint16(6, 20, true);          // version needed
    dv.setUint32(42, entry.offset, true);
    chunks.push(lh);
    cdSize += lh.length;
  }

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, cdEntries.length, true);
  ev.setUint16(10, cdEntries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);
  chunks.push(eocd);

  // 合并
  let total = 0;
  for (const c of chunks) total += c.length;
  const result = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { result.set(c, pos); pos += c.length; }
  return new Blob([result], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

// ── CRC32 ──
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
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
// 页面排序（返回带序号的页面列表供用户选择）
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
// 去水印 —— 智能去水印（全图扫描，检测半透明文字/logo）
// ══════════════════════════════════════
export async function dewaterImageAuto(files: File[]): Promise<void> {
  for (const file of files) {
    const { canvas, ctx } = await loadImageToCanvas(file);
    const w = canvas.width, h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    // 智能扫描全图：检测半透明区域（alpha 在 30~200 之间，亮度偏高）
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a > 30 && a < 200) {
          const brightness = (r + g + b) / 3;
          if (brightness > 160) {
            // 用周围像素填充
            const sx = Math.max(0, x - 2), sy = Math.max(0, y - 2);
            const si = (sy * w + sx) * 4;
            data[i] = data[si];
            data[i + 1] = data[si + 1];
            data[i + 2] = data[si + 2];
            data[i + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    await saveCanvasAsFile(canvas, file, "_dewatered");
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ══════════════════════════════════════
// 去水印 —— 画笔选区去水印（根据 mask 数据移除指定区域）
// ══════════════════════════════════════
export async function dewaterImageManual(file: File, maskData: ImageData): Promise<void> {
  const { canvas, ctx } = await loadImageToCanvas(file);
  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const mask = maskData.data;

  // 只处理 mask 标记的区域（红色通道 > 128 表示选中）
  for (let y = 0; y < Math.min(h, maskData.height); y++) {
    for (let x = 0; x < Math.min(w, maskData.width); x++) {
      const mi = (y * maskData.width + x) * 4;
      if (mask[mi] > 128) {
        const i = (y * w + x) * 4;
        // 用周围像素填充
        const sx = Math.max(0, x - 2), sy = Math.max(0, y - 2);
        const si = (sy * w + sx) * 4;
        data[i] = data[si];
        data[i + 1] = data[si + 1];
        data[i + 2] = data[si + 2];
        data[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  await saveCanvasAsFile(canvas, file, "_dewatered");
}

// 辅助：加载图片到 canvas
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

// 辅助：保存 canvas 为文件
async function saveCanvasAsFile(canvas: HTMLCanvasElement, file: File, suffix: string): Promise<void> {
  const base = file.name.replace(/\.[^.]+$/, "");
  const ext = file.type === "image/png" ? "png" : "jpg";
  const mime = file.type || "image/png";
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `${base}${suffix}.${ext}`);
  }, mime);
}

// ══════════════════════════════════════
// 去水印（兼容旧接口 —— 智能去水印）
// ══════════════════════════════════════
export async function dewaterImage(files: File[]): Promise<void> {
  return dewaterImageAuto(files);
}

// ══════════════════════════════════════
// 批量处理（统一操作多个文件）
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
