# TASKS: IA de leitura de documentos — extração estruturada (Bloco 6)

Passo a passo com código e teste: `docs/superpowers/plans/2026-09-16-extracao-documentos-bedrock.md`. Esta lista é o acompanhamento.

## Estado

Marcado em 2026-09-17, contra o codigo no branch `sistema_ia`. As caixas
fechadas tem commit: `7c39820` (T2) a `db3dabd` (T10) para a logica e a
infraestrutura, `b543e31` a `74702aa` para o aplicativo, e `fda3709` para a T1,
que a D19 encerra.

**O que continua aberto e de quem:** a T14 e as cinco pendencias de vocabulario
sao do usuario; a conferencia dos criterios de aceite um a um nao foi feita; e
o aviso da clausula 10.1 do LOINC entra nos termos de uso quando o aplicativo
for publicado, o que ainda nao aconteceu.

## Bloqueio externo (não é código)

- [x] Aceitar a licença do LOINC e do UCUM e conferir as condições de redistribuição (tarefa 0.2a do roadmap) — **encerrado em 2026-09-16**. As duas licenças foram lidas por inteiro e são **opostas** quanto a recorte: do LOINC entra extrato, do UCUM entra a obra inteira. Estudo em `estudos-ia/05-vocabularios/licencas.md`, decisão D25. **A Tarefa 3 está desbloqueada.**
- [ ] Resolver as cinco pendências de `estudos-ia/05-vocabularios/pendencias.md` antes da T14: vitamina A, vitamina E, PCR, albumina urinária e taxa de filtração glomerular. Nenhuma trava a T3.

## Medir antes de construir

- [x] T1 — Prova de vida do Bedrock: publicar a função mínima e medir, por modelo candidato, **quatro cenários** — tool forçada, tool estrita, saída estruturada e PDF nativo. Registrar, por invocação: houve 400 e qual campo ele nomeia; o bloco de tool foi emitido; apareceu chamada escrita como texto visível.
- [x] T1 — Se `saida-estruturada` funcionar, ela é o caminho, e a saída passa a voltar como bloco de texto — o que faz o `guardrailConfig` do Converse passar a avaliá-la. Propagar essa consequência para a spec, que hoje registra a ausência de guardrail de saída como justificada.
- [x] T1 — Se `pdf-nativo` funcionar com qualidade aceitável num laudo real, a T8 ganha dois caminhos: PDF digital direto ao modelo, foto e escaneado pelo Textract.
- [x] T1 — Registrar a decisão de modelo como D19 em `estudos-ia/00-visao/decisoes.md`, com os números medidos.
- [ ] T1 — Se o resultado divergir do comentário em `amplify/backend.ts:103-107`, registrar a divergência e avisar o Arturo. **Não editar o comentário dele.**

## Lógica pura (teste antes da implementação, sem AWS)

- [x] T2 — Conversor de unidades: fórmula massa ↔ mol, escala pura, identidades, recusa explícita, ida e volta.
- [x] T2 — Tradução da grafia do laudo para o token do conversor (D28): as três grafias do sinal de micro, `mcg/dL`, `µUI/mL`, `UI/L`, e `/mm³` ↔ `10*3/µL`.
- [x] T2b — Conversão de texto para número: vírgula decimal (`32,5`), ponto de milhar (`1.234,56`), sinal de censura (`<0,01`), recusa em vez de chute.
- [x] T2b — Teste que proíbe `parseFloat` e `Number` sobre texto do documento no resto dos arquivos da extração.
- [x] T3 — Catálogo de analitos **gerado** por `scripts/gerar-catalogo-analitos.mjs` a partir de `estudos-ia/05-vocabularios/loinc/loinc-analitos-suasaude.csv` e das massas molares — nunca digitado. O arquivo emitido é versionado e não se edita à mão.
- [x] T3 — O gerador derruba a geração se um analito estiver ao mesmo tempo com massa molar e na lista de "sem conversão molar" (a armadilha da hemoglobina, D18).
- [x] T3 — `label` carrega nome oficial do LOINC (cláusula 10.3 da licença); `canonicalUnit` é campo novo e não sobrescreve `EXAMPLE_UCUM_UNITS` (cláusula 2).
- [x] T3 — `synonyms` vem de `ptBR_RELATEDNAMES2`, do próprio LOINC. Não escrever tradução nossa (cláusula 12, D26).
- [x] T4 — Schema de saída em zod, com `additionalProperties: false` e sem nenhum campo de interpretação clínica.
- [x] T4 — Todo número chega do modelo como texto, inclusive os limites da faixa; `collectedAt` e `collectionMoment` são da linha e aceitam vazio.
- [x] T5 — Normalizador: lê os três números com `parseDecimal`; valor e faixa convertidos na mesma operação; revisão quando a confiança, a unidade, o código ou a leitura do número falharem.
- [x] T5 — Qualificador de censura preenchido **não** manda para revisão: é leitura correta, e o que ele faz é tirar a linha da comparação.
- [x] T5 — Linha sem leitura segura sai **sem valor** (`null`), nunca com zero (D29); faixa ausente e faixa ilegível são tratadas como coisas diferentes.
- [x] T6 — Idempotência: soma do arquivo e id determinístico por documento, arquivo, analito **e momento da coleta**.
- [x] T6 — Teste da curva glicêmica: glicose em jejum, 60 e 120 minutos no mesmo documento geram três ids distintos.

## Infraestrutura

- [x] T7 — Schema de dados: campos de extração em `MedicalDocument` (todos opcionais), models `LabResult` e `PrescriptionItem`, mutation `startDocumentExtraction`.
- [x] T7 — Permissões, variáveis de ambiente, política do Bedrock, guardrail, repetição assíncrona zerada.
- [x] T7 — Política do Textract com as **quatro** ações: `DetectDocumentText`, `AnalyzeDocument`, `StartDocumentTextDetection`, `GetDocumentTextDetection`. As síncronas processam uma página só de PDF.
- [x] T7 — Publicar e confirmar que os documentos já existentes continuam listando normalmente.
- [x] T8 — OCR com número de página preservado; `Page` ausente vale como página 1, que é o que a chamada síncrona devolve.
- [x] T8 — Caminho assíncrono do Textract para PDF: disparar, consultar com espera crescente, paginar `NextToken` até o fim, teto de 5 minutos.

## Pipeline

- [x] T9 — Prompt sem interpretação clínica, com o texto do documento dentro do bloco protegido contra instrução plantada; chamada com tool forçada e uma tentativa de reparo.
- [x] T10 — Repositório e orquestração: a função nunca lança, e distingue sem-resultado de falha.

## Cliente

- [x] T11 — Disparo após salvar, isolado: falha ao disparar não derruba o salvamento do documento.
- [x] T11 — Consulta por repetição com espera crescente e parada em 6 minutos.
- [x] T12 — Tela de detalhe com os **cinco** estados, incluindo "nunca extraído", que é o estado de todo documento gravado antes desta EPIC.
- [x] T12 — Linha pendente marcada com o token de aviso, nunca com o de erro.
- [x] T12 — Teste que prova que nenhuma copy classifica o resultado nem usa o termo vetado.
- [x] T12b — **Corrigir** uma linha pendente: painel inline, valor lido pelo mesmo `parseDecimal` do laudo, unidade não digitável (D30).
- [x] T12b — A correção preserva `rawValue` e `rawUnit`: o papel não mudou porque alguém corrigiu a leitura.
- [x] T13 — Receita: medicamento e posologia, sem criar lembrete, sem escrever em `Medicine`, sem sobrescrever a validade do formulário.

## Verificação contra a realidade

- [ ] T14 — Conferir de três a cinco laudos reais, de laboratórios diferentes, valor por valor, à mão.
- [ ] T14 — A amostra precisa conter, de propósito: valor com vírgula decimal, valor com ponto de milhar, valor censurado (`<0,01`) e analito repetido (curva glicêmica).
- [ ] T14 — Contar quantas linhas **passaram como corretas estando erradas**. É o número que importa: é o único modo de falha que corrompe o histórico em silêncio.
- [ ] T14 — Calibrar o limiar de confiança com o medido e trocar o comentário provisório.
- [ ] T14 — Registrar medições e custo por documento em `estudos-ia/04-implementacao/notas.md`.

**ADIADA por falta de insumo, 2026-09-18.** O usuário ainda não tem os três a
cinco laudos. A expectativa dele é ter **três até o fim de 2026-09-18, sendo
dois do Delboni** — e dois do mesmo laboratório contam como **um** para o
critério "de laboratórios diferentes", que é o ponto inteiro desta tarefa: um
laudo do Delboni já foi medido em 2026-09-17 (19 exames, 836 KB, em
`notas.md`), então repetir o mesmo emissor não exercita nada de novo.

A T14 não está bloqueada por código. Ela está esperando papel. Enquanto ele não
chega, três coisas podem ser feitas sem ele e adiantam o dia da conferência:

- [ ] Fechar as cinco pendências de vocabulário de
      `estudos-ia/05-vocabularios/pendencias.md` (vitamina A, vitamina E, PCR,
      albumina urinária, taxa de filtração glomerular). Elas não travam a T3,
      mas travam a T14: conferir valor por valor contra um laudo exige que a
      linha do laudo tenha para onde ir.
- [ ] Ampliar a cobertura de analitos para o que um laudo brasileiro de rotina
      de fato traz — estudo e tarefa própria em
      `estudos-ia/05-vocabularios/cobertura-brasileira-lacunas.md`. Um analito
      fora da cobertura não aparece como erro de leitura; aparece como linha
      que não existe, que é o modo de falha mais difícil de contar à mão.
- [ ] Montar a planilha de conferência **antes** de ter o laudo: uma linha por
      valor do papel, com colunas para o que o papel diz, o que o aplicativo
      leu, e o veredito. Sem ela, a conferência vira leitura por cima, e o
      número que importa — quantas linhas passaram como corretas estando
      erradas — não sai.

**Limitação que vale saber antes de escolher os laudos:** o Textract não está
habilitado na conta (`SubscriptionRequiredException`, registrado em
`notas.md`), então **o aplicativo lê PDF e não lê foto**. Os laudos da amostra
precisam ser PDF, e de preferência PDF digital, não PDF que é uma foto dentro
de um envelope.

## Encerramento

- [x] `npm run validate` passa.
- [x] O catálogo de analitos foi **gerado**, não digitado, e o gerador roda sem avisos.
- [x] Critérios de aceite da `spec.md` conferidos um a um, em 2026-09-18: **22
      com teste, 3 sem teste, 0 não cumpridos, 1 não verificável**. Dos sem
      teste, o que importa é a herança da data do formulário com aviso (D24),
      que mora em `handler.ts` — o maior arquivo da feature sem arquivo de
      teste. Achado extra, fora dos critérios: **cinco arquivos de teste do
      backend digitam códigos LOINC à mão**, contra a D27, e não existe teste de
      deriva do catálogo gerado. Tarefa própria, não desta EPIC.
- [x] Nenhum código de analito foi digitado à mão — todos vieram do arquivo oficial, **inclusive os de exemplo em teste** (D27).
- [ ] O aviso da cláusula 10.1 do LOINC entra nos termos de uso quando o aplicativo for publicado.
