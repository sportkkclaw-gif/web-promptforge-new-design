'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface GenerateData {
  generatedPrompt: string;
  negativePrompt: string;
  missingInfoHints: string[];
  suggestions: string[];
  rewrittenPrompt: string;
  provider: string;
}

const labels = {
  subject: ['主題', '例如：木桌上的高級咖啡杯'],
  style: ['風格', '例如：電影化產品攝影'],
  composition: ['構圖', '例如：特寫、三分法構圖'],
  lighting: ['燈光', '例如：暖色調柔光箱照明'],
  camera: ['相機', '例如：85mm 鏡頭，f/2.8'],
  background: ['背景', '例如：深色霧面攝影棚背景'],
  details: ['細節', '例如：蒸氣、反射、高紋理'],
  targetModel: ['目標型號', '例如：midjourney-v6 / sdxl'],
} as const;

export default function GeneratorPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GenerateData | null>(null);
  const [form, setForm] = useState({
    subject: '',
    style: '',
    composition: '',
    lighting: '',
    camera: '',
    background: '',
    details: '',
    negativePrompt: '',
    targetModel: 'midjourney-v6',
  });

  const onGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, parameters: form }),
      });
      const json = await res.json();
      if (json.ok) setData(json.data);
    } finally {
      setLoading(false);
    }
  };

  const onOptimize = async () => {
    const res = await fetch('/api/generate/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, parameters: form }),
    });
    const json = await res.json();
    if (json.ok && data) {
      setData({ ...data, ...json.data, generatedPrompt: json.data.rewrittenPrompt || data.generatedPrompt });
    }
  };

  const onRewrite = async () => {
    const prompt = data?.generatedPrompt || '';
    const res = await fetch('/api/generate/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style: form.style || 'professional-commercial' }),
    });
    const json = await res.json();
    if (json.ok && data) {
      setData({ ...data, rewrittenPrompt: json.data.rewrittenPrompt, suggestions: json.data.suggestions || data.suggestions });
    }
  };

  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition focus-within:border-cyan-200/45 focus-within:bg-white/[0.07]">
      <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-cyan-100/70">{label}</label>
      <input
        className="w-full border-0 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05030f] text-white">
      <div className="aurora pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute -left-44 top-[-260px] h-[660px] w-[660px] rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.34)_0%,_rgba(34,211,238,0.08)_42%,_transparent_72%)] blur-3xl" />
        <div className="absolute right-[-240px] top-10 h-[780px] w-[780px] rounded-full bg-[radial-gradient(circle,_rgba(168,85,247,0.42)_0%,_rgba(99,102,241,0.12)_44%,_transparent_74%)] blur-3xl" />
        <div className="absolute bottom-[-300px] left-1/3 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,_rgba(251,146,60,0.22)_0%,_rgba(244,63,94,0.08)_38%,_transparent_70%)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_top,black_34%,transparent_74%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-5">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-white/10 shadow-[0_0_35px_rgba(34,211,238,0.25)] backdrop-blur">✦</span>
            <span className="text-lg font-semibold tracking-tight">PromptForge Studio</span>
          </Link>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1 text-sm text-white/70 backdrop-blur-xl md:flex">
            <Link href="/browse" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Explore</Link>
            <Link href="/marketplace" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Marketplace</Link>
            <Link href="/dashboard" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Dashboard</Link>
            <Link href="/" className="rounded-full bg-white px-4 py-2 font-medium text-slate-950">← 回首頁</Link>
          </div>
        </nav>

        <header className="mb-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 backdrop-blur-xl">Generate Command Deck · Professional Prompt Builder</div>
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.055em] md:text-7xl">提示生成器工作區</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">把主題、風格、構圖、燈光與相機語言整理成可直接用於 Midjourney / SDXL 的專業提示詞。範本ID：{templateId}</p>
          </div>
          <aside className="rounded-[1.6rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Prompt Quality Stack</div>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              {['Structured visual intent', 'Negative prompt guardrail', 'Model-specific output language', 'AI optimize / rewrite flow'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.8)]" />
                  {item}
                </div>
              ))}
            </div>
          </aside>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl">
            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Prompt Inputs</h2>
                <p className="mt-1 text-sm text-slate-400">填入越具體，輸出的提示詞越能接近商業級成品。</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">{form.targetModel}</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {field('subject', labels.subject[0], labels.subject[1])}
              {field('style', labels.style[0], labels.style[1])}
              {field('composition', labels.composition[0], labels.composition[1])}
              {field('lighting', labels.lighting[0], labels.lighting[1])}
              {field('camera', labels.camera[0], labels.camera[1])}
              {field('background', labels.background[0], labels.background[1])}
              {field('details', labels.details[0], labels.details[1])}
              {field('targetModel', labels.targetModel[0], labels.targetModel[1])}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl focus-within:border-fuchsia-200/45">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-100/70">否定提示</label>
              <textarea
                className="h-28 w-full resize-none border-0 bg-transparent text-base text-white outline-none placeholder:text-slate-500"
                value={form.negativePrompt}
                onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })}
                placeholder="例如：模糊、低品質、浮水印、變形手指、錯誤文字"
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_35px_rgba(255,255,255,0.16)] transition hover:-translate-y-0.5 disabled:opacity-60" onClick={onGenerate} disabled={loading}>
                {loading ? '產生中...' : '產生提示'}
              </button>
              <button className="rounded-full border border-cyan-200/25 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-40" onClick={onOptimize} disabled={!data}>AI優化</button>
              <button className="rounded-full border border-fuchsia-200/25 bg-fuchsia-300/10 px-5 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-300/20 disabled:opacity-40" onClick={onRewrite} disabled={!data}>一鍵重寫</button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/50 p-5 backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">Live Preview</div>
              <div className="mt-5 aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_35%_20%,rgba(34,211,238,0.28),transparent_30%),radial-gradient(circle_at_70%_62%,rgba(168,85,247,0.28),transparent_32%),linear-gradient(145deg,#0f172a,#020617)] p-5">
                <div className="h-full rounded-xl border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="mb-4 h-3 w-24 rounded-full bg-cyan-200/40" />
                  <div className="space-y-3">
                    <div className="h-16 rounded-xl bg-white/10" />
                    <div className="h-24 rounded-xl bg-white/[0.07]" />
                    <div className="h-10 rounded-xl bg-white/[0.09]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-5 text-sm leading-6 text-slate-300 backdrop-blur-xl">
              <div className="mb-3 text-xs uppercase tracking-[0.35em] text-fuchsia-200/70">Workflow</div>
              先輸入視覺需求，產生後可再 AI 優化或一鍵重寫。此頁已與首頁、Marketplace、Dashboard 採同一套深色專業視覺系統。
            </div>
          </aside>
        </section>

        {data && (
          <section className="mt-8 rounded-[1.8rem] border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-5">
              <h2 className="text-2xl font-semibold">Generated Output</h2>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">provider: {data.provider}</span>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <h3 className="mb-2 text-sm font-semibold text-cyan-100">Generated Prompt (English)</h3>
                <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{data.generatedPrompt}</pre>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <h3 className="mb-2 text-sm font-semibold text-fuchsia-100">Negative Prompt</h3>
                <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{data.negativePrompt}</pre>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <h3 className="mb-2 text-sm font-semibold text-cyan-100">Missing Info Hints</h3>
                <ul className="ml-5 list-disc text-sm leading-6 text-slate-300">{data.missingInfoHints.map((h, i) => <li key={i}>{h}</li>)}</ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <h3 className="mb-2 text-sm font-semibold text-fuchsia-100">AI Suggestions</h3>
                <ul className="ml-5 list-disc text-sm leading-6 text-slate-300">{data.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 lg:col-span-2">
                <h3 className="mb-2 text-sm font-semibold text-white">Rewritten Prompt</h3>
                <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{data.rewrittenPrompt}</pre>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
