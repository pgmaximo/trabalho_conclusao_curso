# Parte 1 — Melhorias do assistente de IA

**Objetivo:** dar mais poder ao assistente conversacional (`amplify/functions/chat-assistant`), fazendo-o responder com todos os dados e funções relevantes que o app já tem, sem perder as regras de segurança. O PRD completo está em [`prd.md`](./prd.md).

**Origem:** o assistente atual foi testado pelos colegas de projeto, que gostaram e pediram mais poder. Um estudo do código mostrou o que a IA lê hoje (8 ferramentas somente leitura) e o que ficou de fora.

## Ordem de entrega

A ordem dos cinco primeiros foi definida pelo produto em 2026-10-17. O restante é sugestão, a confirmar.

| # | Épico | Resumo | Decisões | Esforço | Estado |
|---|---|---|---|---|---|
| 1 | **E7** | Recomendações de prevenção (USPSTF) no chat | [E7](./decisoes/E7-recomendacoes-prevencao.md) | M | Concluído (2026-10-17); conferido no sandbox: 6/6 na rodada completa; a correção da DS16 ficou sem medição |
| 2 | **E8** | Campanhas e postos de vacinação | [E8](./decisoes/E8-campanhas-e-postos.md) | M | Concluído (2026-10-17); conferido no sandbox: 7/7; GPS no aparelho só nos testes |
| 3 | **E2** | Medicamentos completos (frequência, estoque, observações) | [E2](./decisoes/E2-medicamentos-completos.md) | M (era P; a D2.4 acrescenta a exceção da R3) | Concluído (2026-10-17); conferido no sandbox: 9/9 depois da DS13 |
| 4 | **E9** | Interações medicamentosas | [E9](./decisoes/E9-interacoes-medicamentosas.md) | M | Concluído (2026-10-17); conferido no sandbox: 9/9 |
| 5 | **E1** | Data de hoje e mapa do app | [E1](./decisoes/E1-contexto-e-mapa-do-app.md) | P | Concluído (2026-10-19); conferido no sandbox: 6/6 |
| 6 | **E5** | Campos que faltam em agenda e vacinas | [E5](./decisoes/E5-agenda-e-vacinas.md) | P | Concluído (2026-10-19); conferido no sandbox: 6/6 |
| 7 | **E3** | Doses tomadas (adesão) | [E3](./decisoes/E3-doses-tomadas.md) (D2.3 + D3.1 a D3.5) | M | Concluído (2026-10-19); conferido no sandbox: 6/6; marcar dose pela tela só nos testes |
| 8 | **E4** | Receitas extraídas e situação dos documentos | [E4](./decisoes/E4-receitas-e-documentos.md) (D4.1 e D4.2) | M | Concluído (2026-10-19; riscos 1 a 4 corrigidos no fechamento, D4.3); conferido no sandbox: 5/5 |
| 9 | **E10** | Panorama geral; comparação entre domínios | [E10](./decisoes/E10-panorama-e-comparacao.md) (D10.1 e D10.2, do [estudo 10.2](./estudos/E10.2-comparacao-entre-dominios.md); D10.3 a D10.6, do [estudo dos riscos](./estudos/E10-riscos-da-entrega.md)) | G | Concluído (2026-10-19; feito antes do E6 por decisão do produto); conferido no sandbox: 3/3 |
| 10 | **E6** | Wearable: histórico e série diária | [E6](./decisoes/E6-wearable-serie-e-historico.md) (D6.1 a D6.3, nasceram na leitura do código) | M | Concluído (2026-10-20); conferido no sandbox: 5/5 depois da DS14, só com dados sintéticos do relógio |
| 11 | **E11** | Ações propostas pela IA e confirmadas pelo usuário | [E11](./decisoes/E11-acoes-propostas.md) (D11.1 a D11.4, do [estudo](./estudos/E11-acoes-propostas.md)) | G | Concluído (2026-10-20); conferido no sandbox: 5/5; "Abrir formulário" no aparelho só nos testes |
| 12 | E12 | Histórico de conversas (a persistência já existe; resta achar a lacuna) | [E12](./decisoes/E12-historico-de-conversas.md) (D12.1 e D12.2, do [estudo](./estudos/E12-historico-de-conversas.md)) | P | Concluído (2026-10-20; D12.1 = A, 12.2 descartado; D12.2 = A); conferido no sandbox: 3/3 |

Estados possíveis: Não iniciado · Aguardando decisão · Decidido · Em especificação · Em implementação · Concluído.

**Parte encerrada em 2026-10-22.** Os 12 épicos estão no código; a conferência no sandbox (rodada completa no Sonnet 4.6: 67 de 70, achados A1 a A13 corrigidos) e as limitações que ficaram estão em [`conferencia-sandbox/README.md`](./conferencia-sandbox/README.md).

## Dependências entre épicos

- **E3 depende do E2:** para saber quais doses eram esperadas, o E3 precisa da frequência completa que o E2 passa a devolver.
- **E11 depende do E1.1:** propor "marcar retorno sexta" exige a data de hoje no contexto. O E1 já vem antes.
- **E10.1 (panorama) depende de ferramentas dos demais:** vem depois do E2 e do E5. O E6 não bloqueia (decisão do produto, 2026-10-19): o panorama só usa a data da última importação, que o chat já lê. A janela diária da comparação (E10.2) esperava o E6.2, e entrou com ele.
- **E9 depende de ler medicamentos cadastrados:** já existe. O E2 melhora a qualidade do cruzamento, mas não bloqueia.
- **E7 e E8 são independentes** entre si e dos demais.

## Decisões

Todas as decisões abertas estão em [`decisoes/`](./decisoes/README.md). Cada documento traz: o que precisa ser decidido, o que o código faz hoje, as opções com benefícios e malefícios, a recomendação com o motivo, e um campo **Decisão** para registrar o que o produto escolher.

## Estudos previstos

Três épicos começam com um estudo, não com código. Os documentos serão criados em `estudos/` quando chegar a vez de cada um:

- **E10.2:** formato seguro para comparar domínios (exame, sono, adesão) sem interpretar. Feito: [`estudos/E10.2-comparacao-entre-dominios.md`](./estudos/E10.2-comparacao-entre-dominios.md).
- **E11:** onde o usuário confirma a ação (formulário pré-preenchido, cartão na conversa ou outro) e quais ações entram. Feito: [`estudos/E11-acoes-propostas.md`](./estudos/E11-acoes-propostas.md).
- **E12:** o histórico já é persistido (`chatHistoryService`, `HistoryDrawer`). O estudo lista o que ainda falta e decide se o épico vale a pena. Feito: [`estudos/E12-historico-de-conversas.md`](./estudos/E12-historico-de-conversas.md).

## Fora de escopo desta parte

- Proatividade do assistente (notificação, sugestão espontânea, resumo automático).
- Melhorias de UI e usabilidade: ficam para a Parte 2.
