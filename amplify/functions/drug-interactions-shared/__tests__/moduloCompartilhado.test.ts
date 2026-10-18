/**
 * Resumo do arquivo:
 * O que o modulo compartilhado de interacoes (E9, D9.1) promete e que os testes
 * antigos de `src/` nao cobrem: que ele nao depende do app, e que o app recebe
 * dele os MESMOS objetos -- e nao uma copia que pudesse divergir.
 *
 * Os testes antigos (`pairs.test.ts`, `normalizeDrugName.test.ts`,
 * `drugInteractionService.test.ts`) ficaram em `src/`, intocados, de
 * proposito: rodando pelas reexportacoes, eles provam a logica e a
 * reexportacao de uma vez so.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { TEXTO_DE_ENCAMINHAMENTO } from '../../chat-assistant/encaminhamento';
import { DRUG_ALIASES } from '../aliases';
import { findInteractions, findInteractionsForCandidate } from '../findInteractions';
import { normalizeDrugName, resolveCanonicalDrug } from '../normalizeDrugName';
import { DRUG_INTERACTION_PAIRS } from '../pairs';

const ARQUIVOS = ['pairs.ts', 'aliases.ts', 'normalizeDrugName.ts', 'findInteractions.ts'];

describe('o modulo compartilhado de interacoes (E9, D9.1)', () => {
  it.each(ARQUIVOS)('%s nao importa nada do app -- o alias @/ nem existe no empacotamento da Lambda', (arquivo) => {
    const fonte = readFileSync(join(__dirname, '..', arquivo), 'utf8');
    expect(fonte).not.toMatch(/from\s+['"](@\/|react|react-native)/);
  });

  it('o app reexporta os mesmos objetos, e nao uma copia', () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    expect(require('../../../../src/data/drugInteractions/pairs').DRUG_INTERACTION_PAIRS).toBe(DRUG_INTERACTION_PAIRS);
    expect(require('../../../../src/data/drugInteractions/aliases').DRUG_ALIASES).toBe(DRUG_ALIASES);
    const normalizacao = require('../../../../src/data/drugInteractions/normalizeDrugName');
    expect(normalizacao.normalizeDrugName).toBe(normalizeDrugName);
    expect(normalizacao.resolveCanonicalDrug).toBe(resolveCanonicalDrug);
    const servico = require('../../../../src/services/drugInteractionService');
    /* eslint-enable @typescript-eslint/no-require-imports */
    expect(servico.findInteractions).toBe(findInteractions);
    expect(servico.findInteractionsForCandidate).toBe(findInteractionsForCandidate);
  });
});

/**
 * Os textos de risco (E9, D9.5). A tela de Medicamentos mostra SO o `riskPt`, e
 * o chat o repete: um texto que remete a outro par ("Mesmo risco de ... da
 * combinacao com IECA") nao diz nada a quem o le sozinho.
 */
describe('os textos de risco (E9, D9.5)', () => {
  it.each(DRUG_INTERACTION_PAIRS)('o risco de $id se explica sozinho', (par) => {
    expect(par.riskPt).not.toMatch(/^Mesmo\b/);
    expect(par.riskPt).not.toMatch(/combina[cç][aã]o com/i);
  });

  it.each(DRUG_INTERACTION_PAIRS)('o risco de $id passa pelas regras de linguagem, para o chat poder repeti-lo', (par) => {
    expect(
      checkLanguageRules(`${par.riskPt} ${TEXTO_DE_ENCAMINHAMENTO}`, { questionKind: 'clinica', temOrigem: false }),
    ).toEqual({ ok: true });
  });
});
