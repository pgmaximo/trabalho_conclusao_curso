/**
 * A infraestrutura que o E3 acrescenta ao chat (CA-19): LEITURA do historico de
 * doses, e a consulta ao indice dele, e nada alem disso. O teste le o codigo de
 * definicao, como o da vacinacao: e o que da para afirmar sem sandbox.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const backend = readFileSync(join(__dirname, '..', '..', '..', 'backend.ts'), 'utf8');
const lacoDoChat = backend.slice(
  backend.indexOf('for (const tabela of ['),
  backend.indexOf('tabela.grantReadData(chatAssistantLambda)'),
);

describe('infraestrutura do chat para as doses tomadas (E3)', () => {
  it('o historico de doses entra no laco de grantReadData do chat', () => {
    expect(backend).toMatch(/const medicineDoseLogTable = backend\.data\.resources\.tables\['MedicineDoseLog'\]/);
    expect(lacoDoChat).toContain('medicineDoseLogTable');
  });

  it('o chat recebe o nome da tabela', () => {
    expect(backend).toMatch(/chatAssistant\.addEnvironment\(\s*'MEDICINE_DOSE_LOG_TABLE_NAME'/);
  });

  it('a consulta ao indice e so Query, e so nos indices desta tabela', () => {
    // O grant da tabela do Amplify cobre a ARN da tabela; a do indice, nao
    // (achado do Bloco 11, ver o comentario do `labResultTable`).
    expect(backend).toMatch(
      /chatAssistantLambda\.addToRolePolicy\(\s*new iam\.PolicyStatement\(\{\s*actions: \['dynamodb:Query'\],\s*resources: \[`\$\{medicineDoseLogTable\.tableArn\}\/index\/\*`\],/,
    );
  });

  it('nenhuma escrita e concedida ao chat', () => {
    expect(backend).not.toMatch(/grant(ReadWrite|Write)Data\(\s*chatAssistantLambda/);
    expect(backend).not.toMatch(/grantFullAccess\(\s*chatAssistantLambda/);
  });
});
