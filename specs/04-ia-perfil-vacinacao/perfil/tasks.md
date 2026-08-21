# Tasks: Perfil — Dados de Saúde e Preferências (4b)

## T1 — Corrigir texto "Exportar meus dados"
- Arquivo: `src/screens/ProfileScreen.tsx`
- Trocar label da linha de "Exportar dados" para "Exportar meus dados" (fidelidade textual ao Canvas, §6 do `spec.md`).

## T2 — Criar `healthAppConnectService`
- Arquivo novo: `src/services/health/healthAppConnectService.ts`
- Expor função/estado que reporta explicitamente indisponibilidade (ex.: `getHealthConnectStatus(): 'unavailable'`), com comentário documentando a integração real futura (HealthKit/Health Connect) — sem lib nova instalada.

## T3 — Criar `dataExportService`
- Arquivo novo: `src/services/export/dataExportService.ts`
- Expor `requestDataExport(): Promise<'unavailable'>` (stub), documentando que é pendência LGPD (regra 4 da constituição) e não uma feature esquecida.

## T4 — Adicionar card "Dispositivos conectados"
- Arquivo: `src/screens/ProfileScreen.tsx`
- Novo bloco na seção "Configurações", acima de "Exportar meus dados"/"Sair da conta":
  - Título "Dispositivos conectados" (600 17px).
  - Texto explicativo literal do design: "Conecte o app de Saúde do seu celular (Apple Health ou Google Fit) para o Assistente de IA usar esses dados nas respostas. Eles não são exibidos em nenhuma outra tela do app."
  - Linha-toggle "App de Saúde do celular" com badge de status usando `healthAppConnectService` — estado fixo "Indisponível"/"Em breve" (cor neutra, não verde), toque exibe feedback curto (não finge conexão).
- Usar tokens de `DESIGN_TOKENS.md` (card branco, borda `#EFF1F0`, radius 16px, dark mode via `useThemeColors()`/`dark:` classes).

## T5 — Conectar "Exportar meus dados" ao `dataExportService`
- Arquivo: `src/screens/ProfileScreen.tsx`
- Trocar `onPress={() => Alert.alert('Exportar dados', 'Em desenvolvimento.')}` por uma chamada a `dataExportService.requestDataExport()` que resulta em feedback claro de pendência (ex.: `Alert.alert('Exportar meus dados', 'Em breve. Para solicitar seus dados agora, contate o suporte.')`).

## T6 (P2, opcional) — Estado de carregamento no card "Dados de saúde"
- Arquivo: `src/screens/ProfileScreen.tsx`
- Quando `UserContext.isLoading === true`, renderizar skeleton (barras `#DFE3E1`/`#EFF1F0`) em vez de `—`, conforme padrão de 4 estados de `DESIGN_TOKENS.md` §4. Pode ser adiado se o cache-first já evita loading perceptível na prática.

## T7 — Validação visual
- Conferir a tela renderizada (claro e escuro) contra o Canvas 4b: ordem das seções, textos exatos, cores (`#B3261E`/`#F2867E` para "Sair da conta"), toques mínimos 48–56px.
- Confirmar que nenhuma das duas pendências (health-connect, exportar dados) aparenta estar "funcionando" — ambas devem comunicar claramente que são futuras.

## T8 — Atualizar `GAP_ANALYSIS.md` (se necessário)
- Registrar explicitamente a pendência de exportação de dados (LGPD) como item novo, caso ainda não esteja coberta pelos itens existentes (revisar itens 1–22 antes de duplicar).

## Fora de escopo (não fazer neste EPIC)
- Integração real com HealthKit/Google Fit/Health Connect (requer decisão de produto + lib nativa).
- Geração/entrega real de exportação de dados (formato, transporte, S3, etc.).
- Reestruturação do hub "Mais" da bottom nav (pendência #6 do `GAP_ANALYSIS.md`, tratada em outro EPIC de Fundação/Navegação).
- Tela 4c (Editar perfil) — coberta por EPIC próprio.
