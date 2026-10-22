/**
 * A saida de `consultar_receitas` (E4, 4.1), pura. O que estes testes garantem:
 * so documento do tipo receita entra, com teto e contagem do que ficou de fora;
 * o nome do remedio sai sem concentracao; e -- a garantia da D4.2 -- nenhum
 * campo nem valor de posologia lida do papel chega a saida.
 *
 * As linhas usam os nomes do schema publicado (`medical-documents.ts`): teste
 * que inventa a forma do dado concorda com qualquer implementacao.
 */
// `texto` e `maisRecentePrimeiro` moram em `ownerScopedRead.ts`, que cria o
// cliente do DynamoDB ao carregar; o SDK publicado e ESM e nao carrega no Jest.
jest.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: () => ({}) } }));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import {
  blocoDegradadoDeReceitas,
  escolherReceitas,
  montarSaidaDeReceitas,
  nomeDoRemedio,
} from '../tools/receitasSaida';
import { PROMETE_PRAZO } from '../tools/situacaoDaLeitura';

const AGORA = new Date('2026-10-19T15:00:00Z');
const receita = (id: string, data: string, extra: Record<string, unknown> = {}) => ({
  id,
  documentType: 'prescription',
  documentName: `Receita ${id}`,
  documentDate: data,
  expirationDate: '2026-12-01',
  extractionStatus: 'SUCCEEDED',
  ...extra,
});
const item = (label: string, extra: Record<string, unknown> = {}) => ({
  medicationLabel: label,
  dose: '50',
  unit: 'mg',
  frequency: 'de 8 em 8 horas',
  duration: '30 dias',
  rawText: 'Losartana 50mg 1cp 8/8h',
  confidence: 0.95,
  reviewStatus: 'AUTO',
  ...extra,
});

describe('escolherReceitas (E4)', () => {
  it('so documento do tipo receita, as 5 mais recentes, e conta o resto', () => {
    const docs = [
      receita('a', '2026-01-01'),
      { id: 'e', documentType: 'exam', documentDate: '2026-10-01' },
      { id: 'n', documentDate: '2026-10-02' },
      ...['b', 'c', 'd', 'f', 'g'].map((id, i) => receita(id, `2026-0${i + 2}-01`)),
    ];
    const { escolhidas, omitidas } = escolherReceitas(docs);
    expect(escolhidas.map((d) => d.id)).toEqual(['g', 'f', 'd', 'c', 'b']);
    expect(omitidas).toBe(1);
  });
});

describe('nomeDoRemedio (E4)', () => {
  it('tira a concentracao e o parentese, como o E9', () => {
    expect(nomeDoRemedio('Losartana 50mg')).toBe('Losartana');
    expect(nomeDoRemedio('Dipirona (genérico)  500 mg')).toBe('Dipirona');
  });

  it.each([
    ['Bisoprolol 2,5 mg', 'Bisoprolol'],
    ['Vitamina D 50.000 UI', 'Vitamina D'],
    // o "a" solto e parte do nome; so o "a cada" e sobra (revisao do E6)
    ['Vitamina A 50.000 UI', 'Vitamina A'],
    ['Dipirona a cada 8 horas', 'Dipirona'],
    ['Dexametasona 0.1%', 'Dexametasona'],
    ['Sertralina 50', 'Sertralina'],
    ['AAS 100', 'AAS'],
    ['Amoxicilina de 8 em 8 horas', 'Amoxicilina'],
    ['Losartana 1x ao dia', 'Losartana'],
    ['Amoxicilina 500mg/5ml', 'Amoxicilina'],
    ['Vitamina B12', 'Vitamina B12'],
    // Os rotulos que o revisor independente mediu passando pela R3 (revisao do E4).
    ['Dipirona 0,5 g', 'Dipirona'],
    ['Clonazepam 2,5mg/ml 10 gotas', 'Clonazepam'],
    // Combinacao: cada parte e limpa sozinha, e o nome nao perde o segundo
    // principio ativo (risco 2 do E4).
    ['Amoxicilina 875 + Clavulanato 125mg', 'Amoxicilina + Clavulanato'],
    ['Losartana 50mg + Hidroclorotiazida 12,5mg', 'Losartana + Hidroclorotiazida'],
    ['Losartana/Hidroclorotiazida 50/12,5mg', 'Losartana/Hidroclorotiazida'],
    ['Dipirona + 500mg', 'Dipirona'],
    ['Paracetamol 750 1cp 8/8h', 'Paracetamol'],
    ['Azitromicina 500 por 3 dias', 'Azitromicina'],
    ['Insulina NPH 10 unidades', 'Insulina NPH'],
    ['Dipirona 20 gotas de 6/6h', 'Dipirona'],
    ['Vitamina D3', 'Vitamina D3'],
    // Numero colado a pontuacao (revisao dos riscos): o corte vale para todo
    // digito que nao esteja colado a uma letra.
    ['AAS-100', 'AAS'],
    ['AAS/100', 'AAS'],
    ['Amoxicilina+Clav.125', 'Amoxicilina + Clav'],
    ['Losartana:50', 'Losartana'],
    ['Losartana #50', 'Losartana'],
    ['Ibuprofeno-4%', 'Ibuprofeno'],
  ])('nenhum numero de posologia sobra no nome (revisao do E4): %s -> %s', (rotulo, nome) => {
    expect(nomeDoRemedio(rotulo)).toBe(nome);
  });

  it('corta em 80 caracteres', () => {
    expect(nomeDoRemedio('A'.repeat(120))).toHaveLength(80);
  });

  it('rotulo que era so concentracao, ou vazio, vira "nome não legível" -- nunca o numero', () => {
    expect(nomeDoRemedio('50mg')).toBe('nome não legível');
    expect(nomeDoRemedio('   ')).toBe('nome não legível');
    expect(nomeDoRemedio(null)).toBe('nome não legível');
  });
});

describe('montarSaidaDeReceitas (E4)', () => {
  it('itens: nome sem concentracao, os tres booleanos, em ordem, e nada de posologia (H1, H2, H3)', () => {
    const saida = montarSaidaDeReceitas(
      [receita('r1', '2026-10-10')],
      [
        [
          item('Losartana 50mg'),
          item('Hidroclorotiazida', {
            dose: null,
            unit: '',
            frequency: null,
            duration: null,
            reviewStatus: 'PENDENTE_DE_REVISAO',
          }),
          item('Amoxicilina', { reviewStatus: 'CONFIRMADO_PELO_USUARIO' }),
        ],
      ],
      0,
      AGORA,
    );

    expect(saida.receitas[0]).toMatchObject({
      documentId: 'r1',
      titulo: 'Receita r1',
      dataDaReceita: '2026-10-10',
      validaAte: '2026-12-01',
      leitura: { situacao: 'lido' },
      itensOmitidos: 0,
    });
    expect(saida.receitas[0].itens).toEqual([
      { remedio: 'Amoxicilina', temPosologiaNoPapel: true, conferidoPelaPessoa: true, leituraDuvidosa: false },
      { remedio: 'Hidroclorotiazida', temPosologiaNoPapel: false, conferidoPelaPessoa: false, leituraDuvidosa: true },
      { remedio: 'Losartana', temPosologiaNoPapel: true, conferidoPelaPessoa: false, leituraDuvidosa: false },
    ]);

    const json = JSON.stringify(saida);
    for (const proibido of ['"dose"', '"unit"', '"frequency"', '"duration"', '"rawText"', '"confidence"', '50', '8 em 8', '30 dias', '1cp']) {
      expect(json).not.toContain(proibido);
    }
    expect(json).not.toMatch(PROMETE_PRAZO); // CA-13
    expect(saida.avisoDosItens).toMatch(/lidos automaticamente do arquivo da receita/);
  });

  it('mais de 15 itens: 15 saem e o resto e contado', () => {
    const itens = Array.from({ length: 17 }, (_, i) => item(`Remedio ${String.fromCharCode(65 + i)}`));
    const r = montarSaidaDeReceitas([receita('r1', '2026-10-10')], [itens], 0, AGORA).receitas[0];
    expect(r.itens).toHaveLength(15);
    expect(r.itensOmitidos).toBe(2);
  });

  it('o mesmo remedio lido duas vezes sai uma vez, com os avisos juntados (revisao do E4)', () => {
    // A releitura nao apaga os itens antigos, e o id deles inclui a dose: "50" e
    // "50 mg" viram duas linhas do mesmo remedio.
    const r = montarSaidaDeReceitas(
      [receita('r1', '2026-10-10')],
      [
        [
          item('Losartana 50mg', { reviewStatus: 'CONFIRMADO_PELO_USUARIO' }),
          item('Losartana', { dose: null, unit: null, frequency: null, duration: null, reviewStatus: 'PENDENTE_DE_REVISAO' }),
        ],
      ],
      0,
      AGORA,
    ).receitas[0];
    expect(r.itens).toEqual([
      { remedio: 'Losartana', temPosologiaNoPapel: true, conferidoPelaPessoa: false, leituraDuvidosa: true },
    ]);
    expect(r.itensOmitidos).toBe(0);
  });

  it('o bloco degradado nao mostra numero do papel (revisao do E4, CA-14)', () => {
    const saida = montarSaidaDeReceitas(
      [receita('r1', '2026-10-10')],
      [[item('Dipirona 20 gotas de 6/6h'), item('AAS 100'), item('Paracetamol 750 1cp 8/8h')]],
      0,
      AGORA,
    );
    expect(blocoDegradadoDeReceitas(saida)!.linhas[0]).toBe('Receita r1 · 10/10/2026: AAS, Dipirona, Paracetamol');
  });

  it('receita sem item traz a situacao da leitura (H4)', () => {
    const saida = montarSaidaDeReceitas([receita('r1', '2026-10-10', { extractionStatus: 'NO_RESULTS' })], [[]], 0, AGORA);
    expect(saida.receitas[0]).toMatchObject({ itens: [], itensOmitidos: 0, leitura: { situacao: 'sem_valores' } });
    expect(saida.disponivel).toBe(true);
  });

  it('sem receita: disponivel false, com explicacao (H5)', () => {
    const nada = montarSaidaDeReceitas([], [], 0, AGORA);
    expect(nada).toMatchObject({ disponivel: false, total: 0, receitas: [], receitasOmitidas: 0 });
    expect(nada.explicacao).toMatch(/receita/);
    // Sem documento, a explicacao das situacoes so gastaria contexto (simplify do E4).
    expect(nada).not.toHaveProperty('explicacaoDaLeitura');
  });

  it('documento sem id nao vira consulta (revisao do E4)', () => {
    const { escolhidas } = escolherReceitas([receita('r1', '2026-10-10'), { ...receita('', '2026-10-11'), id: undefined }]);
    expect(escolhidas.map((d) => d.id)).toEqual(['r1']);
  });

  it('o aviso manda baixar o documento, porque a tela nao mostra a foto (revisao do E4)', () => {
    expect(montarSaidaDeReceitas([], [], 0, AGORA).avisoDosItens).toContain('Baixar documento');
  });

  it('conta as receitas de fora no total', () => {
    const saida = montarSaidaDeReceitas([receita('r1', '2026-10-10')], [[]], 3, AGORA);
    expect(saida).toMatchObject({ total: 4, receitasOmitidas: 3 });
  });
});

describe('itens de leituras antigas (risco 1 do E4)', () => {
  const lida = (extra: Record<string, unknown> = {}) =>
    receita('r1', '2026-10-10', { extractionStartedAt: '2026-10-15T10:00:00.000Z', ...extra });

  it('receita lida: so os itens gravados pela ultima leitura', () => {
    // A Lambda grava `updatedAt` em cada item que a leitura escreve; o que tem
    // data anterior ao inicio da ultima leitura sobrou de uma leitura velha.
    const r = montarSaidaDeReceitas(
      [lida()],
      [[
        item('Losartana', { updatedAt: '2026-10-15T10:01:00.000Z' }),
        item('Captopril', { updatedAt: '2026-10-01T09:00:00.000Z' }),
      ]],
      0,
      AGORA,
    ).receitas[0];
    expect(r.itens.map((i) => i.remedio)).toEqual(['Losartana']);
  });

  it('sem data para comparar, nada sai: item sem updatedAt, ou receita sem inicio de leitura', () => {
    const semData = montarSaidaDeReceitas([lida()], [[item('Losartana'), item('Captopril', { updatedAt: 'x' })]], 0, AGORA);
    expect(semData.receitas[0].itens).toHaveLength(2);
    const semInicio = montarSaidaDeReceitas(
      [receita('r1', '2026-10-10')],
      [[item('Captopril', { updatedAt: '2026-10-01T09:00:00.000Z' })]],
      0,
      AGORA,
    );
    expect(semInicio.receitas[0].itens).toHaveLength(1);
  });

  it('leitura nova sem remedio (NO_RESULTS): os itens velhos nao aparecem, como na tela', () => {
    const r = montarSaidaDeReceitas(
      [lida({ extractionStatus: 'NO_RESULTS' })],
      [[item('Captopril', { updatedAt: '2026-10-01T09:00:00.000Z' })]],
      0,
      AGORA,
    ).receitas[0];
    expect(r.itens).toEqual([]);
    expect(r.leitura.situacao).toBe('sem_valores');
  });

  it('o item que a pessoa conferiu fica, mesmo com data antiga: a Lambda tambem o preserva (revisao)', () => {
    const r = montarSaidaDeReceitas(
      [lida()],
      [[item('Captopril', { updatedAt: '2026-10-01T09:00:00.000Z', reviewStatus: 'CONFIRMADO_PELO_USUARIO' })]],
      0,
      AGORA,
    ).receitas[0];
    expect(r.itens.map((i) => i.remedio)).toEqual(['Captopril']);
  });

  it('releitura que falhou: os itens sao da leitura anterior e continuam (como a tela)', () => {
    const r = montarSaidaDeReceitas(
      [lida({ extractionStatus: 'FAILED' })],
      [[item('Captopril', { updatedAt: '2026-10-01T09:00:00.000Z' })]],
      0,
      AGORA,
    ).receitas[0];
    expect(r.itens.map((i) => i.remedio)).toEqual(['Captopril']);
  });
});

describe('receita cujos itens nao puderam ser lidos agora (risco 4 do E4)', () => {
  it('sai marcada, sem itens, e o aviso so aparece quando acontece', () => {
    const saida = montarSaidaDeReceitas(
      [receita('r1', '2026-10-10'), receita('r2', '2026-09-01')],
      [[item('Losartana')], null],
      0,
      AGORA,
    );
    expect(saida.receitas[0]).not.toHaveProperty('itensIndisponiveis');
    expect(saida.receitas[1]).toMatchObject({ itens: [], itensOmitidos: 0, itensIndisponiveis: true });
    expect(saida.avisoDeIndisponiveis).toMatch(/não foi possível ler os remédios/);
    expect(montarSaidaDeReceitas([receita('r1', '2026-10-10')], [[]], 0, AGORA)).not.toHaveProperty(
      'avisoDeIndisponiveis',
    );
  });

  it('no modo degradado, diz que nao foi possivel ler, e nao "nenhum remedio lido"', () => {
    const saida = montarSaidaDeReceitas([receita('r1', '2026-10-10')], [null], 0, AGORA);
    expect(blocoDegradadoDeReceitas(saida)!.linhas[0]).toBe('Receita r1 · 10/10/2026: não foi possível ler os remédios agora');
  });
});

describe('blocoDegradadoDeReceitas (E4, H11)', () => {
  it('nomes, sem posologia, com a ressalva', () => {
    const saida = montarSaidaDeReceitas(
      [receita('r1', '2026-10-10'), receita('r2', '2026-09-01', { documentName: '' })],
      [[item('Losartana 50mg'), item('Hidroclorotiazida')], []],
      0,
      AGORA,
    );
    expect(blocoDegradadoDeReceitas(saida)).toEqual({
      titulo: 'Receitas guardadas',
      linhas: [
        'Receita r1 · 10/10/2026: Hidroclorotiazida, Losartana',
        'Receita sem título · 01/09/2026: nenhum remédio lido',
        'Nomes lidos do arquivo da receita, sem conferência.',
      ],
      citacoes: [],
    });
  });

  it('receita sem item diz a situacao da leitura, e nao que o papel nao tinha remedio (revisao do E4)', () => {
    const estados: Array<[string | undefined, string]> = [
      ['SUCCEEDED', 'nenhum remédio lido'],
      ['NO_RESULTS', 'nenhum remédio lido'],
      ['PROCESSING', 'leitura em andamento'],
      [undefined, 'ainda não lida'],
      ['FAILED', 'a leitura não deu certo'],
    ];
    for (const [extractionStatus, texto] of estados) {
      const saida = montarSaidaDeReceitas([receita('r1', '2026-10-10', { extractionStatus })], [[]], 0, AGORA);
      expect(blocoDegradadoDeReceitas(saida)!.linhas[0]).toBe(`Receita r1 · 10/10/2026: ${texto}`);
    }
  });

  it('sem receita, nada a mostrar', () => {
    expect(blocoDegradadoDeReceitas(montarSaidaDeReceitas([], [], 0, AGORA))).toBeNull();
  });
});
