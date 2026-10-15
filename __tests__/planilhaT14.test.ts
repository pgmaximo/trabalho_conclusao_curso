/**
 * G8 (Bloco 10) -- a planilha da T14, pronta antes de o papel chegar.
 *
 * O numero que a T14 procura e um so: quantas linhas passaram como AUTOMATICAS
 * estando ERRADAS. E o unico modo de falha que corrompe o historico em silencio
 * -- a linha errada marcada como pendente e o sistema funcionando.
 *
 * A planilha abre no Excel brasileiro sem configurar nada: separador ponto e
 * virgula (a virgula e o decimal), e BOM de UTF-8 para o acento nao quebrar.
 */
import { contarConferencia, lerPlanilha, montarPlanilha, type LinhaLida } from '../scripts/avaliacao/planilhaT14';

const linha = (over: Partial<LinhaLida> = {}): LinhaLida => ({
  sourcePage: 1,
  analyteLabel: 'Hemoglobin [Mass/volume] in Blood',
  projectLabel: 'Hemoglobina',
  rawValue: '16,1',
  rawUnit: 'g/dL',
  value: 16.1,
  unit: 'g/dL',
  rawReferenceText: null,
  reviewStatus: 'AUTO',
  confidence: 0.99,
  ...over,
});

describe('montarPlanilha', () => {
  it('abre no Excel brasileiro: BOM, ponto e virgula, cabecalho em portugues', () => {
    const csv = montarPlanilha([linha()]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const [cabecalho] = csv.slice(1).split('\r\n');
    expect(cabecalho).toContain(';');
    expect(cabecalho).toMatch(/valor no papel/i);
    expect(cabecalho).toMatch(/confere/i);
  });

  it('as colunas de conferencia vem VAZIAS -- quem preenche e a pessoa com o papel', () => {
    const csv = montarPlanilha([linha()]);
    const [, primeira] = csv.slice(1).split('\r\n');
    expect(primeira!.endsWith(';;')).toBe(true);
  });

  it('ordena por pagina, que e a ordem em que a pessoa le o papel', () => {
    const csv = montarPlanilha([linha({ sourcePage: 3, projectLabel: 'B' }), linha({ sourcePage: 1, projectLabel: 'A' })]);
    const linhas = csv.slice(1).split('\r\n');
    expect(linhas[1]).toContain(';A;');
    expect(linhas[2]).toContain(';B;');
  });

  it('protege campo com ponto e virgula ou aspas', () => {
    const csv = montarPlanilha([linha({ rawReferenceText: 'Adulto: 30 a 60; Idoso: "20"' })]);
    expect(csv).toContain('"Adulto: 30 a 60; Idoso: ""20"""');
  });
});

describe('contarConferencia', () => {
  it('conta a linha AUTOMATICA errada, que e o numero da T14', () => {
    // A pessoa preencheu a coluna "confere" com "nao" na hemoglobina.
    const csv = montarPlanilha([linha(), linha({ projectLabel: 'VCM', reviewStatus: 'PENDENTE_DE_REVISAO' })]);
    const preenchida = csv
      .split('\r\n')
      .map((l, i) => (i === 1 ? `${l.slice(0, -2)}16,7;g/dL;nao` : i === 2 ? `${l.slice(0, -2)}90,5;fL;nao` : l))
      .join('\r\n');

    expect(contarConferencia(lerPlanilha(preenchida))).toEqual({
      conferidas: 2,
      naoConferidas: 0,
      certas: 0,
      automaticasErradas: 1,
      pendentesErradas: 1,
    });
  });

  it('linha sem "confere" preenchido nao entra na conta -- nao foi conferida', () => {
    const r = contarConferencia(lerPlanilha(montarPlanilha([linha()])));
    expect(r).toMatchObject({ conferidas: 0, naoConferidas: 1, automaticasErradas: 0 });
  });

  it('aceita "sim"/"s"/"ok" e "nao"/"n"/"não", em qualquer caixa', () => {
    const csv = montarPlanilha([linha(), linha(), linha()]);
    const respostas = ['SIM', 'Não', 'ok'];
    const preenchida = csv
      .split('\r\n')
      // A coluna "confere" e a ULTIMA e ja vem vazia: a resposta e so
      // concatenada. (A primeira versao deste caso cortava um separador antes,
      // e a resposta caia na coluna "unidade no papel" -- defeito do teste.)
      .map((l, i) => (i >= 1 && i <= 3 ? `${l}${respostas[i - 1]}` : l))
      .join('\r\n');
    expect(contarConferencia(lerPlanilha(preenchida))).toMatchObject({ certas: 2, automaticasErradas: 1 });
  });
});
