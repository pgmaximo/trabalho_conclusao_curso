# PLAN: E9 — Interações medicamentosas no chat

Estado: **aprovado em 2026-10-17; desvios da execução e da revisão na seção 8** · Data: 2026-10-17 · Spec: [`spec.md`](./spec.md) (aprovada em 2026-10-17) · Passo a passo: `docs/superpowers/plans/2026-10-17-e9-interacoes-chat.md`

## 1. Resumo do desenho

Quatro mudanças, cada uma no lugar que já cuida do assunto:

1. **O dataset muda de casa (D9.1).** `pairs.ts`, `aliases.ts`, `normalizeDrugName.ts` e a lógica de `drugInteractionService.ts` vão para `amplify/functions/drug-interactions-shared/`. Em `src/` ficam reexportações de uma linha, então nenhuma tela e nenhum teste muda de import. É a direção que o repositório já pratica: o app importa de `amplify/functions/*`.
2. **A ferramenta** `consultar_interacoes` lê os remédios em uso do dono, junta os candidatos citados (D9.2), cruza tudo com o dataset compartilhado e devolve só alertas da base, os nomes reconhecidos, os não reconhecidos (D9.3) e um aviso fixo. A montagem é pura (`interacoesSaida.ts`), e a ferramenta só fala com o banco e com o chat, como `medicamentos.ts` e `medicamentosSaida.ts` no E2.
3. **A regra** ganha dois padrões na R3 (D9.4): garantia de combinação segura, e troca de remédio.
4. **A verificação** passa a tratar `consultar_interacoes` como clínica (`TOOLS_CLINICAS`), e o encaminhamento é costurado se faltar. O prompt ganha um item.

A D9.5 reescreve os textos de risco que não se explicam sozinhos, no próprio dataset compartilhado.

## 2. Arquivos

| Arquivo | O que muda | Por que aqui |
|---|---|---|
| `amplify/functions/drug-interactions-shared/pairs.ts` | **nasce** (movido de `src/data/drugInteractions/pairs.ts`); D9.5 reescreve 5 `riskPt` | Fonte única (D9.1). |
| `amplify/functions/drug-interactions-shared/aliases.ts` | **nasce** (movido) | idem |
| `amplify/functions/drug-interactions-shared/normalizeDrugName.ts` | **nasce** (movido; o import já é relativo) | idem |
| `amplify/functions/drug-interactions-shared/findInteractions.ts` | **nasce** (o conteúdo de `drugInteractionService.ts`, com `@/data/...` trocado por `./`) | idem; sem `@/`, porque o alias não existe no empacotamento do backend |
| `amplify/functions/drug-interactions-shared/__tests__/moduloCompartilhado.test.ts` | **nasce**: pureza dos arquivos (CA-1), textos de risco (CA-15, CA-19) | Teste do que é novo; os antigos ficam onde estão. |
| `src/data/drugInteractions/{pairs,aliases,normalizeDrugName}.ts` | viram `export * from '../../../amplify/functions/drug-interactions-shared/<arquivo>'` | Nenhum import do app muda (CA-2). |
| `src/services/drugInteractionService.ts` | vira `export * from '../../amplify/functions/drug-interactions-shared/findInteractions'` | idem |
| `amplify/functions/ai-language-rules/languageRules.ts` | dois padrões novos em `PADROES_R3`, depois do de suspensão | D9.4. A regra é a dona dos padrões. |
| `amplify/functions/ai-language-rules/__tests__/adversarial.test.ts` | bloco "interações: garantia de segurança e troca (E9, D9.4)" | Os dois lados, juntos. |
| `amplify/functions/chat-assistant/tools/interacoesSaida.ts` | **nasce**: `montarSaidaDasInteracoes`, constantes, tipos | Pura, testável com número, sem SDK. |
| `amplify/functions/chat-assistant/tools/interacoes.ts` | **nasce**: o `ChatTool` | Só banco e chat. |
| `amplify/functions/chat-assistant/__tests__/interacoesTool.test.ts` | **nasce** | |
| `amplify/functions/chat-assistant/tools/index.ts` | registra logo depois de `medicamentosTool` | É o vizinho que o modelo mais confundiria. |
| `amplify/functions/chat-assistant/verificacao.ts` | `'consultar_interacoes'` em `TOOLS_CLINICAS` + comentário | A pergunta por trás é "posso tomar?", e quem decide é o profissional. |
| `amplify/functions/chat-assistant/chatPrompt.ts` | um item | RT9. |
| testes existentes: `tools.test.ts`, `verificacao.test.ts`, `chatPrompt.test.ts`, `degradedAnswer.test.ts` | casos novos | |

**Não muda:** schema, `amplify/backend.ts` (a tabela `Medicine` já está no laço de `grantReadData` com `MEDICINE_TABLE_NAME`, e o dataset é código empacotado, sem I/O), nenhuma tela, `pairs.test.ts`, `normalizeDrugName.test.ts`, `drugInteractionService.test.ts`, `avisoDeInteracao.test.tsx`.

## 3. Contratos

### 3.1 Módulo compartilhado

As assinaturas atuais, sem mudança:

```ts
// pairs.ts
export type InteractionSeverity = 'warning' | 'danger';
export type DrugInteractionPair = { id: string; a: string; b: string; severity: InteractionSeverity; riskPt: string; mechanismPt: string };
export const DRUG_INTERACTION_PAIRS: DrugInteractionPair[];
// aliases.ts
export const DRUG_ALIASES: Record<string, string[]>;
// normalizeDrugName.ts
export function normalizeDrugName(raw: string): string;
export function resolveCanonicalDrug(rawName: string): string | null;
// findInteractions.ts
export type InteractionSubject = { id: string; name: string };
export type DrugInteractionMatch = { pair; severity; medicineA: { id; name }; medicineB: { id; name }; riskPt; mechanismPt };
export function findInteractions<T extends InteractionSubject>(medicines: T[]): DrugInteractionMatch[];
export function findInteractionsForCandidate(candidate: InteractionSubject, others: InteractionSubject[]): DrugInteractionMatch[];
```

Cada arquivo movido ganha o cabeçalho "Resumo do arquivo" dizendo que é a fonte única do app e do chat (D9.1), e que `src/` só reexporta.

### 3.2 `tools/interacoesSaida.ts`

```ts
export const MAX_CANDIDATOS = 5;
export const MAX_CARACTERES_CANDIDATO = 60;
export const MAX_NAO_RECONHECIDOS = 10;
export const AVISO_DA_BASE =
  'Esta checagem usa só a lista curta de combinações que o aplicativo conhece. Não encontrar alerta não garante que não exista interação.';

export type OrigemDoNome = 'cadastrado' | 'citado';
export type MedicamentoDoAlerta = { nome: string; origem: OrigemDoNome };
export type AlertaDeInteracao = {
  medicamentos: [MedicamentoDoAlerta, MedicamentoDoAlerta];
  gravidade: 'grave' | 'moderada';
  risco: string;
};
export type SaidaDasInteracoes = {
  disponivel: boolean;
  alertas: AlertaDeInteracao[];
  verificados: string[];
  naoReconhecidos: string[];
  naoReconhecidosOmitidos: number;
  avisoDaBase?: string;   // presente sempre que disponivel
  explicacao?: string;    // presente só quando !disponivel
};

export function montarSaidaDasInteracoes(linhas: LinhaDoBanco[], candidatos: readonly string[]): SaidaDasInteracoes;
```

**O algoritmo** (o que os testes não determinam sozinhos):

1. Nomes cadastrados: `texto(linha.name)` das linhas com `active !== false`, na ordem do banco. Depois os candidatos, na ordem da entrada. Cadastrados primeiro, e é isso que dá a preferência a eles.
2. Para cada nome, `resolveCanonicalDrug(nome)`:
   - `null` → vai para os não reconhecidos. Antes, dedupe por `normalizeDrugName`, para "Dorflex" e "dorflex" não aparecerem duas vezes.
   - princípio ativo já visto → descartado, para não repetir alerta;
   - novo → vira sujeito `{ id: '<origem>:<indice>', name: nome }`, e a origem fica num `Map` por id.
3. `findInteractions(sujeitos)` → cada match vira um alerta: `danger` → `'grave'`, `warning` → `'moderada'`, `risco = riskPt`, nomes e origens tirados do `Map`. O `mechanismPt` é descartado.
4. `verificados` = nomes dos sujeitos. `naoReconhecidos` = os primeiros 10; `naoReconhecidosOmitidos` = o resto.
5. `disponivel` = há pelo menos um nome (cadastrado ou citado). Sem nome: `{ disponivel: false, alertas: [], verificados: [], naoReconhecidos: [], naoReconhecidosOmitidos: 0, explicacao: 'O usuário não tem medicamento em uso cadastrado no aplicativo e não citou nenhum nome.' }`.

### 3.3 `tools/interacoes.ts`

```ts
export const interacoesTool: ChatTool = {
  name: 'consultar_interacoes',
  description: '…', // ver abaixo
  inputSchema: z.object({
    candidatos: z.array(z.string().trim().min(1).max(MAX_CARACTERES_CANDIDATO)).max(MAX_CANDIDATOS).optional(),
  }).strict(),
  readOnly: true,
  run: async (input, identity) =>
    montarSaidaDasInteracoes(await lerDoDono(process.env.MEDICINE_TABLE_NAME, identity), (input as { candidatos?: string[] }).candidatos ?? []),
  renderDegraded, // §3.4
};
```

**Descrição** (contrasta com `consultar_medicamentos`):
> Confere se os medicamentos em uso que o usuário cadastrou, e os nomes que ele citar nesta conversa (em candidatos, só o nome, sem dose), aparecem juntos na lista curta de interações conhecidas do aplicativo. Devolve só os alertas dessa lista e os nomes que ela não reconhece. NÃO diz se pode tomar junto, NÃO garante que uma combinação é segura, NÃO sugere parar, trocar nem ajustar remédio, e NÃO conhece remédio fora da lista do aplicativo.

### 3.4 `renderDegraded`

- Devolve `null` sem alerta (CA-14).
- Com alerta: `titulo: 'Alertas da lista de interações do aplicativo'`, uma linha por alerta, `"<A> + <B>: alerta <gravidade>. <risco>"`, e a última linha é `AVISO_DA_BASE`. `citacoes: []`.

### 3.5 Os padrões da R3 (D9.4)

Os dois entram **depois** do padrão de suspensão e antes do de exame. Ficam depois do padrão de vacina de propósito: "Você pode tomar a vacina sem problema" continua com o motivo de vacina, e o bloco do E8 passa sem edição.

1. **Garantia de combinação segura.** Motivo: `'A resposta garante que dois remédios podem ser tomados juntos. A lista do aplicativo é curta, e quem diz se uma combinação serve para a pessoa é quem prescreve ou o farmacêutico.'` Casa:
   - "pode(m) tomar ... junto(s)/juntas", e "pode tomar <X> com <Y>", na mesma frase, com janela curta;
   - "não tem/há (nenhum) problema (em) tomar";
   - "é/são seguro(s)/segura(s) tomar", e "a combinação/associação é segura";
   - "não há/existe (nenhuma) interação", e "não interage(m)".

   Exceção: `RECUSA_PERGUNTA_OU_CONDICAO`, a mesma da vacina e do exame.
2. **Troca de remédio.** Mesmo motivo do padrão de suspensão (`'A resposta orienta iniciar, mudar ou interromper uma medicação.'`). Casa "troque/trocar ... por", "substitua/substituir", "tome/use <X> no lugar d<o/a> <Y>" e "tome/use <X> em vez d<e/o/a> <Y>". Sem exceção, como a suspensão: na dúvida, reprova.

"A lista do aplicativo não traz alerta para essa combinação", "essa lista é curta e não garante que a combinação seja segura" e o `AVISO_DA_BASE` **passam** (teste).

### 3.6 Os textos de risco (D9.5)

| Par | `riskPt` novo |
|---|---|
| `warfarina__diclofenaco` | `Risco aumentado de sangramento grave (digestivo ou em outros locais).` |
| `losartana__espironolactona` | `Risco de hipercalemia grave (potássio alto no sangue), podendo causar arritmias cardíacas.` |
| `captopril__espironolactona` | `Risco de hipercalemia grave (potássio alto no sangue), podendo causar arritmias cardíacas.` |
| `sertralina__tramadol` | `Risco de síndrome serotoninérgica (agitação, febre, rigidez muscular, tremores) e de convulsões.` |
| `sinvastatina__eritromicina` | `Risco aumentado de rabdomiólise (lesão muscular grave).` |

Cada texto novo repete, por inteiro, o risco do par a que o original remetia. A informação não muda. O `mechanismPt` não muda.

> *Desvio da spec, registrado ao planejar:* a spec e a D9.5 falam em **4** textos. O teste do CA-19 ("nenhum `riskPt` se refere a outro par") pegou um **quinto**: warfarina + diclofenaco ("semelhante à combinação com outros AINEs"). Ele entra pelo mesmo motivo da decisão.

### 3.7 Prompt

Um item, depois do de medicamentos:

> Para saber se remédios podem ter interação, use consultar_interacoes; consultar_medicamentos só lista o cadastro. Se a pessoa citar um remédio, passe só o nome em candidatos, sem dose. Para cada alerta, diga que ele está na lista do aplicativo e repita o risco com as palavras da ferramenta. Quando não houver alerta, diga que a lista do aplicativo não traz alerta para aquela combinação e repita o avisoDaBase. Para cada nome em naoReconhecidos, diga que não conseguiu verificar porque ele não está na lista do aplicativo. Nunca diga que pode tomar junto ou que é seguro, nunca fale em parar, suspender, trocar ou ajustar remédio, nem para dizer que não deve, e nunca acrescente interação que a ferramenta não trouxe: para isso, a pessoa fala com o farmacêutico ou com quem prescreveu.

## 4. Alternativas descartadas

- **Mandar o `mechanismPt` ao modelo:** é jargão, gasta tokens, e um texto é reprovado pela R3 (medido). Descartado na D9.5.
- **Usar `findInteractionsForCandidate` por candidato:** não cruza candidato × candidato ("posso tomar marevan com ibuprofeno?" sem nada cadastrado, H8) e repetiria pares. Um `findInteractions` sobre o conjunto deduplicado cobre os três cruzamentos de uma vez.
- **Critério "previsto para hoje" da tela:** um remédio de segunda e quarta é tomado na terça também, e para interação o que importa é estar em uso. A ferramenta usa o critério de `consultar_medicamentos` (`active !== false`).
- **Mover os testes antigos para o módulo compartilhado:** deixá-los em `src/`, testando pelas reexportações, prova duas coisas de uma vez: a lógica e a reexportação. E prova o CA-3 sem nenhuma edição.
- **Deixar a troca de remédio só para o prompt:** medido, "Troque o ibuprofeno por paracetamol" passa hoje. É do mesmo tamanho de risco que a suspensão, que já tem padrão.

## 5. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| `export *` não reexportar tipos no app (Metro/Babel) | Tipos somem na compilação; `export *` reexporta os valores. O `typecheck` (app) e a suíte de `src/` provam. |
| O padrão novo reprovar resposta boa (falso positivo) | Lista de "passa" no `adversarial.test.ts`, com as frases que o prompt manda dizer, e os blocos existentes sem edição (CA-17). |
| O padrão novo engolir o motivo de vacina | Ordem em `PADROES_R3` (depois da vacina), e o bloco do E8 passa sem edição. |
| O modelo inventar interação "de cabeça" (H11) | Prompt e descrição. Não há verificação determinística possível: risco residual declarado na spec. |
| A ausência de alerta lida como segurança | `avisoDaBase` em toda saída disponível, `naoReconhecidos` explícito, padrão da D9.4, encaminhamento costurado (`TOOLS_CLINICAS`), e `renderDegraded` nulo sem alerta. |
| O nome citado ser texto hostil (instrução plantada) | Limite de 60 caracteres e de 5 itens. O nome só vira chave de busca; um nome não reconhecido volta como dado em `naoReconhecidos`, e o prompt já trata dado como dado. |

## 6. Desempenho e custo

- Uma leitura (`lerDoDono`), igual à de `consultar_medicamentos`. Nenhum `Scan` novo, nenhuma permissão nova.
- O cruzamento é O(n²) com n ≤ remédios em uso + 5, contra 19 pares. Desprezível.
- Saída: no máximo 19 alertas de ~40 tokens, 10 não reconhecidos, e um aviso de ~30 tokens. O prompt cresce um item (~150 tokens por turno).
- O bundle da Lambda do chat cresce o dataset (~10 KB de texto).

## 7. Decisões da constituição

- **Regra 3 (stack):** nenhuma dependência nova.
- **Regra 5 (nada quebra):** sem schema, sem dado tocado. A tela muda só os 5 textos de risco (D9.5), e os testes da tela passam sem edição.
- **Regra 8 (ambiguidade):** os rótulos de gravidade são "grave" e "moderada". A tela não escreve rótulo (só ícone, e o comentário fala em "leve"). "Leve" foi recusado porque diminui um alerta que inclui "piorar a função renal".

## 8. O que mudou na execução e na revisão (2026-10-17)

O texto das seções 3.2 a 3.5 é o plano aprovado, mantido para rastreio. O entregue difere nestes pontos:

- **`montarSaidaDasInteracoes(linhas, candidatos, hoje)`**: o terceiro parâmetro (AAAA-MM-DD, de `dataEmSaoPaulo`) tira do cruzamento o remédio com término vencido.
- **Saída:** `mesmoPrincipioAtivo: { nomes: string[] }[]` é novo; os nomes saem sem dose (`removerDose`, exportada de `normalizeDrugName.ts` e usada pelos dois lados) e, quando só a primeira palavra foi reconhecida, só ela.
- **`renderDegraded`:** mostra também o mesmo remédio em dois nomes e a CONTAGEM dos não verificados; volta `null` só quando não há alerta nem remédio repetido.
- **Padrões da R3 (§3.5):** reescritos depois da revisão, em cinco famílias de garantia e três de troca, com `FORA_DO_REMEDIO` (palavras que dizem que a frase fala do aplicativo, de vacina ou de decisão) e a exceção própria `DEVOLVE_A_DECISAO`, mais estreita que a da vacina: o "se" tem de ficar colado à garantia. A frase que termina em "?" não é garantia. O que os padrões olham adiante tem teto (`ADIANTE = 200`); sem ele, o custo era quadrático (medido: 69 ms em 16 mil caracteres). "Substituir" só conta com "por".
- **Duas guardas trocadas** (rulings): "pode tomar nota … tela de Medicamentos" e "use a tela de Medicamentos em vez do chat" já eram reprovadas pelo padrão ANTIGO de verbo de medicação ("tomar/usar … medicamento"). Afrouxá-lo não é deste épico; as guardas passaram a usar frases sem a palavra "Medicamentos".
- **Limpeza (`/simplify`):** `janela(n, fora)` única, `MOTIVO_DE_MUDANCA` para as três cópias do motivo, comentário de uma linha nas reexportações.

**Ficou de fora, registrado:** unificar os verbos das três exceções e dar proximidade ao `absolvido` (mudariam vacina e exame); mover palavras de aplicativo para `FORA_DO_ASSUNTO`; cache da leitura por turno (se o modelo chamar `consultar_medicamentos` e `consultar_interacoes` no mesmo turno, a tabela é varrida duas vezes); deduplicar por princípio ativo também na tela; um predicado "em uso" compartilhado com os lembretes.
