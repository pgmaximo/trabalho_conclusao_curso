/**
 * Resumo do arquivo:
 * A conversa do Assistente que estava ABERTA quando a pessoa saiu da aba.
 *
 * Trocar de aba desmonta a tela do chat, e o estado dela ia junto: quem saía
 * no meio de uma conversa para olhar um exame voltava a um chat em branco, e
 * só achava a conversa de novo pela gaveta de histórico.
 *
 * Vive só na memória do app, de propósito. Fechar o app começa uma conversa
 * nova, como sempre foi; e sair da conta apaga a lembrança, para ela não
 * atravessar de uma conta para outra.
 */
let conversaAberta: string | null = null;

export function lembrarConversaAberta(id: string | null): void {
  conversaAberta = id;
}

export function conversaAbertaNaSessao(): string | null {
  return conversaAberta;
}
