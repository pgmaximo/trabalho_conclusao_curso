# PLAN: E8 — Campanhas e postos de vacinação no chat

Estado: **aprovado e entregue em 2026-10-17** (desvios na seção 4a) · Spec: [`spec.md`](./spec.md) (aprovada em 2026-10-17) · Plano passo a passo: `docs/superpowers/plans/2026-10-17-e8-campanhas-postos-chat.md`

## 1. Resumo do desenho

O app passa a mandar, opcionalmente, a UF e o código do município (`local`) em cada pergunta. O `handler` valida o campo e ele atravessa o turno até as ferramentas como **contexto do turno**, um terceiro parâmetro de `run`, separado da entrada do modelo e da identidade. Duas ferramentas novas:

- `consultar_campanhas`: sem I/O. Chama `getCampanhasAtivas` (a mesma função da tela) com a data de São Paulo, e acrescenta o aviso da região Norte quando a UF é de lá (P1 = A).
- `consultar_postos`: um `GetItem` no cache de postos pela porta pública nova (`lerPublicoPorChave`, D8.3 = A), com o código do município do contexto; corte, filtro por bairro e saída em memória.

A R3 ganha um padrão contra indicação individual de vacina (D8.4 = A). Nada é gravado; nenhum schema muda.

```
app (aiAssistantService) ── loadCachedLocation() ──► corpo { message, history, local? { uf, codigoMunicipio } }
                                                          │
handler.lerCorpo ── lerLocal (valida, descarta o inválido) ─┘
   │
responder (verificacao) ── TurnInput.local ──► runConversationTurn ── runTool(nome, input, identity, { local })
                                                                         │
                       ┌─────────────────────────────────────────────────┴───────────────────────────┐
              consultar_campanhas                                                           consultar_postos
   getCampanhasAtivas(hojeEmSaoPaulo())  ◄── o MESMO da Lambda da tela          lerPublicoPorChave('CACHE_DE_POSTOS', codigo)
   + aviso Norte (local.uf)                                                      └─► GetItem em VaccinationSiteCache (só leitura)
```

O modelo nunca recebe `local`: só a saída já montada das ferramentas.

## 2. Arquivos

| Arquivo | Ação | Responsabilidade (um motivo só para mudar) |
|---|---|---|
| `amplify/functions/chat-assistant/localDoPedido.ts` | nasce, **puro** | `lerLocal(bruto)`: valida `local` do corpo (lista fechada de 27 UFs, código de 6 ou 7 dígitos). |
| `amplify/functions/chat-assistant/types.ts` | muda | Tipos `LocalDoUsuario` e `ContextoDoTurno`; `ChatTurnRequest.local`. |
| `amplify/functions/chat-assistant/handler.ts` | muda 2 linhas | `lerCorpo` chama `lerLocal`. |
| `amplify/functions/chat-assistant/verificacao.ts` | muda | `responder` repassa `local` ao `TurnInput`; `consultar_campanhas` em `TOOLS_CLINICAS`. |
| `amplify/functions/chat-assistant/conversationLoop.ts` | muda | `TurnInput.local`; passa `{ local }` a `runTool`. |
| `amplify/functions/chat-assistant/tools/tipos.ts` | muda | `run(input, identity, contexto)`. |
| `amplify/functions/chat-assistant/tools/index.ts` | muda | `runTool` aceita e repassa o contexto; registra as duas ferramentas. |
| `amplify/functions/chat-assistant/tools/ownerScopedRead.ts` | muda (acréscimo) | `lerPublicoPorChave` e `TABELAS_PUBLICAS`. `lerDoDono` não muda de byte. |
| `amplify/functions/chat-assistant/formatoPtBr.ts` | muda (acréscimo) | `dataEmSaoPaulo(instante)`. |
| `amplify/functions/chat-assistant/tools/campanhas.ts` | nasce | `ChatTool` de campanhas, aviso Norte, `renderDegraded`. |
| `amplify/functions/chat-assistant/tools/postos.ts` | nasce | `ChatTool` de postos: leitura, validade, filtro de bairro, ordem, teto, `renderDegraded`. |
| `amplify/functions/get-vaccination-sites/validadeDoCache.ts` | nasce | Constante da validade do cache (7 dias), lida pela Lambda da tela **e** pelo chat. |
| `amplify/functions/get-vaccination-sites/handler.ts` | muda 2 linhas | Importa a constante em vez de declará-la. Comportamento igual. |
| `amplify/functions/chat-assistant/chatPrompt.ts` | muda | Um bullet: quando usar cada ferramenta e o que nunca afirmar. |
| `amplify/functions/ai-language-rules/languageRules.ts` | muda (D8.4) | Padrão novo em `PADROES_R3`: indicação individual de vacina e "a vacina é segura para você". |
| `amplify/backend.ts` | muda | `siteCacheTable` no laço de `grantReadData` do chat; env `SITE_CACHE_TABLE_NAME`; comentário da exceção. |
| `src/services/aiAssistantService.ts` | muda | Lê `loadCachedLocation()` e manda `local`. |
| Testes | nascem/mudam | ver `tasks.md`. |

**Não mudam:** `amplify/data/` (schema), `get-vaccination-campaigns/` (nenhum byte), telas, `locationService.ts`.

## 3. Contratos

```ts
// types.ts
export type LocalDoUsuario = { uf: string | null; codigoMunicipio: string | null };
export type ContextoDoTurno = { local: LocalDoUsuario | null };
// ChatTurnRequest ganha: local?: LocalDoUsuario | null;

// localDoPedido.ts (puro)
export const UFS: readonly string[];                 // as 27 siglas
export function lerLocal(bruto: unknown): LocalDoUsuario | null;
// null quando não é objeto ou quando nenhum dos dois campos é válido.
// Campo inválido vira null; campos extras são ignorados (lidos por nome).

// conversationLoop.ts — TurnInput ganha: local?: LocalDoUsuario | null;
// runTool(chamada.name, chamada.input, input.identity, { local: input.local ?? null })

// tools/tipos.ts
run: (input: unknown, identity: ChatIdentity, contexto: ContextoDoTurno) => Promise<unknown>;

// tools/index.ts
export function runTool(name: string, input: unknown, identity: ChatIdentity,
  contexto?: ContextoDoTurno): Promise<unknown>;   // padrão { local: null }

// tools/ownerScopedRead.ts
export const TABELAS_PUBLICAS: {
  readonly CACHE_DE_POSTOS: { readonly env: 'SITE_CACHE_TABLE_NAME'; readonly chave: 'codigoMunicipio' };
};
export type TabelaPublica = keyof typeof TABELAS_PUBLICAS;
export function lerPublicoPorChave(tabela: TabelaPublica, valorDaChave: string): Promise<LinhaDoBanco | null>;
// GetItem; lança se a tabela não está na lista (chamador JS) ou se a env não está configurada.

// get-vaccination-sites/validadeDoCache.ts
export const VALIDADE_DO_CACHE_DE_POSTOS_S = 7 * 24 * 60 * 60;

// formatoPtBr.ts (acréscimo; o arquivo continua sem importar nada)
export function dataEmSaoPaulo(instante: Date): string;  // 'AAAA-MM-DD' no fuso America/Sao_Paulo

// tools/campanhas.ts
export const UFS_DA_REGIAO_NORTE: ReadonlySet<string>;  // AC AM AP PA RO RR TO
export type SaidaCampanhas =
  | { disponivel: true; fonte: string; observacao: string;
      campanhas: { nome: string; inicio: string; fim: string }[]; avisoRegiao?: string }
  | { disponivel: false; explicacao: string; fonte: string; avisoRegiao?: string };
export const campanhasTool: ChatTool;   // 'consultar_campanhas'

// tools/postos.ts
export const MAX_UNIDADES = 8;
export type UnidadeParaOModelo = { nome: string; bairro: string | null; endereco: string | null };
export type SaidaPostos =
  | { disponivel: true; fonte: string; observacao: string; atualizadoEm: string;
      totalNaCidade: number; totalNoFiltro: number | null; omitidas: number;
      unidades: UnidadeParaOModelo[]; explicacao?: string }
  | { disponivel: false; explicacao: string };
export const postosTool: ChatTool;      // 'consultar_postos'
```

**Textos fixos** (o modelo repete o que recebe; nenhum nomeia tabela, serviço ou erro):

| Constante | Texto |
|---|---|
| campanhas, nenhuma ativa | "Nenhuma campanha nacional de vacinação do calendário que o aplicativo acompanha está ativa hoje." |
| campanhas, fonte | "Calendário de campanhas nacionais de vacinação do Ministério da Saúde, acompanhado pelo aplicativo." |
| campanhas, observação | "O aplicativo não registra o público de cada campanha. Quem pode se vacinar é informado pela unidade de saúde." |
| campanhas, aviso Norte | "A região Norte tem calendário próprio para a vacinação contra a gripe, que o aplicativo não acompanha. As datas devem ser confirmadas com a unidade de saúde." |
| postos, sem cidade | "O aplicativo ainda não sabe a cidade do usuário. Na tela de Vacinação, ele pode permitir a localização ou escolher a cidade." |
| postos, lista não carregada | "A lista de unidades de saúde da cidade do usuário ainda não foi carregada no aplicativo. Ao abrir a tela de Vacinação, o aplicativo busca essa lista." |
| postos, lista vazia | "O cadastro nacional de estabelecimentos de saúde não trouxe nenhuma unidade básica de saúde para a cidade do usuário." |
| postos, nada no bairro | "Nenhuma unidade da lista salva da cidade tem esse bairro no endereço." |
| postos, fonte | "Cadastro Nacional de Estabelecimentos de Saúde (CNES), do Ministério da Saúde." |
| postos, observação | "São unidades básicas de saúde do cadastro nacional. O aplicativo não sabe quais delas aplicam cada vacina nem o horário de funcionamento; isso deve ser confirmado com a unidade. A tela de Vacinação mostra as mais próximas." |

## 4. Decisões de desenho, com o porquê

1. **Contexto do turno como terceiro parâmetro de `run`, e não dentro de `identity` nem de `input`.** `identity` é "o que veio do token" e precisa continuar significando só isso; `input` é o que o **modelo** escreve, e a cidade não pode vir dele (o modelo inventaria ou repetiria uma cidade dita na conversa). Um terceiro parâmetro deixa as 9 ferramentas atuais intactas (TypeScript aceita função com menos parâmetros) e torna explícito, no tipo, de onde cada coisa vem.
2. **`local` inválido é descartado, nunca recusado com 400.** O campo é opcional e só serve de chave de leitura pública; recusar o turno por causa dele faria a pergunta sobre exame falhar porque o AsyncStorage guardou lixo.
3. **Lista fechada de 27 UFs no backend**, em vez de importar `src/data/estadosBrasileiros.ts`: o backend não importa de `src/` (regra do repositório). São 27 siglas que não mudam.
4. **Campanhas pelo calendário (P1 = A)**, importado de `get-vaccination-campaigns/campaignCalendar.ts` por caminho relativo. Há precedente (o chat já importa de `extract-document-data/`) e o arquivo é puro. Não se cria pasta `-shared` (como no E7) porque nada é movido: a Lambda da tela continua importando do mesmo lugar. Cirurgia, não reforma.
5. **Data em São Paulo** com `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`, sem dependência nova, em `formatoPtBr.ts` (`dataEmSaoPaulo`): as duas ferramentas precisam dela ("hoje" das campanhas; `atualizadoEm` dos postos), e o arquivo já é o lugar de data em pt-BR sem importação. O E1 (data no contexto) pode reaproveitá-la.
6. **Aviso Norte com ou sem campanha ativa** (correção do CA-7 ao planejar): é justamente no "nenhuma ativa" que a resposta pode estar errada para o Norte.
7. **Porta pública com a chave fixada pela tabela.** O chamador diz *qual tabela* e o *valor*; o nome do atributo-chave vem de `TABELAS_PUBLICAS`. Assim não existe chamada que monte `Key: { owner: ... }` por ela. Tipo fechado (`TabelaPublica`) mais checagem em tempo de execução, provada por teste.
8. **Validade do cache numa constante compartilhada** (`validadeDoCache.ts`): `atualizadoEm = expiresAt − validade` só é exato se as duas pontas usam o mesmo número. Duas cópias divergiriam em silêncio (a data mostrada ficaria errada sem nenhum teste falhar). A Lambda da tela muda 2 linhas, sem mudar comportamento.
9. **Cache vencido = ausente**, igual à Lambda da tela (D8.2 = A, PRD 8.2). Mostrar lista vencida seria dizer "atualizada em" uma data mais antiga do que a tela aceita.
10. **Teto de 8 unidades**, ordem por bairro e nome. Sem coordenada não existe "mais perto"; uma ordem explicável é melhor que a ordem do CNES. Cada unidade são ~25 tokens; 8 cabem com folga e já são mais do que a pessoa lê numa resposta de chat. A saída diz `totalNaCidade` e `omitidas`, e o prompt manda dizer que a tela mostra as mais próximas.
11. **Filtro de bairro** por "contém", sem acento e sem caixa (`normalize('NFD')`, remove marcas, minúsculas, `trim`). Entrada de 1 a 60 caracteres. É a única forma útil de reduzir 400 unidades sem coordenada, e o dado já está no cache.
12. **`consultar_campanhas` é clínica, `consultar_postos` é operacional** (spec, seção 5): a pergunta real sobre campanha é "devo me vacinar?", e a resposta sai com o encaminhamento do app; uma lista de endereços com rodapé de "procure um profissional" seria ruído.
13. **D8.4: padrão da R3 antes do padrão de verbo de medicação.** "Tome a dose da vacina" já é reprovada hoje, mas pelo motivo "medicação"; o bilhete da nova geração precisa dizer o que corrigir (mesmo raciocínio do E7). Formas cobertas: obrigação + tomar/receber + vacina/dose/reforço; obrigação + "se vacinar"/"se imunizar"; imperativo "tome/receba a vacina", "vacine-se", "(que) você se vacine"; e "a vacina é segura para você". Exceção: recusa de julgar na mesma oração (`RECUSA_DE_JULGAR`). Frase de grupo ("quem tem 60 anos ou mais pode se vacinar") e registro ("você tomou a vacina em 2025") não são indicação e passam.
14. **App: a localização é lida no serviço** (`sendMessageWithSources`), não no hook nem na tela: é acesso a dado de runtime, que o repositório põe em `src/services`. Falha de leitura vira "sem `local`".

## 4a. Desvios do plano, registrados na implementação (2026-10-17)

1. **`contexto` é opcional no tipo de `run`** (`contexto?: ContextoDoTurno`, T2). O contrato da seção 3 o declarava obrigatório; isso quebrava o typecheck de 35 chamadas diretas a `run(input, identity)` em testes de ferramentas existentes. Editar todas seria reforma fora do épico. O despachante (`runTool`) sempre envia o contexto, e as duas ferramentas novas tratam a ausência como "sem cidade" (testado).
2. **`expiresAt` precisa ser finito** (T6). A guarda `typeof === 'number'` aceitava `NaN` e tratava o item como válido; achado ao escrever o teste, corrigido com `Number.isFinite` e caso próprio.
3. **O prompt manda repassar `avisoRegiao`** (T8). Não estava no plano; sem isso o aviso da região Norte podia ficar na saída da ferramenta e não chegar à pessoa. Custo: poucas palavras no prompt.
4. **Na região Norte, a gripe nacional sai da lista** (revisão). Antes só havia o aviso, e a campanha continuava listada como "ativa hoje" para quem mora no Norte. A abrangência virou **dado do calendário**: campo opcional `ufsForaDaJanela` em `CampanhaDefinicao` (`get-vaccination-campaigns/campaignCalendar.ts`), preenchido na influenza. Contraria o "nenhum byte" da seção 2 para essa pasta. É acréscimo só de dado, e a Lambda da tela não o lê nem muda de comportamento. O chat diverge da tela no Norte, de propósito.
5. **R3: trecho absolvido vale para todos os padrões** (revisão). `verificarR3` passou a juntar os achados de todos os padrões e a ignorar os que caem dentro de um trecho que a exceção de outro padrão absolveu. A prioridade do motivo continua pela ordem da lista. Isso substituiu um remendo no padrão de medicação, que não cobria "as 2 doses da vacina" (pego pelo padrão de quantidade). É uma mudança no mecanismo compartilhado com o E7, e todos os testes anteriores das regras continuam verdes.
6. **R3 de vacina ampliada** (revisão): mais formas de indicação (imperativo com advérbio, "faça a vacina", "precisa da vacina", "é importante você se vacinar", "vacinem-se", "indicada/recomendada para você", contraindicação). A exceção nova (`RECUSA_PERGUNTA_OU_CONDICAO`) absolve "pergunte ao médico se…", "quem decide se…" e "se você deve…, quem informa é…". "Então" e "portanto" passaram a quebrar a oração da recusa. "Dose" só conta como vacina quando a frase diz "da vacina" ou "de reforço".
7. **Postos** (revisão):
   - `expiresAt` além da validade é tratado como ausente;
   - o bairro tem os espaços colapsados, e um acento solto vira "sem filtro";
   - entradas do payload que não são objeto são ignoradas;
   - o modo degradado leva a observação e a contagem do que ficou de fora;
   - o filtro roda antes da ordenação;
   - `Intl.Collator` e o formatador de data são criados uma vez.
8. **App:** a sessão e a cidade são lidas em paralelo, e o código numérico é enviado como texto.

## 5. Alternativas descartadas

- **Pôr `local` em `ChatIdentity`:** mistura dado do cliente com dado do token, exatamente o que `auth.ts` existe para separar.
- **Deixar o modelo passar `codigoMunicipio` na entrada:** o modelo inventaria código; e a chave de leitura passaria a vir do texto.
- **Ler o cache de campanhas:** descartado pela P1.
- **Mostrar lista vencida com aviso:** contraria D8.2/PRD e o comportamento da tela.
- **Calcular distância com coordenada:** fora de escopo (D8.1 = A manda cidade, não coordenada).

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Mudar a assinatura de `runTool` quebra testes que afirmam os argumentos exatos | O teste de `conversationLoop` que afirma `toHaveBeenCalledWith(nome, {}, identity)` passa a incluir `{ local: null }`: é mudança de contrato, registrada aqui, não afrouxamento. |
| `tools.test.ts` deixa de cobrir as ferramentas públicas | Lista fechada `FERRAMENTAS_PUBLICAS` no teste, com afirmação própria (só `GetItem` na tabela pública, nunca Scan nem dono) e um teste de que toda ferramenta fora dela continua lendo pelo dono. Ferramenta nova que não leia por dono e não esteja na lista falha o teste. |
| Regex nova da R3 com falso positivo em resposta de `consultar_vacinas` | Testes dos dois lados (seção 4, item 13; CA-21), e os testes antigos das regras continuam verdes. Custo da regex medido como no E7. |
| Cidade enviada em todo turno (LGPD) | Não vai a log, não vai ao modelo, não é gravada (CA-16). A copy da tela fica como pendência da Parte 2. |
| Calendário só de 2026 | Fora de escopo (spec, seção 7). Em 2027 a ferramenta dirá "nenhuma ativa", igual à tela. Registrado no README do épico ao fechar. |
| Item do cache com milhares de unidades | Corte em memória; o GetItem tem no máximo 400 KB por item no DynamoDB, então o pior caso é limitado pela própria tabela. |

## 7. Impacto em desempenho e custo

- Campanhas: zero I/O, saída de 2 a 3 itens (~100 tokens).
- Postos: 1 `GetItem` (≤ 400 KB), corte em memória; saída de até 8 unidades (~250 tokens). Nenhum Scan novo.
- Prompt de sistema: +1 bullet (~120 tokens) em todo turno. Descrições das duas ferramentas: ~90 tokens em todo turno (vão no `toolConfig`).
- Pedido do app: +1 leitura do AsyncStorage por pergunta (microssegundos) e ~50 bytes no corpo.

## 8. Constituição

- Regra 3: nenhuma biblioteca nova (`Intl`, `GetCommand` já instalado).
- Regra 4: sem indicação individual de vacina (D8.4), sem promessa operacional; campanhas com encaminhamento.
- Regra 5 e RT7: sem schema novo; pedido sem `local` funciona como hoje; Lambdas da tela com comportamento igual.
- Regra 8: ambiguidades registradas (calendário só de 2026, Norte, UBS ≠ sala de vacina, "hoje" em UTC na Lambda da tela) e tratadas por aviso ou observação, sem travar.
