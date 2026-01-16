import { describe, it, expect } from 'vitest';
import { sanitizeForFirestore } from '../firestore';

describe('sanitizeForFirestore', () => {
  it('converts undefined to null at the root level', () => {
    const input = { name: 'Test', date: undefined };
    const output = sanitizeForFirestore(input);
    expect(output).toEqual({ name: 'Test', date: null });
  });

  it('recursively converts undefined in nested objects', () => {
    const input = {
      meta: {
        id: 123,
        details: {
          valid: true,
          missing: undefined
        }
      }
    };
    
    const output = sanitizeForFirestore(input);
    expect(output.meta.details.missing).toBeNull();
    expect(output.meta.details.valid).toBe(true);
  });

  it('handles arrays with mixed types', () => {
    const input = {
      tags: ['a', undefined, { key: undefined }]
    };
    
    const output = sanitizeForFirestore(input);
    expect(output.tags).toEqual(['a', null, { key: null }]);
  });

  it('leaves nulls and valid values alone', () => {
    const input = { a: null, b: 0, c: false, d: '' };
    expect(sanitizeForFirestore(input)).toEqual(input);
  });
});