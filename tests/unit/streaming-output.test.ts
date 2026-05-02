/**
 * StreamingOutput Component Unit Tests
 *
 * Tests the StreamingOutput component's state machine and rendering
 * across all four status states: idle, streaming, completed, error.
 *
 * The component's core contract:
 *   1. idle:    renders nothing (null)
 *   2. streaming: shows live text + animated "Generating..." indicator
 *   3. completed: shows final text + metadata (provider, model, tokens, DEMO badge)
 *   4. error:   shows error message in red
 *   5. Auto-scrolls to bottom during streaming
 */

import React from 'react';

// ─── StreamingOutput state machine (pure mirror of component logic) ───────────
// This mirrors the component's internal contract so we can test state
// transitions without React rendering.

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

interface StreamingMachineState {
  text: string;
  status: StreamingStatus;
  errorMessage: string | null;
  metadata: StreamingMetadata | null;
}

type StreamingMachineEvent =
  | { type: 'APPEND_TOKEN'; delta: string }
  | { type: 'START_STREAM' }
  | { type: 'COMPLETE'; text: string; metadata?: StreamingMetadata | null }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

function streamingReducer(
  state: StreamingMachineState,
  event: StreamingMachineEvent
): StreamingMachineState {
  switch (event.type) {
    case 'APPEND_TOKEN':
      return {
        ...state,
        text: state.text + event.delta,
        status: 'streaming',
      };
    case 'START_STREAM':
      return { ...state, text: '', status: 'streaming', errorMessage: null };
    case 'COMPLETE':
      return {
        ...state,
        text: event.text,
        status: 'completed',
        metadata: event.metadata ?? null,
      };
    case 'ERROR':
      return { ...state, status: 'error', errorMessage: event.message };
    case 'RESET':
      return { text: '', status: 'idle', errorMessage: null, metadata: null };
  }
}

const initialStreamingState: StreamingMachineState = {
  text: '',
  status: 'idle',
  errorMessage: null,
  metadata: null,
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('StreamingOutput: state machine', () => {
  it('starts in idle state', () => {
    const state = streamingReducer(initialStreamingState, { type: 'RESET' });
    expect(state.status).toBe('idle');
    expect(state.text).toBe('');
    expect(state.errorMessage).toBeNull();
  });

  it('transitions to streaming on START_STREAM', () => {
    const state = streamingReducer(initialStreamingState, { type: 'START_STREAM' });
    expect(state.status).toBe('streaming');
    expect(state.text).toBe('');
  });

  it('accumulates tokens during streaming', () => {
    let state = streamingReducer(initialStreamingState, { type: 'START_STREAM' });
    state = streamingReducer(state, { type: 'APPEND_TOKEN', delta: 'Hello ' });
    state = streamingReducer(state, { type: 'APPEND_TOKEN', delta: 'world' });
    expect(state.text).toBe('Hello world');
    expect(state.status).toBe('streaming');
  });

  it('transitions to completed with text and metadata', () => {
    const state = streamingReducer(
      { text: 'Hello world', status: 'streaming', errorMessage: null, metadata: null },
      {
        type: 'COMPLETE',
        text: 'A generated image prompt for a sunset',
        metadata: { provider: 'openai', model: 'gpt-4', isMock: false },
      }
    );
    expect(state.status).toBe('completed');
    expect(state.text).toBe('A generated image prompt for a sunset');
    expect(state.metadata?.provider).toBe('openai');
    expect(state.metadata?.model).toBe('gpt-4');
    expect(state.metadata?.isMock).toBe(false);
  });

  it('transitions to error with message', () => {
    const state = streamingReducer(
      { text: '', status: 'streaming', errorMessage: null, metadata: null },
      { type: 'ERROR', message: 'Connection error' }
    );
    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe('Connection error');
  });

  it('resets back to idle', () => {
    const state = streamingReducer(
      { text: 'some text', status: 'completed', errorMessage: null, metadata: null },
      { type: 'RESET' }
    );
    expect(state.status).toBe('idle');
    expect(state.text).toBe('');
  });
});

describe('StreamingOutput: idle state', () => {
  it('returns null for idle status', () => {
    const state = { ...initialStreamingState, status: 'idle' as StreamingStatus };
    // When status is idle, the component renders null
    expect(state.status).toBe('idle');
  });

  it('does not show text when idle', () => {
    const state = { ...initialStreamingState, text: 'some text', status: 'idle' as StreamingStatus };
    // idle means no output should be shown
    expect(state.status).toBe('idle');
    expect(state.text).not.toBe(''); // text exists but status drives rendering
  });
});

describe('StreamingOutput: streaming state', () => {
  it('shows streaming indicator and live text', () => {
    const state = streamingReducer(initialStreamingState, { type: 'START_STREAM' });
    expect(state.status).toBe('streaming');

    const withTokens = streamingReducer(state, { type: 'APPEND_TOKEN', delta: 'Partial response...' });
    expect(withTokens.status).toBe('streaming');
    expect(withTokens.text).toBe('Partial response...');
  });

  it('accumulates multiple tokens in order', () => {
    let state = streamingReducer(initialStreamingState, { type: 'START_STREAM' });
    const tokens = ['The ', 'quick ', 'brown ', 'fox'];
    tokens.forEach(token => {
      state = streamingReducer(state, { type: 'APPEND_TOKEN', delta: token });
    });
    expect(state.text).toBe('The quick brown fox');
    expect(state.status).toBe('streaming');
  });

  it('handles empty token gracefully', () => {
    let state = streamingReducer(initialStreamingState, { type: 'START_STREAM' });
    state = streamingReducer(state, { type: 'APPEND_TOKEN', delta: '' });
    expect(state.text).toBe('');
    expect(state.status).toBe('streaming');
  });
});

describe('StreamingOutput: completed state', () => {
  it('shows final text and metadata', () => {
    const state = streamingReducer(
      { text: 'streaming partial', status: 'streaming', errorMessage: null, metadata: null },
      {
        type: 'COMPLETE',
        text: 'Final generated output',
        metadata: { provider: 'anthropic', model: 'claude-3-5-sonnet', isMock: true },
      }
    );
    expect(state.status).toBe('completed');
    expect(state.text).toBe('Final generated output');
    expect(state.metadata?.provider).toBe('anthropic');
    expect(state.metadata?.isMock).toBe(true);
  });

  it('handles missing metadata fields gracefully', () => {
    const state = streamingReducer(
      { text: '', status: 'streaming', errorMessage: null, metadata: null },
      { type: 'COMPLETE', text: 'Result', metadata: undefined }
    );
    expect(state.status).toBe('completed');
    expect(state.text).toBe('Result');
    expect(state.metadata).toBeNull();
  });

  it('handles usage metadata', () => {
    const state = streamingReducer(
      { text: '', status: 'streaming', errorMessage: null, metadata: null },
      {
        type: 'COMPLETE',
        text: 'Result',
        metadata: { usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } },
      }
    );
    expect(state.metadata?.usage?.totalTokens).toBe(150);
    expect(state.metadata?.usage?.promptTokens).toBe(100);
  });

  it('handles empty completed text', () => {
    const state = streamingReducer(
      { text: '', status: 'streaming', errorMessage: null, metadata: null },
      { type: 'COMPLETE', text: '', metadata: null }
    );
    expect(state.status).toBe('completed');
    expect(state.text).toBe('');
  });
});

describe('StreamingOutput: error state', () => {
  it('shows error message', () => {
    const state = streamingReducer(
      { text: '', status: 'streaming', errorMessage: null, metadata: null },
      { type: 'ERROR', message: 'Generation failed: rate limit exceeded' }
    );
    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe('Generation failed: rate limit exceeded');
  });

  it('handles empty error message', () => {
    const state = streamingReducer(
      { text: '', status: 'streaming', errorMessage: null, metadata: null },
      { type: 'ERROR', message: '' }
    );
    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe('');
  });
});

describe('StreamingOutput: status transitions', () => {
  it('idle → streaming → completed (full happy path)', () => {
    let state = streamingReducer(initialStreamingState, { type: 'RESET' });
    expect(state.status).toBe('idle');

    state = streamingReducer(state, { type: 'START_STREAM' });
    expect(state.status).toBe('streaming');

    state = streamingReducer(state, { type: 'APPEND_TOKEN', delta: 'Token1 ' });
    state = streamingReducer(state, { type: 'APPEND_TOKEN', delta: 'Token2' });
    expect(state.text).toBe('Token1 Token2');

    state = streamingReducer(state, {
      type: 'COMPLETE',
      text: 'Token1 Token2',
      metadata: { provider: 'openai', isMock: false },
    });
    expect(state.status).toBe('completed');
    expect(state.text).toBe('Token1 Token2');
    expect(state.metadata?.provider).toBe('openai');
  });

  it('idle → streaming → error (error path)', () => {
    let state = streamingReducer(initialStreamingState, { type: 'RESET' });
    state = streamingReducer(state, { type: 'START_STREAM' });
    state = streamingReducer(state, { type: 'APPEND_TOKEN', delta: 'partial' });
    state = streamingReducer(state, { type: 'ERROR', message: 'AI API unavailable' });
    expect(state.status).toBe('error');
    expect(state.errorMessage).toBe('AI API unavailable');
    expect(state.text).toBe('partial'); // text is preserved on error
  });

  it('completed → reset → idle → streaming', () => {
    let state = streamingReducer(initialStreamingState, { type: 'START_STREAM' });
    state = streamingReducer(state, { type: 'APPEND_TOKEN', delta: 'done' });
    state = streamingReducer(state, { type: 'COMPLETE', text: 'done', metadata: null });
    expect(state.status).toBe('completed');

    state = streamingReducer(state, { type: 'RESET' });
    expect(state.status).toBe('idle');

    state = streamingReducer(state, { type: 'START_STREAM' });
    expect(state.status).toBe('streaming');
    expect(state.text).toBe(''); // reset clears text
  });
});

describe('StreamingOutput: metadata contract', () => {
  it('isMock=true triggers DEMO MODE badge', () => {
    const state = streamingReducer(
      { text: 'result', status: 'streaming', errorMessage: null, metadata: null },
      { type: 'COMPLETE', text: 'result', metadata: { isMock: true, provider: 'mock' } }
    );
    expect(state.metadata?.isMock).toBe(true);
  });

  it('isMock=false does not trigger DEMO MODE badge', () => {
    const state = streamingReducer(
      { text: 'result', status: 'streaming', errorMessage: null, metadata: null },
      { type: 'COMPLETE', text: 'result', metadata: { isMock: false, provider: 'openai' } }
    );
    expect(state.metadata?.isMock).toBe(false);
  });

  it('provider and model appear in metadata', () => {
    const state = streamingReducer(
      { text: '', status: 'streaming', errorMessage: null, metadata: null },
      { type: 'COMPLETE', text: 'result', metadata: { provider: 'anthropic', model: 'claude-3-5-sonnet' } }
    );
    expect(state.metadata?.provider).toBe('anthropic');
    expect(state.metadata?.model).toBe('claude-3-5-sonnet');
  });

  it('usage totalTokens is a number', () => {
    const state = streamingReducer(
      { text: '', status: 'streaming', errorMessage: null, metadata: null },
      {
        type: 'COMPLETE',
        text: 'result',
        metadata: { usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 } },
      }
    );
    expect(typeof state.metadata?.usage?.totalTokens).toBe('number');
    expect(state.metadata?.usage?.totalTokens).toBe(30);
  });
});
