import type { AttributeFieldDef } from './types';

export interface AttributeValidationError {
  key: string;
  message: string;
}

export type AttributeValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; errors: AttributeValidationError[] };

// Validates & coerces Listing.attributes against a category's attributeSchema.
// Unknown keys and out-of-range values are rejected rather than silently dropped
// so sellers get a clear error instead of quietly-lost data.
export function validateListingAttributes(
  schema: AttributeFieldDef[] | null | undefined,
  attributes: Record<string, unknown> | undefined,
): AttributeValidationResult {
  if (!attributes || Object.keys(attributes).length === 0) return { ok: true, value: {} };

  const fieldsByKey = new Map((schema ?? []).map((f) => [f.key, f]));
  const errors: AttributeValidationError[] = [];
  const value: Record<string, unknown> = {};

  for (const [key, raw] of Object.entries(attributes)) {
    const field = fieldsByKey.get(key);
    if (!field) {
      errors.push({ key, message: `Unknown attribute "${key}" for this category` });
      continue;
    }
    if (raw === undefined || raw === null || raw === '') continue;

    switch (field.type) {
      case 'number': {
        const num = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isNaN(num)) {
          errors.push({ key, message: `"${key}" must be a number` });
          break;
        }
        value[key] = num;
        break;
      }
      case 'boolean': {
        if (typeof raw === 'boolean') {
          value[key] = raw;
        } else if (raw === 'true' || raw === 'false') {
          value[key] = raw === 'true';
        } else {
          errors.push({ key, message: `"${key}" must be a boolean` });
        }
        break;
      }
      case 'select': {
        if (typeof raw !== 'string' || (field.options && !field.options.includes(raw))) {
          errors.push({ key, message: `"${key}" must be one of: ${(field.options ?? []).join(', ')}` });
          break;
        }
        value[key] = raw;
        break;
      }
      case 'multiselect': {
        if (!Array.isArray(raw) || raw.some((v) => typeof v !== 'string' || (field.options && !field.options.includes(v)))) {
          errors.push({ key, message: `"${key}" must be a list of: ${(field.options ?? []).join(', ')}` });
          break;
        }
        value[key] = raw;
        break;
      }
      case 'text':
      case 'textarea':
      default: {
        if (typeof raw !== 'string') {
          errors.push({ key, message: `"${key}" must be text` });
          break;
        }
        value[key] = raw.trim();
        break;
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}
