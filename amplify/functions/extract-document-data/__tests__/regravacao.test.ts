/**
 * Bloco 11 -- reprocessar nao desfaz nem duplica (E1, E2).
 *
 * Dois defeitos da mesma operacao. A gravacao e idempotente pelo id (D22), e o
 * id inclui o codigo do analito:
 *
 * - E1: a linha de MESMO id e reescrita com o que o modelo leu agora, e a
 *   correcao que a pessoa fez olhando o papel volta a ser a leitura do modelo;
 * - E2: a linha lida antes do Bloco 10 com codigo LOCAL e relida com codigo
 *   LOINC tem id DIFERENTE, e as duas ficam -- dois pontos na serie.
 *
 * Os exemplos sao o VPM e o SHBG do laudo do Delboni, que eram locais antes da
 * ampliacao do catalogo.
 */
import { ANALYTE_CATALOG } from '../analyteCatalog';
import {
  comoLinhaExistente,
  planejarRegravacao,
  type LinhaExistente,
  type LinhaNova,
} from '../regravacao';
import type { LabResultRow } from '../resultWriteBuilder';

// D27: nenhum codigo LOINC digitado a mao, nem em teste. Saem do catalogo
// gerado, buscados pelo rotulo em portugues.
const codigoDe = (rotulo: string): string => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado.code;
};

function nova(parcial: Partial<LabResultRow> & { id: string; analyteCode: string }, rotuloDoPapel: string): LinhaNova {
  const linha: LabResultRow = {
    owner: 'dono',
    documentId: 'doc-1',
    analyteLabel: rotuloDoPapel,
    projectLabel: rotuloDoPapel,
    value: 10,
    valueQualifier: null,
    unit: 'fL',
    rawValue: '10',
    rawUnit: 'fL',
    referenceLow: null,
    referenceHigh: null,
    rawReferenceText: null,
    collectedAt: '2025-10-04',
    collectionMoment: null,
    sourcePage: 1,
    confidence: 0.95,
    reviewStatus: 'AUTO',
    ...parcial,
  };
  return { linha, rotuloDoPapel };
}

function existente(parcial: Partial<LinhaExistente> & { id: string; analyteCode: string }): LinhaExistente {
  return {
    projectLabel: parcial.analyteCode,
    collectionMoment: null,
    value: 10,
    valueQualifier: null,
    unit: 'fL',
    reviewStatus: 'AUTO',
    correctedAt: null,
    ...parcial,
  };
}

// Um dos sinonimos do VPM no catalogo e "Volume plaquetário Médio (MPV)".
const VPM = codigoDe('VPM');
const GLICOSE = codigoDe('Glicose');
const HEMOGLOBINA = codigoDe('Hemoglobina');
const NEUTROFILOS_ABSOLUTO = codigoDe('Neutrofilos (absoluto)');
const NEUTROFILOS_PERCENTUAL = codigoDe('Neutrofilos (%)');

describe('planejarRegravacao -- a correcao da pessoa (E1)', () => {
  it('linha conferida mantem valor, qualificador, unidade e status', () => {
    const plano = planejarRegravacao(
      [
        existente({
          id: 'a',
          analyteCode: VPM,
          value: 9.8,
          valueQualifier: null,
          unit: 'fL',
          reviewStatus: 'CONFIRMADO_PELO_USUARIO',
          correctedAt: '2026-09-20T10:00:00.000Z',
        }),
      ],
      [nova({ id: 'a', analyteCode: VPM, value: 98, reviewStatus: 'AUTO' }, 'VPM')],
    );

    expect(plano.gravar).toHaveLength(1);
    expect(plano.gravar[0]).toMatchObject({
      value: 9.8,
      valueQualifier: null,
      unit: 'fL',
      reviewStatus: 'CONFIRMADO_PELO_USUARIO',
    });
    expect(plano.preservadas).toBe(1);
  });

  it('avisa quando a leitura nova discorda do que a pessoa conferiu', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'a', analyteCode: VPM, value: 9.8, reviewStatus: 'CONFIRMADO_PELO_USUARIO' })],
      [nova({ id: 'a', analyteCode: VPM, projectLabel: 'VPM', value: 98 }, 'VPM')],
    );
    expect(plano.avisos).toHaveLength(1);
    expect(plano.avisos[0]).toContain('"VPM"');
    expect(plano.avisos[0]).toContain('mantivemos o que você conferiu');
  });

  it('NAO avisa quando a leitura nova concorda', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'a', analyteCode: VPM, value: 9.8, reviewStatus: 'CONFIRMADO_PELO_USUARIO' })],
      [nova({ id: 'a', analyteCode: VPM, value: 9.8 }, 'VPM')],
    );
    expect(plano.avisos).toEqual([]);
    expect(plano.preservadas).toBe(1);
  });

  it('o qualificador tambem conta como discordancia', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'a', analyteCode: VPM, value: 5, valueQualifier: null, reviewStatus: 'CONFIRMADO_PELO_USUARIO' })],
      [nova({ id: 'a', analyteCode: VPM, value: 5, valueQualifier: '<' }, 'VPM')],
    );
    expect(plano.avisos).toHaveLength(1);
    expect(plano.gravar[0].valueQualifier).toBeNull();
  });

  it('linha automatica ou pendente e reescrita com a leitura nova', () => {
    const plano = planejarRegravacao(
      [
        existente({ id: 'a', analyteCode: VPM, value: 9.8, reviewStatus: 'AUTO' }),
        existente({ id: 'b', analyteCode: GLICOSE, value: null, reviewStatus: 'PENDENTE_DE_REVISAO' }),
      ],
      [
        nova({ id: 'a', analyteCode: VPM, value: 10.1 }, 'VPM'),
        nova({ id: 'b', analyteCode: GLICOSE, value: 90, unit: 'mg/dL' }, 'Glicose'),
      ],
    );
    expect(plano.gravar.map((l) => l.value)).toEqual([10.1, 90]);
    expect(plano.preservadas).toBe(0);
    expect(plano.avisos).toEqual([]);
  });
});

describe('planejarRegravacao -- a linha que mudou de codigo (E2)', () => {
  it('a linha local e apagada quando a de catalogo a substitui pelo rotulo do papel', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'velha', analyteCode: 'X-VPM' })],
      [nova({ id: 'nova', analyteCode: VPM }, 'VPM')],
    );
    expect(plano.apagar).toEqual(['velha']);
    expect(plano.substituidas).toBe(1);
    expect(plano.gravar.map((l) => l.id)).toEqual(['nova']);
  });

  it('casa tambem por sinonimo do catalogo, quando o rotulo mudou entre as leituras', () => {
    // A leitura antiga guardou o rotulo inteiro; a nova escreveu "VPM".
    const plano = planejarRegravacao(
      [existente({ id: 'velha', analyteCode: 'X-VOLUME-PLAQUETARIO-MEDIO-MPV' })],
      [nova({ id: 'nova', analyteCode: VPM }, 'VPM')],
    );
    expect(plano.apagar).toEqual(['velha']);
  });

  it('a correcao da linha antiga passa para a nova, com a data dela', () => {
    const plano = planejarRegravacao(
      [
        existente({
          id: 'velha',
          analyteCode: 'X-VPM',
          value: 9.8,
          unit: 'fL',
          reviewStatus: 'CONFIRMADO_PELO_USUARIO',
          correctedAt: '2026-09-20T10:00:00.000Z',
        }),
      ],
      [nova({ id: 'nova', analyteCode: VPM, value: 98 }, 'VPM')],
    );
    expect(plano.gravar[0]).toMatchObject({
      id: 'nova',
      value: 9.8,
      reviewStatus: 'CONFIRMADO_PELO_USUARIO',
      correctedAt: '2026-09-20T10:00:00.000Z',
    });
    expect(plano.avisos).toHaveLength(1);
  });

  it('momento de coleta diferente nao e a mesma linha', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'velha', analyteCode: 'X-VPM', collectionMoment: '120 min' })],
      [nova({ id: 'nova', analyteCode: VPM, collectionMoment: null }, 'VPM')],
    );
    expect(plano.apagar).toEqual([]);
  });

  it('o momento e comparado aparado', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'velha', analyteCode: 'X-VPM', collectionMoment: ' jejum ' })],
      [nova({ id: 'nova', analyteCode: VPM, collectionMoment: 'jejum' }, 'VPM')],
    );
    expect(plano.apagar).toEqual(['velha']);
  });

  it('linha local de outro analito fica', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'zinco', analyteCode: 'X-ZINCO' })],
      [nova({ id: 'nova', analyteCode: VPM }, 'VPM')],
    );
    expect(plano.apagar).toEqual([]);
    expect(plano.substituidas).toBe(0);
  });

  it('linha antiga que nao reaparece na leitura nova fica (a omissao e instavel)', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'velha', analyteCode: 'X-VPM' }), existente({ id: 'glicose', analyteCode: GLICOSE })],
      [nova({ id: 'outra', analyteCode: HEMOGLOBINA, unit: 'g/dL' }, 'Hemoglobina')],
    );
    expect(plano.apagar).toEqual([]);
  });

  it('nova de codigo LOCAL nao substitui nada', () => {
    // Local para local e o mesmo codigo e o mesmo id -- a regra 1 cuida.
    const plano = planejarRegravacao(
      [existente({ id: 'velha', analyteCode: 'X-VPM' })],
      [nova({ id: 'nova', analyteCode: 'X-VOLUME-PLAQUETARIO' }, 'VPM')],
    );
    expect(plano.apagar).toEqual([]);
  });

  it('correspondencia ambigua -- uma antiga, duas novas -- nao apaga nem transfere', () => {
    // "Neutr" e sinonimo do absoluto e do percentual.
    const plano = planejarRegravacao(
      [
        existente({
          id: 'velha',
          analyteCode: 'X-NEUTR',
          value: 60,
          reviewStatus: 'CONFIRMADO_PELO_USUARIO',
          correctedAt: '2026-09-20T10:00:00.000Z',
        }),
      ],
      [
        nova({ id: 'abs', analyteCode: NEUTROFILOS_ABSOLUTO, value: 3.5, unit: '10*3/uL' }, 'Neutrófilos'),
        nova({ id: 'pct', analyteCode: NEUTROFILOS_PERCENTUAL, value: 60, unit: '%' }, 'Neutrófilos'),
      ],
    );
    expect(plano.apagar).toEqual([]);
    expect(plano.gravar.map((l) => l.reviewStatus)).toEqual(['AUTO', 'AUTO']);
  });

  it('correspondencia ambigua -- duas antigas, uma nova -- nao apaga nenhuma', () => {
    const plano = planejarRegravacao(
      [
        existente({ id: 'v1', analyteCode: 'X-VPM' }),
        existente({ id: 'v2', analyteCode: 'X-MPV' }),
      ],
      [nova({ id: 'nova', analyteCode: VPM }, 'VPM')],
    );
    expect(plano.apagar).toEqual([]);
  });

  it('a linha que a propria nova reescreve nunca entra em apagar', () => {
    const plano = planejarRegravacao(
      [existente({ id: 'mesmo', analyteCode: 'X-VPM' })],
      [nova({ id: 'mesmo', analyteCode: VPM }, 'VPM')],
    );
    expect(plano.apagar).toEqual([]);
  });

  it('sem nada gravado antes, o plano e so gravar', () => {
    const plano = planejarRegravacao([], [nova({ id: 'nova', analyteCode: VPM }, 'VPM')]);
    expect(plano).toEqual({
      gravar: [expect.objectContaining({ id: 'nova' })],
      apagar: [],
      avisos: [],
      preservadas: 0,
      substituidas: 0,
    });
  });
});

describe('comoLinhaExistente -- o item do banco', () => {
  it('le os campos que a regravacao usa', () => {
    expect(
      comoLinhaExistente({
        id: 'a',
        analyteCode: 'X-VPM',
        projectLabel: 'VPM',
        collectionMoment: 'jejum',
        value: 9.8,
        valueQualifier: '<',
        unit: 'fL',
        reviewStatus: 'CONFIRMADO_PELO_USUARIO',
        correctedAt: '2026-09-20T10:00:00.000Z',
        rawValue: '9,8',
      }),
    ).toEqual({
      id: 'a',
      analyteCode: 'X-VPM',
      projectLabel: 'VPM',
      collectionMoment: 'jejum',
      value: 9.8,
      valueQualifier: '<',
      unit: 'fL',
      reviewStatus: 'CONFIRMADO_PELO_USUARIO',
      correctedAt: '2026-09-20T10:00:00.000Z',
    });
  });

  it('campo ausente vira nulo -- o DynamoDB nao guarda atributo removido', () => {
    expect(comoLinhaExistente({ id: 'a', analyteCode: 'X-VPM', reviewStatus: 'PENDENTE_DE_REVISAO' })).toEqual({
      id: 'a',
      analyteCode: 'X-VPM',
      projectLabel: 'X-VPM',
      collectionMoment: null,
      value: null,
      valueQualifier: null,
      unit: null,
      reviewStatus: 'PENDENTE_DE_REVISAO',
      correctedAt: null,
    });
  });

  it('item sem id ou sem codigo nao entra -- nao ha o que casar nem o que apagar', () => {
    expect(comoLinhaExistente({ analyteCode: 'X-VPM' })).toBeNull();
    expect(comoLinhaExistente({ id: 'a' })).toBeNull();
  });

  it('status desconhecido nao vira conferida', () => {
    expect(comoLinhaExistente({ id: 'a', analyteCode: 'X', reviewStatus: 'QUALQUER' })?.reviewStatus).toBe('AUTO');
  });
});
