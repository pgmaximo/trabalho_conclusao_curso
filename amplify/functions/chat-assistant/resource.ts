import { defineFunction, secret } from '@aws-amplify/backend';

export const chatAssistant = defineFunction({
  name: 'chat-assistant',
  entry: './handler.ts',
  // Um laco de tools -- modelo pede dado, funcao busca, modelo pede outro,
  // responde -- passa dos 30s do resolver do AppSync com facilidade, e foi por
  // isso que a D12 tirou o chat de la. 120s cobre o laco mais longo previsto
  // (teto de iteracoes em conversationLoop.ts) com folga, e o aplicativo tem
  // teto proprio, menor, para a tela nunca esperar para sempre.
  timeoutSeconds: 120,
  memoryMB: 1024,
  environment: {
    // `consultar_prevencao` (E7, D7.1 = A) baixa o dataset publico da USPSTF
    // com a MESMA chave que a Lambda da tela de Prevencao ja usa -- um segredo
    // so, nao um novo. E o unico acrescimo de superficie do E7, e nenhuma
    // outra ferramenta o le. A chave nunca vai a log nem a saida de ferramenta.
    USPSTF_API_KEY: secret('USPSTF_API_KEY'),
  },
  // Mesma justificativa das demais funcoes deste repo: precisa de
  // grantReadData sobre varias tabelas da stack "data".
  resourceGroupName: 'data',
});
