# EPIC: Consistência e textos

## 1. Identificação

- **Origem:** a mesma auditoria de usabilidade de
  `specs/00-fundacao/correcoes-de-usabilidade/spec.md` (2026-10-09). Esta EPIC
  cobre o grupo "consistência e textos" daquela auditoria, mais um item do
  grupo de regras de design: "Sair da conta" sem confirmação.
- **Restrição do pedido:** não mudar a usabilidade geral nem a identidade do
  app. Nenhum componente novo de interface foi desenhado: tudo reaproveita o
  que já existe (o painel de confirmação, o `SuccessSnackbar`, o
  `ScreenHeader`, o `DetailHeader`, o motivo embaixo do botão desabilitado).
- **Relação com EPICs entregues:** toca telas de vários blocos. Onde uma spec
  anterior passa a dizer algo falso, ela ganhou uma nota de reconciliação.
- **Ator:** usuário autenticado ou em cadastro, com atenção a idosos e baixo
  letramento digital.

## 2. Decisões

| # | Defeito | Correção | Arquivos centrais |
|---|---|---|---|
| D1 | **"Sair da conta" saía no toque.** O botão fica no fim de uma tela que se rola com o dedão. | O toque abre o painel de confirmação das exclusões, com a pergunta "Sair da conta neste aparelho? Você vai precisar entrar de novo para ver seus dados." e os botões "Cancelar" e "Sair". Se sair falhar, a tela diz. O painel ganhou nome de botão configurável para o leitor de tela. | `ProfileScreen.tsx`, `DeleteConfirmPanel.tsx` |
| D2 | **Um destino, vários nomes.** A agenda era "Consultas" no Início e no hub Mais e "Agenda" na tela; o botão de marcar dizia "Agendar consulta" e abria "Novo agendamento". A aba "Remédios" abria a tela "Medicamentos", cujo botão "Adicionar medicamento" abria "Novo lembrete". Excluir era "excluir", "apagar" ou "deletar", conforme a tela. | Ver §2.1. | `navigation.ts`, `HomeScreen.tsx`, `AgendaScreen.tsx`, as telas de compromisso e de medicamento, `HistoryDrawer.tsx`, `AssistantMemoryScreen.tsx` |
| D3 | **Cinco cabeçalhos.** Títulos de 17, 20, 24, 26 e 28px, e seis telas com o cabeçalho escrito à mão. | Dois cabeçalhos, por papel da tela. `ScreenHeader` (título 24px): telas a que se chega pela barra, pelo Início ou pelo hub Mais. `DetailHeader` (voltar + título 20px): telas que abrem por cima de outra, formulários e detalhes. O `BackHeader` continua só no fluxo de entrada (cadastro, confirmação, recuperar senha). Ver §2.2. | `DetailHeader.tsx`, `ScreenHeader.tsx` e nove telas |
| D4 | **Cada formulário avisava de um jeito.** Compromisso, documento e medicamento desabilitam o botão e dizem o que falta. Vacina, cadastro, recuperar senha e confirmação deixavam tocar e abriam um pop-up do sistema; perfil e vacinação avisavam a falha ao salvar também por pop-up. | Um jeito só, o que já era o da maioria. O que falta: botão desabilitado, com o motivo embaixo, uma coisa de cada vez. Valor errado: erro embaixo do campo. Falha ao salvar: erro na própria tela. Nenhum pop-up do sistema: os 27 `Alert.alert` e o `alert()` da Agenda saíram, e um teste reprova a volta de qualquer um. | `AddVaccineScreen.tsx`, `MarkDoseAppliedSheet.tsx`, `RegisterScreen.tsx`, `ForgotPasswordScreen.tsx`, `ConfirmScreen.tsx`, `EditProfileScreen.tsx`, `OnboardingScreen.tsx`, `AgendaScreen.tsx` e as rotas |
| D5 | **Salvar não confirmava.** O formulário fechava e pronto; só a edição de um documento dizia "salvo". | Depois de salvar ou excluir um compromisso, um documento, um medicamento ou um registro de vacina, e depois de salvar o perfil, a tela para onde a pessoa volta mostra o `SuccessSnackbar` por 4 segundos ("Compromisso salvo.", "Medicamento excluído."…). O aviso fica acima da barra de abas. | `src/hooks/avisoDeSucesso.ts`, `AvisoDeSucesso.tsx`, `AppShell.tsx` |
| D6 | **Cadastro diferente do Login.** Os campos de senha do Cadastro não tinham o olho de mostrar a senha, e o link "Já tem conta? Entrar" era menor e de outra cor. | O olho virou um componente, usado no Login, nos dois campos do Cadastro e nos dois de Recuperar senha; cada olho mostra só o seu campo. O link do Cadastro tem o tamanho e a cor do link do Login. | `PasswordVisibilityToggle.tsx`, `RegisterScreen.tsx`, `ForgotPasswordScreen.tsx`, `LoginScreen.tsx` |
| D7 | **Texto sem acento na tela.** "Nome completo e obrigatorio", "Data de nascimento e obrigatoria", "deve ser numerico", "Data de nascimento invalida", "Nao foi possivel atualizar a dose", "Nao foi possivel conectar com o Google". | Corrigidos. As frases do cadastro inicial passaram a ser as mesmas de "Editar perfil" para os mesmos campos ("Informe seu nome completo.", "Use o formato DD/MM/AAAA."). Um teste procura palavra sem acento em toda frase de tela. | `forms_profile_setup.ts`, `profileSetupPayload.ts`, `MedicinesScreen.tsx`, `RegisterScreen.tsx` |
| D8 | **Jargão.** O Perfil listava os lembretes por "Grau A/B/C/D/I", sem dizer o que é um grau. O consentimento da importação falava em "Amazon Bedrock, dentro da conta AWS deste projeto". | Cada grau vem com uma linha que diz o que ele quer dizer ("Muito recomendados", "Recomendados", "Depende de cada caso", "Não recomendados", "Sem evidência suficiente"), e o subtítulo diz de onde vem o grau. O consentimento diz primeiro o que acontece com os arquivos; o nome de quem processa o dado continua dito, entre parênteses. | `src/constants/uspstfGrades.ts`, `ProfileScreen.tsx`, `ImportHealthDataScreen.tsx` |

### 2.1 Os nomes (D2)

Três regras:

1. **Um destino tem um nome.** O que leva a uma tela (aba, atalho, linha do
   hub, link) usa as palavras do título dela. Onde o rótulo não cabe o título
   inteiro, ele é o começo do título.
2. **O botão que abre um formulário tem o nome do formulário.**
3. **Excluir é sempre "Excluir".**

| Destino | Antes | Agora |
|---|---|---|
| A agenda | "Consultas" (Início, hub), "Agenda" (tela) | **Agenda** em todos. A tela guarda também exames e cirurgias. |
| O que se marca na agenda | "compromisso" (listas), "agendamento" (formulários), "consulta" (botão, resumo de hoje) | **compromisso** em todos: "Novo compromisso", "Editar compromisso", "Salvar compromisso", "Excluir compromisso", "2 compromissos às 15:00". |
| A tela dos medicamentos | "Remédios" (aba, Início), "Medicamentos" (tela) | **Remédios** nos três, e no nome do canal de notificação do Android. |
| O formulário de medicamento | "Novo lembrete", aberto pelo botão "Adicionar medicamento" | **Adicionar medicamento**, que faz par com "Editar medicamento". |
| A lista de documentos do Início | "Últimos exames" (lista também receitas) | **Últimos documentos**, como a tela de Exames chama os itens. |
| Excluir | "excluir", "apagar" (assistente), "deletar" (documentos) | **Excluir**. |

Ficaram como estavam, de propósito:

- **"Exames" (aba) e "Exames e receitas" (tela)**, **"Prevenção" (atalho) e
  "Prevenção & Alertas" (tela)**, **"Vacinação" e "Carteira de vacinação"**,
  **"Smartwatch" e "Dados do smartwatch"**: o rótulo curto é o que cabe na
  barra ou no atalho, e usa a mesma palavra do título.
- **Cada item da tela Remédios continua sendo um "medicamento"**
  ("Adicionar medicamento", "Medicamento salvo."). É a palavra das bulas e
  receitas, e a mesma dos campos clínicos do perfil.
- **"Remover"** (um anexo, um horário, um arquivo escolhido): não exclui nada
  que esteja guardado, só tira um item de uma seleção.

O botão "Novo compromisso" da lista vazia do Início passou a abrir o
formulário. Ele dizia "Agendar consulta" e levava à Agenda, onde havia outro
botão igual.

As descrições do hub Mais foram encurtadas para caber em uma linha em 360dp
(até 25 caracteres): quatro das seis eram cortadas com reticências.

### 2.2 Os cabeçalhos (D3)

| Tela | Antes | Agora |
|---|---|---|
| Remédios | título 26px, escrito à mão | `ScreenHeader`, 24px |
| Carteira de vacinação | `DetailHeader`, 20px; voltar com `router.back()` | `ScreenHeader` com voltar, 24px, como Agenda, Prevenção e Dados do smartwatch; volta ao hub quando não há histórico |
| Novo compromisso, Editar compromisso | título 28px, escrito à mão | `DetailHeader`, 20px; o de editar aparece também enquanto carrega e no erro |
| Adicionar medicamento, Editar medicamento, Adicionar vacina | cópia à mão do `DetailHeader` | `DetailHeader` (sem mudança visual) |
| Editar perfil | título 17px centralizado, seta sem borda, fixo fora da rolagem | `DetailHeader`, 20px |
| Importar dados de saúde | `BackHeader`, o do fluxo de entrada | `DetailHeader` |

Os três formulários feitos com `StyleSheet` (compromisso e documento) passaram
a ter os mesmos 24dp de respiro no topo dos demais, para o cabeçalho ficar na
mesma altura em todos.

## 3. Notas

- **O aviso de "salvo" mora fora do React (D5).** O formulário fecha ao
  salvar; quem mostra o aviso é a tela de destino. `avisarSucesso(...)` guarda
  a frase num módulo, e o `AvisoDeSucesso`, montado no `AppShell`, a mostra. É
  o mesmo desenho de `conversaAberta.ts`.
- **Sem pop-up de sucesso no cadastro (D4).** "Quase lá! Enviamos um código…"
  e "Sucesso! Sua conta foi confirmada" eram pop-ups por cima da troca de
  tela. A tela seguinte já diz a mesma coisa (a de confirmação abre com
  "Verifique seu e-mail. Enviamos um código de 6 dígitos para …"). Em
  Recuperar senha, a tela mostra "Senha alterada. Entre com a nova senha." por
  menos de um segundo e volta ao Login, como o Login faz com "Bem-vindo(a) de
  volta!".
- **Graus (D8).** Os nomes curtos são texto próprio do app e dizem o mesmo
  que a explicação que o cartão de cada recomendação já traz.
- **`min-w-0` no campo de texto.** No navegador, o olho do campo de senha saía
  da caixa em 360dp, porque um `<input>` não encolhe abaixo da largura padrão.
  No celular não muda nada.

## 4. Fora de escopo, com motivo

- **Texto abaixo de 16px, alvos de toque abaixo de 48dp, contraste do cinza no
  tema claro, papéis para o leitor de tela.** São o grupo "regras de design" da
  auditoria, não pedido nesta leva. O `Button` do app continua sem papel de
  botão declarado.
- **O emoji de alerta no aviso de interação de Remédios**, e os demais itens do
  grupo "coisas menores" da auditoria.
- **Trocar "medicamento" por "remédio" em todo o app.** A palavra está também
  nos campos clínicos do perfil, nos textos de interação medicamentosa e nas
  respostas do assistente.
- **Termos de Uso e Política de Privacidade**, como na EPIC anterior.

## 5. Critérios de aceite

- [x] D1 a D8 cobertos por teste (ver `__tests__/sairDaConta`,
      `nomesDosDestinos`, `cabecalhosDasTelas`, `validacaoSemPopUp`,
      `avisoDeSucesso`, `confirmacaoAoSalvar`, `textosDaInterface`).
- [x] `npm run validate` verde.
- [x] Telas alteradas conferidas no navegador, pela rota `/dev-preview`, em
      360dp e 390dp, claro e escuro.
- [ ] Conferência em aparelho real, com login (sem dispositivo neste ambiente):
      sair da conta, o aviso de "salvo" depois de cada formulário, o cadastro
      até a confirmação e a troca de senha.
