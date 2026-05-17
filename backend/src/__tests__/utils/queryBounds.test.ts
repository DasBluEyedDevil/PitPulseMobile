import { describe, expect, it } from '@jest/globals';
import { parseBoundedFloat, parseBoundedInt } from '../../utils/queryBounds';

describe('queryBounds', () => {
  it('caps integers to configured min and max values', () => {
    expect(parseBoundedInt('1000000', 20, { min: 1, max: 100 })).toBe(100);
    expect(parseBoundedInt('-10', 20, { min: 1, max: 100 })).toBe(1);
  });

  it('falls back on malformed integers', () => {
    expect(parseBoundedInt('not-a-number', 20, { min: 1, max: 100 })).toBe(20);
  });

  it('caps floats to configured min and max values', () => {
    expect(parseBoundedFloat('9999', 50, { min: 0.1, max: 500 })).toBe(500);
    expect(parseBoundedFloat('-4', 50, { min: 0.1, max: 500 })).toBe(0.1);
  });
});
