import { describe, it, expect } from 'vitest';
import { computeChangePct } from './marketMath';

describe('marketMath', () => {
  it('computeChangePct should calculate correct positive percentage', () => {
    expect(computeChangePct(150, 100)).toBe(50);
  });
  
  it('computeChangePct should calculate correct negative percentage', () => {
    expect(computeChangePct(80, 100)).toBe(-20);
  });
  
  it('computeChangePct should return null if base is 0', () => {
    expect(computeChangePct(100, 0)).toBeNull();
  });
});
