# PLAN: Exames e Receitas — Lista, Filtros e Bottom Sheet (Bloco 3)

## 1. Diagnóstico — estado atual vs. design

Leitura de `src/screens/ExamsScreen.tsx` (renderizado por `src/app/(app)/exams.tsx`, dados de `src/hooks/useExamsData.ts`) comparado ao markup da tela 3a.

| Elemento do design | Existe hoje? | Detalhe do gap |
|---|---|---|
| Título "Exames e receitas" | Parcial | Hoje o `ScreenHeader` mostra "Exames & Receitas" com subtítulo extra ("Seus documentos ficam organizados..."), que não existe no Canvas (Canvas só tem o título 600 26px, sem subtítulo). Divergência menor — decisão de interpretação (regra 8): manter subtítulo é aceitável (ajuda contexto), mas o botão "+" do header duplica o FAB (ver abaixo). |
| Campo de busca | Sim, mas estilo diverge | Hoje é um `TextInput` dentro de `View` com borda/fundo genéricos do tema atual (`app-inputBackground`), placeholder "Buscar exames, receitas..." (Canvas: "Buscar por nome do exame..."). Altura/radius não confirmados batendo com 52px/14px do token. **Gap a corrigir.** |
| Chips de filtro Todos/Exames/Receitas/**Alterados** | Parcial, nomenclatura errada | `FilterChips` hoje usa `filterOptions = ['Todos','Exames','Receitas','Laudos']` (de `getMedicalDocumentFilters()` em `useExamsData.ts`) e `MedicalDocumentFilter` type em `src/types/models.ts` fixa isso. O Canvas pede **"Alterados"**, não "Laudos" — "Laudos" não corresponde a nenhum `documentType` real (só existem `'exam'`/`'prescription'`) e nunca filtra nada de fato hoje (bug latente: filtro morto). **Gap a corrigir**: trocar "Laudos" por "Alterados" no tipo e no hook. |
| Estilo dos chips (selecionado/não-selecionado) | Não bate com tokens | `FilterChips.tsx` usa `COLORS.primary` genérico (do `theme.ts` atual, `#00C853`/Material) para o estado ativo, com texto branco — o Canvas usa fundo `#E8F5EE` + texto `#0C6341` (nunca fundo sólido saturado + texto branco) para chips selecionados. **Gap a corrigir**, dependente também da correção de paleta da Fundação (`specs/00-fundacao/design-tokens`). |
| Card de documento — ícone | Parcial | `ExamItem` usa ícones Ionicons semânticos (`flask-outline`/`medkit-outline`) coloridos por tipo — Canvas usa um placeholder retangular genérico com borda `#55605C`. Decisão de interpretação (regra 8): manter ícones semânticos, mais úteis, documentado em `spec.md`. |
| Card de documento — linha de meta (tipo · data · local) | Parcial | Hoje `ExamItem` mostra um chip de tipo (`typeChip`) + data (`date`) na `metaRow` — texto "Exame"/"Receita" como pill colorida, não como texto plano concatenado `"Exame · 12/08/2026 · Lab. Vida"` do Canvas. Falta o segmento de laboratório/local (campo inexistente no schema, ver `spec.md` §5). **Gap de composição de string a corrigir** (mesmo sem o campo de local). |
| Badge de status (Normal/Alterado/Válida/Vencida) | **Não existe — maior gap** | O que `ExamItem` chama de `statusLabel`/`statusColor` hoje é, na verdade, o **tipo** do documento (Exame=âmbar `#FBBF24`, Receita=azul `#3B82F6`), reaproveitando o slot visual que no Canvas é reservado para o **badge de status à direita** (Normal/Alterado/Válida/Vencida). Ou seja: a peça de UI existe (badge à direita), mas está carregando o dado errado — hoje ela duplica a informação de tipo que já está na linha de meta, e nunca mostra o status real do Canvas. Isso é o gap central desta EPIC, tratado em detalhe no §2 abaixo. |
| FAB "+" | Sim, mas duplicado | `ExamsScreen` tem **dois** pontos de entrada para abrir o bottom sheet: o botão "+" no `ScreenHeader.action` (canto superior) e o FAB de rodapé (`right:20,bottom:100` no Canvas). O `ScreenHeader` "+" não existe no Canvas 3a. Além disso há um terceiro `Button title="+ Adicionar novo documento"` full-width dentro do corpo da tela — três CTAs redundantes para a mesma ação, nenhum deles posicionado como o Canvas (FAB flutuante fixo). **Gap a corrigir**: manter apenas o FAB flutuante fixo (posição absoluta, canto inferior direito), remover o botão do header e o botão full-width do corpo. |
| Bottom sheet — "Adicionar documento" | Sim, componente genérico reaproveitável | `src/components/BottomSheet.tsx` já existe: `Modal` com `visible`/`title`/`description`/`onClose`/`children`, backdrop, handle, radius superior — estruturalmente equivalente ao Canvas (backdrop `rgba(20,24,23,.45)`, painel branco com radius 24px no topo, handle). **Reaproveitar, não criar um novo componente.** Ajustes finos: o Canvas não tem `description` abaixo do título (hoje `ExamsScreen` passa "Selecione o tipo de documento para adicionar." — divergência menor, aceitável ou removível). |
| Bottom sheet — "Enviar PDF ou imagem" | Sim, funcional | `pickDocument()` já usa `expo-document-picker`, fecha o sheet e navega para `/add-exam` (3b) com os parâmetros do arquivo — mapeamento correto ao fluxo real (3a → 3b). Precisa apenas de ajuste visual (ícone verde `#10794E`, contorno de documento) para bater com o Canvas; hoje é um `Button` primário full-width genérico, não a "linha" de 56px com ícone + texto alinhados à esquerda que o Canvas desenha. **Gap visual a corrigir**, sem mudar a lógica. |
| Bottom sheet — "Capturar com câmera" | **Não funcional** | Hoje é um `Button variant="secondary"` que só fecha o sheet (`onPress={() => setIsSheetVisible(false)}`) — nenhuma câmera é aberta. **Gap funcional real a corrigir**: usar `expo-image-picker` (`ImagePicker.launchCameraAsync`) ou `expo-camera`, seguindo o mesmo padrão de `pickDocument()` (fechar sheet, navegar para `/add-exam` com os params do arquivo capturado). Nenhuma lib de câmera nova precisa ser instalada além de `expo-image-picker` — confirmar se já está no `package.json`; se não estiver, é a única adição de dependência desta EPIC, justificada pela regra 3 da constituição (preenche lacuna real, biblioteca padrão do ecossistema Expo). |
| "Cancelar" (bottom sheet) | Sim | Já fecha o sheet corretamente (`onClose`). |
| Bottom nav "Exames" ativo | Sim, já implementado globalmente | `BottomTabBar`/`AppShell` já cuidam disso de forma compartilhada; fora do escopo desta EPIC (é item de Fundação). |

## 2. O gap central: badge de status sem dado real

O Canvas 3a reserva o slot visual à direita de cada card para um **badge de resultado/validade** (Normal/Alterado para exames; Válida/Vencida para receitas), distinto da informação de **tipo** (Exame/Receita), que aparece como texto simples na linha de meta.

O schema real (`amplify/data/schemas/medical-documents.ts`) só tem: `documentType`, `s3FileName`, `documentName`, `documentDate`, `expirationDate`. **Não há nenhum campo de resultado clínico.**

Decisão proposta para este EPIC (documentada aqui, per regra 8 — ambiguidade documentada, não trava execução):

1. **Receitas → "Válida"/"Vencida": implementável sem mudança de schema.** `expirationDate` já existe e é obrigatório coletar no formulário de receita (3b, `validateExamDocument` já exige `expirationDate` para `documentType === 'prescription'`). Comparar `expirationDate` com a data atual, no client, para derivar o badge — **fazer isso nesta EPIC.**
2. **Exames → "Normal"/"Alterado": não implementável com dado real hoje.** Não existe fonte alguma (nem no schema, nem derivável de outro campo). Duas opções, a escolher no momento da implementação (não bloqueante):
   - **Opção A (recomendada):** omitir o badge de status para exames nesta primeira versão — mostrar apenas o tipo (texto na linha de meta) sem badge à direita, deixando claro visualmente que não há avaliação de resultado disponível. Fiel à regra 2 (nenhum dado mockado).
   - **Opção B:** propor mudança de schema (`resultStatus: enum('normal','alterado')`, opcional, preenchido manualmente pelo usuário no fluxo 3b "Adicionar documento") — isso é uma mudança de escopo maior (toca o formulário 3b, fora deste EPIC de lista/filtros) e deve ser levantada como pendência formal em `GAP_ANALYSIS.md` antes de ser implementada, não decidida unilateralmente aqui.
   - Este EPIC (3a) implementa a **Opção A** por padrão; se o time decidir pela Opção B, o `spec.md`/`plan.md` de 3b precisa ser atualizado primeiro.
3. **Filtro "Alterados":** com a Opção A, o filtro "Alterados" nunca terá resultados (nenhum documento tem esse status real). Em vez de deixar o chip aparentemente funcional mas sempre vazio (confuso para o usuário), a recomendação é **desabilitar visualmente o chip com indicação "Em breve"** (mesma família de token neutro/desabilitado) em vez de escondê-lo — preserva a fidelidade estrutural ao Canvas (o chip existe) sem fingir uma funcionalidade que não existe.

## 3. Escopo da mudança

**Fora de escopo / não tocar:**
- `amplify/data/schemas/medical-documents.ts` — nenhuma mudança de schema nesta EPIC (Opção A do §2). Se o time optar pela Opção B no futuro, isso vira uma EPIC/decisão separada.
- `src/services/examService.ts` — lógica de upload/CRUD para S3+DynamoDB permanece intacta; único uso novo é reaproveitar o mesmo padrão de navegação (`router.push('/add-exam', {...})`) para o fluxo de câmera.
- `/add-exam` (`AddExamScreen`, tela 3b) e `/document-detail` (`DocumentDetailScreen`, tela 3c) — ambas fora do escopo desta EPIC (têm seus próprios `spec.md`/`plan.md`), esta EPIC só precisa navegar corretamente para elas.
- `src/hooks/useAsyncResource.ts`, `src/contexts/DocumentContext.tsx` — reaproveitados como estão.

**Dentro de escopo:**
- `src/types/models.ts` — trocar `MedicalDocumentFilter` de `'Todos' | 'Exames' | 'Receitas' | 'Laudos'` para `'Todos' | 'Exames' | 'Receitas' | 'Alterados'`; adicionar campo derivado de status de validade ao `MedicalDocument` (ex.: `validityStatus?: 'valida' | 'vencida'` calculado, não persistido).
- `src/hooks/useExamsData.ts` — `getMedicalDocumentFilters()` atualizado; `fetchMedicalDocuments()`/transformação passa a calcular `validityStatus` para receitas a partir de `expirationDate` vs. hoje; filtro "Alterados" tratado conforme decisão do §2 (sempre vazio ou chip desabilitado — a decisão de UI fica em `ExamsScreen`, o hook só precisa não quebrar ao filtrar por um valor sem correspondência).
- `src/components/ExamItem.tsx` — separar visualmente "tipo" (texto simples na meta, não mais pill colorida) do "badge de status" (novo elemento, pill com ícone-círculo, só renderizado quando há status real: Válida/Vencida para receitas; ausente para exames na Opção A).
- `src/components/FilterChips.tsx` — realinhar cores ao padrão de chips de `DESIGN_TOKENS.md` §4 (depende de a Fundação já ter corrigido os tokens globais; se não, aplicar localmente como fallback documentado, mesmo padrão usado no EPIC de Login).
- `src/screens/ExamsScreen.tsx` — remover os CTAs redundantes (botão "+" do header, botão full-width do corpo), manter só o FAB fixo; ajustar campo de busca (placeholder, altura, radius); ajustar as duas linhas do bottom sheet para o layout "linha com ícone + texto" do Canvas em vez de `Button`s empilhados; implementar "Capturar com câmera" com `expo-image-picker`; distinguir estado vazio real de "busca sem resultado".
- `src/screens/ExamsScreen.tsx` (ou um novo pequeno helper) — copy separada para os dois casos de estado vazio (ver `spec.md` §2).

## 4. Componentes a reaproveitar (Fundação / já existentes)

Nenhum componente novo precisa ser criado do zero — tudo já existe e será estendido:

- `BottomSheet` (`src/components/BottomSheet.tsx`) — reaproveitar como está para a estrutura geral (backdrop, painel, handle, título). Não recriar.
- `ExamItem` (`src/components/ExamItem.tsx`) — estender para suportar um badge de status opcional separado do tipo (nova prop, ex. `validityStatus?: { label: string; color: string; icon: string }`), mantendo retrocompatibilidade (prop opcional, quando ausente não renderiza o badge — caso dos exames na Opção A).
- `FilterChips` (`src/components/FilterChips.tsx`) — reaproveitar, apenas realinhar cores/tokens; considerar suportar um estado "desabilitado" por opção (para o chip "Alterados" com nota "Em breve", se essa rota for escolhida).
- `EmptyState` (`src/components/EmptyState.tsx`) — já suporta `icon`/`title`/`description`/`tone`/`actionLabel`/`onActionPress`; reaproveitar duas vezes com props diferentes (vazio real vs. busca sem resultado), sem precisar de um novo componente.
- `ScreenSkeleton`, `Section`, `ScreenHeader` — reaproveitar como estão.
- `Button` — reaproveitar para o CTA do estado vazio; não usar `Button`s genéricos dentro do bottom sheet (trocar por linhas customizadas de 56px como no Canvas, ou estender `Button` com uma variante "linha com ícone à esquerda" se fizer sentido reutilizar em outras telas do Bloco 3 — avaliar no momento da implementação).
- **Dependência nova possível:** `expo-image-picker` para "Capturar com câmera" — confirmar se já está instalado antes de adicionar; se precisar, é a única lib nova desta EPIC, justificada pela regra 3 (lacuna real: câmera nativa, biblioteca padrão do ecossistema Expo, amplamente adotada).

## 5. Riscos / decisões a documentar

- **Renomear filtro "Laudos" → "Alterados":** é uma mudança de contrato de tipo (`MedicalDocumentFilter`) que pode ter efeitos em outros lugares que importam esse tipo — checar usos antes de renomear (grep por `MedicalDocumentFilter` e `'Laudos'` no repo).
- **Badge de status ausente para exames (Opção A):** decisão consciente de não mockar dado, mas gera uma tela "menos rica" que o Canvas mostra (que tem badge para todo item). Deve ficar claro ao revisor/orientador do TCC que essa é uma lacuna de dado real, não de implementação — já registrado em `GAP_ANALYSIS.md` como pendência a ser considerada (adicionar ao item de pendências técnicas conhecidas se ainda não constar).
- **Campo de laboratório/local:** decisão de omitir da linha de meta (Opção b do `spec.md` §5) evita mudança de schema fora de escopo, mas se afasta visualmente do Canvas (que sempre mostra 3 segmentos). Alternativa (adicionar campo ao schema) fica registrada como possível follow-up, não implementada aqui.
- **Três CTAs de "adicionar documento" viram um (FAB único):** mudança de UX perceptível — reduz redundância mas remove um atalho existente (botão full-width). Justificativa: fidelidade ao Canvas, que só tem o FAB.
- **"Capturar com câmera" hoje é enganoso** (parece funcional, só fecha o sheet) — corrigir é tanto fidelidade ao design quanto correção de um bug de UX (usuário toca, sheet fecha, nada acontece, sem feedback).
