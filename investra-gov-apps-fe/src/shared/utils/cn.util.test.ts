import { describe, expect, it } from 'vitest';
import { cn } from '@/shared/utils/cn.util';

describe('cn (classnames merger)', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('joins multiple class names', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out falsy values', () => {
    expect(cn('a', null, undefined, false, 'b')).toBe('a b');
  });

  it('merges tailwind conflicting classes (last wins)', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('respects conditional class object', () => {
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });
});
