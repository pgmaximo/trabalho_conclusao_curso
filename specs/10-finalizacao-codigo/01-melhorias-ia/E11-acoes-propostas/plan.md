# PLAN: E11 — Ações propostas pela IA e confirmadas pelo usuário

Estado: **aprovado em 2026-10-20; executado, com os desvios da seção 9** · Data: 2026-10-20 · Spec: [`spec.md`](./spec.md) · Passo a passo: `docs/superpowers/plans/2026-10-20-e11-acoes-propostas.md`

## 1. Resumo do desenho

A proposta de ação segue o caminho da memória (D34), com uma peça a mais no meio:

```
modelo -> campo `acao` (bruto: textos e expressões copiados da fala)
       -> validarAcao (Lambda, puro): fala da pessoa + data de hoje
            -> campos conferidos e resolvidos (AAAA-MM-DD, hh:mm)
       -> verificacao.ts: só em resposta aprovada; ação vence memória
       -> app: lerAcaoProposta (forma) -> cartão -> "Abrir formulário"
       -> rota com parâmetros -> lerAcaoProposta de novo -> formulário preenchido
       -> a pessoa toca em Salvar (gravação de sempre)
```

Nenhuma ferramenta, leitura, permissão ou tabela nova.

## 2. Arquivos

**Nascem**
- `amplify/functions/acoes-propostas-shared/camposDaAcao.ts` — o contrato da ação já resolvida, os limites, a conferência de forma e a conversão de/para parâmetros de rota. **Não importa nada** (lido pela Lambda e pelo app).
- `amplify/functions/chat-assistant/acoes/expressaoDeData.ts` — a gramática fechada de data e hora (D11.4). Puro.
- `amplify/functions/chat-assistant/acoes/acaoValida.ts` — da proposta bruta à ação conferida: campo na fala da pessoa, corte do nome do remédio, resolução de data e hora. Puro.
- `amplify/functions/chat-assistant/tools/nomeSemPosologia.ts` — o corte do nome antes do primeiro número, tirado de `receitasSaida.ts` (que importa o SDK) para o validador usar a **mesma** regra sem carregar a AWS.
- `src/components/ActionProposalCard.tsx` — o cartão.
- Testes: `acoes-propostas-shared/__tests__/camposDaAcao.test.ts`; `chat-assistant/__tests__/expressaoDeData.test.ts`, `acaoValida.test.ts`, `acaoNoEnvelope.test.ts`, `acaoNaVerificacao.test.ts`, `nomeSemPosologia.test.ts`; `__tests__/cartaoDeAcao.test.tsx`, `__tests__/acaoNoChat.test.tsx`, `__tests__/formularioPreenchido.test.tsx`.

**Mudam**
- `chat-assistant/chatSchema.ts` (campo `acao`), `types.ts` (`acaoProposta`), `conversationLoop.ts` (só o tipo `TurnInput` ganha `hoje?`), `verificacao.ts` (`acaoAceitavel`, `hoje` no `responder`), `chatPrompt.ts`, `tools/receitasSaida.ts` (importa o corte).
- `ai-language-rules/languageRules.ts` (verificador de ação concluída, R5) e `__tests__/adversarial.test.ts`.
- `src/services/aiAssistantService.ts`, `src/hooks/useChatBot.ts`, `src/screens/ChatBotScreen.tsx`, `src/app/add-appointment.tsx`, `src/app/add-medicine.tsx`, `src/screens/AddAppointmentScreen.tsx`, `src/screens/AddMedicineScreen.tsx`.
- Ampliados: `chatPrompt.test.ts`, `__tests__/aiAssistantService.test.ts`.

**Não mudam:** `tools/index.ts`, `ownerScopedRead.ts`, `backend.ts`, schema, `appointmentService.ts`, `medicineService.ts`, `MemoryProposalCard.tsx`, `memoria/*`.

## 3. Contratos

### 3.1 Módulo compartilhado (`camposDaAcao.ts`)

```ts
export const TIPOS_DE_ACAO = ['ABRIR_NOVO_AGENDAMENTO', 'ABRIR_NOVO_LEMBRETE'] as const;
export type TipoDeAcao = (typeof TIPOS_DE_ACAO)[number];
export const TIPOS_DE_COMPROMISSO = ['CONSULTA', 'EXAME', 'CIRURGIA'] as const;

export const MAX_NOME = 80;            // nome do compromisso e do remédio
export const MAX_PROFISSIONAL = 80;
export const MAX_ENDERECO = 120;
export const MAX_HORARIOS = 4;
export const MIN_CARACTERES_CAMPO = 2; // depois de normalizar: "a" não é nome

export type CamposDeAgendamento = {
  appointmentName?: string; professionalName?: string; address?: string;
  appointmentType?: (typeof TIPOS_DE_COMPROMISSO)[number];
  scheduledDate?: string;  // AAAA-MM-DD
  scheduledTime?: string;  // hh:mm
};
export type CamposDeLembrete = { name?: string; times?: string[] };  // times: hh:mm, sem repetir

export type AcaoProposta =
  | { tipo: 'ABRIR_NOVO_AGENDAMENTO'; campos: CamposDeAgendamento }
  | { tipo: 'ABRIR_NOVO_LEMBRETE'; campos: CamposDeLembrete };

export function dataIsoValida(valor: string): boolean;   // existe no calendário
export function horaValida(valor: string): boolean;      // ^([01]\d|2[0-3]):[0-5]\d$
/** Confere a FORMA e descarta campo a campo; undefined se o tipo for inválido
 *  ou nenhum campo sobrar. Aceita `times` como lista ou texto "08:00,20:00"
 *  (parâmetro de rota). */
export function lerAcaoProposta(bruto: unknown): AcaoProposta | undefined;
export function paramsDaAcao(acao: AcaoProposta): Record<string, string>;  // times -> "08:00,20:00"
export function rotaDaAcao(tipo: TipoDeAcao): '/add-appointment' | '/add-medicine';
/** "2026-10-30" -> "sexta-feira, 30/10/2026", com getUTCDay (não depende do fuso). */
export function dataPorExtenso(iso: string): string;
```

`lerAcaoProposta` é a conferência usada **nos três lugares**: na saída da Lambda (depois de `validarAcao`), na resposta recebida pelo app e nos parâmetros da rota.

### 3.2 Gramática (`expressaoDeData.ts`)

```ts
/** `hoje` em AAAA-MM-DD (São Paulo). Devolve AAAA-MM-DD ou null (fora da
 *  gramática, data inexistente, ou antes de hoje). */
export function resolverData(expressao: string, hoje: string): string | null;
/** Devolve hh:mm ou null. */
export function resolverHora(expressao: string): string | null;
```

Regras (spec, seção 4): hoje / amanhã / depois de amanhã; dia da semana (com ou sem "-feira", com ou sem acento) = o próximo **depois** de hoje; "dia N" = o próximo dia N a partir de hoje, incluindo hoje (mês sem dia N é pulado: "dia 31" em novembro vai para 31/12); `dd/mm` = este ano, ou o próximo se já passou; `dd/mm/aaaa` = aquela data. Hora: `14h`, `14h30`, `14:30`, `às 8`, `8 da manhã`, `2 da tarde` (+12), `8 da noite` (+12; `12 da noite` = 00:00). O texto é normalizado com `semAcento` antes. A expressão inteira tem de casar (âncoras `^...$`), para "sexta de manhã" não virar uma hora.

### 3.3 Proposta bruta e validação (`chatSchema.ts`, `acaoValida.ts`)

```ts
// chatSchema.ts — o que o MODELO manda
export const acaoSchema = z.object({
  tipo: z.enum(TIPOS_DE_ACAO),
  nome: z.string().optional(),
  profissional: z.string().optional(),
  endereco: z.string().optional(),
  tipoDeCompromisso: z.enum(TIPOS_DE_COMPROMISSO).optional(),
  quando: z.string().optional(),       // a expressão de data, copiada da fala
  hora: z.string().optional(),         // a expressão de hora
  horarios: z.array(z.string()).optional(),  // lembrete
}).strict();
// chatAnswerSchema ganha: acao: acaoSchema.optional()
export type AcaoBruta = z.infer<typeof acaoSchema>;
```

**Sem `max` no schema, de propósito:** uma proposta longa demais reprovaria o PARSE da resposta inteira, e a falha de parse vai para o caminho degradado (o mesmo motivo do comentário de `chatSchema.ts` sobre a R4). Os limites são aplicados em `validarAcao`, que descarta o campo.

```ts
// acaoValida.ts
export type ContextoDaAcao = { falasDaPessoa: string[]; hoje: string };
export function validarAcao(bruta: AcaoBruta, contexto: ContextoDaAcao): AcaoProposta | undefined;
```

- Campo de texto passa se `semAcento(campo)` não for vazio, couber no limite e for **substring** de `semAcento(fala)` para alguma fala. Senão, some.
- `quando`, `hora` e cada item de `horarios` também precisam estar na fala, e então são resolvidos.
- `tipoDeCompromisso`: `EXAME` exige "exame" na fala, `CIRURGIA` exige "cirurgia"; `CONSULTA` ou ausente não entra (o formulário já marca Consulta).
- `nome` do lembrete passa por `nomeSemPosologia` depois da conferência.
- Campos do outro tipo (ex.: `horarios` num agendamento) são ignorados.
- O resultado passa por `lerAcaoProposta` (forma + "sobrou algum campo").

`falasDaPessoa` = `[entrada.message, ...entrada.history.filter(m => m.role === 'user').map(m => m.content)]`. Anexo, respostas e saídas de ferramenta nunca entram.

### 3.4 Verificação e resultado

```ts
// conversationLoop.ts, TurnInput
hoje?: string;  // AAAA-MM-DD em São Paulo, lido no MESMO instante do contextoDeHoje
// verificacao.ts
RespostaVerificada.acaoProposta?: AcaoProposta;
function acaoAceitavel(acao: AcaoBruta | undefined, entrada: TurnInput): AcaoProposta | undefined;
// em `aprovada`: acaoProposta = acaoAceitavel(...); memoriaProposta = acaoProposta ? undefined : propostaAceitavel(...)
// types.ts
ChatTurnResult.acaoProposta?: AcaoProposta;
```

Sem `hoje`, `acaoAceitavel` devolve `undefined` (fecha, não chuta a data).

### 3.5 Regra de linguagem (R5, sempre ligada)

Novo verificador em `languageRules.ts`, `verificarAcaoConcluida`, regra `R5`:
- barra `agendei` e `cadastrei` sozinhos;
- barra `marquei|salvei|registrei|criei|anotei|adicionei|inclu[ií]` com, até 40 caracteres depois, `consulta|retorno|compromisso|exame|cirurgia|lembrete|rem[eé]dio|medicamento|agenda|alarme|hor[aá]rio`;
- **não** barra se `n[aã]o` vier imediatamente antes do verbo ("não marquei nada");
- motivo: `'A resposta diz que o assistente fez um cadastro, e ele não faz. Diga que o formulário está pronto para a pessoa conferir e salvar.'`

### 3.6 App

```ts
// aiAssistantService.ts
AssistantReply.acaoProposta?: AcaoProposta;  // = lerAcaoProposta(corpo.acaoProposta)
// useChatBot.ts
export type AcaoNaTela = { acao: AcaoProposta; depoisDaMensagem: string };
propostaDeAcao: AcaoNaTela | null;
abrirAcao: (acao: AcaoProposta) => void;   // router.push({ pathname: rotaDaAcao(tipo), params: paramsDaAcao(acao) }); some o cartão
recusarAcao: () => void;                   // anota JSON.stringify(acao) nas recusadas da conversa
// ActionProposalCard.tsx
props: { acao: AcaoProposta; onAbrir: (acao: AcaoProposta) => void; onRecusar: () => void }
// AddAppointmentScreen / AddMedicineScreen
props: { inicial?: CamposDeAgendamento } / { inicial?: CamposDeLembrete }
// rotas: const acao = lerAcaoProposta({ tipo, campos: useLocalSearchParams() })
```

Textos fixos:
- Cartão: título `Novo compromisso` / `Novo lembrete de remédio`; linhas `Nome`, `Profissional`, `Endereço`, `Tipo` (só se não for Consulta), `Data` (por extenso), `Hora`, `Horários`; quando falta data ou hora no compromisso, `Data e hora você escolhe no formulário.` (ou só a que falta); no lembrete, sempre `Dose, frequência e estoque você completa no formulário.`; aviso `Nada foi salvo ainda.`; botões `Abrir formulário` e `Agora não`, do mesmo tamanho.
- Formulário, quando `inicial` tem algum campo: `Alguns campos já vêm preenchidos. Confira antes de salvar.` (desvio da spec, seção 9).

## 4. Onde cada responsabilidade mora, e por quê

- **Forma e limites no módulo compartilhado sem importação:** a Lambda, o serviço do app e as rotas precisam recusar exatamente as mesmas coisas. É o desenho de `memoria/regras.ts` e de `medicine-schedule-shared`.
- **Gramática e validação na Lambda, não no app:** dependem da fala da pessoa e da data de hoje do turno, que só a Lambda tem juntas. O app recebe a ação já resolvida e só confere a forma.
- **Conferência contra a fala no código, não no prompt:** é o que transforma "use só o que a pessoa disse" em garantia (spec, CA-3).
- **A regra de "já fiz" em `languageRules.ts`:** é onde moram as verificações de saída, com a regeneração D31 já pronta; ela vale com ou sem cartão (o modelo já podia dizer "agendei" antes do E11).
- **`nomeSemPosologia` extraído:** a regra do E4 é a certa e não pode ter duas cópias; o arquivo dela importa o SDK, e o validador precisa ser puro e testável sem simular a AWS.

## 5. Alternativas descartadas

- **Union discriminada no schema do modelo:** a conversão para o Bedrock (`toStructuredOutputSchema`) e o modo estruturado lidam mal com `oneOf`; um objeto plano com `tipo` e campos opcionais é o que a memória já usa.
- **Limites (`max`) no schema do modelo:** derrubariam a resposta inteira (seção 3.3).
- **Parâmetro `origem=assistente` na rota para mostrar "preenchido pelo assistente":** qualquer link externo poderia mandá-lo; a frase neutra serve aos dois casos.
- **O app resolver a data:** o app não tem a fala da pessoa conferida nem o "hoje" do turno; seriam duas regras de data.

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Modelo escreve o nome com palavras dele ("Retorno com a Dra. Ana") e a conferência descarta | Prompt manda copiar as palavras exatas; normalização tira caixa, acento e pontuação; campo descartado vira vazio, não erro. Medir na conferência do sandbox. |
| Substring curta demais passa por acaso (nome "a") | Mínimo de 2 caracteres depois da normalização. |
| Verificador de "já fiz" pega frase honesta já aprovada hoje | Corpus de passa no `adversarial.test.ts`; a suíte inteira de linguagem tem de continuar verde. |
| Link externo com parâmetros forjados | `lerAcaoProposta` na rota; nada é gravado sem Salvar; frase neutra no formulário. |
| Proposta repetida a cada turno depois da recusa | Recusadas por conversa no hook, como a memória. |
| Data por extenso errada por fuso | `dataPorExtenso` usa `Date.UTC`/`getUTCDay`; teste roda em `America/Sao_Paulo`. |

## 7. Desempenho e custo

- Esquema de saída: um objeto opcional com oito campos (estimado em menos de 150 tokens por turno no `output_config`).
- Prompt: um parágrafo. Estimado em 250 tokens no planejamento; o texto final tem ~1.500 caracteres (~400 tokens por turno), porque lista os sete campos e as proibições (ver seção 9).
- Nenhuma chamada de rede, leitura ou iteração a mais. `validarAcao` é linear no tamanho das falas (histórico já cortado pela C4).

## 8. Decisões exigidas pela constituição

- **Regra 3 (stack):** nenhuma dependência nova.
- **Regra 5 (nada quebra):** sem mudança de schema; resposta sem `acao` idêntica à de hoje; formulários sem parâmetro idênticos aos de hoje (CA-13).
- **Regras 1 e 8 (design):** o Canvas não tem o cartão; ele segue o `MemoryProposalCard` (registrado na spec, seção 5).

## 9. Desvios em relação à spec, na execução e na revisão

- **Frase do formulário (CA-13 e H2):** a spec dizia "Preenchido pelo assistente. Confira antes de salvar.". No planejamento, ficou claro que um link externo (H14) com parâmetros válidos mostraria a mesma frase e atribuiria ao assistente o que ele não escreveu. Passa a ser **"Alguns campos já vêm preenchidos. Confira antes de salvar."** A spec foi atualizada.

**Na execução (2026-10-20):**
- **Prompt maior que o estimado:** ~400 tokens por turno, e não 250 (seção 7).
- **O aviso do formulário virou componente** (`src/components/AvisoDeCamposPreenchidos.tsx`), e não constante de uma tela: as duas telas usam estilos diferentes, e o componente dá uma cópia só da frase e do estilo.
- **Três prévias novas** em `src/app/dev-preview.tsx` (`add-appointment-preenchido`, `add-medicine-preenchido`, `action-proposal-card`), só em `__DEV__`, para os screenshots.

**Na revisão (2026-10-20), cinco correções** (detalhe em `spec.md`, seção 8):
- **Nasce `acoes/fraseDaAcao.ts`:** a frase de que o formulário está pronto é do aplicativo e só entra quando a ação sobrevive (`aprovada`, em `verificacao.ts`). O prompt passa a mandar o modelo não falar do formulário e dizer o caminho no app.
- **R5:** `inclu[ií]` virou `incluí`.
- **`useChatBot.ts`:** `esquecerAcao()` em toda troca de conversa.
- **`camposDaAcao.ts`:** `nomeSemDose` corta o nome do lembrete na primeira palavra que começa com dígito ou é palavra de dose. Fica no módulo compartilhado porque o link também traz o nome.
- **`acaoValida.ts`:** `ContextoDaAcao` ganha `falaDoTurno`; data e hora só saem dela.

**Menores da revisão, corrigidos a pedido do usuário (2026-10-20):**
- Nasce `chat-assistant/janelaDoHistorico.ts` (`HISTORY_WINDOW`, reexportado por `conversationLoop.ts`): a verificação usa a mesma janela que o laço, sem importar o laço (os testes da verificação o substituem inteiro).
- `chatSchema.ts`: `acao: acaoSchema.optional().catch(undefined)`; o esquema do Bedrock não muda.
- `expressaoDeData.ts`: `comPeriodo` devolve `null` quando o período contradiz a hora.
- `acaoValida.ts`: `tipoDito` olha o nome conferido, ou a mensagem do turno sem nome.
- `camposDaAcao.ts`: `PALAVRAS_VAZIAS`; campo feito só delas some.
- `languageRules.ts`: opção `comAcaoProposta` e o verificador `verificarPassivaDeCadastro` (R5); `verificacao.ts` passa a opção nas duas gerações.
- `ActionProposalCard.tsx`: trava de toque duplo (`useRef`); `useChatBot.ts`: o envio que falha limpa o cartão.
