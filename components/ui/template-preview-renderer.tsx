/**
 * TemplatePreviewRenderer Component
 *
 * Renders a filled prompt by substituting {{variable}} placeholders
 * with provided values. Shows the variable input form + rendered output.
 *
 * Uses `applyVariables()` from `@/lib/prompt-as-code` — no new npm dependencies.
 * 'use client' — requires React hooks.
 */

'use client';

import React, { useId } from 'react';
import { applyVariables, extractVariables } from '@/lib/prompt-as-code';

export interface VariableValues {
  [variableName: string]: string;
}

// ─── Rendered Output Sub-component ─────────────────────────────────────────

interface RenderedOutputProps {
  content: string;
  className?: string;
}

export function RenderedOutput({ content, className = '' }: RenderedOutputProps) {
  return (
    <div className={`template-preview-output border rounded-xl p-5 bg-muted/30 ${className}`}>
      <h3 className="text-sm font-semibold mb-3">Rendered Output</h3>
      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed break-words">
        {content}
      </pre>
    </div>
  );
}

// ─── Variable Input Grid Sub-component ────────────────────────────────────

interface VariableInputGridProps {
  template: string;
  values: VariableValues;
  onChange: (values: VariableValues) => void;
  className?: string;
}

export function VariableInputGrid({
  template,
  values,
  onChange,
  className = '',
}: VariableInputGridProps) {
  const vars = extractVariables(template);
  const baseId = useId();

  if (vars.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No {'{{'}variables{'}}'} found in template.
      </p>
    );
  }

  return (
    <div className={`variable-input-grid space-y-3 ${className}`}>
      {vars.map(varName => (
        <div key={varName} className="border rounded-lg p-3">
          <label
            htmlFor={`${baseId}-${varName}`}
            className="text-xs text-muted-foreground block mb-1 font-mono"
          >
            {`{{${varName}}}`}
          </label>
          <input
            id={`${baseId}-${varName}`}
            type="text"
            value={values[varName] ?? ''}
            onChange={e => onChange({ ...values, [varName]: e.target.value })}
            className="w-full border rounded px-2 py-1.5 text-sm bg-background"
            placeholder={`Enter ${varName}…`}
            aria-label={`Value for {{${varName}}}`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export interface TemplatePreviewRendererProps {
  /** The template text with {{variable}} placeholders */
  template: string;
  /** Current variable values keyed by variable name */
  values: VariableValues;
  /** Called when any variable value changes */
  onChange: (values: VariableValues) => void;
  /** Optional override for rendered output component */
  renderOutput?: (content: string) => React.ReactNode;
  /** Additional class for the output container */
  outputClassName?: string;
  /** Additional class for the input grid container */
  inputClassName?: string;
}

/**
 * TemplatePreviewRenderer
 *
 * Renders a variable input form + the filled prompt output.
 * Automatically extracts variables from the template and maps them
 * to editable inputs. Unfilled variables are preserved as `{{var}}` in output.
 */
export function TemplatePreviewRenderer({
  template,
  values,
  onChange,
  renderOutput,
  outputClassName = '',
  inputClassName = '',
}: TemplatePreviewRendererProps) {
  const rendered = applyVariables(template, values);

  return (
    <div className="template-preview-renderer space-y-4">
      <VariableInputGrid
        template={template}
        values={values}
        onChange={onChange}
        className={inputClassName}
      />

      {renderOutput
        ? renderOutput(rendered)
        : <RenderedOutput content={rendered} className={outputClassName} />}
    </div>
  );
}

// ─── Pure render function (no state) ───────────────────────────────────────

/**
 * Pure function: fills a template with values and returns the rendered text.
 * Useful for server-side rendering or testing without a React component.
 */
export function renderTemplate(
  template: string,
  values: VariableValues
): string {
  return applyVariables(template, values);
}