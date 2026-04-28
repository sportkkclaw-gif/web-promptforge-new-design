'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

interface GenerateData {
  generatedPrompt: string;
  negativePrompt: string;
  missingInfoHints: string[];
  suggestions: string[];
  rewrittenPrompt: string;
  provider: string;
}

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
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        className="w-full border rounded px-3 py-2"
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Prompt Generator Workspace</h1>
      <p className="text-sm text-gray-600">模板 ID：{templateId}（MVP 文字提示詞生成；不含站內圖片生成）</p>

      <section className="grid md:grid-cols-2 gap-4">
        {field('subject', 'Subject', 'e.g. premium coffee cup on wooden table')}
        {field('style', 'Style', 'e.g. cinematic product photography')}
        {field('composition', 'Composition', 'e.g. close-up, rule of thirds')}
        {field('lighting', 'Lighting', 'e.g. warm softbox lighting')}
        {field('camera', 'Camera', 'e.g. 85mm lens, f/2.8')}
        {field('background', 'Background', 'e.g. dark matte studio backdrop')}
        {field('details', 'Details', 'e.g. steam, reflections, high texture')}
        {field('targetModel', 'Target Model', 'e.g. midjourney-v6 / sdxl')}
      </section>

      <section>
        <label className="block text-sm font-medium mb-1">Negative Prompt</label>
        <textarea
          className="w-full border rounded px-3 py-2 h-24"
          value={form.negativePrompt}
          onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })}
          placeholder="e.g. blurry, low quality, watermark"
        />
      </section>

      <section className="flex gap-3">
        <button className="px-4 py-2 bg-black text-white rounded" onClick={onGenerate} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Prompt'}
        </button>
        <button className="px-4 py-2 border rounded" onClick={onOptimize} disabled={!data}>AI Optimize</button>
        <button className="px-4 py-2 border rounded" onClick={onRewrite} disabled={!data}>One-click Rewrite</button>
      </section>

      {data && (
        <section className="space-y-4 border rounded p-4">
          <div>
            <h2 className="font-semibold">Generated Prompt (English)</h2>
            <pre className="text-sm whitespace-pre-wrap mt-1">{data.generatedPrompt}</pre>
          </div>
          <div>
            <h2 className="font-semibold">Negative Prompt</h2>
            <pre className="text-sm whitespace-pre-wrap mt-1">{data.negativePrompt}</pre>
          </div>
          <div>
            <h2 className="font-semibold">Missing Info Hints</h2>
            <ul className="list-disc ml-6 text-sm">{data.missingInfoHints.map((h, i) => <li key={i}>{h}</li>)}</ul>
          </div>
          <div>
            <h2 className="font-semibold">AI Suggestions</h2>
            <ul className="list-disc ml-6 text-sm">{data.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div>
            <h2 className="font-semibold">Rewritten Prompt</h2>
            <pre className="text-sm whitespace-pre-wrap mt-1">{data.rewrittenPrompt}</pre>
          </div>
          <p className="text-xs text-gray-500">provider: {data.provider}</p>
        </section>
      )}
    </main>
  );
}
