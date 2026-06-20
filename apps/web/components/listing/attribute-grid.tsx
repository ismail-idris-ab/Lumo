'use client';
import { useState } from 'react';
import type { AttributeFieldDef } from '@lumo/shared';

function formatValue(field: AttributeFieldDef, raw: unknown): string {
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.join(', ');
  const s = String(raw);
  if (field.type === 'boolean') return s === 'true' ? 'Yes' : 'No';
  if (field.unit) return `${s} ${field.unit}`;
  if (field.format) return field.format.replace('{v}', s);
  return s;
}

interface Props {
  schema: AttributeFieldDef[];
  attributes: Record<string, unknown>;
}

export function AttributeGrid({ schema, attributes }: Props) {
  const [expanded, setExpanded] = useState(false);

  const visible = schema.filter((f) => attributes[f.key] != null);
  const primary = visible.filter((f, i) => f.primary !== false && (f.primary || i < 8));
  const secondary = visible.filter((f) => !primary.includes(f));
  const shown = expanded ? visible : primary;

  if (shown.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {shown.map((f) => (
          <div key={f.key}>
            <p className="text-sm font-semibold text-slate-800">
              {formatValue(f, attributes[f.key])}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{f.label}</p>
          </div>
        ))}
      </div>
      {secondary.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex w-full items-center justify-end gap-1 text-sm font-medium text-emerald-700"
        >
          {expanded ? 'Hide options ▴' : 'Show more ▾'}
        </button>
      )}
    </div>
  );
}
