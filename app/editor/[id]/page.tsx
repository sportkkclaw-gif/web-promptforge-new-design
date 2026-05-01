'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  extractVariables,
  lintPrompt,
  diffTemplates,
  applyVariables,
  type VariableSpec,
  type ConstraintSpec,
  type LintResult,
  type TemplateDiff,
  type DiffSegment,
} from '@/lib/prompt-as-code';
import { PromptEditor } from '@/components/ui/prompt-editor';
import { VariableListEditor } from '@/components/ui/variable-list-editor';
import { ConstraintBuilder } from '@/components/ui/constraint-builder';
import { TemplatePreviewRenderer } from '@/components/ui/template-preview-renderer';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>;
}

// ─── Tab definitions ───────────────────────────────────────────────────────────

type TabId = 'basic' | 'variables' | 'builder' | 'preview' | 'publish';
const TABS: { id: TabId; label: string }[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'variables', label: 'Variables' },
  { id: 'builder', label: 'Builder' },
  { id: 'preview', label: 'Preview' },
  { id: 'publish', label: 'Publish' },
];

// ─── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_TEMPLATE = `You are {{role}}. Write a {{tone}} blog post about {{topic}}.

The post should be approximately {{length}} words and include:
- An engaging introduction
- At least 3 key points
- A actionable conclusion

Avoid: {{banned_topics}}.

Output format: {{output_format}}.`;

const INITIAL_SPECS: VariableSpec[] = [
  { name: 'role', type: 'string', description: 'The persona to adopt', required: true },
  { name: 'tone', type: 'enum', description: 'Writing tone', enumValues: ['formal', 'casual', 'friendly', 'technical'] },
  { name: 'topic', type: 'string', description: 'Main subject of the post', required: true },
  { name: 'length', type: 'number', description: 'Approximate word count', min: 50, max: 5000 },
  { name: 'banned_topics', type: 'string', description: 'Topics to avoid' },
  { name: 'output_format', type: 'enum', description: 'Desired output format', enumValues: ['markdown', 'html', 'text'] },
];

const INITIAL_CONSTRAINTS: ConstraintSpec = {
  maxTokens: 1024,
  temperature: 0.7,
  outputFormat: 'markdown',
  requiredFacts: [],
  bannedTopics: [],
};

const INITIAL_SNAPSHOT = INITIAL_TEMPLATE;

// ─── Main Component ────────────────────────────────────────────────────────────

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();

  // Editor state
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [title, setTitle] = useState('My Blog Post Generator');
  const [template, setTemplate] = useState(INITIAL_TEMPLATE);
  const [specs, setSpecs] = useState<VariableSpec[]>(INITIAL_SPECS);
  const [constraints, setConstraints] = useState<ConstraintSpec>(INITIAL_CONSTRAINTS);
  const [snapshot] = useState(INITIAL_SNAPSHOT);

  // Workflow state
  type WorkflowState = 'draft' | 'review' | 'published';
  const [workflowState, setWorkflowState] = useState<WorkflowState>('draft');

  // Autosave
  type AutosaveStatus = 'idle' | 'pending' | 'saved' | 'error';
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lint
  const [lintResult, setLintResult] = useState<LintResult | null>(null);

  // Diff
  const [diffResult, setDiffResult] = useState<TemplateDiff | null>(null);

  // Preview values
  const [previewValues, setPreviewValues] = useState<Record<string, string>>({
    role: 'a tech blogger',
    tone: 'friendly',
    topic: 'artificial intelligence',
    length: '300',
    banned_topics: 'politics, religion',
    output_format: 'markdown',
  });
  const [previewRendered, setPreviewRendered] = useState('');

  // ── Constraint CRUD ─────────────────────────────────────────────────────────
  function addBannedTopic() {
    setConstraints(prev => ({
      ...prev,
      bannedTopics: [...(prev.bannedTopics ?? []), ''],
    }));
  }

  function removeBannedTopic(i: number) {
    setConstraints(prev => ({
      ...prev,
      bannedTopics: (prev.bannedTopics ?? []).filter((_, idx) => idx !== i),
    }));
  }

  function updateBannedTopic(i: number, val: string) {
    setConstraints(prev => ({
      ...prev,
      bannedTopics: (prev.bannedTopics ?? []).map((v, idx) => idx === i ? val : v),
    }));
  }

  function addRequiredFact() {
    setConstraints(prev => ({
      ...prev,
      requiredFacts: [...(prev.requiredFacts ?? []), ''],
    }));
  }

  function removeRequiredFact(i: number) {
    setConstraints(prev => ({
      ...prev,
      requiredFacts: (prev.requiredFacts ?? []).filter((_, idx) => idx !== i),
    }));
  }

  function updateRequiredFact(i: number, val: string) {
    setConstraints(prev => ({
      ...prev,
      requiredFacts: (prev.requiredFacts ?? []).map((v, idx) => idx === i ? val : v),
    }));
  }

  // ── Lint whenever template/specs/constraints change ─────────────────────────
  const runLint = useCallback(() => {
    const result = lintPrompt(template, specs, constraints);
    setLintResult(result);
  }, [template, specs, constraints]);

  // ── Diff whenever template changes ──────────────────────────────────────────
  const runDiff = useCallback(() => {
    const result = diffTemplates(snapshot, template, INITIAL_SPECS, specs);
    setDiffResult(result);
  }, [snapshot, template, specs]);

  // ── Autosave with 30s debounce ─────────────────────────────────────────────
  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setAutosaveStatus('pending');
    autosaveTimer.current = setTimeout(() => {
      setAutosaveStatus('saved');
      setLastSaved(new Date());
    }, 30_000);
  }, []);

  // Watch all editor fields for changes
  useEffect(() => {
    triggerAutosave();
    runLint();
    runDiff();
  }, [template, specs, constraints, title, triggerAutosave, runLint, runDiff]);

  // ── Variable extraction from template ──────────────────────────────────────
  function handleAutoExtract() {
    const vars = extractVariables(template);
    const newSpecs: VariableSpec[] = [];
    for (const name of vars) {
      const existing = specs.find(s => s.name === name);
      newSpecs.push(existing ?? { name, type: 'string' });
    }
    setSpecs(newSpecs);
  }

  // ── Spec CRUD ───────────────────────────────────────────────────────────────
  function addSpec() {
    const name = `var_${Date.now()}`;
    setSpecs(prev => [...prev, { name, type: 'string' }]);
  }

  function removeSpec(name: string) {
    setSpecs(prev => prev.filter(s => s.name !== name));
  }

  function updateSpec(name: string, patch: Partial<VariableSpec>) {
    setSpecs(prev => prev.map(s => s.name === name ? { ...s, ...patch } : s));
  }

  function moveSpec(name: string, dir: 'up' | 'down') {
    setSpecs(prev => {
      const idx = prev.findIndex(s => s.name === name);
      if (idx < 0) return prev;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }

  // ── Preview render ───────────────────────────────────────────────────────────
  function handlePreviewRender() {
    const rendered = applyVariables(template, previewValues);
    setPreviewRendered(rendered);
  }

  useEffect(() => {
    // Auto-render preview when values change
    const rendered = applyVariables(template, previewValues);
    setPreviewRendered(rendered);
  }, [template, previewValues]);

  // ── Workflow transitions ─────────────────────────────────────────────────────
  function advanceWorkflow() {
    if (workflowState === 'draft') setWorkflowState('review');
    else if (workflowState === 'review') setWorkflowState('published');
  }

  // ── Segment renderer for diff ────────────────────────────────────────────────
  function renderDiffSegments(segments: DiffSegment[]) {
    return segments.map((seg, i) => {
      if (seg.type === 'unchanged') return <span key={i} className="text-muted-foreground">{seg.content}</span>;
      if (seg.type === 'added') return <span key={i} className="bg-green-100 text-green-800">{seg.content}</span>;
      if (seg.type === 'removed') return <span key={i} className="bg-red-100 text-red-800 line-through">{seg.content}</span>;
      return <span key={i} className="bg-yellow-100 text-yellow-800">{seg.content}</span>;
    });
  }

  const lintIssues = lintResult?.ruleResults.filter(r => !r.passed) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Top Navigation ─────────────────────────────────────────────────────── */}
      <nav className="border-b px-6 py-3 flex items-center justify-between bg-background shrink-0">
        <Link href="/" className="font-bold text-xl text-primary">PromptForge Studio</Link>
        <div className="flex gap-4 items-center">
          <Link href="/browse" className="text-sm hover:text-primary">Explore</Link>
          <Link href="/dashboard" className="text-sm hover:text-primary">Dashboard</Link>
          <span className="text-xs text-muted-foreground">ID: {id}</span>
          {/* Autosave indicator */}
          <span className="text-xs px-2 py-1 rounded bg-muted">
            {autosaveStatus === 'pending' && '⏳ Saving…'}
            {autosaveStatus === 'saved' && `✅ Saved ${lastSaved ? lastSaved.toLocaleTimeString() : ''}`}
            {autosaveStatus === 'idle' && '○ Auto-save on'}
            {autosaveStatus === 'error' && '❌ Save failed'}
          </span>
        </div>
      </nav>

      {/* ── Workflow Banner ───────────────────────────────────────────────────── */}
      <div className="px-6 py-2 flex items-center gap-3 text-sm bg-muted/50 border-b shrink-0">
        <span className="font-medium">Status:</span>
        <Badge
          label={workflowState === 'draft' ? '🟡 Draft' : workflowState === 'review' ? '🔵 In Review' : '🟢 Published'}
          cls={workflowState === 'draft' ? 'bg-yellow-100 text-yellow-800' : workflowState === 'review' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
        />
        {workflowState === 'draft' && (
          <button onClick={advanceWorkflow} className="ml-auto px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
            Submit for Review →
          </button>
        )}
        {workflowState === 'review' && (
          <button onClick={advanceWorkflow} className="ml-auto px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
            Publish ✅
          </button>
        )}
        {workflowState === 'published' && (
          <span className="ml-auto text-xs text-green-700 font-medium">Template is live!</span>
        )}
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────────── */}
      <div className="px-6 border-b bg-background shrink-0">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — editor area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* ── TAB: Basic ─────────────────────────────────────────────────────── */}
          {activeTab === 'basic' && (
            <div className="max-w-3xl space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border rounded-lg px-4 py-3 bg-background"
                  placeholder="Prompt title…"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Template</label>
                  <button
                    onClick={handleAutoExtract}
                    className="text-xs px-3 py-1.5 border rounded hover:bg-muted transition-colors"
                  >
                    🔍 Auto-extract variables
                  </button>
                </div>
                <PromptEditor
                  value={template}
                  onChange={setTemplate}
                  placeholder="Enter your prompt template with {{variables}}…"
                  minHeight="16rem"
                />
              </div>

              {/* Lint summary strip */}
              {lintResult && (
                <div className={`rounded-lg p-4 border ${lintResult.overall === 'pass' ? 'border-green-200 bg-green-50' : lintResult.overall === 'warn' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${scoreColor(lintResult.score)}`}>{lintResult.score}</span>
                    <div>
                      <p className="text-sm font-medium capitalize">{lintResult.overall}</p>
                      <p className="text-xs text-muted-foreground">{lintResult.ruleResults.filter(r => r.passed).length}/{lintResult.ruleResults.length} rules passed</p>
                    </div>
                    {lintIssues.length > 0 && (
                      <ul className="ml-4 text-xs space-y-0.5">
                        {lintIssues.map(iss => (
                          <li key={iss.rule} className={iss.penalty >= 15 ? 'text-red-700' : 'text-yellow-700'}>
                            • {iss.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Variables ─────────────────────────────────────────────────── */}
          {activeTab === 'variables' && (
            <div className="max-w-3xl space-y-6">
              <VariableListEditor
                specs={specs}
                onAdd={(spec) => {
                  // When auto-extract adds, it calls setSpecs directly.
                  // For inline add via this callback, we add to specs.
                  setSpecs(prev => {
                    if (prev.some(s => s.name === spec.name)) return prev;
                    return [...prev, spec];
                  });
                }}
                onRemove={removeSpec}
                onUpdate={updateSpec}
                onReorder={(reordered) => setSpecs(reordered)}
              />
            </div>
          )}

          {/* ── TAB: Builder ───────────────────────────────────────────────────── */}
          {activeTab === 'builder' && (
            <div className="max-w-3xl space-y-6">
              <ConstraintBuilder
                constraints={constraints}
                onChange={setConstraints}
              />

              {/* Lint panel */}
              {lintResult && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-3">Lint Panel</h3>
                  <div className="space-y-2">
                    {lintResult.ruleResults.map(r => (
                      <div key={r.rule} className={`flex items-start gap-2 text-sm ${r.passed ? '' : 'text-destructive'}`}>
                        <span>{r.passed ? '✅' : '❌'}</span>
                        <div>
                          <span className="font-medium">{r.rule}</span>
                          <p className="text-xs text-muted-foreground">{r.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Preview ───────────────────────────────────────────────────── */}
          {activeTab === 'preview' && (
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Preview with Sample Values</h2>
              </div>

              {/* TemplatePreviewRenderer: variable inputs + rendered output */}
              <TemplatePreviewRenderer
                template={template}
                values={previewValues as Record<string, string>}
                onChange={setPreviewValues as (values: Record<string, string>) => void}
              />
            </div>
          )}

          {/* ── TAB: Publish ───────────────────────────────────────────────────── */}
          {activeTab === 'publish' && (
            <div className="max-w-3xl space-y-6">
              <h2 className="text-lg font-semibold">Version & Publish</h2>

              {/* Diff view */}
              {diffResult && (
                <div className="border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Changes vs. Initial Version</h3>
                    <div className="flex gap-2 items-center">
                      {diffResult.contentChanged
                        ? <Badge label="Modified" cls="bg-yellow-100 text-yellow-800" />
                        : <Badge label="Unchanged" cls="bg-gray-100 text-gray-600" />
                      }
                      <span className={`text-sm font-bold ${scoreColor(diffResult.score)}`}>{diffResult.score}% similar</span>
                    </div>
                  </div>

                  {diffResult.variablesAdded.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-green-700">Added variables: </span>
                      {diffResult.variablesAdded.map(v => (
                        <span key={v} className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded mr-1">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}
                  {diffResult.variablesRemoved.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-red-700">Removed variables: </span>
                      {diffResult.variablesRemoved.map(v => (
                        <span key={v} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded mr-1 line-through">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 border rounded p-3 bg-muted/40 font-mono text-sm whitespace-pre-wrap">
                    {renderDiffSegments(diffResult.segments)}
                  </div>
                </div>
              )}

              {/* Publish workflow summary */}
              <div className="border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold">Workflow Summary</h3>
                <div className="flex gap-2 items-center">
                  <Badge
                    label={workflowState === 'draft' ? '🟡 Draft' : workflowState === 'review' ? '🔵 In Review' : '🟢 Published'}
                    cls={workflowState === 'draft' ? 'bg-yellow-100 text-yellow-800' : workflowState === 'review' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                  />
                  <span className="text-sm text-muted-foreground">
                    {workflowState === 'draft' && 'Changes are saved locally. Submit for review to publish.'}
                    {workflowState === 'review' && 'Awaiting approval. Publish to make it available.'}
                    {workflowState === 'published' && 'Template is live and available to users.'}
                  </span>
                </div>

                <div className="pt-2 flex gap-3">
                  {workflowState === 'draft' && (
                    <button onClick={advanceWorkflow} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                      Submit for Review
                    </button>
                  )}
                  {workflowState === 'review' && (
                    <button onClick={advanceWorkflow} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                      Publish Template
                    </button>
                  )}
                  {workflowState === 'published' && (
                    <span className="text-sm text-green-700 font-medium">✅ This template is published!</span>
                  )}
                  <button
                    onClick={() => { setWorkflowState('draft'); }}
                    className="px-4 py-2 border rounded-lg text-sm hover:bg-muted"
                  >
                    Reset to Draft
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="border rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold">Template Metadata</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Template ID:</span> <span className="font-mono">{id}</span></div>
                  <div><span className="text-muted-foreground">Variables:</span> <span>{specs.length}</span></div>
                  <div><span className="text-muted-foreground">Lint Score:</span> <span className={scoreColor(lintResult?.score ?? 0)}>{lintResult?.score ?? '—'}/100</span></div>
                  <div><span className="text-muted-foreground">Last saved:</span> <span>{lastSaved ? lastSaved.toLocaleString() : 'Not yet saved'}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar: always-visible lint panel ────────────────────────── */}
        <div className="w-80 border-l bg-muted/20 overflow-y-auto shrink-0 p-5 hidden lg:block">
          <h3 className="text-sm font-bold mb-3">🔍 Lint Results</h3>
          {lintResult ? (
            <div className="space-y-3">
              <div className="text-center">
                <span className={`text-4xl font-bold ${scoreColor(lintResult.score)}`}>{lintResult.score}</span>
                <p className="text-xs text-muted-foreground mt-1">/ 100</p>
                <Badge
                  label={lintResult.overall}
                  cls={lintResult.overall === 'pass' ? 'bg-green-100 text-green-800' : lintResult.overall === 'warn' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}
                />
              </div>
              <div className="space-y-2">
                {lintResult.ruleResults.map(r => (
                  <div key={r.rule} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <span>{r.passed ? '✅' : '❌'}</span>
                      <span className="font-medium">{r.rule}</span>
                      {r.penalty > 0 && <span className="text-red-500 ml-auto">-{r.penalty}</span>}
                    </div>
                    <p className="text-muted-foreground ml-5">{r.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Run lint to see results.</p>
          )}

          {/* Quick variables summary */}
          <h3 className="text-sm font-bold mt-6 mb-2">📦 Variables ({specs.length})</h3>
          <div className="space-y-1">
            {specs.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{`{{${s.name}}}`}</span>
                <span className="text-muted-foreground truncate">{s.type}</span>
                {s.required && <span className="text-red-500 ml-auto">*</span>}
              </div>
            ))}
            {specs.length === 0 && <p className="text-xs text-muted-foreground">No variables defined.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
