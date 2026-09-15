# Conexões de backend/IA por tela

> Auditoria gerada em 2026-08-23 lendo o código real (não as specs), a pedido do
> usuário, para dar visibilidade a **onde cada tela do app está de fato
> conectada** a um backend real (AWS Amplify — Cognito/DynamoDB/S3) ou a uma
> ferramenta de IA, onde a conexão é parcial/frágil, e onde falta dado que não
> existe em lugar nenhum (nem mock, nem real).
>
> Este documento é sobre **conectividade**. Para o inventário de dados
> mockados/placeholder (o que é fingido e por quê), ver `docs/DADOS_MOCKADOS.md`
> — os dois documentos se complementam e não devem ser lidos como
> duplicados: aqui o foco é "a chamada de rede existe e funciona?", lá é
> "o que a tela mostra é real ou fictício?". Ambos concordam nos mesmos 9
> pontos onde a resposta é "não" para as duas perguntas (ex.: IA, dispositivos
> conectados) — nesses casos este documento remete ao `DADOS_MOCKADOS.md` em
> vez de repetir o detalhamento.
>
> Metodologia: 3 subagentes auditaram em paralelo o código real (`src/app/`,
> `src/screens/`, `src/services/`, `src/hooks/`, `amplify/`), um por bloco de
> telas (Bloco 1+2, Bloco 3, Bloco 4), citando arquivo:linha para cada
> afirmação. `specs/design/GAP_ANALYSIS.md` foi usado só como referência
> cruzada, nunca como fonte de verdade.

## Resumo executivo

- **Autenticação (Bloco 1) e Perfil de Saúde/Home/Agenda (Bloco 2): 100% conectados** a AWS real (Cognito para auth, Amplify Data/DynamoDB para dados). Nenhum mock residual — o diretório `src/mocks/api/` nem existe mais no repositório.
- **Exames & Receitas, Medicamentos, Prevenção (Bloco 3): 100% conectados.** Upload real para S3, CRUD real em DynamoDB, e a Prevenção chama de fato uma API pública (USPSTF/AHRQ) via função Lambda — sem fallback mockado escondido.
- **Assistente de IA (Bloco 4): 0% conectado.** Nenhuma chamada de rede a um provedor de LLM existe — é uma simulação com respostas fixas sorteadas e delay artificial. Continua sendo o único chat de IA do app sem integração real, apesar da tela existir e estar com UI completa.
- **Dados do smartwatch (novo, Bloco 4): 100% conectado.** O usuário importa o export do Samsung Health (CSV/JSON/ZIP) ou de um exportador do Apple Health; o backend (`amplify/functions/analyze-health-import/`) faz o parsing defensivo, consolida em séries diárias e chama de fato o **Amazon Bedrock** (Claude Sonnet 4.6, saída forçada por tool + Guardrails de entrada/saída) para gerar a análise. Substitui o antigo stub "Dispositivos conectados" do Perfil — ver seção dedicada abaixo.
- **Perfil (Bloco 4): majoritariamente real**, exceto "Exportar meus dados", que segue reportando "indisponível" por não ter nenhum mecanismo de geração/entrega por trás.
- **Achados de robustez** (não são "não conectado", mas fragilizam conexões reais): um `catch` silencioso em `UserContext`, cache local sem TTL em Exames/Medicamentos, e falta de rollback se o upload S3 suceder mas o registro em DynamoDB falhar.

## Tabela por tela

| Bloco | Tela | Rota | Conexão | Detalhe |
|---|---|---|---|---|
| 1 | Login | `src/app/index.tsx` | ✅ Real | Cognito (`aws-amplify/auth`) — `LoginScreen.tsx:15,116-124` |
| 1 | Cadastro | `src/app/register.tsx` | ✅ Real | Cognito `signUp` — `RegisterScreen.tsx:14,92-101` |
| 1 | Confirmar conta | `src/app/confirm.tsx` | ✅ Real | Cognito `confirmSignUp`/`resendSignUpCode` — `ConfirmScreen.tsx:17,106,124,135` |
| 1 | Recuperar senha | `src/app/forgot-password.tsx` | ✅ Real | Cognito `resetPassword`/`confirmResetPassword` — `ForgotPasswordScreen.tsx:15,88,116` |
| 2 | Perfil de Saúde (wizard) | `src/app/profile-setup.tsx` | ✅ Real | Amplify Data `UserProfile.create/update` — `profileSetupRepository.ts:13,30-35` |
| 2 | Home / Dashboard | `src/app/(app)/dashboard.tsx` | ⚠️ Real parcial | Exames/Compromissos reais (`useExamsData`, `useAppointmentsData`); `preventionAlert` sempre `null` — sem fonte, real nem mock (bloqueado por Bloco 3 expor um "item atrasado"); resumo de medicamentos pendentes nunca composto (Medicamentos é mock — ver `DADOS_MOCKADOS.md` #1) |
| 2 | Agenda | `src/app/(app)/appointments.tsx` | ✅ Real | `Appointment` via `appointmentService.ts` (DynamoDB) |
| 2 | Agenda — sync Google Agenda | idem | ❌ Ausente (declarado) | `googleCalendarSync.ts:11-13` — nenhum client OAuth/Calendar API existe no repo; "em breve" explícito, não mock disfarçado |
| 2 | Novo agendamento | `src/app/add-appointment.tsx` | ✅ Real | `appointmentService.ts:34-41` `Appointment.create` |
| 2 | Editar agendamento | `src/app/edit-appointment.tsx` | ✅ Real | `appointmentService.ts:92-139` get/update/delete |
| 3 | Exames — lista | `src/app/(app)/exams.tsx` | ✅ Real | `MedicalDocument.list()` — `useExamsData.ts:130` |
| 3 | Novo exame/receita | `src/app/add-exam.tsx` | ✅ Real | Upload S3 real + `MedicalDocument.create` — `examService.ts:301-305,360-367` |
| 3 | Detalhe do documento | `src/app/(app)/document-detail.tsx` | ✅ Real | Update/delete S3+DynamoDB, download via URL assinada — `examService.ts:450,483,490,318-329` |
| 3 | Medicamentos — lista | `src/app/(app)/medicines.tsx` | ✅ Real | `Medicine.list()` — `medicineService.ts:140` |
| 3 | Novo medicamento | `src/app/add-medicine.tsx` | ✅ Real | `Medicine.create` — `medicineService.ts:107` |
| 3 | Editar medicamento | `src/app/edit-medicine.tsx` | ✅ Real | `Medicine.update/delete` — `medicineService.ts:174,190` |
| 3 | Prevenção | `src/app/(app)/prevention.tsx` | ✅ Real | Lambda `get-prevention-recommendations` chama API USPSTF real (`uspstfClient.ts:1,31-38`), API key via Amplify secret, **sem fallback mockado** (erro explícito se secret ausente) |
| 3 | Prevenção — banner de campanha | idem | ❌ Estático | `vaccinationCampaigns.ts` — config hardcoded, sem API pública (PNI/MS) por trás |
| 4 | Assistente de IA | `src/app/(app)/ai.tsx` | ❌ **Mock total** | `aiAssistantService.ts:27-42` — ver seção dedicada abaixo |
| 4 | Perfil — dados | `src/app/(app)/profile.tsx` | ✅ Real | `UserContext`/`profileSetupRepository` sobre `UserProfile` |
| 4 | Perfil — dados do smartwatch | idem (botão) → `src/app/import-health-data.tsx` | ✅ Real | Substitui o antigo `healthAppConnectService.ts` (removido) — ver seção dedicada abaixo |
| 4 | Importar dados de saúde | `src/app/import-health-data.tsx` | ✅ Real | Upload real para S3 (`health-imports/{identityId}/{importId}/...`) + `HealthImport.create` + mutation `startHealthAnalysis` — `healthImportService.ts` |
| 4 | Dashboard de insights de saúde | `src/app/(app)/health-data.tsx` | ✅ Real | Polling de `HealthImport` (nunca subscription — ver seção dedicada) + parsing real via Lambda + análise real via Amazon Bedrock |
| 4 | Perfil — exportar meus dados | `src/app/(app)/profile.tsx` | ❌ Ausente | `dataExportService.ts` sempre `'unavailable'` — sem mecanismo de geração/entrega |
| 4 | Editar Perfil — avatar | `src/app/edit-profile.tsx` | ✅ Real | Amplify Storage (S3) real, path `avatars/{owner}/profile.jpg` — `avatarService.ts:17-57` |
| 4 | Vacinação — doses | `src/app/(app)/vaccination.tsx` | ✅ Real | `VaccineDose.create/list` — `vaccinationService.ts` |
| 4 | Vacinação — banner de campanha | idem | ✅ Real | PNI/RNDS via `get-vaccination-campaigns` (amostral, com `dataAsOf` exibido — ver `GAP_ANALYSIS.md` item 3.a) |
| 4 | Vacinação — onde se vacinar | idem | ✅ Real | CNES via `get-vaccination-sites` — só quando o usuário concede localização |
| 4 | Hub "Mais" | `src/app/(app)/more.tsx` | — N/A | Navegação estática por design, sem dado remoto (comentário explícito no código) |

## Assistente de IA — achado crítico (única tela sem nenhuma conexão de IA)

`src/services/aiAssistantService.ts` é a fronteira única de IA do app, e hoje **não faz nenhuma chamada de rede a um provedor de LLM**:

```ts
export async function sendMessage(
  message: string,
  _history: ChatMessage[],
  _userContext?: string,
): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}
```

Sorteia uma de 4 respostas fixas (`MOCK_RESPONSES`, linhas 27-32), ignora `message`/`_history`/`_userContext` por completo, e usa um delay artificial de 1-2s só para simular "processamento". `src/hooks/useChatBot.ts` apenas orquestra UI em cima dessa função — não tem lógica de IA própria.

Existe um bloco de pseudocódigo **comentado** (linhas 44-55) esboçando o swap para a Claude API (`@anthropic-ai/sdk`, `ANTHROPIC_API_KEY`, `client.messages.create(...)`), mas:
- o pacote não está instalado/importado em nenhum lugar ativo do código;
- não há `ANTHROPIC_API_KEY` configurada em nenhum lugar (env, secret Amplify, etc.);
- nenhuma rota/função serverless chama esse SDK.

A interface `AiAssistantService` já isola essa fronteira de propósito — o swap para IA real é, tecnicamente, trocar só o corpo de `sendMessage`, sem tocar UI/hook. A decisão de fazer esse swap está bloqueada por escolha de provedor, custo por token e política de retenção de dados de saúde enviados a terceiro (LGPD) — ver `docs/DADOS_MOCKADOS.md` item 1 e `specs/design/GAP_ANALYSIS.md` pendência #4.a.

## Dados do smartwatch — primeira integração real de IA do app (2026-09-15)

Ao contrário do Assistente de IA, esta feature faz uma chamada de rede real a um provedor de LLM. Fluxo completo:

1. `ImportHealthDataScreen` (`src/app/import-health-data.tsx`) — consentimento LGPD, seleção de arquivos (CSV/JSON/ZIP), upload sequencial para `health-imports/{identityId}/{importId}/...`, `client.models.HealthImport.create()` e `client.mutations.startHealthAnalysis({ importId })`.
2. Lambda `start-health-analysis` (resolver da mutation) valida o dono e o formato das chaves S3, marca `PROCESSING` e invoca `analyze-health-import` de forma assíncrona (fire-and-forget — o resolver do AppSync tem teto de 30s, a análise leva mais que isso).
3. Lambda `analyze-health-import` descompacta o ZIP com allowlist (`fflate`), identifica o tipo de cada CSV pela **linha 1** (nunca pelo nome do arquivo — ambiguidade real encontrada no export do Samsung Health), normaliza unidades/fusos, deduplica por dispositivo, agrega por dia, valida sanidade, monta o resumo estatístico (com correlações de Pearson defasadas) e chama o **Amazon Bedrock** (`us.anthropic.claude-sonnet-4-6`, saída forçada por tool + Guardrail de entrada e saída) — grava o resultado direto no DynamoDB via `UpdateCommand`.
4. `HealthDashboardScreen` (`src/app/(app)/health-data.tsx`) acompanha o status via **polling** (nunca subscription do Amplify Data — a Lambda escreve direto no DynamoDB, contornando o AppSync, então uma subscription nunca dispararia) e mostra o dashboard com gráficos (`react-native-svg`, sem biblioteca nova) e o texto gerado pela IA.

O Guardrail (`aws-cdk-lib/aws-bedrock`, criado via IaC) bloqueia diagnóstico médico definitivo e prescrição de medicamento, filtra ataque de prompt, e anonimiza PII — reforça a regra 4 da constituição de forma estrutural (o próprio schema da resposta da IA não tem vocabulário para soar como diagnóstico), não só por instrução no prompt.

Catálogo de métricas e todos os quirks de parsing (linha de metadado, delimitador, timestamps, dedupe por dispositivo, códigos de estágio de sono) foram derivados do export real do Samsung Health de um usuário, não de suposição — ver `docs/superpowers/plans/2026-09-09-importacao-wearables-bedrock.md` seção 0.2 para o detalhamento.

**Pendência conhecida**: a conta AWS deste projeto está aguardando a aprovação do formulário de uso de modelos Anthropic (bloqueio da própria AWS, não do código) — o pipeline foi validado ponta a ponta com um usuário Cognito de teste até a chamada ao Bedrock; a chamada com Guardrail em produção real ainda não pôde ser confirmada nesta sessão.

## Achados de robustez em conexões que são reais

Estes não são "desconectados" — a chamada de backend existe e funciona — mas são pontos frágeis encontrados durante a auditoria, não documentados anteriormente como decisão deliberada:

1. **`UserContext.tsx:97-99` — `catch` totalmente silencioso.** Se `client.models.UserProfile.list({})` falhar (rede, permissão, token expirado), `fetchAndUpdateUser()` engole o erro sem log e sem expor nada à UI — o app mantém silenciosamente o estado anterior do usuário. Diferente do resto do código, que sempre propaga erro (`Alert.alert`/`InlineError`). Afeta o nome/saudação exibidos na Home.
2. **Cache local sem TTL em Exames e Medicamentos.** `useExamsData.ts:120-156` e `useMedicinesData.ts:99-108` retornam do cache `AsyncStorage` sempre que ele existe, sem expiração por tempo — só é atualizado por invalidação explícita (`invalidateExamsCache()` após add/edit/delete no mesmo dispositivo). Uma alteração feita em outra sessão/dispositivo não aparece até essa invalidação.
3. **Sem rollback se upload S3 suceder e o `create()` no DynamoDB falhar depois** (`examService.ts:389-420`) — pode deixar um arquivo órfão no S3 sem registro de metadados. Não tratado.
4. **Mensagens de erro genéricas quando a config Amplify Storage está ausente** — `examService.ts:309-312` captura qualquer falha de `uploadData` num `catch` pouco específico.

## O que está confirmado como corretamente "declarado", não escondido

Estes pontos aparecem como "não conectado" na tabela acima, mas o código já comunica honestamente o estado ao usuário (nenhum finge sucesso) — consistente com a regra 2 da constituição do projeto (`specs/constitution.md`):

- Sync com Google Agenda (`googleCalendarSync.ts`) — modal "em breve".
- Exportar dados (Perfil) — estado "Indisponível"/"Em breve" explícito na UI. (Dispositivos conectados deixou de ser um stub — ver seção dedicada acima.)
- A carteira de vacinação exibida no app é declarada como registro pessoal, não o documento oficial — a carteira oficial (RNDS/Meu SUS Digital) exige certificado ICP-Brasil e CNES credenciado, inacessível a este app (ver `GAP_ANALYSIS.md` item 3.a).

Ver `docs/DADOS_MOCKADOS.md` para o detalhamento completo desses casos (arquivo, decisão pendente, o que precisa ser decidido antes de implementar).
