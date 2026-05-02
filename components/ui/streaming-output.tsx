'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/ui';

export type StreamingStatus = 'idle' | 'streaming' | 'completed' | 'error';

export interface StreamingMetadata {
  provider?: string;
  model?: string;
  isMock?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface StreamingOutputProps {
  /** The accumulated text streamed so far */
  text: string;
  /** Current component status */
  status: StreamingStatus;
  /** Error message when status === 'error' */
  errorMessage?: string | null;
  /** Metadata from the completed generation */
  metadata?: StreamingMetadata | null;
  /** CSS class for the container */
  className?: string;
  /** Whether to auto-scroll to bottom as text arrives (default: true) */
  autoScroll?: boolean;
}

/**
 * StreamingOutput displays real-time streaming generation output with clear
 * state transitions: idle → streaming → completed/error.
 *
 * States:
 *   - idle:    renders nothing (invisible container)
 *   - streaming: shows live accumulating text + animated "Generating..." indicator
 *   - completed: shows final text + metadata (provider, model, token count)
 *   - error:   shows error message in red
 *
 * Usage:
 *   <StreamingOutput
 *     text={streamingText}
 *     status={isLoading ? 'streaming' : result ? 'completed' : error ? 'error' : 'idle'}
 *     errorMessage={error}
 *     metadata={result}
 *   />
 */
export function StreamingOutput({
  text,
  status,
  errorMessage,
  metadata,
  className,
  autoScroll = true,
}: StreamingOutputProps) {
  const scrollRef = useRef<HTMLPreElement>(null);

  // Auto-scroll to bottom as new tokens arrive during streaming
  useEffect(() => {
    if (autoScroll && status === 'streaming' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text, status, autoScroll]);

  if (status === 'idle') {
    return null;
  }

  return (
    <section
      className={cn(
        'bg-white rounded-lg border p-4 space-y-3',
        className
      )}
      aria-live="polite"
      aria-label="Generation output"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-700">
          {status === 'streaming' && 'Streaming Output'}
          {status === 'completed' && 'Generated Output'}
          {status === 'error' && 'Generation Error'}
        </h2>

        {/* Metadata badges (completed only) */}
        {status === 'completed' && metadata && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {metadata.isMock && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                DEMO MODE
              </span>
            )}
            {metadata.provider && (
              <span className="text-xs text-gray-400">
                {metadata.provider}
                {metadata.model ? ` · ${metadata.model}` : ''}
              </span>
            )}
            {metadata.usage && (
              <span className="text-xs text-gray-400">
                tokens: {metadata.usage.totalTokens}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm text-red-700">{errorMessage || 'Generation failed'}</p>
        </div>
      )}

      {/* Text output (streaming or completed) */}
      {(status === 'streaming' || status === 'completed') && (
        <>
          <pre
            ref={scrollRef}
            className={cn(
              'text-sm whitespace-pre-wrap text-gray-800 bg-gray-50 rounded p-3 max-h-96 overflow-y-auto',
              status === 'streaming' && 'min-h-[3rem]'
            )}
          >
            {text || (status === 'streaming' ? '' : '')}
          </pre>

          {/* Streaming indicator */}
          {status === 'streaming' && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
              </div>
              <p className="text-xs text-gray-400 animate-pulse">Generating...</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
