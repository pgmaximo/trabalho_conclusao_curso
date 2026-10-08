import { findInteractions, findInteractionsForCandidate } from './drugInteractionService';

describe('findInteractions', () => {
  it('returns no matches when there is no known interaction pair', () => {
    const matches = findInteractions([
      { id: '1', name: 'Paracetamol' },
      { id: '2', name: 'Losartana' },
    ]);
    expect(matches).toHaveLength(0);
  });

  it('finds a known danger-severity pair regardless of brand name used', () => {
    const matches = findInteractions([
      { id: '1', name: 'Marevan' }, // warfarina
      { id: '2', name: 'Alivium' }, // ibuprofeno
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('danger');
  });

  it('keeps the original medicine names (not the canonical key) on the match', () => {
    const matches = findInteractions([
      { id: '1', name: 'Marevan' },
      { id: '2', name: 'Alivium' },
    ]);
    expect([matches[0].medicineA.name, matches[0].medicineB.name].sort()).toEqual(['Alivium', 'Marevan']);
  });

  it('does not duplicate a match across more than two medicines sharing the same pair', () => {
    const matches = findInteractions([
      { id: '1', name: 'Warfarina' },
      { id: '2', name: 'Ibuprofeno' },
      { id: '3', name: 'Diclofenaco' },
    ]);
    // warfarina+ibuprofeno and warfarina+diclofenaco are two distinct pairs,
    // but each must be reported exactly once.
    expect(matches).toHaveLength(2);
    expect(new Set(matches.map((m) => m.pair.id)).size).toBe(2);
  });
});

describe('findInteractionsForCandidate', () => {
  it('only returns matches that involve the candidate', () => {
    const matches = findInteractionsForCandidate(
      { id: 'new', name: 'Ibuprofeno' },
      [
        { id: '1', name: 'Warfarina' },
        { id: '2', name: 'Paracetamol' },
      ],
    );
    expect(matches).toHaveLength(1);
    expect([matches[0].medicineA.id, matches[0].medicineB.id]).toContain('new');
  });

  it('returns no matches when the candidate has no known interaction', () => {
    const matches = findInteractionsForCandidate(
      { id: 'new', name: 'Paracetamol' },
      [{ id: '1', name: 'Warfarina' }],
    );
    expect(matches).toHaveLength(0);
  });
});
