# EPIC: Assistente de IA — Chat Interativo (Bloco 4)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **4a** ("Assistente de IA — chat interativo") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 15–75).
- Rota/arquivo no código (existente): `src/app/(app)/ai.tsx` (rota `/ai`, aba "Mais"/acesso a partir da tab bar) → renderiza `src/screens/ChatBotScreen.tsx`, alimentado por `src/hooks/useChatBot.ts` e `src/services/chatService.ts`.
- Ator(es): usuário final (paciente), buscando orientação informativa sobre seus exames, sintomas e cuidados de saúde.
- **Prioridade: P2** (`GAP_ANALYSIS.md`, Bloco 4), status `ATUALIZAR` — tela existe no código com fidelidade visual parcial e é **100% mock-backed** (`chatService.ts` retorna respostas fixas de um array, sem IA real).
- **Sensibilidade máxima do app quanto a LGPD/responsabilidade da IA** (constituição regra 4): esta é a única tela cujo conteúdo pode ser lido por um usuário como orientação médica. Todo texto de copy desta EPIC deve ser revisado sob essa lente antes de ser considerado aceito.

## 2. História da funcionalidade
Como usuário final, quero conversar com um assistente de IA sobre meus exames e dúvidas de saúde, com sugestões rápidas para começar e acesso ao histórico de conversas anteriores, para tirar dúvidas do dia a dia sem substituir uma consulta médica real.

### Cenários (Given/When/Then)

- **Chat vazio com sugestões (estado inicial de uma nova conversa):**
  Given o usuário abre `/ai` e não enviou nenhuma mensagem nesta conversa (`chatIsEmpty === true` no Canvas; hoje equivalente a `!hasUserMessage` em `ChatBotScreen.tsx`)
  When a tela termina de montar
  Then exibe o título "Como posso ajudar?", subtítulo "Toque em uma sugestão ou digite sua pergunta." e exatamente **3** cartões de sugestão clicáveis (Canvas: "Analisar meu último exame" / "O que significa colesterol alto?" / "Lembrar de tomar remédio") — hoje `ChatBotScreen.tsx` usa 4 `QUICK_PROMPTS` diferentes ("O que significa este exame?", "Qual médico devo procurar?", "Meus resultados estão normais?", "Como interpretar hemograma?") renderizados como chips `flex-wrap`, não como 3 cartões empilhados de 52px — gap de conteúdo e de layout a corrigir (ver `plan.md`).
  O banner de disclaimer (ver requisito não-funcional abaixo) permanece visível mesmo neste estado.

- **Digitando (indicador de "digitando"):**
  Given o usuário enviou uma mensagem e aguarda a resposta do assistente
  When `chatTyping`/`isTyping === true`
  Then a tela mostra uma bolha à esquerda com 3 pontos animados (padrão do Canvas: `display:flex;gap:5px` com 3 círculos 7×7px `#55605C`) — hoje `ChatBotScreen.tsx` mostra uma bolha com o texto literal "Digitando..." em vez do indicador de pontos do Canvas; gap visual a corrigir.

- **Resposta mock recebida:**
  Given o usuário enviou uma mensagem e `chatService.sendMessage` resolve
  When a resposta chega (hoje: uma de 4 strings fixas em `MOCK_RESPONSES`, sorteada, após um delay simulado de 1–2s)
  Then a mensagem do assistente aparece como bolha alinhada à esquerda (fundo `#fff`, borda `#EFF1F0`) e a mensagem do usuário como bolha alinhada à direita — layout já implementado via `MessageBubble`; o **conteúdo** da resposta é mock e deve permanecer explicitamente isolado atrás de uma interface nomeada (ver §6 e `plan.md`), nunca apresentado à UI como se fosse uma resposta real de IA.

- **Erro de rede/falha ao obter resposta:**
  Given a chamada ao serviço de IA falha (hoje: `sendChatMessage` lança exceção — no mock isso nunca ocorre organicamente, mas o `catch` em `useChatBot.ts` já trata o caso)
  When a Promise rejeita
  Then a tela adiciona uma mensagem do assistente com texto de erro amigável ("Desculpe, ocorreu um erro. Tente novamente.") em vez de travar a UI ou deixar o indicador de "digitando" preso — comportamento já implementado em `useChatBot.ts`, deve ser preservado e coberto por teste/QA manual nesta EPIC (simular falha do serviço).

- **Histórico vazio (nunca houve conversa anterior):**
  Given o usuário abre o drawer de histórico (`historyOpen === true`) e não existe nenhuma conversa salva além da atual
  When o drawer renderiza `historyGroups`
  Then deve exibir um estado vazio dentro do drawer (ex.: mensagem "Nenhuma conversa anterior" abaixo do botão "Nova conversa") — **o Canvas não desenha esse estado explicitamente** (o placeholder `hint-placeholder-count="3"` sugere 3 grupos de exemplo), então esta EPIC precisa definir a copy do vazio (ambiguidade documentada, regra 8) já que hoje **o drawer de histórico não existe no código** (ver §5/pendência).

- **Histórico com conversas anteriores (agrupadas):**
  Given existem conversas anteriores persistidas
  When o drawer abre
  Then exibe grupos com cabeçalho (`g.group`, ex.: "Hoje", "Ontem", "Últimos 7 dias" — nomenclatura exata a definir, ver `plan.md`) e, dentro de cada grupo, itens clicáveis com o título/resumo da conversa (`it.title`) que, ao serem tocados (`it.onSelect`), carregam aquela conversa na área de mensagens e fecham o drawer.

## 3. Estrutura da página
Ordem visual observada no markup (4a), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock (hora "9:41" + ícone de sinal) — decorativo, não implementar.
2. Header: botão de histórico (ícone de "relógio/histórico" em tile 48×48, radius 14, borda `#DFE3E1`) + título "Assistente de IA" (600 20px, `#141817`). `onClick` abre o drawer (`openHistory`).
3. **Banner de disclaimer, sempre visível, não dispensável**: fundo `#E9F1FD`, borda `#CBDFFA`, radius 12px, ícone "i" em tile azul `#1B63C4`, texto "Apoio informativo — não substitui avaliação médica." (400 15px, `#14509F`). Não há nenhum "×"/dismiss no Canvas — este banner permanece na tela durante toda a sessão de chat, em todos os estados (vazio, digitando, com mensagens).
4. Área de conteúdo rolável (`flex:1;overflow-y:auto`):
   - **Se vazio** (`chatIsEmpty`): título "Como posso ajudar?" + subtítulo + 3 cartões de sugestão (52px altura, radius 14, borda `#DFE3E1`).
   - Lista de mensagens (`chatMessages`, `sc-for`): bolhas alinhadas conforme `m.align`, cores conforme `m.bg`/`m.border`/`m.color` (usuário à direita em cor de destaque, assistente à esquerda em branco/borda neutra).
   - **Se digitando** (`chatTyping`): bolha à esquerda com 3 pontos animados.
5. Barra de input (`flex:none`): botão de anexo (48×48, ícone de documento contornado), campo de texto (`chatInput`, placeholder "Digite sua pergunta...", altura 48px, radius 14), botão de enviar (círculo 48×48 verde `#10794E` com ícone de "play"/seta).
6. Bottom navigation bar (5 abas, "Mais" ativo neste contexto — 4a é alcançado via "Mais", igual a 3e/4b).
7. Home-indicator bar decorativa.
8. **Drawer de histórico condicional** (`historyOpen`, oculto por padrão):
   - Backdrop `rgba(20,24,23,.45)`, fecha ao tocar (`closeHistory`).
   - Painel branco 296px de largura, deslizando da esquerda, `box-shadow:4px 0 24px rgba(0,0,0,.16)`.
   - Header do drawer: título "Histórico" (600 18px) + botão "×" (40×40, radius 12, fundo `#F7F8F7`) → `closeHistory`.
   - Botão "+ Nova conversa" (altura 48px, radius 14, borda 1.5px `#10794E`, fundo `#E8F5EE`, texto `#0C6341`) → `newChat`.
   - Lista rolável de grupos (`historyGroups`, `sc-for`): cabeçalho de grupo (600 13px, `#55605C`, letter-spacing) + itens (`g.items`, `sc-for`: linha com título truncado em 1 linha, altura mínima 48px, radius 12, `onClick` → `it.onSelect`).

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Botão de histórico (header) | Botão ícone | Abre drawer | Permanece na tela (`historyOpen = true`) | Sempre visível |
| Cartão de sugestão (1 de 3) | Cartão clicável | Preenche/envia a pergunta sugerida | Permanece na tela, inicia envio (equivalente a `sendMessage(promptText)`) | Visível apenas quando `chatIsEmpty` |
| Campo de input | Input de texto | Atualiza `chatInput`/`inputText` | Permanece na tela | Sempre visível |
| Botão de anexo | Botão ícone | Abre `expo-document-picker`, navega com params do arquivo | `/add-exam` (3b) | Sempre visível — já implementado em `ChatBotScreen.tsx` (`handleAttach`); **não existe no Canvas 4a** (gap de design vs. código na direção oposta — código tem uma funcionalidade extra; ver `plan.md` para decisão de manter/remover) |
| Botão de enviar | Botão ícone (círculo) | Envia mensagem (`sendChat`/`sendMessage`) | Permanece na tela, adiciona bolha + aciona `chatTyping` | Habilitado quando há texto e não está digitando |
| Backdrop do drawer | Área de toque | Fecha drawer | Permanece na tela (`historyOpen = false`) | Visível quando `historyOpen` |
| "×" (fechar drawer) | Botão ícone | Fecha drawer | Permanece na tela (`historyOpen = false`) | Visível quando `historyOpen` |
| "+ Nova conversa" | Botão | Limpa mensagens, fecha drawer, volta ao estado vazio | Permanece na tela (equivalente a `clearHistory` hoje, mas hoje não fecha nenhum drawer porque ele não existe) | Visível quando `historyOpen` |
| Item de conversa no histórico (`it.onSelect`) | Item de lista | Carrega aquela conversa salva na área de mensagens, fecha drawer | Permanece na tela | Visível quando `historyOpen` e existe ao menos 1 conversa salva — **depende da pendência de persistência, ver §5** |
| Bottom nav — outras abas | Navegação | `router.replace(tab.href)` | Início/Consultas/Exames/Remédios | Sempre visível (já implementado via `BottomTabBar`) |

## 5. Mapa de dados

Fonte real hoje: **nenhuma**. Toda a conversa vive apenas em `useState` dentro de `useChatBot.ts` (`messages: ChatMessage[]`), perdida ao sair da tela/fechar o app. `chatService.ts` retorna uma de 4 strings fixas (`MOCK_RESPONSES`) sorteadas aleatoriamente, sem qualquer chamada a IA real.

| Campo exibido no Canvas (4a) | Origem do dado | Fonte técnica real hoje | Observação / pendência |
|---|---|---|---|
| Mensagens da conversa atual (`chatMessages`) | Real (em memória) | `useChatBot.ts` → `useState<ChatMessage[]>` | Persiste apenas durante a sessão do componente montado; não sobrevive a reload/fechar app. Isso é aceitável para a conversa **atual**, mas impede o histórico de conversas passadas (ver linha abaixo). |
| Conteúdo da resposta do assistente | **Mock declarado** | `src/services/chatService.ts` → `MOCK_RESPONSES` (array de 4 strings fixas), delay simulado de 1–2s | Confirmado mock em `CODE_INVENTORY.md` §6 e no próprio comentário do arquivo ("Hoje retorna respostas mockadas; a UI/hook não sabem que é mock"). Constituição regra 2: placeholder aceitável **desde que documentado como pendência técnica** — já está em `GAP_ANALYSIS.md` pendência #4. Esta EPIC não implementa a IA real (decisão de custo/provedor/privacidade de dados de saúde enviados a uma API terceira — **fora do escopo, requer confirmação humana/orientador**, ver `plan.md`). O que esta EPIC faz é isolar e nomear esse limite explicitamente (ex. renomear/envolver em `aiAssistantService.ts` com contrato documentado), para que nenhuma parte da UI/hook "não saiba que é mock". |
| Sugestões rápidas (3 cartões no estado vazio) | Estático (copy fixo do Canvas) | Constante local no componente | Não é dado de usuário — apenas 3 strings de UI fixas; a EPIC troca o conteúdo/quantidade atual (4 chips diferentes) pelas 3 sugestões exatas do Canvas. |
| **`historyGroups` (histórico de conversas agrupado)** | **Não existe em lugar nenhum** | — | **Genuine gap — maior pendência desta EPIC.** Não há model Amplify de conversa/mensagem de chat, não há tabela DynamoDB, não há nenhuma leitura/gravação de histórico no código atual. `useChatBot.ts` não tem noção de "conversas" (plural) — só de "a mensagem atual". Duas decisões possíveis, **nenhuma tomada unilateralmente aqui**: (a) manter histórico **apenas em memória/AsyncStorage local** (não sincroniza entre dispositivos, mas não expõe dados de saúde sensíveis a um novo model de banco); (b) criar um model Amplify novo (ex. `ChatConversation`/`ChatMessage` no DynamoDB, com `owner` auth) para persistir de verdade e sincronizar entre sessões/dispositivos — implica mudança de schema (regra 5/6 da constituição, decisão explícita) e uma superfície nova de dados de saúde sensíveis sob LGPD que precisa de uma decisão consciente de retenção/exclusão. Proposta registrada em `plan.md`; requer confirmação do usuário/orientador antes de qualquer implementação de schema. |
| Banner de disclaimer | Estático (copy fixo obrigatório) | Constante local, texto imutável | Nunca vem de dado dinâmico — deve ser hardcoded, sempre visível, nunca condicional a nenhum estado (ver §6). |

## 6. Requisitos não-funcionais específicos

**Reforço explícito da regra 4 da constituição (LGPD e responsabilidade da IA) — aplica-se integralmente a esta tela:**

- **Nenhuma tela do Assistente de IA pode sugerir diagnóstico definitivo.** Toda copy gerada, estática ou mock, deve deixar claro que a análise é preliminar/informativa. Isso vale tanto para as strings mockadas hoje em `chatService.ts` (`MOCK_RESPONSES`) quanto para qualquer copy nova introduzida nesta EPIC (mensagem de boas-vindas, respostas de fallback de erro, textos de sugestão). Revisar `MOCK_RESPONSES` atual: a frase "recomendo consultar um médico para avaliar esses resultados" é aceitável (reforça buscar profissional), mas nenhuma resposta mock pode afirmar categoricamente um resultado clínico (ex.: nunca "seu exame está normal" como afirmação definitiva sem qualificador — revisar as 4 strings existentes nesta EPIC e ajustar a que afirma "os valores estão dentro da faixa normal" para incluir uma ressalva, já que isso lido isoladamente soa como um diagnóstico).
- **O banner "Apoio informativo — não substitui avaliação médica." é obrigatório e não pode ser dispensável (`dismissible`).** Deve permanecer visível em 100% dos estados da tela (vazio, digitando, com mensagens, drawer aberto por trás do banner) — nenhuma versão desta tela pode ser aceita sem esse banner renderizado e sem nenhum controle de "fechar"/"não mostrar novamente" associado a ele. Isso é mais rígido que qualquer outro banner informativo do app (ex. banners de LGPD/consentimento no onboarding podem ser dispensados após aceite; este não pode).
- **Nenhum texto do fluxo de erro ou fallback pode implicar diagnóstico.** A mensagem de erro genérica ("Desculpe, ocorreu um erro. Tente novamente.") já é segura nesse sentido — preservar.
- **Isolamento do limite mock (regra 2 da constituição — nenhum dado mockado permanece silencioso):** `chatService.ts` já se autodocumenta como mock, mas seu nome (`chatService`) não comunica isso para quem lê a UI/hook. Esta EPIC deve tornar esse limite **explícito e nomeado** (ex.: `aiAssistantService.ts`, interface `AiAssistantService` com contrato documentado — `sendMessage(message, history, userContext): Promise<string>` já é o formato correto, só precisa de nome/local que deixe claro "isto é a fronteira com o provedor de IA, hoje mockado"). Nenhuma integração real de LLM é implementada nesta EPIC — a decisão de qual provedor (Anthropic Claude API, conforme já esboçado em comentário no arquivo, ou outro), custo, e principalmente **política de privacidade para dados de saúde enviados a uma API de terceiros** é uma decisão maior que requer confirmação explícita do usuário/orientador do TCC antes de ser tomada. Esta EPIC apenas prepara a fronteira (nome do serviço, contrato de interface, comentário aponta a pendência), não decide nem implementa a integração real.
- **Persistência de histórico é uma decisão em aberto, não uma implementação silenciosa:** conforme §5, não existe hoje nenhuma fonte real para `historyGroups`. Esta EPIC **não decide unilateralmente** entre AsyncStorage local vs. novo model Amplify/DynamoDB — a decisão fica registrada como pendência formal (ver `plan.md` e recomendação de atualizar `GAP_ANALYSIS.md`), exigindo confirmação humana antes de escolher a rota de armazenamento definitiva, dado que envolve dados de saúde sensíveis (LGPD).
- **Paleta e tokens:** disclaimer banner usa exatamente os tokens azul-info de `DESIGN_TOKENS.md` §1 (`#E9F1FD`/`#CBDFFA`/`#14509F`/`#1B63C4`), nunca reaproveitar a paleta verde-sucesso para esse elemento (ele não é uma confirmação de sucesso).
- **Toques mínimos:** botão de histórico e envio 48×48 (dentro do mínimo de 48dp), cartões de sugestão 52px, item de histórico ≥48dp, conforme `DESIGN_TOKENS.md` §3.
- **Side drawer:** seguir exatamente o padrão documentado em `DESIGN_TOKENS.md` §4 ("Side drawer / history panel"): 296px, `box-shadow:4px 0 24px rgba(0,0,0,.16)`, backdrop `rgba(20,24,23,.45)`.
- **4 estados padrão:** este EPIC não tem um "estado de carregamento" de lista tradicional (a conversa em si não é paginada), mas o indicador de "digitando" cumpre o papel equivalente ao "Carregando" documentado em `DESIGN_TOKENS.md` §4 para esta tela — usar o padrão visual de pontos, não um texto literal.
- **Nenhuma quebra de dados existentes:** qualquer decisão futura de schema para persistência de histórico é aditiva e opcional, nunca decidida ou implementada dentro desta EPIC (regra 5 da constituição) — fica documentada como pendência.

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas 4a: header com botão de histórico + título, banner de disclaimer sempre visível, estado vazio com "Como posso ajudar?" + 3 cartões de sugestão exatos do Canvas, lista de mensagens, indicador de "digitando" com 3 pontos animados (não mais texto "Digitando..."), barra de input com anexo/campo/enviar, drawer de histórico com "Nova conversa" + grupos.
- [ ] **Nenhum texto sugere diagnóstico médico definitivo** — revisão explícita de toda copy estática e de `MOCK_RESPONSES` (ou onde quer que as respostas mock estejam após o isolamento de nome) confirmando que nenhuma resposta afirma categoricamente um resultado clínico sem qualificador informativo.
- [ ] Banner "Apoio informativo — não substitui avaliação médica." está sempre visível em todos os estados da tela (vazio/digitando/com mensagens) e **não é dispensável** (nenhum "×"/dismiss/"não mostrar novamente" associado a ele).
- [ ] As 3 sugestões do estado vazio correspondem ao Canvas ("Analisar meu último exame" / "O que significa colesterol alto?" / "Lembrar de tomar remédio"), substituindo os 4 `QUICK_PROMPTS` atuais.
- [ ] Indicador de "digitando" usa o padrão visual de 3 pontos do Canvas, não mais o texto "Digitando...".
- [ ] Cenário de erro de rede continua tratado com mensagem amigável, sem travar o indicador de "digitando" preso.
- [ ] Drawer de histórico existe na UI (hoje não existe no código), com botão de abrir/fechar, "Nova conversa" e área de grupos — mesmo que a fonte de dado de `historyGroups` seja, nesta primeira versão, explicitamente vazia/local/temporária conforme a decisão registrada em `plan.md` (nunca dado inventado/fake preenchendo os grupos).
- [ ] Estado de histórico vazio (nenhuma conversa anterior) tem copy definida e visível dentro do drawer.
- [ ] O limite mock do serviço de IA está isolado atrás de uma interface/nome explícito (ex. `aiAssistantService.ts`) documentando que é mock e apontando a integração real futura — sem que a UI/hook precisem saber disso.
- [ ] Nenhuma integração real de LLM/API de IA de terceiros foi implementada nesta EPIC — confirmado que a decisão de provedor/custo/privacidade permanece como pendência aberta documentada, não decidida unilateralmente.
- [ ] Decisão sobre persistência de histórico (local vs. DynamoDB/model novo) está documentada como pendência aberta em `plan.md` e recomendada para registro em `GAP_ANALYSIS.md`, não implementada de forma definitiva/silenciosa nesta EPIC.
- [ ] Botão de anexo (`handleAttach`, hoje já funcional com `expo-document-picker`) — decisão tomada em `plan.md` sobre manter (ainda que ausente do Canvas 4a) ou remover, documentada explicitamente (regra 8 da constituição).
