# EPIC: Perfil, Home e Agenda — Novo agendamento

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela 2d ("Novo agendamento") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 842-872, entre 2c "Agenda" e 2e "Editar agendamento — com exclusão confirmada")
- Rota/arquivo no código (existente): `src/app/add-appointment.tsx` (rota `/add-appointment`) → `src/screens/AddAppointmentScreen.tsx` (`AddAppointmentScreen`)
- Ator(es): usuário final autenticado — qualquer pessoa que, a partir da Agenda (2c), toca no FAB/botão "+" para cadastrar um novo compromisso (consulta, exame ou cirurgia).

## 2. História da funcionalidade
Como usuário autenticado, quero abrir um formulário simples a partir da Agenda para cadastrar um novo compromisso — escolhendo o tipo (Consulta, Exame ou Cirurgia), informando nome, profissional, data, hora, endereço e observações opcionais — e salvar com um retorno claro sobre o que falta preencher, sem ser interrompido por um alerta bloqueante, para que o compromisso apareça na minha Agenda imediatamente após salvar.

### Cenários (Given/When/Then)
- **Abertura do formulário:** Dado que o usuário toca no botão de adicionar na Agenda (2c), quando a tela 2d abre, então nenhum tipo vem pré-selecionado no Canvas (ambiguidade: ver §8) e todos os campos de texto começam vazios, com "Hora" e "Data" sem valor default.
- **Tipo Cirurgia selecionado:** Dado que o usuário toca no chip "Cirurgia", quando a seleção é aplicada, então o chip "Cirurgia" passa ao estado selecionado (borda 1.5px `#10794E`, bg `#E8F5EE`, ícone/texto `#0C6341`) e os chips "Consulta"/"Exame" voltam ao estado não selecionado (borda `#DFE3E1`, bg branco) — o valor enviado ao salvar é `appointmentType: 'CIRURGIA'`.
- **Campos obrigatórios faltando (nome, data ou hora):** Dado que o usuário não preencheu "Nome do agendamento", "Data" e/ou "Hora", quando ele olha para o botão "Salvar agendamento" (ou tenta tocar nele), então o botão permanece no estado visualmente desabilitado (bg `#DFE3E1`, texto `#7A8480`) e um texto de apoio "Preencha nome, data e hora para salvar." aparece centralizado abaixo do botão — **não** deve haver `alert()`/diálogo bloqueante reativo pós-toque, conforme o padrão `nfInvalid` do Canvas.
- **Profissional e Endereço são opcionais:** Dado que o usuário preencheu apenas Nome, Data e Hora (sem Profissional nem Endereço), quando esses três campos estão completos, então o botão "Salvar agendamento" fica habilitado (bg `#10794E`, texto branco) e o salvamento deve ser aceito mesmo com Profissional/Endereço vazios — o Canvas só cita nome/data/hora na mensagem de validação, não profissional/endereço (ver gap de schema em `plan.md`).
- **Sucesso — salva e volta para a Agenda (2c):** Dado que Nome, Data e Hora estão preenchidos (Profissional/Endereço/Observações preenchidos ou não), quando o usuário toca em "Salvar agendamento" com o botão habilitado, então um registro `Appointment` é criado no DynamoDB via `createAppointment()`, o cache local de agendamentos é invalidado, e o usuário retorna à tela 2c (Agenda) vendo o novo compromisso na lista/calendário.
- **Erro de rede/backend ao salvar:** Dado que todos os campos obrigatórios estão preenchidos e o usuário toca em "Salvar agendamento", quando a chamada `client.models.Appointment.create(...)` falha (rede indisponível, erro de permissão, timeout, erro de validação do servidor), então o botão sai do estado de carregamento, uma mensagem de erro específica é exibida (não um alerta genérico "Erro ao salvar agendamento" sem contexto), nenhuma navegação ocorre, e os campos já preenchidos permanecem na tela para nova tentativa.
- **Alternância de tipo não descarta os demais campos:** Dado que o usuário já preencheu nome/data/hora/endereço e depois muda o tipo de "Consulta" para "Exame" (ou qualquer outra combinação), quando a seleção muda, então nenhum outro campo é limpo — apenas o estado visual dos 3 chips muda.
- **Voltar sem salvar:** Dado que o usuário toca no botão de voltar (`‹`, 48×48px) no header, quando a ação ocorre, então a tela retorna para a Agenda (2c) sem persistir nada, independentemente do estado de preenchimento do formulário.

## 3. Estrutura da página
- **Status bar mock**: 48px altura, "9:41" + glifo de sinal — decorativo, não implementar como funcional (fora do sistema operacional real).
- **Header**: botão de voltar (`‹`, 48×48px, radius 14, borda 1.5px `#DFE3E1`, bg branco) + título "Novo agendamento" (600 20px `#141817`) — sem subtítulo no Canvas (a implementação atual tem um subtítulo "Cadastre um compromisso para sua agenda." que **não existe no design**; ver `plan.md`).
- **Rótulo "Tipo"** (600 16px `#363D3B`, não "Tipo de agendamento" como no código atual).
- **3 chips de tipo lado a lado** (`display:flex;gap:8px`, cada um `flex:1;height:64px;radius:14px`):
  - **Consulta**: ícone círculo (20×20px, borda 2px), label "Consulta".
  - **Exame**: ícone retângulo vertical (16×20px, borda 2px, radius 3px), label "Exame".
  - **Cirurgia**: ícone quadrado arredondado (20×20px, borda 2px, radius 6px) com um "+"/cruz interno (duas barras 2px), label "Cirurgia".
  - Não selecionado: borda 1.5px `#DFE3E1`, bg branco/transparente, ícone+texto em cor neutra (`nfConsultaColor`/etc. não selecionado — cor neutra `#55605C`/`#363D3B`, inferido pelo padrão de chips do `DESIGN_TOKENS.md` §4).
  - Selecionado: borda 1.5px `#10794E`, bg `#E8F5EE`, ícone+texto `#0C6341`.
- **Campo "Nome do agendamento"** (label 600 16px + input altura 52px, radius 14, borda `#DFE3E1`, placeholder "Ex.: Consulta cardiologista").
- **Campo "Profissional"** (mesmo padrão, placeholder "Ex.: Dr. Ricardo Alves").
- **Linha com 2 campos lado a lado** (`display:flex;gap:12px`): "Data" (placeholder "dd/mm/aaaa") e "Hora" (placeholder "hh:mm") — cada um ocupando `flex:1`, **não empilhados verticalmente** como na implementação atual.
- **Campo "Endereço"** (mesmo padrão, placeholder "Ex.: Av. Paulista, 1000 - São Paulo/SP").
- **Campo "Observações (opcional)"** — textarea 3 rows, mesmo padrão visual, `resize:none`, placeholder "Ex.: levar exames anteriores".
- **Botão primário "Salvar agendamento"** (altura 56px, radius 14, bg/texto dinâmicos via `nfSaveBg`/`nfSaveFg`: verde `#10794E`/branco quando nome+data+hora preenchidos, cinza `#DFE3E1`/texto `#7A8480` quando não).
- **Texto de apoio condicional** (`sc-if nfInvalid`) — "Preencha nome, data e hora para salvar." (400 16px `#55605C`, centralizado, margin-top 8px) — exibido **apenas** enquanto o botão está desabilitado; some assim que nome+data+hora ficam completos.
- **Barra home-indicator** (130×5px, `#C3C9C6`) — decorativa.

## 4. Mapa de navegação
| Origem | Destino | Trigger |
|---|---|---|
| `/appointments` (2c, Agenda — FAB/botão "+") | `/add-appointment` | Toque no botão de adicionar compromisso |
| `/add-appointment` | `/appointments` (2c) | Toque no botão de voltar (`‹`) — `router.back()` |
| `/add-appointment` | `/appointments` (2c) | `createAppointment()` bem-sucedido — o Canvas nomeia a tela seguinte como "2c" (Agenda), coerente com o comportamento atual (`router.back()` após salvar) |
| `/add-appointment` | (permanece na tela) | Nome/Data/Hora incompletos — botão desabilitado, sem navegação, sem alerta |
| `/add-appointment` | (permanece na tela) | Erro do backend ao salvar — mensagem de erro exibida, nenhuma navegação ocorre |

## 5. Mapa de dados
| Campo/estado (Canvas) | Campo (código) | Fonte/model | Observação |
|---|---|---|---|
| `nfConsulta`/`nfExame`/`nfCirurgia` (seleção de tipo) | `appointmentType` (state local, `AppointmentType`) | `Appointment.appointmentType` (`a.enum(['CONSULTA','EXAME','CIRURGIA'])`) | Já mapeado 1:1 no código atual; ajustar apenas para não vir pré-selecionado (ver §8) |
| `nfName` | `appointmentName` (state local) | `Appointment.appointmentName` (`a.string().required()`) | Obrigatório em schema e em UX (mensagem de validação do Canvas) — alinhado |
| `nfProf` | `professionalName` (state local) | `Appointment.professionalName` — hoje `.required()` no schema | **Gap de schema**: Canvas trata profissional como opcional (não citado na mensagem de validação `nfInvalid`); ver `plan.md` para decisão (tornar `a.string()` opcional) |
| `nfDate` + `nfTime` | `scheduledDate` + `scheduledTime` (states locais, combinados em `scheduledAt`) | `Appointment.scheduledAt` (`a.string().required()`) | Ambos obrigatórios em schema e UX — alinhado; a combinação `${date}T${time}` já ocorre em `handleSubmit` |
| `nfAddr` | `address` (state local) | `Appointment.address` — hoje `.required()` no schema | **Gap de schema**: Canvas trata endereço como opcional (não citado em `nfInvalid`); ver `plan.md` |
| `nfNotes` | `observations` (state local) | `Appointment.observations` (`a.string()`, já opcional) | Alinhado — enviado como `undefined`/`null` quando vazio |
| `nfInvalid` (booleano derivado) | Não existe hoje — precisa ser calculado (`!appointmentName.trim() \|\| !scheduledDate.trim() \|\| !scheduledTime.trim()`) | Derivado em memória, não persistido | Controla tanto o estado visual do botão quanto a exibição do texto de apoio |
| `nfSaveBg`/`nfSaveFg` (cores dinâmicas do botão) | Não existe hoje — `Button` atual só reage a `disabled`/`isSubmitting` sem variar cor conforme validação | Derivado de `nfInvalid` | Precisa mapear para os tokens `#10794E`/branco (habilitado) vs `#DFE3E1`/`#7A8480` (desabilitado) |
| — | `createAppointment()` (`src/services/appointmentService.ts`) | `client.models.Appointment.create(...)` (Amplify Data) | Owner-based (`allow.owner()`) — cada usuário só vê/edita seus próprios agendamentos; já real, sem mock |
| — | Cache local de agenda | `invalidateAppointmentsCache()` (`src/hooks/appointmentsCache.ts`), chamado dentro de `createAppointment()` | Garante que 2c mostre o novo compromisso sem refetch manual |

## 6. Requisitos não-funcionais específicos
- **Validação sem alerta bloqueante (regra 1 e 8 da constituição)**: a implementação atual usa `alert('Preencha todos os campos obrigatórios.')` dentro de `handleSubmit`, disparado só depois do toque — isso diverge do padrão `nfInvalid` do Canvas (helper text sempre visível/reativo enquanto o formulário está incompleto, sem esperar o toque). O botão "Salvar agendamento" deve refletir visualmente o estado (bg/texto dinâmicos) e o texto de apoio deve aparecer/desaparecer conforme nome+data+hora mudam, mesmo antes de qualquer toque no botão.
- **Escopo de campos obrigatórios (decisão de schema, regra 5 da constituição)**: hoje `professionalName` e `address` são `.required()` no schema Amplify (`amplify/data/schemas/appointments.ts`), mas o Canvas só exige nome+data+hora (mensagem `nfInvalid` não menciona profissional nem endereço). Este EPIC assume a interpretação mais coerente com o Canvas — tornar `professionalName` e `address` opcionais no schema e na validação client-side — e documenta isso como mudança de schema explícita em `plan.md` (não efeito colateral).
- **Formato de data/hora**: Canvas usa placeholders "dd/mm/aaaa" e "hh:mm" (formato brasileiro de exibição); a implementação atual já usa um `DateInput` component para a data (que provavelmente já normaliza para `YYYY-MM-DD` internamente) e um `TextInput` livre para hora com valor default `'14:00'` pré-preenchido — o Canvas não tem nenhum valor default para hora (placeholder apenas); remover o default.
- **Botão desabilitado sempre com motivo (padrão já usado em 1d/3b)**: manter o padrão de bg `#DFE3E1`/texto `#7A8480` quando desabilitado, com o texto de apoio explicando o motivo — nunca um botão cinza sem explicação.
- **Nunca cor sozinha**: os 3 chips de tipo já combinam borda + bg + cor de ícone/texto no estado selecionado — manter esse padrão ao implementar.
- **Sem dado mockado (regra 2 da constituição)**: tipo, nome, profissional, data, hora, endereço e observações já são persistidos via `Appointment` real no DynamoDB — sem pendência.
- **Acessibilidade de toque**: chips (64px altura), campos (52px altura) e botão (56px altura) já atendem ao piso de 48-56dp de `DESIGN_TOKENS.md` §3.
- **Layout data/hora lado a lado**: a implementação atual empilha "Data" (via `DateInput`) e "Hora" (via `TextInput` solto) verticalmente; o Canvas desenha os dois campos em uma única linha (`flex` 1/1, gap 12px) — ajustar o layout para bater com o Canvas.
- **Dark mode**: aplicar os pares de cor de `DESIGN_TOKENS.md` (chip selecionado/não selecionado, botão habilitado/desabilitado, inputs) ao tema escuro — não coberto explicitamente pelo Canvas 2d (que só mostra o tema claro), mas obrigatório pela regra de dark mode já estabelecida no design system (ver 1c).

## 7. Critérios de aceite
- [ ] 3 chips de tipo (Consulta/Exame/Cirurgia) lado a lado, mesmo ícone/estilo descrito no Canvas, seguindo o padrão selecionado/não selecionado de `DESIGN_TOKENS.md` (borda+bg+cor), com nenhum tipo pré-selecionado ao abrir a tela (ou, se mantida pré-seleção por decisão documentada em `plan.md`, justificativa explícita).
- [ ] Campos "Nome do agendamento", "Profissional", "Data", "Hora" (lado a lado com Data), "Endereço" e "Observações (opcional)" seguem os placeholders e o padrão visual (altura 52px, radius 14, borda `#DFE3E1`) do Canvas.
- [ ] Botão "Salvar agendamento" fica visualmente desabilitado (bg `#DFE3E1`, texto `#7A8480`) enquanto Nome, Data ou Hora estiverem vazios; habilitado (verde `#10794E`/branco) quando os três estiverem preenchidos — Profissional, Endereço e Observações não bloqueiam o salvamento.
- [ ] Texto de apoio "Preencha nome, data e hora para salvar." aparece centralizado abaixo do botão sempre que ele está desabilitado, e desaparece quando os três campos obrigatórios ficam completos — sem depender de um `alert()`/diálogo bloqueante pós-toque.
- [ ] Ao salvar com sucesso, um registro `Appointment` é criado (`createAppointment()`), o cache de agendamentos é invalidado, e o usuário retorna à Agenda (2c) vendo o novo compromisso.
- [ ] Erro de rede/backend ao salvar exibe mensagem de erro específica, sem navegar, mantendo os campos preenchidos para nova tentativa.
- [ ] Schema Amplify (`appointments.ts`) e validação client-side refletem a mesma regra de campos obrigatórios (nome, data, hora) — `professionalName` e `address` deixam de ser `.required()` no schema, com a mudança documentada em `plan.md`.
- [ ] Tela funciona em light e dark mode com os pares de cor definidos em `DESIGN_TOKENS.md` (chips selecionado/não selecionado, botão habilitado/desabilitado incluídos).

## 8. Ambiguidades documentadas (regra 8 da constituição)
- **Pré-seleção de tipo**: o Canvas não indica visualmente (via `{{ }}` bindings) qual chip vem selecionado por padrão ao abrir a tela — não há `sc-if`/valor inicial explícito no markup de 2d. A interpretação mais coerente é **nenhum tipo pré-selecionado** (equivalente a `nfConsulta = null` em memória), forçando o usuário a escolher — isso também é coerente com `nfInvalid` citar apenas nome/data/hora, o que sugere que tipo tem um valor neutro/default que não bloqueia o salvamento (ex.: `'CONSULTA'` como fallback silencioso no payload, mas sem estado visual "selecionado" até o toque). Caso a equipe prefira pré-selecionar "Consulta" por UX (reduzir toques), documentar a escolha aqui como desvio consciente do Canvas.
- **Formato de armazenamento de `scheduledAt`**: o schema atual guarda `scheduledAt` como string livre (`a.string().required()`), combinando data+hora em `${date}T${time}`. O Canvas não expõe o formato de persistência (só a UI com dois campos separados) — manter a estratégia atual de combinar em uma string ISO-like é a interpretação mais coerente, sem exigir migração de schema.
