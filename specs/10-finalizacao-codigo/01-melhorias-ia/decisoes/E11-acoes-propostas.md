# Decisões do E11 — Ações propostas pela IA e confirmadas pelo usuário

Épico: [E11 no PRD](../prd.md) · Ordem de entrega: 11º · Quatro decisões: D11.1 a D11.4 (nasceram no estudo [`estudos/E11-acoes-propostas.md`](../estudos/E11-acoes-propostas.md))

Já decidido pelo produto (2026-10-17): a IA propõe, a pessoa confirma e salva; a função continua somente leitura. O que falta é onde a confirmação acontece, quais ações entram, e duas regras de preenchimento.

## O que o código faz hoje (verificado em 2026-10-20)

- A memória (D34) já tem o desenho completo: campo opcional no envelope (`chatSchema.ts`), validação no servidor que recusa em silêncio (`memoria/propostaValida.ts`, `verificacao.ts`), limites num módulo sem importação lido pelos dois lados (`memoria/regras.ts`), e o cartão abaixo da bolha com dois botões iguais (`MemoryProposalCard.tsx`). Quem grava é o cliente.
- `add-appointment` e `add-medicine` começam vazios e não leem parâmetro de rota.
- O formulário de remédio exige nome, dosagem, forma, horário, frequência, início, estoque e unidade, e ao salvar agenda os lembretes e mostra o aviso de interação.
- `toggleMedicineDose` grava a dose e mexe no estoque.
- O prompt diz hoje "Você não cadastra nada: diga onde a pessoa faz."

---

## D11.1 — Onde a pessoa confirma

**O que decidir:** como a proposta chega à pessoa e onde ela confirma.

### Opção A — Cartão na conversa que abre o formulário existente já preenchido *(recomendada)*

Abaixo da bolha, um cartão no estilo do da memória mostra o resumo e dois botões de mesmo tamanho: "Abrir formulário" e "Agora não". O toque abre `add-appointment` ou `add-medicine` com os campos preenchidos. A pessoa confere e salva pelo fluxo normal.

**Benefícios**
- Nenhum caminho de escrita novo: a validação, os lembretes e o aviso de interação são os do formulário.
- Dois toques deliberados antes de existir qualquer dado.
- Mesmo desenho da memória, que já foi aprovado e testado; sem tela nova fora do Canvas.

**Malefícios**
- Um passo a mais que salvar direto.
- Os dois formulários passam a aceitar dados iniciais por parâmetro de rota, que precisam ser conferidos na tela (o app tem link externo `SuaSaude://`).

### Opção B — Navegar direto ao formulário, sem cartão

**Benefícios**
- Um toque a menos.

**Malefícios**
- O app muda de tela sem a pessoa pedir, e ela pode nem ler a resposta. Vai contra o assistente reativo.

### Opção C — Cartão com "Salvar" direto, sem formulário

**Benefícios**
- O mais rápido para compromisso.

**Malefícios**
- Não serve para remédio: a IA não pode preencher dosagem e não sabe forma, unidade e estoque.
- Cria um segundo caminho de escrita, fora da validação do formulário, que diverge dele com o tempo.
- Pede componente novo fora do Canvas.

### Recomendação: **Opção A**

**Motivo:** é a única que serve às duas ações sem criar caminho de escrita, e põe a revisão onde a pessoa já sabe revisar.

**Efeito no PRD:** o 11.1 passa a dizer que a proposta vira um cartão abaixo da bolha, e que o formulário existente abre já preenchido.

**Decisão:** Opção A, cartão na conversa que abre o formulário existente já preenchido (2026-10-20).

---

## D11.2 — Quais ações entram na primeira entrega

**O que decidir:** a lista fechada de tipos.

### Opção A — Novo compromisso e novo lembrete de remédio *(recomendada)*

`ABRIR_NOVO_AGENDAMENTO` (PRD 11.2) e `ABRIR_NOVO_LEMBRETE` (PRD 11.3).

**Benefícios**
- É o que o PRD descreveu. Cobre a frase mais natural ("marca retorno dia 20").
- Escopo fechado para um épico G.

**Malefícios**
- No remédio a IA só preenche nome e horário; a pessoa completa o resto.

### Opção B — Só novo compromisso

**Benefícios**
- Menor, e longe de qualquer coisa perto de dose.

**Malefícios**
- Deixa de fora o 11.3, que o produto pediu.

### Opção C — A, mais abrir uma tela do mapa (`ABRIR_TELA`)

Um botão "Abrir Importar dados de saúde" quando a pessoa pergunta onde algo fica, com a rota de uma lista fechada tirada do `mapaDoApp.ts`.

**Benefícios**
- Ajuda muito quem se perde no app, e é de baixo risco (só navega).
- Resolve a "decisão aberta" do PRD 1.2 (link de navegação).

**Malefícios**
- Mais um tipo para o modelo escolher, e o teste do mapa passa a amarrar também as rotas do cartão.

### Opção D — A, mais registro de dose tomada (`CONFIRMAR_DOSE_TOMADA`)

**Benefícios**
- "Tomei o das 8h" vira um toque.

**Malefícios**
- Grava direto e mexe no estoque; "o das 8h" é ambíguo com dois remédios no mesmo horário. A tela de Medicamentos já marca com um toque. O PRD já tirou isto da primeira entrega.

### Recomendação: **Opção A**

**Motivo:** entrega o que o PRD descreveu, com risco baixo. Abrir tela (C) é barata e boa, e pode entrar depois sem mudar o contrato.

**Efeito no PRD:** 11.2 e 11.3 deixam de ser candidatas e viram escopo; 11.4 continua fora.

**Decisão:** Opção A, novo compromisso e novo lembrete de remédio (2026-10-20). Abrir tela fica para depois.

---

## D11.3 — A dose no lembrete de remédio

**O que decidir:** se a dosagem pode vir preenchida quando a pessoa a disse ("me lembra de tomar vitamina D 2000 UI às 8h").

### Opção A — Nunca preencher *(recomendada)*

A dosagem fica sempre vazia, e a pessoa a digita no formulário.

**Benefícios**
- Dose preenchida pela IA parece aval do assistente, e a R3 existe para isso não acontecer. Sem exceção, não há o que dar errado.
- Mais simples de testar: a proposta nem tem campo de dose.

**Malefícios**
- A pessoa digita a dose que acabou de dizer.

### Opção B — Preencher só se for cópia literal da fala

O código só aceita a dose se o texto estiver, igual, na mensagem do usuário.

**Benefícios**
- Menos digitação.

**Malefícios**
- Abre uma segunda exceção da R3 (a primeira é a D2.4), com testes adversariais próprios.
- "2000" sem unidade, ou "duas", obrigam regras de quando aceitar.

### Recomendação: **Opção A**

**Motivo:** o ganho é digitar uma palavra; o risco é o assistente parecer indicar dose.

**Efeito no PRD:** o 11.3 ("se o usuário não informar, o campo fica vazio") passa a "o campo fica sempre vazio".

**Decisão:** Opção A, a dosagem nunca é preenchida pela IA (2026-10-20).

---

## D11.4 — Como "sexta" e "dia 20" viram data

**O que decidir:** quem calcula a data e a hora do compromisso e do lembrete.

### Opção A — O código resolve uma gramática fechada *(recomendada)*

O modelo copia a expressão que a pessoa usou ("sexta", "dia 20", "20/11", "14h", "2 da tarde"), e uma função determinística, com a data de hoje do E1, a resolve: hoje, amanhã, depois de amanhã; dia da semana (o próximo depois de hoje); "dia N" (o próximo dia N); `dd/mm` e `dd/mm/aaaa`; horas em `14h`, `14h30`, `14:30`, `às 8`, `8 da manhã`, `2 da tarde`, `8 da noite`. Fora disso, o campo fica vazio. Data no passado é descartada. O cartão mostra a data com o dia da semana por extenso.

**Benefícios**
- Cálculo no código, como manda o prompt padrão (regra 5) e o E1. Testável com relógio fixo.
- O modelo não erra conta de calendário, que é onde ele mais erra.

**Malefícios**
- Uma gramática a manter. O que ela não cobre ("semana que vem", "fim do mês") fica vazio, e a pessoa escolhe no calendário do formulário.

### Opção B — O modelo calcula e o código confere

O modelo devolve a data pronta (`AAAA-MM-DD`). O código confere o que dá para conferir (dia da semana citado bate, "amanhã" é hoje mais um, data não está no passado) e descarta o que não bate.

**Benefícios**
- Cobre mais expressões.

**Malefícios**
- O cálculo continua no modelo; a conferência só pega parte dos erros ("dia 20" de qual mês?).

### Opção C — O modelo calcula, sem conferência

**Benefícios**
- Menos código.

**Malefícios**
- Data errada chega ao formulário, e a pessoa pode não perceber.

### Recomendação: **Opção A**

**Motivo:** data errada num compromisso de saúde é pior que data vazia, e o projeto já decidiu que conta de data é do código.

**Efeito no PRD:** o 11.2 ("data ambígua é resolvida com a data de hoje") passa a dizer que a resolução é do código, numa gramática fechada.

**Decisão:** Opção A, o código resolve a expressão numa gramática fechada (2026-10-20).
