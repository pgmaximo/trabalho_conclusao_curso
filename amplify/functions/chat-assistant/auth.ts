/**
 * Resumo do arquivo:
 * Quem e o dono da requisicao. Este arquivo existe porque a D12 tirou o chat
 * de dentro do AppSync, e com isso a verificacao de identidade -- que o
 * AppSync fazia sozinho -- passou a ser nossa.
 *
 * REGRA QUE NAO TEM EXCECAO: o dono sai do TOKEN. Nenhum identificador vindo
 * do corpo da requisicao e aceito, nunca. Um endereco direto que confia num
 * identificador do corpo e uma porta aberta para ler dado de saude de outra
 * pessoa, e nenhuma camada posterior recupera isso. A funcao recebe UM
 * argumento -- o cabecalho -- de proposito: nao existe parametro por onde um
 * identificador do corpo pudesse entrar.
 */
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export type ChatIdentity = { sub: string; username: string; owner: string };

// Uma mensagem so para toda recusa. "Token expirado" e "assinatura invalida"
// contariam ao chamador o que ajustar para a proxima tentativa.
const RECUSA = 'Usuario nao autenticado.';

// O verificador cacheia as chaves publicas do pool -- criado UMA vez, fora do
// handler, para o cache sobreviver entre invocacoes na mesma instancia.
//
// Criado sob demanda (e nao no carregamento do modulo) porque as variaveis de
// ambiente so existem na Lambda: avaliar isto na importacao faria qualquer
// teste que importa este arquivo construir um verificador contra um pool
// vazio.
let verificadorCache: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function verificador() {
  if (!verificadorCache) {
    verificadorCache = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID ?? '',
      tokenUse: 'id',
      clientId: process.env.USER_POOL_CLIENT_ID ?? '',
    });
  }
  return verificadorCache;
}

export async function resolveIdentity(
  authorizationHeader: string | undefined,
): Promise<ChatIdentity> {
  const token = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice(7).trim()
    : null;
  if (!token) throw new Error(RECUSA);

  let claims: Record<string, unknown>;
  try {
    claims = (await verificador().verify(token)) as unknown as Record<string, unknown>;
  } catch {
    throw new Error(RECUSA);
  }

  const sub = typeof claims.sub === 'string' ? claims.sub : null;
  const username =
    typeof claims['cognito:username'] === 'string' ? claims['cognito:username'] : null;
  // Sem username nao ha owner, e sem owner nenhuma tool pode filtrar. Recusar
  // e a unica saida segura -- montar um owner parcial faria as tools filtrarem
  // por um valor que nao existe na tabela, devolvendo lista vazia em vez de
  // erro, que e a pior forma de falhar.
  if (!sub || !username) throw new Error(RECUSA);

  return { sub, username, owner: `${sub}::${username}` };
}
