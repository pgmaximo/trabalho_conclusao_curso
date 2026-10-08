import { DRUG_ALIASES } from './aliases';
import { DRUG_INTERACTION_PAIRS } from './pairs';

describe('DRUG_INTERACTION_PAIRS integrity', () => {
  it('has no duplicate ids', () => {
    const ids = DRUG_INTERACTION_PAIRS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never pairs a drug with itself', () => {
    for (const p of DRUG_INTERACTION_PAIRS) {
      expect(p.a).not.toBe(p.b);
    }
  });

  it('only references canonical keys that exist in DRUG_ALIASES', () => {
    const knownKeys = new Set(Object.keys(DRUG_ALIASES));
    for (const p of DRUG_INTERACTION_PAIRS) {
      expect(knownKeys.has(p.a)).toBe(true);
      expect(knownKeys.has(p.b)).toBe(true);
    }
  });

  it('never duplicates the same pair in swapped order', () => {
    const seen = new Set<string>();
    for (const p of DRUG_INTERACTION_PAIRS) {
      const key = [p.a, p.b].sort().join('__');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('includes a risk and mechanism explanation for every pair', () => {
    for (const p of DRUG_INTERACTION_PAIRS) {
      expect(p.riskPt.trim().length).toBeGreaterThan(0);
      expect(p.mechanismPt.trim().length).toBeGreaterThan(0);
    }
  });
});
