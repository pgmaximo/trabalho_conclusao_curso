import { defineFunction } from '@aws-amplify/backend';

export const startHealthAnalysis = defineFunction({
  name: 'start-health-analysis',
  entry: './handler.ts',
  // So valida o dono, marca PROCESSING e dispara a analyze-health-import de
  // forma assincrona (fire-and-forget) — nunca espera o resultado, por isso
  // o teto de 30s do resolver do AppSync nunca chega perto de ser testado.
  timeoutSeconds: 10,
  // Mesma justificativa das demais funcoes deste repo (ver
  // get-vaccination-campaigns/resource.ts): fica na stack "data" porque e o
  // resolver da mutation customizada (referenciada pela stack "data") e
  // tambem precisa de grantInvoke sobre analyze-health-import (que
  // referenciaria de volta a stack "function") — manter as duas funcoes na
  // mesma stack "data" evita a dependencia ciclica entre stacks aninhadas.
  resourceGroupName: 'data',
});
