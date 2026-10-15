/**
 * Resumo do arquivo:
 * A leitura dos fatos que a pessoa confirmou, e o bloco que eles viram no
 * prompt de sistema (D34).
 *
 * A MEMÓRIA NÃO É UMA TOOL, e a diferença importa. Tool é coisa que o modelo
 * decide chamar; uma memória que o modelo escolhe quando consultar não é
 * memória. Os fatos entram no prompt de sistema SEMPRE, antes da primeira
 * palavra, como contexto de forma.
 *
 * Mas a leitura passa pela MESMA porta das tools — `lerDoDono` —, e isso não é
 * comodidade: é o que mantém uma porta só por onde um dono vira valor de
 * consulta, e essa porta só aceita o dono que veio do token.
 *
 * ELA LÊ E NÃO ESCREVE. Quem escreve é o aplicativo, a partir de um toque da
 * pessoa. A função continua somente leitura por contrato, e a varredura que
 * garante isso cobre este arquivo.
 */
import type { ChatIdentity } from '../auth';
import { lerDoDono, type LinhaDoBanco } from '../tools/ownerScopedRead';
import { SYSTEM_PROMPT } from '../chatPrompt';

import { MAX_FATOS, normalizarTexto, tipoValido, type MemoryKind } from './regras';

export type FatoDeMemoria = {
  id: string;
  texto: string;
  tipo: MemoryKind;
};

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

/**
 * Lê os fatos do dono, já filtrados e cortados no teto.
 *
 * NUNCA LANÇA. Sem memória o assistente continua respondendo, e perder a
 * resposta da pessoa por causa de uma tabela mal configurada seria trocar o
 * essencial pelo acessório.
 */
export async function lerMemoria(identity: ChatIdentity): Promise<FatoDeMemoria[]> {
  let linhas: LinhaDoBanco[];
  try {
    linhas = await lerDoDono(process.env.ASSISTANT_MEMORY_TABLE_NAME, identity);
  } catch {
    return [];
  }

  return linhas
    .filter((linha) => {
      // Tipo fora da lista fechada é descartado na LEITURA, e não só na
      // gravação: a lista pode encolher, e um fato órfão entrando no prompt
      // por um tipo que ninguém mais reconhece seria finalidade sem decisão
      // (art. 6º, I).
      const tipo = texto(linha.kind);
      return tipoValido(tipo) && normalizarTexto(texto(linha.text)) !== '';
    })
    // Mais recente primeiro. Fato sem data vai para o fim em vez de sumir: ele
    // existe, e a pessoa precisa poder vê-lo e apagá-lo.
    .sort((a, b) => texto(b.confirmedAt).localeCompare(texto(a.confirmedAt)))
    .slice(0, MAX_FATOS)
    .map((linha) => ({
      id: texto(linha.id),
      texto: normalizarTexto(texto(linha.text)),
      tipo: texto(linha.kind) as MemoryKind,
    }));
}

/**
 * O bloco declarado.
 *
 * As três frases do cabeçalho não são enfeite. Sem elas, "faço caminhada três
 * vezes por semana" poderia ser citado como se fosse dado registrado, com a
 * autoridade que só o registro tem — e um fato poderia virar fonte de número,
 * que é exatamente o que a R4 proíbe e o que o esquema de citação impede do
 * outro lado.
 */
export function blocoDeMemoria(fatos: FatoDeMemoria[]): string {
  if (fatos.length === 0) return '';

  const linhas = fatos.map((f) => `- ${f.texto}`).join('\n');

  return `

O que a pessoa pediu para você lembrar dela:
${linhas}
Isto NÃO é registro de saúde, e NÃO serve como fonte de número: todo valor que você citar continua vindo de uma ferramenta, com o documento de origem. Use estas linhas para escolher COMO responder — o tamanho, o tratamento, o horário que faz sentido para ela —, e nunca como um fato clínico sobre ela.`;
}

/**
 * Sem fato nenhum, devolve o prompt exatamente como ele era antes desta EPIC.
 * É a regra 5 em forma de função: o caminho antigo não muda de byte.
 */
export function montarSystemPrompt(fatos: FatoDeMemoria[]): string {
  return `${SYSTEM_PROMPT}${blocoDeMemoria(fatos)}`;
}
