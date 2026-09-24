/**
 * G4 -- a falha da leitura diz o motivo, e so em portugues.
 *
 * Duas metades do mesmo defeito, as duas medidas no codigo em 2026-09-22:
 * - a tela de falha mostrava sempre a mesma frase e nunca lia `extractionError`;
 * - o handler gravava `erro.message` cru nesse campo -- mensagem do SDK da AWS
 *   ou caminho de campo do zod.
 *
 * O conserto e um conjunto FECHADO de motivos, cada um com a sua copy. O campo
 * que a tela le passa a ser seguro de mostrar por construcao.
 */
import { COPY_DA_FALHA, MOTIVOS_DE_FALHA, copyDaFalha, ehCopyDeFalha } from '../motivoDeFalha';

describe('motivoDeFalha', () => {
  it('todo motivo tem copy em portugues, nao vazia, que termina em ponto', () => {
    for (const motivo of MOTIVOS_DE_FALHA) {
      const copy = copyDaFalha(motivo);
      expect(copy.length).toBeGreaterThan(20);
      expect(copy).toMatch(/\.$/);
      // Sem jargao que a pessoa nao tem como entender nem como agir sobre.
      expect(copy).not.toMatch(/Exception|Bedrock|Textract|zod|S3|JSON|schema|token/i);
    }
  });

  it('cada motivo diz o que fazer, e nao so o que houve', () => {
    expect(copyDaFalha('grande-demais')).toMatch(/menor|reduz|foto/i);
    expect(copyDaFalha('formato-nao-suportado')).toMatch(/PDF|foto|imagem/);
    expect(copyDaFalha('ilegivel')).toMatch(/nítida|luz/i);
    expect(copyDaFalha('leitura-falhou')).toMatch(/tente de novo|tentar de novo/i);
  });

  it('arquivo-sem-dono (D46) pede o reenvio, e a tela o reconhece', () => {
    // A mesma frase serve ao arquivo enviado antes do metadado existir e ao
    // arquivo de outra pessoa: o log distingue os dois, a tela nao precisa.
    const copy = copyDaFalha('arquivo-sem-dono');
    expect(copy).toMatch(/envie o arquivo de novo/i);
    expect(ehCopyDeFalha(copy)).toBe(true);
    // Nao acusa a pessoa: quase sempre quem ve esta frase e o dono legitimo de
    // um arquivo antigo.
    expect(copy).not.toMatch(/outra pessoa|não é seu|nao e seu|permiss/i);
  });

  it('as copies sao distintas -- motivo diferente, frase diferente', () => {
    const copies = MOTIVOS_DE_FALHA.map(copyDaFalha);
    expect(new Set(copies).size).toBe(copies.length);
  });

  it('reconhece a propria copy, e so ela', () => {
    // E o que a tela usa para decidir se mostra o campo: texto que nao e da
    // lista -- gravado antes do Bloco 10 -- nao aparece.
    expect(ehCopyDeFalha(COPY_DA_FALHA['grande-demais'])).toBe(true);
    expect(ehCopyDeFalha('ValidationException: Input is too long for requested model.')).toBe(false);
    expect(ehCopyDeFalha('labResults.3.rawValue: Invalid input')).toBe(false);
    expect(ehCopyDeFalha(null)).toBe(false);
  });
});
