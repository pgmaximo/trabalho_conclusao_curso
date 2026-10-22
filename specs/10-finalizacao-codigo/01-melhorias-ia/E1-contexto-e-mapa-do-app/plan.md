# PLAN: E1 — Data de hoje e mapa do app

Estado: **aprovado em 2026-10-18; desvios da execução e da revisão na seção 8; épico concluído em 2026-10-19** · Data: 2026-10-18 · Spec: [`spec.md`](./spec.md) (aprovada em 2026-10-18) · Passo a passo: `docs/superpowers/plans/2026-10-18-e1-contexto-e-mapa.md`

## 1. Resumo do desenho

Quatro mudanças, cada uma no lugar que já cuida do assunto:

1. **O relógio de Brasília vira texto num lugar só.** `formatoPtBr.ts` já tem `dataEmSaoPaulo`. Ganha `momentoEmSaoPaulo` ("AAAA-MM-DDTHH:mm", o formato em que a Agenda grava `scheduledAt`), e `consultar_consultas` passa a cortar futuras e passadas por ele (achado A1). Um módulo novo e puro, `contextoDeHoje.ts`, monta a frase do bloco de data.
2. **A data entra como segundo bloco de `system` (D1.1).** `TurnInput` ganha `contextoDeHoje?: string`. `chamar` manda `[{ text: prompt }, { text: contextoDeHoje }]` quando ele existe, e o bloco único de hoje quando não existe. `responder` (`verificacao.ts`) lê o relógio **uma vez** e põe o texto na `entrada`. A segunda geração usa a mesma `entrada`, então vê o mesmo bloco sem código novo.
3. **O mapa é dado, não texto solto (D1.3).** `mapaDoApp.ts` guarda a lista de telas (rota, nome, apelidos, caminho em passos, o que faz) e exporta o texto que vai ao prompt. A rota fica no dado só para o teste: ela nunca entra no texto. O teste lê `src/app`, `src/constants/navigation.ts` e os arquivos das telas para provar que rota, rótulo e botão existem.
4. **O prompt fixo ganha duas instruções:** como usar a data (incluindo a regra de tempo decorrido da P1) e o mapa com a regra "não invente tela". Nada no prompt depende do relógio.

## 2. Arquivos

| Arquivo | Muda o quê |
|---|---|
| `amplify/functions/chat-assistant/formatoPtBr.ts` | + `momentoEmSaoPaulo(instante)` |
| `amplify/functions/chat-assistant/tools/consultas.ts` | corte por `momentoEmSaoPaulo(new Date())`, com regra para `scheduledAt` só de data |
| `amplify/functions/chat-assistant/contextoDeHoje.ts` | **novo**, `montarContextoDeHoje(instante)` |
| `amplify/functions/chat-assistant/conversationLoop.ts` | `TurnInput.contextoDeHoje?`; `system` com dois blocos quando presente |
| `amplify/functions/chat-assistant/verificacao.ts` | `responder` monta `contextoDeHoje` com `new Date()` uma vez |
| `amplify/functions/chat-assistant/mapaDoApp.ts` | **novo**, `MAPA_DO_APP` e `MAPA_DO_APP_PROMPT` |
| `amplify/functions/chat-assistant/chatPrompt.ts` | duas instruções novas e o mapa |
| testes | novos: `consultasTool.test.ts`, `contextoDeHoje.test.ts`, `mapaDoApp.test.ts`; acréscimos em `formatoPtBr.test.ts`, `conversationLoop.test.ts`, `verificacao.test.ts`, `chatPrompt.test.ts`, `ai-language-rules/__tests__/adversarial.test.ts` |

**Não muda:** schema, `amplify/backend.ts`, `chatSchema.ts`, `handler.ts`, cliente, telas.

## 3. Contratos

```ts
// formatoPtBr.ts (continua sem importar nada)
export function momentoEmSaoPaulo(instante: Date): string; // "2026-10-17T22:30"

// contextoDeHoje.ts (não importa nada)
export const FUSO_DO_APP = 'America/Sao_Paulo';
export function montarContextoDeHoje(instante: Date): string;
// 2026-10-18T01:30Z -> "Data e hora deste turno, informadas pelo aplicativo: hoje é sábado, 17/10/2026, e agora são 22h30 no horário de Brasília."

// conversationLoop.ts
export type TurnInput = { /* ...campos atuais... */ contextoDeHoje?: string };

// mapaDoApp.ts
export type TelaDoMapa = {
  rota: string;            // nome do arquivo em src/app ou src/app/(app), sem extensão; só para o teste
  nome: string;            // como o app mostra
  apelidos?: string[];     // nomes que os textos do chat já usam ("Medicamentos")
  caminho: string[];       // passos; o 1º é aba da barra, o 2º (se o 1º for "Mais") é item do menu Mais
  oQueFaz: string;         // uma linha
};
export const MAPA_DO_APP: readonly TelaDoMapa[];
export const MAPA_DO_APP_PROMPT: string; // uma linha por tela: `${nome}${apelidos}: ${caminho.join(' > ')}. ${oQueFaz}`
```

**Passos de caminho** são de três tipos, e o teste classifica cada um: aba da barra (`APP_TABS`), item do menu Mais (`MORE_MENU_ITEMS`) ou botão (texto conferido no arquivo da tela, por uma tabela que fica **no teste**). Gesto ("tocar no remédio") começa com "tocar" e não é conferido.

**O mapa (21 telas):** dashboard, exams, add-exam, document-detail, analyte-series, ai, medicines, add-medicine, edit-medicine, more, appointments, add-appointment, edit-appointment, prevention, vaccination, add-vaccine, health-data, import-health-data, assistant-memory, profile, edit-profile (as de edição e detalhe com passo "tocar…"). **Fora, com motivo no teste:** `index`, `register`, `confirm`, `forgot-password`, `profile-setup` (antes do login), `dev-preview` (só desenvolvimento).

**Botões e onde estão** (tabela do teste): "Adicionar documento" → `src/screens/ExamsScreen.tsx`; "Evolução" → `src/components/AnalyteSeriesEntry.tsx`; "Histórico de conversas" → `src/screens/ChatBotScreen.tsx`; "Adicionar medicamento" → `src/screens/MedicinesScreen.tsx`; "Novo compromisso" → `src/screens/AgendaScreen.tsx`; "Adicionar vacina" → `src/screens/VaccinationScreen.tsx`; "Importar" → `src/screens/HealthDashboardScreen.tsx`; "Editar perfil" → `src/screens/ProfileScreen.tsx`.

**Corte de consultas:** `quando` com hora ("…THH:mm") é futura se `quando >= agora`. `quando` só com data ("AAAA-MM-DD") é futura se `quando >= agora.slice(0, 10)`, ou seja, uma consulta de hoje sem hora conta como futura. Antes, ela saía como passada.

## 4. Alternativas descartadas

- **Instante passado às ferramentas pelo `ContextoDoTurno`:** daria um relógio só por turno, mas mexe na assinatura de `run` de todas as ferramentas, e a diferença é de milissegundos. Fora de escopo (spec §7).
- **Mapa como string literal no prompt:** o teste teria de extrair rota e rótulo de um texto livre. Como dado, o teste lê campos.
- **Ler `APP_TABS` em tempo de execução para montar o mapa:** a Lambda não importa de `src/` (`formatoPtBr.ts` já registra isso). O teste importa, e é ele que garante a igualdade.
- **Tabela de botões dentro de `mapaDoApp.ts`:** poria caminho de arquivo do app no código da Lambda. Fica no teste, que é o único que precisa dela.
- **`Intl` com `pt-BR` para o dia da semana:** depende do ICU do runtime. Uma lista fixa dos 7 nomes, indexada pelo dia que o `Intl` devolve em `en-US` (`weekday: 'short'`), elimina essa dependência. O teste fixa os 7 dias.

## 5. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| O modelo ignora o bloco e calcula "hoje" de cabeça | Instrução explícita no prompt (CA-8); conferência das 5 perguntas no sandbox (spec §8) |
| Falso positivo da R3 em resposta com data ou hora ("às 9h", "há 7 meses") | CA-10 e CA-19 em `adversarial.test.ts`. Se reprovar, **parar e reportar**: a regra não é afrouxada sem decisão |
| Mapa desatualiza com tela nova | CA-12 reprova tela sem entrada; CA-13 reprova rótulo trocado; CA-14 reprova botão renomeado |
| `jest.useFakeTimers` em `verificacao.test.ts` atrapalhar promessas | relógio falso só de `Date`: `jest.useFakeTimers({ now, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout'] })`, e `useRealTimers` no `afterEach` |
| Prompt cresce | teto de 1.800 caracteres no mapa (CA-18) |

## 6. Desempenho e custo

- Por turno: ~30 tokens de data e até ~450 do mapa, mais ~120 das duas instruções novas. Nenhuma leitura de banco nova, nenhuma chamada externa.
- O bloco 0 só muda com a memória da pessoa, e a data, que muda a cada turno, vem depois dele: se um dia entrar `cachePoint`, ele vai entre os dois blocos (cache por pessoa). *(Corrigido na revisão: a versão anterior dizia que o bloco 0 era constante.)*

## 7. Decisões da constituição

- **Regra 3 (stack):** nenhuma dependência nova; `Intl` é global.
- **Regra 5 (nada quebra):** sem `contextoDeHoje`, `system` sai byte a byte como hoje (CA-4); a saída de `consultar_consultas` mantém a forma. Nenhum schema muda.
- **Regra 8 (ambiguidade documentada):** a P1 nasceu na spec e está registrada em `decisoes/E1-…md`; o achado A1 está na spec §2.

## 8. O que mudou na execução e na revisão (2026-10-18)

**Na execução**
- O mapa saiu com 1.884 caracteres e foi encurtado no texto, não no teto.
- `FUSO_DO_APP` ficou interno ao `contextoDeHoje.ts` (revisto abaixo).

**Na revisão** (revisor independente e `/code-review`, os dois com o mesmo achado principal)
- **Botões de ícone:** passo "botão + (nome)"; a tabela de botões do teste ganhou o tipo (`icone` ou `texto`), e o de texto exige `<Text>` visível. O teste anterior passava porque achava o nome no `accessibilityLabel`.
- **Histórico de conversas** no "o que faz" do Assistente, com teste que confere o ícone de relógio na tela.
- **Fuso e formatador:** `FUSO_DO_APP` exportado e `partesEmSaoPaulo` em `formatoPtBr.ts`; `momentoEmSaoPaulo` e `montarContextoDeHoje` montam a partir das partes; o literal do fuso aparece uma vez (teste).
- **Corte de consultas:** a regra para registro só com data (§3) foi removida; ele vale 00h00, como `parseScheduledAt` da Agenda.
- **Prompt:** o bloco de data é apontado pelo começo dele; "menos de um mês, só a data"; "botão +" explicado.
- **Mantido, com motivo:** a ferramenta de consultas continua com o próprio relógio, e não com o instante do turno (spec §7). A janela de desacordo é de segundos, e só pesa para a consulta marcada exatamente naquele minuto.
