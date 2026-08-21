# EPIC: Editar agendamento — com exclusão confirmada

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela 2e ("Editar agendamento — com exclusão confirmada") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 874-918).
- Rota/arquivo no código (existente): `edit-appointment?id=` → `src/app/edit-appointment.tsx` (lê `id` via `useLocalSearchParams`, retorna `null` se ausente) → `src/screens/EditAppointmentScreen.tsx` (`EditAppointmentScreen`).
- Ator(es): usuário final (pessoa que já tem ao menos um agendamento cadastrado na Agenda e quer corrigir dados ou removê-lo).

## 2. História da funcionalidade
Como usuário do SuaSaúde, quero abrir um agendamento já cadastrado a partir da Agenda (2c) com os campos pré-preenchidos (igual ao formulário de criação 2d), poder corrigir tipo/nome/profissional/data/hora/endereço/observações e salvar as alterações, ou excluir o agendamento por completo quando ele deixou de ser relevante — sempre com uma confirmação explícita antes da exclusão, já que essa ação é irreversível.

### Cenários (Given/When/Then)
- **Abrir tela com dados pré-preenchidos:** Dado que o usuário toca em um item da lista de agendamentos em 2c (Agenda), quando `edit-appointment?id=` monta e `getAppointmentById(id)` retorna um registro válido, então a tela mostra o cabeçalho "Editar agendamento" com botão voltar "‹", os chips de Tipo (Consulta/Exame/Cirurgia) com o valor atual selecionado, e os campos Nome do agendamento, Profissional, Data, Hora, Endereço e Observações (opcional) já preenchidos com os valores do agendamento — igual em estrutura ao formulário de criação (2d), mas com dados existentes.
- **Editar e salvar com sucesso:** Dado que o usuário altera um ou mais campos e toca em "Salvar alterações", quando `updateAppointment` retorna sucesso, então o registro é atualizado no DynamoDB, o cache local de agenda é invalidado (`invalidateAppointmentsCache`) para que 2c/Home reflitam a mudança na próxima leitura, uma confirmação de sucesso é exibida e o app volta para a Agenda (2c).
- **Editar e salvar com erro:** Dado que `updateAppointment` rejeita a chamada (erro de rede/validação), quando o erro é capturado, então uma mensagem de erro é exibida ao usuário, os campos editados permanecem preenchidos (não são descartados) e a tela permanece em edição para nova tentativa.
- **Tentar excluir (mostra confirmação):** Dado que o usuário toca em "Excluir agendamento" (outline vermelho, abaixo de "Salvar alterações"), quando o toque é processado, então a tela substitui os dois botões (Salvar/Excluir) pelo painel de confirmação vermelho (`#FDECEA`/`#F3C9C5`, ícone "!" circular, texto "Tem certeza? Essa ação não pode ser desfeita.") com os botões "Cancelar" (outline) e "Excluir" (vermelho sólido) — nenhuma chamada de rede ocorre nesse passo.
- **Cancelar exclusão:** Dado que o painel de confirmação está aberto e o usuário toca em "Cancelar", quando a ação é processada (`cancelDelete`), então o painel fecha e a tela volta ao par de botões "Salvar alterações"/"Excluir agendamento" original, sem nenhuma chamada ao backend e sem perda dos dados editados no formulário.
- **Confirmar exclusão (sucesso):** Dado que o painel de confirmação está aberto e o usuário toca em "Excluir", quando `deleteAppointment` retorna sucesso, então o registro é removido do DynamoDB, o cache local de agenda é invalidado (`invalidateAppointmentsCache`), uma confirmação é exibida e o app navega de volta para a Agenda (2c).
- **Confirmar exclusão (erro):** Dado que `deleteAppointment` falha (erro de rede), quando o erro é capturado, então uma mensagem de erro é exibida, a tela permanece no agendamento (não navega para trás) e o painel de confirmação fecha, permitindo nova tentativa.
- **Erro de rede ao carregar o agendamento:** Dado que `getAppointmentById(id)` falha ou não encontra o registro (id inválido, agendamento já excluído em outra sessão, erro de rede), quando a busca é resolvida, então a tela **não** deve travar num "Carregando..." indefinido nem renderizar em branco — deve exibir uma mensagem clara ("Agendamento não encontrado" ou mensagem de erro de rede) com um caminho de volta para a Agenda (2c).
- **Fallback de deep link vazio (gap conhecido, mesma classe do 3c):** Dado que o usuário acessa `/edit-appointment` sem `id` na URL (cold start, deep link externo, navegação direta), quando a rota monta, então ela **nunca** deve renderizar `null`/tela em branco — deve redirecionar para `/appointments` (2c) ou exibir um estado de erro claro com botão de volta.

## 3. Estrutura da página
Replicando a Tela 2e do Canvas (frame 390×844, fundo `#F7F8F7`):
- **Barra de status mock** (48px) — decorativa, padronizada em outras telas.
- **Cabeçalho**: botão "voltar" 48×48 (radius 14px, borda 1.5px `#DFE3E1`, ícone "‹") + título "Editar agendamento" (600 20px `#141817`), sem botão adicional à direita (diferente de 3c, que tem "Editar" — aqui a tela já abre editável).
- **Corpo com scroll** (`padding:8px 20px 0`):
  - Label "Tipo" (600 16px `#363D3B`) + 3 chips lado a lado (64px altura, radius 14px, `gap:8px`): "Consulta" (ícone círculo), "Exame" (ícone retângulo), "Cirurgia" (ícone com cruz) — selecionado: borda 1.5px `#10794E`, bg `#E8F5EE`, texto `#0C6341`; não selecionado: borda 1.5px `#DFE3E1`, bg `#fff`, texto `#55605C` — mesmo padrão de chip binário/ternário documentado em `DESIGN_TOKENS.md` §4.
  - Campo "Nome do agendamento" (input 52px altura, radius 14px, borda 1.5px `#DFE3E1`, texto 400 17px `#141817`), label acima (600 16px `#363D3B`).
  - Campo "Profissional" (mesmo padrão de input).
  - Linha com dois campos lado a lado (`gap:12px`): "Data" e "Hora" (mesmo padrão de input, `flex:1` cada).
  - Campo "Endereço" (mesmo padrão de input).
  - Campo "Observações (opcional)" — `textarea` 3 rows, mesmo radius/borda, `resize:none`.
- **Rodapé** (`padding:10px 20px 16px`), dois estados mutuamente exclusivos:
  - **`efNotConfirming`** (padrão): botão "Salvar alterações" (sólido verde `#10794E`, texto branco, altura 56px, radius 14px, largura total) + botão "Excluir agendamento" (outline vermelho, borda 1.5px `#B3261E`, texto `#B3261E`, altura 56px, radius 14px, `margin-top:10px`, largura total).
  - **`efConfirmDelete`**: painel vermelho (fundo `#FDECEA`, borda 1px `#F3C9C5`, radius 16px, padding 16px) com ícone "!" circular (26px, fundo `#B3261E`, texto branco) + "Tem certeza? Essa ação não pode ser desfeita." (400 17px `#141817`), seguido de dois botões lado a lado (`gap:10px`): "Cancelar" (outline, borda 1.5px `#DFE3E1`, 52px altura, radius 12px) e "Excluir" (sólido vermelho `#B3261E`, 52px altura, radius 12px, texto branco) — padrão idêntico ao reutilizado em 3c e 3g, documentado em `DESIGN_TOKENS.md` §4 "Confirmation/delete dialogs".
- **Home indicator** (barra 130×5px `#C3C9C6`), decorativa.

Nota: diferente de 3c, o Canvas de 2e não tem um modo "somente leitura" separado — a tela já abre com os campos editáveis (mesmo layout de 2d/"Novo agendamento"), e a única transição de estado visível é `efNotConfirming` ↔ `efConfirmDelete` no rodapé.

## 4. Mapa de navegação
| Origem | Destino | Trigger |
|---|---|---|
| `AgendaScreen` (`/appointments`, 2c) | `EditAppointmentScreen` (`/edit-appointment?id=`, 2e) | Toque em um item da lista de agendamentos do dia |
| `EditAppointmentScreen` | `/appointments` (2c) | Botão voltar "‹" do cabeçalho; "Salvar alterações" com sucesso; exclusão confirmada com sucesso; fallback de deep link vazio/erro de carregamento (novo, este EPIC) |
| `EditAppointmentScreen` (`efNotConfirming`) | `EditAppointmentScreen` (`efConfirmDelete`) | Toque em "Excluir agendamento" (`askDelete`) — transição de estado local, sem navegação |
| `EditAppointmentScreen` (`efConfirmDelete`) | `EditAppointmentScreen` (`efNotConfirming`) | Toque em "Cancelar" do painel (`cancelDelete`) — transição de estado local |

## 5. Mapa de dados
| Campo/estado | Fonte | Observação |
|---|---|---|
| Agendamento a editar | `getAppointmentById(id)` — `src/services/appointmentService.ts`, hoje implementado como `listAppointmentsForUser().find(...)` (lista completa e filtra em memória) | Chamada real, sem mock; ineficiente para agendas grandes mas funcionalmente correto — documentar como observação de performance, não bloqueante |
| `appointmentType`/`appointmentName`/`professionalName`/`scheduledDate`/`scheduledTime`/`address`/`observations` | Estado local de UI inicializado a partir do registro carregado | `scheduledAt` (ISO) é dividido em `scheduledDate`/`scheduledTime` no `load()` e remontado em `handleSave` |
| Atualização de agendamento | `updateAppointment(id, input)` — DynamoDB via `client.models.Appointment.update`, `src/services/appointmentService.ts` | Chamada real; já invalida o cache internamente (`invalidateAppointmentsCache()` dentro do próprio `updateAppointment`) |
| Exclusão de agendamento | `deleteAppointment(id)` — `client.models.Appointment.delete`, `src/services/appointmentService.ts` | Chamada real; já invalida o cache internamente (`invalidateAppointmentsCache()` dentro do próprio `deleteAppointment`) |
| Cache local de agenda | `invalidateAppointmentsCache()` (`src/hooks/appointmentsCache.ts`) | Já chamado hoje dentro de `updateAppointment` e `deleteAppointment` — preservar; diferente do padrão de exames, aqui a invalidação já está encapsulada no service, não precisa ser chamada manualmente pela tela |
| `id` de rota | Query param `?id=` na rota `/edit-appointment` (já existente) | Único parâmetro de entrada da tela; ausência de `id` hoje resulta em `return null` (gap, seção 6) |

## 6. Requisitos não-funcionais específicos
- **Confirmação de exclusão inline, não nativa (gap a corrigir)**: o padrão do Canvas 2e usa um painel de confirmação **inline** no rodapé da própria tela (`efConfirmDelete`), não um `confirm()`/`alert()` nativo do navegador/dispositivo — consistente com `DESIGN_TOKENS.md` §4 e reutilizado em 3c/3g. A implementação atual usa `confirm()` (linha `handleDelete`) e `alert()` para mensagens de sucesso/erro — divergência a resolver em `plan.md`.
- **Deep-link safety**: a rota `/edit-appointment` sem `id` não deve renderizar `null` (tela em branco) — mesmo gap identificado em 3c/`document-detail`; deve redirecionar para `/appointments` ou mostrar erro claro.
- **Estado de carregamento/erro ao buscar o agendamento**: hoje a tela mostra apenas "Carregando..." enquanto `appointment` é `null`, sem tratar o caso de `getAppointmentById` nunca resolver um valor (id inválido/excluído) — deve haver um estado de erro terminal com caminho de volta, não um loading infinito.
- **Botões mutuamente exclusivos no rodapé**: "Salvar alterações"/"Excluir agendamento" e o painel de confirmação nunca devem aparecer simultaneamente (equivalente a `sc-if efNotConfirming` / `sc-if efConfirmDelete` no Canvas).
- **Toque mínimo**: botões principais ≥56px, botões do painel de confirmação ≥52px, conforme Canvas.
- **Dark mode**: todos os elementos (chips, inputs, botões, painel de confirmação) devem seguir os pares dark de `DESIGN_TOKENS.md` §1, sem hex fixos do Canvas claro hardcoded — a implementação atual usa `COLORS`/`FONTS`/`SIZES` de `src/constants/theme` sem suporte dark explícito (verificar em `plan.md`).
- **LGPD (regra 4 da constituição)**: agendamento é dado de saúde do próprio usuário em fluxo de autoatendimento; não requer consentimento adicional nesta tela, mas a exclusão real (DynamoDB) é o mecanismo que garante o direito do usuário de apagar seus próprios dados.

## 7. Critérios de aceite
- [ ] A tela abre com todos os campos pré-preenchidos com os valores do agendamento (Tipo selecionado, Nome, Profissional, Data, Hora, Endereço, Observações), estrutura idêntica ao formulário de 2d.
- [ ] "Salvar alterações" persiste via `updateAppointment`, o cache de agenda é invalidado e o app retorna para a Agenda (2c) com sucesso visível ao usuário.
- [ ] "Excluir agendamento" abre um painel de confirmação **inline na tela** (não um `confirm()`/`Alert` nativo) com o texto "Tem certeza? Essa ação não pode ser desfeita." e os botões Cancelar/Excluir, seguindo `DESIGN_TOKENS.md` §4.
- [ ] Cancelar a exclusão fecha o painel sem nenhuma chamada de rede, sem alterar dados e sem perder edições já feitas no formulário.
- [ ] Confirmar a exclusão remove o agendamento do DynamoDB, invalida o cache local e navega de volta para a Agenda (2c).
- [ ] Erros em salvar/excluir são comunicados ao usuário sem perda de dados já digitados nem navegação inesperada.
- [ ] **Acessar `/edit-appointment` sem `id` (deep link/cold start) nunca resulta em tela em branco** — redireciona para `/appointments` ou exibe erro claro com caminho de volta.
- [ ] Falha ao carregar o agendamento (`getAppointmentById` retorna nulo ou rejeita) exibe um estado de erro terminal com caminho de volta, em vez de "Carregando..." indefinido.
- [ ] Dark mode aplicado a todos os elementos via tokens `app-*`/`app-dark-*`, sem hex fixos hardcoded do Canvas claro.
