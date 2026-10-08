import { DRUG_INTERACTION_PAIRS, type DrugInteractionPair, type InteractionSeverity } from '@/data/drugInteractions/pairs';
import { resolveCanonicalDrug } from '@/data/drugInteractions/normalizeDrugName';

export type DrugInteractionMatch = {
  pair: DrugInteractionPair;
  severity: InteractionSeverity;
  medicineA: { id: string; name: string };
  medicineB: { id: string; name: string };
  riskPt: string;
  mechanismPt: string;
};

export type InteractionSubject = { id: string; name: string };

function matchesPair(pairDef: DrugInteractionPair, canonicalA: string, canonicalB: string): boolean {
  return (
    (pairDef.a === canonicalA && pairDef.b === canonicalB) ||
    (pairDef.a === canonicalB && pairDef.b === canonicalA)
  );
}

/**
 * Verifica, aos pares, todos os medicamentos fornecidos contra
 * DRUG_INTERACTION_PAIRS. Medicamentos cujo nome não é reconhecido pela
 * tabela de aliases (resolveCanonicalDrug retorna null) são ignorados na
 * comparação, silenciosamente — nunca gera um alerta incorreto.
 */
export function findInteractions<T extends InteractionSubject>(medicines: T[]): DrugInteractionMatch[] {
  const resolved = medicines.map((medicine) => ({ medicine, canonical: resolveCanonicalDrug(medicine.name) }));
  const matches: DrugInteractionMatch[] = [];

  for (let i = 0; i < resolved.length; i += 1) {
    const left = resolved[i];
    if (!left.canonical) continue;

    for (let j = i + 1; j < resolved.length; j += 1) {
      const right = resolved[j];
      if (!right.canonical) continue;

      const pairDef = DRUG_INTERACTION_PAIRS.find((candidate) =>
        matchesPair(candidate, left.canonical as string, right.canonical as string),
      );
      if (!pairDef) continue;

      matches.push({
        pair: pairDef,
        severity: pairDef.severity,
        medicineA: { id: left.medicine.id, name: left.medicine.name },
        medicineB: { id: right.medicine.id, name: right.medicine.name },
        riskPt: pairDef.riskPt,
        mechanismPt: pairDef.mechanismPt,
      });
    }
  }

  return matches;
}

/** Checa um candidato (medicamento novo/recém salvo) contra os demais já ativos do usuário. */
export function findInteractionsForCandidate(
  candidate: InteractionSubject,
  otherActiveMedicines: InteractionSubject[],
): DrugInteractionMatch[] {
  return findInteractions([candidate, ...otherActiveMedicines]).filter(
    (match) => match.medicineA.id === candidate.id || match.medicineB.id === candidate.id,
  );
}
