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
    // Anexo PONTUAL da conversa (D15). Pasta separada de medical-documents/
    // de proposito, e nao por organizacao: o que esta la faz parte do
    // historico e tem uma linha em MedicalDocument apontando para ele; o que
    // esta aqui nao tem linha nenhuma -- existe para uma pergunta.
    //
    // A separacao tambem e o que permite conceder a funcao do chat leitura
    // SO daqui: ela nunca precisa enxergar o historico de documentos.
    'chat-attachments/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
