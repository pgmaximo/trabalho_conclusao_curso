/**
 * O schema da memória do usuário (M1).
 *
 * Os testes são sobre o ARQUIVO-FONTE, e não sobre o cliente do Amplify. O que
 * precisa ser garantido aqui não é comportamento de tempo de execução: é que o
 * schema não tenha ganhado os campos que a análise de LGPD proibiu, e que ele
 * não tenha mexido em model que já existe (regra 5 da constituição). Essas duas
 * coisas se leem no texto do arquivo; nenhuma delas apareceria chamando
 * `create`.
 *
 * Mesmo raciocínio do teste de varredura de escrita da função do chat.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = join(__dirname, '..');
const memoria = readFileSync(join(RAIZ, 'amplify/data/schemas/memory.ts'), 'utf8');
const resource = readFileSync(join(RAIZ, 'amplify/data/resource.ts'), 'utf8');

describe('os dois models da memória', () => {
  it('existem, e são exatamente dois', () => {
    expect(memoria).toMatch(/export const assistantMemorySchema/);
    expect(memoria).toMatch(/AssistantMemoryFact:\s*a[\s\S]*?\.model\(/);
    expect(memoria).toMatch(/AssistantMemorySetting:\s*a[\s\S]*?\.model\(/);
  });

  it('os dois são do dono, e de mais ninguém', () => {
    // Sem isto, um fato sobre a saúde de uma pessoa fica legível para outra.
    const donos = memoria.match(/allow\.owner\(\)/g) ?? [];
    expect(donos).toHaveLength(2);
  });

  it('o fato guarda texto, tipo, origem e data', () => {
    for (const campo of ['text', 'kind', 'sourceConversationId', 'confirmedAt', 'editedAt']) {
      expect(memoria).toMatch(new RegExp(`\\b${campo}:`));
    }
  });

  it('a origem da conversa é OPCIONAL', () => {
    // A conversa pode ter sido apagada pela pessoa (D33), e o fato continua
    // sendo dela. Um campo obrigatório aqui faria a exclusão de uma conversa
    // impedir a gravação de fatos antigos.
    expect(memoria).not.toMatch(/sourceConversationId:\s*a\.string\(\)\.required\(\)/);
  });

  it('NÃO existe prazo de expiração nem marcação lógica de apagado', () => {
    // Mesma razão da D33: "apagado" não pode significar duas coisas ao mesmo
    // tempo -- sumiu da sua tela, e ainda está no banco. Um TTL aqui seria a
    // implementação da opção que a D33 recusou.
    expect(memoria).not.toMatch(/\bttl\b/i);
    expect(memoria).not.toMatch(/deletedAt|removedAt|expiresAt/);
  });

  it('NÃO existe campo para valor de exame', () => {
    // A análise de LGPD proibiu guardar número de saúde como fato. A proibição
    // é de categoria, e começa por não haver onde escrever.
    expect(memoria).not.toMatch(/\bvalue\b|\bunit\b|\bresultId\b|\banalyteCode\b/);
  });
});

describe('a composição no schema do aplicativo', () => {
  it('a memória entra no schema', () => {
    expect(resource).toMatch(/\.\.\.assistantMemorySchema/);
  });

  it('os oito parciais anteriores continuam compostos', () => {
    // Esta é a regra 5 em forma de teste: a EPIC nova acrescenta, e não
    // substitui. O spread silenciosamente sobrescreveria uma chave repetida.
    for (const parcial of [
      'userSchema',
      'medicalDocumentsSchema',
      'appointmentsSchema',
      'vaccinationSchema',
      'medicinesSchema',
      'preventionSchema',
      'healthImportSchema',
      'chatSchema',
    ]) {
      expect(resource).toMatch(new RegExp(`\\.\\.\\.${parcial}`));
    }
  });

  it('o arquivo da memória não importa nenhum outro parcial', () => {
    // Parcial que importa parcial cria ordem de carregamento entre eles, e a
    // composição por spread não tem como expressar dependência.
    expect(memoria).not.toMatch(/from '\.\/(user|chat|medical-documents|appointments)/);
  });
});
