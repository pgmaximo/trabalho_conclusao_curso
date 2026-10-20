/**
 * A infraestrutura que o E4 acrescenta ao chat (CA-17): LEITURA dos itens de
 * receita, e a consulta ao indice deles, e nada alem disso. O teste le o codigo
 * de definicao, como o das doses: e o que da para afirmar sem sandbox.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const backend = readFileSync(join(__dirname, '..', '..', '..', 'backend.ts'), 'utf8');
const lacoDoChat = backend.slice(
  backend.indexOf('for (const tabela of ['),
  backend.indexOf('tabela.grantReadData(chatAssistantLambda)'),
);

describe('infraestrutura do chat para as receitas (E4)', () => {
  it('a tabela de itens de receita entra no laco de grantReadData do chat', () => {
    expect(backend).toMatch(/const prescriptionItemTable = backend\.data\.resources\.tables\['PrescriptionItem'\]/);
    expect(lacoDoChat).toContain('prescriptionItemTable');
  });

  it('o chat recebe o nome da tabela', () => {
    expect(backend).toMatch(/chatAssistant\.addEnvironment\(\s*'PRESCRIPTION_ITEM_TABLE_NAME'/);
  });

  it('a consulta ao indice e so Query, e so nos indices desta tabela', () => {
    expect(backend).toMatch(
      /chatAssistantLambda\.addToRolePolicy\(\s*new iam\.PolicyStatement\(\{\s*actions: \['dynamodb:Query'\],\s*resources: \[`\$\{prescriptionItemTable\.tableArn\}\/index\/\*`\],/,
    );
  });

  it('nenhuma escrita e concedida ao chat', () => {
    expect(backend).not.toMatch(/grant(ReadWrite|Write)Data\(\s*chatAssistantLambda/);
    expect(backend).not.toMatch(/grantFullAccess\(\s*chatAssistantLambda/);
  });
});
