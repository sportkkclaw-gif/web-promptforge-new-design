/**
 * PromptEditor Component
 *
 * A textarea-based prompt editor with {{variable}} syntax highlighting.
 * Uses a transparent textarea overlaid on a styled highlight layer —
 * no new npm dependencies required.
 */

'use client';

import React, { useRef, useEffect, useCallback } from 'react';

// ─── Highlight Layer ─────────────────────────────────────────────────────────

/**
 * Highlight {{variable}} tokens in prompt text.
 * Returns an array of React nodes where tokens are wrapped in a styled span.
 * Plain text segments are preserved as text nodes.
 */
export function highlightPromptVariables(text: string): React.ReactNode[] {
  const regex = /(\{\{[^}]*\}\})/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (regex.test(part)) {
      // Reset regex state
      regex.lastIndex = 0;
      return (
        <span key={i} className="prompt-var-token">
          {part}
        </span>
      );
    }
    // Preserve newlines as <br /> for the highlight layer
    return <span key={i}>{part}</span>;
  });
}

// ─── PromptEditor Component ──────────────────────────────────────────────────

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  'aria-label'?: string;
}

export function PromptEditor({
  value,
  onChange,
  placeholder = 'Enter your prompt template with {{variables}}…',
  minHeight = '16rem',
  className = '',
  'aria-label': ariaLabel = 'Prompt template editor',
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and highlight layer
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Sync height of highlight layer to match textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const syncHeight = () => {
      if (highlightRef.current) {
        highlightRef.current.style.height = `${textarea.scrollHeight}px`;
      }
    };

    // Initial sync
    syncHeight();

    // Use ResizeObserver for dynamic content changes
    const observer = new ResizeObserver(syncHeight);
    observer.observe(textarea);

    return () => observer.disconnect();
  }, []);

  const highlightedContent = highlightPromptVariables(value);

  return (
    <div className={`prompt-editor-wrapper relative ${className}`}>
      {/* Highlight layer — rendered behind the transparent textarea */}
      <div
        ref={highlightRef}
        aria-hidden="true"
        className="prompt-editor-highlight absolute inset-0 overflow-hidden pointer-events-none whitespace-pre-wrap break-words font-mono text-sm leading-relaxed"
        style={{ minHeight }}
      >
        {highlightedContent}
      </div>

      {/* Editable textarea — transparent so highlight shows through */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="prompt-editor-textarea relative z-10 w-full resize-none font-mono text-sm leading-relaxed bg-transparent border border-input rounded-lg px-4 py-3 text-transparent caret-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        style={{ minHeight, lineHeight: '1.625' }}
      />
    </div>
  );
}