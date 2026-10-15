/**
 * Resumo do arquivo:
 * O registro das tools do chat. TODAS SAO SOMENTE LEITURA, e `readOnly: true`
 * e campo obrigatorio do tipo justamente para que um teste possa afirmar isso
 * sobre a lista inteira -- uma tool de escrita acrescentada por descuido nao
 * compila sem declarar o contrario, e o teste a pega.
 *
 * Por que isso importa mais do que parece: a D9 diz que a IA de comunicacao
 * nao grava dado clinico. Uma IA que conversa e ao mesmo tempo escreve dado
 * clinico e uma superficie de erro dificil de auditar -- o modelo decide
 * escrever, e ninguem revisa.
 *
 * O filtro por dono NAO mora aqui nem em cada tool: mora em
 * `ownerScopedRead.ts`, que e a unica porta de leitura. Uma tool nao recebe
 * como montar consulta, entao nao existe caminho por onde um valor da entrada
 * vire o dono da consulta.
 */
import { analitosTool } from './analitos';
import { consultasTool } from './consultas';
import { examesTool } from './exames';
import { medicamentosTool } from './medicamentos';
import { perfilTool } from './perfil';
import { resultadosTool } from './resultados';
import type { ChatTool } from './tipos';
import { vacinasTool } from './vacinas';
import { wearableTool } from './wearable';

import type { ChatIdentity } from '../auth';

export type { ChatTool } from './tipos';

export const CHAT_TOOLS: ChatTool[] = [
  perfilTool,
  examesTool,
  // A ordem importa pouco para o funcionamento e muito para a escolha do
  // modelo: `consultar_resultados` vem logo depois de `consultar_exames`
  // porque e o passo natural depois de saber QUE documentos existem.
  resultadosTool,
  analitosTool,
  consultasTool,
  medicamentosTool,
  vacinasTool,
  wearableTool,
];

const POR_NOME = new Map(CHAT_TOOLS.map((t) => [t.name, t]));

export function findTool(name: string): ChatTool | undefined {
  return POR_NOME.get(name);
}

/**
 * Despacha uma chamada de tool. NUNCA lanca: uma excecao aqui derrubaria o
 * turno inteiro, e o modelo perderia a chance de responder com o que ja tem.
 * Erro vira `{ erro }`, que o modelo le e sobre o qual a R5 manda ele ser
 * honesto.
 *
 * O texto do erro e generico de proposito. O modelo repete ao usuario o que
 * recebe, e nome de tabela e mensagem de driver nao tem por que chegar la.
 */
export async function runTool(
  name: string,
  input: unknown,
  identity: ChatIdentity,
): Promise<unknown> {
  const tool = POR_NOME.get(name);
  if (!tool) return { erro: `Ferramenta desconhecida: ${name}.` };

  // A entrada e VALIDADA, e todo schema e `.strict()`: um campo a mais --
  // `owner`, por exemplo -- reprova a chamada inteira em vez de ser carregado
  // adiante em silencio.
  const validado = tool.inputSchema.safeParse(input ?? {});
  if (!validado.success) return { erro: 'Os argumentos da consulta não são válidos.' };

  try {
    return await tool.run(validado.data, identity);
  } catch (erro) {
    console.error(`Falha na tool ${name}:`, erro);
    return { erro: 'Não foi possível consultar esse dado agora.' };
  }
}
