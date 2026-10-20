# Decisões da Parte 1 — Melhorias do assistente de IA

Cada arquivo desta pasta cobre **um épico** e segue o mesmo formato:

1. **O que o código faz hoje**, verificado, para a decisão não nascer de suposição.
2. **A decisão**, com o que precisa ser escolhido.
3. **As opções**, cada uma com benefícios e malefícios.
4. **A recomendação** e o motivo.
5. Um campo **Decisão** para registrar a escolha do produto.
6. O **efeito no PRD** de cada escolha.

Um épico só passa para "Em especificação" depois que todas as suas decisões têm o campo **Decisão** preenchido.

## Índice e status (na ordem de entrega)

| Ordem | Épico | Documento | Decisões | Recomendação | Status |
|---|---|---|---|---|---|
| 1 | E7 Prevenção | [E7](./E7-recomendacoes-prevencao.md) | D7.1 fonte dos dados · D7.2 idioma e texto · D7.3 reforço da R3 (nasceu no planejamento, registrada no `plan.md` do E7) | A · A · A | Decidido (A · A · A, 2026-10-17) |
| 2 | E8 Vacinação | [E8](./E8-campanhas-e-postos.md) | D8.1 município · D8.2 cache vazio · D8.3 leitura sem dono · P1 campanhas pelo calendário · D8.4 reforço da R3 para vacina (as duas últimas nasceram na spec) | A · A · A · A · A | Decidido (A · A · A · A · A, 2026-10-17) |
| 3 | E2 Medicamentos | [E2](./E2-medicamentos-completos.md) | D2.1 estoque · D2.2 observações · D2.3 "tomado hoje" · D2.4 R3 e o valor cadastrado (nasceu na spec) | A · A · A · A | Decidido (A · A · A · A, 2026-10-17) |
| 4 | E9 Interações | [E9](./E9-interacoes-medicamentosas.md) | D9.1 onde mora o dataset · D9.2 candidatos · D9.3 nome não reconhecido · D9.4 reforço da R3 · D9.5 textos de risco (as duas últimas nasceram na spec) | A · A · A · A · A | Decidido (A · A · A · A · A, 2026-10-17) |
| 5 | E1 Contexto | [E1](./E1-contexto-e-mapa-do-app.md) | D1.1 onde entra a data · D1.2 fuso · D1.3 mapa do app · P1 tempo decorrido (nasceu na spec) | A · A · A · A | Decidido (A · A · A em 2026-10-17; P1 = A em 2026-10-18; épico concluído em 2026-10-19) |
| 6 | E5 Agenda e vacinas | [E5](./E5-agenda-e-vacinas.md) | D5.1 próximo reforço (nasceu na leitura do código) | A | Decidido (A, 2026-10-19; épico concluído em 2026-10-19) |
| 7 | E3 Doses tomadas | [E3](./E3-doses-tomadas.md) | D3.1 "tomei hoje?" e o `takenToday` · D3.2 leitura pelo índice · D3.3 R3 e a contagem de doses (as três nasceram na leitura do código) · D3.4 reforço da R3 para adesão (nasceu na spec) · D3.5 fuso pela UF (nasceu na revisão) | A · A · A · A · A | Decidido (A · A · A · A · A, 2026-10-19; épico concluído em 2026-10-19) |
| 8 | E4 Receitas e documentos | [E4](./E4-receitas-e-documentos.md) | D4.1 itens de receita que a tela não mostra · D4.2 posologia e a R3 (as duas nasceram na leitura do código) · D4.3 releitura apaga os itens superados (nasceu no fechamento) | A · A · A | Decidido (A · A, 2026-10-19; D4.3 = A no fechamento, ao corrigir os riscos; épico concluído em 2026-10-19) |
| 9 | E10 Panorama e comparação | [E10](./E10-panorama-e-comparacao.md) | D10.1 o que fazer com a comparação (10.2) · D10.2 barrar atribuição de causa entre dados (as duas nasceram no estudo `estudos/E10.2-comparacao-entre-dominios.md`) · D10.3 léxico da guarda de causa · D10.4 sinal do teto de leitura · D10.5 janela da comparação (as três nasceram no estudo `estudos/E10-riscos-da-entrega.md`) · D10.6 resíduo da guarda de causa · D10.7 frase de apresentação · D10.8 remédio cruza domínios (as duas nasceram na revisão do E6) | A · A · A1 · B1 · C1 · 1 · exceção estreita · por domínio | Decidido (B · A · A1 · B1 · C1 · 1, 2026-10-19; D10.7 e D10.8 em 2026-10-20; épico concluído em 2026-10-19) |
| 10 | E6 Wearable | [E6](./E6-wearable-serie-e-historico.md) | D6.1 posse do `result.json` · D6.2 o que da análise da tela vai ao chat · D6.3 o que é "comparar" no 6.1 (as três nasceram na leitura do código) | A · A · A | Decidido (A · A · A, 2026-10-19; épico concluído em 2026-10-20) |

Os épicos que começam por estudo (E11, E12) não têm arquivo aqui; o E10 ganhou o seu junto com o estudo. O E6 era "sem decisão aberta" no PRD e ganhou o seu na leitura do código, como o E4. Quando um estudo precisar de decisão, o arquivo nasce junto com ele.

## Pontos transversais que aparecem em mais de uma decisão

- **Chat somente leitura, uma porta de leitura por dono.** Nenhuma opção recomendada enfraquece isso. Onde há exceção (dado público do E8), ela é uma função separada com lista fechada.
- **Sem fonte externa nova no chat.** A USPSTF (E7) já alimenta a tela de Prevenção; PNI e CNES (E8) já alimentam a de vacinação. O chat reaproveita, não adiciona.
- **Cálculo no código, não no modelo.** Datas, estoque, doses esperadas e interações são calculadas por ferramenta determinística, e o modelo só descreve.
- **Mais ferramentas, mais risco de o modelo escolher errado.** Cada épico atualiza as descrições das ferramentas e o prompt (RT9 do PRD).
