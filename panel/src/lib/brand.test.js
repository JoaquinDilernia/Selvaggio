import { describe, it, expect } from 'vitest';
import { normalizeHex, brandVars } from './brand.js';

describe('brand', () => {
  it('normalizeHex', () => {
    expect(normalizeHex('#430a33')).toBe('#430a33');
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('verde')).toBe('#430a33');
    expect(normalizeHex('')).toBe('#430a33');
    expect(normalizeHex(null)).toBe('#430a33');
  });
  it('brandVars', () => {
    expect(brandVars('#430a33')['--brand']).toBe('#430a33');
    expect(brandVars('#000000')['--brand-soft']).toMatch(/^#[0-9a-f]{6}$/);
    expect(brandVars('#000000')['--brand-ink']).toMatch(/^#[0-9a-f]{6}$/);
  });
});
