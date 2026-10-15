# EPIC: Correções de usabilidade (primeira leva)

## 1. Identificação

- **Origem:** auditoria de usabilidade pedida pelo dono do projeto
  (2026-10-09), feita lendo o código de todas as telas, medindo contraste a
  partir dos tokens e olhando as telas pela rota `/dev-preview`. Esta EPIC
  cobre o grupo "corrigir primeiro" daquela auditoria.
- **Restrição do pedido:** não mudar a usabilidade geral nem a identidade do
  app. Cada correção reaproveita um padrão que já existe (o painel de
  confirmação, o botão secundário, o `ScreenHeader`, os tokens de cor).
- **Relação com EPICs entregues:** toca telas de vários blocos. Onde uma spec
  anterior passa a dizer algo falso, ela ganhou uma nota de reconciliação.
- **Ator:** usuário autenticado, com atenção a idosos e baixo letramento digital.
- **Fora de escopo, com motivo:** ver §4.

## 2. Decisões

| # | Defeito | Correção | Arquivos centrais |
|---|---|---|---|
| D1 | **Seletor de data** (7 telas). Reabria no dia anterior: `new Date('2026-10-01')` é meia-noite UTC, 30/09 no Brasil. Só tinha setas de mês (uma vacina de 2015 pedia mais de 130 toques). Setas sem nome para o leitor de tela. O botão "Confirmar" só fechava. Marcador "DD/MM/YYYY" em quatro telas. | A data é montada com os números, no fuso do aparelho. Ano e mês têm cada um a sua linha de setas, com nome. O botão de baixo é "Cancelar" (botão secundário): tocar no dia continua escolhendo e fechando. O dia marcado é o da data guardada, não "o mesmo número" em todo mês. Com data máxima, não se avança para um mês só de dias proibidos. Marcador "DD/MM/AAAA" em todo o app. | `src/components/DateInput.tsx` |
| D2 | **Formulário de medicamento** abria com sete campos em vermelho: a validação roda a cada renderização e todos os erros eram mostrados. | O erro de um campo só aparece depois que a pessoa passa por ele (ao sair de um campo de texto; ao mexer num grupo de opções ou numa data). O botão desabilitado diz qual é a próxima coisa que falta, em vez de "complete os campos obrigatórios". | `src/components/MedicineFormFields.tsx`, `DoseTimeRow.tsx`, `AddMedicineScreen.tsx`, `EditMedicineScreen.tsx` |
| D3 | **Carteira de vacinação.** Marcar uma dose como aplicada era tocar no selo de status, que não parece botão. Um registro errado não podia ser apagado. | O selo voltou a ser só status; a ação é um botão "Marcar como aplicada". Cada registro tem uma lixeira, com o painel de confirmação do app; a falha aparece junto do registro. Não há edição: corrige-se excluindo e lançando de novo. | `src/screens/VaccinationScreen.tsx`, `src/app/(app)/vaccination.tsx` |
| D4 | **Dados do smartwatch.** "Excluir esta importação" excluía no toque, e a falha só ia para o console. A tela mostrava "steps × sleepMinutes", "8200.0 passos" e "us.anthropic.claude-sonnet-4-6". Os selos do período saíam cortados em 360dp. | Exclusão com o painel de confirmação e erro na tela. Correlações nomeadas pelo rótulo da métrica. Médias sem casa decimal para contagens, durações e pontuações, com separador de milhar ("8.200 passos"); uma casa e vírgula para peso, distância e temperatura. Rodapé "Análise gerada por IA (Claude Sonnet 4.6) em …": a spec pede modelo e data, e o nome substitui o identificador. Selos com quebra de linha. | `src/screens/HealthDashboardScreen.tsx`, `src/utils/metricDisplay.ts`, `src/components/charts/CorrelationRow.tsx` |
| D5 | **Contraste no tema escuro.** Texto em branco fixo sobre verdes que, no tema escuro, são claros: "Resumo de hoje" 3,1:1; "Ver carteira de vacinação" e "Agendar consulta" 2,2:1; ícones brancos nos círculos coloridos, cerca de 2:1. | Texto e ícone sobre cor cheia usam o token `onPrimary` (branco no claro, quase preto no escuro, como o Canvas 1c define). Mínimo de 5,4:1 em todas as combinações. Exceção: o círculo neutro dos selos, escuro nos dois temas, fica com branco. | `HomeScreen.tsx`, `AgendaScreen.tsx`, `Badge.tsx`, `DeleteConfirmPanel.tsx`, `InlineError.tsx`, `FormField.tsx` e outros |
| D6 | **Sem como voltar.** Agenda, Prevenção, Dados do smartwatch, Perfil e "O que eu lembro" não tinham botão de voltar (a Carteira de vacinação tinha). Elas não ficam numa pilha de navegação, então no iPhone nem o gesto existia. A Prevenção, carregando ou com erro, não tinha nem título. | O `ScreenHeader` aceita `onBack` e desenha o mesmo botão do `DetailHeader`; com ele, subtítulo e selo descem para baixo da linha do título. Sem histórico para voltar, o botão leva ao hub Mais. O cabeçalho da Prevenção aparece em todos os estados. | `src/components/ScreenHeader.tsx`, `BackButton.tsx`, `src/utils/goBack.ts` e as cinco telas |
| D7 | **Assistente.** Sair da aba no meio de uma conversa e voltar mostrava um chat em branco. A memória ficava a três passos, atrás de um ícone e de um link pequeno. A tela de memória não tinha área segura (o título ficava sob a barra de status) e dizia "Ainda não guardei nada" enquanto ainda carregava. | A sessão lembra a conversa aberta e a reabre ao voltar à aba; fechar o app ou sair da conta começa do zero, e "Nova conversa" continua limpando. O hub Mais ganhou "Memória do assistente". A tela de memória tem área segura, voltar e estado de carregamento. | `src/hooks/useChatBot.ts`, `conversaAberta.ts`, `src/constants/navigation.ts`, `AssistantMemoryScreen.tsx` |
| D8 | **Medicamentos.** O horário era o menor texto do cartão da dose (13px). Uma dose passada do horário ficava "Pendente" para sempre: o status de atraso existia e nunca era produzido. Sem dose prevista para hoje, a tela dizia que todas já tinham sido registradas. O aviso dizia "0 lembretes ativos". | O horário vem primeiro na segunda linha do cartão, em 16px e em destaque. A dose não tomada vira "Atrasado" 60 minutos depois do horário (`LATE_DOSE_TOLERANCE_MINUTES`); continua podendo ser marcada e continua contando como pendente. Lista vazia: "Você não tem doses previstas para hoje". Aviso sem pendência: "Nenhum lembrete pendente para hoje"; com pendência, o texto do Canvas 3d não mudou. | `src/components/MedicineCard.tsx`, `src/hooks/useMedicinesData.ts`, `src/utils/medicineSchedule.ts`, `MedicinesScreen.tsx` |
| D9 | **Texto técnico na tela.** Os serviços montavam a mensagem do erro com o texto do backend ("Unauthorized", "Network error") e só usavam a frase em português se ele viesse vazio. O login podia mostrar "Habilite ALLOW_USER_PASSWORD_AUTH no console da AWS". | `backendError(errors, frase)`: a pessoa lê a frase; o texto técnico vai para o console e fica em `detail`, para o código que precisa reconhecer um erro (`technicalDetail`). Frases sem acento corrigidas. A instrução de configuração do login foi para o console. | `src/services/backendError.ts` e os serviços que falam com o backend |
| D10 | **Perfil.** Condições crônicas, medicamentos em uso e alergias, preenchidos no cadastro inicial, não apareciam nem podiam ser corrigidos. O topo do Perfil mostrava a logo do app, e não o avatar que o Canvas 4b pede. "Exportar meus dados" parecia um botão e só dizia "Em breve" depois do toque. | "Editar perfil" ganhou a seção "Informações clínicas", com os três campos; apagar um deles apaga no backend (`emptyClinicalFields: 'clear'`), e o cadastro inicial continua sem apagar nada. O Perfil mostra o avatar (foto, ou iniciais). A linha de exportação mostra o selo "Em breve" e não é tocável, como a spec do Perfil já propunha. | `EditProfileScreen.tsx`, `src/app/edit-profile.tsx`, `profileSetupPayload.ts`, `ProfileScreen.tsx` |

## 3. Notas

- **Tolerância de 60 minutos (D8):** é a janela usual para considerar um
  remédio tomado na hora. Marcar atraso no minuto seguinte ao horário só
  assustaria. É uma constante, fácil de mudar.
- **"Cancelar" no seletor de data (D1):** o botão sempre foi a saída sem
  escolher. Manter "tocar no dia escolhe e fecha" preserva o uso que já existe;
  trocar para "escolher e depois confirmar" mudaria um hábito.
- **Memória no hub Mais (D7):** a tela continua morando no Assistente (acende
  a aba dele). O hub é o índice do que não está na barra.
- **Erros que os serviços já escrevem para a pessoa** (o assistente, as
  validações de formulário) não mudaram: a D9 só troca o texto que vinha cru do
  backend.

## 4. Fora de escopo, com motivo

- **Termos de Uso e Política de Privacidade.** O login cita os dois, e eles não
  podem ser abertos. Não existe o texto de nenhum dos dois no repositório, e
  escrevê-los é decisão do dono do projeto.
- **Filtro "Alterados · Em breve" em Exames.** *(Resolvido depois: o filtro saiu
  da tela, em `specs/00-fundacao/correcoes-menores/spec.md`, D1.)* Já diz "Em breve" à vista, por
  decisão documentada em `specs/03-exames-receitas/lista/plan.md` (§2, Opção
  A). Fazê-lo funcionar pede classificar um resultado como alterado, o que o
  app evita de propósito (constituição §4).
- **Edição de um registro de vacina.** A D3 entrega a exclusão.
- **Erros de rede lançados como exceção** (sem passar pela lista `errors` do
  backend) continuam chegando às telas com o texto original.

## 5. Critérios de aceite

- [x] D1 a D10 cobertos por teste (ver `__tests__/dateInput`, `formularioDeMedicamento`,
      `vacinacaoAcoes`, `health-dashboard-screen`, `metricDisplay`, `contrasteSobreCor`,
      `voltarDasTelasDoHub`, `chatbot-screen`, `telaDeMemoria`, `medicine-schedule`,
      `erroDoBackend`, `perfilCorrecoes`, `edit-profile-screen`, `profile-setup-payload`).
- [x] `npm run validate` verde.
- [x] Telas alteradas conferidas no navegador, pela rota `/dev-preview`, em
      360dp e 390dp, claro e escuro.
- [ ] Conferência em aparelho real, com login (sem dispositivo neste ambiente):
      seletor de data, exclusão de vacina e de importação, retomada da conversa
      do assistente e edição das informações clínicas.
