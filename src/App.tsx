import { useState } from "react";
import { tools } from "./tools";
import { icons } from "./icons";
import { ToolModal } from "./ToolModal";

export default function App() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = tools.map((cat) => ({
    ...cat,
    items: cat.items.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase())),
  })).filter((cat) => cat.items.length > 0);

  const allTools = tools.flatMap((c) => c.items);

  return (
    <div className="bg-[#0a0a0f] text-[#e2e8f0]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a24] bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span className="font-sans text-base font-semibold tracking-tight text-white sm:text-lg">PDFDrops</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-green-500/10 px-3 py-1 font-sans text-xs text-green-400 sm:inline">本地处理 · 安全私密</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-4 pt-28 pb-12 text-center sm:px-6 sm:pt-32 sm:pb-16">
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[300px] w-[400px] rounded-full bg-red-500/5 blur-[100px] sm:h-[400px] sm:w-[600px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl">
          <h1 className="animate-fade-up font-display text-4xl leading-[1.15] text-white opacity-0 sm:text-6xl sm:leading-[1.1]" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
            PDF 工具箱<br /><span className="text-red-500">一站式处理</span>
          </h1>
          <p className="animate-fade-up mx-auto mt-5 max-w-xl font-sans text-base leading-relaxed text-[#9090aa] opacity-0 sm:mt-6 sm:text-lg" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
            合并、拆分、压缩、转换等 {allTools.length} 种工具，全部在浏览器本地完成，无需上传
          </p>
          {/* 搜索 */}
          <div className="animate-fade-up mx-auto mt-6 max-w-sm opacity-0 sm:mt-8" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b8a]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input
                type="text"
                placeholder="搜索工具..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-[#32324f] bg-[#1a1a24] py-3 pl-10 pr-4 font-sans text-sm text-white placeholder-[#6b6b8a] outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 工具网格 */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto max-w-6xl space-y-10 sm:space-y-12">
          {filtered.map((cat, ci) => (
            <div key={cat.category} className="animate-fade-up opacity-0" style={{ animationDelay: `${400 + ci * 100}ms`, animationFillMode: "forwards" }}>
              <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-wider text-[#6b6b8a] sm:mb-5">{cat.category}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
                {cat.items.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => setActiveTool(tool.name)}
                    className="group flex flex-col items-center gap-3 rounded-xl border border-[#24243a] bg-[#0f0f14] p-4 text-center transition-all hover:border-[#4a4a6a] hover:bg-[#1a1a24] active:scale-95 sm:p-5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-all group-hover:scale-110 sm:h-12 sm:w-12" style={{ background: tool.color + "15", color: tool.color }}>
                      {icons[tool.icon]}
                    </div>
                    <div>
                      <p className="font-sans text-sm font-medium text-white sm:text-base">{tool.name}</p>
                      <p className="mt-1 font-sans text-xs text-[#6b6b8a]">{tool.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="font-sans text-sm text-[#6b6b8a]">未找到匹配的工具</p>
            </div>
          )}
        </div>
      </section>

      {/* 特性 */}
      <section className="border-t border-[#1a1a24] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { title: "本地处理", desc: "所有文件在浏览器中处理，不上传任何服务器，保护隐私安全", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
              { title: "快速高效", desc: "基于 WebAssembly 技术，接近原生速度，大文件也能快速处理", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { title: "完全免费", desc: "无需注册、无需付费，所有工具永远免费使用", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
            ].map((f, i) => (
              <div key={f.title} className="flex flex-col items-center gap-3 rounded-2xl border border-[#1a1a24] bg-[#0f0f14] p-6 text-center sm:p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d={f.icon} /></svg>
                </div>
                <h3 className="font-sans text-base font-semibold text-white">{f.title}</h3>
                <p className="font-sans text-sm leading-relaxed text-[#9090aa]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1a1a24] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-2xl text-white sm:text-3xl">开始使用 PDFDrops</h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-[#9090aa]">选择上方任一工具，即刻开始处理你的 PDF 文件</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a24] px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between">
          <p className="font-sans text-xs text-[#6b6b8a]">PDFDrops - 免费在线 PDF 工具</p>
          <p className="font-sans text-xs text-[#4a4a6a]">所有处理均在浏览器本地完成</p>
        </div>
      </footer>

      {/* 工具弹窗 */}
      <ToolModal
        tool={allTools.find((t) => t.name === activeTool) || null}
        onClose={() => setActiveTool(null)}
      />
    </div>
  );
}