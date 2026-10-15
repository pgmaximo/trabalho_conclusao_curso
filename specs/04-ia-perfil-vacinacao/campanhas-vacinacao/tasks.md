# TASKS: Integração com dados públicos de vacinação (Bloco 4)

**Nota sobre este arquivo.** Ele é **retroativo**. A EPIC foi construída e
mergeada antes de este arquivo existir, e os itens abaixo estão marcados
conforme o que de fato está no código — conferido contra o repositório, não
contra memória. Ele existe porque a regra 6 da constituição exige o trio
completo, e porque uma lista de tarefas também serve para dizer, depois, **o
que ficou de fora**.

## Pesquisa (o trabalho que mais rendeu, e o menos visível)

- [x] Verificar ao vivo quais endpoints públicos de vacinação existem de fato.
- [x] Registrar os que **não** existem, com o motivo — é o que impede a próxima pessoa de procurar de novo.
- [x] Testar os filtros documentados de cada endpoint contra o comportamento real. O de doses aplicadas **não respeita os próprios filtros**, e foi isso que decidiu a estratégia de amostragem.

## Backend

- [x] `get-vaccination-campaigns`: varredura por deslocamentos fixos, agregação do lado do servidor, cache com validade de 12 horas.
- [x] `get-vaccination-sites`: consulta ao CNES por município, cujos filtros funcionam.
- [x] `VaccinationCampaignCache` e `VaccinationSiteCache` com acesso direto pela função, no padrão já usado para `UserProfile`.
- [x] Nenhuma dependência nova no backend.

## Localização

- [x] `locationService.ts`: GPS → geocodificação reversa → sigla de UF → código IBGE do município.
- [x] Cache local da localização resolvida, para não repetir o pedido de permissão a cada abertura.
- [x] Degradação para nível nacional quando não há GPS, sem crash e **sem dado fingido**.

## Reconciliação do dado mockado

- [x] Remover `src/config/vaccinationCampaigns.ts`, a configuração estática com campanha fictícia.
- [x] `vaccinationCampaignSummary.ts` como ponto único do aviso, consumido pela tela de Prevenção e pela de Vacinação.
- [x] A tela de Prevenção usa a localização já em cache, sem pedir permissão por conta própria.

## Carteirinha (entrou na mesma branch por decisão durante o planejamento)

- [x] `AddVaccineScreen.tsx` como tela cheia, substituindo o bottom sheet — o formulário cresceu demais para um sheet curto.
- [x] Catálogo fechado de vacinas a partir do Calendário Nacional, em vez de nome livre.
- [x] Cascata de doses futuras **pendentes**, com data calculada, ao registrar uma dose de série.
- [x] Lembretes locais em D-14 e no dia.

## Honestidade na interface

- [x] Aviso de amostragem visível: a contagem **nunca** é apresentada como total oficial.
- [x] `dataAsOf` por campanha, por causa da defasagem de digitação do PNI.
- [x] A tela diz que a carteira do aplicativo **não é o documento oficial**, indicando o Meu SUS Digital.

## O que ficou de fora, e por quê

- [ ] **Integração com a carteira oficial (RNDS / Meu SUS Digital).** Exige certificado ICP-Brasil e credenciamento institucional no DATASUS — inacessível a este projeto. **Não é uma tarefa pendente: é um limite declarado.**
- [ ] **Campanha discriminada por vacina específica.** Depende de uma tabela de de-para de código de vacina que não é publicada. Reabre se ela passar a existir.

## Encerramento

- [x] A pendência 3.a do `GAP_ANALYSIS.md` e o item 7 de `docs/DADOS_MOCKADOS.md` estão fechados.
- [x] `npm run validate` passa.
