import { defineFunction } from '@aws-amplify/backend';

export const sendMedicineReminders = defineFunction({
  name: 'sendMedicineReminders',
  entry: './handler.ts',
  timeoutSeconds: 55,
  // A Lambda e idempotente; executar a cada minuto evita atrasos perceptiveis
  // sem depender de um aparelho permanecer ligado.
  schedule: 'every 1m',
  runtime: 20,
  resourceGroupName: 'data',
});
