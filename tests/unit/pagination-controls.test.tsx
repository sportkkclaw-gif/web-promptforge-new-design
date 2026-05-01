/**
 * @jest-environment jsdom
 */

/**
 * PaginationControls Component Unit Tests
 *
 * Component contract:
 *  1. Renders nothing when totalPages <= 0 or currentPage < 1
 *  2. Previous button is disabled on page 1 (href: null)
 *  3. Next button is disabled on last page (href: null)
 *  4. Previous button links to previous page when not on page 1
 *  5. Next button links to next page when not on last page
 *  6. Shows "Page X of Y" text with correct aria-live
 *  7. preserveParams are included in generated URLs (q, category, etc.)
 *  8. baseUrl default is /browse
 *  9. Correct ARIA labels on Previous/Next buttons
 * 10. Renders child links inside anchor tags (not buttons) when href is present
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { PaginationControls } from '../../components/ui/pagination-controls';

describe('PaginationControls', () => {
  // ─── Null renders ────────────────────────────────────────────────────────────

  describe('Null renders', () => {
    it('returns null when totalPages is 0', () => {
      const { container } = render(
        <PaginationControls currentPage={1} totalPages={0} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when totalPages is negative', () => {
      const { container } = render(
        <PaginationControls currentPage={1} totalPages={-1} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when currentPage is 0', () => {
      const { container } = render(
        <PaginationControls currentPage={0} totalPages={5} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('returns null when currentPage is negative', () => {
      const { container } = render(
        <PaginationControls currentPage={-1} totalPages={5} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  // ─── Page indicator ──────────────────────────────────────────────────────────

  describe('Page indicator text', () => {
    it('shows correct "Page X of Y" text', () => {
      render(<PaginationControls currentPage={3} totalPages={10} />);
      expect(screen.getByText(/Page 3 of 10/)).toBeInTheDocument();
    });

    it('page number is wrapped in strong tags for semantics', () => {
      render(<PaginationControls currentPage={2} totalPages={5} />);
      const text = screen.getByText(/Page 2 of 5/);
      expect(text.querySelector('strong')).toBeInTheDocument();
    });

    it('aria-live is polite on the page indicator', () => {
      render(<PaginationControls currentPage={1} totalPages={5} />);
      const indicator = screen.getByLabelText('Pagination');
      expect(indicator).Have.attribute('aria-live', 'polite');
    });
  });

  // ─── Previous button ─────────────────────────────────────────────────────────

  describe('Previous button', () => {
    it('is disabled on page 1 (no href)', () => {
      render(<PaginationControls currentPage={1} totalPages={5} />);
      const prevBtn = screen.getByRole('button', { name: /Previous page/i });
      expect(prevBtn).toBeDisabled();
    });

    it('links to page-1 when on page 2', () => {
      render(<PaginationControls currentPage={2} totalPages={5} preserveParams={{ q: 'cyber' }} />);
      const prevLink = screen.getByRole('link', { name: /Previous page/i });
      expect(prevLink).toHaveAttribute('href', '/browse?q=cyber&page=1');
    });

    it('disabled Previous button is still a button (not a link)', () => {
      render(<PaginationControls currentPage={1} totalPages={5} />);
      expect(screen.getByRole('button', { name: /Previous page/i })).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      render(<PaginationControls currentPage={2} totalPages={5} />);
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    });
  });

  // ─── Next button ─────────────────────────────────────────────────────────────

  describe('Next button', () => {
    it('is disabled on last page (no href)', () => {
      render(<PaginationControls currentPage={5} totalPages={5} />);
      const nextBtn = screen.getByRole('button', { name: /Next page/i });
      expect(nextBtn).toBeDisabled();
    });

    it('links to next page when not on last page', () => {
      render(<PaginationControls currentPage={3} totalPages={5} preserveParams={{ category: 'gaming' }} />);
      const nextLink = screen.getByRole('link', { name: /Next page/i });
      expect(nextLink).toHaveAttribute('href', '/browse?category=gaming&page=4');
    });

    it('disabled Next button is still a button (not a link)', () => {
      render(<PaginationControls currentPage={5} totalPages={5} />);
      expect(screen.getByRole('button', { name: /Next page/i })).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      render(<PaginationControls currentPage={4} totalPages={5} />);
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    });
  });

  // ─── URL generation ──────────────────────────────────────────────────────────

  describe('URL generation', () => {
    it('uses /browse as default baseUrl', () => {
      render(<PaginationControls currentPage={2} totalPages={5} />);
      const prevLink = screen.getByRole('link', { name: /Previous page/i });
      expect(prevLink).toHaveAttribute('href', '/browse?page=1');
    });

    it('accepts custom baseUrl', () => {
      render(<PaginationControls currentPage={2} totalPages={5} baseUrl="/search" />);
      const prevLink = screen.getByRole('link', { name: /Previous page/i });
      expect(prevLink).toHaveAttribute('href', '/search?page=1');
    });

    it('includes q param in preserveParams', () => {
      render(<PaginationControls currentPage={2} totalPages={5} preserveParams={{ q: 'cyberpunk' }} />);
      const prevLink = screen.getByRole('link', { name: /Previous page/i });
      expect(prevLink).toHaveAttribute('href', '/browse?q=cyberpunk&page=1');
    });

    it('includes multiple preserveParams', () => {
      render(
        <PaginationControls
          currentPage={3}
          totalPages={10}
          preserveParams={{ q: 'neon', category: 'gaming' }}
        />
      );
      const nextLink = screen.getByRole('link', { name: /Next page/i });
      expect(nextLink).toHaveAttribute('href', '/browse?q=neon&category=gaming&page=4');
    });

    it('skips falsy preserveParams values', () => {
      render(<PaginationControls currentPage={2} totalPages={5} preserveParams={{ q: '', category: undefined } as Record<string, string>} />);
      const prevLink = screen.getByRole('link', { name: /Previous page/i });
      expect(prevLink).toHaveAttribute('href', '/browse?page=1');
    });
  });

  // ─── Single page ─────────────────────────────────────────────────────────────

  describe('Single page edge case', () => {
    it('both prev and next are disabled when totalPages=1 and currentPage=1', () => {
      render(<PaginationControls currentPage={1} totalPages={1} />);
      expect(screen.getByRole('button', { name: /Previous page/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Next page/i })).toBeDisabled();
    });
  });
});