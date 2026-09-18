/**
 * Resumo do arquivo:
 * Grava, lista, corrige e apaga os fatos da memória do assistente (D34).
 *
 * QUEM GRAVA É O APLICATIVO, e nunca a função do chat. A função é somente
 * leitura por contrato — há um teste que varre os arquivos dela procurando
 * comando de escrita, e nesta EPIC a varredura passou a cobrir a função
 * inteira. Gravando por aqui, a autorização por dono é a do AppSync: a mesma
 * que já protege exame, consulta e medicamento.
 *
 * MAS AQUI A FRONTEIRA VALE UMA SEGUNDA COISA, e ela é a mais importante: esta
 * é a **base legal virando caminho de código**. O art. 11, I da LGPD exige
 * consentimento específico e destacado para dado sensível, e "específico"
 * significa por fato. Toda função de gravação deste arquivo é chamada por um
 * toque da pessoa, depois de ela ler o texto exato. Não existe caminho em que
 * uma resposta do modelo produza uma escrita.
 *
 * A validação da M3 roda DE NOVO aqui, embora a função já a tenha rodado. Não é
 * redundância: a função valida o que o modelo propôs, e isto valida o que vai
 * ser gravado — inclusive um texto que a pessoa editou à mão.
 */
import { generateClient } from 'aws-amplify/data';

import type { Schema } from '../../amplify/data/resource';
import { validarProposta } from '../../amplify/functions/chat-assistant/memoria/propostaValida';
import {
  MAX_FATOS,
  normalizarTexto,
  type MemoryKind,
} from '../../amplify/functions/chat-assistant/memoria/regras';

/**
 * Criado sob demanda, e nao no carregamento do modulo. Um `generateClient()` no
 * corpo do arquivo constroi o cliente no momento do `import`, antes de qualquer
 * configuracao -- e, no teste, antes de o duplo estar pronto. Mesma armadilha
 * que a C8 ja mordeu.
 */
let clienteCache: ReturnType<typeof generateClient<Schema>> | null = null;

function cliente() {
  if (!clienteCache) clienteCache = generateClient<Schema>();
  return clienteCache;
}

export type FatoSalvo = {
  id: string;
  texto: string;
  tipo: string;
  confirmadoEm: string | null;
  editadoEm: string | null;
  conversaDeOrigem: string | null;
};

export type PropostaConfirmada = { texto: string; tipo: MemoryKind };

/**
 * `cheia` e `recusado` são motivos DIFERENTES de propósito: a tela precisa
 * dizer coisas diferentes, porque as saídas são diferentes — uma leva a apagar
 * um fato, a outra não leva a lugar nenhum.
 */
export type ResultadoDaGravacao = { ok: true } | { ok: false; motivo: 'recusado' | 'cheia' };

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export async function listarFatos(): Promise<FatoSalvo[]> {
  const { data } = await cliente().models.AssistantMemoryFact.list();
  return (data ?? [])
    .map((f) => ({
      id: String(f.id),
      texto: texto(f.text),
      tipo: texto(f.kind),
      confirmadoEm: f.confirmedAt ?? null,
      editadoEm: f.editedAt ?? null,
      conversaDeOrigem: f.sourceConversationId ?? null,
    }))
    // Mais recente primeiro. Fato sem data cai para o fim em vez de sumir: ele
    // existe, e a pessoa precisa poder vê-lo e apagá-lo (art. 18, II e IV).
    .sort((a, b) => (b.confirmadoEm ?? '').localeCompare(a.confirmadoEm ?? ''));
}

/**
 * Chamada por um toque em "Lembrar", e por nada mais.
 *
 * O texto é gravado como foi recebido, a menos do espaço normalizado. Mostrar
 * um texto na confirmação e gravar outro esvaziaria o consentimento.
 */
export async function guardarFato(
  proposta: PropostaConfirmada,
  conversaDeOrigem: string | null,
): Promise<ResultadoDaGravacao> {
  if (!validarProposta({ texto: proposta.texto, tipo: proposta.tipo }).ok) {
    return { ok: false, motivo: 'recusado' };
  }

  // O teto é do art. 6º, III. Atingi-lo é PEDIR à pessoa que apague um, e
  // nunca descartar o mais antigo em silêncio.
  const jaGravados = await listarFatos();
  if (jaGravados.length >= MAX_FATOS) return { ok: false, motivo: 'cheia' };

  await cliente().models.AssistantMemoryFact.create({
    text: normalizarTexto(proposta.texto),
    kind: proposta.tipo,
    sourceConversationId: conversaDeOrigem ?? undefined,
    confirmedAt: new Date().toISOString(),
  });

  return { ok: true };
}

/**
 * Art. 18, III — correção. A data original NÃO é reescrita: as duas contam
 * coisas diferentes, quando a pessoa consentiu e quando ela corrigiu.
 */
export async function editarFato(
  id: string,
  novoTexto: string,
  tipo: MemoryKind,
): Promise<ResultadoDaGravacao> {
  // O tipo vem de QUEM CHAMA, e não de uma leitura da lista inteira. Ler a
  // lista aqui custaria uma consulta a cada tecla salva, e teria um defeito
  // pior: com a lista vazia o tipo saía como texto vazio, e a validação
  // reprovava por "tipo inválido" em vez de reprovar pelo texto -- um teste de
  // recusa passando pelo motivo errado. A tela tem o tipo na mão.
  if (!validarProposta({ texto: novoTexto, tipo }).ok) return { ok: false, motivo: 'recusado' };

  await cliente().models.AssistantMemoryFact.update({
    id,
    text: normalizarTexto(novoTexto),
    editedAt: new Date().toISOString(),
  });

  return { ok: true };
}

/** Art. 18, IV. Apagar significa sumir, sem marcação lógica — mesma D33. */
export async function apagarFato(id: string): Promise<void> {
  await cliente().models.AssistantMemoryFact.delete({ id });
}

/** Art. 18, VI — eliminação dos dados tratados com consentimento. */
export async function apagarTodosOsFatos(): Promise<void> {
  for (const fato of await listarFatos()) {
    await cliente().models.AssistantMemoryFact.delete({ id: fato.id });
  }
}

/**
 * Ausência de linha significa LIGADA: a pessoa nunca mexeu no interruptor. E
 * ligada não grava nada sozinha — gravar depende de confirmação, sempre.
 */
export async function lerInterruptor(): Promise<boolean> {
  try {
    const { data } = await cliente().models.AssistantMemorySetting.list();
    const linha = (data ?? [])[0];
    return linha ? linha.enabled !== false : true;
  } catch {
    // Falhar aqui não pode desligar a memória de alguém sem que essa pessoa
    // tenha pedido. Na dúvida, o estado é o que ela viu por último, e o que
    // ela viu por último é o padrão.
    return true;
  }
}

/**
 * Art. 18, IX — revogação. Ela NÃO apaga: a eliminação é o art. 18, VI, é outro
 * direito e é outra decisão. Quem pergunta é a tela (art. 8º, §5).
 */
export async function definirInterruptor(ligada: boolean): Promise<void> {
  const { data } = await cliente().models.AssistantMemorySetting.list();
  const linha = (data ?? [])[0];
  const updatedAt = new Date().toISOString();

  if (linha) {
    await cliente().models.AssistantMemorySetting.update({
      id: String(linha.id),
      enabled: ligada,
      updatedAt,
    });
    return;
  }

  await cliente().models.AssistantMemorySetting.create({ enabled: ligada, updatedAt });
}
