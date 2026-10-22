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
import { campanhasTool } from './campanhas';
import { comparacaoTool } from './comparacao';
import { consultasTool } from './consultas';
import { dosesTomadasTool } from './dosesTomadas';
import { examesTool } from './exames';
import { interacoesTool } from './interacoes';
import { medicamentosTool } from './medicamentos';
import { panoramaTool } from './panorama';
import { perfilTool } from './perfil';
import { postosTool } from './postos';
import { prevencaoTool } from './prevencao';
import { receitasTool } from './receitas';
import { resultadosTool } from './resultados';
import type { ChatTool } from './tipos';
import { vacinasTool } from './vacinas';
import { wearableTool } from './wearable';
import { wearableDiasTool } from './wearableDias';

import type { ChatIdentity } from '../auth';
import type { ContextoDoTurno } from '../types';

export type { ChatTool } from './tipos';

export const CHAT_TOOLS: ChatTool[] = [
  // Primeira (E10): "como eu to?" e "o que tenho registrado?" comecam pelo
  // resumo, e a descricao manda chamar a ferramenta do assunto so se a pessoa
  // pedir detalhe -- e o que poupa iteracoes numa pergunta ampla.
  panoramaTool,
  perfilTool,
  examesTool,
  // A ordem importa pouco para o funcionamento e muito para a escolha do
  // modelo: `consultar_resultados` vem logo depois de `consultar_exames`
  // porque e o passo natural depois de saber QUE documentos existem.
  resultadosTool,
  analitosTool,
  // Fecha o bloco de documentos (E4): exames diz QUE documentos existem;
  // receitas, o que a receita trazia. Nao e a lista de remedios cadastrados
  // (consultar_medicamentos), e a descricao diz isso.
  receitasTool,
  consultasTool,
  medicamentosTool,
  // Logo depois de medicamentos (E3): medicamentos diz o que esta CADASTRADO;
  // doses, o que foi MARCADO como tomado. "Tomei hoje?" e desta, nunca daquela.
  dosesTomadasTool,
  // Logo depois de medicamentos (E9): e o vizinho com que o modelo mais a
  // confundiria. Medicamentos LISTA o cadastro; interacoes CRUZA os remedios
  // contra a lista curada do aplicativo.
  interacoesTool,
  vacinasTool,
  // Logo depois de vacinas porque e o vizinho com que o modelo mais a
  // confundiria: vacinas e o que a pessoa TOMOU; prevencao e o que a fonte
  // RECOMENDA para o grupo dela (E7).
  prevencaoTool,
  // Campanhas e postos (E8) fecham o bloco de vacinacao: campanhas e o que o
  // calendario do Ministerio tem ATIVO hoje; postos, ONDE fica a unidade.
  // Sao as unicas que nao leem dado pessoal (ver `FERRAMENTAS_PUBLICAS` em
  // `tools.test.ts`).
  campanhasTool,
  postosTool,
  // Logo antes do wearable (E10): e o vizinho com que o modelo mais a
  // confundiria. Wearable e o resumo da importacao, sem exame; comparacao poe
  // um exame AO LADO da media dos 28 dias antes da coleta, sem ligar um ao
  // outro.
  comparacaoTool,
  wearableTool,
  // Logo depois do wearable (E6): wearable e o RESUMO da importacao, com a
  // lista e a analise da tela; dias e o dia a dia e a comparacao de periodos.
  wearableDiasTool,
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
  contexto: ContextoDoTurno = { local: null },
): Promise<unknown> {
  const tool = POR_NOME.get(name);
  if (!tool) return { erro: `Ferramenta desconhecida: ${name}.` };

  // A entrada e VALIDADA, e todo schema e `.strict()`: um campo a mais --
  // `owner`, por exemplo -- reprova a chamada inteira em vez de ser carregado
  // adiante em silencio.
  const validado = tool.inputSchema.safeParse(input ?? {});
  if (!validado.success) return { erro: 'Os argumentos da consulta não são válidos.' };

  try {
    return await tool.run(validado.data, identity, contexto);
  } catch (erro) {
    console.error(`Falha na tool ${name}:`, erro);
    return { erro: 'Não foi possível consultar esse dado agora.' };
  }
}
