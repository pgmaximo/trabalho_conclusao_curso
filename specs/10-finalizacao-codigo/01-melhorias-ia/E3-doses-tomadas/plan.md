# PLAN: E3 — Adesão: doses tomadas

Estado: **aprovado em 2026-10-19; implementado, revisado e concluído em 2026-10-19 (ver §9)** · Data: 2026-10-19 · Spec: [`spec.md`](./spec.md) · Tarefas: [`tasks.md`](./tasks.md) · Passo a passo: `docs/superpowers/plans/2026-10-19-e3-doses-tomadas.md`

## 1. Resumo do desenho

Uma ferramenta nova, `consultar_doses_tomadas`, com a forma que os épicos anteriores fixaram. A ferramenta é uma casca fina que lê e orquestra. A saída é montada por um módulo puro, testado com números. A regra que diz quais horários eram esperados num dia deixa de existir só no app: vai para um módulo compartilhado em `amplify/functions/`, e o app passa a reexportá-la (mesmo desenho do E9). Assim tela e chat contam os mesmos horários. A leitura do histórico entra numa porta nova de `ownerScopedRead.ts` que consulta o índice e monta o filtro de dono por dentro (D3.2). A verificação de linguagem ganha três padrões que só reprovam (D3.4) e uma palavra a mais no inventário do app. O prompt troca a frase "não vejo as doses marcadas" pelas instruções da ferramenta nova.

## 2. Arquivos

| Arquivo | Muda | O quê |
|---|---|---|
| `amplify/functions/medicine-schedule-shared/doseSchedule.ts` | **nasce** | `isMedicineScheduledOnDate`, `getMedicineDoseTimesForDate`, `minutesFromTime`, `LATE_DOSE_TOLERANCE_MINUTES`, sobre um tipo estrutural mínimo. Dia da semana em UTC. |
| `amplify/functions/medicine-schedule-shared/__tests__/moduloCompartilhado.test.ts` | **nasce** | Não importa nada do app; o app reexporta os mesmos objetos; dia da semana sem depender do fuso. |
| `src/utils/medicineSchedule.ts` | muda | Reexporta as quatro; mantém `getLocalIsoDate` e `isDoseLate` (relógio do aparelho). |
| `amplify/functions/chat-assistant/tools/ownerScopedRead.ts` | muda | `INDICES_DO_DONO` (lista fechada) e `lerDoDonoPorIndice`. |
| `amplify/functions/chat-assistant/tools/dosesTomadasSaida.ts` | **nasce** | Puro: período, escolha dos remédios, situação de cada horário, contagens, tetos, saída. |
| `amplify/functions/chat-assistant/tools/dosesTomadas.ts` | **nasce** | O `ChatTool`: entrada, leituras em paralelo, `renderDegraded`. |
| `amplify/functions/chat-assistant/tools/index.ts` | muda | Registro logo depois de `medicamentosTool`. |
| `amplify/functions/chat-assistant/chatPrompt.ts` | muda | Troca a última frase do item de medicamentos e acrescenta um item da ferramenta nova. |
| `amplify/backend.ts` | muda | `MedicineDoseLog` no laço de `grantReadData`, `MEDICINE_DOSE_LOG_TABLE_NAME`, política só de `dynamodb:Query` em `<tabela>/index/*`. |
| `amplify/functions/ai-language-rules/languageRules.ts` | muda | Três padrões da R3 (D3.4); `horário` e `marcação` em `COISAS_DO_APLICATIVO`. |
| Testes do chat | nascem/mudam | `dosesTomadasSaida.test.ts`, `dosesTomadasTool.test.ts`, `leituraPorIndice.test.ts`, `infraDoses.test.ts` (nascem); `tools.test.ts`, `chatPrompt.test.ts` (mudam). |
| `ai-language-rules/__tests__/adversarial.test.ts` | muda | Um `describe` do E3, com os dois lados. |

**Não mudam:** schema, telas, `useMedicinesData.ts`, Lambda de lembretes, `medicamentos.ts` e `medicamentosSaida.ts`, `__tests__/medicine-schedule.test.ts`.

## 3. Contratos

**Módulo compartilhado** (`doseSchedule.ts`)

```ts
export type RemedioComAgenda = {
  active?: boolean | null;
  startDate: string;                 // AAAA-MM-DD
  endDate?: string | null;
  frequencyType?: string | null;     // 'DAILY' | 'SPECIFIC_DAYS' | 'EVERY_X_HOURS'
  weekDays?: readonly string[] | null;
  intervalHours?: number | null;
  times: readonly string[];
};
export const LATE_DOSE_TOLERANCE_MINUTES = 60;
export function minutesFromTime(time: string): number | null;
export function isMedicineScheduledOnDate(m: RemedioComAgenda, date: string): boolean;
export function getMedicineDoseTimesForDate(m: RemedioComAgenda, date: string): string[];
```
O corpo é o de hoje, com duas mudanças que não alteram o resultado: `weekDays ?? []` e o dia da semana por `new Date(\`${date}T00:00:00Z\`).getUTCDay()`. `MedicineRecord` satisfaz o tipo sem conversão.

**Porta por índice** (`ownerScopedRead.ts`)

```ts
export const INDICES_DO_DONO = {
  DOSES_POR_REMEDIO: {
    env: 'MEDICINE_DOSE_LOG_TABLE_NAME',
    indice: 'medicineDoseLogsByMedicineIdAndScheduledDate',
    chave: 'medicineId',
    ordenacao: 'scheduledDate',
  },
} as const;
export async function lerDoDonoPorIndice(
  indice: keyof typeof INDICES_DO_DONO,
  valorDaChave: string,
  intervalo: { de: string; ate: string },
  identity: ChatIdentity,
): Promise<LinhaDoBanco[]>;
```
`QueryCommand` com `IndexName`, `KeyConditionExpression: '#chave = :chave AND #ordem BETWEEN :de AND :ate'`, `FilterExpression: '#owner = :owner'` e `':owner': identity.owner`. Pagina até `MAX_PAGINAS`. Recusa um índice fora da lista (`Object.hasOwn`, como `lerPublicoPorChave`) e lança se a tabela não tiver nome configurado.

**Saída** (`dosesTomadasSaida.ts`)

```ts
export const DIAS_PADRAO = 7;
export const DIAS_MAXIMO = 30;
export const MAX_REMEDIOS_NAS_DOSES = 15;
export const MAX_SEM_MARCACAO_POR_REMEDIO = 14;

export type Agora = { data: string; minutos: number };            // Brasília
export type Periodo = { de: string; ate: string; dias: number };
export type SituacaoDoHorario = 'marcado' | 'sem marcação' | 'pendente';
export type HorarioSemMarcacao = { data: string; diaDaSemana: string; horario: string };
export type DosesDoRemedio = {
  nome: string | null;
  termino: string | null;
  hoje: { horario: string; situacao: SituacaoDoHorario }[];
  contagem: { horariosEsperados: number; marcados: number; semMarcacao: number; pendentes: number };
  semMarcacao: HorarioSemMarcacao[];
  semMarcacaoOmitidos: number;
  marcacoesForaDoHorarioAtual: number;
};
export type SaidaDasDoses = {
  disponivel: boolean;
  periodo: Periodo;
  medicamentos: DosesDoRemedio[];
  omitidos: number;
  naoEncontrado?: true;
  nomesEmUso?: string[];
  explicacao?: string;
};

export function agoraEmSaoPaulo(instante: Date): Agora;
export function periodoDe(agora: Agora, dias: number): Periodo;
export type EscolhaDeRemedios = {
  escolhidos: LinhaDoBanco[];         // em uso, do filtro, com sobreposição ao período, até o teto
  omitidos: number;
  nomesEmUso: string[];
  naoEncontrado: boolean;             // houve filtro e nenhum remédio em uso casou
};
export function escolherRemedios(linhas: LinhaDoBanco[], periodo: Periodo, filtro?: string): EscolhaDeRemedios;
export function montarSaida(entrada: {
  escolha: EscolhaDeRemedios;
  marcacoes: LinhaDoBanco[][];        // mesma ordem de `escolha.escolhidos`
  agora: Agora; periodo: Periodo;
}): SaidaDasDoses;
```

Regras que a saída aplica:
- **Em uso:** `active !== false` (a mesma regra de `medicamentosSaida.ts`). Antes da leitura, entram só os remédios que se sobrepõem ao período (`startDate <= ate` e sem `endDate` ou `endDate >= de`). Ordem por nome, para o teto ser estável.
- **Filtro:** `normalizeDrugName(nome).includes(normalizeDrugName(filtro))`, reaproveitando o normalizador do E9. Sem nenhum escolhido com filtro: `naoEncontrado: true`, `medicamentos: []` e `nomesEmUso`.
- **Período:** `de = ate − (dias − 1)`, por aritmética de data em UTC. `ate` é hoje em Brasília.
- **Horário de hoje:** `marcado` quando há linha do log ou o horário está em `takenToday` com `date` igual a hoje (D3.1). `sem marcação` quando `agora.minutos − minutos(horario) > 60`. Senão, `pendente`.
- **Dia anterior:** `marcado` com linha do log, senão `sem marcação`.
- **Marcação fora do horário:** linha do log (`scheduledDate`, `scheduledTime`) sem horário esperado correspondente naquele dia conta em `marcacoesForaDoHorarioAtual`, nunca em `marcados`.
- **`semMarcacao`:** do mais recente ao mais antigo (data, depois horário, decrescentes), até 14. `diaDaSemana` em português ("segunda", "terça", …). O resto vai em `semMarcacaoOmitidos`.
- **`termino`:** o `endDate` quando ele cai dentro do período; senão `null`.
- **Explicações**, uma só por saída:
  - sem remédio em uso: `disponivel: false`, "O usuário não tem remédio em uso cadastrado no aplicativo.";
  - filtro sem resultado: "Nenhum remédio em uso tem esse nome.";
  - remédios em uso, mas nenhum com horário no período: "Nenhum remédio em uso tem horário previsto neste período.";
  - nenhuma marcação no período: "Não há nenhum horário marcado como tomado no aplicativo neste período.";
  - marcação fora do horário: acrescenta "Os dias anteriores são contados com os horários cadastrados hoje."

**Ferramenta** (`dosesTomadas.ts`)
- `inputSchema`: `z.object({ medicamento: z.string().trim().min(2).max(80).optional(), dias: z.number().int().min(1).max(30).optional() }).strict()`.
- `run`: `lerDoDono(MEDICINE_TABLE_NAME)` → `escolherRemedios` → `Promise.all` de `lerDoDonoPorIndice('DOSES_POR_REMEDIO', String(r.id), periodo, identity)` → `montarSaida`. O relógio é lido uma vez (`new Date()`).
- `renderDegraded`: título "Horários marcados no aplicativo"; uma linha por remédio, `Nome · hoje: 08:00 marcado, 20:00 pendente · sem marcação no período: 3 horários`, com as partes vazias omitidas e `1 horário` no singular; mais a linha dos omitidos. Nunca "dose".
- Descrição: "Diz quais horários dos remédios em uso foram marcados como tomados no aplicativo, hoje e nos últimos dias, e quais ficaram sem marcação. NÃO lista o cadastro (isso é consultar_medicamentos), NÃO diz se a pessoa tomou de fato (ela pode ter tomado sem marcar) e NÃO orienta o que fazer com um horário esquecido."

**Regras de linguagem** (D3.4). São três entradas novas em `PADROES_R3`, logo depois do padrão de vacina e antes do padrão de verbo de medicação, para o bilhete da nova geração trazer o motivo de adesão:

| Padrão | Casa (exemplos do CA-23) | Exceção | Motivo |
|---|---|---|---|
| Dose esquecida e horário | `compens*`, `dobr*`, `pul(e\|ar)` + dose, remédio, comprimido, horário ou tomada, numa janela curta que não atravessa `FORA_DO_REMEDIO`; `tom(e\|ar)` + "esquecida", "que faltou", "perdida", "duas"; `mud*`/`adiant*`/`atras*`/`alter*` + "o horário" | `RECUSA_PERGUNTA_OU_CONDICAO` | "A resposta orienta o que fazer com uma dose esquecida ou com o horário do remédio. Isso é de quem prescreve ou do farmacêutico." |
| Juízo de adesão | `tomando/tomado/tomou` + `direit*`, `certinh*`, `corretamente`, `certo`, `bem`, `mal`, `errado`; `adesão` + adjetivo; `você está/ficou em dia/em atraso/atrasado`, sem consulta, retorno, exame ou vacina na frase | `RECUSA_OU_PERGUNTA` | "A resposta julga se a pessoa está tomando o remédio direito. O aplicativo mostra o que foi marcado; avaliar o tratamento é de quem acompanha a pessoa." |
| Afirmar que não tomou | `você não tomou`, `esqueceu`, `deixou de tomar`, `pulou`, `perdeu` + determinantes + dose, remédio, medicamento, comprimido ou horário | `DEVOLVE_A_DECISAO` ("não quer dizer que…") | "A resposta afirma que a pessoa não tomou o remédio. Sem marcação no aplicativo não quer dizer que ela não tomou." |

Todas as janelas têm teto de até 40 caracteres, e nenhuma varre até o fim do texto. "Editar o horário" não casa (o prompt manda dizer "editar"). `COISAS_DO_APLICATIVO` ganha `hor[aá]rios?|marca[cç](?:[aã]o|[oõ]es)`.

## 4. Onde cada responsabilidade mora, e por quê

- **A regra de horário esperado mora no módulo compartilhado.** Uma cópia no chat divergiria da tela, e esse é o defeito que a base mais evita. O módulo vive em `amplify/functions/` porque a Lambda não empacota `src/` (o alias `@/` nem existe lá). O app importa de `amplify/`, como já faz com as interações.
- **A situação de cada horário mora em `dosesTomadasSaida.ts`.** É lógica pura (cálculo no código, regra 5 do prompt): sem banco, ela é testada com datas e minutos fixos.
- **A leitura mora em `ownerScopedRead.ts`.** É o único arquivo que monta consulta, então o filtro de dono continua num lugar só (D3.2). O índice vem de lista fechada pelo mesmo motivo do `TABELAS_PUBLICAS`: o nome técnico não pode vir de quem chama.
- **"Agora" entra por parâmetro na saída.** Quem decide quando ler o relógio é a ferramenta, como no `contextoDeHoje.ts` do E1. Os testes fixam o instante.
- **`isDoseLate` fica no app.** Ele lê a hora local do aparelho, que na Lambda seria UTC. O chat calcula os minutos de Brasília e usa só a constante e `minutesFromTime`.

## 5. Alternativas descartadas

- **Copiar a regra de horários para o chat:** duas cópias, e a de lembretes já mostra como elas divergem.
- **`lerDoDono` com filtro de data em memória:** D3.2 = B.
- **Uma linha por dia na saída:** com 30 dias e 15 remédios, seriam até 450 linhas. A contagem mais a lista dos sem marcação respondem as perguntas reais com uma fração dos tokens.
- **Percentual de adesão:** é juízo (fora de escopo na spec, e a R3 nova o barraria na resposta).
- **Ler o `takenToday` só na ferramenta e não reaproveitar a regra da tela:** a regra do campo é curta, e o teste CA-5 a fixa com os mesmos casos de `parseTakenToday`. Mover `parseTakenToday` mexeria no hook da tela sem ganho.
- **Exceção para app em "mudar o horário" ("mude o horário no aplicativo"):** passaria uma orientação vestida de navegação. O prompt manda dizer "editar".

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Os padrões novos reprovam frase honesta de outro épico (por exemplo, "mudar o horário" numa resposta de navegação). | CA-24: as suítes de linguagem inteiras rodam a cada passo da T7; se alguma frase existente cair, paro e relato, sem afrouxar o padrão por conta própria. |
| Os padrões novos deixam a verificação lenta. | Janelas com teto; tempo da suíte de regras medido antes e depois e anotado em `tasks.md`. |
| A política de `Query` no índice não vale no sandbox (nome do índice ou ARN). | Nome conferido em `amplify_outputs.json`; mesmo formato de política do `labResultTable`, que funciona; conferência no sandbox listada na spec §8. |
| O mock do SDK nos testes antigos não tem `QueryCommand`. | Só a porta nova o constrói, e só quando há remédio em uso. Os testes que a exercitam acrescentam a classe ao mock. |
| O modelo continua escrevendo "2 doses". | A R3 reprova e ele gera de novo. O prompt e a saída (`contagem`, "horários") empurram para o vocabulário certo. A conferência no sandbox mede isso. |
| Mudar `src/utils/medicineSchedule.ts` quebra a tela. | CA-1: o teste de horários do app passa sem mudança, pelas reexportações; o typecheck do app roda no gate. |

## 7. Desempenho e custo

- **Leitura:** a de `Medicine` (um `Scan` com filtro de dono, como as outras ferramentas) mais até 15 `Query` em paralelo, cada uma limitada a até 30 dias de um remédio. Nenhum `Scan` novo.
- **CPU:** a expansão de `EVERY_X_HOURS` percorre os 1.440 minutos do dia, até 30 dias × 15 remédios ≈ 650 mil passos no pior caso, alguns milissegundos. Não vale otimizar aqui: é a mesma função da tela.
- **Tokens:** cerca de 200 por remédio no pior caso, ≈ 3 mil com o teto de 15. O comum fica abaixo de 800. O prompt cresce um item (≈ 150 tokens por turno).

## 8. Decisões exigidas pela constituição

- **Regra 3 (stack):** nenhuma dependência nova. `QueryCommand` é do `@aws-sdk/lib-dynamodb`, que já está instalado.
- **Regra 5 (nada quebra):** nenhuma mudança de schema nem de dado. O app só passa a importar a mesma função de outro arquivo, e a mudança do dia da semana para UTC dá o mesmo resultado para toda data válida (CA-1, CA-2).
- **Regra 4 (sem diagnóstico, R3 não enfraquece):** D3.3 não abre exceção. D3.4 só acrescenta reprovações. A única ampliação é `horário`/`marcação` no inventário depois de "você tem", que exime só esses substantivos do padrão de diagnóstico, com teste dos dois lados.
- **Regra 8 (ambiguidade documentada):** os dias passados são contados com os horários atuais, e isso vai na saída e na spec.

## 9. Desvios na execução e na revisão (2026-10-19)

- **Dias da semana dos cenários:** 21/10/2026 é quarta; a spec e o plano diziam sexta e domingo para 17 e 19/10 (são sábado e segunda). Corrigidos.
- **Contrato da escolha:** `escolherRemedios` devolve `EscolhaDeRemedios` (`escolhidos`, `omitidos`, `haRemedioEmUso`, `nomesEmUso`, `naoEncontrado`) e `montarSaida` recebe `{ escolha, marcacoes, agora, periodo }`. Nova explicação: "Nenhum remédio em uso tem horário previsto neste período."
- **Ordem no registro:** o teste do E9 exigia interações imediatamente depois de medicamentos; passou a esperar a posição seguinte às doses.
- **Fuso (D3.5, decisão do usuário na revisão):** `agoraEmSaoPaulo` virou `agoraNoFuso(instante, uf)`; o fuso da UF mora em `formatoPtBr.ts` (`fusoDaUf`, `partesNoFuso`), e só esta ferramenta passa a UF.
- **Módulo compartilhado maior que o planejado:** além dos horários, `passouDaTolerancia`, `horariosMarcadosNoCampoAntigo`, `codigoDoDia`, `somarDias` e a remoção de horário repetido. A tela passou a usá-los (`isDoseLate` delega; `useMedicinesData` importa a leitura do `takenToday`). Comportamento da tela igual, salvo horário repetido, que agora aparece uma vez (antes, duas linhas com a mesma chave).
- **`semAcento`** saiu de `analitos.ts` para `formatoPtBr.ts`; **`DIAS`** e **`estaEmUso`** passaram a ser exportados por `medicamentosSaida.ts`.
- **R3:** os três padrões foram reescritos na revisão (tabela de §3 vale como intenção; o código e `adversarial.test.ts` são a referência). Constantes novas: `AGENDA_OU_PREVENCAO`, `PERTO`, `FORA_DO_HORARIO`, `A_DOSE`, `QUANDO_DA_DOSE`, `CONDICAO_SE`, `DEVOLVE_A_DOSE_ESQUECIDA`, `NAO_AFIRMA_QUE_NAO_TOMOU`. O inventário ganhou só "horários sem marcação/marcados".
- **Modo degradado:** ganhou a linha fixa "Sem marcação não quer dizer que você não tomou: você pode marcar na tela de Medicamentos." quando há horário sem marcação.
- **Menores corrigidos depois da revisão (pedido do usuário):** `minutesFromTime` aceita hora com um dígito e recusa minuto acima de 59 (vale para a tela também); `marcacoesForaDoHorarioAtual` junta o histórico e o `takenToday` de hoje pela mesma chave; `EscolhaDeRemedios` e a saída ganharam `nomesEmUsoOmitidos`; `lerDoDonoPorIndice` refiltra pelo `owner` do token depois da consulta (só a porta nova; em `lerDoDono` o refiltro exigiria mudar os testes de todas as ferramentas).
