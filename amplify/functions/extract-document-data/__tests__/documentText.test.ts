import { blocksToExtractedText, chooseReadingPath } from '../documentText';

describe('blocksToExtractedText', () => {
  it('agrupa linhas por pagina e preserva a ordem', () => {
    const result = blocksToExtractedText([
      { BlockType: 'LINE', Page: 1, Text: 'Hemograma' },
      { BlockType: 'LINE', Page: 2, Text: 'Vitamina D 32,5 ng/mL' },
      { BlockType: 'LINE', Page: 1, Text: 'Paciente' },
      { BlockType: 'WORD', Page: 1, Text: 'ignorar' },
    ]);
    expect(result.pages).toEqual([
      { page: 1, text: 'Hemograma\nPaciente' },
      { page: 2, text: 'Vitamina D 32,5 ng/mL' },
    ]);
    expect(result.fullText).toContain('Vitamina D 32,5 ng/mL');
  });

  it('trata Page ausente como pagina 1 -- e o que a chamada sincrona devolve', () => {
    // A resposta sincrona do Textract para imagem de pagina unica NAO traz o
    // atributo Page. Sem esta regra, sourcePage sairia vazio em toda foto de
    // laudo, e "de onde saiu esse numero" ficaria sem resposta.
    const result = blocksToExtractedText([{ BlockType: 'LINE', Text: 'Vitamina D 32,5 ng/mL' }]);
    expect(result.pages).toEqual([{ page: 1, text: 'Vitamina D 32,5 ng/mL' }]);
  });

  it('devolve estrutura vazia quando nao ha nenhuma linha', () => {
    expect(blocksToExtractedText([])).toEqual({ pages: [], fullText: '' });
  });
});

describe('chooseReadingPath', () => {
  // A D19 mediu que o modelo le PDF nativo com qualidade -- 41 analitos de um
  // laudo real, com virgula decimal intacta. O Textract deixa de ser caminho
  // critico e fica para o que o bloco de documento do Converse nao aceita.
  it('manda PDF direto ao modelo, sem Textract no caminho (D19)', () => {
    expect(chooseReadingPath('application/pdf')).toBe('modelo-direto');
  });

  it('manda imagem para o Textract, porque a leitura por modelo nao foi medida nela', () => {
    expect(chooseReadingPath('image/jpeg')).toBe('textract-sincrono');
    expect(chooseReadingPath('image/png')).toBe('textract-sincrono');
  });

  it('trata tipo desconhecido como imagem, que e o caminho que nunca inventa', () => {
    // Tentar o Textract e receber recusa do servico e melhor que mandar bytes
    // de tipo desconhecido ao modelo: a recusa e explicita e vira erro de
    // extracao, em vez de virar uma leitura plausivel de um arquivo errado.
    expect(chooseReadingPath('application/octet-stream')).toBe('textract-sincrono');
    expect(chooseReadingPath('')).toBe('textract-sincrono');
  });

  it('nao se confunde com parametro de charset no tipo de conteudo', () => {
    expect(chooseReadingPath('application/pdf; charset=binary')).toBe('modelo-direto');
  });
});
