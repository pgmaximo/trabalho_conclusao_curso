# Plano técnico: Perfil — Dados de Saúde e Preferências (4b)

## 1. Diagnóstico do código atual vs. spec

`src/screens/ProfileScreen.tsx` + `src/app/(app)/profile.tsx` já cobrem a maior parte da tela com dados reais (regra 2 já satisfeita para nome/e-mail/dados de saúde/tema/logout):

| Elemento do design (4b) | Estado atual | Gap |
|---|---|---|
| Avatar + nome + e-mail | Implementado (`Avatar`, `user.name`, `user.email`) | Nenhum |
| Botão "Editar perfil" | Implementado, navega para `/edit-profile` | Nenhum |
| Card "Dados de saúde" (Peso/Altura/IMC/Idade/Sexo/Tabagismo) | Implementado, IMC e Idade já computados no cliente (`calculateBMI`/`calculateAge`) | Rótulo IMC "Peso normal" vs. design genérico `imcLabel` — compatível, manter |
| "Aparência" (Claro/Automático/Escuro) | Implementado via `ThemeContext` | Nenhum |
| "Dispositivos conectados" | **Ausente** | Criar card + serviço-stub |
| "Exportar meus dados" | Existe como linha "Exportar dados" com `Alert.alert('Em desenvolvimento.')` | Renomear + isolar atrás de serviço-stub nomeado com estado "Em breve" mais explícito que um Alert genérico |
| "Sair da conta" | Implementado | Nenhum |
| Estados de carregamento/erro (padrão 1a) | Ausente — tela sempre assume dado populado ou `—` | Adicionar skeleton + estado de erro com retry (menor prioridade, não bloqueia P1) |

## 2. Decisões de arquitetura (regra 3 e 6 da constituição)

### 2.1 "Dispositivos conectados" (health-app connect)
- **Decisão:** não instalar nenhuma lib de HealthKit/Google Fit/Health Connect neste EPIC — não é uma lacuna real ainda coberta por escopo de produto definido (não há consumidor desses dados hoje: o Assistente de IA, 4a, ainda é 100% mock — `chatService`).
- Criar `src/services/health/healthAppConnectService.ts` com uma função `getHealthConnectStatus(): 'unavailable'` (ou enum similar) e um comentário documentando o breve real (HealthKit iOS / Health Connect Android) como trabalho futuro — mesmo padrão já usado em `googleCalendarSync` (pendência #13 do `GAP_ANALYSIS.md`).
- UI: renderizar o card "Dispositivos conectados" com o texto de escopo do design, e o toggle em estado fixo "Indisponível"/"Em breve" (cinza, não verde/conectado), com toque exibindo um `Alert`/tooltip curto ("Em breve — ainda não integrado.") em vez de qualquer sucesso simulado.
- Justificativa: cumpre regra 2 (nenhum dado mockado passando por real) sem bloquear a entrega da tela em um trabalho de integração nativa fora de escopo deste EPIC.

### 2.2 "Exportar meus dados" (LGPD)
- **Decisão:** mesma lógica — não implementar exportação real (geração de PDF/JSON com todos os dados do usuário) neste EPIC, pois exigiria decisão de formato/transporte (e-mail? download local? S3 pre-signed URL?) fora do escopo de uma tela de perfil.
- Criar `src/services/export/dataExportService.ts` com uma função `requestDataExport(): Promise<'unavailable'>` documentando que é um stub, e trocar o `Alert.alert('Exportar dados', 'Em desenvolvimento.')` atual por uma chamada a esse serviço com uma mensagem mais específica ("Exportação de dados em breve — para solicitar seus dados agora, contate o suporte." ou equivalente), deixando claro que é um direito LGPD em atendimento, não uma feature esquecida.
- Registrar esta pendência explicitamente no `GAP_ANALYSIS.md` (se ainda não constar) como item de conformidade LGPD de prioridade alta para um app de saúde.

### 2.3 Estados de carregamento/erro
- Reaproveitar (ou criar, se não existir componente compartilhado) um padrão simples de skeleton para o card "Dados de saúde" enquanto `UserContext.isLoading === true`, e considerar exibir estado de erro leve na próxima iteração — **prioridade menor**, pode ser adiado sem violar critérios de aceite P1 se `isLoading` hoje já é rápido via cache-first `AsyncStorage` (mitigação natural do problema).

## 3. Reaproveitamento de stack (regra 3)
- Nenhuma biblioteca nova necessária. `Ionicons`, `NativeWind`/`Section`, `UserContext`, `ThemeContext`, `Avatar` já existentes e reutilizados.
- Os dois "serviços" novos (`healthAppConnectService`, `dataExportService`) são módulos TS puros, sem dependência externa — apenas isolam a pendência de um handler inline (`onPress={() => {}}`/`Alert` solto) para um ponto único e nomeado, facilitando a troca futura por integração real sem tocar a UI.

## 4. Compatibilidade com dados existentes (regra 5)
- Nenhuma mudança de schema Amplify/DynamoDB necessária — todos os campos consumidos (`weightKg`, `heightCm`, `birthDate`, `gender`, `isSmoker`, `name`, `email`) já existem em `UserProfile`/`UserContext`.
- Nenhum risco a Cognito/S3/DynamoDB existentes.

## 5. Ordem de implementação sugerida
1. Corrigir textos ("Exportar meus dados") e criar os dois serviços-stub (`healthAppConnectService`, `dataExportService`).
2. Adicionar card "Dispositivos conectados" na seção "Configurações" de `ProfileScreen.tsx`, com estado fixo indisponível.
3. Trocar o handler de "Exportar meus dados" para usar `dataExportService.requestDataExport()`.
4. (Opcional/P2) Adicionar skeleton de carregamento no card "Dados de saúde" quando `UserContext.isLoading`.
5. Validar visualmente contra o Canvas 4b em claro e escuro.

## 6. Riscos / ambiguidades documentadas (regra 8)
- O design não especifica o que acontece ao tocar em "Exportar meus dados" além do chevron `›` (sugere navegação ou ação externa) — interpretação adotada: ação inline (não uma nova tela), pois não há tela correspondente em nenhum outro id do Canvas (4a–4e não inclui uma tela de exportação). Se o produto decidir por uma tela dedicada no futuro, revisar este EPIC.
- O `hcMark`/`hcLabel` do design sugere um estado "conectado" com marca (✓) — a interpretação aqui é que esse é o estado *futuro* pós-integração real; o estado inicial/atual correto é "não conectado"/"indisponível", nunca o estado de sucesso simulado.
