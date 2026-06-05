import { cloneElement, isValidElement } from 'react';
import { cn } from '@/lib/utils';

export const inputClassName =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  // Override the auto-derived id when two fields share a label on one page.
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const id = htmlFor ?? slugify(label);
  const errorId = error ? `${id}-error` : undefined;

  // Wire the control to its label (htmlFor/id) and to its error text (aria-describedby) so screen
  // readers announce both. Call sites stay unchanged — the id is injected into the single child.
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id: (children as React.ReactElement<Record<string, unknown>>).props.id ?? id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': errorId,
      })
    : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {control}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClassName, props.className)} />;
}

export function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClassName, 'min-h-24', props.className)} />;
}
