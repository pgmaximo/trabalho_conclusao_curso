# Notas de implementação

Achados, armadilhas e medições encontradas durante a construção. Preenchido à
medida que o trabalho acontece — não é planejamento, é o que se descobriu.

## Do levantamento do repositório (2026-09-15)

- A tela de chat já existe e está inteiramente mockada. A fronteira com o
  provedor está isolada de propósito em `src/services/aiAssistantService.ts`,
  com um comentário registrando que a troca por IA real exigiria confirmação
  explícita por causa da decisão de privacidade. A troca é por substituição
  desse serviço; tela e hook não mudam de contrato.
- `useChatBot.ts` devolve `historyGroups` sempre vazio, de propósito, com o
  comentário explicando que nenhuma conversa é persistida ainda. O painel de
  histórico existe na interface e está pronto para receber fonte real.
- `MedicalDocument` guarda apenas metadados: tipo, nome, data, validade e a
  chave no S3. O conteúdo do arquivo não é lido por nada hoje.
- ~~`healthAppConnectService.ts` devolve `'unavailable'`~~ — **superado no mesmo
  dia**: a feature de wearable do Arturo foi mergeada em `dev` e substituiu esse
  trecho morto. Ver abaixo.

## Da leitura da feature de wearable (commits `3e1a42c` … `7f18aae`)

O que herdamos como precedente, e que economiza boa parte do nosso trabalho:

- **Bedrock com saída forçada por tool.** `anthropic.claude-sonnet-4-6` pelo
  identificador de perfil de inferência `us.anthropic.claude-sonnet-4-6`. O
  comentário no `backend.ts` registra que o identificador base não é aceito para
  invocação sob demanda, e que isso foi descoberto invocando a função de
  produção. Anotar antes de repetir o erro.
- **Escolha de modelo com motivo escrito.** Sonnet em vez de Opus porque a tool
  forçada é incompatível com raciocínio estendido nos modelos da Anthropic, e o
  Opus liga isso por padrão. Repetir a escolha dele em vez de redescobrir o
  erro 400.
- **Uma fonte de verdade para o schema.** O mesmo objeto zod valida a resposta e
  gera o schema da tool. Copiar.
- **Reparo antes de rejeitar.** A saída passa por um corte de campos longos
  antes da validação, e só erro estrutural aciona a tentativa de reparo. O
  comentário distingue com cuidado o que é encurtar texto já escrito do que
  seria inventar conteúdo.
- **Limites de campo calibrados com dado real**, com o histórico das correções
  escrito no próprio arquivo — inclusive o caso do export de 7,7 anos que
  estourou o limite duas vezes seguidas.
- **A função escreve com `UpdateCommand`, nunca `PutCommand`**, para não apagar
  os campos que o resolver do AppSync preencheu. Mesma armadilha nos espera.
- **O resolver do AppSync tem teto de 30 segundos**, por isso a análise é
  disparada de forma assíncrona e o aplicativo consulta por repetição. Um laço
  de tools passa desse teto com facilidade. Foi o que motivou a D12. **Item a
  verificar cedo.**
- **As funções existentes já estabelecem o padrão** de acesso a dado, inclusive
  o detalhe de que a permissão de execução não carrega a identidade do usuário
  — por isso algumas leem o DynamoDB diretamente, com o nome da tabela vindo por
  variável de ambiente.
- 18 arquivos de lógica pura com teste, 222 testes no total. O padrão de
  qualidade da casa para uma feature de IA neste repositório está posto.
- O projeto exige Node 20 para publicar o ambiente do Amplify; versões mais
  novas quebram a publicação.
- Antes de considerar qualquer coisa pronta: `npm run validate`.

### Pendência registrada por ele que pode nos afetar

O commit menciona a conta AWS aguardando um formulário de uso de modelos da
Anthropic. O comentário mais recente no `backend.ts`, de 2026-09-15, diz que a
invocação foi confirmada na função de produção — provavelmente resolvido, mas
confirmar antes de assumir.

## A medir quando houver o que medir

- [ ] Latência de uma resposta de chat com laço de tools
- [ ] Tokens por conversa
- [ ] Custo por conversa e por documento extraído
- [ ] Taxa de acerto da extração contra documentos conferidos à mão

---

## Revisão completa de 2026-09-16

Revisão de todo o material de IA contra o código do repositório, contra a tabela
de disponibilidade de recursos por plataforma e contra referência de química.

**Conferido e correto:** as 22 massas molares, uma a uma, e os sete fatores da
tabela de conversão por análise dimensional. Glicose 180,16 → 0,0555;
creatinina 113,12 → 88,4; vitamina D 400,64 → 2,496; B12 1355,37 → 0,738;
folato 441,40 → 2,266. Batem com os fatores publicados. A recusa de converter
hemoglobina (D18) e o tratamento de `mEq/L` por valência estão certos, e são os
dois lugares onde um projeto desatento erraria por fator de 4 e por fator de 2.

**Seis defeitos encontrados.** Quatro deles com o mesmo formato — gravam número
errado sem levantar erro, que é a classe de falha que a Tarefa 14 existe para
contar, e chegariam até lá dentro:

1. **Vírgula decimal brasileira ausente de todo o material.** `parseFloat('32,5')`
   devolve `32`; `parseFloat('1.234,56')` devolve `1.234`. Nenhum teste do plano
   pegava, porque todos usavam ponto americano. → D23, Tarefa 2b nova.
2. **Id determinístico colidindo** com o mesmo analito duas vezes no mesmo
   documento (curva glicêmica, cortisol manhã/tarde). `UpdateCommand`
   sobrescreve calado. → D22.
3. **Valor censurado sem lugar no esquema** (`<0,01` em TSH, PSA, beta-HCG,
   PCR; `>1000` em D-dímero). → D21.
4. **`collectedAt` em dois lugares diferentes**, sem regra de ausência. → D24.
5. **Permissão do Textract sem as ações assíncronas.** As síncronas processam
   uma página só de PDF; laudo tem três ou mais. Seria `AccessDenied` no
   primeiro documento de verdade. → Tarefa 7.
6. **Três formatos de código de analito em três tarefas** (`14635-7`,
   `VIT-D-25OH`, `VIT-D`). → tudo em LOINC, virou restrição global.

Mais um buraco de plano: a Tarefa 8 descrevia a escolha entre Textract síncrono
e assíncrono numa frase, sem código — e é a plumbing mais intrincada da
pipeline. A auto-revisão anterior procurou "TBD" e "TODO" e declarou zero
marcadores; ela não pegava descrição-sem-código, e a checagem de consistência de
tipos não comparava valores de exemplo entre tarefas.

**Dois achados de arquitetura**, da tabela de disponibilidade por plataforma:

- **"Structured outputs / strict tool use" é GA no Bedrock.** Se `output_config.format`
  chegar pelo `ConverseCommand`, dispensa a tool forçada — e portanto dispensa a
  contradição inteira que a Tarefa 1 existia para medir. Consequência de
  segurança: a saída voltaria como bloco de **texto**, que o `guardrailConfig`
  avalia, e a ausência de guardrail de saída deixaria de ser justificada para
  virar recurso de graça.
- **"PDF input" é GA no Bedrock.** Laudo brasileiro é majoritariamente PDF
  digital. Pode tirar o Textract do caminho crítico desses.

A tabela não diz se os dois chegam pelo `ConverseCommand` ou só pelo
`InvokeModel` — ela sinaliza essa restrição explicitamente para outro recurso, e
não para estes. Sugere que chegam; não prova. Viraram cenários da Tarefa 1, que
passou de uma medição para quatro.

**LangChain e LangGraph** avaliados e recusados nas duas frentes. → D20.

## Da prova de vida do Bedrock (Tarefa 1, 2026-09-17)

Medição real, conta `370586504317`, região `us-east-1`. Decisão em D19.

- **`list-foundation-models` mente sobre acesso.** Opus 5 e Sonnet 5 aparecem
  na listagem e têm perfil de inferência `ACTIVE`, e mesmo assim a invocação
  devolve `AccessDeniedException: not available for this account`. Listagem é
  catálogo, não direito de uso. O jeito de saber é invocar.
- **O prefixo `global.` não contorna** a falta de liberação — mesmo erro do
  `us.`. Liberados hoje: Opus 4.6, Sonnet 4.6, Opus 4.5, Sonnet 4.5, Haiku 4.5.
- **O `toolSpec` do Converse engole campo desconhecido sem reclamar.** Provado
  mandando `campoQueNaoExiste: true` junto — passou igual a `strict: true`.
  Consequência prática: **nunca concluir que um recurso existe porque a API não
  reclamou dele.** Se não há como distinguir aceitação de silêncio, é silêncio.
- **`output_config` é o contrário disso**, e por isso é confiável: com schema
  inválido o servidor recusa nomeando o campo, e sob instrução contrária
  ("escreva um poema, não use JSON") a saída volta dentro do schema.
- **PDF nativo custa entrada, não trabalho.** O laudo de 836 KB e 19 exames
  entrou como 49.482 tokens. Com a extração estruturada junto, 50.027 de
  entrada e 3.143 de saída, 35 segundos, 41 analitos. Comparar com o custo do
  Textract mais o texto extraído antes de decidir que é caro.
- **O modelo transcreveu com vírgula decimal e ponto de milhar intactos**
  (`"5,19"`, `"16,1"`, `"5.500"`), que é o comportamento que a D23 pede. A
  instrução de sistema pedia transcrição, não conversão.

### Dois achados que viram trabalho, e não estavam no plano

1. **`collectedAt` volta como `04/10/2025`, não em ISO.** O schema da Tarefa 4
   exige `^\d{4}-\d{2}-\d{2}$`, então a linha inteira seria recusada. O prompt
   da Tarefa 9 precisa pedir ISO explicitamente, e o teste precisa cobrir isso.
2. **`10^6/µL` não está na tabela de unidades.** O laudo do Delboni escreve
   assim para eritrócitos; o conversor conhece `10*6/uL`, que é a grafia UCUM.
   Sem alias, **a primeira linha de todo hemograma vai para revisão** — o
   mesmo modo de falha que a D28 descreve, encontrado agora contra papel de
   verdade em vez de hipótese. O mesmo vale para `10^3/µL`.
