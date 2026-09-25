# TASKS: Engenharia pendente do sistema de IA (Bloco 11)

Spec e plano nesta pasta. Marcar cada item só depois do teste ter falhado de
verdade e passado.

## Estado

| Momento | Suítes | Testes |
|---|---|---|
| Início (commit 9128524) | 122 | 1410 |
| Bloco 1 | 123 | 1433 |
| Bloco 2 | 124 | 1439 |
| Bloco 3 | 125 | 1447 |
| Bloco 4 | 127 | 1465 |
| Blocos 5 e 6 (final) | 129 | 1503 |

## Bloco 1 — Reprocessar não desfaz nem duplica (E1, E2)

- [x] Teste de `planejarRegravacao`: linha conferida preserva os quatro campos; aviso quando a leitura nova discorda
- [x] Teste: substituição 1 para 1 apaga a local e transfere a correção com `correctedAt`
- [x] Teste: correspondência ambígua (uma antiga, duas novas) não apaga nada
- [x] Teste: antiga que não reaparece fica; local de rótulo sem relação fica; momento diferente fica
- [x] `regravacao.ts` implementado
- [x] `buildLabResultUpdate` escreve `correctedAt` só quando presente (teste)
- [x] `listarLinhasDoDocumento` / `apagarLinhas` no repositório
- [x] `handler.ts` grava antes de apagar, com log `regravacao`
- [x] `backend.ts`: `dynamodb:Query` no índice
- [x] `npm run validate` verde — 123 suítes, 1433 testes; 14 mutações no plano e 1 no construtor, todas mortas

## Bloco 2 — Apagar leva junto o que foi lido; a lista vem inteira (E3, E4)

- [x] Teste: `deleteExamDocument` apaga linhas e itens (todas as páginas) antes do arquivo e do documento
- [x] Teste: falha ao apagar uma linha não apaga o documento
- [x] Teste: `fetchExtractionState` segue o `nextToken`
- [x] Implementação (`todasAsPaginas.ts`, um ajudante para as duas leituras)
- [x] `npm run validate` verde — 124 suítes, 1439 testes; 5 mutações, todas mortas

## Bloco 3 — O vocabulário da R1 no prompt (E7)

- [x] `selecionarPerguntas` e `--perguntas`/`--repeticoes` na avaliação (teste; o nome do plano era `filtrarPerguntas`)
- [x] Medição ANTES (r1a, r1b, r1c × 3): R1 em 2 de 9 primeiras gerações, **1 resposta perdida**
- [x] ~~`instrucaoDoTermoVetado` com a raiz~~ → a R1 do `LANGUAGE_RULES_PROMPT` nomeia os sentidos inocentes e as substituições, **sem** a palavra (ver "errado no plano")
- [x] Medição DEPOIS: R1 0 de 9 — mas a r1a passou a cair pela R3 (2 de 3 indisponíveis)
- [x] Achado da medição: o padrão de diagnóstico da R3 barrava inventário com advérbio ("você tem apenas um laudo") e com particípio ("os laudos que você tem guardados"); exceção alargada, diagnóstico com advérbio continua reprovado (3 mutações mortas)
- [x] Medição com as duas mudanças: **9 de 9 aprovadas de primeira**, 0 perdidas — `estudos-ia/04-implementacao/avaliacoes/2026-09-24-r1-antes-e-depois.md`
- [x] `npm run validate` verde — 125 suítes, 1447 testes

## Bloco 4 — O PDF grande é dividido (E5)

- [x] `pdf-lib` instalado (1.17.1; fora da lista do `npm audit`)
- [x] Teste de `dividirPdf`: cabe inteiro; divide em metades; página pesada sozinha e leves juntas; página única grande demais; PDF que não abre
- [x] Teste de `juntarPartes`: deslocamento de página; avisos com as páginas; parte falha; todas falham; consumo somado
- [x] Teste de `pdfDivisivel`; `avaliarArquivo` não muda (o anexo do chat continua num bloco só)
- [x] Implementação e `handler.ts` (log `pdf-dividido` com partes e falhas)
- [x] Medição contra o modelo real: o laudo de 20 páginas com 2 páginas de ruído vetorial na frente (7,3 MB) → 2 partes; **40 de 40** linhas em comum com a leitura inteira vieram com a página deslocada certa; 45 linhas contra 47 da leitura inteira, dentro da instabilidade de omissão já medida (42 a 47); 78 mil tokens de entrada contra 62 mil (o ruído também é lido)
- [x] `npm run validate` verde — 127 suítes, 1465 testes; 7 mutações, 6 mortas e 1 equivalente (dividir página a página dá o mesmo resultado depois da junção de vizinhas)

## Bloco 5 — Várias folhas num documento (E6)

- [x] Schema `extraPageKeys` (**muda o schema: precisa de deploy**)
- [x] Teste de `chavesDasFolhas`: pasta diferente, `..` (inclusive na mesma pasta), mais de 10, sem folha 1
- [x] Teste de `somaDasFolhas`: uma folha igual a `fileChecksum`; ordem e fronteira contam
- [x] Teste de `bedrockClient`: um bloco de imagem por folha, na ordem, pedido depois; tipo novo `kind: 'folhas'` (a foto única continua `imagem`, sem mudança)
- [x] Teste de `buildUserAskDeFoto` com várias folhas
- [x] `handler.ts`: a leitura do bucket é UM laço sobre as folhas — no merge com a EPIC de segurança, é ali que entra `lerArquivoDoDono`
- [x] Teste do serviço: envio de várias folhas grava `extraPageKeys` na mesma pasta (sufixo `-folha-N`); PDF com folha, folha não-foto e mais de 10 recusados antes do primeiro upload; exclusão remove todas
- [x] Teste de tela: adicionar e remover folha; câmera cancelada; limite de 10; PDF sem botão; salvar leva as folhas
- [x] Teste de tela: detalhe com várias folhas mostra "Abrir folha N" e abre a chave certa
- [x] Teste do mapeamento: `getDocumentById` traz `extraPageKeys` sem nulos, e documento de uma folha não ganha lista
- [x] **E10 (achado de fora, da sessão de segurança):** releitura que falha mantém à vista a leitura anterior, com a frase "os valores abaixo são da leitura anterior"
- [x] Medição contra o modelo real: páginas 10 e 11 do Delboni, em JPEG de 2000 px — sozinha, a 11 não traz HDL; juntas, **HDL 62 do papel**, confiança 0,98, igual nas duas rodadas, a trava não rebaixa nada; 16,0 mil tokens contra 14,4 mil. O HDL saiu marcado na folha 2 (onde o bloco continua), não na 1 (onde o número está)
- [x] `npm run validate` verde — 129 suítes, 1503 testes; 11 avisos de lint (um novo, meu, em `todasAsPaginas.ts`, consertado); mutações: 3 na chave, 2 na tela de adicionar, 1 no mapeamento, 1 na tela de falha — todas mortas

## Bloco 6 — Encerramento

- [x] `limitacoes.md` (§2.3, §2.7 fechadas; §2.9, §2.10 novas; §3.2 com a medição; §3.3–3.5 fora de escopo; tabela), `decisoes.md` (D47–D51 — a D46 é da EPIC de segurança), `roadmap.md` (2.13), `notas.md`
- [x] Comentário "79 analitos" em `handler.ts`
- [x] Decisão K da spec do Bloco 10 aponta para esta EPIC
- [x] Varreduras: nenhum código LOINC digitado (um na spec, `776-4`, e errado, foi tirado), nenhuma raiz vetada (duas em documentos meus, tiradas), nenhum caractere invisível
- [x] Conferência dos critérios de aceite (abaixo)
- [x] `npm run validate` verde

### Conferência dos critérios de aceite

| Critério | Estado |
|---|---|
| Linha conferida preserva os quatro campos; aviso na discordância | ok (teste + mutação) |
| Local substituída 1 para 1, correção transferida | ok |
| Antiga que não reaparece fica; local sem relação fica | ok |
| Permissão de consulta no índice | ok no código; **só vale depois do deploy** |
| Exclusão na ordem lido → arquivos → documento; falha no meio preserva o documento | ok |
| Tela lê todas as páginas | ok |
| PDF 4,5–10 MB dividido e lido; página certa; parte que falha não derruba | ok (teste + modelo real) |
| Página sozinha acima do teto → `grande-demais` | ok |
| Até 10 folhas, só imagem; uma chamada, em ordem | ok (teste + modelo real) |
| Folha de outra pasta ou com `..` → `arquivo-sem-chave` | ok |
| Detalhe abre cada folha; exclusão apaga todas | ok |
| Documento de uma folha: mesma soma, mesmos ids | ok |
| R1 no prompt sem a palavra; medição antes/depois registrada | ok — Decisão P **reformulada** |
| `limitacoes.md` e D47–D51 | ok |
| Teste manual no aparelho (câmera de verdade, várias folhas) | **não feito** — precisa de você e do deploy |

## O que foi encontrado ERRADO no plano, executando-o

1. **A Decisão P1 contrariava um teste que existe de propósito.** O plano mandava
   pôr a raiz, montada em tempo de execução, no prompt. `rulesPrompt.test.ts`
   proíbe o termo no bloco de regras e exige que o bloco passe na própria
   verificação — porque o modelo imita o que lê. A leitura do plano não abriu o
   `rulesPrompt.ts`, onde a R1 já estava (como enigma). Corrigido o **plano**, não
   o teste: a R1 do prompt nomeia os sentidos inocentes e as substituições sem a
   palavra.
2. **A medição da R1 media a R3.** O plano tratava o falso positivo da r1a como
   problema da R1. Com a R1 resolvida, a r1a continuou perdendo resposta — pela
   R3, num padrão de diagnóstico que barrava inventário. O Bloco 10 tinha
   registrado "2 de 12, todas salvas": a amostra dele não chegou a ver a
   resposta perdida.
3. **D27 no meu próprio teste.** O primeiro rascunho de `regravacao.test.ts`
   digitava códigos LOINC à mão. Trocado pela busca no catálogo pelo rótulo em
   português antes de rodar.
4. **O plano nomeava o índice pelo campo de consulta do cliente.** O nome do
   índice no DynamoDB só foi confirmado lendo a tabela do sandbox
   (`labResultsByDocumentId`); coincidiu, mas o plano o afirmava sem ter olhado.
5. **A divisão em metades sozinha não bastava.** O plano previa só metades
   sucessivas; o teste mostrou `[4..5]` e `[6]` separados quando a 5 e a 6
   cabiam juntas. Acrescentada a passada que junta vizinhas.
6. **Um teste meu passava sem testar nada.** A primeira versão do teste da
   página pesada dava folga de 3 KB no teto: o PDF inteiro cabia, e nada era
   dividido. A mutação "dividir página a página" sobreviveu e denunciou.
7. **O `pdf-lib` abre PDF quebrado sem reclamar** e só falha ao contar páginas;
   o plano supunha que o `load` falharia.
8. **O plano numerou as decisões como D46–D50**, e a EPIC de segurança, feita em
   paralelo noutra sessão, já tinha usado a D46. Renumeradas para D47–D51.
9. **O plano não previa a tela de `FAILED`.** A lista de valores só aparecia em
   `SUCCEEDED`: uma releitura que falhasse escondia valores que continuavam no
   banco. Apontado pela sessão de segurança (com a posse do arquivo, todo
   documento antigo falha ao ser relido), e consertado aqui (E10).
10. **O plano mudava o tipo `imagem` para carregar uma lista.** Na execução, a
    foto única ficou como estava e as folhas ganharam um tipo próprio (`folhas`):
    nenhum teste e nenhum caminho da foto única mudou.
11. **Um stub meu era esperto demais.** O primeiro stub de `somaDasFolhas`
    devolvia a soma da primeira folha e passava nos cinco testes novos — a falha
    confirmada exigiu um stub burro.
12. **O plano não previa a rota do detalhe.** `extraPageKeys` é opcional no tipo,
    e o compilador não reclama de um mapeamento que o esquece; sem o teste do
    `getDocumentById`, o botão "Abrir folha" nunca apareceria. A rota
    `document-detail.tsx` repassa o campo, mas não tem teste próprio.
