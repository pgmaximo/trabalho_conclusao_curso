/**
 * Tabela de nomes comerciais brasileiros e variantes PT/EN por princípio
 * ativo canônico. As chaves já estão em forma normalizada (minúsculas, sem
 * acento) — normalizeDrugName() produz o mesmo formato para o texto digitado
 * pelo usuário, então a comparação final é sempre string-a-string.
 *
 * Lista inicial, não exaustiva — cobre apenas os princípios ativos usados nos
 * pares de interação curados em pairs.ts.
 */
export const DRUG_ALIASES: Record<string, string[]> = {
  warfarina: ['warfarin', 'marevan', 'coumadin'],
  losartana: ['losartan', 'cozaar', 'aradois'],
  enalapril: ['renitec', 'vasopril'],
  captopril: ['capoten'],
  ibuprofeno: ['ibuprofen', 'alivium', 'advil'],
  diclofenaco: ['diclofenac', 'voltaren', 'cataflam'],
  aas: ['acido acetilsalicilico', 'aspirina', 'aspirin', 'ass'],
  sinvastatina: ['simvastatin', 'simvastatina', 'zocor'],
  claritromicina: ['clarithromycin', 'klaricid'],
  eritromicina: ['erythromycin', 'ilosone'],
  fluoxetina: ['fluoxetine', 'prozac', 'daforin'],
  sertralina: ['sertraline', 'zoloft', 'assert'],
  tramadol: ['tramal', 'sylador'],
  espironolactona: ['aldactone', 'spironolactone'],
};
