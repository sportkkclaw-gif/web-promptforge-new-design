/**
 * VariableListEditor Component
 *
 * Drag-to-reorder list of variable specs with inline add.
 * Uses HTML5 native drag-and-drop — no new npm dependencies.
 * 'use client' — requires React hooks.
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import type { VariableSpec, VariableType } from '@/lib/prompt-as-code';

// ─── Drag State ────────────────────────────────────────────────────────────────

interface DragState {
  draggingIndex: number | null;
  overIndex: number | null;
}

// ─── Inline Add Form ──────────────────────────────────────────────────────────

interface InlineAddState {
  active: boolean;
  name: string;
  type: VariableType;
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface VariableListEditorProps {
  specs: VariableSpec[];
  onAdd: (spec: VariableSpec) => void;
  onRemove: (name: string) => void;
  onUpdate: (name: string, patch: Partial<VariableSpec>) => void;
  onReorder: (specs: VariableSpec[]) => void; // full reorder list
}

export function VariableListEditor({
  specs,
  onAdd,
  onRemove,
  onUpdate,
  onReorder,
}: VariableListEditorProps) {
  const [drag, setDrag] = useState<DragState>({ draggingIndex: null, overIndex: null });
  const [inlineAdd, setInlineAdd] = useState<InlineAddState>({ active: false, name: '', type: 'string' });
  const dragCounterRef = useRef(0); // nested dragenter/dragleave counter

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDrag({ draggingIndex: index, overIndex: null });
    dragCounterRef.current = 0;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setDrag(prev => ({ ...prev, overIndex: index }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setDrag(prev => ({ ...prev, overIndex: null }));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = drag.draggingIndex;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDrag({ draggingIndex: null, overIndex: null });
      dragCounterRef.current = 0;
      return;
    }
    // Reorder
    const reordered = [...specs];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    onReorder(reordered);
    setDrag({ draggingIndex: null, overIndex: null });
    dragCounterRef.current = 0;
  }, [drag.draggingIndex, specs, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDrag({ draggingIndex: null, overIndex: null });
    dragCounterRef.current = 0;
  }, []);

  // ── Inline add ─────────────────────────────────────────────────────────────

  const startInlineAdd = () => {
    setInlineAdd({ active: true, name: '', type: 'string' });
  };

  const cancelInlineAdd = () => {
    setInlineAdd({ active: false, name: '', type: 'string' });
  };

  const confirmInlineAdd = () => {
    const trimmed = inlineAdd.name.trim();
    if (!trimmed) { cancelInlineAdd(); return; }
    if (specs.some(s => s.name === trimmed)) { cancelInlineAdd(); return; }
    onAdd({ name: trimmed, type: inlineAdd.type });
    setInlineAdd({ active: false, name: '', type: 'string' });
  };

  const inlineAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmInlineAdd(); }
    if (e.key === 'Escape') { cancelInlineAdd(); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="variable-list-editor space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Variable Specifications</h2>
        <button
          onClick={startInlineAdd}
          className="text-sm px-4 py-2 border rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
        >
          <span aria-hidden="true">+</span> Add Variable
        </button>
      </div>

      {/* Inline add form */}
      {inlineAdd.active && (
        <div className="border-2 border-primary/40 rounded-xl p-4 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-primary">New variable</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name</label>
              <input
                autoFocus
                type="text"
                value={inlineAdd.name}
                onChange={e => setInlineAdd(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={inlineAddKeyDown}
                placeholder="var_name"
                className="w-full border rounded px-2 py-1.5 text-sm bg-background font-mono"
                aria-label="Variable name"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <select
                value={inlineAdd.type}
                onChange={e => setInlineAdd(prev => ({ ...prev, type: e.target.value as VariableType }))}
                className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                aria-label="Variable type"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="enum">enum</option>
                <option value="json">json</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button onClick={cancelInlineAdd} className="text-xs px-3 py-1.5 border rounded hover:bg-muted">Cancel</button>
            <button onClick={confirmInlineAdd} className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:opacity-90">Add</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {specs.length === 0 && !inlineAdd.active && (
        <div className="text-sm text-muted-foreground py-8 text-center border-2 border-dashed rounded-lg">
          No variables yet. Click &quot;Add Variable&quot; or use &quot;Auto-extract&quot; on the Basic tab.
        </div>
      )}

      {/* Draggable variable list */}
      <div className="space-y-3" role="list" aria-label="Variable list">
        {specs.map((spec, idx) => {
          const isDragging = drag.draggingIndex === idx;
          const isDropTarget = drag.overIndex === idx && drag.draggingIndex !== idx;

          return (
            <div
              key={spec.name}
              draggable
              onDragStart={e => handleDragStart(e, idx)}
              onDragEnter={e => handleDragEnter(e, idx)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              role="listitem"
              aria-label={`Variable ${spec.name}, position ${idx + 1}`}
              className={[
                'border rounded-xl p-4 bg-card transition-all cursor-grab active:cursor-grabbing',
                isDragging ? 'opacity-50 ring-2 ring-primary' : '',
                isDropTarget ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : '',
              ].filter(Boolean).join(' ')}
            >
              {/* Row: drag handle + name badge + position + actions */}
              <div className="flex items-center gap-2 mb-3">
                {/* Drag handle icon */}
                <span className="text-muted-foreground cursor-grab" aria-hidden="true" title="Drag to reorder">
                  ⋮⋮
                </span>
                <span className="font-mono bg-muted px-2 py-1 rounded text-xs">{spec.name}</span>
                <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={() => onRemove(spec.name)}
                    className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
                    aria-label={`Remove variable ${spec.name}`}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <select
                    value={spec.type}
                    onChange={e => onUpdate(spec.name, { type: e.target.value as VariableType })}
                    className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                    aria-label={`Type for ${spec.name}`}
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="enum">enum</option>
                    <option value="json">json</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <input
                    type="text"
                    value={spec.description ?? ''}
                    onChange={e => onUpdate(spec.name, { description: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                    placeholder="Optional description"
                    aria-label={`Description for ${spec.name}`}
                  />
                </div>
                {spec.type === 'number' && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Min</label>
                      <input
                        type="number"
                        value={spec.min ?? ''}
                        onChange={e => onUpdate(spec.name, { min: Number(e.target.value) || undefined })}
                        className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                        aria-label={`Min for ${spec.name}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Max</label>
                      <input
                        type="number"
                        value={spec.max ?? ''}
                        onChange={e => onUpdate(spec.name, { max: Number(e.target.value) || undefined })}
                        className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                        aria-label={`Max for ${spec.name}`}
                      />
                    </div>
                  </>
                )}
                {spec.type === 'enum' && (
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Enum Values (comma-separated)</label>
                    <input
                      type="text"
                      value={(spec.enumValues ?? []).join(', ')}
                      onChange={e => onUpdate(spec.name, {
                        enumValues: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      className="w-full border rounded px-2 py-1.5 text-sm bg-background"
                      placeholder="value1, value2, value3"
                      aria-label={`Enum values for ${spec.name}`}
                    />
                  </div>
                )}
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`req-${spec.name}`}
                    checked={spec.required ?? false}
                    onChange={e => onUpdate(spec.name, { required: e.target.checked })}
                    className="accent-primary"
                    aria-label={`Required for ${spec.name}`}
                  />
                  <label htmlFor={`req-${spec.name}`} className="text-xs">Required</label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}