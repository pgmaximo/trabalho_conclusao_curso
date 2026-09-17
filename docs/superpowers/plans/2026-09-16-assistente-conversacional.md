# Assistente conversacional — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar as respostas mockadas da tela de chat por uma IA que lê os dados reais do usuário por tools, cita a origem de cada número, e passa pelas cinco camadas de regra de linguagem antes de chegar à tela.

**Architecture:** função com endereço direto, fora do AppSync (D12), que verifica o token do Cognito ela mesma, roda um laço de tools somente-leitura contra o Bedrock, e submete a resposta gerada à verificação determinística de linguagem antes de devolvê-la. A persistência da conversa é um bloco separável, bloqueado pela tarefa 0.5 do roadmap.

**Tech Stack:** AWS Lambda (Function URL), Amazon Bedrock `ConverseCommand`, `aws-jwt-verify`, DynamoDB via Amplify Data, zod, React Native + Expo Router, Jest.

**Spec:** `specs/07-ia-conversa/assistente-conversacional/spec.md`

## Restrições globais

- **O dono vem do token, nunca do corpo da requisição.** É a regra de segurança mais importante deste plano: um identificador aceito do corpo transformaria o endereço direto numa porta para ler dado de saúde de outra pessoa.
- **Nenhuma tool escreve.** O único efeito da conversa sobre o banco é a própria conversa (D9).
- **`maxTokens` sempre explícito.** Em branco reserva a cota máxima do modelo.
- **Teto de iterações no laço de tools**, e atingi-lo é indisponibilidade honesta, nunca resposta parcial apresentada como completa.
- **A verificação de linguagem reprova, e o caminho é a D31: gerar de novo uma vez, depois mostrar o dado sem prosa, depois o silêncio honesto.** Nunca remendar, nunca exibir com aviso.
- **A segunda geração não refaz o laço de ferramentas.** Ela reaproveita as mensagens acumuladas, inclusive os resultados das ferramentas.
- **O termo vetado não aparece em copy nenhuma nem em resposta aceita.**
- **As regras do prompt vêm de `LANGUAGE_RULES_PROMPT`**, nunca copiadas à mão.
- **Nenhuma dependência nova no aplicativo.** No backend, apenas `aws-jwt-verify`, justificada no `plan.md`.
- **Node 20** (`nvm use 20.20.1`). `npm run validate` antes de considerar concluído.

**Pré-requisito duro:** a EPIC `specs/07-ia-conversa/regras-de-linguagem/` precisa estar concluída. C5 consome `checkLanguageRules` e `LANGUAGE_RULES_PROMPT`.

**Bloqueio parcial:** a tarefa 0.5 do roadmap (retenção e exclusão de conversa) bloqueia **apenas** C8 e C9. C1 a C7 e C10 rodam com a conversa em memória, como hoje.

---

## Estrutura de arquivos

### Backend novo — `amplify/functions/chat-assistant/`

| Arquivo | Responsabilidade |
|---|---|
| `resource.ts` | definição da função (teto de tempo, memória, grupo de recursos) |
| `handler.ts` | verifica o token, monta o contexto, roda o laço, verifica a linguagem |
| `auth.ts` | verificação do token do Cognito e extração do dono |
| `tools/index.ts` | o registro das tools e o despachante |
| `tools/*.ts` | uma tool por fonte de dado, todas somente-leitura |
| `chatPrompt.ts` | prompt de sistema, montado sobre `LANGUAGE_RULES_PROMPT` |
| `chatSchema.ts` | zod: schema da resposta, com citação obrigatória |
| `conversationLoop.ts` | o laço de tools, com teto, e a segunda geração que não o refaz |
| `degradedAnswer.ts` | o dado sem prosa, quando a resposta não pode ser exibida (D31) |
| `rateLimit.ts` | limite de chamadas por dono |

### Backend modificado

| Arquivo | Mudança |
|---|---|
| `amplify/data/schemas/chat.ts` | novo: `ChatConversation`, `ChatMessage` (C8) |
| `amplify/data/resource.ts` | registrar o schema |
| `amplify/backend.ts` | registrar a função, endereço direto, permissões, política do Bedrock |

### Frontend

| Arquivo | Mudança |
|---|---|
| `src/services/aiAssistantService.ts` | substituir o mock, **sem mudar a forma do contrato** |
| `src/hooks/useChatBot.ts` | citações, anexo pontual, histórico real |
| `src/screens/ChatBotScreen.tsx` | bolha com origem, linha do anexo pontual |

---

## Tarefa C1: A função, o endereço direto, e quem é o dono

A tarefa mais sensível do plano. Tudo que vem depois assume que esta está certa.

**Arquivos:**
- Criar: `amplify/functions/chat-assistant/resource.ts`, `auth.ts`
- Modificar: `amplify/backend.ts`
- Teste: `amplify/functions/chat-assistant/__tests__/auth.test.ts`

**Interfaces:**
- Produz:
  - `type ChatIdentity = { sub: string; username: string; owner: string }`
  - `resolveIdentity(authorizationHeader: string | undefined): Promise<ChatIdentity>`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { resolveIdentity } from '../auth';

const verify = jest.fn();
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: { create: () => ({ verify: (...a: unknown[]) => verify(...a) }) },
}));

describe('resolveIdentity', () => {
  beforeEach(() => verify.mockReset());

  it('recusa requisicao sem cabecalho de autorizacao', async () => {
    await expect(resolveIdentity(undefined)).rejects.toThrow(/autenticad/i);
  });

  it('recusa cabecalho malformado', async () => {
    await expect(resolveIdentity('token-solto')).rejects.toThrow(/autenticad/i);
  });

  it('recusa token que o verificador rejeita', async () => {
    verify.mockRejectedValue(new Error('assinatura invalida'));
    await expect(resolveIdentity('Bearer abc')).rejects.toThrow(/autenticad/i);
  });

  it('nao vaza o motivo tecnico da recusa para o chamador', () => {
    // "assinatura invalida" e "token expirado" contam ao chamador o que
    // ajustar para tentar de novo. A mensagem e sempre a mesma.
    verify.mockRejectedValue(new Error('Token expired at 2026-01-01'));
    return expect(resolveIdentity('Bearer abc')).rejects.not.toThrow(/expired/i);
  });

  it('monta o owner no formato sub::username, que e o gravado na tabela', async () => {
    // Mesmo formato usado por start-health-analysis e
    // get-prevention-recommendations. A resposta do GraphQL so ecoa a metade
    // "sub"; o valor GRAVADO e sempre o composto.
    verify.mockResolvedValue({ sub: 's-1', 'cognito:username': 'u-1' });
    await expect(resolveIdentity('Bearer abc')).resolves.toEqual({
      sub: 's-1', username: 'u-1', owner: 's-1::u-1',
    });
  });

  it('recusa token valido sem username -- sem username nao ha owner', async () => {
    verify.mockResolvedValue({ sub: 's-1' });
    await expect(resolveIdentity('Bearer abc')).rejects.toThrow(/autenticad/i);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest chat-assistant/__tests__/auth`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar a identidade**

```typescript
// amplify/functions/chat-assistant/auth.ts

/**
 * Resumo do arquivo:
 * Quem e o dono da requisicao. Este arquivo existe porque a D12 tirou o chat
 * de dentro do AppSync, e com isso a verificacao de identidade -- que o
 * AppSync fazia sozinho -- passou a ser nossa.
 *
 * REGRA QUE NAO TEM EXCECAO: o dono sai do TOKEN. Nenhum identificador vindo
 * do corpo da requisicao e aceito, nunca. Um endereco direto que confia num
 * identificador do corpo e uma porta aberta para ler dado de saude de outra
 * pessoa, e nenhuma camada posterior recupera isso.
 */
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export type ChatIdentity = { sub: string; username: string; owner: string };

// Uma mensagem so para toda recusa. "Token expirado" e "assinatura invalida"
// contariam ao chamador o que ajustar para a proxima tentativa.
const RECUSA = 'Usuario nao autenticado.';

// O verificador cacheia as chaves publicas do pool -- criado UMA vez, fora do
// handler, para o cache sobreviver entre invocacoes na mesma instancia.
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.USER_POOL_ID ?? '',
  tokenUse: 'id',
  clientId: process.env.USER_POOL_CLIENT_ID ?? '',
});

export async function resolveIdentity(authorizationHeader: string | undefined): Promise<ChatIdentity> {
  const token = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7).trim() : null;
  if (!token) throw new Error(RECUSA);

  let claims: Record<string, unknown>;
  try {
    claims = (await verifier.verify(token)) as unknown as Record<string, unknown>;
  } catch {
    throw new Error(RECUSA);
  }

  const sub = typeof claims.sub === 'string' ? claims.sub : null;
  const username = typeof claims['cognito:username'] === 'string' ? claims['cognito:username'] : null;
  // Sem username nao ha owner, e sem owner nenhuma tool pode filtrar. Recusar
  // e a unica saida segura -- montar um owner parcial faria as tools filtrarem
  // por um valor que nao existe na tabela, devolvendo lista vazia em vez de
  // erro, que e a pior forma de falhar.
  if (!sub || !username) throw new Error(RECUSA);

  return { sub, username, owner: `${sub}::${username}` };
}
```

- [ ] **Passo 4: Definir a função e o endereço direto**

```typescript
// amplify/functions/chat-assistant/resource.ts
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
```

```typescript
// amplify/backend.ts -- acrescentar

import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';

const chatAssistantLambda = backend.chatAssistant.resources.lambda;

// PRIMEIRO endereco direto de funcao deste repositorio. Sai do padrao do resto
// do aplicativo, e a justificativa e a D12: o resolver do AppSync corta em 30s
// e um laco de tools passa disso. A regra 3 da constituicao exige a
// justificativa escrita, e ela esta na spec e no plan.md desta EPIC.
//
// authType NONE nao significa aberto: significa que a AWS nao verifica a
// identidade por nos, e que a funcao o faz -- ver auth.ts, que recusa qualquer
// requisicao sem token valido do Cognito. Usar AWS_IAM aqui obrigaria o
// aplicativo a montar assinatura SigV4 a mao para um endereco que nao e do
// AppSync, que foi a alternativa considerada e recusada no plan.md.
const chatUrl = chatAssistantLambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    // Origem cruzada passou a ser nossa responsabilidade quando o chat saiu do
    // AppSync. Restrita ao que o aplicativo usa, nunca "*".
    allowedOrigins: ['https://localhost', 'suasaude://'],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ['content-type', 'authorization'],
    maxAge: Duration.hours(1),
  },
});

backend.chatAssistant.addEnvironment('USER_POOL_ID', backend.auth.resources.userPool.userPoolId);
backend.chatAssistant.addEnvironment('USER_POOL_CLIENT_ID', backend.auth.resources.userPoolClient.userPoolClientId);

// O endereco vai para o aplicativo pelo mesmo caminho que os demais valores de
// configuracao, para nao virar constante digitada em duas casas.
backend.addOutput({ custom: { chatAssistantUrl: chatUrl.url } });
```

- [ ] **Passo 5: Rodar e publicar**

Executar: `npx jest chat-assistant/__tests__/auth && nvm use 20.20.1 && npm run amplify:sandbox`
Esperado: testes passam; publica sem dependência cíclica; o endereço aparece em `amplify_outputs.json`.

- [ ] **Passo 6: Commitar**

```bash
git add amplify/functions/chat-assistant/ amplify/backend.ts
git commit -m "feat(chat): endereco direto da funcao com verificacao do token do Cognito"
```

---

## Tarefa C2: As tools, e a garantia de que nenhuma escreve

**Arquivos:**
- Criar: `amplify/functions/chat-assistant/tools/index.ts` e uma por fonte
- Teste: `amplify/functions/chat-assistant/__tests__/tools.test.ts`

**Interfaces:**
- Produz:
  - `type ChatTool = { name: string; description: string; inputSchema: z.ZodType; readOnly: true; run: (input, identity: ChatIdentity) => Promise<unknown>; renderDegraded?: (output: unknown) => DegradedBlock | null }`
  - `CHAT_TOOLS: ChatTool[]`
  - `runTool(name: string, input: unknown, identity: ChatIdentity): Promise<unknown>`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { CHAT_TOOLS, runTool } from '../tools';

describe('tools do chat', () => {
  it('NENHUMA tool escreve -- e isso e teste, nao revisao de codigo', () => {
    // O laco so e auditavel porque o unico efeito da conversa sobre o banco e
    // a propria conversa (D9). Uma tool de escrita acrescentada por descuido
    // passaria despercebida numa revisao; aqui, nao.
    for (const tool of CHAT_TOOLS) expect(tool.readOnly).toBe(true);
  });

  it('nenhum nome de tool sugere escrita', () => {
    for (const tool of CHAT_TOOLS) {
      expect(tool.name).not.toMatch(/crear|criar|create|update|delete|salvar|save|gravar|registrar/i);
    }
  });

  it('toda tool filtra pelo dono recebido, nunca por um vindo da entrada', async () => {
    const espiao = jest.fn().mockResolvedValue([]);
    for (const tool of CHAT_TOOLS) {
      espiao.mockClear();
      // Entrada hostil: um owner plantado no proprio argumento da tool.
      await runTool(tool.name, { owner: 'vitima::vitima' }, { sub: 's', username: 'u', owner: 's::u' });
      // Nenhuma consulta pode ter sido montada com o owner da entrada.
      expect(JSON.stringify(espiao.mock.calls)).not.toContain('vitima');
    }
  });

  it('tool desconhecida devolve erro tratado, nunca lanca', async () => {
    const saida = await runTool('tool_que_nao_existe', {}, identidade);
    expect(saida).toMatchObject({ erro: expect.any(String) });
  });

  it('ausencia de dado e RESPOSTA, nao erro', async () => {
    // "Nenhuma importacao de wearable" significa que nao ha dado de wearable.
    // Devolver erro faria o modelo dizer que algo falhou, quando nada falhou.
    const saida = await runTool('consultar_wearable', {}, identidade) as { disponivel: boolean };
    expect(saida.disponivel).toBe(false);
    expect(saida).not.toHaveProperty('erro');
  });

  it('toda tool tem descricao que diz o que ela NAO faz', () => {
    for (const tool of CHAT_TOOLS) expect(tool.description.length).toBeGreaterThan(40);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest chat-assistant/__tests__/tools`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar o registro**

```typescript
// amplify/functions/chat-assistant/tools/index.ts

/**
 * Resumo do arquivo:
 * O registro das tools do chat. TODAS SAO SOMENTE LEITURA, e `readOnly: true`
 * e campo obrigatorio do tipo justamente para que um teste possa afirmar isso
 * sobre a lista inteira -- uma tool de escrita acrescentada por descuido nao
 * compila sem declarar o contrario, e o teste a pega.
 *
 * Por que isso importa mais do que parece: a D9 diz que a IA de comunicacao
 * nao grava dado clinico. Uma IA que conversa e ao mesmo tempo escreve dado
 * clinico e uma superficie de erro dificil de auditar -- o modelo decide
 * escrever, e ninguem revisa.
 */
import { z } from 'zod';
import type { ChatIdentity } from '../auth';
import { perfilTool } from './perfil';
import { examesTool } from './exames';
import { analitosTool } from './analitos';
import { consultasTool } from './consultas';
import { medicamentosTool } from './medicamentos';
import { vacinasTool } from './vacinas';
import { wearableTool } from './wearable';

export type ChatTool<TInput = unknown> = {
  name: string;
  /** Vai no prompt. Diz o que a tool faz E o que ela nao faz -- o modelo usa a
   *  descricao para decidir, e uma descricao vaga produz chamada errada. */
  description: string;
  inputSchema: z.ZodType<TInput>;
  /** Literal `true`, sempre. Existe para ser afirmado por teste sobre a lista. */
  readOnly: true;
  /** A identidade vem do TOKEN e e passada aqui. A tool NUNCA le dono de
   *  `input` -- e por isso que a identidade e o segundo parametro, separado,
   *  em vez de um campo dentro da entrada. */
  run: (input: TInput, identity: ChatIdentity) => Promise<unknown>;
  /**
   * Renderiza a propria saida em texto de modelo fixo, para o MODO DEGRADADO
   * (D31, tarefa C5b). Devolve null quando nao ha o que mostrar.
   *
   * Mora AQUI, e nao num despachante central com um `switch` por formato,
   * porque quem conhece a forma da saida e quem a produz -- um `switch`
   * distante divergiria do formato real assim que esta tool mudasse, e
   * divergiria em silencio.
   *
   * Opcional: tool cuja saida nao rende texto util simplesmente nao a
   * implementa, e o modo degradado a ignora.
   */
  renderDegraded?: (output: unknown) => DegradedBlock | null;
};

export const CHAT_TOOLS: ChatTool<never>[] = [
  perfilTool, examesTool, analitosTool, consultasTool, medicamentosTool, vacinasTool, wearableTool,
] as ChatTool<never>[];

const POR_NOME = new Map(CHAT_TOOLS.map((t) => [t.name, t]));

/**
 * Despacha uma chamada de tool. NUNCA lanca: uma excecao aqui derrubaria o
 * turno inteiro, e o modelo perderia a chance de responder com o que ja tem.
 * Erro vira `{ erro }`, que o modelo le e sobre o qual a R5 manda ele ser
 * honesto.
 */
export async function runTool(
  name: string,
  input: unknown,
  identity: ChatIdentity,
): Promise<unknown> {
  const tool = POR_NOME.get(name);
  if (!tool) return { erro: `Ferramenta desconhecida: ${name}.` };

  const validado = tool.inputSchema.safeParse(input ?? {});
  if (!validado.success) return { erro: 'Os argumentos da consulta não são válidos.' };

  try {
    return await tool.run(validado.data as never, identity);
  } catch (erro) {
    console.error(`Falha na tool ${name}:`, erro);
    return { erro: 'Não foi possível consultar esse dado agora.' };
  }
}
```

E uma tool, como molde para as outras seis:

```typescript
// amplify/functions/chat-assistant/tools/wearable.ts

/**
 * A tool de wearable. Ela e o molde de uma coisa que as outras seis repetem:
 * AUSENCIA DE DADO E RESPOSTA, NAO ERRO.
 *
 * "Nenhuma importacao de wearable" significa que a pessoa nao importou nada --
 * nada falhou. Devolver erro faria o modelo dizer que algo deu errado, e a R5
 * manda ele dizer o que nao sabe, nao inventar uma falha.
 */
import { z } from 'zod';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { ChatTool } from './index';
import type { ChatIdentity } from '../auth';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());

export const wearableTool: ChatTool<{ }> = {
  name: 'consultar_wearable',
  description:
    'Consulta os dados de wearable (passos, sono, batimento, estresse) que o usuário importou. Devolve o resumo do período e a cobertura de cada métrica. NÃO grava nada, NÃO importa dados novos e NÃO interpreta os números.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input, identity: ChatIdentity) {
    const saida = await ddb.send(new QueryCommand({
      TableName: process.env.HEALTH_IMPORT_TABLE_NAME,
      IndexName: 'byOwner',
      // O owner vem da IDENTIDADE, que veio do token. Nunca da entrada.
      KeyConditionExpression: '#owner = :owner',
      ExpressionAttributeNames: { '#owner': 'owner' },
      ExpressionAttributeValues: { ':owner': identity.owner },
      ScanIndexForward: false,
      Limit: 1,
    }));

    const linha = saida.Items?.[0];
    if (!linha || linha.status !== 'READY') {
      return {
        disponivel: false,
        explicacao: 'O usuário ainda não importou dados de wearable, ou a última importação não concluiu.',
      };
    }

    return {
      disponivel: true,
      periodo: { inicio: linha.periodStart, fim: linha.periodEnd, dias: linha.dayCount },
      // metricsJson e string por decisao registrada em health-import.ts.
      metricas: JSON.parse(String(linha.metricsJson ?? '{}')),
    };
  },
};
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npx jest chat-assistant/__tests__/tools`
Esperado: PASSA.

- [ ] **Passo 5: Commitar**

```bash
git add amplify/functions/chat-assistant/tools/ amplify/functions/chat-assistant/__tests__/tools.test.ts
git commit -m "feat(chat): tools somente-leitura, com o dono sempre vindo do token"
```

---

## Tarefa C3: A tool de analitos

Separada das outras seis porque ela é a razão de a Fase 1 ter vindo antes, e porque ela tem regras que as outras não têm.

**Arquivos:**
- Criar: `amplify/functions/chat-assistant/tools/analitos.ts`
- Teste: `amplify/functions/chat-assistant/__tests__/analitosTool.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { analitosTool } from '../tools/analitos';

describe('tool de analitos', () => {
  it('devolve valor, unidade, data E documento de origem de cada coleta', async () => {
    const saida = await analitosTool.run({ analyteCode: '62292-8' }, identidade) as { coletas: unknown[] };
    expect(saida.coletas[0]).toMatchObject({
      valor: expect.any(Number), unidade: expect.any(String),
      dataDaColeta: expect.any(String), documentoId: expect.any(String),
    });
  });

  it('aplica as MESMAS exclusoes da EPIC de serie', async () => {
    // Uma linha pendente que entrasse aqui viraria um numero citado numa
    // conversa -- pior que aparecer num grafico, porque texto soa definitivo.
    const saida = await comLinhas([
      linha({ id: 'ok' }),
      linha({ id: 'pendente', reviewStatus: 'PENDENTE_DE_REVISAO', value: null }),
      linha({ id: 'censurado', valueQualifier: '<' }),
    ]);
    expect(saida.coletas.map((c) => c.id)).toEqual(['ok']);
    expect(saida.naoComparaveis).toHaveLength(2);
  });

  it('analito sem nenhuma coleta devolve ausencia explicita, nao erro', async () => {
    const saida = await analitosTool.run({ analyteCode: '2345-7' }, identidadeSemDados) as { disponivel: boolean };
    expect(saida.disponivel).toBe(false);
    expect(saida).not.toHaveProperty('erro');
  });

  it('busca por nome em portugues resolve para o codigo, sem o modelo digitar codigo', async () => {
    // Pedir ao modelo que produza um codigo LOINC de cabeca e exatamente o que
    // a D27 proibe -- inclusive para ele.
    const saida = await analitosTool.run({ termo: 'vitamina D' }, identidade) as { analyteCode: string };
    expect(saida.analyteCode).toBe('62292-8');
  });

  it('nao devolve nenhum campo de interpretacao clinica', async () => {
    const saida = await analitosTool.run({ analyteCode: '62292-8' }, identidade);
    expect(JSON.stringify(saida)).not.toMatch(/alterado|normal|situacao|gravidade|risco/i);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest analitosTool`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar**

```typescript
// amplify/functions/chat-assistant/tools/analitos.ts

/**
 * Resumo do arquivo:
 * A tool que faz a Fase 1 valer a pena. Ela devolve a serie de um analito com
 * data, unidade e DOCUMENTO DE ORIGEM de cada valor -- e o documento de origem
 * nao e enfeite: e o que torna a R4 ("nenhum numero sem origem") possivel de
 * cumprir. Sem ele, o modelo teria numeros soltos e nenhum jeito de dizer de
 * onde vieram.
 *
 * Ela aplica as MESMAS exclusoes da EPIC de serie por analito, e por uma razao
 * mais forte: um numero duvidoso citado numa conversa soa mais definitivo do
 * que o mesmo numero num grafico. Texto carrega autoridade que ponto nao
 * carrega.
 */
import { z } from 'zod';
import { ANALYTE_CATALOG, findAnalyteByCode } from '../../extract-document-data/analyteCatalog';
import type { ChatTool } from './index';
import type { ChatIdentity } from '../auth';

/**
 * O modelo NAO digita codigo LOINC. Ele manda `termo` em portugues -- que e
 * como o usuario fala e como o laudo escreve -- e esta funcao resolve para o
 * codigo usando o catalogo gerado, que traz os sinonimos em pt-BR do proprio
 * LOINC (D26). Pedir codigo ao modelo seria pedir exatamente o que a D27
 * proibe de uma pessoa.
 */
function resolverCodigo(entrada: { analyteCode?: string; termo?: string }): string | null {
  if (entrada.analyteCode) return findAnalyteByCode(entrada.analyteCode)?.code ?? null;
  if (!entrada.termo) return null;

  const alvo = entrada.termo.toLowerCase().trim();
  const achado = ANALYTE_CATALOG.find(
    (a) =>
      a.projectLabel.toLowerCase().includes(alvo) ||
      a.synonyms.some((s) => s.toLowerCase().includes(alvo)),
  );
  return achado?.code ?? null;
}

export const analitosTool: ChatTool<{ analyteCode?: string; termo?: string }> = {
  name: 'consultar_analito',
  description:
    'Consulta o histórico de um resultado de exame do usuário (ex.: vitamina D, glicose, hemoglobina). Aceita o nome em português. Devolve cada coleta com valor, unidade, data e o documento de origem. NÃO grava nada, NÃO interpreta o resultado e NÃO diz se o valor está alto ou baixo.',
  inputSchema: z.object({ analyteCode: z.string().optional(), termo: z.string().optional() }).strict(),
  readOnly: true,

  async run(input, identity: ChatIdentity) {
    const codigo = resolverCodigo(input);
    if (!codigo) {
      return { disponivel: false, explicacao: 'Não encontrei esse exame na lista de resultados acompanhados.' };
    }

    const analito = findAnalyteByCode(codigo);
    const linhas = await lerLabResults(identity.owner, codigo);

    if (linhas.length === 0) {
      return {
        disponivel: false,
        analyteCode: codigo,
        nome: analito?.projectLabel,
        explicacao: 'O usuário não tem nenhum resultado registrado deste exame.',
      };
    }

    // As MESMAS exclusoes da EPIC de serie. Duplicar a regra aqui seria
    // convidar as duas a divergirem; o que se repete e a chamada, nao a logica.
    const comparaveis = linhas.filter(
      (l) => l.reviewStatus !== 'PENDENTE_DE_REVISAO' && l.value !== null && !l.valueQualifier,
    );
    const naoComparaveis = linhas.filter((l) => !comparaveis.includes(l));

    return {
      disponivel: true,
      analyteCode: codigo,
      nome: analito?.projectLabel,
      unidade: analito?.canonicalUnit,
      coletas: comparaveis
        .sort((a, b) => (a.collectedAt ?? '').localeCompare(b.collectedAt ?? ''))
        .map((l) => ({
          id: l.id,
          valor: l.value,
          unidade: l.unit,
          dataDaColeta: l.collectedAt,
          momento: l.collectionMoment,
          faixaDoLaboratorio: { minimo: l.referenceLow, maximo: l.referenceHigh },
          documentoId: l.documentId,
        })),
      // Contadas e explicadas, nunca omitidas -- o modelo precisa saber que
      // existem para poder mencionar, e a R5 manda ele dizer o que nao sabe.
      naoComparaveis: naoComparaveis.map((l) => ({
        id: l.id,
        dataDaColeta: l.collectedAt,
        documentoId: l.documentId,
        motivo:
          l.reviewStatus === 'PENDENTE_DE_REVISAO'
            ? 'aguarda conferência do usuário'
            : l.valueQualifier
              ? 'o laboratório informou um limite, não uma medida'
              : 'não pôde ser lido',
      })),
    };
  },
};
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npx jest analitosTool`
Esperado: PASSA.

- [ ] **Passo 5: Commitar**

```bash
git add amplify/functions/chat-assistant/tools/analitos.ts amplify/functions/chat-assistant/__tests__/analitosTool.test.ts
git commit -m "feat(chat): tool de analitos com origem de cada numero e as exclusoes da serie"
```

---

## Tarefa C4: O laço, o prompt e o schema de saída

**Arquivos:**
- Criar: `amplify/functions/chat-assistant/chatPrompt.ts`, `chatSchema.ts`, `conversationLoop.ts`
- Teste: `amplify/functions/chat-assistant/__tests__/conversationLoop.test.ts`

**Interfaces:**
- Consome: `CHAT_TOOLS`, `runTool` (C2), `LANGUAGE_RULES_PROMPT` (EPIC de regras).
- Produz:
  - `type ChatAnswer = { texto: string; citacoes: Citation[]; toolsUsadas: string[] }`
  - `type TurnTranscript = { messages: unknown[]; toolOutputs: Array<{ name: string; output: unknown }> }`
  - `runConversationTurn(input: TurnInput): Promise<TurnOutcome>` — devolve também o `transcript`, que é o que permite à segunda geração não refazer as consultas
  - `regenerateAnswer(input: TurnInput, transcript: TurnTranscript, motivo: string): Promise<TurnOutcome>`
  - `MAX_TOOL_ITERATIONS`, `HISTORY_WINDOW`, `MAX_OUTPUT_TOKENS`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { runConversationTurn, MAX_TOOL_ITERATIONS, HISTORY_WINDOW, MAX_OUTPUT_TOKENS } from '../conversationLoop';

describe('conversationLoop', () => {
  it('os tres limites sao numeros no codigo, nao nocoes', () => {
    expect(MAX_TOOL_ITERATIONS).toBeGreaterThan(0);
    expect(MAX_TOOL_ITERATIONS).toBeLessThanOrEqual(8);
    expect(HISTORY_WINDOW).toBeGreaterThan(0);
    expect(MAX_OUTPUT_TOKENS).toBeGreaterThan(0);
  });

  it('atingir o teto de iteracoes e indisponibilidade honesta, NUNCA resposta parcial', async () => {
    // Uma resposta parcial apresentada como completa e o pior resultado
    // possivel: ela parece uma resposta.
    converseFalso.sempreChamaTool();
    const r = await runConversationTurn(entrada);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/não consegui|tente/i);
  });

  it('manda maxTokens explicito', async () => {
    await runConversationTurn(entrada);
    expect(converseFalso.ultimaChamada.inferenceConfig.maxTokens).toBe(MAX_OUTPUT_TOKENS);
  });

  it('manda so a janela de historico, nao a conversa inteira', async () => {
    await runConversationTurn({ ...entrada, history: Array.from({ length: 200 }, msgFalsa) });
    expect(converseFalso.ultimaChamada.messages.length).toBeLessThanOrEqual(HISTORY_WINDOW + 1);
  });

  it('o prompt de sistema vem de LANGUAGE_RULES_PROMPT, nao copiado a mao', async () => {
    const { LANGUAGE_RULES_PROMPT } = require('../../ai-language-rules/rulesPrompt');
    await runConversationTurn(entrada);
    expect(converseFalso.ultimaChamada.system[0].text).toContain(LANGUAGE_RULES_PROMPT);
  });

  it('a mensagem do usuario entra no bloco protegido contra instrucao plantada', async () => {
    await runConversationTurn(entrada);
    const conteudo = converseFalso.ultimaChamada.messages.at(-1).content[0];
    expect(conteudo).toHaveProperty('guardContent');
  });

  it('guardrail intervindo NAO e tratado como falha tecnica', async () => {
    converseFalso.responde({ stopReason: 'guardrail_intervened' });
    const r = await runConversationTurn(entrada);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).not.toMatch(/erro|falha|exce/i);
  });

  it('registra quais tools foram usadas -- e o que classifica a pergunta depois', async () => {
    converseFalso.chamaTool('consultar_analito').depoisResponde('texto');
    const r = await runConversationTurn(entrada);
    if (r.ok) expect(r.answer.toolsUsadas).toContain('consultar_analito');
  });

  it('devolve o transcript mesmo quando falha -- o modo degradado precisa dele', async () => {
    converseFalso.chamaTool('consultar_analito').depoisEstoura();
    const r = await runConversationTurn(entrada);
    expect(r.transcript.toolOutputs.map((t) => t.name)).toContain('consultar_analito');
  });

  it('regenerateAnswer NAO chama ferramenta nenhuma de novo (D31)', async () => {
    const primeira = await runConversationTurn(entrada);
    runTool.mockClear();
    await regenerateAnswer(entrada, primeira.transcript, 'Não indique quantidade de medicamento.');
    expect(runTool).not.toHaveBeenCalled();
  });

  it('regenerateAnswer faz UMA ida ao modelo, nao duas', async () => {
    const primeira = await runConversationTurn(entrada);
    converseFalso.limparContagem();
    await regenerateAnswer(entrada, primeira.transcript, 'motivo');
    expect(converseFalso.chamadas).toBe(1);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest conversationLoop`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar o prompt e o schema**

```typescript
// amplify/functions/chat-assistant/chatPrompt.ts

/**
 * Resumo do arquivo:
 * O prompt de sistema do chat. Ele e MONTADO sobre LANGUAGE_RULES_PROMPT, e
 * nunca traz as regras copiadas a mao -- copiar a mao e como duas copias
 * divergem, e quando divergem o modelo obedece a errada.
 */
import { LANGUAGE_RULES_PROMPT } from '../ai-language-rules/rulesPrompt';

export const SYSTEM_PROMPT = `Você é o assistente de saúde do aplicativo SuaSaúde. Você conversa com o próprio usuário sobre os dados de saúde dele que estão registrados no aplicativo.

Como você trabalha:
- Use as ferramentas para buscar os dados. Você NÃO tem nenhum dado do usuário até chamar uma ferramenta.
- Responda sempre em português do Brasil, de forma direta e curta.
- Quando citar qualquer valor de exame, cite junto a data da coleta e o documento de origem que a ferramenta devolveu.
- Quando a ferramenta disser que um resultado não é comparável (aguarda conferência, ou é um limite e não uma medida), você pode mencioná-lo, mas deixe claro que ele não entra na comparação.
- Quando a ferramenta disser que não há dado, diga que não há. Não estime e não complete.

${LANGUAGE_RULES_PROMPT}`;

/**
 * A mensagem do usuario entra dentro de guardContent, e nao no prompt de
 * sistema, para que o filtro de ataque de prompt do Guardrail avalie
 * exatamente o texto que veio de fora. Mesmo desenho de bedrockClient.ts na
 * feature de wearable.
 */
export function buildUserMessage(texto: string) {
  return { role: 'user' as const, content: [{ guardContent: { text: { text: texto } } }] };
}
```

```typescript
// amplify/functions/chat-assistant/chatSchema.ts

/**
 * Resumo do arquivo:
 * O schema da resposta. A regra estrutural da D11 aplicada ao chat: CITACAO E
 * CAMPO, nao promessa.
 *
 * A R4 diz "nenhum numero sem origem". Deixar isso so no prompt seria confiar
 * que o modelo lembra. Aqui, a resposta que cita valores e obrigada a trazer
 * de qual linha eles sairam -- e uma citacao que aponta para uma linha que
 * nenhuma tool devolveu e detectavel, porque quem chamou sabe o que as tools
 * devolveram.
 */
import { z } from 'zod';

export const citationSchema = z
  .object({
    /** Id da linha de LabResult de onde o numero saiu. */
    resultId: z.string().min(1),
    documentId: z.string().min(1),
    collectedAt: z.string().min(1),
  })
  .strict();

export const chatAnswerSchema = z
  .object({
    texto: z.string().min(1).max(4000),
    /** Vazio quando a resposta nao cita nenhum valor de exame. */
    citacoes: z.array(citationSchema).max(20),
  })
  .strict();

export type Citation = z.infer<typeof citationSchema>;
export type ChatAnswer = z.infer<typeof chatAnswerSchema> & { toolsUsadas: string[] };
```

- [ ] **Passo 4: Implementar o laço**

```typescript
// amplify/functions/chat-assistant/conversationLoop.ts

/**
 * Resumo do arquivo:
 * O laco de tools. Tres limites, todos NUMEROS e nao nocoes, porque cada um
 * deles sem numero e uma forma de gastar sem teto.
 */
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { CHAT_TOOLS, runTool } from './tools';
import { SYSTEM_PROMPT, buildUserMessage } from './chatPrompt';
import { chatAnswerSchema, type ChatAnswer } from './chatSchema';
import type { ChatIdentity } from './auth';

const client = new BedrockRuntimeClient({ maxAttempts: 3, retryMode: 'adaptive' });

/**
 * Um laco sem teto paga o modelo indefinidamente. Seis cobre a pergunta mais
 * composta prevista -- "minha vitamina D melhorou e meu sono piorou no mesmo
 * periodo" usa duas tools; uma pergunta que precise de seis ja e uma pergunta
 * que o chat nao deveria tentar responder de uma vez. Calibrado na C10.
 */
export const MAX_TOOL_ITERATIONS = 6;

/** Mandar a conversa inteira cresce sem limite e paga por isso a cada turno. */
export const HISTORY_WINDOW = 12;

/** SEMPRE explicito. Em branco reserva a cota maxima do modelo e e a causa
 *  principal de estrangulamento sem motivo aparente. */
export const MAX_OUTPUT_TOKENS = 2000;

const TEMPERATURE = 0.3;

export type TurnInput = {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  identity: ChatIdentity;
  modelId: string;
  guardrailId: string;
  guardrailVersion: string;
};

/**
 * O que a primeira geracao acumulou. Existe para a SEGUNDA nao refazer o laco
 * de ferramentas (D31): as mensagens ja contem os toolResult, entao regerar e
 * uma ida so ao modelo, com exatamente as mesmas evidencias na frente.
 *
 * `toolOutputs` sai separado das mensagens porque o modo degradado (C5b)
 * precisa da saida ESTRUTURADA de cada tool, nao do bloco serializado que foi
 * para o modelo.
 */
export type TurnTranscript = {
  messages: unknown[];
  toolOutputs: Array<{ name: string; output: unknown }>;
};

export type TurnOutcome =
  | { ok: true; answer: ChatAnswer; transcript: TurnTranscript; inputTokens: number; outputTokens: number; modelId: string }
  | { ok: false; message: string; transcript: TurnTranscript };

/** Menos variacao na segunda tentativa. E uma alavanca A MEDIR (tarefa C10),
 *  nao uma certeza -- o estudo da D31 a registra como tal. */
const TEMPERATURE_RETRY = 0.1;

export async function runConversationTurn(input: TurnInput): Promise<TurnOutcome> {
  const messages: unknown[] = [
    ...input.history.slice(-HISTORY_WINDOW).map((m) => ({ role: m.role, content: [{ text: m.content }] })),
    buildUserMessage(input.message),
  ];

  const toolsUsadas: string[] = [];
  const transcript: TurnTranscript = { messages, toolOutputs: [] };
  let inputTokens = 0;
  let outputTokens = 0;

  for (let iteracao = 0; iteracao < MAX_TOOL_ITERATIONS; iteracao++) {
    const resposta = await client.send(new ConverseCommand({
      modelId: input.modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: messages as never,
      inferenceConfig: { maxTokens: MAX_OUTPUT_TOKENS, temperature: TEMPERATURE },
      toolConfig: {
        tools: CHAT_TOOLS.map((t) => ({
          toolSpec: { name: t.name, description: t.description, inputSchema: { json: toJson(t.inputSchema) } },
        })) as never,
        // SEM toolChoice forcado: aqui o modelo PRECISA poder responder sem
        // chamar tool nenhuma ("bom dia"), diferente da extracao, em que a
        // saida estruturada e o produto.
      },
      guardrailConfig: {
        guardrailIdentifier: input.guardrailId,
        guardrailVersion: input.guardrailVersion,
        // trace desligado: ligado, exporia na resposta o texto que disparou um
        // filtro de PII. Nunca ligar em producao.
        trace: 'disabled',
      },
    }));

    inputTokens += resposta.usage?.inputTokens ?? 0;
    outputTokens += resposta.usage?.outputTokens ?? 0;

    // Guardrail nao e falha tecnica: e o sistema funcionando. A mensagem ao
    // usuario nao pode soar como erro.
    if (resposta.stopReason === 'guardrail_intervened') {
      return { ok: false, transcript, message: 'Não consigo responder a essa mensagem. Se for sobre um sintoma ou um resultado, vale levar a pergunta a um profissional de saúde.' };
    }

    const blocos = resposta.output?.message?.content ?? [];
    const chamadas = blocos.filter((b) => b.toolUse).map((b) => b.toolUse!);

    if (chamadas.length === 0) {
      const texto = blocos.map((b) => b.text ?? '').join('').trim();
      const validado = chatAnswerSchema.safeParse(extrairResposta(texto));
      if (!validado.success) {
        return { ok: false, transcript, message: 'Não consegui montar uma resposta agora.' };
      }
      return {
        ok: true,
        answer: { ...validado.data, toolsUsadas },
        transcript,
        inputTokens,
        outputTokens,
        modelId: input.modelId,
      };
    }

    messages.push(resposta.output!.message!);
    const resultados = [];
    for (const chamada of chamadas) {
      toolsUsadas.push(chamada.name!);
      const saida = await runTool(chamada.name!, chamada.input, input.identity);
      // Guardado ESTRUTURADO para o modo degradado (C5b), alem de serializado
      // para o modelo.
      transcript.toolOutputs.push({ name: chamada.name!, output: saida });
      resultados.push({ toolResult: { toolUseId: chamada.toolUseId!, content: [{ json: saida as never }] } });
    }
    messages.push({ role: 'user', content: resultados });
  }

  // Teto atingido. NUNCA devolver o que foi juntado ate aqui como se fosse a
  // resposta: uma resposta parcial apresentada como completa e o pior
  // resultado possivel, porque ela parece uma resposta.
  //
  // Devolve o transcript mesmo assim: as ferramentas que ja responderam tem
  // dado, e o modo degradado (C5b) consegue mostra-lo.
  return { ok: false, transcript, message: 'Não consegui reunir tudo o que essa pergunta pede.' };
}

/**
 * A SEGUNDA geracao (D31, etapa A). Ela NAO refaz o laco de ferramentas.
 *
 * Duas razoes, e a segunda vale mais que a primeira:
 * 1. Custo e espera: reaproveitando o transcript, sao ~55% da entrada de um
 *    turno e UMA ida ao modelo, em vez de duas.
 * 2. Ela ve EXATAMENTE as mesmas evidencias que a primeira. Refazer o laco
 *    poderia trazer dado diferente (uma consulta que agora falha, uma linha
 *    corrigida no meio), e a diferenca entre as duas respostas deixaria de ser
 *    so a redacao -- que e a unica coisa que se quer corrigir.
 *
 * O `toolConfig` continua presente porque a conversa contem blocos toolUse e
 * toolResult, e o Bedrock recusa esse historico sem a configuracao das tools.
 * Se o modelo insistir em chamar outra tool aqui, quem chamou trata como
 * falha e segue para o modo degradado -- nao ha terceira tentativa.
 */
export async function regenerateAnswer(
  input: TurnInput,
  transcript: TurnTranscript,
  motivo: string,
): Promise<TurnOutcome> {
  const messages = [
    ...transcript.messages,
    {
      role: 'user' as const,
      content: [{ text: `[A resposta anterior não pôde ser exibida. ${motivo} Escreva a resposta de novo respeitando isso, usando os mesmos dados que você já consultou.]` }],
    },
  ];

  const resposta = await client.send(new ConverseCommand({
    modelId: input.modelId,
    system: [{ text: SYSTEM_PROMPT }],
    messages: messages as never,
    inferenceConfig: { maxTokens: MAX_OUTPUT_TOKENS, temperature: TEMPERATURE_RETRY },
    toolConfig: {
      tools: CHAT_TOOLS.map((t) => ({
        toolSpec: { name: t.name, description: t.description, inputSchema: { json: toJson(t.inputSchema) } },
      })) as never,
    },
    guardrailConfig: {
      guardrailIdentifier: input.guardrailId,
      guardrailVersion: input.guardrailVersion,
      trace: 'disabled',
    },
  }));

  const blocos = resposta.output?.message?.content ?? [];
  // Chamou tool de novo em vez de responder: nao ha terceira tentativa.
  if (blocos.some((b) => b.toolUse)) {
    return { ok: false, transcript, message: 'Não consegui responder a isso.' };
  }

  const texto = blocos.map((b) => b.text ?? '').join('').trim();
  const validado = chatAnswerSchema.safeParse(extrairResposta(texto));
  if (!validado.success) return { ok: false, transcript, message: 'Não consegui responder a isso.' };

  return {
    ok: true,
    answer: { ...validado.data, toolsUsadas: transcript.toolOutputs.map((t) => t.name) },
    transcript,
    inputTokens: resposta.usage?.inputTokens ?? 0,
    outputTokens: resposta.usage?.outputTokens ?? 0,
    modelId: input.modelId,
  };
}
```

- [ ] **Passo 5: Rodar e confirmar que passa**

Executar: `npx jest conversationLoop`
Esperado: PASSA.

- [ ] **Passo 6: Commitar**

```bash
git add amplify/functions/chat-assistant/
git commit -m "feat(chat): laco de tools com teto, janela de historico e maxTokens explicitos"
```

---

## Tarefa C5: As cinco camadas, fechadas

**Arquivos:**
- Modificar: `amplify/functions/chat-assistant/handler.ts`
- Teste: `amplify/functions/chat-assistant/__tests__/handler.test.ts`

**Interfaces:**
- Consome: `runConversationTurn` (C4), `checkLanguageRules` (EPIC de regras).
- Produz:
  - `type RuleCheckStatus = 'APROVADA' | 'APROVADA_NA_SEGUNDA' | 'DEGRADADA' | 'INDISPONIVEL'`
  - `responderComVerificacao(entrada, idsDevolvidos): Promise<RespostaVerificada>`

**Esta tarefa implementa a D31**, decidida no estudo `estudos-ia/01-estudos/resposta-reprovada.md`: **A → E → C**. A etapa E — o modo degradado — é a tarefa C5b, e esta aqui só a chama.

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
describe('handler -- verificacao de linguagem', () => {
  it('resposta limpa passa na primeira e e marcada como tal', async () => {
    turno.responde('Seu registro de março mostra 32,5 ng/mL. Leve ao seu médico.');
    const r = await handler(requisicao);
    expect(corpo(r).ruleCheckStatus).toBe('APROVADA');
  });

  it('resposta reprovada gera DE NOVO, com o motivo como instrucao', async () => {
    turno.responde('Tome 2000 UI por dia.').depoisResponde('Não indico quantidade. Leve ao seu médico.');
    const r = await handler(requisicao);
    expect(corpo(r).ruleCheckStatus).toBe('APROVADA_NA_SEGUNDA');
    expect(turno.segundaChamada.message).toMatch(/posologia|medicamento/i);
  });

  it('o bilhete fala da REGRA, nunca do sintoma', async () => {
    // "Nao escreva 500 mg" ensina o modelo a escrever "meio grama". O bilhete
    // sai do campo `reason` da violacao, que a EPIC de regras escreve para ser
    // dito ao modelo.
    turno.responde('Tome 500 mg.').depoisResponde('Não indico quantidade. Leve ao seu médico.');
    await handler(requisicao);
    expect(turno.segundaChamada.message).not.toMatch(/500/);
  });

  it('a segunda geracao NAO refaz as consultas (D31)', async () => {
    turno.usouTools(['consultar_analito']).responde('Tome 2000 UI.').depoisResponde('ok. Leve ao seu médico.');
    await handler(requisicao);
    expect(runTool).toHaveBeenCalledTimes(1);
  });

  it('reprovada DUAS vezes COM dado de ferramenta cai no modo degradado', async () => {
    turno.usouTools(['consultar_analito']).comResultados(['linha-1']).responde('Tome 2000 UI.').depoisResponde('Tome 1000 UI.');
    const r = await handler(requisicao);
    expect(corpo(r).ruleCheckStatus).toBe('DEGRADADA');
    // O dado aparece...
    expect(corpo(r).texto).toMatch(/32,5|ng\/mL/);
    // ...e o texto reprovado, nao.
    expect(corpo(r).texto).not.toMatch(/UI/);
  });

  it('reprovada DUAS vezes SEM dado de ferramenta vira indisponibilidade honesta', async () => {
    turno.usouTools([]).responde('Tome 2000 UI.').depoisResponde('Tome 1000 UI.');
    const r = await handler(requisicao);
    expect(corpo(r).ruleCheckStatus).toBe('INDISPONIVEL');
    expect(corpo(r).texto).not.toMatch(/UI/);
  });

  it('a copy de indisponibilidade diz o que o aplicativo FAZ', async () => {
    // "Tente reformular" convida a repetir uma pergunta que sera recusada de
    // novo. A copy precisa dizer o que existe, nao pedir que a pessoa adivinhe.
    turno.usouTools([]).responde('Tome 2000 UI.').depoisResponde('Tome 1000 UI.');
    expect(corpo(await handler(requisicao)).texto).toMatch(/exames|consultas|medicamentos/i);
  });

  it('o motivo tecnico da reprovacao NUNCA chega a pessoa', async () => {
    // Quem escreveu a posologia foi o modelo. Dizer isso a pessoa e acusatorio
    // e ensina a contornar.
    turno.usouTools([]).responde('Tome 2000 UI.').depoisResponde('Tome 1000 UI.');
    const texto = corpo(await handler(requisicao)).texto.toLowerCase();
    expect(texto).not.toMatch(/posologia|regra|r3|bloquead|viola/);
  });

  it('NUNCA remenda: o texto reprovado nao sai recortado', async () => {
    // Um texto remendado sobre saude nao foi escrito por ninguem -- nem por um
    // humano, nem pelo modelo.
    turno.responde('Você tem anemia. Seu registro de março mostra 11,2 g/dL.').depoisResponde('Você tem anemia.');
    const r = await handler(requisicao);
    expect(corpo(r).texto).not.toContain('11,2');
  });

  it('classifica a pergunta pela TOOL usada, nao por adivinhacao', async () => {
    turno.usouTools(['consultar_consultas']).responde('Sua próxima consulta é 24 de outubro.');
    // Operacional: sem encaminhamento, e isso esta certo.
    expect(corpo(await handler(requisicao)).ruleCheckStatus).toBe('APROVADA');

    turno.usouTools(['consultar_analito']).responde('Seu registro de março mostra 32,5 ng/mL.');
    // Clinica sem encaminhamento: reprovada pela R2.
    expect(corpo(await handler(requisicao)).ruleCheckStatus).not.toBe('APROVADA');
  });

  it('citacao que aponta para linha que nenhuma tool devolveu e rejeitada', async () => {
    // A R4 verificada depois do fato: quem chamou SABE o que as tools
    // devolveram, entao uma citacao inventada e detectavel.
    turno.usouTools(['consultar_analito']).comResultados(['linha-1']).responde('...', [{ resultId: 'linha-inventada' }]);
    expect(corpo(await handler(requisicao)).ruleCheckStatus).toBe('INDISPONIVEL');
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest chat-assistant/__tests__/handler`
Esperado: FALHA.

- [ ] **Passo 3: Implementar**

```typescript
// amplify/functions/chat-assistant/handler.ts -- o trecho da verificacao

/**
 * As tools que tornam a pergunta CLINICA. A classificacao e pela tool usada, e
 * nao por adivinhacao sobre o texto: quem chamou sabe o que foi consultado, e
 * criar uma segunda classificacao falivel dentro da camada que existe para ser
 * confiavel seria trocar uma certeza por um palpite.
 *
 * Aproximacao declarada, calibrada na C10.
 */
const TOOLS_CLINICAS = new Set(['consultar_analito', 'consultar_exames', 'consultar_perfil', 'consultar_wearable']);

/**
 * Os QUATRO caminhos da D31. Gravado por turno, e a contagem e o que calibra a
 * decisao -- sem ela, "com que frequencia a verificacao reprova" seria uma
 * impressao.
 */
export type RuleCheckStatus = 'APROVADA' | 'APROVADA_NA_SEGUNDA' | 'DEGRADADA' | 'INDISPONIVEL';

function classificar(toolsUsadas: string[]): QuestionKind {
  return toolsUsadas.some((t) => TOOLS_CLINICAS.has(t)) ? 'clinica' : 'operacional';
}

/** A R4 conferida DEPOIS do fato: uma citacao que aponta para uma linha que
 *  nenhuma tool devolveu foi inventada, e isso e detectavel porque quem chamou
 *  sabe o que as tools devolveram. */
function citacoesConferem(answer: ChatAnswer, idsDevolvidos: Set<string>): boolean {
  return answer.citacoes.every((c) => idsDevolvidos.has(c.resultId));
}

export type RespostaVerificada = {
  status: RuleCheckStatus;
  texto: string;
  citacoes: Citation[];
};

/**
 * A copy de indisponibilidade. Ela diz o que o aplicativo FAZ.
 *
 * "Tente reformular a pergunta" foi recusada: quando a pergunta esta fora do
 * escopo por natureza -- "quantos miligramas eu tomo?" --, ela convida a pessoa
 * a repetir uma pergunta que sera recusada de novo, e a pessoa conclui que o
 * aplicativo esta quebrado em vez de entender que ele nao faz aquilo.
 *
 * E ela NAO diz o motivo tecnico. Quem escreveu a violacao foi o modelo;
 * contar isso a pessoa e acusatorio e ensina a contornar.
 */
const INDISPONIVEL =
  'Não consigo responder a isso. Eu mostro o que está registrado nos seus exames, consultas, medicamentos e vacinas — não indico dose, não digo se um resultado está bom ou ruim, e não substituo uma avaliação médica. Se a sua dúvida for sobre um sintoma ou um resultado, vale levá-la a um profissional de saúde.';

/**
 * A D31 em codigo: A -> E -> C.
 *
 * O que ela NUNCA faz, e cada uma foi recusada com motivo no estudo:
 * - nunca recorta o texto reprovado (recortar inverte sentido);
 * - nunca exibe o texto reprovado com um aviso (viraria enfeite a camada);
 * - nunca tenta uma terceira vez (a terceira carrega a mesma informacao).
 */
async function responderComVerificacao(
  entrada: TurnInput,
  idsDevolvidos: Set<string>,
): Promise<RespostaVerificada> {
  const aprovada = (answer: ChatAnswer, status: RuleCheckStatus): RespostaVerificada => ({
    status, texto: answer.texto, citacoes: answer.citacoes,
  });

  // E -> C: o que fazer quando nao ha resposta exibivel. Tenta o dado sem
  // prosa; nao havendo dado, o silencio honesto.
  const semResposta = (transcript: TurnTranscript): RespostaVerificada => {
    const degradada = buildDegradedAnswer(transcript.toolOutputs);
    return degradada
      ? { status: 'DEGRADADA', texto: degradada.texto, citacoes: degradada.citacoes }
      : { status: 'INDISPONIVEL', texto: INDISPONIVEL, citacoes: [] };
  };

  const primeira = await runConversationTurn(entrada);
  if (!primeira.ok) return semResposta(primeira.transcript);

  const check = checkLanguageRules(primeira.answer.texto, {
    questionKind: classificar(primeira.answer.toolsUsadas),
  });
  if (check.ok && citacoesConferem(primeira.answer, idsDevolvidos)) {
    return aprovada(primeira.answer, 'APROVADA');
  }

  // A: UMA nova geracao. Nao e remendo -- e pedir ao modelo que escreva de
  // novo sabendo o que errou. E ela NAO refaz o laco de ferramentas: recebe o
  // transcript, com os toolResult dentro.
  //
  // O motivo sai do campo `reason` da violacao, que a EPIC de regras escreve
  // em termos da REGRA e nao do sintoma. "Nao escreva 500 mg" ensinaria o
  // modelo a escrever "meio grama".
  const motivo = check.ok
    ? 'Você citou um resultado que não veio de nenhuma consulta. Cite apenas valores que as ferramentas devolveram.'
    : check.violations.map((v) => v.reason).join(' ');

  const segunda = await regenerateAnswer(entrada, primeira.transcript, motivo);
  if (!segunda.ok) return semResposta(primeira.transcript);

  const recheck = checkLanguageRules(segunda.answer.texto, {
    questionKind: classificar(segunda.answer.toolsUsadas),
  });
  if (recheck.ok && citacoesConferem(segunda.answer, idsDevolvidos)) {
    return aprovada(segunda.answer, 'APROVADA_NA_SEGUNDA');
  }

  // Reprovada duas vezes. O texto reprovado nao sai daqui de jeito nenhum.
  return semResposta(primeira.transcript);
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npx jest chat-assistant`
Esperado: PASSA.

- [ ] **Passo 5: Commitar**

```bash
git add amplify/functions/chat-assistant/
git commit -m "feat(chat): D31 -- uma nova geracao, depois o dado sem prosa, nunca remendo"
```

---

## Tarefa C5b: O modo degradado

A etapa **E** da D31. Quando a resposta gerada não pode ser exibida, o aplicativo mostra **o que as ferramentas já devolveram**, sem prosa gerada.

**Não é escopo extra: é a tese do projeto no caminho da falha.** O projeto se define por organizar informação sem interpretar. Quando o modelo não consegue falar com segurança, mostrar os números com data, unidade e documento de origem é exatamente o que ele se propôs a fazer. A prosa era o acréscimo; o dado rastreável era o produto.

**Arquivos:**
- Criar: `amplify/functions/chat-assistant/degradedAnswer.ts`
- Modificar: `amplify/functions/chat-assistant/tools/*.ts` (cada uma ganha `renderDegraded`)
- Teste: `amplify/functions/chat-assistant/__tests__/degradedAnswer.test.ts`

**Interfaces:**
- Consome: `TurnTranscript['toolOutputs']` (C4), `ChatTool.renderDegraded` (C2).
- Produz:
  - `type DegradedBlock = { titulo: string; linhas: string[]; citacoes: Citation[] }`
  - `buildDegradedAnswer(toolOutputs): { texto: string; citacoes: Citation[] } | null`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { buildDegradedAnswer } from '../degradedAnswer';
import { checkLanguageRules } from '../../ai-language-rules/languageRules';

const saidaDeAnalito = {
  name: 'consultar_analito',
  output: {
    disponivel: true,
    analyteCode: '62292-8',
    nome: 'Vitamina D (25-OH)',
    unidade: 'ng/mL',
    coletas: [
      { id: 'l-1', valor: 32.5, unidade: 'ng/mL', dataDaColeta: '2026-03-12', momento: null, documentoId: 'doc-marco', faixaDoLaboratorio: { minimo: 30, maximo: 100 } },
      { id: 'l-2', valor: 41, unidade: 'ng/mL', dataDaColeta: '2026-09-20', momento: null, documentoId: 'doc-setembro', faixaDoLaboratorio: { minimo: 30, maximo: 100 } },
    ],
    naoComparaveis: [],
  },
};

describe('buildDegradedAnswer', () => {
  it('monta o dado com valor, data e unidade', () => {
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    expect(r.texto).toContain('Vitamina D (25-OH)');
    expect(r.texto).toContain('32,5');
    expect(r.texto).toContain('12/03/2026');
  });

  it('a PRIMEIRA linha diz que aquilo nao e a resposta da conversa', () => {
    // Sem isso, a pessoa le o texto de modelo como se fosse a IA falando.
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    expect(r.texto.split('\n')[0]).toMatch(/não consegui escrever/i);
  });

  it('encaminha a um profissional de saude', () => {
    expect(buildDegradedAnswer([saidaDeAnalito])!.texto).toMatch(/médico|profissional de saúde/i);
  });

  it('leva as citacoes, para a origem continuar clicavel', () => {
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    expect(r.citacoes.map((c) => c.documentId)).toEqual(['doc-marco', 'doc-setembro']);
  });

  it('PASSA no proprio verificador -- ela e segura por construcao', () => {
    // O teste que justifica a opcao E existir. Se a resposta degradada
    // precisasse ser verificada, ela nao seria uma saida da reprovacao.
    const r = buildDegradedAnswer([saidaDeAnalito])!;
    expect(checkLanguageRules(r.texto, { questionKind: 'clinica' })).toEqual({ ok: true });
  });

  it('nao interpreta: nenhuma palavra compara o valor com a faixa', () => {
    const texto = buildDegradedAnswer([saidaDeAnalito])!.texto.toLowerCase();
    expect(texto).not.toMatch(/dentro|fora|acima|abaixo|normal|alterado|melhor|pior/);
  });

  it('devolve null quando nenhuma ferramenta tem o que mostrar', () => {
    // E o que faz a etapa C existir: sem dado, indisponibilidade honesta.
    expect(buildDegradedAnswer([])).toBeNull();
    expect(buildDegradedAnswer([{ name: 'consultar_analito', output: { disponivel: false } }])).toBeNull();
  });

  it('ignora ferramenta que nao sabe se renderizar, sem quebrar', () => {
    const r = buildDegradedAnswer([saidaDeAnalito, { name: 'consultar_perfil', output: { qualquer: 'coisa' } }]);
    expect(r).not.toBeNull();
  });

  it('nao usa o termo vetado', () => {
    expect(buildDegradedAnswer([saidaDeAnalito])!.texto.toLowerCase()).not.toMatch(/\bfinal\b|finaliz/);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest degradedAnswer`
Esperado: FALHA com módulo não encontrado.

- [ ] **Passo 3: Implementar o montador**

```typescript
// amplify/functions/chat-assistant/degradedAnswer.ts

/**
 * Resumo do arquivo:
 * A etapa E da D31 -- o que a pessoa ve quando a resposta gerada nao pode ser
 * exibida e as ferramentas tinham dado.
 *
 * ELE NAO E UM REMENDO DA RESPOSTA DO MODELO. E outra coisa, construida a
 * partir de dado estruturado, e e por isso que ele nao sofre do problema da
 * opcao recusada (recortar o texto reprovado inverte sentido em vez de
 * remove-lo).
 *
 * E ele passa as regras POR CONSTRUCAO: nao tem posologia porque nao ha espaco
 * para ela, cita numero com origem porque a origem e campo, e encaminha porque
 * o encaminhamento faz parte do modelo fixo. Um teste o submete ao proprio
 * verificador e exige aprovacao -- se ele precisasse ser verificado, nao
 * serviria como saida da reprovacao.
 */
import { CHAT_TOOLS } from './tools';
import type { Citation } from './chatSchema';

export type DegradedBlock = {
  titulo: string;
  linhas: string[];
  citacoes: Citation[];
};

const ABERTURA =
  'Não consegui escrever uma resposta sobre isso. Abaixo está o que está registrado no seu histórico, do jeito que foi guardado.';

const FECHAMENTO =
  'Leve seus exames ao seu médico para avaliar o que eles significam.';

export function buildDegradedAnswer(
  toolOutputs: Array<{ name: string; output: unknown }>,
): { texto: string; citacoes: Citation[] } | null {
  const blocos: DegradedBlock[] = [];

  for (const { name, output } of toolOutputs) {
    const tool = CHAT_TOOLS.find((t) => t.name === name);
    // Tool sem renderizador simplesmente nao entra. Nao e erro: nem toda
    // saida rende texto util.
    if (!tool?.renderDegraded) continue;
    const bloco = tool.renderDegraded(output);
    if (bloco && bloco.linhas.length > 0) blocos.push(bloco);
  }

  // Sem nada para mostrar, quem chamou segue para a etapa C. Devolver um
  // texto vazio com moldura seria pior que a indisponibilidade honesta.
  if (blocos.length === 0) return null;

  const corpo = blocos
    .map((b) => `${b.titulo}\n${b.linhas.map((l) => `• ${l}`).join('\n')}`)
    .join('\n\n');

  return {
    texto: `${ABERTURA}\n\n${corpo}\n\n${FECHAMENTO}`,
    citacoes: blocos.flatMap((b) => b.citacoes),
  };
}
```

- [ ] **Passo 4: Implementar o renderizador da tool de analitos**

É a de maior valor e a mais estruturada — começa por ela.

```typescript
// amplify/functions/chat-assistant/tools/analitos.ts -- acrescentar ao objeto

function numero(v: number): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function dataLonga(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

  // ... dentro de analitosTool:
  renderDegraded(output) {
    const saida = output as {
      disponivel?: boolean; nome?: string; unidade?: string;
      coletas?: Array<{ id: string; valor: number; unidade: string; dataDaColeta: string; momento: string | null; documentoId: string }>;
    };
    if (!saida.disponivel || !saida.coletas?.length) return null;

    return {
      titulo: `${saida.nome} (${saida.unidade})`,
      // Data, valor e unidade. NENHUMA comparacao com a faixa: dizer "dentro"
      // ou "acima" seria leitura clinica, e e justamente por nao interpretar
      // que este texto e seguro sem verificacao.
      linhas: saida.coletas.map((c) =>
        [dataLonga(c.dataDaColeta), `${numero(c.valor)} ${c.unidade}`, c.momento]
          .filter(Boolean)
          .join(' — '),
      ),
      citacoes: saida.coletas.map((c) => ({
        resultId: c.id,
        documentId: c.documentoId,
        collectedAt: c.dataDaColeta,
      })),
    };
  },
```

As demais tools ganham `renderDegraded` pelo mesmo molde, ou não ganham — consulta cuja saída não rende texto útil simplesmente não implementa, e o montador a ignora.

- [ ] **Passo 5: Rodar e confirmar que passa**

Executar: `npx jest degradedAnswer && npm run validate`
Esperado: passa.

- [ ] **Passo 6: Commitar**

```bash
git add amplify/functions/chat-assistant/
git commit -m "feat(chat): modo degradado -- o dado sem prosa quando a resposta nao pode ser exibida"
```

---

## Tarefa C6: O aplicativo, sem mudar a forma do contrato

**Arquivos:**
- Modificar: `src/services/aiAssistantService.ts`, `src/hooks/useChatBot.ts`, `src/screens/ChatBotScreen.tsx`
- Teste: `__tests__/aiAssistantService.test.ts`, `__tests__/ChatBotScreen.test.tsx`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
import { sendMessage } from '@/services/aiAssistantService';

describe('aiAssistantService real', () => {
  it('manda o token do Cognito no cabecalho', async () => {
    await sendMessage('oi', []);
    expect(fetchFalso.ultima.headers.authorization).toMatch(/^Bearer /);
  });

  it('NAO manda identificador de usuario no corpo', async () => {
    // O dono vem do token. Um identificador no corpo seria uma porta.
    await sendMessage('oi', []);
    expect(JSON.stringify(fetchFalso.ultima.body)).not.toMatch(/owner|userId|sub/i);
  });

  it('falha de rede vira mensagem amigavel, nao excecao vazando para a tela', async () => {
    fetchFalso.falha();
    await expect(sendMessage('oi', [])).rejects.toThrow(/tente novamente/i);
  });

  it('a forma do contrato AiAssistantService nao mudou', () => {
    // Se este teste precisar mudar, o desenho da EPIC anterior nao previu o
    // que precisava prever -- e isso e um achado a registrar, nao um detalhe.
    expect(sendMessage.length).toBe(3);
  });
});

describe('ChatBotScreen', () => {
  it('o aviso permanente esta sempre visivel', () => {
    render(<ChatBotScreen />);
    expect(screen.getByText(/não substitui avaliação médica/i)).toBeTruthy();
  });

  it('numero citado leva ao documento de origem', () => {
    render(<ChatBotScreen {...comResposta({ texto: 'Março: 32,5 ng/mL.', citacoes: [{ documentId: 'doc-1' }] })} />);
    fireEvent.press(screen.getByLabelText(/ver documento de origem/i));
    expect(router.push).toHaveBeenCalledWith('/document-detail?id=doc-1');
  });

  it('nenhuma copy usa o termo vetado', () => {
    const { toJSON } = render(<ChatBotScreen />);
    expect(JSON.stringify(toJSON()).toLowerCase()).not.toMatch(/\bfinal\b|finaliz/);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest aiAssistantService`
Esperado: FALHA.

- [ ] **Passo 3: Implementar**

```typescript
// src/services/aiAssistantService.ts

/**
 * Resumo do arquivo:
 * Fronteira com o provedor de IA do Assistente. A versao mockada deste arquivo
 * dizia, num aviso, que a troca por IA real exigia decidir provedor, custo,
 * retencao e base legal. Tres das quatro foram respondidas fora daqui: o
 * provedor e o Bedrock (D14), o custo e medido como na feature de wearable, e
 * "API de terceiros" deixou de ser o caso -- o Bedrock roda na conta do
 * proprio projeto. A quarta, retencao, e a tarefa 0.5 do roadmap, e por isso a
 * PERSISTENCIA da conversa e um bloco separado.
 *
 * A FORMA DO CONTRATO NAO MUDOU. A EPIC anterior desenhou `AiAssistantService`
 * para que a troca fosse a substituicao de uma funcao, e nao uma refatoracao
 * de interface. Este arquivo comprova esse desenho.
 */
import { fetchAuthSession } from 'aws-amplify/auth';
import outputs from '../../amplify_outputs.json';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Citation { resultId: string; documentId: string; collectedAt: string }

export interface AiAssistantService {
  sendMessage: (message: string, history: ChatMessage[], userContext?: string) => Promise<string>;
}

// Teto do lado do aplicativo, menor que o da funcao: a tela nunca fica
// esperando para sempre, mesmo se a funcao demorar o maximo dela.
const TIMEOUT_MS = 90_000;

export async function sendMessage(
  message: string,
  history: ChatMessage[],
  _userContext?: string,
): Promise<string> {
  const sessao = await fetchAuthSession();
  const token = sessao.tokens?.idToken?.toString();
  if (!token) throw new Error('Sua sessão expirou. Entre de novo para continuar.');

  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(outputs.custom.chatAssistantUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      // NENHUM identificador de usuario no corpo. O dono vem do token, e
      // mandar um identificador aqui abriria uma porta que a funcao teria que
      // aprender a ignorar -- e um dia esqueceria.
      body: JSON.stringify({
        message,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: controle.signal,
    });

    if (!resposta.ok) throw new Error('Não consegui responder agora. Tente novamente em instantes.');
    const corpo = (await resposta.json()) as { texto: string };
    return corpo.texto;
  } catch (erro) {
    if (erro instanceof Error && erro.message.includes('Tente novamente')) throw erro;
    throw new Error('Não consegui responder agora. Tente novamente em instantes.');
  } finally {
    clearTimeout(relogio);
  }
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npm run validate`
Esperado: passa.

- [ ] **Passo 5: Commitar**

```bash
git add src/services/aiAssistantService.ts src/hooks/useChatBot.ts src/screens/ChatBotScreen.tsx __tests__/
git commit -m "feat(chat): troca do mock pela IA real, sem mudar a forma do contrato"
```

---

## Tarefa C7: Anexo pontual no chat

**Arquivos:**
- Modificar: `amplify/functions/chat-assistant/handler.ts`, `src/hooks/useChatBot.ts`, `src/screens/ChatBotScreen.tsx`
- Teste: `__tests__/anexoNoChat.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
describe('anexo pontual no chat (D15)', () => {
  it('o texto do documento entra NAQUELA conversa', async () => {
    const r = await handler(requisicaoComAnexo);
    expect(turno.ultimaEntrada.message).toContain('HEMOGRAMA');
  });

  it('NADA e gravado como dado clinico', async () => {
    // A diferenca entre "me explica este papel" e "quero que este exame faca
    // parte do meu historico". As duas portas existem, e esta nao e a que
    // registra.
    await handler(requisicaoComAnexo);
    expect(escritas.map((e) => e.tabela)).not.toContain('LabResult');
    expect(escritas.map((e) => e.tabela)).not.toContain('MedicalDocument');
  });

  it('a tela diz que o anexo nao foi registrado, e oferece a porta que registra', () => {
    render(<ChatBotScreen {...comAnexo()} />);
    expect(screen.getByText(/não foi adicionado ao seu histórico/i)).toBeTruthy();
    fireEvent.press(screen.getByText(/registrar este documento/i));
    expect(router.push).toHaveBeenCalledWith('/add-exam');
  });

  it('reusa o OCR da Fase 1, sem uma segunda implementacao', () => {
    const fonte = readFileSync('amplify/functions/chat-assistant/handler.ts', 'utf8');
    expect(fonte).toMatch(/extract-document-data\/textractClient/);
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest anexoNoChat`
Esperado: FALHA.

- [ ] **Passo 3: Implementar**

```typescript
// amplify/functions/chat-assistant/handler.ts -- o trecho do anexo

// REUSA o OCR da Fase 1. Uma segunda implementacao de OCR divergiria da
// primeira em silencio, e o teste acima existe para impedir isso.
import { extractText } from '../extract-document-data/textractClient';

/**
 * O anexo pontual (D15). Ele NAO extrai, NAO normaliza e NAO grava: passa o
 * documento pelo OCR e entrega o texto ao modelo NAQUELA conversa.
 *
 * E a diferenca entre "me explica este papel aqui", que e o chat, e "quero que
 * este exame faca parte do meu historico", que e a tela de exames. As duas
 * portas continuam existindo, e o botao que leva a /add-exam nao some.
 */
async function textoDoAnexo(anexo: { bucket: string; key: string } | undefined): Promise<string | null> {
  if (!anexo) return null;
  const bytes = await readObjectBuffer(anexo.bucket, anexo.key);
  const ocr = await extractText(bytes, anexo.key, anexo.bucket);
  const texto = ocr.pages.map((p) => p.text).join('\n').trim();
  return texto === '' ? null : texto.slice(0, 20_000);
}

// ... no corpo do handler:
const anexado = await textoDoAnexo(corpo.attachment);
const mensagem = anexado
  ? `${corpo.message}\n\n[Documento anexado pelo usuário nesta conversa, apenas para consulta — não foi registrado no histórico dele]\n${anexado}`
  : corpo.message;
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Executar: `npm run validate`
Esperado: passa.

- [ ] **Passo 5: Commitar**

```bash
git add amplify/functions/chat-assistant/ src/
git commit -m "feat(chat): anexo pontual que passa pelo OCR e nao vira dado clinico"
```

---

## Tarefa C8: Persistência — **bloqueada pela tarefa 0.5 do roadmap**

> **Não comece esta tarefa antes de a tarefa 0.5 estar respondida e a D5 aceita.**
> Persistir conversa sobre saúde é decisão do usuário e do orientador, com
> consequência de LGPD. Gravar primeiro e decidir depois inverte a ordem certa:
> a decisão de retenção é mais fácil de tomar antes de existir dado guardado
> sob regra nenhuma.

**Arquivos:**
- Criar: `amplify/data/schemas/chat.ts`
- Modificar: `amplify/data/resource.ts`
- Teste: `__tests__/chatPersistence.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

```typescript
describe('persistencia da conversa', () => {
  it('cada mensagem guarda as citacoes, para a origem sobreviver ao tempo', async () => {
    await salvarTurno(turnoComCitacao);
    const gravada = await lerMensagem('m-1');
    expect(JSON.parse(gravada.citations)).toEqual([{ resultId: 'l-1', documentId: 'doc-1', collectedAt: '2026-03-12' }]);
  });

  it('o titulo vem das primeiras palavras do usuario, NUNCA do modelo', async () => {
    // Um titulo gerado e mais uma superficie de texto sobre saude, que
    // precisaria passar pelas cinco camadas para render uma linha de lista.
    const c = await criarConversa('Como está minha vitamina D comparada ao exame anterior?');
    expect(c.title).toMatch(/^Como está minha vitamina D/);
  });

  it('guarda o resultado da verificacao de linguagem', async () => {
    await salvarTurno({ ...turnoComCitacao, ruleCheckStatus: 'APROVADA_NA_SEGUNDA' });
    expect((await lerMensagem('m-1')).ruleCheckStatus).toBe('APROVADA_NA_SEGUNDA');
  });

  it('conversa de outro dono nao e legivel', async () => {
    await expect(lerConversaComo('outro-dono', 'c-1')).resolves.toBeNull();
  });
});
```

- [ ] **Passo 2: Rodar e confirmar que falha**

Executar: `npx jest chatPersistence`
Esperado: FALHA.

- [ ] **Passo 3: Implementar**

```typescript
// amplify/data/schemas/chat.ts

import { a } from '@aws-amplify/backend';

// A politica de retencao decidida na tarefa 0.5 do roadmap entra aqui, como
// comentario E como comportamento. Este arquivo nao deve ser escrito antes
// dela existir.
export const chatSchema = {
  ChatConversation: a
    .model({
      // As primeiras palavras da primeira mensagem do usuario, truncadas.
      // NUNCA gerado pelo modelo: um titulo gerado e mais uma superficie de
      // texto sobre saude que precisaria passar pelas cinco camadas.
      title: a.string().required(),
      startedAt: a.datetime().required(),
      lastMessageAt: a.datetime(),
      messageCount: a.integer(),
    })
    .authorization((allow) => [allow.owner()]),

  ChatMessage: a
    .model({
      conversationId: a.string().required(),
      role: a.enum(['USER', 'ASSISTANT']),
      content: a.string().required(),
      // JSON serializado a mao, pelo mesmo motivo registrado em
      // health-import.ts: nao ha precedente no repo de a.json() lido pelo
      // cliente do Amplify quando escrito direto pela Lambda.
      citations: a.string(),
      // Qual dos tres caminhos da verificacao de linguagem aconteceu. E o dado
      // que calibra a secao 7 da spec -- sem ele, "com que frequencia a
      // verificacao reprova" seria uma impressao.
      ruleCheckStatus: a.string(),
      modelId: a.string(),
      inputTokens: a.integer(),
      outputTokens: a.integer(),
    })
    .secondaryIndexes((index) => [index('conversationId').sortKeys(['createdAt'])])
    .authorization((allow) => [allow.owner()]),
};
```

- [ ] **Passo 4: Publicar e conferir**

Executar: `nvm use 20.20.1 && npm run amplify:sandbox`
Esperado: publica; nada do que já existia muda de comportamento.

- [ ] **Passo 5: Commitar**

```bash
git add amplify/data/
git commit -m "feat(chat): persistencia da conversa com citacoes e resultado da verificacao"
```

---

## Tarefa C9: A gaveta de histórico — **bloqueada pela tarefa 0.5**

**Arquivos:**
- Modificar: `src/hooks/useChatBot.ts`, `src/screens/ChatBotScreen.tsx`
- Teste: `__tests__/ChatBotScreen.test.tsx`

- [ ] **Passo 1: Escrever o teste que falha**

```tsx
describe('gaveta de historico', () => {
  it('lista conversas reais, agrupadas por periodo', () => {
    render(<ChatBotScreen {...comConversas([hoje, ontem, semanaPassada])} />);
    fireEvent.press(screen.getByLabelText(/histórico/i));
    expect(screen.getByText('Hoje')).toBeTruthy();
    expect(screen.getByText('Últimos 7 dias')).toBeTruthy();
  });

  it('sem conversa anterior, o estado vazio continua sendo um estado legitimo', () => {
    render(<ChatBotScreen {...comConversas([])} />);
    fireEvent.press(screen.getByLabelText(/histórico/i));
    expect(screen.getByText(/nenhuma conversa anterior/i)).toBeTruthy();
  });

  it('apagar uma conversa a faz sumir', async () => {
    render(<ChatBotScreen {...comConversas([hoje])} />);
    fireEvent.press(screen.getByLabelText(/apagar conversa/i));
    fireEvent.press(screen.getByText(/apagar/i));
    await waitFor(() => expect(screen.queryByText(hoje.title)).toBeNull());
  });

  it('a tela diz o que e guardado e por quanto tempo', () => {
    render(<ChatBotScreen {...comConversas([])} />);
    fireEvent.press(screen.getByLabelText(/histórico/i));
    expect(screen.getByText(/guardadas/i)).toBeTruthy();
  });
});
```

- [ ] **Passo 2: Rodar, implementar, rodar de novo**

A implementação segue o padrão de lista com cache de `useExamsData`, e o painel de exclusão é o `DeleteConfirmPanel` que já existe — nunca `Alert.alert`, pela convenção registrada no item 18 do `GAP_ANALYSIS.md`.

A copy de retenção sai da decisão da tarefa 0.5, e **não** é inventada aqui.

- [ ] **Passo 3: Commitar**

```bash
git add src/
git commit -m "feat(chat): gaveta de historico com conversas reais e exclusao pelo usuario"
```

---

## Tarefa C10: Medição

Nenhum teste unitário produz estes números.

- [ ] **Passo 1: Rodar vinte perguntas reais, metade clínicas e metade operacionais**

- [ ] **Passo 2: Anotar, por turno**

| Medida | Por que ela importa |
|---|---|
| custo | o chat paga por turno, e um turno com laço paga mais de uma vez |
| iterações do laço | calibra `MAX_TOOL_ITERATIONS`; se nenhuma passar de 2, o teto está folgado |
| reprovações na primeira geração | calibra a §7 da spec; se for alto, cada turno paga duas vezes |
| classificação clínica/operacional errada | mede a aproximação "pela tool usada" registrada no `plan.md` |

- [ ] **Passo 3: Conferir o cruzamento da tarefa 3.1 contra a pergunta que motivou o projeto**

"Como está minha vitamina D comparada ao exame anterior, e meu sono piorou no mesmo período?" — a resposta precisa tratar as duas séries pelo que elas são (a de wearable é densa, a de exame é esparsa e tem faixa) e **não** afirmar relação causal.

- [ ] **Passo 4: Calibrar `MAX_TOOL_ITERATIONS` e `HISTORY_WINDOW` com o medido, e trocar os comentários**

- [ ] **Passo 5: Registrar em `estudos-ia/04-implementacao/notas.md`**

- [ ] **Passo 6: Commitar**

```bash
git add amplify/functions/chat-assistant/ estudos-ia/04-implementacao/notas.md
git commit -m "chore(chat): limites calibrados contra conversas reais"
```

---

## Auto-revisão deste plano

**Cobertura da spec.** Os dez cenários da seção 3 têm tarefa: exame com dado (C3, C4), exame sem dado (C2, C3), pergunta operacional (C5), cruzamento (C3, C10), violação de regra com segunda tentativa salvando (C5), reprovada duas vezes **com** dado de ferramenta (C5b), reprovada duas vezes **sem** dado (C5), guardrail na entrada (C4), anexo pontual (C7), falha na chamada (C6). A seção 4 está em C6 e C9; a seção 6 em C2, C3 e C8; a seção 7 está distribuída, com a segurança concentrada em C1 e C2 e a D31 em C5 e C5b. Os critérios de aceite têm teste correspondente, separados entre os que dependem da tarefa 0.5 e os que não.

**Marcadores.** Nenhum passo de implementação sem bloco de código, com uma exceção deliberada: o passo 2 da C9, que é uma tela de lista sobre padrões já existentes no repositório (`useExamsData`, `DeleteConfirmPanel`) e cuja copy depende de uma decisão que ainda não foi tomada. Escrever copy de retenção antes de a política existir seria inventar a política.

**Tipos.** `ChatIdentity` é definido em C1 e usado em C2, C3 e C5. `ChatTool` e `CHAT_TOOLS` em C2, usados em C4, C5b e no montador do modo degradado. `DegradedBlock` é declarado em C2 (no tipo `ChatTool.renderDegraded`) e definido em C5b — a ordem incomoda e é deliberada: o tipo pertence ao consumidor, e declará-lo em C2 é o que faz o compilador cobrar o renderizador de quem o implementa. `ChatAnswer` e `Citation` em C4, usados em C5, C5b, C6 e C8. `TurnTranscript` em C4, consumido em C5 e C5b — é o que carrega os resultados das ferramentas da primeira geração para a segunda e para o modo degradado. `QuestionKind`, `checkLanguageRules` e `LANGUAGE_RULES_PROMPT` vêm da EPIC de regras de linguagem e são consumidos em C4, C5 e — no teste que prova segurança por construção — em C5b. `MAX_TOOL_ITERATIONS`, `HISTORY_WINDOW`, `MAX_OUTPUT_TOKENS` e `TEMPERATURE_RETRY` são definidos em C4 e calibrados em C10. `RuleCheckStatus` tem **quatro** valores em C5 e é gravado em C8.

**Dependências que travam.**
- A **EPIC de regras de linguagem** é pré-requisito duro de C4 e C5.
- A **tarefa 0.5 do roadmap** bloqueia C8 e C9, e **só** elas.
- A **EPIC de extração** precisa estar concluída até a tarefa 10 para C3 ter o que ler, e até a tarefa 8 para C7 reusar o OCR.
- C1 e C2 não dependem de nada além do repositório atual.

**Um defeito da primeira versão deste plano, corrigido pela D31.** A segunda geração chamava `runConversationTurn` de novo, **refazendo o laço de ferramentas inteiro** — as mesmas consultas, pagas e esperadas duas vezes. Pior que o custo: a segunda tentativa poderia enxergar evidências diferentes da primeira, quando o que se quer corrigir é só a redação. Agora ela recebe o `transcript` e faz uma ida só ao modelo, com exatamente as mesmas evidências na frente. O achado saiu do estudo `estudos-ia/01-estudos/resposta-reprovada.md`, §5.

**Duas coisas que este plano assume e que podem estar erradas.**

A primeira: o contrato `AiAssistantService` foi desenhado pela EPIC anterior para que a troca fosse a substituição de uma função. C6 tem um teste que afirma que a forma não mudou. **Se esse teste precisar mudar, isso não é um detalhe de implementação: é o sinal de que o desenho anterior não previu o que precisava prever**, e merece registro no log de decisões em vez de um ajuste silencioso.

A segunda: a D31 aposta que **a segunda geração salva a maioria das respostas reprovadas**, com o argumento de que ela costuma estar pedindo ao modelo que recuse direito, e não que descubra outra resposta. **É aposta, não resultado.** O gatilho de reabertura está escrito na própria decisão: se a medição da C10 mostrar que ela salva menos de um terço, a etapa A sai e a ordem passa a ser modo degradado → indisponibilidade.
