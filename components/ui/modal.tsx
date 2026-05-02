'use client';

import * as React from 'react';
import { cn } from '@/lib/ui';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  /** Accessible label for the modal dialog role */
  'aria-label'?: string;
  /** ID of the modal title for aria-labelledby */
  ariaLabelledBy?: string;
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={onClose}
      aria-hidden="true"
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, className, children, 'aria-label': ariaLabel, ariaLabelledBy }: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // ESC key to close
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus trap: move focus into modal when opened
  React.useEffect(() => {
    if (!open || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [open]);

  if (!open) return null;
  return (
    <ModalOverlay onClose={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          'bg-background rounded-lg border shadow-lg w-full mx-4 p-6',
          // Responsive: full-screen on mobile, constrained on larger
          'max-w-lg md:max-w-lg lg:max-w-lg',
          className
        )}
      >
        {children}
      </div>
    </ModalOverlay>
  );
}

export function ModalHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function ModalTitle({ className, id, children }: { className?: string; id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className={cn('text-lg font-semibold', className)}>
      {children}
    </h2>
  );
}

export function ModalDescription({ className, id, children }: { className?: string; id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className={cn('text-sm text-muted-foreground mt-1', className)}>
      {children}
    </p>
  );
}

export function ModalFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mt-6 flex justify-end gap-3 flex-col sm:flex-row', className)}>{children}</div>;
}

export function ModalBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('text-sm', className)}>{children}</div>;
}