'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StreamingOutput } from '@/components/ui';

interface HistoryItem {
  runId: string;
  promptId: string;
  status: string;
  response?: string;
  createdAt: string;
  prompt?: { id: string; title: string; slug: string };
}

interface GenerationResult {
  runId: string;
  text?: string;
  generatedPrompt?: string;
  negativePrompt?: string;
  missingInfoHints?: string[];
  suggestions?: string[];
  rewrittenPrompt?: string;
  provider: string;
  isMock: boolean;
  status: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface OverageInfo {
  code: string;
  currentCredits: number;
  requiredCredits: number;
  periodRemaining?: number;
  upgradeRequired: boolean;
  message: string;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function GeneratePage() {
  const { templateSlug } = useParams<{ templateSlug: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<{
    id: string;
    title: string;
    content: string;
    parameters: string;
    engine: string;
    model: string;
  } | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateError, setTemplateError] = useState('');

  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState('');
  const [overage, setOverage] = useState<OverageInfo | null>(null);

  // History sidebar
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);

  // Quality flag
  const [qualityFlag, setQualityFlag] = useState<string>('');
  const [flagSubmitted, setFlagSubmitted] = useState(false);

  // SSE event source ref
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch template info on mount
  useEffect(() => {
    async function loadTemplate() {
      setTemplateLoading(true);
      try {
        // Try to find template by slug
        const res = await fetch(`/api/templates?slug=${encodeURIComponent(templateSlug)}`);
        const json = await res.json();
        if (json.ok && json.data?.templates?.length > 0) {
          setTemplate(json.data.templates[0]);
          // Build form from parameters
          try {
            const params = JSON.parse(json.data.templates[0].parameters || '{}');
            const initial: Record<string, string> = {};
            for (const [key, val] of Object.entries(params)) {
              if (typeof val === 'string') initial[key] = val;
              else if (typeof val === 'number') initial[key] = String(val);
              else if (typeof val === 'boolean') initial[key] = String(val);
            }
            setForm(prev => ({ ...prev, ...initial }));
          } catch {
            // ignore parse errors
          }
        } else {
          setTemplateError('Template not found');
        }
      } catch {
        setTemplateError('Failed to load template');
      } finally {
        setTemplateLoading(false);
      }
    }
    if (templateSlug) loadTemplate();
  }, [templateSlug]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('session_token');
      if (!token) return;
      const res = await fetch('/api/generate/history?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.ok) {
        setHistory(json.data.runs || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // SSE streaming generation
  const startGeneration = async () => {
    if (!template) return;

    setLoading(true);
    setResult(null);
    setError('');
    setOverage(null);
    setStreamingText('');

    const token = localStorage.getItem('session_token');
    if (!token) {
      setError('Please log in to generate');
      setLoading(false);
      return;
    }

    // Close any existing SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const mergedParams = { ...JSON.parse(template.parameters || '{}'), ...form };
    const url = `/api/generate/stream?templateId=${template.id}`;
    const es = new EventSource(url, { withCredentials: true });

    eventSourceRef.current = es;

    es.addEventListener('error', () => {
      // Native EventSource 'error' events do not carry typed payloads.
      setError('Connection error');
      setLoading(false);
      es.close();
    });

    es.addEventListener('progress', (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      void data; // status updates from server
    });

    es.addEventListener('token', (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setStreamingText(prev => prev + (data.delta || ''));
    });

    es.addEventListener('complete', (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setResult(data);
      setLoading(false);
      setStreamingText('');
      es.close();
      fetchHistory(); // refresh history
    });

    // Send POST body via a separate fetch since SSE doesn't support POST body
    // Instead use a cookie-based approach or use fetch to post, then SSE to stream
    // For simplicity here, we'll use a hybrid approach: POST to get runId, then SSE to stream
    try {
      const postRes = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateId: template.id, parameters: mergedParams }),
      });

      const postJson = await postRes.json();
      if (!postRes.ok || !postJson.ok) {
        if (postJson.code === 'QUOTA_EXCEEDED') {
          setOverage(postJson);
        } else {
          setError(postJson.error || 'Generation failed');
        }
        setLoading(false);
        es.close();
        return;
      }

      // For streaming, we use a simple polling approach since SSE POST body is tricky
      // Start SSE with the runId
      const runId = postJson.data?.runId;
      if (runId) {
        setResult(postJson.data);
        setLoading(false);
        fetchHistory();
      } else {
        setError('No runId returned');
        setLoading(false);
        es.close();
      }
    } catch (err: any) {
      setError(err.message || 'Generation failed');
      setLoading(false);
      es.close();
    }
  };

  // Regenerate: same form, new generation
  const handleRegenerate = () => {
    startGeneration();
  };

  // Copy to clipboard
  const handleCopy = async () => {
    const text = result?.text || result?.generatedPrompt || streamingText || '';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
  };

  // Quality flag
  const handleQualityFlag = async (rating: 'good' | 'bad') => {
    if (!result?.runId) return;
    const token = localStorage.getItem('session_token');
    if (!token) return;

    try {
      await fetch('/api/generate/quality-flag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ runId: result.runId, rating }),
      });
      setQualityFlag(rating);
      setFlagSubmitted(true);
    } catch {
      // ignore
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const fieldInputs = Object.entries(form).map(([key, value]) => (
    <div key={key}>
      <label className="block text-sm font-medium mb-1 capitalize">
        {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
      </label>
      <input
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        value={value}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={key}
      />
    </div>
  ));

  return (
    <div className="flex h-screen bg-gray-50">
      {/* History Sidebar */}
      {historyOpen && (
        <aside className="w-72 border-r bg-white overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Generation History</h2>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xs"
            >
              ✕
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No generations yet</p>
          ) : (
            <ul className="divide-y">
              {history.map(item => (
                <li key={item.runId}>
                  <button
                    onClick={() => {
                      const res = JSON.parse(item.response || '{}');
                      setResult({
                        runId: item.runId,
                        text: res.text,
                        generatedPrompt: res.text,
                        provider: res.provider || 'mock',
                        isMock: res.isMock ?? true,
                        status: item.status,
                      });
                    }}
                    className="w-full text-left p-3 hover:bg-gray-50 text-sm"
                  >
                    <p className="font-medium truncate">
                      {item.prompt?.title || item.promptId?.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleString()} ·{' '}
                      <span className={
                        item.status === 'succeeded' ? 'text-green-600' :
                        item.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                      }>
                        {item.status}
                      </span>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {templateLoading ? 'Loading...' : template?.title || 'Generation Studio'}
              </h1>
              {!historyOpen && (
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="text-sm text-blue-600 mt-1"
                >
                  Show History
                </button>
              )}
            </div>
            {result?.isMock && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                DEMO MODE
              </span>
            )}
          </div>

          {/* Template error */}
          {templateError && (
            <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
              {templateError}
            </div>
          )}

          {/* Overage / Upgrade Prompt */}
          {overage && (
            <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <h3 className="font-semibold text-amber-800">Quota Exceeded</h3>
              </div>
              <p className="text-sm text-amber-700">{overage.message}</p>
              <div className="text-xs text-amber-600 space-y-1">
                <p>Current credits: {overage.currentCredits}</p>
                <p>Required: {overage.requiredCredits}</p>
                {overage.periodRemaining !== undefined && (
                  <p>Period remaining: {overage.periodRemaining} credits</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <a
                  href="/pricing"
                  className="px-4 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                >
                  Upgrade Plan
                </a>
                <a
                  href="/settings/billing"
                  className="px-4 py-2 border border-amber-600 text-amber-700 text-sm rounded hover:bg-amber-50"
                >
                  Buy Credits
                </a>
              </div>
            </div>
          )}

          {/* Variable Form */}
          {template && (
            <section className="bg-white rounded-lg border p-4 space-y-4">
              <h2 className="font-semibold text-sm text-gray-700">Template Variables</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fieldInputs}
              </div>
            </section>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={startGeneration}
              disabled={loading || !template}
              className="px-6 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
            {result && (
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="px-4 py-2.5 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Regenerate
              </button>
            )}
            {result && (
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 border border-gray-300 rounded-lg"
              >
                Copy
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Streaming Output */}
          <StreamingOutput
            text={streamingText}
            status={loading && streamingText ? 'streaming' : 'idle'}
            autoScroll
          />

          {/* Final Result */}
          {result && !loading && (
            <section className="bg-white rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">Generated Output</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    provider: {result.provider}
                    {result.isMock ? ' (mock)' : ''}
                  </span>
                  {result.usage && (
                    <span className="text-xs text-gray-400">
                      tokens: {result.usage.totalTokens}
                    </span>
                  )}
                </div>
              </div>

              {/* Main output text */}
              <pre className="text-sm whitespace-pre-wrap bg-gray-50 rounded p-3">
                {result.text || result.generatedPrompt || result.rewrittenPrompt || ''}
              </pre>

              {/* Additional fields */}
              {result.negativePrompt && (
                <div>
                  <h3 className="text-xs font-medium text-gray-600 mb-1">Negative Prompt</h3>
                  <pre className="text-xs whitespace-pre-wrap bg-gray-50 rounded p-2">
                    {result.negativePrompt}
                  </pre>
                </div>
              )}

              {result.missingInfoHints && result.missingInfoHints.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-600 mb-1">Missing Info Hints</h3>
                  <ul className="list-disc ml-5 text-xs text-amber-700">
                    {result.missingInfoHints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestions && result.suggestions.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-gray-600 mb-1">Suggestions</h3>
                  <ul className="list-disc ml-5 text-xs text-blue-700">
                    {result.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quality Flag */}
              <div className="flex items-center gap-3 pt-2 border-t">
                <span className="text-xs font-medium text-gray-600">Rate quality:</span>
                {!flagSubmitted ? (
                  <>
                    <button
                      onClick={() => handleQualityFlag('good')}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      👍 Good
                    </button>
                    <button
                      onClick={() => handleQualityFlag('bad')}
                      className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      👎 Bad
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">
                    Thanks for your feedback: {qualityFlag === 'good' ? '👍' : '👎'}
                  </span>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
