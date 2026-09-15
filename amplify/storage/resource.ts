import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'medicalDocuments',
  access: (allow) => ({
    // `{entity_id}` é o único token dinâmico reconhecido pelo Amplify Storage
    // (substituído pelo identityId do usuário autenticado) — `{owner}` (usado
    // antes aqui) NÃO é substituído, vira um segmento de pasta literal
    // compartilhado por todo mundo. `allow.entity('identity')` é o que de fato
    // restringe cada usuário à própria pasta (equivalente ao `allow.owner()`
    // do Data, mas para Storage).
    'medical-documents/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'avatars/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    // Arquivos brutos exportados de apps de saude (CSV/JSON/ZIP) enviados
    // pelo usuario para a feature de importacao de wearables. So a
    // analyze-health-import (via grantReadWrite no backend.ts) le esses
    // arquivos; o app so escreve.
    'health-imports/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
