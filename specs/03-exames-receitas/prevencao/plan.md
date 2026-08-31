# PLAN: Prevenção & Alertas — Recomendações USPSTF (3e)

> **Status desta EPIC: IMPLEMENTADA.** A proposta original abaixo (§2, preservada como histórico/rastreabilidade — regra 6 da constituição) foi **superada** por decisão humana: durante a Fase 0 de descoberta, identificou-se que a branch `feat/exame_sugest` (divergente de `feat/front-end`, não mesclada, ponto de divergência em `899bf13`) já continha uma integração real e testada para este mesmo problema — a **Prevention TaskForce API da AHRQ/USPSTF**, via função Lambda (`get-prevention-recommendations`) que faz Scan no DynamoDB pelo `UserProfile` do usuário e retorna recomendações graduadas (A/B/C/D/I). Decisão confirmada: portar esse backend como está e reconstruir a UI com os componentes/tokens do design system atual — ver §3 "Arquitetura real implementada".

## 1. Objetivo
Substituir `src/mocks/api/preventionApi.ts` (mock 100% estático) por uma fonte de dado real para a tela `/prevention` (3e). **Resultado:** integração com a API pública USPSTF/AHRQ via função Lambda, não a heurística textual originalmente proposta em §2.

## 2. [HISTÓRICO — SUPERADO] Proposta original de decisão de fonte de dados

### 2.1 Tabela de regras preventivas (idade/sexo → itens recomendados)
Proposta: arquivo estático `src/config/preventionRules.ts` (ou `src/services/preventionRulesService.ts` se envolver lógica, não só dados) com uma lista de regras no formato:

```
{
  id: 'colonoscopia',
  title: 'Colonoscopia',
  minAge: 45,
  sex: 'ambos',              // 'Masculino' | 'Feminino' | 'ambos'
  intervalMonths: 60,
  matchKeywords: ['colonoscopia'],
  metaLabelWhenOk: (date) => `Realizado em ${date}`,
  metaLabelWhenOverdue: () => 'Recomendada a cada 5 anos',
}
```
4 regras iniciais cobrem exatamente os itens do Canvas 3e (Colonoscopia, Vacina da gripe, Exame de vista, Pressão arterial) — suficiente para não regredir a fidelidade visual, mas a tabela pode crescer sem mudança de schema.

### 2.2 Cruzamento com dados reais — Opção A (recomendada) vs. Opção B
- **Opção A — heurística textual (menor esforço, reaproveita 100% do schema atual):** para cada regra, buscar em `MedicalDocument.list()` (e, para itens não-exame, em `Appointment.list()`) um registro cujo `documentName`/`appointmentName` contenha (case-insensitive, normalizado) alguma das `matchKeywords` da regra. Se encontrado e dentro do intervalo → "Em dia"; se encontrado e fora do intervalo → "Atrasado"; se nunca encontrado → "Pendente" (nunca realizado, sem registro).
  - Risco reconhecido: nomes de documentos livres digitados pelo usuário podem não bater com as keywords (ex. "Colono 2024.pdf" não contém "colonoscopia"). Mitigação de curto prazo: manter a lista de keywords generosa (sinônimos comuns) e tratar falha de correspondência como "Pendente" (nunca falso "Em dia"), o que é o comportamento seguro.
  - **Pressão arterial** é um caso especial: não é um documento nem um agendamento no schema atual — não há fonte real alguma para "Última verificação: hoje". Proposta: **remover este item do checklist real nesta fase** (documentar como pendência, não simular) até existir uma fonte (ex.: entrada manual do usuário, futuro registro de sinais vitais) — ou, alternativa, tratá-lo permanentemente como "Pendente" sem nunca poder ficar "Em dia", o que é enganoso. Recomenda-se a primeira opção (omitir o item até haver fonte real), a confirmar.
- **Opção B — novo model `PreventiveCheckOverride` ou campo estruturado em `MedicalDocument`:** adicionar um campo opcional `examCategory` (enum) ao schema `MedicalDocument`, preenchido pelo usuário no fluxo de upload (tela 3b), permitindo correspondência exata em vez de heurística textual. Mais robusto, mas (a) é uma mudança de schema fora do escopo original desta tela, (b) exige alterar a tela 3b (fora do escopo desta EPIC), (c) não resolve o caso "Pressão arterial" (que não é um documento). Registrado aqui como alternativa caso a revisão humana julgue a Opção A frágil demais para produção/TCC.

**Recomendação desta EPIC: Opção A**, por ser aditiva, não tocar em outras telas/EPICs já entregues (3a/3b), e ser suficiente para o escopo do TCC (protótipo funcional, não produto em escala). A decisão final fica registrada aqui após revisão humana.

### 2.3 Cálculo do score
`score = round((itens "Em dia" / itens aplicáveis ao perfil) * 100)`. "Itens aplicáveis" exclui regras cujo `minAge`/`sex` não batem com o perfil do usuário (ex. usuário de 30 anos não é penalizado por não ter feito colonoscopia, cuja regra só vale a partir de 45). Faixas de badge propostas (ajustar em revisão):
- score ≥ 80 → "Muito bom" (ícone ✓ verde)
- 50 ≤ score < 80 → "Bom" (mesmo ícone ✓ verde, mantendo simplicidade visual do Canvas que só mostra uma variante)
- score < 50 → "Atenção" (ícone ! âmbar, reaproveitando o token semântico de warning)

Se `itens aplicáveis == 0` (perfil incompleto ou nenhuma regra aplicável), a seção de score não é exibida com número — cai no cenário "checklist vazio" do `spec.md`.

### 2.4 Alerta urgente
Derivado, não persistido: `itens com status 'Atrasado', ordenados por dias de atraso desc`. Se houver ao menos um, o card "Urgente" mostra o primeiro (mais atrasado), com descrição gerada por template: `"Sua {título, minúsculo} de rotina está atrasada há {N} {meses|dias}."`. CTA "Agendar agora" navega para `/(app)/add-appointment` passando `appointmentName`/`appointmentType` sugeridos via params (mesmo padrão de navegação com dados pré-preenchidos já usado em outras EPICs deste Bloco, a confirmar contra `AddAppointmentScreen` atual).

### 2.5 Banner de campanha de vacinação (dependência bloqueante de 4e)
**Decisão proposta: não implementar com conteúdo real nesta EPIC.** Duas sub-opções:
- (a) Ocultar completamente o banner até a EPIC de 4e ("Carteira de vacinação") definir seu schema (`VaccinationRecord` ou reaproveitamento de `MedicalDocument`), e então esta EPIC (3e) ganha uma tarefa de follow-up para consultar essa mesma fonte.
- (b) Implementar o banner como conteúdo institucional estático/hardcoded (não é "dado do usuário", é aviso de saúde pública) — tecnicamente não viola a regra 2 da constituição (que fala de dado exibido *como se fosse do usuário*), mas mistura uma campanha fixa não configurável, que ficaria desatualizada (a data "30/09" é fixa) sem manutenção.

**Recomendação: (a)**, por consistência de longo prazo e para não introduzir uma segunda fonte de "dado de vacinação" que precisaria ser reconciliada com 4e depois. Ambas as opções ficam registradas para decisão humana.

## 3. Arquitetura real implementada

### 3.1 Fluxo ponta a ponta
```
PreventionScreen (UI)
  ← usePreventionData (hook)
      ← preventionService.getPreventionRecommendations() (client Amplify Data)
          ← query customizada "getPreventionRecommendations" (amplify/data/schemas/prevention.ts)
              ← handler.ts (Lambda, resourceGroupName: 'data')
                  1. autentica via AppSync identity (sub/username)
                  2. Scan no DynamoDB (tabela UserProfile) filtrando por owner
                  3. fetchUspstfDataset() → chama a API do USPSTF/AHRQ com USPSTF_API_KEY (secret)
                  4. filterRecommendations() → filtra dataset completo por idade/sexo/IMC do perfil
                  5. retorna { recommendations, lastUpdated, profileComplete }
  → lembretes: reminderService.ts (expo-notifications, 100% local/on-device)
  → preferências de intervalo por grau: useReminderPreferences + ProfileScreen
```

### 3.2 Arquivos por camada (portados de `feat/exame_sugest` para `feat/front-end`)

**Backend (AWS Amplify Gen 2 / Lambda)** — portados verbatim, sem acoplamento ao design system:
- `amplify/functions/get-prevention-recommendations/resource.ts` — define a Lambda, injeta `USPSTF_API_KEY` via `secret()`, `resourceGroupName: 'data'` (evita dependência circular data↔function), timeout 15s.
- `amplify/functions/get-prevention-recommendations/handler.ts` — autentica, faz **Scan** no DynamoDB por `owner` (não Query — ver nota de risco em §4), busca o dataset USPSTF, filtra e retorna.
- `amplify/functions/get-prevention-recommendations/uspstfClient.ts` — cliente HTTP puro (`fetch` no endpoint da API), tipagem do dataset.
- `amplify/functions/get-prevention-recommendations/uspstfFilter.ts` — `computeAge`, `computeBmiBucket`, `mapSex`, `filterRecommendations` (idade/sexo/IMC apenas — ver gap conhecido em §4).
- `amplify/functions/get-prevention-recommendations/__tests__/uspstfFilter.test.ts` — testes unitários (10 casos, todos passando após o port).
- `amplify/data/schemas/prevention.ts` — `customType PreventionRecommendation` + query `getPreventionRecommendations` (`allow.authenticated()`), ligado ao handler; spread em `amplify/data/resource.ts` junto aos demais schemas.
- `amplify/backend.ts` — registra `getPreventionRecommendations` no `defineBackend`, concede `grantReadData` da tabela `UserProfile` à Lambda e injeta `USER_PROFILE_TABLE_NAME` como env var (a role de execução da Lambda não carrega o claim `owner` do usuário final, por isso o acesso é direto ao DynamoDB em vez de reusar o client do Amplify Data).

**Frontend — dados e estado** — portados quase verbatim (lógica pura/hooks, sem JSX):
- `src/services/preventionService.ts` — chama a query, mapeia para `PreventionSnapshot`.
- `src/hooks/usePreventionData.ts` — orquestra busca + cruzamento com mapa local de lembretes, expõe `onToggleReminder`/`onEnableRemindersForIds`.
- `src/services/reminderService.ts` — 100% local (`expo-notifications` + `expo-device` + `AsyncStorage`): agenda notificações recorrentes, persiste mapa de lembretes e preferências de intervalo por grau (`DEFAULT_REMINDER_INTERVALS_BY_GRADE`: A=30d, B=60d, C=90d, D=180d, I=90d, ajustável).
- `src/hooks/useReminderPreferences.ts` — hook fino sobre `reminderService` para a tela de Perfil.
- `src/types/models.ts` — `UspstfGrade`, `PreventionRecommendation`, `RecommendationView`, `PreventionSnapshot` (substituem os tipos antigos `PreventiveAlert`/`PreventiveScoreSnapshot`/`PreventiveCheck`, removidos por não terem mais nenhum uso no código).

**Frontend — UI** — reescrita do zero (não copiada verbatim) usando os componentes/tokens do design system atual, mas seguindo a mesma composição de tela já validada em `feat/exame_sugest` (que, por coincidência de datas, já usava os mesmos nomes de componente — `Card`, `Badge`, `EmptyState`, `FilterChips`, `ScreenHeader`, `ScreenSkeleton`, `Section` — hoje presentes e com assinatura compatível em `src/components/`):
- `src/screens/PreventionScreen.tsx` — loading skeleton, estado de erro com retry, estado "perfil incompleto", filtro por grau, botão "ativar todos os lembretes filtrados".
- `src/components/RecommendationCard.tsx` — badge de grau, explicação do grau em português (`GRADE_EXPLAINER_PT`, texto autoral do app), texto oficial da USPSTF via `HtmlText`, botão de sino, citação da fonte.
- `src/components/HtmlText.tsx` — renderiza o HTML da API. **Decisão de dependência:** `react-native-render-html` (proposta original em `feat/exame_sugest`) foi avaliada e **descartada** — última publicação em 2022, peer deps `"*"` sem garantia de suporte a React 19/New Architecture (stack atual: Expo ~54, React 19.1, RN 0.81). Como o HTML retornado pela API é simples (parágrafos, links, negrito), foi implementado um parser próprio de ~30 linhas sem dependência externa — regra 3 da constituição.
- `src/screens/ProfileScreen.tsx` — seção "Lembretes de prevenção" adicionada (não substitui nada existente): lista de graus A–I com intervalo atual, abrindo um `BottomSheet` (componente já existente no design system atual) com as opções de 7/14/30/60/90/180/365 dias.

**Dependências novas instaladas** (`npx expo install`, versão resolvida pelo SDK do projeto): `expo-notifications`, `expo-device`. Adicionadas como `devDependencies` do projeto Node (não do bundle RN): `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb` (usadas só dentro do handler da Lambda, resolvidas em tempo de build pela Amplify — não estavam presentes no projeto antes deste port).

## 4. Riscos e trade-offs documentados (herdados do código-fonte original, ainda válidos)
- **Sem cache do dataset:** `uspstfClient.ts` chama a API completa a cada execução da Lambda. A documentação da AHRQ recomenda cachear o JSON localmente (atualização semanal) — hoje toda abertura da tela dispara uma chamada externa síncrona, com risco de latência e de estourar o timeout de 15s. Não resolvido neste port (fora de escopo — otimização de infraestrutura, não de fidelidade de dado).
- **DynamoDB Scan, não Query:** `handler.ts` usa `ScanCommand` filtrando por `owner` — funciona no MVP, não escala (custo/latência crescem com o tamanho da tabela). Migrar para `Query` com GSI por `owner` é uma melhoria futura, não bloqueante para o escopo do TCC.
- **Filtros incompletos:** `uspstfFilter.ts` só filtra por idade, sexo e IMC. `pregnant`/`tobacco`/`sexuallyActive` do perfil não são usados ainda — gap conhecido, documentado no próprio código (`v1 filters only on dimensions the USPSTF response exposes directly`).
- **Chave de API:** requer o secret `USPSTF_API_KEY` configurado no ambiente Amplify (`ampx sandbox secret set USPSTF_API_KEY` ou equivalente) antes de qualquer deploy real — não incluído neste port (fora do escopo de código estático).
- **Divergência visual do Canvas 3e:** documentada em `spec.md` §3.1 — decisão humana confirmada, não um efeito colateral.
- **Conteúdo em inglês (USPSTF):** mantido verbatim por exigência de direitos autorais da AHRQ — vale confirmar essa exigência com uma fonte citável antes de repetir a justificativa no artigo do TCC (obras do governo federal dos EUA costumam ser domínio público; revisar os termos de uso da AHRQ/USPSTF diretamente).

## 5. Fora de escopo desta EPIC
- Reestruturação da navegação de 5 abas + hub "Mais" (tratada em EPIC de fundação/navegação separada — hoje `/prevention` continua acessível como está até essa EPIC mudar a estrutura).
- Banner de campanha de vacinação de 3e (agora desbloqueado por 4e/`VaccineDose`+`vaccinationCampaigns.ts`, mas não implementado nesta EPIC por decisão explícita — ver `tasks.md` Fase 5).
- Cache do dataset USPSTF, migração Scan→Query, filtros por `pregnant`/`tobacco`/`sexuallyActive` (ver §4) — melhorias de infraestrutura/cobertura, não bloqueiam a entrega funcional desta tela.
