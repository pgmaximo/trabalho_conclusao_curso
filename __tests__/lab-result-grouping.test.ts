import type { LabResultView } from '@/services/extractionService';
import { agruparPorExame, contarLinhas } from '@/utils/labResultGrouping';

// Os codigos NAO sao digitados de memoria: saem do catalogo gerado a partir do
// extrato oficial do LOINC (estudos-ia/05-vocabularios/loinc/). Hemoglobina e
// Leucocitos sao do Hemograma; Ferritina nao e.
import { ANALYTE_CATALOG } from '../amplify/functions/extract-document-data/analyteCatalog';

const doCatalogo = (rotulo: string) => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado;
};

function linha(overrides: Partial<LabResultView> = {}): LabResultView {
  return {
    id: 'l1',
    analyteCode: '',
    projectLabel: '',
    analyteLabel: '',
    value: 1,
    valueQualifier: null,
    unit: 'g/dL',
    rawValue: '1',
    rawUnit: 'g/dL',
    referenceLow: null,
    referenceHigh: null,
    collectedAt: '2025-10-04',
    collectionMoment: null,
    sourcePage: 1,
    reviewStatus: 'AUTO',
    ...overrides,
  };
}

describe('agruparPorExame', () => {
  // A tela do DASA mostra ~19 cartoes para 45 analitos, e nao 45 linhas
  // corridas. O campo `panel` do catalogo gerado e o que permite fazer isso
  // sem inventar agrupamento nosso (estudos-ia/02-designs/leitura-da-tela-dasa.md).

  it('junta no mesmo exame os analitos que o catalogo diz serem do mesmo painel', () => {
    const hemoglobina = doCatalogo('Hemoglobina');
    const leucocitos = ANALYTE_CATALOG.find(
      (a) => a.panel === hemoglobina.panel && a.code !== hemoglobina.code,
    );
    if (!leucocitos) throw new Error('O catalogo precisa de dois analitos do mesmo painel.');

    const grupos = agruparPorExame([
      linha({ id: 'a', analyteCode: hemoglobina.code, projectLabel: hemoglobina.projectLabel }),
      linha({ id: 'b', analyteCode: leucocitos.code, projectLabel: leucocitos.projectLabel }),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].titulo).toBe(hemoglobina.panel);
    expect(grupos[0].linhas).toHaveLength(2);
  });

  it('nao junta analitos de exames diferentes', () => {
    const hemoglobina = doCatalogo('Hemoglobina');
    const outroPainel = ANALYTE_CATALOG.find((a) => a.panel !== hemoglobina.panel);
    if (!outroPainel) throw new Error('O catalogo precisa de dois paineis distintos.');

    const grupos = agruparPorExame([
      linha({ id: 'a', analyteCode: hemoglobina.code }),
      linha({ id: 'b', analyteCode: outroPainel.code }),
    ]);

    expect(grupos).toHaveLength(2);
  });

  it('o analito de codigo local tem lugar, e nao some (D32)', () => {
    // A cobertura de 100% morre aqui se este caso cair fora: a linha existe no
    // banco e nao apareceria na tela.
    const grupos = agruparPorExame([
      linha({ id: 'a', analyteCode: 'X-ZINCO-SANGUINEO', projectLabel: 'Zinco Sanguíneo' }),
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].linhas[0].projectLabel).toBe('Zinco Sanguíneo');
  });

  it('mantem a ordem em que o laudo trouxe as linhas dentro do exame', () => {
    // Reordenar por valor seria inventar um criterio; reordenar por nome
    // desmontaria a leitura de cima para baixo que a pessoa faz no papel.
    const hemoglobina = doCatalogo('Hemoglobina');
    const grupos = agruparPorExame([
      linha({ id: 'segunda', analyteCode: hemoglobina.code }),
      linha({ id: 'primeira', analyteCode: hemoglobina.code, collectionMoment: 'depois' }),
    ]);

    expect(grupos[0].linhas.map((l) => l.id)).toEqual(['segunda', 'primeira']);
  });

  it('diz, por grupo, se aquele exame e comparavel entre laboratorios (D32)', () => {
    const grupos = agruparPorExame([
      linha({ id: 'a', analyteCode: 'X-SHBG', projectLabel: 'SHBG' }),
    ]);
    expect(grupos[0].comparavel).toBe(false);

    const comCatalogo = agruparPorExame([linha({ id: 'b', analyteCode: doCatalogo('Hemoglobina').code })]);
    expect(comCatalogo[0].comparavel).toBe(true);
  });
});

describe('contarLinhas', () => {
  // "19 Exames disponiveis" no topo da tela do DASA. Aqui a contagem tem uma
  // segunda razao, que o estudo de leitura mediu: a cobertura do modelo e
  // INSTAVEL (47, 47, 42, 47 linhas em quatro execucoes iguais). Contagem
  // visivel e o que transforma omissao silenciosa em omissao percebida.

  it('conta os valores lidos e quantos esperam conferencia', () => {
    const contagem = contarLinhas([
      linha({ id: 'a' }),
      linha({ id: 'b' }),
      linha({ id: 'c', reviewStatus: 'PENDENTE_DE_REVISAO' }),
    ]);

    expect(contagem.total).toBe(3);
    expect(contagem.pendentes).toBe(1);
  });

  it('linha ja confirmada por uma pessoa nao conta como pendente', () => {
    const contagem = contarLinhas([linha({ id: 'a', reviewStatus: 'CONFIRMADO_PELO_USUARIO' })]);
    expect(contagem.pendentes).toBe(0);
  });
});
