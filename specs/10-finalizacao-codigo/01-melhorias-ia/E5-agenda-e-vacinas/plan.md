# PLAN: E5 — Agenda e vacinas: campos faltantes

Estado: **aprovado em 2026-10-19; desvios da revisão na seção 9; épico concluído em 2026-10-19** · Data: 2026-10-19 · Spec: [`spec.md`](./spec.md) (aprovada em 2026-10-19) · Passo a passo: `docs/superpowers/plans/2026-10-19-e5-agenda-e-vacinas.md`

## 1. Resumo do desenho

Três mudanças, cada uma no lugar que já cuida do assunto:

1. **Um corte de observação só.** `observacaoComTeto` e `MAX_CARACTERES_OBSERVACAO` saem de `medicamentosSaida.ts` (onde são privados ao E2) para um módulo pequeno, `tools/observacao.ts`. Medicamentos, consultas e vacinas importam dali. `medicamentosSaida.ts` reexporta a constante, para o teste do E2 não mudar (CA-3).
2. **Consultas:** `consultas.ts` ganha `observacoes`/`observacoesCortadas` em cada item e o teto de 20 futuras (as mais próximas) e 20 passadas (as mais recentes), com `omitidas`. A lógica cabe no próprio arquivo (cerca de 20 linhas a mais), como hoje.
3. **Vacinas:** nasce `tools/vacinasSaida.ts`, puro, no padrão de `medicamentosSaida.ts`: mapeia as linhas, calcula `reforcosPrevistos` (D5.1 = A) sobre **todas** as doses e só depois aplica o teto de 30 + 30. `vacinas.ts` fica só com a casca do `ChatTool` (ler, chamar `montarSaida`, modo degradado).

O prompt ganha um item, e as regras de linguagem ganham testes, sem mudar regra.

## 2. Arquivos

| Arquivo | Muda o quê |
|---|---|
| `amplify/functions/chat-assistant/tools/observacao.ts` | **novo**: `MAX_CARACTERES_OBSERVACAO`, `observacaoComTeto` |
| `amplify/functions/chat-assistant/tools/medicamentosSaida.ts` | importa de `observacao.ts`; reexporta a constante |
| `amplify/functions/chat-assistant/tools/consultas.ts` | observações, teto, `omitidas` |
| `amplify/functions/chat-assistant/tools/vacinasSaida.ts` | **novo**: tipos, `somarAnos`, `reforcosPrevistos`, `montarSaida` |
| `amplify/functions/chat-assistant/tools/vacinas.ts` | usa `montarSaida`; degradado igual ao de hoje |
| `amplify/functions/chat-assistant/chatPrompt.ts` | um item sobre observações, reforço e `omitidas` |
| testes | novos: `vacinasSaida.test.ts`, `vacinasTool.test.ts`; acréscimos em `consultasTool.test.ts`, `chatPrompt.test.ts`, `ai-language-rules/__tests__/adversarial.test.ts` |

**Não muda:** schema, `amplify/backend.ts`, `tools/index.ts` (nenhuma ferramenta nova), `ownerScopedRead.ts`, `languageRules.ts`, `tools.test.ts`, telas.

## 3. Contratos

```ts
// tools/observacao.ts
export const MAX_CARACTERES_OBSERVACAO = 300;
export function observacaoComTeto(valor: unknown): { observacoes: string | null; observacoesCortadas: boolean };

// tools/consultas.ts (tipos internos)
type ConsultaParaOModelo = {
  tipo: string | null; nome: string | null; profissional: string | null;
  quando: string | null; endereco: string | null;
  observacoes: string | null; observacoesCortadas: boolean;
};
export const MAX_CONSULTAS_POR_LISTA = 20;
// saída: { disponivel, futuras, passadas, proxima, omitidas, explicacao? }

// tools/vacinasSaida.ts
export const MAX_DOSES_POR_LISTA = 30;
export type DoseParaOModelo = {
  nome: string | null; numeroDaDose: number | null; aplicadaEm: string | null;
  local: string | null; previstaPara: string | null;
  lote: string | null; fabricante: string | null;
  observacoes: string | null; observacoesCortadas: boolean;
  intervaloDeReforcoAnos: number | null; fazParteDeCampanha: boolean;
  totalDeDosesDaSerie: number | null;
};
export type ReforcoPrevisto = { vacina: string | null; ultimaDoseEm: string; intervaloAnos: number; previstoPara: string };
export type SaidaDasVacinas = {
  disponivel: boolean; aplicadas: DoseParaOModelo[]; recomendadasNaoAplicadas: DoseParaOModelo[];
  reforcosPrevistos: ReforcoPrevisto[]; omitidas: number; explicacao?: string;
};
export function somarAnos(dataIso: string, anos: number): string | null;   // null se a data não é AAAA-MM-DD real
export function reforcosPrevistos(linhas: LinhaDoBanco[]): ReforcoPrevisto[];
export function montarSaida(linhas: LinhaDoBanco[]): SaidaDasVacinas;
```

**Regras pinadas pela spec:**
- Agrupamento por vacina: `catalogId ?? "legado:" + name`, como `groupByVaccine` (achado A2).
- Reforço de um grupo só quando: há dose aplicada; a dose aplicada de maior `appliedDate` tem `recommendedIntervalYears` inteiro > 0 e `appliedDate` válida; o grupo **não** tem dose sem `appliedDate`. `vacina` = `name` dessa dose. Lista ordenada por `previstoPara`.
- `somarAnos` em UTC (`Date.UTC` + `setUTCFullYear`), como `addYearsToDate` de `src/services/vaccineScheduleService.ts`: 2028-02-29 + 1 = 2029-03-01. Validação: regex `^\d{4}-\d{2}-\d{2}$` e ida e volta pela data (rejeita 2026-02-30).
- `fazParteDeCampanha` = `isCampaign === true`.
- Números (`doseNumber`, `seriesTotal`, `recommendedIntervalYears` como dado cru) passam por `numero` de `linhasDeResultado.ts`, que recusa `NaN`.
- Ordem: `aplicadas` da mais recente para a mais antiga (como o histórico da tela); `recomendadasNaoAplicadas` pela `previstaPara` crescente, sem data por último; consultas futuras crescentes (as 20 primeiras) e passadas crescentes (as 20 últimas, `slice(-20)`).
- `omitidas` = itens cortados das duas listas somados.

## 4. Onde cada responsabilidade mora, e por quê

- **`observacao.ts` separado**, e não em `ownerScopedRead.ts`: aquele arquivo é a porta de leitura de tabela, e o corte é formatação de saída. Com três consumidores, a função compartilhada evita a divergência entre cópias que a base mais teme (ex.: uma ferramenta cortar em 300 e outra em 500).
- **`vacinasSaida.ts` separado**, e não dentro de `vacinas.ts`: o cálculo do reforço é regra de domínio testável sem mock de banco, como `medicamentosSaida.ts`, `prevencaoSaida.ts` e `interacoesSaida.ts`. A casca do `ChatTool` fica fina.
- **Consultas sem módulo de saída:** a mudança é pequena e o arquivo segue curto. Um módulo novo para 20 linhas seria abstração sem ganho.
- **`somarAnos` próprio, não importado do app:** `amplify/` não importa de `src/` (o sentido do compartilhamento nesta base é o contrário, ver E9). A função tem 6 linhas, e o teste do CA-13 prova o mesmo resultado de `addYearsToDate`.

## 5. Alternativas descartadas

- **Reforço pelo catálogo** (D5.1 = B): decidido contra em 2026-10-19.
- **Reforço por dose** (cada dose aplicada com intervalo gera uma data): daria três datas para a dT, duas delas erradas. O cálculo é por vacina, da última dose.
- **Observação no modo degradado:** texto livre pode ter número de dose, e o degradado existe para mostrar só o que não reprova (D31).
- **Observação em `valoresCadastrados`:** a D2.4 deixou texto livre de fora de propósito; afrouxar a R3 exige decisão e não faz parte deste épico.
- **Campos com `null` omitidos da saída** para economizar tokens: as outras ferramentas mandam `null` explícito, e o modelo distingue "não registrado" de "não perguntado". Mantido o padrão.

## 6. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Modelo calcular reforço sozinho a partir de `intervaloDeReforcoAnos` | Prompt manda usar só `reforcosPrevistos` ou a dose pendente; sem eles, "não há data registrada". Conferência no sandbox (spec §8). |
| Modelo dizer que a carteira está completa ou atrasada | Nenhum campo de situação (CA-15); a descrição da ferramenta já proíbe; R3 barra "você deve tomar" (CA-18). |
| Observação com dose reprova a resposta | Comportamento seguro e esperado (H4): segunda geração e modo degradado já existentes. Fica registrado como limitação. |
| Mudar o corte do E2 sem querer | Os testes do E2 rodam sem mudança (CA-3). |
| `omitidas` muda a forma da saída de consultas | O teste de forma do E1 é atualizado com as chaves novas, de propósito. |

## 7. Desempenho e custo

- Nenhuma leitura nova, nenhuma tabela nova. O cálculo do reforço é linear no número de doses (um `Map` por vacina).
- Tokens: uma consulta com observação cheia custa perto de 110 tokens; 40 consultas ficam perto de 4,4 mil no pior caso. Uma dose com todos os campos, perto de 85, e mais de 170 com observação cheia; 60 doses chegam perto de 10 mil no pior caso, que exige 60 doses todas com observação cheia (*corrigido na revisão: o plano dizia 5,4 mil*). O caso comum (sem observação, sem lote) quase não muda em relação a hoje, porque `null` custa pouco. O teto existe para o pior caso não estourar as 6 iterações.
- Prompt: um item de cerca de 110 tokens, em todo turno.

## 8. Decisões exigidas pela constituição

- **Regra 3 (stack):** nenhuma dependência nova.
- **Regra 5 (nada quebra):** nenhuma escrita, nenhum schema novo; registro legado coberto por teste (CA-8).
- **Regra 8 (ambiguidade):** o achado A1 (intervalo nunca gravado) virou a decisão D5.1, registrada antes da spec.

## 9. Desvios na execução e na revisão (2026-10-19)

- **Prompt maior que o previsto:** além do item planejado, ele manda contar em registros (a R3 reprova "N doses"), proíbe completa, em dia, atrasada e vencida (essas palavras passam pela verificação), e diz quais itens o teto corta. São cerca de 90 tokens a mais por turno.
- **`montarSaida`** ordena as aplicadas pelas linhas cruas com `maisRecente` (o mesmo desempate do reforço), em vez de ordenar a saída já mapeada.
- **`reforcosPrevistos`** recusa o grupo com qualquer data aplicada inválida, e a regra "dose pendente impede o reforço" ficou explícita.
- **Mantidos, com motivo:**
  - `omitidas` continua um número só por ferramenta, como a spec (CA-4, CA-14). Separar por lista mudaria o contrato aprovado.
  - Os campos `null` seguem explícitos (§5).
  - `proxima` segue copiando a consulta inteira (contrato do E1).
  - A reexportação do teto em `medicamentosSaida.ts` segue (CA-3: o teste do E2 não muda).
  - O agrupamento de doses do catálogo e de doses legado com o mesmo nome segue a tela (CA-12). A consequência fica levada ao usuário.
