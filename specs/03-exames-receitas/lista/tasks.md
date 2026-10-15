# TASKS: Exames e Receitas — Lista, Filtros e Bottom Sheet (Bloco 3)

## Tipos e dados

- [x] `src/types/models.ts`: trocar `MedicalDocumentFilter` de `'Todos' | 'Exames' | 'Receitas' | 'Laudos'` para `'Todos' | 'Exames' | 'Receitas' | 'Alterados'`. Grep por todo uso de `'Laudos'`/`MedicalDocumentFilter` no repo antes de renomear, para não quebrar nenhum outro consumidor.
- [x] `src/types/models.ts`: adicionar campo opcional derivado ao `MedicalDocument` para status de validade de receitas (`validityStatus?: 'valida' | 'vencida' | null` — tipo `DocumentValidityStatus`; a resolução de cor/ícone fica no componente via `useThemeColors()`, não no dado, para preservar dark mode reativo), sem tocar o schema Amplify.
- [x] `src/hooks/useExamsData.ts` (`getMedicalDocumentFilters`): atualizar lista de filtros para `['Todos', 'Exames', 'Receitas', 'Alterados']`.
- [x] `src/hooks/useExamsData.ts` (`fetchMedicalDocuments`/transformação): para `documentType === 'prescription'`, calcular `validityStatus` comparando `expirationDate` com a data atual (Válida se `expirationDate >= hoje`, Vencida se `< hoje`). Para `documentType === 'exam'`, não popular `validityStatus` (Opção A do `plan.md` — sem dado real de resultado).
- [x] `src/hooks/useExamsData.ts` (`filterMedicalDocuments`): decidir e implementar o comportamento do filtro "Alterados" (retorna lista vazia sempre, já que nenhum documento tem esse status real — não inventar dado para preencher).
- [x] Confirmar que `src/mocks/api/examsApi.ts` continua não sendo importado por nada desta EPIC (código morto confirmado em `CODE_INVENTORY.md`) — não reativar. (Ajustado `src/mocks/exams.ts` apenas para continuar compilando com o novo shape de `MedicalDocument`/`MedicalDocumentFilter`.)

## `src/components/ExamItem.tsx`

- [x] Separar "tipo" (Exame/Receita) do "badge de status": tipo passa a ser texto simples dentro da linha de meta (`"{Tipo} · {data}"`), não mais a pill colorida atual.
- [x] Adicionar prop opcional de badge de status (pill com ícone-círculo 16px + texto, cores dos 5 tokens semânticos de `DESIGN_TOKENS.md` §1) — renderizado só quando o dado existir (receitas com `validityStatus`); ausente para exames nesta versão.
- [x] Confirmar que a mudança é retrocompatível (prop nova opcional) — não quebra nenhum outro uso de `ExamItem` fora desta tela (grep antes de alterar a assinatura — único consumidor é `ExamsScreen.tsx`, atualizado na mesma passada).

## `src/components/FilterChips.tsx`

- [x] Realinhar cores de estado selecionado/não-selecionado aos tokens do Canvas (`#10794E`/`#E8F5EE`/`#0C6341` selecionado; `#DFE3E1`/`#fff`/`#363D3B`-`#55605C` não selecionado) — já usava os tokens de tema corretos (`colors.primary`/`colors.primarySoft`/`colors.primaryDark`), preservado; adicionado scroll horizontal (Canvas 3a §3) que faltava.
- [x] Avaliar suporte a um estado "desabilitado" por chip (para "Alterados" com indicação "Em breve") — implementado via prop `disabledOptions`.

## `src/screens/ExamsScreen.tsx`

- [x] Remover o botão "+" do `ScreenHeader.action` (duplicata do FAB, ausente no Canvas).
- [x] Remover o `Button title="+ Adicionar novo documento"` full-width do corpo da tela (terceiro CTA redundante).
- [x] Reposicionar o FAB como elemento de posição absoluta fixa (`right: 20, bottom: 100`, 56×56, círculo verde, sombra), como único ponto de entrada para abrir o bottom sheet, igual ao Canvas.
- [x] Ajustar campo de busca: placeholder "Buscar por nome do exame...", altura 52px, radius 14px, borda 1.5px `#DFE3E1`.
- [x] Distinguir estado vazio real ("Você ainda não tem documentos..." + CTA "Adicionar documento" → abre bottom sheet) do estado "busca sem resultado" ("Nenhum documento encontrado..." + CTA "Limpar filtros", sem abrir o sheet).
- [x] Bottom sheet: trocar os dois `Button`s empilhados por linhas de 56px estilo Canvas (ícone à esquerda + texto), mantendo `pickDocument()` na primeira linha.
- [x] Bottom sheet — "Capturar com câmera": implementado de fato com `expo-image-picker` (`ImagePicker.launchCameraAsync`), seguindo o mesmo padrão de `pickDocument()` (fecha sheet, `router.push('/add-exam', { fileName, filePath, fileSize })`). `expo-image-picker` não estava no `package.json` — adicionado via `expo install expo-image-picker` (única dependência nova desta EPIC, conforme regra 3 da constituição: preenche lacuna real de câmera nativa, biblioteca padrão do ecossistema Expo). Plugin registrado em `app.json` com `cameraPermission` customizado.
- [x] Solicitar permissão de câmera (`ImagePicker.requestCameraPermissionsAsync`) antes de abrir, com tratamento de permissão negada (mensagem amigável dentro do bottom sheet, sem crash).
- [x] Passar `validityStatus` (quando existir) do `document` para o novo prop de badge do `ExamItem`.

## Validação final

- [x] Comparar estrutura/estilos do código contra o Canvas 3a (busca, 4 chips com nomenclatura correta, cards com badge à direita só quando há dado real, FAB único, bottom sheet com as 3 linhas) — revisão feita linha a linha contra `spec.md`/`plan.md`/`DESIGN_TOKENS.md`.
- [ ] Rodar o app (Expo) em simulador/dispositivo e testar interativamente os cenários do `spec.md`: vazio real, carregando, sucesso com dados reais, erro de rede, busca sem resultado, filtro "Alterados". **Não executado nesta rodada** — ambiente de implementação não tem simulador/dispositivo conectado; `npm run typecheck`/`npm run lint` passam, mas fica pendente de QA manual/dispositivo real antes do merge.
- [x] Confirmar que nenhum dado de status "Normal/Alterado" é exibido para exames sem fonte real (checar que não sobrou nenhum valor fixo/mock no código) — `validityStatus` só é calculado para `documentType === 'prescription'`.
- [ ] Confirmar em dispositivo real que "Capturar com câmera" efetivamente abre a câmera e completa o fluxo até `/add-exam` — implementado com `expo-image-picker`/permissão, mas requer verificação em build nativo (câmera não funciona em ambiente typecheck/lint).
- [x] Confirmar que `amplify/data/schemas/medical-documents.ts` não foi alterado (fora de escopo desta EPIC).
- [x] Atualizar `GAP_ANALYSIS.md` se a decisão final divergir do que está registrado ali — decisão implementada (badge omitido para exames, filtro "Alterados" desabilitado com "Em breve") já coincide com o item 17 de `GAP_ANALYSIS.md`; nenhuma atualização necessária.
