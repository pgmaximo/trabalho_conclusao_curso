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
| 3 | E2 Medicamentos | [E2](./E2-medicamentos-completos.md) | D2.1 estoque · D2.2 observações · D2.3 "tomado hoje" | A · A · A | Aguardando |
| 4 | E9 Interações | [E9](./E9-interacoes-medicamentosas.md) | D9.1 onde mora o dataset · D9.2 candidatos · D9.3 nome não reconhecido | A · A · A | Aguardando |
| 5 | E1 Contexto | [E1](./E1-contexto-e-mapa-do-app.md) | D1.1 onde entra a data · D1.2 fuso · D1.3 mapa do app | A · A · A | Aguardando |

Épicos sem decisão aberta (E3, E4, E5, E6) e os que começam por estudo (E10.2, E11, E12) não têm arquivo aqui. Quando um estudo precisar de decisão, o arquivo nasce junto com ele.

## Pontos transversais que aparecem em mais de uma decisão

- **Chat somente leitura, uma porta de leitura por dono.** Nenhuma opção recomendada enfraquece isso. Onde há exceção (dado público do E8), ela é uma função separada com lista fechada.
- **Sem fonte externa nova no chat.** A USPSTF (E7) já alimenta a tela de Prevenção; PNI e CNES (E8) já alimentam a de vacinação. O chat reaproveita, não adiciona.
- **Cálculo no código, não no modelo.** Datas, estoque, doses esperadas e interações são calculadas por ferramenta determinística, e o modelo só descreve.
- **Mais ferramentas, mais risco de o modelo escolher errado.** Cada épico atualiza as descrições das ferramentas e o prompt (RT9 do PRD).
