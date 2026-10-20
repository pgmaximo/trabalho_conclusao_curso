/**
 * A infraestrutura que o E6 acrescenta ao chat (CA 17): LEITURA so do
 * `result.json` de cada importacao, nunca dos arquivos brutos que a pessoa
 * exportou, e nenhuma escrita no bucket. O teste le o codigo de definicao, como
 * o das doses: e o que da para afirmar sem sandbox.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const backend = readFileSync(join(__dirname, '..', '..', '..', 'backend.ts'), 'utf8');

describe('infraestrutura do chat para a serie do wearable (E6)', () => {
  it('o chat le so o result.json das importacoes', () => {
    expect(backend).toMatch(/bucket\.grantRead\(chatAssistantLambda, 'health-imports\/\*\/result\.json'\)/);
  });

  it('o chat nao le a pasta de importacoes inteira', () => {
    expect(backend).not.toMatch(/grantRead(Write)?\(chatAssistantLambda, 'health-imports\/\*'\)/);
  });

  it('nenhuma escrita no bucket e concedida ao chat', () => {
    expect(backend).not.toMatch(/bucket\.grant(ReadWrite|Write|Put|Delete)\w*\(\s*chatAssistantLambda/);
  });

  it('o chat recebe o nome do bucket', () => {
    expect(backend).toMatch(/chatAssistant\.addEnvironment\(\s*'HEALTH_BUCKET_NAME'/);
  });
});
