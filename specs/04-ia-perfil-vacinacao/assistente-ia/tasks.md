# TASKS: Assistente de IA — Chat Interativo (Bloco 4)

## Disclaimer (prioridade máxima — constituição regra 4)

- [ ] `src/screens/ChatBotScreen.tsx`: adicionar banner fixo "Apoio informativo — não substitui avaliação médica." logo abaixo do header, sempre renderizado (sem prop de dismiss/condicional), usando os tokens azul-info (`#E9F1FD`/`#CBDFFA`/`#14509F`/`#1B63C4`) do Canvas.
- [ ] Confirmar visualmente/manualmente que o banner permanece visível nos 3 estados: vazio, digitando, com mensagens.
- [ ] Confirmar que não existe nenhum controle de fechar/"não mostrar novamente" associado ao banner.

## Isolamento do limite mock (regra 2 da constituição)

- [ ] Grep por todo import de `chatService` no repo antes de renomear.
- [ ] Renomear `src/services/chatService.ts` → `src/services/aiAssistantService.ts`; renomear a interface exportada `ChatService` → `AiAssistantService`, mantendo o mesmo contrato (`sendMessage(message, history, userContext?): Promise<string>`).
- [ ] Reforçar o comentário do arquivo deixando explícito que a troca para IA real (provedor, custo, privacidade de dados de saúde) é uma decisão pendente fora desta EPIC, não uma tarefa aberta a ser resolvida livremente.
- [ ] Atualizar `src/hooks/useChatBot.ts` para importar de `aiAssistantService` em vez de `chatService`.
- [ ] Revisar `MOCK_RESPONSES`: ajustar a frase "Seus exames indicam que os valores estão dentro da faixa normal para sua idade." para incluir uma ressalva informativa explícita (não afirmar resultado clínico sem qualificador). Confirmar que as demais 3 strings já orientam buscar profissional/mais contexto — preservar.
- [ ] **Não implementar nenhuma chamada real a LLM/API de terceiros nesta EPIC.**

## Header

- [ ] Trocar título "Assistente de Saúde" → "Assistente de IA" em `ScreenHeader`.
- [ ] Remover o subtítulo atual ("Tire dúvidas sobre seus exames e cuidados de prevenção.") — ausente no Canvas.
- [ ] Remover o botão de "limpar conversa" (ícone de lixeira) do `ScreenHeader.action`.
- [ ] Adicionar botão de histórico (ícone, 48×48, radius 14, borda `#DFE3E1`) à esquerda do título, `onPress` abre o drawer.

## Estado vazio (sugestões)

- [ ] Substituir os 4 `QUICK_PROMPTS` atuais pelos 3 textos do Canvas: "Analisar meu último exame" / "O que significa colesterol alto?" / "Lembrar de tomar remédio".
- [ ] Trocar o layout de chips `flex-wrap` por 3 cartões empilhados (altura 52px, radius 14, borda 1.5px `#DFE3E1`, fundo `#fff`), cada um `onPress` chamando `sendMessage(promptText)`.
- [ ] Manter título "Como posso ajudar?" e subtítulo "Toque em uma sugestão ou digite sua pergunta." (já batem com o Canvas).

## Indicador de "digitando"

- [ ] Criar/adaptar um pequeno componente `TypingIndicator` com 3 círculos 7×7px `#55605C` (ou equivalente no design system atual), substituindo a bolha atual com o texto literal "Digitando...".
- [ ] Confirmar que o indicador aparece alinhado à esquerda, mesma posição de bolha do assistente.

## Drawer de histórico (novo — maior tarefa estrutural)

- [ ] Criar componente `HistoryDrawer` (ou equivalente) em `src/components/` — painel 296px de largura, deslizando da esquerda, `box-shadow:4px 0 24px rgba(0,0,0,.16)`, backdrop `rgba(20,24,23,.45)` que fecha ao tocar.
- [ ] Header do drawer: título "Histórico" (600 18px) + botão "×" (40×40, radius 12, fundo `#F7F8F7`).
- [ ] Botão "+ Nova conversa" (altura 48px, radius 14, borda 1.5px `#10794E`, fundo `#E8F5EE`, texto `#0C6341`) — reaproveita a lógica de `clearHistory`/reinicia a conversa atual e fecha o drawer.
- [ ] Área rolável de grupos: renderizar `historyGroups` (array de `{ group: string; items: { title: string; onSelect: () => void }[] }`) — nesta EPIC, **inicializar `historyGroups` como array vazio** (nenhuma conversa é persistida ainda, ver `plan.md` §3.2).
- [ ] Estado vazio do drawer (nenhuma conversa anterior): copy visível (ex. "Nenhuma conversa anterior.") abaixo do botão "Nova conversa", exibida sempre nesta versão (já que `historyGroups` está sempre vazio).
- [ ] Adicionar estado `historyOpen` em `useChatBot.ts` (ou local ao componente) com `openHistory`/`closeHistory`.
- [ ] Conectar botão de histórico do header (`openHistory`) e fechamento via backdrop/"×" (`closeHistory`).
- [ ] **Não implementar nenhuma persistência real (AsyncStorage ou model Amplify) nesta EPIC** — a decisão entre local vs. remoto fica pendente conforme `plan.md` §3.2.

## Botão de anexo (decisão documentada, sem mudança funcional)

- [ ] Confirmar que `handleAttach` (`expo-document-picker` → `/add-exam`) continua funcional, sem alterações — apenas documentar em comentário/PR que é uma extensão intencional além do Canvas 4a (regra 8 da constituição), não removê-lo.

## Cenários de teste manual (QA)

- [ ] Chat vazio com sugestões: abrir `/ai` sem mensagens, confirmar título + subtítulo + 3 cartões + banner de disclaimer visível.
- [ ] Digitando: enviar uma mensagem, confirmar indicador de 3 pontos aparece enquanto aguarda resposta mock, some ao receber resposta.
- [ ] Resposta mock recebida: confirmar bolha do assistente aparece à esquerda com uma das 4 (ou 4 revisadas) strings mock, sem nenhuma delas soando como diagnóstico definitivo.
- [ ] Erro de rede: simular falha do serviço (ex. forçar rejeição em `aiAssistantService.sendMessage` temporariamente durante o teste) e confirmar que a mensagem de erro amigável aparece e o indicador de "digitando" não fica preso.
- [ ] Histórico vazio: abrir o drawer sem nenhuma conversa anterior, confirmar copy de estado vazio visível.
- [ ] Histórico com conversas anteriores: **não testável nesta EPIC** de ponta a ponta (não há persistência real) — validar apenas que, se `historyGroups` for populado manualmente em teste local/mock de desenvolvimento, o layout de grupos + itens renderiza corretamente (teste de componente isolado, não de fluxo real).
- [ ] Confirmar que o disclaimer nunca desaparece em nenhum dos cenários acima.

## Validação final

- [ ] Comparar visualmente a tela renderizada (todos os estados) contra o Canvas 4a.
- [ ] Confirmar que nenhuma chamada real a um provedor de IA/LLM foi adicionada ao código.
- [ ] Confirmar que nenhum model Amplify novo foi criado (`amplify/data/schemas/*` inalterado).
- [ ] Confirmar que `aiAssistantService.ts` documenta claramente, em comentário, que é mock e qual é a pendência de integração real.
- [ ] Revisar todo texto novo/alterado desta EPIC (banner, copy do drawer, `MOCK_RESPONSES` revisado, mensagens de erro) confirmando ausência de linguagem de diagnóstico definitivo.
- [ ] Recomendar atualização de `GAP_ANALYSIS.md` (pendência #4) para separar explicitamente as duas pendências abertas: (1) integração real de IA (provedor/custo/privacidade) e (2) persistência de histórico de conversas (local vs. DynamoDB) — ambas exigindo decisão humana antes de implementação futura.
