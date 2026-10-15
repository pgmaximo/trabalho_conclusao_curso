# EPIC: Integração com dados públicos de vacinação (branch `feat_vacina`)

## 1. Identificação

Fecha a pendência técnica **3.a** registrada em `specs/design/GAP_ANALYSIS.md` e `docs/DADOS_MOCKADOS.md` #7: "Integração com fonte pública de calendário/campanhas de vacinação (ex. API do PNI/Ministério da Saúde): não implementada." A pendência dizia explicitamente "qual fonte pública usar não foi pesquisado/decidido" — esta EPIC pesquisou e decidiu.

Também implementa uma promessa já feita em `README.md` ("Gestão de vacinação... com integração ao sistema de saúde pública brasileiro") que ainda não tinha código correspondente.

Arquivos novos: `amplify/functions/get-vaccination-campaigns/`, `amplify/functions/get-vaccination-sites/`, `src/services/locationService.ts`, `src/services/vaccinationCampaignSummary.ts`, `src/data/calendarioNacionalVacinacao.ts`, `src/data/pniVaccineCodes.ts`, `src/services/vaccineScheduleService.ts`, `src/services/vaccineReminderService.ts`, `src/screens/AddVaccineScreen.tsx` (substitui `AddVaccineSheet.tsx`, removido).

## 2. Pesquisa de API — o que existe e o que não existe

Verificado ao vivo em 2026-09-05 contra `https://apidadosabertos.saude.gov.br` (Ministério da Saúde/DEMAS, público, sem autenticação):

| Fonte | Existe? | Uso nesta EPIC |
|---|---|---|
| RNDS / Meu SUS Digital (carteira oficial) | Existe, mas exige certificado ICP-Brasil e-CNPJ/e-CPF + CNES credenciado no Portal de Serviços do DATASUS | **Não integrado** — inacessível a um app sem credenciamento institucional. `codigo_paciente` no PNI aberto é um hash SHA-256; não há consulta por CPF de qualquer forma. |
| `/vacinacao/doses-aplicadas-pni-{ano}` | Existe, público | Integrado (`get-vaccination-campaigns`) — ver §3 sobre as limitações reais do endpoint. |
| `/cnes/estabelecimentos` | Existe, público, **filtros funcionam de verdade** | Integrado (`get-vaccination-sites`) — "Onde se vacinar". |
| Calendário/campanhas em formato estruturado | **Não existe** nenhum endpoint público que devolva isso | Curado manualmente em `campaignCalendar.ts`/`calendarioNacionalVacinacao.ts`, com `fonteUrl` citando a página oficial de cada campanha/vacina. |
| Tabela `codigo_vacina` → nome da vacina | **Não existe** publicamente (nem em apidadosabertos, nem em rnds-fhir.saude.gov.br, que só publica CodeSystems de laboratório) | `src/data/pniVaccineCodes.ts` fica intencionalmente vazio — ver comentário de cabeçalho do arquivo. Consequência: a contagem de campanha é agregada por **total de doses no período/UF**, não por vacina específica. |

## 3. Decisão: amostragem, não censo

`/vacinacao/doses-aplicadas-pni-{ano}` não aceita os filtros documentados na própria query string (testado: `sigla_uf_estabelecimento=SP` devolveu outras UFs misturadas) e `limit` é travado em 1000 pelo servidor, para um dataset de dezenas de milhões de linhas por ano. `pniClient.ts` varre um conjunto fixo de offsets espalhados pelo ano e agrega client-side (`campaignAggregator.ts`). Isso é estatisticamente uma **amostra**, nunca um censo — a UI (`campaignSamplingNotice`, `dataAsOf` por campanha) diz isso explicitamente, nunca apresenta a contagem como total oficial.

O PNI também tem defasagem de digitação (~1 mês, observado durante a pesquisa) — `dataAsOf` (a maior `data_vacina` vista na amostra) é sempre exibido, para nunca implicar que o número é "de hoje".

Cache DynamoDB (`VaccinationCampaignCache`, TTL 12h) evita repetir a amostragem completa a cada usuário/dia — mesma preocupação de performance já registrada em `specs/03-exames-receitas/prevencao/tasks.md` 5.2 para a API do USPSTF.

## 4. Decisão: localização por GPS, com fallback nacional

`UserProfile` não tinha (e continua sem) endereço/UF. `src/services/locationService.ts` usa `expo-location` (nova dependência — justificativa: regra 3 da constituição, não havia como resolver UF/município do usuário sem ela) para GPS → geocodificação reversa → sigla de UF (`src/data/estadosBrasileiros.ts`) → código IBGE do município (via `/macrorregiao-e-regiao-de-saude/municipio`, cujos filtros também funcionam de verdade).

Permissão negada, web, ou emulador sem GPS: a tela cai para campanhas em nível nacional (`uf: null`) e nenhuma seção "Onde se vacinar" — nunca crash, nunca dado fingido. A localização resolvida fica em cache local (AsyncStorage) para não repetir o pedido de permissão a cada abertura de tela.

## 5. Reconciliação com Prevenção (3e) e remoção de `vaccinationCampaigns.ts`

`src/config/vaccinationCampaigns.ts` (config estática com uma campanha fictícia, compartilhada entre 3e e 4e) foi **removido**. `src/services/vaccinationCampaignSummary.ts` é o novo ponto único: usa a localização já cacheada (sem pedir permissão a partir da tela de Prevenção) e devolve uma mensagem de uma linha com contagem real, consumida tanto por `usePreventionData.ts` quanto por `VaccinationScreen.tsx` — mesma preocupação original de não ter duas fontes divergentes do mesmo aviso (`carteira-vacinacao/plan.md` §5).

## 6. Carteirinha: catálogo + cascata de doses + lembretes

Fora do escopo de dados públicos, mas parte da mesma branch (decisão do usuário durante o planejamento): `AddVaccineScreen.tsx` (tela cheia, substitui o bottom sheet original — o formulário cresceu demais para um sheet curto) usa o Calendário Nacional (`calendarioNacionalVacinacao.ts`) como catálogo fechado de vacinas, em vez de nome livre. Ao registrar uma dose aplicada de uma vacina com série de N doses, `vaccinationService.ts#registerAppliedDoseWithSeries` cria em cascata as doses futuras pendentes (com data calculada por `vaccineScheduleService.ts`) e agenda lembretes locais (`vaccineReminderService.ts`, D-14 e no dia — padrão pesquisado em apps de carteira de vacinação digital, incluindo o Meu SUS Digital).

## 7. Riscos aceitos (ver também `GAP_ANALYSIS.md` item 3)

- Contagem de campanha é amostral, não total — pode divergir de números oficiais divulgados pelo MS.
- `codigo_vacina` sem de-para publicado — campanhas não conseguem discriminar por vacina específica, só por volume total de doses no período/UF.
- Carteira do app não é o documento oficial — dito explicitamente na tela, com indicação do Meu SUS Digital para a via oficial.
