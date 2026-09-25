# PLAN: Integração com dados públicos de vacinação (Bloco 4)

**Nota sobre este arquivo.** Ele é **retroativo**. A EPIC foi construída e
mergeada com a `spec.md` cumprindo, sozinha, o papel dos três documentos — ela
traz pesquisa, decisão e risco, que normalmente moram aqui. O par
`plan.md`/`tasks.md` faltava, e a regra 6 da constituição exige o trio completo
para toda unidade de entrega.

Este arquivo não reescreve o que já está na `spec.md`: ele **extrai** dali o que
a constituição exige que esteja num `plan.md` (regras 3, 5 e 8) e o organiza,
para que uma leitura futura encontre as decisões onde espera encontrá-las.

## 1. Diagnóstico — estado atual vs. proposto

Antes desta EPIC, a tela de vacinação mostrava campanha vinda de
`src/config/vaccinationCampaigns.ts`, uma configuração estática com **uma
campanha fictícia**, compartilhada entre a tela de Prevenção (3e) e a de
Vacinação (4e). Era a pendência técnica 3.a do `GAP_ANALYSIS.md` e o item 7 de
`docs/DADOS_MOCKADOS.md`, e contrariava a regra 2 da constituição — nenhum dado
mockado permanece.

O `README.md` já prometia "integração ao sistema de saúde pública brasileiro"
sem código correspondente.

Esta EPIC pesquisou quais fontes públicas existem de fato, integrou as que
existem, e **documentou explicitamente as que não existem** — que é a parte
mais valiosa do trabalho, porque é a que impede a próxima pessoa de procurar de
novo.

## 2. Novas dependências (regra 3 da constituição)

| Pacote | Escopo | Por quê | Alternativa considerada |
|---|---|---|---|
| `expo-location` | app | `UserProfile` não tem — e continua sem — endereço ou UF. Sem GPS não há como resolver a UF e o município do usuário, e sem eles a campanha não pode ser regional | Pedir a UF ao usuário num campo: acrescentaria passo de formulário a uma tela que o Canvas não desenha assim, e ainda assim não resolveria o código IBGE do município, exigido pelo CNES |

Nenhuma dependência nova no backend: as duas funções usam o que o repositório
já tem.

## 3. Decisões de arquitetura e de dado (regra 5 — nunca efeito colateral)

- **Amostragem, não censo, e a interface diz isso.** O endpoint de doses
  aplicadas do PNI não respeita os próprios filtros documentados e trava
  `limit` em 1000 para um conjunto de dezenas de milhões de linhas por ano. A
  varredura é por deslocamentos fixos, agregada do lado do cliente. **A
  contagem nunca é apresentada como total oficial** — há aviso de amostragem e
  `dataAsOf` por campanha.
- **`dataAsOf` sempre visível**, porque o PNI tem defasagem de digitação de
  cerca de um mês. Sem essa data, o número pareceria "de hoje".
- **Cache em DynamoDB com validade de 12 horas** (`VaccinationCampaignCache`),
  pela mesma preocupação registrada para a API do USPSTF na EPIC de Prevenção:
  não repetir a varredura inteira a cada usuário e a cada dia.
- **Uma fonte só para o aviso de campanha.** `vaccinationCampaignSummary.ts`
  substitui a configuração estática removida e é consumido tanto por
  `usePreventionData.ts` quanto por `VaccinationScreen.tsx`. Duas fontes do
  mesmo aviso divergiriam, que é a preocupação que a EPIC de carteira de
  vacinação já tinha registrado.
- **Localização cacheada localmente**, para não repetir o pedido de permissão a
  cada abertura de tela.
- **Degradação sem dado fingido.** Permissão negada, execução na web ou
  emulador sem GPS levam a campanhas em nível nacional e nenhuma seção "Onde se
  vacinar". Nunca falha, e nunca preenche com dado inventado.
- **O catálogo de vacinas é fechado**, vindo do Calendário Nacional, em vez de
  nome livre — e é o que torna possível a cascata de doses futuras.
- **A cascata de doses cria pendências, não registros aplicados.** Registrar uma
  dose de uma série de N cria as futuras como **pendentes**, com data calculada,
  e agenda lembrete local. Nenhuma dose é dada como aplicada sem a pessoa dizer.

## 4. Ambiguidades e limites documentados (regra 8)

Três coisas que **não existem** publicamente, verificadas ao vivo, e que por
isso viraram limite declarado em vez de busca repetida:

- **A carteira oficial (RNDS / Meu SUS Digital) é inacessível a este projeto.**
  Exige certificado ICP-Brasil e credenciamento institucional no DATASUS. E
  mesmo com acesso, o identificador de paciente no PNI aberto é um resumo
  criptográfico — não há consulta por CPF de forma alguma.
- **Não existe endpoint público de calendário ou campanhas em formato
  estruturado.** O calendário é curado à mão, com a URL da página oficial de
  cada campanha e de cada vacina.
- **Não existe tabela pública que traduza o código de vacina do PNI para o nome
  da vacina.** O arquivo que a abrigaria fica deliberadamente vazio, com a
  explicação no cabeçalho. **Consequência direta e assumida:** a contagem de
  campanha é por volume total de doses no período e na UF, e **não** por vacina
  específica.

## 5. Riscos aceitos

- A contagem é amostral e pode divergir de números oficiais divulgados pelo
  Ministério da Saúde. Mitigado por dizer isso na tela, não por esconder.
- Campanhas não discriminam por vacina, pela ausência do de-para.
- **A carteira do aplicativo não é o documento oficial**, e a tela diz isso,
  indicando o Meu SUS Digital para a via oficial.
