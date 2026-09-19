# Plano técnico: Agenda — Lista contínua no tempo

## Diagnóstico — por que esta EPIC é majoritariamente subtração

A EPIC anterior construiu um sistema de navegação temporal completo para resolver um problema de **alcance**. Esta EPIC resolve o mesmo problema por **construção**: se tudo está numa lista só, não há o que alcançar.

O resultado é que a maior parte do trabalho é apagar. Quatro componentes somem, sete exports do módulo de data somem, e um hook encolhe a quase nada. O que se constrói é uma `SectionList` e uma camada modal.

Isso tem uma consequência prática que orienta a ordem do plano: **apagar cedo quebra a tela, e a tela quebrada não tem teste que passe.** Então a subtração vem por último, depois de a lista nova já estar de pé e verde.

## 1. A lista: por que `SectionList` e por que não paginar

`useAppointmentsData` já devolve **todos** os compromissos do usuário em memória — é assim desde antes desta EPIC, e a Home depende disso. Uma agenda pessoal de saúde tem dezenas de registros, não milhares.

Portanto: `SectionList` com todas as seções montadas de uma vez, e `initialScrollIndex` apontando para a seção de hoje. Sem paginação, sem carregamento incremental, sem janela virtual customizada. Qualquer coisa além disso é complexidade a serviço de um problema que este app não tem.

**O detalhe que dá trabalho é `initialScrollIndex`.** Ele exige `getItemLayout` para funcionar de forma confiável em `SectionList`, e `getItemLayout` exige alturas fixas conhecidas. Duas saídas:

- **Alturas fixas declaradas** (card e cabeçalho de seção com altura constante), permitindo `getItemLayout` exato. Restringe o card a uma altura previsível — o que ele já tem hoje, porque o conteúdo é curto e não quebra linha.
- **`scrollToLocation` num `useEffect` após a montagem**, sem `getItemLayout`. Mais tolerante a alturas variáveis, mas pode piscar: a lista renderiza no topo e salta.

**Decisão: alturas fixas + `getItemLayout`.** O salto visual da segunda opção é exatamente o tipo de coisa que faz uma tela parecer mal feita, e o card já tem altura previsível. Se durante a implementação ficar claro que o card precisa de altura variável (endereço longo que quebra em duas linhas), a saída é truncar o endereço em uma linha, não abandonar `getItemLayout`.

## 2. Agrupamento: um módulo puro, como nas EPICs anteriores

O agrupamento por dia é aritmética de data sobre uma lista — exatamente o tipo de coisa que as duas EPICs anteriores provaram valer a pena isolar. Novo módulo `src/services/agendaTimeline.ts`, puro, com `now` injetado:

```ts
export type AgendaSection = {
  isoDate: string | null;   // null = a secao dos registros com data invalida
  label: string;            // "Hoje", "Amanha", "Sexta, 25 de setembro", "Data invalida"
  isToday: boolean;
  isPast: boolean;
  data: AppointmentEntry[];
};

buildTimelineSections(appointments, now): AgendaSection[]
findTodaySectionIndex(sections): number
```

`buildTimelineSections` ordena cronologicamente, agrupa por dia local (via `parseScheduledAt`), rotula, e **sempre insere a seção de hoje**, mesmo vazia, quando existe qualquer compromisso — é ela que ancora a rolagem e comunica "nada marcado para hoje". Registros com `scheduledAt` inválido vão para uma seção final com `isoDate: null`.

Reaproveita `parseScheduledAt`, `compareScheduled` e `toIsoDate` de `agendaDateRange.ts`. Não duplica nenhum deles.

## 3. A camada de mês: modal, não rota

Um `Modal` do React Native, estado local na tela. Dentro dele: `MonthCalendarGrid` (reaproveitado sem alteração) alimentado por `buildMonthCells` (idem), mais a lista de compromissos daquele mês, filtrada por `isWithinRange(scheduledAt, buildRange('mes', mesVisivel))` — todos já existentes.

O único estado é o mês visível, e ele vive na camada. **Não é rota** porque não precisa de deep link, e uma rota traria de volta o acoplamento com a navegação que estamos removendo.

## 4. A pílula "Hoje"

`onViewableItemsChanged` na `SectionList` informa se a seção de hoje está visível; a pílula aparece quando não está. Tocá-la chama `scrollToLocation` no índice que `findTodaySectionIndex` devolve.

Cuidado conhecido: `viewabilityConfig` precisa ser uma referência estável (fora do componente ou em `useRef`), senão o React Native reclama em tempo de execução de mudança de configuração.

## 5. A ordem de execução, e por que a subtração vem por último

1. **Reescrever o teste de regressão herdado** (`agendaCompromissoForaDaJanela.test.tsx`) contra a API nova. Ele fica vermelho e é o portão da entrega. A garantia que ele protege é a razão da EPIC anterior ter existido; ela não pode se perder numa reforma visual.
2. **`agendaTimeline.ts`** com testes puros: agrupamento, rótulos, seção de hoje sempre presente, seção de inválidos ao final, viradas de mês e ano.
3. **A lista na tela**, com estados vazios. O teste do item 1 fecha aqui.
4. **A camada de mês.**
5. **A subtração**: apagar os quatro componentes, os sete exports e reduzir o hook. Só agora, com a tela nova verde, é seguro remover a antiga.
6. **Validação e documentação**, incluindo o registro da divergência da regra 1 em `GAP_ANALYSIS.md`.

Se a subtração viesse antes, os passos 2–4 aconteceriam numa tela quebrada, sem suíte verde para dizer se algo regrediu.

## 6. Riscos e contenção

| Risco | Contenção |
|---|---|
| Perder a garantia de alcance da EPIC anterior | O teste herdado é reescrito **primeiro** e é o portão; a garantia é verificada antes de qualquer remoção |
| `initialScrollIndex` falhar silenciosamente e a lista abrir no passado | Teste assertando que a seção de hoje é a primeira visível; `getItemLayout` com alturas fixas declaradas |
| Apagar um export de `agendaDateRange.ts` que a Home ainda usa | A Home usa `parseScheduledAt`, `isPast` e `compareScheduled`, todos preservados. `npm run typecheck` é a rede, e o critério de aceite exige a Home fora do diff |
| Card com endereço longo quebrar a altura fixa | Truncar o endereço em uma linha (`numberOfLines={1}`), preservando `getItemLayout` |
| Atenuar itens passados até a ilegibilidade | Opacidade no bloco, nunca em texto isolado; contraste conferido no teste manual |

## 7. Fora de escopo

- Qualquer mudança na Home, em `homeAppointments.ts` ou em `useAppointmentsData`.
- Busca textual por nome de compromisso. Não foi pedida, e a lista contínua com rolagem cobre os dois usos declarados.
- Sincronização com Google Agenda — pendência de outra natureza, já registrada.
- Os seis follow-ups deixados pela EPIC `home-compromissos/` (duplicação de cache, escopo assimétrico, etc.). São de outra área.
