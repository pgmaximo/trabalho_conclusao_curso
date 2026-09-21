/**
 * Defeito achado com o aplicativo na mao, em 2026-09-18: a conversa listava
 * "Documento sem titulo" para um exame que a tela de exames mostrava com nome.
 *
 * A causa nao era o dado -- era o NOME DO CAMPO. A tool lia `title` e
 * `laboratory`; o modelo `MedicalDocument` tem `documentName` e nao tem
 * laboratorio nenhum. Como `texto()` devolve nulo para o que nao e string, os
 * dois sumiam em silencio: nenhum erro, nenhum log, so um titulo generico.
 *
 * Por que passou por revisao e por teste: o teste existente montava o item com
 * OS MESMOS nomes errados que a tool lia. Um teste que inventa a forma do dado
 * concorda com qualquer implementacao -- inclusive com uma que le um campo que
 * o banco nao tem. Os itens daqui usam os nomes do schema publicado.
 */
const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: (...a: unknown[]) => mockSend(...a) }) },
  ScanCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import type { ChatIdentity } from '../auth';
import { examesTool } from '../tools/exames';

const IDENTIDADE: ChatIdentity = { sub: 's-1', username: 'u-1', owner: 's-1::u-1' };

/** Os nomes sao os do schema publicado, conferidos em `amplify_outputs.json`. */
const DOCUMENTO = {
  id: 'doc-1',
  owner: 's-1::u-1',
  documentType: 'exam',
  documentName: 'Exame de Sangue',
  documentDate: '2026-09-18',
  s3FileName: 'exams/x.pdf',
};

// As DUAS tabelas no topo: desde a U16 a tool le tambem as linhas de
// resultado, para saber quando o exame foi COLETADO. Definir a segunda so no
// describe de baixo deixava os primeiros casos rodando sem ela.
beforeAll(() =>
  Object.assign(process.env, { MEDICAL_DOCUMENT_TABLE_NAME: 't-doc', LAB_RESULT_TABLE_NAME: 't-lab' }),
);
beforeEach(() => mockSend.mockReset().mockResolvedValue({ Items: [DOCUMENTO] }));

describe('consultar_exames', () => {
  it('devolve o nome que o usuario deu ao documento', async () => {
    const saida = (await examesTool.run({}, IDENTIDADE)) as {
      documentos: { titulo: string | null; tipo: string | null; dataDoDocumento: string | null }[];
    };

    expect(saida.documentos[0].titulo).toBe('Exame de Sangue');
    expect(saida.documentos[0].tipo).toBe('exam');
    expect(saida.documentos[0].dataDoDocumento).toBe('2026-09-18');
  });

  it('a saida degradada mostra o nome, e nao o texto generico', async () => {
    const saida = await examesTool.run({}, IDENTIDADE);
    const bloco = examesTool.renderDegraded?.(saida);

    expect(bloco?.linhas[0]).toContain('Exame de Sangue');
    expect(bloco?.linhas[0]).not.toContain('Documento sem título');
  });

  it('documento sem nome continua aparecendo, com o texto generico', async () => {
    // O generico existe para o caso real de nome ausente, e nao como sintoma
    // de campo lido errado. Este caso trava a distincao entre os dois.
    mockSend.mockResolvedValue({ Items: [{ ...DOCUMENTO, documentName: undefined }] });

    const saida = await examesTool.run({}, IDENTIDADE);
    const bloco = examesTool.renderDegraded?.(saida);

    expect(bloco?.linhas[0]).toContain('Documento sem título');
    expect(bloco?.linhas[0]).toContain('2026-09-18');
  });
});

/**
 * U12 e U16 -- o que a conversa real pediu e a tool nao tinha.
 *
 * U12, o LABORATORIO: a pessoa perguntou duas vezes onde o exame foi feito. A
 * recusa honesta veio de a descricao da tool ter sido corrigida para dizer a
 * verdade sobre o que existia naquele dia. Agora o campo existe, e a verdade
 * mudou.
 *
 * U16, as DATAS: no turno 1 o assistente disse que o exame era de 18/09/2026, e
 * no turno 3 que o valor era de 04/10/2025. As duas frases estavam certas --
 * uma e a data do formulario, a outra e a da coleta -- e juntas mentiam. Agora
 * a tool devolve a faixa de coleta, e o prompt prefere ela.
 */
describe('consultar_exames — laboratório e datas', () => {
  function responder(documentos: unknown[], linhas: unknown[]) {
    mockSend.mockImplementation((cmd: { input?: { TableName?: string } }) =>
      Promise.resolve({ Items: cmd?.input?.TableName === 't-lab' ? linhas : documentos }),
    );
  }

  it('U12: devolve o laboratório quando o documento o traz', async () => {
    responder([{ ...DOCUMENTO, laboratorio: 'Delboni Auriemo' }], []);

    const s = (await examesTool.run({}, IDENTIDADE)) as {
      documentos: { laboratorio: string | null }[];
    };

    expect(s.documentos[0].laboratorio).toBe('Delboni Auriemo');
  });

  it('U12: documento sem laboratório legível NÃO ganha um nome inventado', async () => {
    responder([DOCUMENTO], []);

    const s = (await examesTool.run({}, IDENTIDADE)) as {
      documentos: { laboratorio: string | null }[];
    };

    expect(s.documentos[0].laboratorio).toBeNull();
  });

  it('U16: devolve a faixa de datas de COLETA das linhas do documento', async () => {
    responder(
      [DOCUMENTO],
      [
        { id: 'l-1', documentId: 'doc-1', collectedAt: '2025-10-04' },
        { id: 'l-2', documentId: 'doc-1', collectedAt: '2025-10-06' },
        { id: 'l-3', documentId: 'outro', collectedAt: '2020-01-01' },
      ],
    );

    const s = (await examesTool.run({}, IDENTIDADE)) as {
      documentos: { coletadoEntre: { primeira: string; ultima: string } | null }[];
    };

    expect(s.documentos[0].coletadoEntre).toEqual({
      primeira: '2025-10-04',
      ultima: '2025-10-06',
    });
  });

  it('U16: documento sem linha nenhuma diz que a data é de REGISTRO', async () => {
    // Sem linha, a unica data que existe e a do formulario -- e chama-la de
    // "data do exame" e exatamente o defeito que esta tarefa conserta.
    responder([DOCUMENTO], []);

    const s = (await examesTool.run({}, IDENTIDADE)) as {
      documentos: { coletadoEntre: unknown; dataDoDocumento: string | null }[];
      explicacaoDaData?: string;
    };

    expect(s.documentos[0].coletadoEntre).toBeNull();
    expect(s.documentos[0].dataDoDocumento).toBe('2026-09-18');
    expect(s.explicacaoDaData).toMatch(/registro/i);
  });

  it('a descrição volta a mencionar laboratório — desta vez com o campo existindo', async () => {
    expect(examesTool.description).toMatch(/laborat[oó]rio/i);
    expect(examesTool.description).not.toMatch(/laboratório NÃO é guardado/i);
  });
});
