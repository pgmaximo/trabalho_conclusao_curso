/**
 * O guardrail PROPRIO do chat (DS1 = B e DS2 = A, conferencia no sandbox de
 * 2026-10-20). O compartilhado com o wearable barrava a pergunta e a resposta
 * sobre os remedios da propria pessoa ("a Losartana esta cadastrada a cada 8
 * horas") e tratava como bloqueio o nome que ele so anonimizava ("Dra. Ana").
 * Os topicos so na saida (DS1 = A) ainda barraram 7 respostas legitimas, entao
 * o chat fica sem topicos: dose e diagnostico sao da R3, deterministica. O
 * teste le o codigo de definicao, como os outros testes de infraestrutura, e
 * prova que a R3 cobre o que os topicos cobriam.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkLanguageRules } from '../../ai-language-rules/languageRules';

const backend = readFileSync(join(__dirname, '..', '..', '..', 'backend.ts'), 'utf8');

function bloco(inicio: string, fim: string): string {
  const de = backend.indexOf(inicio);
  const ate = backend.indexOf(fim, de);
  if (de < 0 || ate < 0) return '';
  return backend.slice(de, ate);
}

const guardrailDoChat = bloco('const configuracaoDoGuardrailDoChat', '};');
const guardrailDoWearable = bloco('const configuracaoDoGuardrailDoWearable', '\n};');

describe('guardrail proprio do chat (DS1 = B, DS2 = A)', () => {
  it('existe, numa stack propria, com nome unico por ambiente', () => {
    expect(backend).toMatch(/const chatGuardrailStack = backend\.createStack\('chat-assistant-guardrail'\)/);
    expect(backend).toMatch(/new bedrock\.CfnGuardrail\(chatGuardrailStack, 'ChatAssistantGuardrail', \{\s*name: `chat-assistant-\$\{sufixoUnicoDaStack\}`/);
  });

  it('o chat le o id e a versao do guardrail dele, nao do wearable', () => {
    expect(backend).toMatch(/chatAssistant\.addEnvironment\(\s*'BEDROCK_GUARDRAIL_ID',\s*chatAssistantGuardrail\.attrGuardrailId/);
    expect(backend).toMatch(/chatAssistant\.addEnvironment\(\s*'BEDROCK_GUARDRAIL_VERSION',\s*chatAssistantGuardrailVersion\.attrVersion/);
    expect(backend).not.toMatch(/chatAssistant\.addEnvironment\(\s*'BEDROCK_GUARDRAIL_ID',\s*healthInsightsGuardrail/);
  });

  it('a permissao ApplyGuardrail do chat aponta para o guardrail dele', () => {
    expect(backend).toMatch(/actions: \['bedrock:ApplyGuardrail'\],\s*resources: \[chatAssistantGuardrail\.attrGuardrailArn\]/);
  });

  it('sem topicos (DS1 = B): nem a pergunta nem a resposta sobre o proprio remedio sao barradas', () => {
    expect(guardrailDoChat).not.toBe('');
    expect(guardrailDoChat).not.toContain('topicPolicyConfig');
  });

  it('a R3 reprova o que os exemplos dos topicos barravam', () => {
    for (const texto of [
      'Voce tem apneia do sono.',
      'Isso e um sinal claro de diabetes.',
      'Tome 500mg de paracetamol antes de dormir.',
      'Voce deveria aumentar a dose do seu remedio para pressao.',
      'Pare de tomar esse medicamento.',
    ]) {
      const r = checkLanguageRules(texto, { questionKind: 'clinica', temOrigem: true });
      expect({ texto, regras: r.ok ? [] : r.violations.map((v) => v.rule) }).toEqual({ texto, regras: expect.arrayContaining(['R3']) });
    }
  });

  it('sem filtro de nome (DS2), mantendo email, telefone, CPF e ataque de prompt', () => {
    expect(guardrailDoChat).not.toMatch(/type: 'NAME'/);
    expect(guardrailDoChat).toMatch(/type: 'EMAIL'/);
    expect(guardrailDoChat).toMatch(/type: 'PHONE'/);
    expect(guardrailDoChat).toMatch(/name: 'cpf'/);
    expect(guardrailDoChat).toMatch(/type: 'PROMPT_ATTACK', inputStrength: 'HIGH'/);
  });

  // Achado do deploy da DS1 = B: a CfnGuardrailVersion so publica versao nova
  // quando as propriedades DELA mudam. Mexer na configuracao so atualizava o
  // DRAFT, e o chat seguia lendo a versao 1, ainda com os topicos.
  it('a versao do guardrail do chat muda junto com a configuracao', () => {
    const versao = bloco("'ChatAssistantGuardrailVersion'", ');');
    expect(versao).toMatch(/description: `configuracao \$\{impressaoDaConfiguracao\(configuracaoDoGuardrailDoChat\)\}`/);
    expect(backend).toMatch(/new bedrock\.CfnGuardrail\(chatGuardrailStack, 'ChatAssistantGuardrail', \{\s*name: `chat-assistant-\$\{sufixoUnicoDaStack\}`,\s*\.\.\.configuracaoDoGuardrailDoChat,/);
  });

  // O mesmo defeito, latente, nos guardrails do wearable e da extracao: mudanca
  // feita neles depois do primeiro deploy nao chegava as funcoes.
  it.each([
    ['HealthInsightsGuardrailVersion', 'configuracaoDoGuardrailDoWearable', 'guardrailStack', 'HealthInsightsGuardrail', 'health-insights'],
    ['DocumentExtractionGuardrailVersion', 'configuracaoDoGuardrailDaExtracao', 'extractionGuardrailStack', 'DocumentExtractionGuardrail', 'document-extraction'],
  ])('a versao %s muda junto com a configuracao', (versaoId, configuracao, stack, guardrailId, prefixo) => {
    const versao = bloco(`'${versaoId}'`, ');');
    expect(versao).toContain(`description: \`configuracao \${impressaoDaConfiguracao(${configuracao})}\``);
    expect(backend).toMatch(
      new RegExp(`new bedrock\\.CfnGuardrail\\(${stack}, '${guardrailId}', \\{\\s*name: \`${prefixo}-\\$\\{sufixoUnicoDaStack\\}\`,\\s*\\.\\.\\.${configuracao},`),
    );
  });

  // O chat passa ao Claude Opus 5.5 e o modelo padrao (wearable e extracao) ao
  // Claude Sonnet 5.5 (pedidos do usuario, 2026-10-22).
  it('o chat usa o Claude Opus 5.5, com o perfil de inferencia e as duas ARNs dele', () => {
    expect(backend).toMatch(/const CHAT_BASE_MODEL_ID = 'anthropic\.claude-opus-5-5';/);
    expect(backend).toMatch(/chatAssistant\.addEnvironment\('BEDROCK_MODEL_ID', CHAT_INFERENCE_PROFILE_ID\)/);
    expect(backend).toMatch(
      /chatAssistantLambda\.addToRolePolicy\(\s*new iam\.PolicyStatement\(\{\s*actions: \['bedrock:InvokeModel'\],\s*resources: \[\s*`[^`]*inference-profile\/\$\{CHAT_INFERENCE_PROFILE_ID\}`,\s*`[^`]*foundation-model\/\$\{CHAT_BASE_MODEL_ID\}`/,
    );
  });

  it('wearable e extracao usam o modelo padrao, o Claude Sonnet 5.5', () => {
    expect(backend).toMatch(/const BEDROCK_BASE_MODEL_ID = 'anthropic\.claude-sonnet-5-5';/);
    expect(backend).toMatch(/analyzeHealthImport\.addEnvironment\('BEDROCK_MODEL_ID', BEDROCK_INFERENCE_PROFILE_ID\)/);
    expect(backend).toMatch(/extractDocumentData\.addEnvironment\('BEDROCK_MODEL_ID', BEDROCK_INFERENCE_PROFILE_ID\)/);
  });

  it('o guardrail do wearable nao muda', () => {
    expect(guardrailDoWearable).toMatch(/type: 'NAME', action: 'ANONYMIZE'/);
    expect(guardrailDoWearable.match(/inputEnabled: true/g)).toHaveLength(2);
  });
});
