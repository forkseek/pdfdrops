import { tools } from "./tools";
import { ToolModal } from "./ToolModal";

const dewaterTool = tools[0].items[0];

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a24] bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M3 6l3 3m0 0l3-3M6 9v12" /><path d="M21 18l-3-3m0 0l-3 3m3-3V3" />
              </svg>
            </div>
            <span className="font-sans text-base font-semibold tracking-tight text-white sm:text-lg">去水印工具</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-500/10 px-3 py-1 font-sans text-xs text-green-400">本地处理 · 安全私密</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-12 sm:px-6">
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-[120px] sm:h-[500px] sm:w-[600px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h1 className="animate-fade-up font-display text-4xl leading-[1.15] text-white opacity-0 sm:text-6xl sm:leading-[1.1]" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
            图片去水印<br /><span className="text-cyan-400">智能 + 手动</span>
          </h1>

          <p className="animate-fade-up mx-auto mt-5 max-w-xl font-sans text-base leading-relaxed text-[#9090aa] opacity-0 sm:mt-6 sm:text-lg" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
            支持智能自动检测去水印，也可以手动涂抹选区精确去除<br />全部在浏览器本地完成，不上传服务器
          </p>

          <div className="animate-fade-up mt-10 opacity-0" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            <ToolModal tool={dewaterTool} onClose={() => {}} inline />
          </div>
        </div>
      </section>
    </div>
  );
}