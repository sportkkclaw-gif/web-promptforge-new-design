'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface CreditBalanceData {
  credits: number;
  username?: string;
}

interface CreditBalanceState {
  data: CreditBalanceData | null;
  loading: boolean;
  error: string | null;
}

interface CreditBalanceProps {
  /** Polling interval in ms. Defaults to 30000 (30s). Set to 0 to disable polling. */
  pollInterval?: number;
  /** Called when the component hits an error after initial load */
  onError?: (error: string) => void;
}

/**
 * CreditBalance displays the authenticated user's current credit balance
 * and updates it in near-real-time via polling.
 *
 * Usage:
 *   <CreditBalance />
 *   <CreditBalance pollInterval={15000} />
 */
export function CreditBalance({ pollInterval = 30000, onError }: CreditBalanceProps) {
  const [state, setState] = useState<CreditBalanceState>({
    data: null,
    loading: true,
    error: null,
  });

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const fetchBalance = useCallback(async (isMounted: boolean) => {
    try {
      const res = await fetch('/api/credits/balance');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error ?? `HTTP ${res.status}`;
        if (isMounted) {
          setState((prev) => ({ ...prev, loading: false, error: msg }));
          onErrorRef.current?.(msg);
        }
        return;
      }
      const json = await res.json();
      if (isMounted) {
        setState({ data: { credits: json.data?.credits ?? 0, username: json.data?.username }, loading: false, error: null });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch balance';
      if (isMounted) {
        setState((prev) => ({ ...prev, loading: false, error: msg }));
        onErrorRef.current?.(msg);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = () => {
      if (pollInterval <= 0) return;
      timer = setTimeout(async () => {
        if (cancelled) return;
        await fetchBalance(!cancelled);
        scheduleNext();
      }, pollInterval);
    };

    (async () => {
      await fetchBalance(!cancelled);
      if (!cancelled) scheduleNext();
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fetchBalance, pollInterval]);

  if (state.loading && !state.data) {
    return (
      <span aria-label="Loading credit balance" className="inline-block w-16 h-5 bg-muted animate-pulse rounded" />
    );
  }

  if (state.error && !state.data) {
    return (
      <span className="text-xs text-muted-foreground" title={state.error}>
        — credits
      </span>
    );
  }

  const credits = state.data?.credits ?? 0;

  return (
    <span aria-label={`${credits} credits available`} className="font-medium tabular-nums">
      <span title={`Last updated ${new Date().toLocaleTimeString()}`}>{credits.toLocaleString()}</span>
      <span className="text-xs text-muted-foreground ml-1">credits</span>
    </span>
  );
}