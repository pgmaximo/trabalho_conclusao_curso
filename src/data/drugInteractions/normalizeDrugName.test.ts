import { normalizeDrugName, resolveCanonicalDrug } from './normalizeDrugName';

describe('normalizeDrugName', () => {
  it('lowercases, strips accents and trims', () => {
    expect(normalizeDrugName('  Losartana  ')).toBe('losartana');
    expect(normalizeDrugName('Ácido Acetilsalicílico')).toBe('acido acetilsalicilico');
  });

  it('drops dosage/unit text appended to the name', () => {
    expect(normalizeDrugName('Losartana 50mg')).toBe('losartana');
    expect(normalizeDrugName('Ibuprofeno 400 mg comprimido')).toBe('ibuprofeno');
  });
});

describe('resolveCanonicalDrug', () => {
  it('resolves a Brazilian brand name to its canonical ingredient', () => {
    expect(resolveCanonicalDrug('Aradois')).toBe('losartana');
  });

  it('resolves an English/generic name to the Portuguese canonical ingredient', () => {
    expect(resolveCanonicalDrug('Losartan')).toBe('losartana');
    expect(resolveCanonicalDrug('Warfarin')).toBe('warfarina');
  });

  it('resolves the canonical name itself', () => {
    expect(resolveCanonicalDrug('Warfarina')).toBe('warfarina');
  });

  it('tolerates dosage typed inline with the name', () => {
    expect(resolveCanonicalDrug('Losartana 50mg')).toBe('losartana');
  });

  it('returns null for an unrecognized medicine name', () => {
    expect(resolveCanonicalDrug('Paracetamol')).toBeNull();
    expect(resolveCanonicalDrug('')).toBeNull();
  });
});
