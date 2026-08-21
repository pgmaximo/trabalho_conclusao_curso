# TASKS: Assistente de IA — Chat Interativo (Bloco 4)

## Disclaimer (prioridade máxima — constituição regra 4)

- [x] `src/screens/ChatBotScreen.tsx`: adicionado banner fixo "Apoio informativo — não substitui avaliação médica." logo abaixo do header, sempre renderizado (sem prop de dismiss/condicional), usando os tokens azul-info (`app-infoSoft`/`app-infoBadgeBorder`/`app-info`/`app-infoIconBg`, que já mapeiam exatamente para `#E9F1FD`/`#CBDFFA`/`#14509F`/`#1B63C4`) do Canvas.
- [x] Confirmado por teste automatizado (`__tests__/chatbot-screen.test.tsx`) que o banner permanece visível no estado vazio e durante "digitando"; renderização é incondicional no JSX (não depende de `hasUserMessage`/`isTyping`), então também cobre o estado "com mensagens".
- [x] Confirmado que não existe nenhum controle de fechar/"não mostrar novamente" associado ao banner (sem `onPress`/ícone de fechar no bloco do banner; coberto pelo teste "has no dismiss control on the disclaimer banner").

## Isolamento do limite mock (regra 2 da constituição)

- [x] Grep por todo import de `chatService` no repo antes de renomear — apenas `useChatBot.ts` e o próprio `chatService.ts` importavam/exportavam do módulo; `ChatBotScreen.tsx` só citava o nome em um comentário.
- [x] Renomeado `src/services/chatService.ts` → `src/services/aiAssistantService.ts`; interface exportada `ChatService` → `AiAssistantService`, mesmo contrato (`sendMessage(message, history, userContext?): Promise<string>`).
- [x] Comentário do arquivo reforçado deixando explícito que a troca para IA real é uma decisão pendente fora desta EPIC.
- [x] `src/hooks/useChatBot.ts` atualizado para importar de `aiAssistantService`.
- [x] `MOCK_RESPONSES` revisado: a frase "Seus exames indicam que os valores estão dentro da faixa normal para sua idade." agora inclui a ressalva "...isso é uma leitura informativa, não substitui a avaliação de um profissional de saúde." As demais 3 strings já orientavam buscar profissional/mais contexto — preservadas.
- [x] Nenhuma chamada real a LLM/API de terceiros foi implementada nesta EPIC.

## Header

- [x] Título trocado "Assistente de Saúde" → "Assistente de IA" em `ScreenHeader`.
- [x] Subtítulo removido ("Tire dúvidas sobre seus exames e cuidados de prevenção." — ausente no Canvas).
- [x] Botão de "limpar conversa" (ícone de lixeira) removido do `ScreenHeader.action`.
- [x] Adicionado botão de histórico (ícone `time-outline`, 48×48, radius `field`, borda `app-border`) à esquerda do título — `onPress` abre o drawer (`openHistory`).

## Estado vazio (sugestões)

- [x] `QUICK_PROMPTS` trocados pelos 3 textos do Canvas: "Analisar meu último exame" / "O que significa colesterol alto?" / "Lembrar de tomar remédio".
- [x] Layout trocado de chips `flex-wrap` para 3 cartões empilhados (altura 52px, radius `field`, borda 1.5px `app-border`, fundo `app-surface`), cada um `onPress` chamando `sendMessage(promptText)`.
- [x] Título "Como posso ajudar?" e subtítulo "Toque em uma sugestão ou digite sua pergunta." implementados conforme o Canvas.

## Indicador de "digitando"

- [x] Criado `src/components/TypingIndicator.tsx` com 3 círculos 7×7px (`app-textSecondary`), substituindo a bolha com o texto literal "Digitando...".
- [x] Indicador aparece alinhado à esquerda, mesma posição de bolha do assistente (`flex-row justify-start`).

## Drawer de histórico (novo — maior tarefa estrutural)

- [x] Criado `src/components/HistoryDrawer.tsx` — painel 296px de largura (`w-[296px]`), deslizando via `Modal` transparente, `shadowOffset {4,0}`/`shadowOpacity .16`/`shadowRadius 24`, backdrop `app-overlay` (`rgba(20,24,23,.45)`, já existente nos tokens) que fecha ao tocar.
- [x] Header do drawer: título "Histórico" (600 18px) + botão "×" (40×40, radius 12, fundo `app-background`).
- [x] Botão "+ Nova conversa" (altura 48px, radius `field`, borda 1.5px `app-primary`, fundo `app-primarySoft`, texto `app-primary`) — chama `newChat` (limpa mensagens via `clearHistory` e fecha o drawer).
- [x] Área rolável de grupos: renderiza `historyGroups` (`{ group, items: { title, onSelect }[] }[]`); nesta EPIC `historyGroups` inicializa como array vazio em `useChatBot.ts` (nenhuma conversa é persistida ainda, ver `plan.md` §3.2).
- [x] Estado vazio do drawer: copy "Nenhuma conversa anterior." visível abaixo do botão "Nova conversa" (sempre exibida nesta versão, já que `historyGroups` está sempre vazio).
- [x] Estado `historyOpen` adicionado em `useChatBot.ts` com `openHistory`/`closeHistory`.
- [x] Botão de histórico do header conectado (`openHistory`); fechamento via backdrop/"×" (`closeHistory`).
- [x] Nenhuma persistência real (AsyncStorage ou model Amplify) foi implementada nesta EPIC.

## Botão de anexo (decisão documentada, sem mudança funcional)

- [x] `handleAttach` (`expo-document-picker` → `/add-exam`) permanece funcional, sem alterações — documentado em `plan.md` §2.5 como extensão intencional além do Canvas 4a (regra 8 da constituição).

## Cenários de teste (QA)

Cobertos por `__tests__/chatbot-screen.test.tsx` (automatizado) — todos passando:

- [x] Chat vazio com sugestões: título + subtítulo + 3 cartões + banner de disclaimer visível.
- [x] Digitando: indicador aparece enquanto aguarda resposta mock (teste usa uma Promise controlada), some ao receber resposta; banner permanece visível durante o "digitando".
- [x] Resposta mock recebida: bolha do assistente aparece com o texto retornado pelo mock de `aiAssistantService`.
- [x] Erro de rede: `aiAssistantService.sendMessage` forçado a rejeitar; mensagem de erro amigável aparece.
- [x] Histórico vazio: abrir o drawer sem nenhuma conversa anterior, copy de estado vazio visível.
- [ ] Histórico com conversas anteriores: **não testável nesta EPIC** de ponta a ponta (não há persistência real) — não coberto por teste isolado adicional; comportamento de renderização de grupos populados fica como verificação manual futura caso `historyGroups` deixe de estar sempre vazio.
- [x] Confirmado que o disclaimer nunca desaparece em nenhum dos cenários testados.
- [ ] Comparação visual manual (dispositivo/simulador) contra o Canvas 4a em light e dark mode — não executada nesta sessão (sem acesso a simulador/dispositivo); typecheck + lint + testes automatizados passam.

## Validação final

- [x] Nenhuma chamada real a um provedor de IA/LLM foi adicionada ao código.
- [x] Nenhum model Amplify novo foi criado (`amplify/data/schemas/*` inalterado).
- [x] `aiAssistantService.ts` documenta claramente, em comentário, que é mock e qual é a pendência de integração real.
- [x] Todo texto novo/alterado desta EPIC (banner, copy do drawer, `MOCK_RESPONSES` revisado, mensagens de erro) revisado — sem linguagem de diagnóstico definitivo.
- [x] `GAP_ANALYSIS.md` atualizado (pendência #4 separada em duas: integração real de IA e persistência de histórico).
- [ ] Comparação visual completa contra o Canvas 4a (ver item acima, QA manual pendente).
