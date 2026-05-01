'use client';

import * as React from 'react';
import { cn } from '@/lib/ui';

interface DropdownItem {
  value: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  className?: string;
  align?: 'left' | 'right';
  'aria-label'?: string;
}

export function Dropdown({ trigger, items, className, align = 'right', 'aria-label': ariaLabel }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Keyboard: ArrowDown to open/focus first item, Escape to close
  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
      // Focus first non-disabled item
      setTimeout(() => {
        const menu = ref.current?.querySelector<HTMLElement>('[role="menu"]');
        const first = menu?.querySelector<HTMLElement>('button:not([disabled])');
        first?.focus();
      }, 0);
    }
  }

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
      // Return focus to trigger
      const trigger = ref.current?.querySelector<HTMLElement>('[data-dropdown-trigger]');
      trigger?.focus();
    }
  }

  const enabledItems = items.filter((item) => !item.disabled);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <div
        data-dropdown-trigger
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={0}
        role="button"
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </div>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className={cn(
            'absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 shadow-md',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          onKeyDown={handleMenuKeyDown}
        >
          {enabledItems.map((item) => (
            <button
              key={item.value}
              role="menuitem"
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"
              onClick={() => {
                item.onClick?.();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}