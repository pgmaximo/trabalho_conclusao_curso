/**
 * A verificacao de identidade e a tarefa mais sensivel desta EPIC: a D12 tirou
 * o chat de dentro do AppSync, e com isso a autenticacao -- que o AppSync fazia
 * sozinho -- passou a ser nossa. Um defeito aqui nao e um bug de recurso, e
 * uma porta para ler dado de saude de outra pessoa.
 */
const mockVerify = jest.fn();
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: () => ({ verify: (...a: unknown[]) => mockVerify(...a) }),
  },
}));

import { resolveIdentity } from '../auth';

describe('resolveIdentity', () => {
  beforeEach(() => mockVerify.mockReset());

  it('recusa requisicao sem cabecalho de autorizacao', async () => {
    await expect(resolveIdentity(undefined)).rejects.toThrow(/autenticad/i);
  });

  it('recusa cabecalho malformado', async () => {
    await expect(resolveIdentity('token-solto')).rejects.toThrow(/autenticad/i);
  });

  it('recusa token que o verificador rejeita', async () => {
    mockVerify.mockRejectedValue(new Error('assinatura invalida'));
    await expect(resolveIdentity('Bearer abc')).rejects.toThrow(/autenticad/i);
  });

  it('nao vaza o motivo tecnico da recusa para o chamador', async () => {
    // "assinatura invalida" e "token expirado" contam ao chamador o que
    // ajustar para tentar de novo. A mensagem e sempre a mesma.
    mockVerify.mockRejectedValue(new Error('Token expired at 2026-01-01'));
    await expect(resolveIdentity('Bearer abc')).rejects.not.toThrow(/expired/i);
  });

  it('monta o owner no formato sub::username, que e o gravado na tabela', async () => {
    // Mesmo formato usado por start-health-analysis e
    // get-prevention-recommendations. A resposta do GraphQL so ecoa a metade
    // "sub"; o valor GRAVADO e sempre o composto.
    mockVerify.mockResolvedValue({ sub: 's-1', 'cognito:username': 'u-1' });
    await expect(resolveIdentity('Bearer abc')).resolves.toEqual({
      sub: 's-1',
      username: 'u-1',
      owner: 's-1::u-1',
    });
  });

  it('recusa token valido sem username -- sem username nao ha owner', async () => {
    mockVerify.mockResolvedValue({ sub: 's-1' });
    await expect(resolveIdentity('Bearer abc')).rejects.toThrow(/autenticad/i);
  });

  it('IGNORA qualquer identificador que venha junto no corpo da requisicao', async () => {
    // A regra de seguranca mais importante deste plano, e ela e verificada
    // pela ASSINATURA: `resolveIdentity` recebe UM argumento, o cabecalho.
    // Nao existe parametro por onde um owner do corpo pudesse entrar, entao
    // nao existe caminho de codigo em que ele seja preferido ao token.
    expect(resolveIdentity.length).toBe(1);

    mockVerify.mockResolvedValue({ sub: 's-1', 'cognito:username': 'u-1' });
    const identidade = await (resolveIdentity as (...a: unknown[]) => Promise<unknown>)(
      'Bearer abc',
      { owner: 'vitima::vitima' },
    );
    expect(identidade).toEqual({ sub: 's-1', username: 'u-1', owner: 's-1::u-1' });
  });
});
