/**
 * Resumo do arquivo:
 * O contrato entre a porta (handler) e o laco (conversationLoop), e entre a
 * funcao e o aplicativo. Fica num arquivo proprio para que o handler nao
 * precise importar o laco so para conhecer o formato da resposta.
 */
import type { AnswerCitation, MemoryProposal } from './chatSchema';
import type { ChatIdentity } from './auth';
import type { FormatoDeImagem } from '../extract-document-data/formatoDoArquivo';

/**
 * Qual dos quatro caminhos da D31 aconteceu. E o dado que calibra a secao 7 da
 * spec -- sem ele nao ha como saber se a segunda geracao paga o que custa.
 */
export type RuleCheckStatus = 'APROVADA' | 'APROVADA_NA_SEGUNDA' | 'DEGRADADA' | 'INDISPONIVEL';

/**
 * De onde veio um numero citado. A R4 exige que todo numero na resposta tenha
 * vindo de uma linha registrada; isto e o que torna a exigencia verificavel
 * depois do fato, e nao so no momento da geracao.
 */
export type Citation = {
  /** Id da linha de LabResult de onde o valor saiu. */
  resultId: string;
  /** Documento de origem, para a bolha levar a pessoa ate o papel. */
  documentId: string;
  analyteLabel: string;
  value: string;
  unit: string;
  collectedAt: string | null;
};

/**
 * O anexo pontual ja lido, na forma em que ele entra na conversa. Duas formas
 * porque sao os dois blocos do Converse que o projeto usa:
 *
 *   - `pdf`    -> bloco de documento (D19).
 *   - `imagem` -> bloco de imagem (Bloco 10). Substituiu a forma `texto`, que
 *                 era o OCR do Textract -- um caminho que a conta nunca teve.
 *
 * Uniao, e nao um objeto com campos opcionais: um anexo lido dos dois jeitos
 * seria o mesmo papel entrando duas vezes na janela do modelo.
 */
export type AnexoLido =
  | { kind: 'pdf'; bytes: Uint8Array }
  | { kind: 'imagem'; formato: FormatoDeImagem; bytes: Uint8Array };

export type ChatTurnResult = {
  answer: string;
  citations: Citation[];
  ruleCheckStatus: RuleCheckStatus;
  /**
   * A proposta de memoria (D34), quando houve uma e ela passou pela validacao.
   *
   * Isto NAO grava nada. E um texto que o aplicativo vai MOSTRAR, com dois
   * botoes; quem grava e a pessoa, e e por isso que a funcao continua somente
   * leitura -- o consentimento do art. 11, I virando caminho de codigo.
   */
  memoriaProposta?: MemoryProposal;
};

export type ChatTurnRequest = {
  message: string;
  /** Janela de historico -- o aplicativo manda, a funcao corta (C4). */
  history: { role: 'user' | 'assistant'; content: string }[];
  /** A chave do anexo pontual no bucket. O aplicativo manda a chave, nunca o
   *  texto: aceitar texto pronto deixaria o chamador escrever qualquer coisa
   *  como se tivesse saido de um documento. */
  attachmentKey?: string | null;
  /** O anexo ja lido. Preenchido pelo handler, nunca pelo cliente, e vive so
   *  nesta conversa (C7, D15). Chega em bytes, PDF ou foto, porque a rota dos
   *  dois e o modelo (D19, Bloco 10). */
  anexo?: AnexoLido | null;
  /** Se a pessoa deixou a memoria ligada. Ausente significa ligada -- ver
   *  `TurnInput.memoriaAtiva`. */
  memoriaAtiva?: boolean;
};

export type ChatContext = {
  /** Sempre do token. Nenhum campo do corpo chega aqui. */
  identity: ChatIdentity;
};

/**
 * Um bloco do MODO DEGRADADO (D31, tarefa C5b): o dado que as ferramentas
 * devolveram, sem prosa gerada. Cada tool sabe renderizar o proprio, porque
 * quem conhece a forma da saida e quem a produz.
 */
export type DegradedBlock = {
  titulo: string;
  /** Uma linha de dado por coleta, ja formatada em pt-BR. */
  linhas: string[];
  /** A origem de cada numero da secao -- e o que mantem a bolha clicavel
   *  mesmo quando nao houve prosa gerada. Vazio quando a secao nao traz
   *  numero de exame. */
  citacoes: AnswerCitation[];
};
