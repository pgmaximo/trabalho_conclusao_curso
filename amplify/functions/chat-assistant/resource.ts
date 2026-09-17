import { defineFunction } from '@aws-amplify/backend';

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
  // Mesma justificativa das demais funcoes deste repo: precisa de
  // grantReadData sobre varias tabelas da stack "data".
  resourceGroupName: 'data',
});
