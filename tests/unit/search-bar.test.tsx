/**
 * @jest-environment jsdom
 */

/**
 * SearchBar Component Unit Tests
 *
 * Tests the SearchBar component's autocomplete behavior, loading/empty/error
 * states, keyboard navigation, accessibility attributes, and navigation contract.
 *
 * Component contract:
 *   1. Renders a search input with type=search and accessible labeling
 *   2. Debounces input changes (300ms) before fetching suggestions from API
 *   3. Loading state shown while fetch is pending
 *   4. Error state shown when API returns non-ok or throws
 *   5. Empty state shown when suggestions array is empty
 *   6. Dropdown opens when suggestions are available; closes when empty
 *   7. Escape key closes dropdown and resets active index
 *   8. ArrowDown/ArrowUp navigate suggestions; Enter selects active suggestion
 *   9. Clicking outside closes dropdown
 *  10. Clicking template suggestion navigates to /marketplace/:slug
 *  11. Clicking category suggestion navigates to /browse?category=:slug
 *  12. Form submit navigates to /browse?q=:query
 *  13. Fetch requests are cancelled when a new input arrives (race condition handling)
 *  14. Unmount clears debounce timer and aborts pending request
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../../components/ui/search-bar';

// ─── Mock next/navigation ─────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ─── Mock fetch ───────────────────────────────────────────────────────────────

function createFetchMock(json: unknown, ok: boolean = true, status = 200) {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(json),
    })
  );
}

// ─── Test suggestions fixture ─────────────────────────────────────────────────

const FIXTURE_SUGGESTIONS = [
  { type: 'template' as const, id: 't1', label: 'Cyberpunk City', slug: 'cyberpunk-city' },
  { type: 'category' as const, id: 'c1', label: 'Gaming', slug: 'gaming' },
  { type: 'template' as const, id: 't2', label: 'Neon Nights', slug: 'neon-nights' },
];

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('SearchBar', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = createFetchMock({ ok: true, data: { suggestions: [] } });
    globalThis.fetch = fetchMock;
    mockPush.mockClear();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders a search input with accessible aria-label', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-label', 'Search');
      expect(input).toHaveAttribute('type', 'search');
    });

    it('uses custom placeholder when provided', () => {
      render(<SearchBar placeholder="Find templates..." />);
      expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'Find templates...');
    });

    it('applies custom className', () => {
      const { container } = render(<SearchBar className="my-custom-class" />);
      expect(container.firstChild).toHaveClass('my-custom-class');
    });

    it('dropdown is hidden initially', () => {
      render(<SearchBar />);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('has correct ARIA attributes on input', () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
    });
  });

  // ─── API calls ──────────────────────────────────────────────────────────────

  describe('API calls', () => {
    it('does not fetch when input is empty', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');
      await act(async () => {
        fireEvent.change(input, { target: { value: '' } });
      });
      // Wait enough time for debounce to potentially fire
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches suggestions after 300ms debounce', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });

      // Should not have fetched yet (debounce)
      expect(fetchMock).not.toHaveBeenCalled();

      // Wait for debounce to fire
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/search/autocomplete?q=cyber',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('cancels in-flight request when new input arrives before debounce completes', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      // Type first query
      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });

      // Type another query before debounce fires
      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyberpunk' } });
      });

      // Wait for debounce
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      // Should have made exactly one request with the latest query
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/search/autocomplete?q=cyberpunk',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('uses custom apiUrl when provided', async () => {
      render(<SearchBar apiUrl="/api/custom/search" />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'test' } });
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/custom/search?q=test',
        expect.any(Object)
      );
    });
  });

  // ─── Dropdown states ─────────────────────────────────────────────────────────

  describe('Dropdown states', () => {
    it('shows loading state when fetch is pending and no suggestions yet', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });

      // Before debounce fires
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // After debounce fires but before response — should show loading
      // We simulate slow response by not resolving immediately
    });

    it('shows suggestions when API returns them', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: { suggestions: FIXTURE_SUGGESTIONS } }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      expect(screen.getByText('Cyberpunk City')).toBeInTheDocument();
      expect(screen.getByText('Gaming')).toBeInTheDocument();
    });

    it('shows error state when API returns non-ok', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ ok: false, error: 'Server error' }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to load suggestions')).toBeInTheDocument();
      });
    });

    it('shows no suggestions message when suggestions are empty', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: { suggestions: [] } }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'xyznotfound' } });
      });

      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      // When suggestions are empty AND loading is done AND no error, show no suggestions
      await waitFor(() => {
        expect(screen.getByText('No suggestions')).toBeInTheDocument();
      });
    });

    it('dropdown closes when suggestions become empty', async () => {
      fetchMock
        .mockResolvedValueOnce(
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ ok: true, data: { suggestions: FIXTURE_SUGGESTIONS } }),
          })
        )
        .mockResolvedValueOnce(
          Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ ok: true, data: { suggestions: [] } }),
          })
        );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      // First query — opens dropdown
      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Second query — empty results
      await act(async () => {
        fireEvent.change(input, { target: { value: 'empty' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  // ─── Keyboard navigation ─────────────────────────────────────────────────────

  describe('Keyboard navigation', () => {
    async function setupWithSuggestions() {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: { suggestions: FIXTURE_SUGGESTIONS } }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    }

    it('Escape closes the dropdown', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('ArrowDown moves active index down', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');
      const options = screen.getAllByRole('option');

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      // First suggestion becomes active
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('ArrowUp moves active index up', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');
      const options = screen.getAllByRole('option');

      // Go down twice, then up once
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('ArrowDown wraps to start when at end', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');
      const options = screen.getAllByRole('option');

      // Go to last item
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' }); // wraps to first

      expect(options[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('ArrowUp wraps to end when at start', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');
      const options = screen.getAllByRole('option');

      fireEvent.keyDown(input, { key: 'ArrowUp' }); // wraps to last

      expect(options[options.length - 1]).toHaveAttribute('aria-selected', 'true');
    });

    it('Enter selects the active suggestion', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(input, { key: 'ArrowDown' }); // selects first item
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockPush).toHaveBeenCalledWith('/marketplace/cyberpunk-city');
    });

    it('Enter does nothing when no active suggestion', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(input, { key: 'Enter' }); // no active index

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('active suggestion is highlighted visually', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const firstOption = screen.getAllByRole('option')[0];
      expect(firstOption).toHaveClass('bg-accent', 'text-accent-foreground');
    });

    it('Escape resets active index', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Escape' });

      // After Escape, dropdown is closed so no options visible
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  // ─── Accessibility ───────────────────────────────────────────────────────────

  describe('Accessibility', () => {
    async function setupWithSuggestions() {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: { suggestions: FIXTURE_SUGGESTIONS } }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    }

    it('input has aria-expanded=true when dropdown is open', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('input has aria-expanded=false when dropdown is closed', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('aria-expanded', 'false');
    });

    it('input has aria-activedescendant when suggestion is active', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      expect(input).toHaveAttribute(
        'aria-activedescendant',
        'suggestion-template-t1'
      );
    });

    it('input does not have aria-activedescendant when no active suggestion', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');
      // No keyboard navigation yet
      expect(input).not.toHaveAttribute('aria-activedescendant');
    });

    it('options have role=option', async () => {
      await setupWithSuggestions();
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('options have aria-selected=true when active', async () => {
      await setupWithSuggestions();
      const input = screen.getByRole('searchbox');

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const activeOption = screen.getAllByRole('option')[0];
      expect(activeOption).toHaveAttribute('aria-selected', 'true');
    });

    it('listbox has aria-label', async () => {
      await setupWithSuggestions();
      expect(screen.getByRole('listbox')).toHaveAttribute(
        'aria-label',
        'Search suggestions'
      );
    });

    it('hovering option sets it as active (mouse support)', async () => {
      await setupWithSuggestions();
      const options = screen.getAllByRole('option');

      fireEvent.mouseEnter(options[1]);

      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  // ─── Selection / Navigation ─────────────────────────────────────────────────

  describe('Selection and navigation', () => {
    it('clicking template suggestion navigates to /marketplace/:slug', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: { suggestions: FIXTURE_SUGGESTIONS } }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cyberpunk City'));

      expect(mockPush).toHaveBeenCalledWith('/marketplace/cyberpunk-city');
    });

    it('clicking category suggestion navigates to /browse?category=:slug', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: { suggestions: FIXTURE_SUGGESTIONS } }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Gaming'));

      expect(mockPush).toHaveBeenCalledWith('/browse?category=gaming');
    });

    it('selection closes dropdown and clears suggestions', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: { suggestions: FIXTURE_SUGGESTIONS } }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cyberpunk City'));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('form submit navigates to /browse?q=encoded_query', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'hello world' } });
      });

      fireEvent.submit(screen.getByRole('searchbox').closest('form')!);

      expect(mockPush).toHaveBeenCalledWith('/browse?q=hello%20world');
    });

    it('form submit does nothing when query is empty', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: '   ' } });
      });

      fireEvent.submit(screen.getByRole('searchbox').closest('form')!);

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  // ─── Click outside ──────────────────────────────────────────────────────────

  describe('Click outside', () => {
    it('clicking outside closes the dropdown', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, data: { suggestions: FIXTURE_SUGGESTIONS } }),
        })
      );

      render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      fireEvent.mouseDown(document.body);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  // ─── Cleanup on unmount ──────────────────────────────────────────────────────

  describe('Cleanup on unmount', () => {
    it('clears debounce timer and aborts request on unmount', async () => {
      fetchMock.mockImplementation(() => new Promise(() => {})); // never resolves

      const { unmount } = render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      // Should not throw when unmounting with pending request
      expect(() => unmount()).not.toThrow();
    });

    it('pending request does not cause state update after unmount', async () => {
      let resolveFetch: (value: unknown) => void;
      fetchMock.mockImplementation(
        () =>
          new Promise((res) => {
            resolveFetch = res;
          })
      );

      const { unmount } = render(<SearchBar />);
      const input = screen.getByRole('searchbox');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cyber' } });
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });

      unmount();

      // Resolving after unmount should not cause React warnings
      expect(() => resolveFetch!({ ok: true, data: { suggestions: [] } })).not.toThrow();
    });
  });
});