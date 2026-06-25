import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

// 配置 pdfjs worker（CDN）
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// ── 通用: File[] → ArrayBuffer[]
async function filesToBuffers(files: File[]): Promise<Uint8Array[]> {
  return Promise.all(files.map((f) => f.arrayBuffer().then((b) => new Uint8Array(b))));
}

// ── 下载
function downloadBuffer(buffer: Uint8Array, filename: string) {
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
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
    await page.render({ canvasContext: ctx, viewport }).promise;
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `${file.name.replace(/\.pdf$/i, "")}_page_${i}.png`);
      }
    }, "image/png");
    await new Promise((r) => setTimeout(r, 200));
  }
}

// ══════════════════════════════════════
// PDF 转 Word（提示：仅提取文本）
// ══════════════════════════════════════
export async function pdfToWord(file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n\n";
  }
  const blob = new Blob([text], { type: "text/plain" });
  downloadBlob(blob, file.name.replace(/\.pdf$/i, "_text.txt"));
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
    const { width, height } = page.getSize();
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
// 去水印（图片水印检测与移除）
// ══════════════════════════════════════
export async function dewaterImage(files: File[]): Promise<void> {
  for (const file of files) {
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

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 简单水印检测：找出大面积半透明白色区域（常见水印特征）并去除
    const w = canvas.width;
    const h = canvas.height;
    // 扫描右下角区域（常见水印位置）
    const rw = Math.floor(w * 0.4);
    const rh = Math.floor(h * 0.3);
    const startX = w - rw;
    const startY = h - rh;

    for (let y = startY; y < h; y++) {
      for (let x = startX; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        // 检测接近白色的半透明区域
        if (a > 50 && a < 220 && r > 180 && g > 180 && b > 180) {
          const brightness = (r + g + b) / 3;
          if (brightness > 200) {
            // 向四周取样并混合
            const nx = Math.min(x + 1, w - 1);
            const ny = Math.min(y + 1, h - 1);
            const ni = (ny * w + nx) * 4;
            data[i] = data[ni];
            data[i + 1] = data[ni + 1];
            data[i + 2] = data[ni + 2];
            data[i + 3] = data[ni + 3];
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const base = file.name.replace(/\.[^.]+$/, "");
        const ext = file.type === "image/png" ? "png" : "jpg";
        downloadBlob(blob, `${base}_dewatered.${ext}`);
      }
    }, file.type);
    await new Promise((r) => setTimeout(r, 300));
  }
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
