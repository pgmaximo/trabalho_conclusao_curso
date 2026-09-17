/**
 * Resumo do arquivo:
 * O laco de tools e as duas geracoes da D31. Preenchido pela tarefa C4; nesta
 * tarefa existe apenas o contrato que o handler consome, para que a porta
 * possa ser escrita e testada inteira antes do laco.
 *
 * ENQUANTO ESTE ARQUIVO ESTIVER ASSIM, A FUNCAO NAO E PUBLICAVEL. Ele lanca de
 * proposito: uma resposta de mentira devolvida daqui seria indistinguivel de
 * uma resposta real na tela.
 */
import type { ChatContext, ChatTurnRequest, ChatTurnResult } from './types';

export async function responder(
  _request: ChatTurnRequest,
  _context: ChatContext,
): Promise<ChatTurnResult> {
  throw new Error('O laco de conversa ainda nao foi implementado (tarefa C4).');
}
