# TASKS: Perfil, Home e Agenda — Novo agendamento

## Schema / backend
- [ ] Editar `amplify/data/schemas/appointments.ts`: remover `.required()` de `professionalName` e de `address` (mantendo `a.string()` opcional). `appointmentName` e `scheduledAt` permanecem `.required()`.
- [ ] Rodar `nvm use 20.20.1` e `ampx sandbox` (ou deploy equivalente) para aplicar a mudança de schema; confirmar que registros `Appointment` já existentes continuam sendo lidos sem erro.
- [ ] Editar `src/services/appointmentService.ts` (`createAppointment`): normalizar `professionalName` e `address` vazios/whitespace para `undefined`/`null` antes de `client.models.Appointment.create(...)`, seguindo o mesmo padrão já usado para `observations`.

## Componente `Button` (verificar antes de decidir)
- [ ] Ler `src/components/Button.tsx` e confirmar se já existe suporte a "desabilitado com motivo" (bg `#DFE3E1`/texto `#7A8480`) reutilizável, ou se é preciso adicionar uma variante/prop nova sem quebrar as demais telas que já usam `Button`.

## `AddAppointmentScreen.tsx` — estrutura e copy
- [ ] Remover o subtítulo "Cadastre um compromisso para sua agenda." do header (não existe no Canvas 2d).
- [ ] Trocar o rótulo "Tipo de agendamento" por "Tipo".
- [ ] Ajustar placeholders dos inputs para bater com o Canvas: "Ex.: Consulta cardiologista" (nome), "Ex.: Dr. Ricardo Alves" (profissional), "dd/mm/aaaa" (data), "hh:mm" (hora), "Ex.: Av. Paulista, 1000 - São Paulo/SP" (endereço), "Ex.: levar exames anteriores" (observações) — e rótulo "Observações (opcional)" em vez de "Observações".

## Chips de tipo (Consulta/Exame/Cirurgia)
- [ ] Trocar `flexBasis: '31%'` + `flexWrap` por `flex: 1` sem wrap, 3 colunas fixas, altura 64px, radius 14px, `gap: 8`.
- [ ] Atualizar cores para os tokens exatos de `DESIGN_TOKENS.md`: selecionado = borda 1.5px `#10794E`, bg `#E8F5EE`, ícone/texto `#0C6341`; não selecionado = borda 1.5px `#DFE3E1`, bg branco, ícone/texto neutro (`#363D3B`/`#55605C`).
- [ ] Decidir e documentar (no PR/commit) se os emojis atuais são mantidos como placeholder de ícone ou substituídos por ícones vetoriais simples (View com bordas replicando os glifos do Canvas: círculo para Consulta, retângulo para Exame, quadrado com cruz para Cirurgia).
- [ ] Remover a pré-seleção implícita de tipo — `appointmentType` inicia como `null`/indefinido (ajustar tipagem para `AppointmentType | null`) — ou, se optar por manter "Consulta" pré-selecionado, documentar a decisão explicitamente em comentário no código e no PR (referenciando `spec.md` §8).
- [ ] Ajustar fallback de envio: se `appointmentType` estiver `null` no momento do submit (não deveria acontecer se a validação exige nome/data/hora mas não tipo — revisar se tipo deveria também ser obrigatório; o Canvas não lista tipo em `nfInvalid`, então tratar como sempre com fallback `'CONSULTA'` apenas no payload).

## Layout Data + Hora
- [ ] Envolver os campos "Data" e "Hora" em uma `View` com `flexDirection: 'row', gap: 12`, cada campo com `flex: 1`, replicando o layout lado a lado do Canvas (hoje estão empilhados verticalmente).
- [ ] Confirmar que `DateInput` funciona corretamente dentro de um container `flex: 1` sem quebrar seu layout interno (label + campo); ajustar estilos internos do componente se necessário (fora do escopo de tela, mas necessário para a tela ficar correta).
- [ ] Remover o valor default `'14:00'` de `scheduledTime` (`useState('')`).

## Validação inline (sem alert)
- [ ] Adicionar state derivado `isFormInvalid = !appointmentName.trim() || !scheduledDate.trim() || !scheduledTime.trim()`.
- [ ] Remover o bloco `if (...) { alert('Preencha todos os campos obrigatórios.'); return; }` de `handleSubmit`.
- [ ] Passar `disabled={isFormInvalid || isSubmitting}` ao `Button` "Salvar agendamento", com estilo visual desabilitado (`#DFE3E1`/`#7A8480`) quando `isFormInvalid` for `true` (independente de `isSubmitting`).
- [ ] Renderizar `Text` condicional "Preencha nome, data e hora para salvar." centralizado abaixo do botão, visível apenas quando `isFormInvalid` for `true` (400 16px `#55605C`, `margin-top: 8`).
- [ ] Confirmar que Profissional, Endereço e Observações vazios **não** bloqueiam o botão (só nome/data/hora bloqueiam).

## Tratamento de erro de rede/backend
- [ ] Substituir o `alert(message)` do `catch` em `handleSubmit` por um estado de erro local (`const [submitError, setSubmitError] = useState<string | null>(null)`) exibido como texto/callout inline (reaproveitar padrão de erro de `DESIGN_TOKENS.md` §4), garantindo que os campos preenchidos não sejam limpos.
- [ ] Confirmar que, em caso de erro, `isSubmitting` volta a `false` e o botão volta ao estado habilitado (já é o comportamento do `finally` atual — manter).

## Navegação
- [ ] Confirmar que o botão de voltar (`‹`) chama `router.back()` para a Agenda (2c) sem persistir nada (já é o comportamento atual — só validar que se mantém após as mudanças).
- [ ] Confirmar que `createAppointment()` bem-sucedido chama `router.back()` e que a Agenda (2c) reflete o novo compromisso via `invalidateAppointmentsCache()` (já implementado em `appointmentService.ts` — validar end-to-end).

## Dark mode
- [ ] Validar chips (selecionado/não selecionado), inputs, botão (habilitado/desabilitado) e texto de apoio contra os pares de cor de dark mode em `DESIGN_TOKENS.md` §1 ("Dark theme").

## Verificação final
- [ ] Comparar visualmente a tela renderizada (light e dark) contra o Canvas 2d (`specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html`, linhas 842-872).
- [ ] Rodar os cenários Given/When/Then de `spec.md` §2 manualmente (campos faltando, tipo Cirurgia, sucesso volta para 2c, erro de rede) e confirmar os critérios de aceite de `spec.md` §7 um a um.
