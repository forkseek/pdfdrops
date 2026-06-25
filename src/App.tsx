import { useState } from "react";
import { icons } from "./icons";
import { tools, stats, type Tool } from "./tools";
import { ToolModal } from "./ToolModal";

export default function App() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allTools = tools.flatMap((t) => t.items);
  const filteredTools = searchQuery
    ? allTools.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a24] bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" fill="none" stroke="white" strokeWidth="2" />
              </svg>
            </div>
            <span className="font-sans text-base font-semibold tracking-tight text-white sm:text-lg">PDFDROPS</span>
            <span className="ml-1 hidden rounded bg-[#1a1a24] px-2 py-0.5 font-mono text-xs text-[#6b6b8a] sm:inline-block">v2.0</span>
          </div>

          <div className="hidden items-center gap-8 font-sans text-sm text-[#9090aa] md:flex">
            <a href="#tools" className="text-white transition-colors hover:text-white">所有工具</a>
            <a href="#features" className="transition-colors hover:text-white">功能介绍</a>
            <a href="#" className="transition-colors hover:text-white">定价</a>
            <a href="#" className="transition-colors hover:text-white">API</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button className="hidden rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-2 font-sans text-sm text-[#e2e8f0] transition-all hover:border-[#4a4a6a] hover:bg-[#24243a] sm:block">登录</button>
            <button className="rounded-lg bg-red-500 px-3 py-2 font-sans text-sm font-medium text-white transition-all hover:bg-red-600 sm:px-4">免费开始</button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#32324f] bg-[#1a1a24] text-white md:hidden" aria-label="菜单">
              {mobileMenuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-[#1a1a24] bg-[#0f0f14] px-4 py-4 md:hidden animate-fade-in">
            <nav className="flex flex-col gap-1">
              <a href="#tools" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 font-sans text-sm text-[#e2e8f0] transition-colors hover:bg-[#1a1a24]">所有工具</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 font-sans text-sm text-[#9090aa] transition-colors hover:bg-[#1a1a24] hover:text-white">功能介绍</a>
              <a href="#" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 font-sans text-sm text-[#9090aa] transition-colors hover:bg-[#1a1a24] hover:text-white">定价</a>
              <a href="#" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-4 py-3 font-sans text-sm text-[#9090aa] transition-colors hover:bg-[#1a1a24] hover:text-white">API</a>
              <div className="mt-2 border-t border-[#1a1a24] pt-2">
                <button className="w-full rounded-lg border border-[#32324f] bg-[#1a1a24] px-4 py-3 font-sans text-sm text-[#e2e8f0]">登录</button>
              </div>
            </nav>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-12 sm:px-6 sm:pt-20">
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[400px] w-[400px] rounded-full bg-red-500/5 blur-[120px] sm:h-[500px] sm:w-[600px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-[#32324f] bg-[#1a1a24] px-3 py-1.5 font-mono text-xs text-[#9090aa] opacity-0 sm:mb-8 sm:px-4" style={{ animationDelay: "0ms", animationFillMode: "forwards" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <span className="hidden sm:inline">所有处理在本地完成,文件不会上传至服务器</span>
            <span className="sm:hidden">本地处理,安全私密</span>
          </div>

          <h1 className="animate-fade-up font-display text-4xl leading-[1.15] text-white opacity-0 sm:text-6xl sm:leading-[1.1]" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
            处理 PDF<br /><span className="text-red-500">从未如此简单</span>
          </h1>

          <p className="animate-fade-up mx-auto mt-5 max-w-xl font-sans text-base leading-relaxed text-[#9090aa] opacity-0 sm:mt-6 sm:text-lg" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
            合并、拆分、压缩、转换、加密、签名<br />18+ 高频功能,浏览器内本地处理
          </p>

          <div className="animate-fade-up mx-auto mt-8 max-w-lg opacity-0 sm:mt-10" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6b8a]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input type="text" placeholder="搜索工具..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#32324f] bg-[#1a1a24] py-3.5 pl-12 pr-4 font-sans text-sm text-white placeholder-[#6b6b8a] outline-none transition-all focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 sm:py-4" />
              <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-[#32324f] bg-[#24243a] px-2 py-0.5 font-mono text-xs text-[#6b6b8a] sm:block">⌘K</kbd>
            </div>

            {filteredTools && (
              <div className="mt-2 overflow-hidden rounded-xl border border-[#32324f] bg-[#1a1a24] shadow-2xl">
                {filteredTools.length === 0 ? (
                  <div className="px-4 py-6 text-center font-sans text-sm text-[#6b6b8a]">未找到相关工具</div>
                ) : (
                  filteredTools.map((tool) => (
                    <div key={tool.name} onClick={() => { setSelectedTool(tool); setSearchQuery(""); }}
                      className="flex cursor-pointer items-center gap-4 border-b border-[#24243a] px-4 py-3 transition-colors last:border-0 hover:bg-[#24243a] active:bg-[#24243a]">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: tool.color + "20", color: tool.color }}>{icons[tool.icon]}</div>
                      <div>
                        <p className="font-sans text-sm font-medium text-white">{tool.name}</p>
                        <p className="font-sans text-xs text-[#6b6b8a]">{tool.desc}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="animate-fade-up mt-5 flex flex-wrap items-center justify-center gap-2 opacity-0 sm:mt-6 sm:gap-3" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            {["合并 PDF", "压缩 PDF", "转 Word", "添加签名"].map((label) => (
              <button key={label} onClick={() => setSearchQuery(label.replace(" PDF", ""))}
                className="rounded-full border border-[#32324f] bg-[#1a1a24] px-3 py-2 font-sans text-xs text-[#9090aa] transition-all hover:border-[#4a4a6a] hover:text-white active:bg-[#24243a] sm:px-4 sm:text-sm">
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[#1a1a24] bg-[#0f0f14]">
        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-[#1a1a24] sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="px-4 py-6 text-center sm:px-8 sm:py-8">
              <p className="font-display text-2xl text-white sm:text-3xl">{s.value}</p>
              <p className="mt-1 font-sans text-xs text-[#6b6b8a] sm:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tools Grid */}
      <section id="tools" className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 sm:mb-12">
            <p className="mb-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-red-500">所有工具</p>
            <h2 className="font-display text-3xl text-white sm:text-4xl">PDF 处理<span className="text-[#9090aa]"> 全家桶</span></h2>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-2 sm:mb-8 sm:flex-wrap sm:overflow-visible sm:pb-0">
            <button onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full px-4 py-2 font-sans text-sm transition-all ${!activeCategory ? "bg-red-500 text-white" : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a] hover:text-white active:bg-[#24243a]"}`}>
              全部
            </button>
            {tools.map((t) => (
              <button key={t.category} onClick={() => setActiveCategory(activeCategory === t.category ? null : t.category)}
                className={`shrink-0 rounded-full px-4 py-2 font-sans text-sm transition-all ${activeCategory === t.category ? "bg-red-500 text-white" : "border border-[#32324f] bg-[#1a1a24] text-[#9090aa] hover:border-[#4a4a6a] hover:text-white active:bg-[#24243a]"}`}>
                {t.category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {tools.filter((t) => !activeCategory || t.category === activeCategory).flatMap((t) => t.items).map((tool) => (
              <button key={tool.name} onClick={() => setSelectedTool(tool)} onMouseEnter={() => setHoveredTool(tool.name)} onMouseLeave={() => setHoveredTool(null)}
                className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border border-[#24243a] bg-[#0f0f14] p-5 text-left transition-all duration-300 hover:border-[#4a4a6a] hover:bg-[#1a1a24] active:scale-[0.98] sm:p-6">
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300" style={{ background: `radial-gradient(circle at 30% 50%, ${tool.color}08 0%, transparent 70%)` }} />
                <div className="relative flex items-start gap-4">
                  <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 sm:h-14 sm:w-14"
                    style={{ background: hoveredTool === tool.name ? tool.color + "20" : tool.color + "15", color: tool.color }}>
                    {icons[tool.icon]}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-sans text-base font-semibold text-white">{tool.name}</h3>
                    <p className="mt-1 font-sans text-sm text-[#6b6b8a]">{tool.desc}</p>
                  </div>
                </div>
                <div className="absolute bottom-5 right-5 transition-all duration-300 sm:bottom-6 sm:right-6" style={{ color: tool.color, opacity: hoveredTool === tool.name ? 1 : 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl border border-[#24243a] bg-[#0f0f14] sm:rounded-3xl">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-red-500/5 blur-[120px]" />
            </div>
            <div className="relative grid grid-cols-1 gap-8 p-6 sm:gap-12 sm:p-12 md:grid-cols-2 md:gap-16">
              <div>
                <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.2em] text-red-500">为什么选择我们</p>
                <h3 className="font-display text-2xl text-white sm:text-3xl">本地处理<br /><span className="text-[#6b6b8a]">你的文件只在你的浏览器里</span></h3>
                <p className="mt-4 font-sans text-sm leading-relaxed text-[#9090aa]">所有 PDF 处理均在浏览器本地完成,文件不会上传至任何服务器。即使是离线环境也能正常使用。</p>
                <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
                  {[
                    { icon: "🔒", label: "隐私安全", desc: "文件全程本地处理,不经过服务器" },
                    { icon: "⚡", label: "极速处理", desc: "浏览器 WebAssembly 加速,无需等待" },
                    { icon: "🆓", label: "完全免费", desc: "基础功能无限制使用,无广告水印" },
                    { icon: "📱", label: "随时随地", desc: "支持桌面和移动端,响应式设计" },
                  ].map((f) => (
                    <div key={f.label} className="flex items-start gap-3 sm:gap-4">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a1a24] text-base">{f.icon}</div>
                      <div>
                        <p className="font-sans text-sm font-medium text-white">{f.label}</p>
                        <p className="font-sans text-xs text-[#6b6b8a] sm:text-sm">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="relative">
                  <div className="animate-float rounded-2xl border border-[#32324f] bg-[#1a1a24] p-5 shadow-2xl">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#32324f]" />
                      <div className="h-2 w-16 rounded bg-[#32324f]" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full rounded bg-[#32324f]" />
                      <div className="h-2 w-5/6 rounded bg-[#32324f]" />
                      <div className="h-2 w-4/5 rounded bg-[#32324f]" />
                      <div className="mt-3 h-20 w-full rounded-lg border border-dashed border-[#4a4a6a] bg-[#0f0f14]" />
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-500/10 py-2 text-xs text-red-500">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      拖拽文件到此处
                    </div>
                  </div>
                  <div className="absolute -right-4 -top-4 rounded-xl border border-[#32324f] bg-[#1a1a24] px-3 py-1.5 font-mono text-xs text-green-400 shadow-xl">✓ 本地处理中</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="font-display text-3xl text-white sm:text-5xl">开始处理 PDF</h2>
          <p className="mx-auto mt-4 max-w-md font-sans text-sm text-[#6b6b8a] sm:text-base">无需注册,无需等待。立即体验最完整的 PDF 处理工具箱。</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4">
            <button onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-xl bg-red-500 px-6 py-3.5 font-sans text-sm font-medium text-white transition-all hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20 active:scale-95 sm:px-8 sm:py-4 sm:text-base">
              免费开始使用 →
            </button>
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-xl border border-[#32324f] bg-[#1a1a24] px-6 py-3.5 font-sans text-sm text-[#e2e8f0] transition-all hover:border-[#4a4a6a] hover:bg-[#24243a] active:scale-95 sm:px-8 sm:py-4 sm:text-base">
              查看所有功能
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a24] bg-[#0f0f14] px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <div className="mb-3 flex items-center gap-2 sm:mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-red-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /></svg>
                </div>
                <span className="font-sans text-sm font-semibold text-white">PDFDROPS</span>
              </div>
              <p className="font-sans text-xs leading-relaxed text-[#6b6b8a]">免费的在线 PDF 处理工具箱,本地处理保护隐私。</p>
            </div>
            {[
              { title: "功能", links: ["合并 PDF", "拆分 PDF", "压缩 PDF", "PDF 转 Word"] },
              { title: "资源", links: ["使用文档", "API 接口", "常见问题", "更新日志"] },
              { title: "关于", links: ["关于我们", "使用条款", "隐私政策", "联系我们"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-[#9090aa] sm:mb-3">{col.title}</p>
                <ul className="space-y-1.5 sm:space-y-2">
                  {col.links.map((link) => (
                    <li key={link}><a href="#" className="font-sans text-sm text-[#6b6b8a] transition-colors hover:text-white">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-[#1a1a24] pt-6 sm:flex-row sm:gap-0 sm:pt-8">
            <p className="font-sans text-xs text-[#6b6b8a]">© 2025 PDFDROPS. 保留所有权利。</p>
            <p className="font-mono text-xs text-[#4a4a6a]">Made with precision in browser</p>
          </div>
        </div>
      </footer>

      {/* Tool Modal */}
      <ToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
    </div>
  );
}
