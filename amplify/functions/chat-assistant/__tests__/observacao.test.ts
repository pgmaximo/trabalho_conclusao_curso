/**
 * Resumo do arquivo:
 * O corte de observacao que medicamentos (E2), consultas e vacinas (E5)
 * usam. Uma funcao so: duas copias acabariam cortando em tamanhos diferentes,
 * e o modelo trataria um trecho como o texto inteiro.
 */
// `texto` mora em `ownerScopedRead.ts`, que importa o SDK; o Jest nao le o
// build ESM nativo dele, entao o SDK e trocado por um vazio, como nos testes
// das ferramentas.
jest.mock('@aws-sdk/lib-dynamodb', () => ({ DynamoDBDocumentClient: { from: () => ({}) } }));
jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: class {} }));

import { MAX_CARACTERES_OBSERVACAO, observacaoComTeto } from '../tools/observacao';

describe('observacaoComTeto', () => {
  it('o teto e de 300 caracteres', () => {
    expect(MAX_CARACTERES_OBSERVACAO).toBe(300);
  });

  it('observacao curta volta inteira', () => {
    expect(observacaoComTeto('jejum de 12 horas')).toEqual({
      observacoes: 'jejum de 12 horas',
      observacoesCortadas: false,
    });
  });

  it.each([undefined, null, '', '   ', 42])('sem texto vira null: %p', (valor) => {
    expect(observacaoComTeto(valor)).toEqual({ observacoes: null, observacoesCortadas: false });
  });

  it('exatamente no teto nao e cortada', () => {
    expect(observacaoComTeto('a'.repeat(300))).toEqual({
      observacoes: 'a'.repeat(300),
      observacoesCortadas: false,
    });
  });

  it('acima do teto volta com os primeiros 300 e avisa', () => {
    expect(observacaoComTeto('a'.repeat(301))).toEqual({
      observacoes: 'a'.repeat(300),
      observacoesCortadas: true,
    });
  });
});
