/**
 * ConstraintBuilder Component
 *
 * Type-selector + value-input builder for anti-failure constraints.
 * Supports: maxTokens (number), temperature (number 0-2), outputFormat (select),
 * bannedTopics (dynamic string list), requiredFacts (dynamic string list).
 * No new npm dependencies. 'use client' — uses React hooks.
 */

'use client';

import React, { useState, useCallback } from 'react';
import type { ConstraintSpec } from '@/lib/prompt-as-code';

// ─── Constraint type registry ─────────────────────────────────────────────────

export type ConstraintType = 'maxTokens' | 'temperature' | 'outputFormat' | 'bannedTopics' | 'requiredFacts';

interface ConstraintTypeConfig {
  type: ConstraintType;
  label: string;
  description: string;
  inputType: 'number' | 'select' | 'string-list';
  numberProps?: { min?: number; max?: number; step?: number; placeholder?: string };
  selectOptions?: Array<{ value: string; label: string }>;
}

export const CONSTRAINT_TYPES: ConstraintTypeConfig[] = [
  {
    type: 'maxTokens',
    label: 'Max Tokens',
    description: 'Maximum number of tokens in the generated response (1–128000).',
    inputType: 'number',
    numberProps: { min: 1, max: 128000, placeholder: 'e.g. 1024' },
  },
  {
    type: 'temperature',
    label: 'Temperature',
    description: 'Controls randomness. Lower = focused, higher = creative (0.0–2.0).',
    inputType: 'number',
    numberProps: { min: 0, max: 2, step: 0.1, placeholder: 'e.g. 0.7' },
  },
  {
    type: 'outputFormat',
    label: 'Output Format',
    description: 'Expected format of the generated response.',
    inputType: 'select',
    selectOptions: [
      { value: 'text', label: 'Plain Text' },
      { value: 'json', label: 'JSON' },
      { value: 'markdown', label: 'Markdown' },
      { value: 'xml', label: 'XML' },
    ],
  },
  {
    type: 'bannedTopics',
    label: 'Banned Topics',
    description: 'Topics the AI must not mention or address.',
    inputType: 'string-list',
  },
  {
    type: 'requiredFacts',
    label: 'Required Facts',
    description: 'Facts or statements the AI must include in the response.',
    inputType: 'string-list',
  },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface ConstraintBuilderProps {
  constraints: ConstraintSpec;
  onChange: (updated: ConstraintSpec) => void;
}

// ─── Single constraint row ────────────────────────────────────────────────────

function ConstraintRow({
  config,
  value,
  onChange,
}: {
  config: ConstraintTypeConfig;
  value: unknown;
  onChange: (updated: ConstraintSpec) => void;
}) {
  const [adding, setAdding] = useState('');
  const listValue = Array.isArray(value) ? value : [];

  function applyNumber(val: string, patch: Partial<ConstraintSpec>) {
    const num = val === '' ? undefined : Number(val);
    onChange(patch);
    void num; // suppress unused — Number() is called to validate
  }

  function applyString(val: string, patch: Partial<ConstraintSpec>) {
    onChange(patch);
    void val;
  }

  function applySelect(val: string, patch: Partial<ConstraintSpec>) {
    onChange(patch);
    void val;
  }

  function addListItem() {
    const trimmed = adding.trim();
    if (!trimmed) return;
    onChange({ [config.type]: [...listValue, trimmed] } as ConstraintSpec);
    setAdding('');
  }

  function removeListItem(i: number) {
    onChange({ [config.type]: listValue.filter((_: unknown, idx: number) => idx !== i) } as ConstraintSpec);
  }

  function updateListItem(i: number, val: string) {
    onChange({ [config.type]: listValue.map((v: string, idx: number) => idx === i ? val : v) } as ConstraintSpec);
  }

  return (
    <div className="border rounded-xl p-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-medium text-sm">{config.label}</span>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        <button
          onClick={() => onChange({ [config.type]: undefined } as ConstraintSpec)}
          className="text-xs px-2 py-1 border border-red-300 text-red-500 rounded hover:bg-red-50"
          aria-label={`Remove ${config.label} constraint`}
          title="Remove constraint"
        >
          ✕
        </button>
      </div>

      {/* Input */}
      {config.inputType === 'number' && (
        <input
          type="number"
          value={value !== undefined ? String(value) : ''}
          onChange={e => {
            const v = e.target.value;
            if (v === '') {
              onChange({ [config.type]: undefined } as ConstraintSpec);
            } else {
              onChange({ [config.type]: Number(v) } as ConstraintSpec);
            }
          }}
          className="w-full border rounded px-3 py-2 text-sm bg-background"
          min={config.numberProps?.min}
          max={config.numberProps?.max}
          step={config.numberProps?.step}
          placeholder={config.numberProps?.placeholder}
          aria-label={`${config.label} value`}
        />
      )}

      {config.inputType === 'select' && (
        <select
          value={value !== undefined ? String(value) : ''}
          onChange={e => onChange({ [config.type]: e.target.value } as ConstraintSpec)}
          className="w-full border rounded px-3 py-2 text-sm bg-background"
          aria-label={`${config.label} value`}
        >
          <option value="">— not specified —</option>
          {config.selectOptions?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {config.inputType === 'string-list' && (
        <div className="space-y-2">
          {listValue.map((item: string, i: number) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={e => updateListItem(i, e.target.value)}
                className="flex-1 border rounded px-2 py-1.5 text-sm bg-background"
                placeholder={`${config.label} item`}
                aria-label={`${config.label} item ${i + 1}`}
              />
              <button
                onClick={() => removeListItem(i)}
                className="text-red-500 text-xs px-2 hover:bg-red-50 rounded"
                aria-label={`Remove ${config.label} item ${i + 1}`}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={adding}
              onChange={e => setAdding(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addListItem(); } }}
              className="flex-1 border rounded px-2 py-1.5 text-sm bg-background"
              placeholder={`Add ${config.label.toLowerCase()}…`}
              aria-label={`Add ${config.label.toLowerCase()}`}
            />
            <button
              onClick={addListItem}
              className="text-xs px-3 py-1.5 border rounded hover:bg-muted"
              aria-label={`Add ${config.label}`}
            >
              + Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConstraintBuilder({ constraints, onChange }: ConstraintBuilderProps) {
  // Which constraint types are currently configured
  const activeTypes = CONSTRAINT_TYPES.filter(c => {
    const val = constraints[c.type as keyof ConstraintSpec];
    if (val === undefined) return false;
    if (Array.isArray(val)) return val.length > 0;
    // For string/number fields, any non-undefined value counts as active
    return true;
  });

  // Which constraint types are available to add
  const availableTypes = CONSTRAINT_TYPES.filter(c => {
    const val = constraints[c.type as keyof ConstraintSpec];
    if (val === undefined) return true;
    if (Array.isArray(val)) return val.length === 0;
    return false;
  });

  const handleAddType = useCallback((type: ConstraintType) => {
    const defaults: Partial<ConstraintSpec> = {
      maxTokens: undefined,
      temperature: undefined,
      outputFormat: undefined,
      bannedTopics: [],
      requiredFacts: [],
    };
    onChange({ ...constraints, ...defaults, [type]: defaults[type as keyof typeof defaults] });
  }, [constraints, onChange]);

  return (
    <div className="constraint-builder space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Anti-Failure Constraints</h2>
        <span className="text-xs text-muted-foreground">
          {activeTypes.length} active
        </span>
      </div>

      {/* Active constraint rows */}
      {activeTypes.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed rounded-lg">
          No constraints set. Add one below.
        </p>
      )}

      <div className="space-y-3">
        {activeTypes.map(config => (
          <ConstraintRow
            key={config.type}
            config={config}
            value={constraints[config.type as keyof ConstraintSpec]}
            onChange={onChange}
          />
        ))}
      </div>

      {/* Add constraint type selector */}
      {availableTypes.length > 0 && (
        <div className="border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-3">Add constraint:</p>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map(config => (
              <button
                key={config.type}
                onClick={() => handleAddType(config.type)}
                className="text-xs px-3 py-1.5 border border-primary/40 text-primary rounded-lg hover:bg-primary/10 transition-colors"
                aria-label={`Add ${config.label} constraint`}
              >
                + {config.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
