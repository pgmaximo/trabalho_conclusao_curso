# Decisões do E6 — Wearable: série diária e histórico

Épico: [E6 no PRD](../prd.md) · Ordem de entrega: 10º · Três decisões: D6.1, D6.2 e D6.3 (as três nasceram na leitura do código, antes da spec)

O PRD listava o E6 como "sem decisão aberta". A leitura do código mostrou três pontos que mudam o que o épico entrega: a validação de posse que o PRD pede não é possível do jeito descrito, a análise da tela traz texto de outra IA com sugestões, e as importações se sobrepõem quase por inteiro.

## O que o código faz hoje (verificado em 2026-10-19)

- `HealthImport` (`amplify/data/schemas/health-import.ts`) tem `allow.owner()`: o dono **cria e edita** a própria linha, inclusive `resultArtifactKey`, `metricsJson` e `insightsJson`.
- `analyze-health-import/handler.ts` grava a série diária completa em `health-imports/<identityId>/<importId>/result.json` (`{ series, summary, insights }`), sem metadado de dono, e só para importação que concluiu. Se a gravação falha, `resultArtifactKey` fica vazio e a análise segue (o arquivo é tratado como "artefato de depuração").
- O chat só conhece o `sub` e o `username` do token (`auth.ts`). O identityId do pool de identidades, que nomeia a pasta, ele não tem: é o mesmo problema que a D46 (`amplify/storage/metadadoDoDono.ts`) resolveu para documentos e anexos com o metadado `sub-de-quem-enviou`.
- `start-health-analysis` já resolve a posse dos arquivos brutos **pelo `importId`**: cada chave tem de estar em `health-imports/<qualquer>/<ESTE importId>/<arquivo>` (`health-import-shared/fileKeyValidation.ts`). O `importId` é o id da linha, um UUID que só a linha do dono tem.
- `insightsJson` (`analyze-health-import/insightSchema.ts`) traz `resumo` (até 600 caracteres), até 4 `destaques`, até 4 `pontosDeAtencao` (com `severidade`), até 3 `padroes`, até 4 `sugestoes` (ação e porquê), até 3 `perguntasParaOMedico` e `limitacoes` (até 1.400). A tela de Wearable (`HealthDashboardScreen.tsx`) mostra tudo, e mostra os `warnings` atrás de "O que não conseguimos ler (N)".
- O chat hoje devolve só `metricsJson` da última importação (`consultar_wearable`), que já tem, por métrica, média, mediana, mínimo, máximo, tendência e a **média de cada mês** (`monthly`). Não tem dia a dia.
- A exportação do Samsung Health traz o histórico inteiro do celular até o dia da exportação (o comentário de `FIELD_LIMITS.limitacoes` cita um export real de 7,7 anos). Duas importações da mesma pessoa cobrem quase o mesmo período: a mais nova é a antiga mais alguns meses.

---

## D6.1 — Como o chat prova que o `result.json` é do dono

**O que decidir:** o PRD pede que a ferramenta "valide que a chave pertence à identidade antes de ler". A função não tem o identityId, e a chave sai de uma linha que o próprio dono pode editar. Sem uma conferência de verdade, a pessoa A escreve na própria linha a chave do `result.json` de B, e o chat lê a série diária de B.

### Opção A — Vínculo pelo `importId`, como a importação já faz *(recomendada)*

A chave só é aceita se for exatamente `health-imports/<pasta>/<id da linha lida do dono>/result.json`. A linha vem de `lerDoDono` (dono do token). A não consegue ter uma linha com o id de uma importação de B (o id é chave primária e é UUID), então não consegue apontar para um arquivo que a função de análise gravou para B. A permissão do chat no bucket fica só em `health-imports/*/result.json`: ele nunca lê os arquivos brutos exportados.

**Benefícios**
- A mesma garantia que `start-health-analysis` já usa para os arquivos brutos, com o mesmo módulo (`isFileKeyValid`). Nada novo para manter.
- Funciona com todo `result.json` que já existe: ninguém precisa importar de novo.
- Não muda `analyze-health-import`.

**Malefícios**
- O segmento da pasta (identityId) continua sem conferência. Quem pode gravar um `result.json` na pasta de B com o id da importação de A é só B, e isso é B entregando o próprio dado, não A tomando o de B. É o mesmo raciocínio da D46.

### Opção B — Metadado do dono no arquivo (D46)

`analyze-health-import` passa a gravar `sub-de-quem-enviou` no `result.json`, e o chat confere com `lerArquivoDoDono`, como no anexo da conversa.

**Benefícios**
- A mesma conferência dos documentos e anexos.

**Malefícios**
- Falha fechado: todo `result.json` gravado antes fica sem metadado e é recusado. Quem já importou só tem série diária no chat depois de importar de novo.
- Muda outra função (a análise) e o teste dela.

### Opção C — As duas

Vínculo pelo `importId` sempre, e o metadado gravado nos arquivos novos e conferido quando existir.

**Benefícios**
- Defesa em camadas, sem quebrar os arquivos antigos.

**Malefícios**
- "Conferir quando existir" não fecha nada que o vínculo já não feche, e soma código nas duas funções.

### Recomendação: **Opção A**

**Motivo:** fecha o ataque descrito (A apontar para o arquivo de B) com a garantia que o projeto já aceitou para os arquivos brutos, sem obrigar ninguém a importar de novo. A permissão restrita a `result.json` também tira do chat o acesso aos arquivos brutos, que ele não precisa.

**Efeito no PRD:** o texto do 6.2 ("o prefixo já inclui o identityId do dono, e a ferramenta valida que a chave pertence à identidade") passa a dizer que a posse é provada pelo `importId` da linha do dono, e o critério "chave de outro dono rejeitada" é testado com a chave de outra importação.

**Decisão:** **Opção A** (vínculo pelo `importId` da linha do dono; permissão só em `health-imports/*/result.json`). Decidido em 2026-10-19.

---

## D6.2 — O que da análise da tela (`insightsJson`) vai ao chat

**O que decidir:** o PRD pede para reaproveitar `insightsJson` e `warnings` "para o chat ser coerente com a tela". A análise é texto escrito por outra IA e traz sugestões de ação e pontos de atenção. Todo esse texto entra no contexto do modelo a cada uso.

### Opção A — Resumo e títulos, e a tela para o resto *(recomendada)*

O chat recebe o `resumo`, os **títulos** dos destaques, dos pontos de atenção e dos padrões, as `limitacoes` e as **contagens** de sugestões, de perguntas para o médico e de avisos de leitura. A saída diz que a análise completa está na tela de Wearable. As descrições longas e o texto das sugestões não vão.

**Benefícios**
- O chat diz o mesmo que a tela sobre o mesmo dado, em poucas centenas de tokens.
- O modelo não reescreve uma sugestão de ação ("caminhe 30 minutos por dia") como se fosse orientação dele.
- Os avisos seguem o padrão do E4: só a contagem, e onde ver.

**Malefícios**
- Quem pergunta "o que a análise sugeriu?" recebe os títulos e o caminho para a tela, e não o texto inteiro.

### Opção B — A análise inteira

**Benefícios**
- Coerência total com a tela.

**Malefícios**
- Até cerca de 4 mil caracteres a mais em todo uso da ferramenta (RT10).
- O texto das sugestões chega ao modelo e pode voltar reformulado como orientação. A verificação de linguagem pega dose e diagnóstico, não toda sugestão de hábito.

### Opção C — Nada da análise

O chat fica com os números (resumo estatístico e série diária).

**Benefícios**
- O menor contexto, e nenhum texto de outra IA.

**Malefícios**
- O chat e a tela podem descrever o mesmo período de jeitos diferentes, e o chat não sabe o que a pessoa viu na tela.

### Recomendação: **Opção A**

**Motivo:** dá a coerência que o PRD pede pelo que a pessoa reconhece da tela (o resumo e os títulos), sem pagar o texto inteiro a cada turno e sem pôr na boca do assistente a sugestão de outra IA.

**Efeito no PRD:** o 6.2 passa a dizer que vão o resumo, os títulos, as limitações e as contagens, e que os avisos de leitura vão só como contagem.

**Decisão:** **Opção A** (resumo, títulos, limitações e contagens; a tela para o resto). Decidido em 2026-10-19.

---

## D6.3 — O que é "comparar com a importação anterior" (6.1)

**O que decidir:** a história do 6.1 é "como meu sono mudou em relação à importação anterior?". Como cada exportação traz o histórico inteiro, a importação anterior cobre quase o mesmo período da atual, e a média de uma é quase a média da outra.

### Opção A — Comparar períodos da série diária *(recomendada)*

A ferramenta compara dois **períodos de dias** de uma métrica, lidos da série diária da importação mais recente: por padrão, os últimos 30 dias com dado contra os 30 anteriores, ou dois períodos que a pessoa pedir. Para cada período, o código calcula a média e quantos dias tiveram registro, e escreve a diferença em texto neutro ("32 min a mais por dia"). Período com poucos dias de registro não dá média, e períodos de tamanhos diferentes são marcados como não diretamente comparáveis. A lista de importações continua existindo, só com período, data e situação, sem médias.

**Benefícios**
- Responde a pergunta real ("mudou?") com uma conta que faz sentido, sobre dias que não se sobrepõem.
- Reaproveita a leitura do 6.2: uma ferramenta de série, não duas leituras diferentes da mesma coisa.

**Malefícios**
- O 6.1 passa a depender do `result.json` (do 6.2). Importação sem o arquivo só tem a lista e o resumo.

### Opção B — Comparar importações inteiras, como o PRD descreve

Média de cada métrica no período de cada importação, lado a lado, com aviso de sobreposição e de tamanhos diferentes.

**Benefícios**
- Não depende do S3: sai de `metricsJson`.

**Malefícios**
- Com importações sobrepostas, compara quase o mesmo período, e a resposta "seu sono não mudou" sai da sobreposição, não da rotina da pessoa.

### Opção C — Só listar as importações

Período, data e situação de cada uma, sem comparação.

**Benefícios**
- Simples e sem cálculo.

**Malefícios**
- Não responde a pergunta da história.

### Recomendação: **Opção A**

**Motivo:** é a única que compara dias diferentes entre si. A comparação de importações inteiras daria um número correto sobre a pergunta errada.

**Efeito no PRD:** o 6.1 passa a ser "lista de importações (período, data, situação)" e "comparação entre dois períodos da série diária", calculada pelo código.

**Decisão:** **Opção A** (comparação entre dois períodos da série diária, calculada pelo código; lista de importações sem médias). Decidido em 2026-10-19.
