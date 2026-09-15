# EPIC: Insights de saúde (Bloco 4)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: **N/A — feature nova, sem Canvas de origem** (ver `../importar-dados/spec.md` §1; a mesma ambiguidade documentada se aplica aqui).
- Rota/arquivo no código: `src/app/(app)/health-data.tsx` → `src/screens/HealthDashboardScreen.tsx`.
- Ator(es): usuário final.

## 2. História da funcionalidade

Como usuário final, quero ver um dashboard com gráficos e uma análise em linguagem natural dos meus dados de wearable, para que eu entenda padrões no meu sono, atividade e batimentos sem precisar interpretar números brutos sozinho.

### Cenários (Given/When/Then)

- **Estado vazio**: Dado que o usuário nunca importou nenhum dado, quando abre a tela, então vê um `EmptyState` explicando como exportar do Samsung Health/Apple Health, com CTA "Importar dados".
- **Carregando (primeira busca)**: Dado que a tela está buscando a última importação, quando a busca ainda não retornou, então um `ScreenSkeleton` é exibido.
- **Processando (importação recém-criada)**: Dado que o usuário acabou de criar uma importação, quando a tela recebe `?importId=`, então acompanha **essa** importação especificamente via polling, mostrando "Preparando seus arquivos…" (`PENDING`) ou "Lendo seus dados e analisando padrões…" (`PROCESSING`).
- **Travado**: Dado que o polling passou de 6 minutos sem a importação chegar a `READY`/`FAILED`, quando o tempo limite é atingido, então um `EmptyState` de erro oferece "Tentar novamente" (reinicia o polling do zero).
- **Falha na análise**: Dado que a Lambda marcou a importação como `FAILED`, quando a tela exibe o estado, então mostra a mensagem de erro real gravada pelo backend (nunca uma mensagem genérica que esconda a causa).
- **Sucesso com dados reais**: Dado que a importação está `READY`, quando a tela renderiza, então mostra: banner de apoio informativo, período analisado, grade de métricas com sparkline, resumo em prosa, destaques, gráficos (passos por mês, sono por mês), pontos de atenção, padrões (com a evidência estatística — `r` e `n` — sempre visível ao lado da narrativa da IA), sugestões, perguntas para o médico, e uma seção recolhível com os avisos do que não pôde ser lido.
- **Erro de rede ao consultar**: Dado que `getHealthImport`/`getLatestReadyHealthImport` falha, quando o erro ocorre, então um `EmptyState` de erro com "Tentar novamente" é mostrado, nunca uma tela em branco.
- **Resultado corrompido**: Dado que a importação está `READY` mas `metricsJson`/`insightsJson` não pôde ser interpretado como JSON válido, quando a tela detecta isso, então mostra um `EmptyState` de erro específico ("Resultado indisponível") em vez de quebrar a renderização.

## 3. Estrutura da página

1. Cabeçalho ("Dados do smartwatch" + subtítulo).
2. Banner de apoio informativo (`AiDisclaimerBanner`) — **em todos os estados**, não só no sucesso (regra 4 da constituição).
3. Corpo condicional pelo estado (ver cenários acima).
4. No estado `READY`: período + cobertura → grade de métricas → resumo → destaques → gráfico de passos → gráfico de sono → pontos de atenção → padrões + evidência estatística → sugestões → perguntas para o médico → limitações → avisos (recolhível) → rodapé (modelo + data) → botão "Excluir esta importação".

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| CTA "Importar dados" (estado vazio) | botão | navega para importação | `/import-health-data` | estado vazio ou `FAILED` |
| "Tentar novamente" (erro/travado) | botão | reinicia a busca/polling | mesma tela | estado de erro ou travado |
| Seção "O que não conseguimos ler" | pressable | expande/recolhe a lista de avisos | mesma tela | só quando há avisos |
| "Excluir esta importação" | pressable | `deleteHealthImport` + invalida cache + `router.replace('/health-data')` | mesma tela (volta ao estado vazio ou à importação anterior) | só no estado `READY` |

## 5. Mapa de dados

| Campo/Componente | Origem do dado | Fonte técnica | Tipo | Validação | Comportamento offline/erro |
|---|---|---|---|---|---|
| `healthImport` (importação ativa) | `useHealthImportStatus(importId)` | Amplify Data — `HealthImport.get()`, via **polling** | objeto | — | erro de rede não interrompe o polling (tenta de novo no próximo intervalo) |
| `healthImport` (última pronta) | `useHealthDashboardData()` | Amplify Data — `HealthImport.list()`, cache-first (AsyncStorage) | objeto ou `null` | filtra por `status === 'READY'`, pega a de `updatedAt` mais recente | cache local evita tela vazia em reaberturas rápidas; invalidado após nova importação ou exclusão |
| `summary` (métricas, correlações) | `metricsJson` da linha | JSON serializado pela Lambda | `AnalysisSummary` | `JSON.parse` com fallback `null` — nunca lança | `null` vira o estado "Resultado indisponível" |
| `insights` (texto da IA) | `insightsJson` da linha | JSON serializado pela Lambda, validado por zod no backend antes de gravar | `Insights` | idem | idem |
| Gráficos (passos, sono) | `summary.metrics[].monthly` | resolução **mensal** (não diária — ver `plan.md` §3) | `{month, mean}[]` | mês sem dado fica ausente do array, nunca interpolado | gráfico mostra `emptyMessage` quando não há série suficiente |

## 6. Requisitos não-funcionais específicos

- Nenhum gráfico interpola um dia/mês sem dado — uma lacuna vira quebra visual no traço, nunca uma linha reta inventada (regra 2 da constituição).
- Toda correlação exibida mostra `r` **e** `n` lado a lado com a interpretação em texto — um `r` alto com `n` baixo não deve parecer tão confiável quanto um com `n` alto.
- O banner de apoio informativo aparece em **todos** os estados da tela, não só no sucesso.
- Acessibilidade: todo gráfico tem `accessibilityLabel` resumindo a série em texto (o SVG é invisível para leitor de tela).

## 7. Critérios de aceite

- [x] Estrutura visual usa os componentes/tokens do design system — sem Canvas de origem (ambiguidade documentada).
- [x] Todos os botões do mapa de navegação estão conectados.
- [x] Todos os campos do mapa de dados estão lendo dado real (nenhum mock).
- [x] Estados de vazio/erro/loading/travado implementados.
- [x] Nenhum texto sugere diagnóstico médico definitivo — reforçado estruturalmente pelo schema da resposta da IA (`severidade` não tem nível "grave"/"crítico"; `perguntasParaOMedico` canaliza qualquer suspeita clínica para uma consulta real).
