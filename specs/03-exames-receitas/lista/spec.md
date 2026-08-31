# EPIC: Exames e Receitas — Lista, Filtros e Bottom Sheet (Bloco 3)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **3a** ("Exames & Receitas — lista, filtros e bottom sheet") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 236–292).
- Rota/arquivo no código (existente): `src/app/(app)/exams.tsx` (rota `/exams`, aba "Exames" da tab bar) → renderiza `src/screens/ExamsScreen.tsx`, alimentado por `src/hooks/useExamsData.ts`.
- Ator(es): usuário final (paciente), consultando e organizando seu próprio histórico de exames e receitas.
- **Prioridade: P0 — núcleo do MVP** (GAP_ANALYSIS.md, Bloco 3), já com dados reais (DynamoDB `MedicalDocument` + S3), status `ATUALIZAR`.

## 2. História da funcionalidade
Como usuário final, quero ver a lista dos meus exames e receitas, filtrá-la por tipo, buscar por nome e adicionar um novo documento (PDF, imagem ou foto da câmera), para manter meu histórico de saúde organizado e acessível em um só lugar.

### Cenários (Given/When/Then)

- **Estado vazio (nenhum documento ainda):**
  Given o usuário autenticado não possui nenhum `MedicalDocument` salvo
  When a tela `/exams` termina de carregar (`useExamsData` retorna `documents: []`, `isLoading: false`, `errorMessage: null`)
  Then a tela exibe o estado vazio do padrão de 4 estados (`DESIGN_TOKENS.md` §4: ícone 56×56 em tile `#E8F5EE`/`#C7E8D6`, mensagem, CTA primário) em vez da lista — hoje `ExamsScreen` já usa `EmptyState` para "nenhum documento encontrado", mas essa mesma variação de `EmptyState` é reaproveitada tanto para "vazio real" quanto para "busca sem resultados" (ver cenário abaixo); copy e CTA devem distinguir os dois casos (ex.: vazio real → "Você ainda não tem documentos. Adicione seu primeiro exame ou receita." + CTA "Adicionar documento" que abre o bottom sheet; busca sem resultado → "Nenhum documento encontrado" + CTA "Limpar filtros", sem chamar `openSheet`).

- **Carregando:**
  Given a tela `/exams` é aberta ou o usuário puxa para atualizar
  When `useExamsData` está buscando `client.models.MedicalDocument.list()` (ou lendo do cache `AsyncStorage`) e `status === 'loading'`
  Then a tela mostra o padrão de skeleton (`ScreenSkeleton`, já implementado) equivalente ao "Carregando seus dados..." documentado em `DESIGN_TOKENS.md` §4.

- **Sucesso com dados reais:**
  Given existem documentos salvos no DynamoDB (`MedicalDocument`) pertencentes ao usuário autenticado
  When `useExamsData` resolve com `data` preenchido
  Then a lista renderiza um card por documento, cada um com ícone de tipo, nome, linha de meta (tipo · data · [laboratório/local, se disponível]) e badge — ver §5 Mapa de dados para a fonte real de cada campo, incluindo a pendência do badge de status.

- **Erro de rede:**
  Given a chamada a `client.models.MedicalDocument.list()` falha (rede indisponível, erro do Amplify)
  When `useAsyncResource` captura o erro e define `status === 'error'`
  Then a tela exibe o callout de erro padrão (`DESIGN_TOKENS.md` §4: card vermelho, ícone "!", mensagem, botão outline "Tentar novamente") — já implementado via `EmptyState tone="error"` + `onRetry={exams.retry}`, manter.

- **Busca sem resultados:**
  Given o usuário digita um termo no campo de busca (`docSearch`/`searchQuery`) que não corresponde a nenhum `title`/`subtitle` de documento visível no filtro ativo
  When `filterMedicalDocuments` retorna lista vazia
  Then a tela mostra um estado vazio específico de busca ("Nenhum documento encontrado. Ajuste os filtros ou a busca.") — distinto do estado vazio real (sem CTA de "adicionar documento" como ação primária; oferecer "Limpar busca/filtros" em vez disso).

- **Filtro "Alterados" quando não há campo de status real (AMBIGUIDADE — regra 8 da constituição):**
  Given o usuário toca no chip de filtro "Alterados" (`setFilterAlterados`, presente no Canvas 3a)
  When a lista deveria mostrar apenas documentos com status "Alterado" (badge vermelho no Canvas, aplicado a exames)
  Then **hoje isso não é implementável com fidelidade real**: o schema `MedicalDocument` (`amplify/data/schemas/medical-documents.ts`) não tem nenhum campo de resultado/status (`documentType`, `s3FileName`, `documentName`, `documentDate`, `expirationDate` — só isso). Não existe fonte de dado real para "Normal" vs. "Alterado" (isso exigiria parsing de laudo, IA, ou input manual do usuário no upload, nenhum dos quais existe hoje).
  **Interpretação proposta (documentada aqui, não bloqueia execução):** implementar o chip "Alterados" na UI (fidelidade visual ao Canvas) mas, na ausência do campo real, ele filtra **zero documentos sempre** (comportamento correto e honesto, não mockado) — OU, alternativa preferida para não entregar um filtro que nunca funciona: ocultar/desabilitar o chip "Alterados" nesta primeira versão com uma nota/tooltip "Em breve" e registrar como pendência técnica formal em `GAP_ANALYSIS.md` (schema precisa de um campo como `resultStatus: enum('normal','alterado')`, populado manualmente pelo usuário no fluxo de "Adicionar documento" 3b, ou futuramente por IA). Decisão final de qual das duas abordagens fica registrada em `plan.md` desta EPIC.

## 3. Estrutura da página
Ordem visual observada no markup (3a), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock (hora "9:41" + ícone de sinal) — decorativo, não implementar.
2. Título de página "Exames e receitas" (600 26px, `#141817`).
3. Campo de busca "Buscar por nome do exame..." (altura 52px, radius 14, borda 1.5px `#DFE3E1`, fundo `#fff`).
4. Linha de chips de filtro, scroll horizontal: **Todos / Exames / Receitas / Alterados** (altura 48px, radius 999px pill; selecionado = borda+texto `#10794E`/`#0C6341` + fundo `#E8F5EE`, não selecionado = borda `#DFE3E1` + texto `#363D3B`/`#55605C`, conforme padrão de chips de `DESIGN_TOKENS.md` §4).
5. Lista de documentos, scroll vertical, cada card (`#fff`, borda 1px `#EFF1F0`, radius 14, padding 14px, gap 10px entre cards):
   - Ícone de tipo em tile 22×26 com borda 2px `#55605C` (placeholder de documento no Canvas — genérico para exame/receita).
   - Nome do documento (600 17px, `#141817`).
   - Linha de meta (400 16px, `#55605C`): `{Tipo} · {data} · {laboratório/local}` para exames (ex. "Exame · 12/08/2026 · Lab. Vida") ou `{Tipo} · emitida {data}` para receitas (ex. "Receita · emitida 30/06/2026").
   - Badge de status à direita (pill 999px, ícone-círculo 16px + texto 15px 600): 4 variantes vistas no Canvas — Normal (verde, `✓`), Alterado (vermelho, `▲`), Válida (azul, `✓`), Vencida (cinza-neutro, `…`).
6. FAB "+" (56×56, círculo verde `#10794E`, sombra `0 6px 16px rgba(16,121,78,.35)`), posicionado `right:20px; bottom:100px` (acima da bottom nav), abre o bottom sheet (`openSheet`).
7. Bottom navigation bar (5 abas: Início/Consultas/**Exames** ativo/Remédios/Mais).
8. Home-indicator bar decorativa.
9. Bottom sheet condicional (`sheetOpen`, oculto por padrão):
   - Backdrop `rgba(20,24,23,.45)`, fecha ao tocar (`closeSheet`).
   - Painel branco, cantos superiores 24px, título "Adicionar documento" (600 20px).
   - Linha "Enviar PDF ou imagem" (ícone de documento contorno verde `#10794E`, 56px altura, radius 14, borda `#DFE3E1`).
   - Linha "Capturar com câmera" (ícone de câmera contorno azul `#1B63C4`, 56px altura, radius 14, borda `#DFE3E1`).
   - Botão "Cancelar" (fundo `#F7F8F7`, 52px, radius 14, texto centralizado) → `closeSheet`.

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Campo de busca | Input de texto | Atualiza `searchQuery`/filtra lista em memória | Permanece na tela | Sempre visível |
| Chips "Todos"/"Exames"/"Receitas"/"Alterados" | Chips seletores (scroll horizontal) | Atualiza `activeFilter` | Permanece na tela, filtra a lista | "Alterados" com ressalva — ver cenário de ambiguidade acima |
| Card de documento (item da lista) | Item de lista | `setSelectedDocument(document)` + navega | `/(app)/document-detail` (tela 3c, fora deste EPIC) | Sempre visível quando há documentos |
| FAB "+" | Botão flutuante | Abre bottom sheet | Permanece na tela (`sheetOpen = true`) | Sempre visível |
| Backdrop do bottom sheet | Área de toque | Fecha bottom sheet | Permanece na tela (`sheetOpen = false`) | Visível quando `sheetOpen` |
| "Enviar PDF ou imagem" (bottom sheet) | Linha de ação | Abre `expo-document-picker` (`DocumentPicker.getDocumentAsync`), fecha o sheet, navega com params do arquivo | `/add-exam` (tela 3b, fora deste EPIC, já implementada como `AddExamScreen`) | Visível quando `sheetOpen`; hoje já implementado como `pickDocument()` |
| "Capturar com câmera" (bottom sheet) | Linha de ação | **Hoje só fecha o sheet, sem ação real** (`onPress={() => setIsSheetVisible(false)}`) | Deveria abrir a câmera (`expo-image-picker`/`expo-camera`) e, em sucesso, navegar para `/add-exam` com o arquivo capturado, igual ao fluxo de upload | Gap a corrigir — ver `plan.md` |
| "Cancelar" (bottom sheet) | Botão | Fecha bottom sheet | Permanece na tela (`sheetOpen = false`) | Visível quando `sheetOpen` |
| Bottom nav — "Exames" | Aba ativa | N/A (já na tela) | — | Destacada (fundo `#E8F5EE`, texto/ícone `#0C6341`) |
| Bottom nav — outras abas | Navegação | `router.replace(tab.href)` | Início/Consultas/Remédios/Mais | Sempre visível (já implementado via `BottomTabBar`) |

## 5. Mapa de dados

Fonte real única: tabela DynamoDB `MedicalDocument` (`amplify/data/schemas/medical-documents.ts`), lida via `client.models.MedicalDocument.list()` em `src/hooks/useExamsData.ts`. Campos do model: `id`, `documentType` (enum `'exam' | 'prescription'`), `s3FileName` (string, obrigatório), `documentName` (string, obrigatório), `documentDate` (date, obrigatório), `expirationDate` (date, opcional).

| Campo exibido no Canvas (3a) | Origem do dado | Fonte técnica real | Tipo | Observação / pendência |
|---|---|---|---|---|
| Nome do exame/receita (título do card) | Real | `MedicalDocument.documentName` | string | Já mapeado em `useExamsData.ts` → `title` |
| Tipo (Exame/Receita) | Real | `MedicalDocument.documentType` (`'exam'` → "Exame", `'prescription'` → "Receita") | enum | Já mapeado; hoje aparece como chip de tipo dentro de `ExamItem` (`statusLabel`/`statusColor`), **não** como o badge de status da direita do Canvas — ver linha "Badge de status" abaixo |
| Data (documento/exame) | Real | `MedicalDocument.documentDate` (formato `YYYY-MM-DD`) | date | Já formatado via `formatDateForDisplay()` → `DD/MM/YYYY`, mapeado para `subtitle` |
| Data de validade (receita, "Data de validade") | Real, mas **não exibido hoje na lista** | `MedicalDocument.expirationDate` (nullable) | date \| null | Existe no schema e é buscado (`useExamsData.ts` linha 95), mas `subtitle` atual só usa `documentDate` — não compõe a string "emitida DD/MM/YYYY" nem calcula Válida/Vencida a partir dele (ver badge de status abaixo) |
| Laboratório/local (ex. "Lab. Vida") | **Não existe no schema** | — | — | **Genuine gap.** Não há campo `laboratorio`/`local`/`issuer` em `MedicalDocument`. Duas opções a decidir em `plan.md`: (a) adicionar campo opcional `issuer`/`local` ao schema (mudança de schema documentada, regra 5/8 da constituição) preenchido no fluxo de "Adicionar documento" (3b); (b) omitir esse segmento da linha de meta nesta primeira versão (`{Tipo} · {data}` sem o local), fiel aos dados reais disponíveis. Recomenda-se (b) para não introduzir mudança de schema fora do escopo deste EPIC (que é lista/filtros/bottom sheet, não o formulário 3b). |
| Badge de status (Normal/Alterado/Válida/Vencida) | **Não existe no schema** | — | — | **Genuine gap / ambiguidade — regra 8.** Nenhum campo do `MedicalDocument` guarda resultado clínico ("normal"/"alterado") nem estado de validade calculado. Para receitas, "Válida"/"Vencida" **poderia** ser derivado localmente (`expirationDate` vs. `hoje`) sem mudança de schema — isso é viável e recomendado. Para exames, "Normal"/"Alterado" **não tem nenhuma fonte de dado real** (não é um cálculo derivável de nada existente) — exigiria input manual do usuário ou IA, fora do escopo atual. Ver decisão detalhada no cenário "Filtro Alterados" acima e em `plan.md`. |
| Ícone do tipo de documento | Real (derivado) | Derivado de `documentType` (`'exam'` → `flask-outline`, `'prescription'` → `medkit-outline`) | — | Já mapeado em `useExamsData.ts`; visualmente diferente do placeholder genérico do Canvas (retângulo com borda), decisão de interpretação aceitável — ícones semânticos são mais úteis que o placeholder estático do design |
| Categoria de filtro (Todos/Exames/Receitas) | Real (derivado) | `documentType` mapeado para `category: 'Exames' | 'Receitas'` | — | Já mapeado; falta apenas o 4º filtro do Canvas ser "Alterados" em vez do atual "Laudos" (`MedicalDocumentFilter` hoje é `'Todos' | 'Exames' | 'Receitas' | 'Laudos'`) — "Laudos" não existe nem no Canvas nem como `documentType` real; **gap de nomenclatura a corrigir em `plan.md`** |
| Busca por texto | Real (client-side) | `filterMedicalDocuments()` filtra `title`/`subtitle` já carregados (não é uma query ao DynamoDB) | — | Aceitável — volume de documentos por usuário é baixo o suficiente para filtro em memória; documentar como decisão, não pendência |
| Arquivo anexado (PDF/imagem) | Real | S3, via `s3FileName` + `getDocumentDownloadUrl()`/`getUrl` | string (path) | Não exibido diretamente na lista (só no detalhe, 3c), fora de escopo aqui |

Nenhum campo desta tela usa dado mockado (`src/mocks/api/examsApi.ts` existe mas está confirmado como código morto/não usado por `useExamsData.ts` — ver `CODE_INVENTORY.md` §6, item 4). As únicas pendências reais são os dois campos sem fonte de dado no schema (laboratório/local e status de resultado), ambos documentados acima conforme regra 8 da constituição.

## 6. Requisitos não-funcionais específicos
- **Paleta de badges:** usar exatamente os 5 tokens semânticos de `DESIGN_TOKENS.md` §1 (Normal/verde, Alterado/vermelho, Válida/azul, Vencida/neutro-cinza) — nunca cor sozinha, sempre ícone-círculo + texto dentro de pill, conforme regra do Canvas 1a.
- **Chips de filtro:** usar o padrão selecionado/não-selecionado documentado em `DESIGN_TOKENS.md` §4 (Inputs/Chips): selecionado = borda 1.5px `#10794E` + fundo `#E8F5EE` + texto `#0C6341`; não selecionado = borda 1.5px `#DFE3E1` + fundo `#fff` + texto `#363D3B`/`#55605C`.
- **Bottom sheet:** backdrop `rgba(20,24,23,.45)`, painel com radius superior 24px, respeitar a ordem exata das 3 opções (Enviar PDF ou imagem / Capturar com câmera / Cancelar).
- **Toques mínimos:** FAB 56×56 (touch target primário), linhas do bottom sheet ≥48–56dp, chips 48dp de altura, conforme `DESIGN_TOKENS.md` §3.
- **4 estados padrão:** loading/vazio/erro/sucesso conforme `DESIGN_TOKENS.md` §4, já parcialmente implementado — este EPIC deve garantir que o estado vazio distinga "vazio real" de "busca sem resultado" (regra 8, ambiguidade documentada acima).
- **LGPD:** dados exibidos são de saúde sensível (LGPD) — nenhuma mudança de requisito de consentimento nesta tela especificamente (o consentimento já ocorre no onboarding/2a), mas nenhum dado deve ser logado em texto plano além do já existente (`console.log` de debug em `useExamsData.ts`/`examService.ts` deve ser revisto/removido como boa prática, embora não seja um requisito bloqueante desta EPIC).
- **Nenhuma quebra de dados existentes:** qualquer decisão de schema (ex.: adicionar campo de status/laboratório) é aditiva e opcional, nunca destrutiva a documentos já salvos (regra 5 da constituição).

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas 3a: título "Exames e receitas", busca, 4 chips de filtro (Todos/Exames/Receitas/Alterados — nomenclatura corrigida de "Laudos" para "Alterados"), lista de cards com badge à direita, FAB, bottom sheet com as 3 opções na ordem certa.
- [ ] Filtros "Todos"/"Exames"/"Receitas" funcionam com dado real (`documentType`).
- [ ] Filtro "Alterados" implementado conforme a interpretação escolhida em `plan.md` (desabilitado com nota "Em breve" OU sempre vazio) — nunca simula dados falsos.
- [ ] Busca por texto funciona sobre os documentos já carregados.
- [ ] Badge de status "Válida"/"Vencida" calculado localmente a partir de `expirationDate` vs. data atual para receitas (sem mudança de schema).
- [ ] Badge de status "Normal"/"Alterado" para exames: **não implementado com dado falso** — ausência tratada conforme decisão documentada (ex.: badge omitido para exames até existir campo real, ou tela states isso explicitamente).
- [ ] Estado vazio real (nenhum documento) distinto do estado "busca sem resultado", cada um com copy/CTA apropriados.
- [ ] Estado de carregamento (skeleton) e erro (callout + retry) preservados/conformes a `DESIGN_TOKENS.md` §4.
- [ ] FAB abre bottom sheet; "Enviar PDF ou imagem" já funcional (mantém `pickDocument()`); "Capturar com câmera" passa a abrir a câmera de fato (gap corrigido) ou, se mantido como placeholder nesta fase, documentado explicitamente como pendência técnica (não apenas fechar o sheet silenciosamente).
- [ ] Nenhum dado mockado: toda a lista vem de `client.models.MedicalDocument.list()` real (já satisfeito hoje).
- [ ] Card de documento navega para `/(app)/document-detail` (3c) via `DocumentContext`, preservado.
