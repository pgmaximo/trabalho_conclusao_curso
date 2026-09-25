/**
 * Resumo do arquivo:
 * Onde mora o endereco direto da funcao do assistente.
 *
 * Ele fica num arquivo proprio por um motivo pratico: `amplify_outputs.json`
 * so ganha o bloco `custom` depois do primeiro deploy, entao o campo pode
 * simplesmente nao existir. Ler isso com `outputs.custom.chatAssistantUrl`
 * direto derrubaria o modulo na importacao, antes de qualquer tratamento --
 * e derrubaria junto qualquer teste que importasse o servico.
 *
 * Aqui a ausencia e um `null`, e quem chama a transforma em mensagem honesta:
 * "indisponivel" e nao "tente novamente", porque tentar de novo nao faz o
 * endereco aparecer.
 */
import outputs from '../../amplify_outputs.json';

export function chatAssistantUrl(): string | null {
  const custom = (outputs as { custom?: Record<string, unknown> }).custom;
  const url = custom?.chatAssistantUrl;
  return typeof url === 'string' && url !== '' ? url : null;
}
