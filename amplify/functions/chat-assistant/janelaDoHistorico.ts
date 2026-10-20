/**
 * Resumo do arquivo:
 * Quantas mensagens do historico entram no turno. Mora num modulo sem
 * importacao porque dois lugares precisam do MESMO numero: o laco
 * (`conversationLoop.ts`), que corta o que o modelo ve, e a validacao da acao
 * proposta (`verificacao.ts`, E11), que so aceita campo confirmado por fala
 * que o modelo viu. Importa-lo do laco nao serviria: os testes da verificacao
 * substituem o laco inteiro, e a constante chegaria vazia.
 */

/** Mandar a conversa inteira cresce sem limite e paga por isso a cada turno. */
export const HISTORY_WINDOW = 12;
