'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/ui';
import { Input } from './input';

export interface AutocompleteSuggestion {
  type: 'template' | 'category';
  id: string;
  label: string;
  slug: string;
}

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  /** Defaults to /api/search/autocomplete */
  apiUrl?: string;
}

export function SearchBar({ className, placeholder = 'Search prompts, templates...', apiUrl = '/api/search/autocomplete' }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup: abort any pending request and clear debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Fetch suggestions with debounce + request cancellation
  async function fetchSuggestions(q: string, signal: AbortSignal) {
    if (!q.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}?q=${encodeURIComponent(q.trim())}`, { signal });
      const json = await res.json();
      if (json.ok) {
        setSuggestions(json.data?.suggestions ?? []);
        setIsOpen((json.data?.suggestions ?? []).length > 0);
        setActiveIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    } catch (err) {
      // Ignore abort errors — they're expected when we cancel
      if (err instanceof Error && err.name === 'AbortError') return;
      setSuggestions([]);
      setError('Failed to load suggestions');
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      fetchSuggestions(val, controller.signal);
    }, 300);
  }

  function handleSelect(suggestion: AutocompleteSuggestion) {
    setQuery(suggestion.label);
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    if (suggestion.type === 'template') {
      router.push(`/marketplace/${suggestion.slug}`);
    } else {
      router.push(`/browse?category=${suggestion.slug}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault();
          handleSelect(suggestions[activeIndex]);
        }
        break;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setIsOpen(false);
    setActiveIndex(-1);
    router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
  }

  const showDropdown = isOpen && (suggestions.length > 0 || isLoading || error);
  const activeSuggestionId = activeIndex >= 0 ? `${suggestions[activeIndex]?.type}-${suggestions[activeIndex]?.id}` : undefined;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pr-8"
          aria-label="Search"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-activedescendant={activeSuggestionId ? `suggestion-${activeSuggestionId}` : undefined}
          autoComplete="off"
        />
        {/* Search icon / loading spinner */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          {isLoading ? (
            <span className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
          className="absolute z-50 mt-1 w-full min-w-[16rem] overflow-hidden rounded-md border bg-popover p-1 shadow-md"
        >
          {isLoading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading...</div>
          )}
          {error && (
            <div className="px-3 py-2 text-sm text-destructive">{error}</div>
          )}
          {suggestions.length === 0 && !isLoading && !error && isOpen && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No suggestions</div>
          )}
          {suggestions.map((s, i) => (
            <button
              id={`suggestion-${s.type}-${s.id}`}
              key={`${s.type}-${s.id}`}
              role="option"
              aria-selected={i === activeIndex}
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                i === activeIndex && 'bg-accent text-accent-foreground'
              )}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className={cn(
                'mr-2 text-xs px-1.5 py-0.5 rounded',
                s.type === 'template' ? 'bg-primary/10 text-primary' : 'bg-green-100 text-green-700'
              )}>
                {s.type === 'template' ? 'TPL' : 'CAT'}
              </span>
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}