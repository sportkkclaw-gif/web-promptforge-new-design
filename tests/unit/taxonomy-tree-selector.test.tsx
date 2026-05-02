/**
 * @jest-environment jsdom
 */

/**
 * TaxonomyTreeSelector Component Unit Tests
 *
 * Component contract:
 *  1. Renders a loading skeleton while fetching categories
 *  2. Shows error message when API fails
 *  3. Shows empty state when no categories returned
 *  4. Renders tree structure with parent categories and nested children
 *  5. Highlights the selected category (aria-current="page")
 *  6. Renders child categories indented under their parent
 *  7. All category links navigate to /browse?category=:slug
 *  8. onSelect callback fires when a category is clicked
 */

import * as React from 'react';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import { TaxonomyTreeSelector } from '../../components/ui/taxonomy-tree-selector';

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

// ─── Test fixtures ────────────────────────────────────────────────────────────

const FIXTURE_TREE = [
  { id: 'cat1', name: 'Gaming', slug: 'gaming', children: [
    { id: 'cat2', name: 'Character Design', slug: 'character-design', children: [] },
    { id: 'cat3', name: 'World Building', slug: 'world-building', children: [] },
  ]},
  { id: 'cat4', name: 'Art', slug: 'art', children: [] },
  { id: 'cat5', name: 'Marketing', slug: 'marketing', children: [
    { id: 'cat6', name: 'Copywriting', slug: 'copywriting', children: [] },
  ]},
];

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('TaxonomyTreeSelector', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = createFetchMock({ ok: true, data: { categories: [] } });
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  // ─── Loading state ───────────────────────────────────────────────────────────

  describe('Loading state', () => {
    it('renders 5 skeleton placeholders while loading', () => {
      render(<TaxonomyTreeSelector />);
      const skeletons = screen.getAllByRole('listitem');
      // Each skeleton is a div with animate-pulse class — we check for 5 placeholder divs
      const placeholders = document.body.querySelectorAll('.animate-pulse');
      expect(placeholders.length).toBe(5);
    });

    it('does not render category links while loading', async () => {
      render(<TaxonomyTreeSelector />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  // ─── Error state ────────────────────────────────────────────────────────────

  describe('Error state', () => {
    it('shows error message when API returns non-ok', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
      );
      render(<TaxonomyTreeSelector />);
      await waitFor(() => {
        expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
      });
    });

    it('shows error message when fetch throws', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));
      render(<TaxonomyTreeSelector />);
      await waitFor(() => {
        expect(screen.getByText('Failed to load categories')).toBeInTheDocument();
      });
    });
  });

  // ─── Empty state ────────────────────────────────────────────────────────────

  describe('Empty state', () => {
    it('shows "No categories available" when categories array is empty', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: [] } }) })
      );
      render(<TaxonomyTreeSelector />);
      await waitFor(() => {
        expect(screen.getByText('No categories available')).toBeInTheDocument();
      });
    });
  });

  // ─── Tree rendering ─────────────────────────────────────────────────────────

  describe('Tree rendering', () => {
    it('renders all top-level categories as links', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      render(<TaxonomyTreeSelector />);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Gaming' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Art' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Marketing' })).toBeInTheDocument();
      });
    });

    it('renders child categories nested under their parent', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      render(<TaxonomyTreeSelector />);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Character Design' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'World Building' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Copywriting' })).toBeInTheDocument();
      });
    });

    it('renders correct href for each category', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      render(<TaxonomyTreeSelector />);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Gaming' })).toHaveAttribute('href', '/browse?category=gaming');
        expect(screen.getByRole('link', { name: 'Character Design' })).toHaveAttribute('href', '/browse?category=character-design');
        expect(screen.getByRole('link', { name: 'Art' })).toHaveAttribute('href', '/browse?category=art');
      });
    });

    it('highlights selected category with aria-current="page"', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      render(<TaxonomyTreeSelector selectedSlug="gaming" />);
      await waitFor(() => {
        const gamingLink = screen.getByRole('link', { name: 'Gaming' });
        expect(gamingLink).have.attribute('aria-current', 'page');
      });
    });

    it('non-selected category has no aria-current attribute', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      render(<TaxonomyTreeSelector selectedSlug="gaming" />);
      await waitFor(() => {
        const artLink = screen.getByRole('link', { name: 'Art' });
        expect(artLink).not.toHaveAttribute('aria-current');
      });
    });

    it('shows chevron icon on categories with children', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      render(<TaxonomyTreeSelector />);
      await waitFor(() => {
        const gamingLink = screen.getByRole('link', { name: 'Gaming' });
        // Chevron is inside the link
        expect(gamingLink.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('shows no chevron on leaf categories', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      render(<TaxonomyTreeSelector />);
      await waitFor(() => {
        const artLink = screen.getByRole('link', { name: 'Art' });
        // No svg inside the leaf link
        expect(artLink.querySelector('svg')).not.toBeInTheDocument();
      });
    });
  });

  // ─── onSelect callback ──────────────────────────────────────────────────────

  describe('onSelect callback', () => {
    it('calls onSelect with slug when a category is clicked', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      const handleSelect = jest.fn();
      render(<TaxonomyTreeSelector onSelect={handleSelect} />);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Gaming' })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('link', { name: 'Gaming' }));
      expect(handleSelect).toHaveBeenCalledWith('gaming');
    });

    it('calls onSelect with correct slug for child category', async () => {
      fetchMock.mockResolvedValueOnce(
        Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, data: { categories: FIXTURE_TREE } }) })
      );
      const handleSelect = jest.fn();
      render(<TaxonomyTreeSelector onSelect={handleSelect} />);
      await waitFor(() => {
        expect(screen.getByRole('link', { name: 'Character Design' })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('link', { name: 'Character Design' }));
      expect(handleSelect).toHaveBeenCalledWith('character-design');
    });
  });

  // ─── Cleanup on unmount ─────────────────────────────────────────────────────

  describe('Cleanup on unmount', () => {
    it('does not throw when unmounting with pending request', async () => {
      fetchMock.mockImplementation(() => new Promise(() => {})); // never resolves
      const { unmount } = render(<TaxonomyTreeSelector />);
      expect(() => unmount()).not.toThrow();
    });
  });
});