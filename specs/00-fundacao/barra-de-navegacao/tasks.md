# Tasks — Barra de navegação com o Assistente + Início como porta de entrada

Cada tarefa de comportamento seguiu teste que falha primeiro, falha conferida,
depois implementação.

## Correção prévia (aba acesa em telas que não são abas)
- [x] Teste: `/document-detail` e `/analyte-series` acendem Exames; toda tela de `src/app/(app)/` tem aba declarada (`abaAtivaPorRota.test.ts`). Falhou com `Expected: "exams" / Received: "dashboard"`.
- [x] `ROUTE_TAB_MAP` explícito no lugar de prefixos + "Início" como padrão.

## Barra (D1, D2, D3)
- [x] Teste: ordem Início, Exames, Assistente, Remédios, Mais; aba Assistente com `/ai` e `chatbubble-ellipses`; Consultas no topo do Mais; `/ai` e `/assistant-memory` acendem Assistente; `/appointments` acende Mais. Falhou (7 casos), ex.: `Expected: "more" / Received: "agenda"`.
- [x] `APP_TABS`, `MORE_MENU_ITEMS` e `ROUTE_TAB_MAP` atualizados.
- [x] Rótulo "Assistente" medido em 360dp (plan.md §4): cabe em 13px; plano B "Perguntar" dispensado.

## Formatação da barra (D4, D5)
- [x] Teste: papéis `tab`/`tablist` e uma só aba selecionada. Falhou com `Unable to find an element with role: tab`.
- [x] Teste: ícone inativo em `textSecondary`. Falhou com `Expected: "#55605C" / Received: "#9E9E9E"`.
- [x] Teste: rótulos em 13px. Falhou (sem `fontSize` no estilo; o tamanho estava em className de 10px).
- [x] Teste de guarda: contraste de `textSecondary` sobre `surface` de 4,5:1 ou mais nos dois temas. Passou de primeira (os tokens já atendiam); fica como trava contra regressão de token.
- [x] `BottomTabBar.tsx` atualizado.

## Início (D6, D7)
- [x] Teste: atalhos Consultas, Exames, Remédios e Prevenção, cada um navegando com um toque; sem "Análise IA"; seção antes de "Últimos exames"; linhas de apoio de compromisso, documentos e doses. Falhou (14 de 15), ex.: `Unable to find an element with role: button, name: /^Consultas/`.
- [x] Teste de guarda: sem linha de apoio durante carregamento/erro. Passou de primeira (as linhas ainda não existiam); passou a valer depois da implementação.
- [x] `QuickAccessButton.tsx` redesenhado; `HomeScreen.tsx` e `dashboard.tsx` atualizados.
- [x] `homeCompromissosTela.test.tsx`: asserções de "Amanhã"/"Data inválida" apontadas para o card do compromisso (o texto agora aparece também no atalho).

## Documentação
- [x] Cabeçalhos: `navigation.ts`, `BottomTabBar.tsx`, `QuickAccessButton.tsx`, `(app)/_layout.tsx`, `(app)/more.tsx`, `MoreScreen.tsx`.
- [x] Decisão registrada em `proposta.md`; notas de reconciliação em `specs/00-fundacao/navegacao/spec.md` e `specs/02-perfil-home-agenda/home/spec.md`.

## Pendente
- [ ] Conferência visual em aparelho (360dp e 390dp, claro e escuro), incluindo "Assistente" com a fonte do sistema aumentada (plan.md §4).
