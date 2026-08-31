# PLAN: Perfil, Home e Agenda — Novo agendamento

## 1. Diagnóstico — diff contra `AddAppointmentScreen.tsx` atual

### 1.1 Validação: alerta bloqueante em vez de helper text inline
`handleSubmit` (linhas 29-33) faz:
```ts
if (!appointmentName.trim() || !professionalName.trim() || !scheduledDate.trim() || !scheduledTime.trim() || !address.trim()) {
  alert('Preencha todos os campos obrigatórios.');
  return;
}
```
Isso é exatamente o antipadrão que o Canvas evita: o Canvas usa `nfInvalid` como estado **derivado e sempre visível** (texto de apoio "Preencha nome, data e hora para salvar." some/aparece conforme o usuário digita) + botão com bg/texto dinâmicos (`nfSaveBg`/`nfSaveFg`), nunca um `alert()` reativo pós-toque. Mesmo padrão já resolvido em `AddExamScreen.tsx`/3b (botão desabilitado + sem alerta) — este EPIC replica essa solução aqui. Gap confirmado: **sim, usa `alert()` como em outras telas antigas do app; precisa ser substituído**.

### 1.2 Chips de tipo: existem, mas com layout e regra de cor diferentes do Canvas
O código atual (linhas 75-88, 161-166) já tem 3 botões Consulta/Exame/Cirurgia com `appointmentType` state — a mecânica básica existe. Diferenças a corrigir:
- Ícones são emojis (🩺🧪🔪) — Canvas desenha ícones vetoriais simples (círculo/retângulo/quadrado com cruz) em SVG/View nativos, sem emoji.
- Layout usa `flexBasis: '31%'` com `flexWrap` — Canvas usa `flex:1` sem wrap (3 colunas fixas, altura 64px).
- Cor de fundo selecionado usa `${COLORS.primary}15` (opacidade calculada) em vez do token exato `#E8F5EE` de `DESIGN_TOKENS.md`.
- Label do rótulo acima dos chips é "Tipo de agendamento" no código vs "Tipo" no Canvas (linha 847).

### 1.3 Campos: todos os 6 campos do Canvas já existem, mas layout de Data/Hora diverge
Nome, Profissional, Data, Hora, Endereço e Observações já estão todos presentes (linhas 92-139). Porém:
- Canvas coloca Data e Hora **lado a lado** em uma única linha (`display:flex;gap:12px`, cada `flex:1`). Código atual empilha `DateInput` (Data) e depois um `TextInput` solto (Hora) verticalmente — sem layout de linha.
- `scheduledTime` tem valor default `'14:00'` pré-preenchido no `useState` (linha 24) — Canvas não tem nenhum default, só placeholder "hh:mm".
- Subtítulo "Cadastre um compromisso para sua agenda." (linha 69) não existe no Canvas — é uma adição da implementação atual, que já embutiu texto de apoio (linha 133 do spec.md do Canvas) diferente do texto do design.

### 1.4 Botão Salvar: cor estática, não dinâmica
O `Button` component é chamado com `disabled={isSubmitting}` (linha 142) — ou seja, ele só fica desabilitado durante o loading de submissão, não conforme a validação de campos obrigatórios. Não há bg/texto dinâmicos conforme `nfInvalid`. Gap confirmado: **precisa de novo estado derivado (`isFormInvalid`) conectado ao `disabled` do `Button` e, se o componente `Button` não suportar variação de bg/fg via prop, precisa de um variant `disabled` visual explícito (`#DFE3E1`/`#7A8480`) — verificar `src/components/Button.tsx` antes de decidir se é ajuste local ou no componente compartilhado**.

### 1.5 Schema Amplify: `professionalName` e `address` como `.required()` conflita com o Canvas
`amplify/data/schemas/appointments.ts` linha 8-10:
```ts
appointmentName: a.string().required(),
professionalName: a.string().required(),
scheduledAt: a.string().required(),
address: a.string().required(),
```
O Canvas só cita nome/data/hora na regra de validação (`nfInvalid`, linha 868 do `.dc.html`) — não profissional nem endereço. Isso é uma **mudança de schema explícita** (regra 5 da constituição: nunca efeito colateral). Decisão proposta: remover `.required()` de `professionalName` e `address`, mantendo-os como `a.string()` opcional. Justificativa: alinhar aos únicos 3 campos citados pelo texto de apoio do Canvas; nada no design sugere que profissional/endereço sejam obrigatórios (ex.: uma consulta por telemedicina pode não ter endereço físico).

**Risco de migração**: campo `required → opcional` no Amplify Data (DynamoDB via AppSync) é uma mudança compatível para dados já existentes (registros antigos continuam válidos; apenas novos registros podem omitir o campo) — não quebra dados existentes (regra 5 da constituição respeitada). Rodar `ampx sandbox`/deploy após a mudança de schema (lembrar: Amplify precisa de Node 20, `nvm use 20.20.1`, conforme MEMORY.md).

### 1.6 `appointmentService.ts` / `createAppointment`: nenhuma mudança estrutural necessária
`createAppointment` já envia `professionalName`/`address` como estão no input; como o schema passa a aceitar strings vazias/ausentes, o service não precisa de lógica nova além de, opcionalmente, normalizar string vazia para `undefined`/`null` antes de enviar (mesmo padrão já usado para `observations` na linha 46 do `AddAppointmentScreen.tsx`: `observations.trim() || undefined`). Aplicar o mesmo trim/undefined a `professionalName` e `address` quando vazios, para consistência de dados salvos (não gravar string vazia `""` no DynamoDB).

## 2. Decisões de design/dados
1. **Campos obrigatórios**: nome, data, hora (alinhado ao Canvas). Profissional, endereço e observações passam a ser opcionais — no client (validação) e no schema (`amplify/data/schemas/appointments.ts`).
2. **Sem pré-seleção de tipo**: nenhum chip vem selecionado ao abrir a tela (ver ambiguidade documentada em `spec.md` §8); se o payload de criação precisar de um valor não-nulo antes do usuário escolher, usar fallback silencioso `'CONSULTA'` apenas no envio, nunca refletido visualmente como "selecionado" até o toque do usuário. Alternativa mais simples e igualmente válida (menos fricção de UX): manter "Consulta" pré-selecionado por padrão, documentando o desvio consciente do Canvas — decisão final fica a critério de quem implementar, ambas cumprem a regra 8 da constituição desde que documentadas.
3. **Sem default de hora**: remover `useState('14:00')` → `useState('')`.
4. **Layout Data/Hora em linha**: refatorar para um `View` com `flexDirection: 'row', gap: 12` contendo os dois campos lado a lado, cada um com `flex: 1` — substitui o empilhamento atual.
5. **Remover subtítulo** "Cadastre um compromisso para sua agenda." (não existe no Canvas) e o rótulo passa de "Tipo de agendamento" para "Tipo".
6. **Nenhuma nova biblioteca necessária** (regra 3 da constituição) — toda a mudança é de state derivado, layout e schema, reaproveitando `Button`, `Card`, `DateInput` já existentes.

## 3. Riscos e pendências
- Alterar `Button.tsx` (se ele não expuser hoje uma prop para cor de fundo/texto dinâmica em estado desabilitado "válido vs inválido") pode impactar outras telas que o consomem — checar seu contrato antes de editar; preferir uma prop nova opcional (ex.: `disabledReason`/variant) a quebrar a API existente.
- Migração de schema (`professionalName`/`address` de required para opcional) exige rodar `ampx sandbox` localmente com Node 20 antes de validar em produção — sem isso, o client pode continuar validando como obrigatório contra um schema desatualizado.
- `DateInput` component precisa ser inspecionado (não lido neste plano) para confirmar que aceita ser posicionado num container `flex:1` ao lado de outro input sem quebrar seu layout interno (label + campo).

## 4. Escopo de implementação (alto nível)
1. Ajustar schema (`amplify/data/schemas/appointments.ts`): `professionalName` e `address` sem `.required()`.
2. Ajustar `appointmentService.ts`: normalizar `professionalName`/`address` vazios para `undefined`/`null` antes de `create`.
3. Refatorar `AddAppointmentScreen.tsx`:
   - Remover subtítulo do header; rótulo "Tipo".
   - Substituir emojis por ícones vetoriais simples (View com bordas, conforme Canvas) ou manter emoji como placeholder documentado se não houver ícone SVG disponível no projeto (decisão de implementação, não bloqueia o EPIC).
   - Layout de chips: `flex:1` sem wrap, cores exatas de `DESIGN_TOKENS.md` (`#E8F5EE`/`#0C6341` selecionado, `#DFE3E1`/neutro não selecionado).
   - Nenhum tipo pré-selecionado por padrão (ou pré-seleção documentada, conforme decisão §2.2 acima).
   - Data e Hora lado a lado em uma `View` `flexDirection: row`.
   - Remover default `'14:00'` de `scheduledTime`.
   - Adicionar `isFormInvalid = !appointmentName.trim() || !scheduledDate.trim() || !scheduledTime.trim()` como state derivado (useMemo ou cálculo direto no render).
   - Remover `alert()` de validação; `Button` recebe `disabled={isFormInvalid || isSubmitting}` com estilo visual de desabilitado (`#DFE3E1`/`#7A8480`) quando `isFormInvalid`.
   - Renderizar texto de apoio "Preencha nome, data e hora para salvar." condicionalmente (`{isFormInvalid && <Text>...</Text>}`) abaixo do botão.
   - Manter tratamento de erro de rede/backend existente (try/catch em `handleSubmit`), trocando `alert(message)` genérico por mensagem específica exibida inline (ex.: `Text` de erro acima do botão) — evitar `alert()` também nesse caso, para consistência com o padrão de UX do app (embora o Canvas 2d não desenhe explicitamente o estado de erro de rede; reaproveitar o padrão de callout de erro de `DESIGN_TOKENS.md` §4 "Erro").
4. Validar visualmente contra o Canvas 2d em light e dark mode.
