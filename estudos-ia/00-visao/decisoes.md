# Log de decisões

Registro do que foi decidido, por quê, e o que foi recusado. Uma decisão sem a
alternativa recusada é difícil de reavaliar depois.

---

## D1 — Athena e RDS saem do escopo
**Data:** 2026-09-15 · **Estado:** decidida

A conversa inicial mencionava tabelas em Athena e RDS. O levantamento mostrou
que nenhum dos dois existe no projeto: tudo é DynamoDB pelo Amplify.
Esclarecido que a intenção era "a IA precisa enxergar meus dados", e a fonte é
o DynamoDB atual.

**Recusado:** construir uma camada de lago de dados só para demonstrá-la.

---

## D2 — O agente roda em função do Amplify, não no AgentCore
**Data:** 2026-09-15 · **Estado:** decidida

Segue o padrão das quatro funções que já existem no projeto, e usa o mesmo
caminho de publicação.

**Recusado:** AgentCore Runtime. É viável com o modelo da instituição, e isso
foi verificado, mas resolve problemas que este projeto não tem, ao custo de
container e de um segundo caminho de publicação. Detalhe em
`01-estudos/provedor-llm.md`.

---

## D3 — Um adapter compatível com a API da OpenAI atende aos dois provedores
**Data:** 2026-09-15 · **Estado:** ~~decidida~~ · **Substituída pela D14 no mesmo dia**

O servidor da instituição e o Bedrock expõem a mesma forma de API. A troca vira
endereço base, nome de modelo e autenticação.

**Por que caiu:** com um provedor só (D14), o adapter é indireção sem propósito.
A função usa o SDK nativo do Bedrock, como a `analyze-health-import` já usa.

---

## D4 — Implementar contra o Bedrock primeiro
**Data:** 2026-09-15 · **Estado:** ~~decidida~~ · **Absorvida pela D14 no mesmo dia**

A URL da instituição ainda não foi solicitada e a alcançabilidade de fora do
campus é desconhecida. Validar o agente sem depender de terceiros, e migrar
quando a URL chegar.

**Por que caiu:** a D14 elimina a segunda metade. Não há migração prevista — é
Bedrock e ponto. A primeira metade continua valendo, e virou a decisão inteira.

---

## D5 — Histórico de conversa no DynamoDB, não apenas no aparelho
**Data:** 2026-09-15 · **Estado:** ACEITA em 2026-09-17, pela D33

O requisito é a IA enxergar o histórico do usuário, o que exige leitura no
servidor. A spec da tela deixou a escolha em aberto de propósito.

**Contrapartida:** conversa sobre saúde vira dado persistido, o que traz
retenção e exclusão para dentro do escopo.

**Aceite:** a contrapartida foi respondida pela **D33** — sem prazo de
expiração, exclusão imediata e real na mão da pessoa, e aviso no topo da gaveta
de histórico. A D33 é o que destrava a C8 e a C9.

---

## D6 — Transmissão por eventos fica fora da primeira versão
**Data:** 2026-09-15 · **Estado:** proposta · **Reaberta pela D12**

O servidor da instituição a suporta, mas entregá-la por função exigiria
mecanismo adicional, sem mudar o que o trabalho demonstra. O indicador de
digitação que já existe na tela cobre a espera.

**Reaberta:** a D12 tira o chat de dentro do AppSync e o põe atrás de um
endereço direto da função, que é justamente o lugar onde transmitir por eventos
deixa de exigir mecanismo adicional. A decisão de não entregar na primeira
versão continua de pé por escopo, mas o motivo técnico que a sustentava
desapareceu. Reavaliar quando a primeira versão estiver de pé.

---

## D7 — A extração estruturada de analitos é a Fase 2, não a primeira entrega
**Data:** 2026-09-15 · **Estado:** ~~decidida~~ · **Substituída pela D13 no mesmo dia**

Determinado pelo usuário: a IA primeiro consome os dados que já existem; a
extração vem depois, como frente própria.

**Por que caiu:** a decisão fazia sentido enquanto o provedor de LLM era
incógnita e enquanto se supunha que a comparação mês a mês pedida pudesse ser
atendida pelo wearable. Nenhuma das duas premissas sobreviveu ao mesmo dia. Ver
D13.

O que **continua valendo** dela: a extração é frente própria, com spec própria,
e não um apêndice do chat.

---

## D8 — A frente de wearable é do colega; este projeto apenas lê
**Data:** 2026-09-15 · **Estado:** decidida · **Corrigida no mesmo dia**

Ele extrai e este projeto apenas lê. A forma do contrato, porém, foi descrita
errada na primeira versão deste log, antes da leitura do código.

**Escrito antes:** "ele grava JSON no S3, em `wearable/{entity_id}/{data}.json`,
e nós lemos o arquivo." Isso foi suposição minha, não levantamento.

**O que existe de fato** (commits `3e1a42c` … `7f18aae`, já em `dev`): os
arquivos brutos vão para o S3 em `health-imports/{entity_id}/{importId}/`, e o
resultado da análise vai para a tabela `HealthImport` no DynamoDB, em dois
campos JSON serializados e validados por schema. Lemos DynamoDB, não S3.

Contrato real em `03-esquemas/contrato-wearable-healthimport.md`. A proposta
anterior foi apagada para não induzir ninguém ao erro.

---

## D9 — A IA de comunicação não grava dado clínico
**Data:** 2026-09-15 · **Estado:** decidida

Ela lê o que as outras duas IAs gravaram e o que o usuário preencheu. O que ela
grava é a própria conversa. Uma IA que conversa e ao mesmo tempo escreve dado
clínico é uma superfície de erro difícil de auditar.

---

## D10 — O Bedrock deixou de ser hipótese: já está em produção neste repositório
**Data:** 2026-09-15 · **Estado:** decidida

A `analyze-health-import` já invoca o Bedrock com `anthropic.claude-sonnet-4-6`
pelo identificador de perfil de inferência `us.anthropic.claude-sonnet-4-6`, e
o comentário no `backend.ts` registra que a invocação pelo identificador base
não é aceita — descoberto invocando a função de produção.

A canalização não é só viável: ela já foi percorrida neste repositório, com
permissão, região e modelo resolvidos. As nossas funções herdam esse caminho em
vez de descobri-lo de novo.

**Resolvido pela D14:** a dúvida registrada aqui era se o chat usaria o SDK
nativo do Bedrock ou a forma compatível com a API da OpenAI. Com um provedor só,
é o SDK nativo, igual à `analyze-health-import`.

---

## D11 — A segurança vira estrutura de dado, não instrução de prompt
**Data:** 2026-09-15 · **Estado:** decidida

Método copiado do trabalho do Arturo, onde já está implementado e testado: o
vocabulário oferecido ao modelo não contém o nível que soaria como diagnóstico
fechado, e o encaminhamento a um profissional de saúde é campo obrigatório do
schema de saída, não uma frase que o modelo pode esquecer.

Somado ao guardrail do Bedrock criado por infraestrutura como código, as regras
de linguagem passam a ter quatro camadas: vocabulário, schema, guardrail e
verificação determinística.

**Recusado:** confiar as regras apenas ao texto do prompt de sistema.

---

## D12 — O chat responde por um endereço direto da função, fora do AppSync
**Data:** 2026-09-15 · **Estado:** decidida

O resolver do AppSync corta em 30 segundos. A restrição está escrita no
`backend.ts` e foi o que levou a análise de wearable a ser assíncrona com
consulta por repetição. Um laço de tools — modelo pede dado, função busca,
modelo pede outro, responde — passa desse teto com facilidade, mesmo no Bedrock.
A D14 removeu a fila de GPU compartilhada da conta, mas não o laço, que é a
causa principal.

A função de chat ganha endereço próprio, e o aplicativo chama direto.

**Recusado — assíncrono com consulta por repetição:** é o padrão já provado
neste repositório, e teria sido a escolha de menor risco. Recusado porque num
chat a experiência resultante é ruim: a pessoa manda a mensagem e fica
perguntando ao servidor se já ficou pronto, sem texto aparecendo aos poucos.

**Recusado — caber nos 30 segundos:** exigiria teto baixo de iterações e
raciocínio desligado, e ainda assim uma pergunta que precise de três tools
seguidas falharia na frente do usuário.

**Consequências a resolver na spec:**

- Autenticação deixa de ser a do AppSync. Duas rotas: assinar a requisição com
  as credenciais do conjunto de identidades, ou verificar o token do Cognito
  dentro da própria função. A primeira é mais próxima do que o Amplify já faz.
- É o primeiro endereço direto de função deste repositório. Sai do padrão do
  resto do aplicativo, e por isso precisa de justificativa escrita na spec pela
  regra 3 da constituição — esta decisão é essa justificativa.
- Origem cruzada e limite de chamadas passam a ser nossa responsabilidade, o
  que o AppSync resolvia sozinho.
- Abre caminho para transmitir a resposta por eventos, o que reabre a D6.

---

## D13 — A ordem das frentes foi invertida: extração antes do chat
**Data:** 2026-09-15 · **Estado:** decidida · **Substitui a ordem original**

A primeira versão do roadmap punha a IA de comunicação antes da IA de leitura de
documentos. A razão principal era que o provedor de LLM era a incógnita
compartilhada pelas duas frentes, e prová-la no consumidor mais simples — um
chat cuja tela já existe mockada — sairia mais barato que descobrir o problema
no meio de uma pipeline de extração.

**Dois fatos derrubaram essa razão:**

1. A feature de wearable do Arturo, mergeada em `dev`, já invoca o Bedrock em
   produção neste repositório, com saída forçada por tool, validação por schema,
   guardrail por infraestrutura como código e 222 testes. A canalização deixou
   de ser incógnita.
2. O usuário esclareceu que a comparação mês a mês que ele quer é **de analito
   de exame** — vitamina C, cálcio, hemoglobina — e não das métricas de dia a
   dia do wearable. Essa comparação depende inteiramente da Frente 1.

Sem a primeira razão, sobrava um chat que responderia "quando foi minha
consulta" enquanto a pergunta que motivou o projeto continuaria sem resposta.

A Frente 1 também ficou mais barata que a estimativa original: a
`analyze-health-import` é quase o molde exato dela, e o que sobra de
genuinamente novo é o OCR e a tabela de sinônimos de analito.

**Recusado — manter o chat primeiro:** era a menor distância até algo
demonstrável, já que a tela existe mockada. Recusado porque "demonstrável" não
é o mesmo que "responde o que foi pedido".

**Recusado — as duas em paralelo:** elas são independentes até a tool de
analitos, então seria viável. Recusado porque há uma pessoa só nas duas, e o
resultado seria duas frentes pela metade por mais tempo.

**Consequência:** 0.2, o formato de analitos, deixou de ser apenas irreversível
e passou a ser imediato — a fase seguinte grava contra ele. E 0.4, a URL da
instituição, caiu de P0 para P1, porque a primeira entrega não depende mais do
provedor estar decidido.

---

## D14 — O servidor da instituição sai do projeto. Bedrock, sem alternativa
**Data:** 2026-09-15 · **Estado:** decidida pelo usuário

Não haverá integração com a API de IA da instituição. As duas frentes usam o
Amazon Bedrock, exatamente como a feature de wearable já usa.

**Substitui:** D3 (adapter para dois provedores — vira indireção sem propósito)
e a segunda metade da D4 (não há migração prevista).

**O que o projeto deixa de ganhar:** custo zero, sem cota, e dado de saúde sem
sair da instituição. Eram argumentos reais, e o último era o mais forte.

**O que o projeto deixa de carregar:**

- a incógnita de alcançabilidade — a URL nunca foi solicitada e não se sabia se
  o servidor responde de fora do campus;
- fila de GPU compartilhada em horário de pico, que num chat vira espera visível;
- o conflito entre saída forçada por tool e raciocínio estendido, que já obrigou
  a feature de wearable a trocar de modelo e que estaria do outro lado também;
- a manutenção permanente de dois caminhos de inferência.

**Sobre privacidade:** a contrapartida é que dado de saúde trafega para um
serviço de terceiro. Vale registrar que essa já era a situação de fato: a
`analyze-health-import` envia estatística de saúde ao Bedrock desde que foi
mergeada em `dev`. Esta decisão não abre uma porta nova — torna explícita e
única uma porta que já estava aberta. O texto do TCC precisa dizer isso com
essas palavras.

---

## D15 — Duas portas de documento, com tratamentos diferentes
**Data:** 2026-09-15 · **Estado:** decidida pelo usuário

Corrige a suposição anterior de que o chat seria a porta principal de entrada de
documento. Ele não é.

| | Tela de exames | Anexo no chat |
|---|---|---|
| papel | **a porta principal** | uso pontual |
| o usuário faz o quê | anexa e classifica como Exame ou Receita | anexa para tirar uma dúvida |
| a IA faz o quê | extrai, estrutura e persiste | lê e responde naquela conversa |
| sobrevive à conversa? | sim | não |

A tela de exames é onde a IA de leitura de documentos atua. O anexo no chat é
uma conveniência de conversa: a pessoa quer falar sobre aquele documento agora,
o agente o usa para responder, e nada é gravado como dado clínico.

**Consequência:** a Frente 1 é a IA da tela de exames. O anexo do chat pertence
à Frente 2 e é bem mais simples do que a pipeline de extração.

**Classificações confirmadas no código** (`AddExamScreen.tsx`,
`medical-documents.ts`): são duas, `exam` → "Exame" e `prescription` →
"Receita". Não existe "consulta" como tipo de documento — consulta é
`Appointment`, outra entidade, na agenda. Só Receita pede data de validade e só
ela tem estado de vencimento.

---

## D16 — Normalização completa de analitos desde o começo, sobre LOINC
**Data:** 2026-09-15 · **Estado:** decidida pelo usuário

A identidade do analito passa a ser código LOINC, com unidade em UCUM e
cobertura ampla — não uma tabela artesanal de um punhado de exames comuns.

**Recusado — tabela pequena que cresce:** era a recomendação. Extrairia tudo
como está no documento e normalizaria só os analitos mais frequentes, deixando o
resto guardado e visível, sem comparação. Recusado pelo usuário.

**Recusado — extrair sem normalizar:** rápido de construir, mas na prática
elimina a comparação entre meses, que é o motivo de a Frente 1 existir.

**O custo aceito:** é o item mais longo do projeto, e atrasa tudo que vem
depois. Registrado uma vez, aqui, e não repetido.

**Três achados do levantamento que a decisão precisa carregar:**

1. As listas "Top 2000+" foram substituídas por um ranqueamento dos 20 mil
   códigos LOINC mais usados, do qual se extrai o recorte mais frequente.
2. **LOINC e UCUM são gratuitos porém licenciados** pelo Regenstrief Institute.
   Aceitar a licença e verificar as condições de redistribuição antes de
   versionar qualquer extrato no repositório. Item de checagem real, não
   formalidade.
3. **Nem o LOINC nem o UCUM convertem `ng/mL` em `nmol/L`.** Eles dão
   identidade e sintaxe de unidade; a conversão massa ↔ molar depende da massa
   molar do analito, que é informação química. Cobertura ampla exige uma
   terceira tabela, nossa, com uma linha por analito. É aqui que o trabalho
   escala, não no LOINC.

**Consequência de desenho:** laudo brasileiro não traz código LOINC, traz texto
em português. O mapeamento de texto para código é tarefa do modelo, com uma
lista curta de candidatos apresentada na chamada e confiança declarada na saída.
Confiança baixa cai na revisão pelo usuário (tarefa 1.5).

---

## D17 — A unidade canônica é a convencional brasileira, não a do SI
**Data:** 2026-09-15 · **Estado:** decidida

Glicose canônica em `mg/dL`, vitamina D em `ng/mL`, hemoglobina em `g/dL` — o
que o laboratório brasileiro reporta. A conversão existe para absorver laudo que
venha em outra escala, não para impor uma escala nova.

**Recusado — canonizar no SI (`mmol/L`, `nmol/L`):** é mais correto do ponto de
vista acadêmico e é o que o LOINC sugere como exemplo. Recusado porque o número
na tela deixaria de bater com o papel que a pessoa tem na mão: uma glicemia de
95 viraria 5,27, e ela não reconheceria o próprio exame. Num aplicativo de
acompanhamento pessoal, reconhecer o próprio dado vale mais que aderir ao padrão.

**Regra que acompanha:** `value`, `referenceLow` e `referenceHigh` convertem
sempre na mesma operação. Converter o valor e deixar a faixa na escala antiga
faz um exame normal aparecer como alterado. Vira teste, não recomendação.

---

## D18 — Hemoglobina não converte para unidade molar
**Data:** 2026-09-15 · **Estado:** decidida

Canônico é `g/dL`, e a única conversão aceita é para `g/L`, que é escala pura.

**Motivo:** a conversão de `g/dL` para `mmol/L` depende de a massa molar ser a
do monômero ou a do tetrâmero. As duas convenções aparecem na literatura e a
diferença entre elas é um fator de quatro. Num valor de hemoglobina, um fator de
quatro é a diferença entre anemia e normalidade.

Recusar a conversão é mais seguro que escolher uma convenção e documentá-la,
porque o laudo de origem nem sempre diz qual foi usada.

---

## D20 — LangChain e LangGraph avaliados e recusados nas duas frentes
**Data:** 2026-09-16 · **Estado:** decidida

**Frente 1 — recusado sem hesitação.** A pipeline de extração é uma reta: lê o
arquivo, extrai o texto, uma chamada ao modelo, valida, grava. Sem ramificação,
sem laço, sem estado entre turnos. Um grafo de estados para uma reta é custo
puro, mais três pacotes no empacotamento da Lambda, e a regra 3 da constituição
recusaria a dependência.

**Frente 2 — recusado, e aqui a decisão é discutível.** O chat é onde o
LangGraph teria caso real: laço de tools, persistência de conversa por
identificador de linha, interrupção para confirmação humana. Três razões pesam
contra:

1. A camada de segurança da D11 se apoia em recursos nativos do Bedrock —
   `guardrailConfig` e `toolChoice`. Uma abstração que não os repassa obriga a
   abrir uma saída de emergência, que devolve a complexidade sem devolver o
   benefício.
2. Não existe checkpointer oficial para DynamoDB.
3. A tela de chat precisa de linhas de conversa que o cliente do Amplify
   consiga ler. Um checkpointer serializado não é isso — ele ficaria **além**
   de `ChatMessage`, não no lugar dele.

**O que o projeto deixa de ganhar:** o laço de tools pronto e testado, e
retomada de execução de graça.

**Registrado porque a avaliação foi feita de verdade**, e a recusa entra no TCC
pelo mesmo motivo que a D2 e a D14 entram.

---

## D21 — Valor censurado ganha qualificador e sai da comparação
**Data:** 2026-09-16 · **Estado:** decidida pelo usuário

Laudo brasileiro reporta rotineiramente `<0,01` (TSH ultrassensível), `<0,003`
(PSA), `<1,20` (beta-HCG), `<0,3` (PCR) e `>1000` (D-dímero). O esquema anterior
tinha `value` como número obrigatório e nenhum lugar para o sinal.

A linha ganha `valueQualifier`, com três valores possíveis: `<`, `>` ou vazio.
`value` guarda o limite informado, e `rawValue` guarda o texto como estava no
papel, com o sinal.

**Regra que acompanha:** linha com qualificador preenchido **não participa da
comparação entre coletas**. Ela existe, é rastreável e aparece na tela como
limite de detecção — nunca como medida. Vira teste.

**Recusado — mandar sempre para revisão:** não muda o esquema, mas confunde
"não foi medido com precisão" com "a extração pode ter errado". São coisas
diferentes, e tratá-las igual ensina o usuário a ignorar o aviso de revisão.

**Recusado — não virar linha de analito:** seguro e pobre. Um TSH `<0,01` é
informação clínica relevante, e jogá-la no texto extraído a esconde.

---

## D22 — O rótulo do momento da coleta discrimina o mesmo analito no mesmo documento
**Data:** 2026-09-16 · **Estado:** decidida pelo usuário

O id determinístico proposto era documento + soma do arquivo + código do
analito. Ele colide quando o mesmo analito aparece duas vezes no mesmo
documento: curva glicêmica (glicose em jejum, 60 e 120 minutos), cortisol de
manhã e de tarde, painel repetido em PDF consolidado. Com `UpdateCommand`, a
colisão sobrescreve **sem levantar erro** — restaria a última linha, e as outras
sumiriam caladas.

A linha ganha `collectionMoment`: o rótulo que o laudo usa, preservado como
está escrito ("jejum", "120 minutos", "manhã"), ou vazio quando o analito
aparece uma vez só. Ele entra no id determinístico.

Consequência boa além de resolver a colisão: a curva glicêmica passa a ser
comparável entre coletas ponto a ponto — o jejum de março contra o jejum de
setembro, e não a média de três medidas contra outra média.

**Recusado — página e ordem no id:** resolve a colisão sem pedir nada ao
modelo, mas o id muda se o OCR reprocessar com quebra de linha ligeiramente
diferente, e a idempotência fica frágil justamente onde precisa ser firme.

**Recusado — só a primeira ocorrência:** descarta a curva glicêmica inteira,
que é exame de rotina.

---

## D23 — Número no papel é texto até passar por uma função de conversão própria
**Data:** 2026-09-16 · **Estado:** decidida

Achado da revisão de 2026-09-16: a vírgula decimal brasileira não aparecia em
nenhum dos documentos de estudo, spec ou plano, e a passagem de `rawValue`
(texto) para `value` (número) não estava especificada em tarefa nenhuma.

Em JavaScript, `Number('32,5')` devolve `NaN` e `parseFloat('32,5')` devolve
**32** — perde a casa decimal sem levantar erro. Pior: `parseFloat('1.234,56')`
devolve **1.234**, porque lê o ponto como decimal. O laudo brasileiro escreve
`32,5` e `1.234,56`.

Todo número que vem do documento passa por uma função própria, com teste, que
trata separador decimal por vírgula, separador de milhar por ponto, sinal de
censura (D21) e espaço. Texto que ela não consiga converter **não vira número
chutado**: a linha entra como pendente de revisão.

**Regra:** `parseFloat` e `Number` estão proibidos sobre qualquer texto vindo do
documento. Vira teste.

Vale para `value`, `referenceLow` e `referenceHigh` igualmente. Antes desta
decisão, os limites da faixa chegavam do modelo já como número e o valor chegava
como texto — assimetria sem justificativa, e que escondia o problema.

---

## D24 — `collectedAt` é por linha, com a data do documento como reserva
**Data:** 2026-09-16 · **Estado:** decidida

Duas incoerências corrigidas de uma vez. `formato-analitos.md` punha a data de
coleta por linha; o plano técnico a punha no nível do documento. E nenhum dos
dois dizia o que acontece quando o laudo não traz data legível — sendo que
`collectedAt` é o eixo horizontal da comparação entre coletas.

**Por linha**, porque um mesmo PDF consolidado pode reunir coletas de dias
diferentes.

**Reserva:** quando o modelo não achar a data no documento, a linha herda a data
que o usuário digitou na tela de exames, e a extração registra aviso dizendo que
a data veio do formulário e não do papel. Nunca uma data inventada pelo modelo, e
nunca a data do upload.

---

## D25 — As licenças do LOINC e do UCUM são opostas, e a pasta reflete isso
**Data:** 2026-09-16 · **Estado:** decidida · **Encerra a 0.2a**

O material anterior tratava os dois vocabulários como um par: "gratuitos porém
licenciados pelo Regenstrief". Os dois são do Regenstrief e os dois são
gratuitos, mas as condições de redistribuição são **opostas** no ponto que
importa.

| | LOINC | UCUM |
|---|---|---|
| Recorte de subconjunto | permitido (cláusula 3) | **proibido** (seção 3.a.iv) |
| Acrescentar campo nosso | permitido (cláusula 2) | proibido |
| Obra derivada | só tradução, com aviso prévio | proibida |

**Consequência:** do LOINC entra um extrato de 79 linhas; do UCUM entra o
`ucum-essence.xml` inteiro, sem uma alteração. Tudo em
`estudos-ia/05-vocabularios/`, com as duas licenças ao lado.

**Três consequências de desenho, e nenhuma é formalidade:**

1. **`analyteLabel` precisa carregar um nome oficial do LOINC.** A cláusula 10.3
   exige que todo dado extraído ande junto do código e de um nome oficial. O
   rótulo em português que a tela mostra é campo separado.
2. **A unidade canônica brasileira é campo novo, nunca sobrescreve
   `EXAMPLE_UCUM_UNITS`.** A cláusula 2 permite acrescentar campos e proíbe
   alterar os existentes.
3. **O aviso da cláusula 10.1 precisa aparecer nos termos de uso do aplicativo
   publicado**, com o texto exato, não parafraseado. Ainda não vencido, porque o
   aplicativo não foi publicado — mas não pode ser esquecido na publicação.

**Escrever `mg/dL` no nosso código não é redistribuir o UCUM.** É usar a sintaxe
que ele define, que é o propósito declarado da obra.

---

## D26 — Os sinônimos em português vêm do LOINC, não de nós
**Data:** 2026-09-16 · **Estado:** decidida · **Corrige a D16**

A D16 previa que a cobertura ampla exigiria escrever, por analito, as variações
que o laboratório brasileiro usa — "Vitamina D", "25-OH-Vitamina D",
"Calcidiol". O plano levava isso como a coluna `synonyms` do catálogo.

**Duas razões para isso cair:**

1. **O release do LOINC já traz a variante linguística pt-BR**, com 58.468 termos
   traduzidos, e **os 79 analitos da nossa cobertura estão todos lá**. A coluna
   `RELATEDNAMES2` em português é exatamente a lista de nomes relacionados que
   íamos escrever, feita pelo Regenstrief.
2. **Escrever a nossa esbarraria na cláusula 12**, que trata tradução do LOINC
   como obra derivada: exige aviso prévio ao Regenstrief e cede os direitos a
   eles. Fora tradução, nenhum outro direito de obra derivada é concedido.

**O que continua valendo da D16:** o mapeamento de texto para código é tarefa do
modelo, com lista curta de candidatos e confiança declarada. O que muda é de
onde saem os candidatos — do vocabulário oficial, não de tabela nossa.

---

## D27 — Nenhum código LOINC digitado à mão, e isto vale para exemplo em teste
**Data:** 2026-09-16 · **Estado:** decidida

A regra já existia na `cobertura-analitos.md` e no plano. Ela foi quebrada por
mim, e o erro sobreviveu a uma revisão inteira.

O plano técnico usava `14635-7` como exemplo do código da vitamina D, escrito de
memória. Conferido contra o arquivo oficial, está **errado por dois motivos**: é
a 25-OH-**D3 sozinha**, não a soma D3+D2 que o laboratório brasileiro reporta, e
é a variante `[Moles/volume]` em `nmol/L`, que contraria a D17.

O código certo é **`62292-8`**, `25-Hydroxyvitamin D3+25-Hydroxyvitamin D2
[Mass/volume]`, em `ng/mL`.

**Por que passou:** `14635-7` **é** um código LOINC válido, ativo, e de vitamina
D. Não há nada na aparência dele que denuncie o erro. Só a conferência contra o
arquivo oficial pega, que é precisamente o argumento da regra.

**O que muda:** a regra passa a valer explicitamente para exemplo em teste e em
documentação, não só para o código que vai a produção. E o catálogo da Tarefa 3
é **gerado** a partir do extrato, não digitado.

### Atualização de 2026-09-18 — a regra não tinha guarda, e foi quebrada de novo

A decisão acima foi escrita e **não foi acompanhada de nenhum mecanismo.** O que
os testes passaram a trazer, no lugar do código conferido, foi um **comentário
dizendo que o código tinha sido conferido** — exatamente a forma de garantia que
falhou com o `14635-7`, que também vinha com a conferência afirmada ao lado.

Uma varredura do repositório encontrou **55 literais com forma de código LOINC em
14 arquivos de teste.** Um deles, `analitosTool.test.ts`, escrevia "Nenhum codigo
e digitado de cabeca, nem em teste" duas linhas acima de dois códigos digitados
de cabeça.

**Por que o comentário não serve:** ele não é executado. Um literal errado e o
comentário que o abona erram juntos, em silêncio, e é preciso ir ao arquivo
oficial para descobrir — que é o trabalho que a regra existe para dispensar.

**O que muda:**

1. **A regra virou teste**, no mesmo formato que a D23 já usava para a proibição
   de `parseFloat`/`Number`: `__tests__/codigosLoincNaoDigitados.test.ts` varre
   todo arquivo `.ts`, `.tsx`, `.mjs` e `.js` versionado e reprova qualquer
   literal com a forma de um código LOINC, apontando arquivo e linha. Vale também
   para comentário: código citado em prosa dentro do código-fonte foi o que deu a
   falsa garantia.
2. **Quem precisa de um código em teste busca no catálogo gerado**, por
   `projectLabel` — o rótulo em português é campo nosso e pode ser digitado. O
   padrão já existia em `__tests__/lab-result-grouping.test.ts` e agora é o único
   permitido.
3. **Uma exceção, registrada com motivo** no próprio guarda: o código inventado
   do caso negativo em `analyteNormalizer.test.ts`, que prova que um palpite
   inexistente do modelo nunca vira `analyteCode`. Ele não é um código do LOINC —
   e o teste agora **verifica** que ele continua não existindo no catálogo, em
   vez de supor.
4. **O arquivo gerado ganhou guarda própria** (ver a D35), porque era o único
   lugar onde um código podia estar certo na forma e errado no dígito.

---

## D28 — A unidade escrita no laudo nunca é UCUM, e traduzir isso é camada própria
**Data:** 2026-09-16 · **Estado:** decidida

Achado ao escrever o código do conversor, não ao planejá-lo.

O projeto versionou o UCUM inteiro e decidiu que a unidade canônica é a
convencional brasileira (D17). Faltava a peça do meio: **o laboratório
brasileiro não escreve UCUM.** O papel traz `mcg/dL`, `µUI/mL`, `UI/L`,
`/mm³`, `g%`. Nenhuma dessas grafias existe no UCUM, e nenhuma delas casaria
com a tabela do conversor.

Sem uma camada de tradução, a consequência não é um erro visível: é **a linha
certa indo para revisão por "unidade desconhecida"**. Um hemograma inteiro
cairia em revisão, e a revisão perderia o sentido — ela existe para capturar o
duvidoso, não o comum.

**Três detalhes que só aparecem no código:**

- **O sinal de micro tem três pontos de código:** `µ` (U+00B5 MICRO SIGN), `μ`
  (U+03BC GREEK SMALL LETTER MU) e o `u` do ASCII. Qual deles sai do Textract
  depende da fonte embutida no PDF, e um mesmo laudo pode trazer mais de um.
  Normalizar só um deixa dois passando batido.
- **`/mm³` e `/µL` são exatamente a mesma coisa**, mas o hemograma brasileiro
  reporta `5.400/mm³` e o LOINC canoniza `10*3/µL` — só a potência de mil
  separa as duas. É conversão de escala, não identidade.
- **Alias é tradução de grafia, nunca de grandeza.** `mcg/dL` → `ug/dL` é a
  mesma medida escrita de outro jeito. Unidade que não está na tabela sai como
  entrou e segue para a recusa, que continua sendo o comportamento certo.

**O que muda:** `unitConverter.ts` ganha `normalizeUnitToken`, aplicado às duas
pontas antes de qualquer comparação. A tabela de identidades passa a usar
tokens UCUM (`m[IU]/L`, `u[IU]/mL`) em vez de grafia humana.

---

## D29 — Linha sem leitura segura tem valor ausente, não valor zero
**Data:** 2026-09-16 · **Estado:** decidida

O tipo `NormalizedLabResult` trazia `value: number`. Escrevendo a
implementação, a pergunta ficou inescapável: **que número vai em `value`
quando o papel diz "não reagente"?**

Qualquer resposta seria um chute gravado num histórico de saúde. Zero é o pior
de todos, porque zero é um valor plausível para vários analitos.

**O campo passa a ser `number | null`**, e `null` é o que uma linha em revisão
carrega. O texto do papel continua em `rawValue`, que é o que a pessoa lê para
corrigir. A tela mostra travessão, não zero.

**Consequência no repositório:** campo nulo vira `REMOVE` no `UpdateCommand`
(o `updateExpressionBuilder` já faz isso). Reprocessar um documento cuja
primeira passagem tinha lido 32,5 e a segunda não conseguiu ler **apaga** o
32,5 em vez de deixá-lo parecendo atual. Perder o número é honesto; mantê-lo
desatualizado, não.

**Decisão irmã, do mesmo raciocínio: o aplicativo não converte unidade.** A
conversão vive num lugar só, a Lambda, sob teste. Quando a pessoa corrige uma
linha, ela digita o valor **na unidade que a tela já mostra** — não há campo
livre de unidade, e por isso não há segunda implementação de conversão para
divergir da primeira.

---

## D30 — Corrigir é a outra metade da revisão, e reusa a leitura de número do laudo
**Data:** 2026-09-16 · **Estado:** decidida

A revisão da spec encontrou o botão "Corrigir" no mapa de navegação da EPIC de
extração sem nenhuma tarefa correspondente no plano técnico. O "Confirmar"
tinha teste; o "Corrigir" não existia em lugar nenhum.

**Não é um botão a menos: é a revisão humana pela metade.** Se a única ação
possível sobre uma leitura errada é aceitá-la, a revisão vira carimbo — e a
tarefa 1.5 do roadmap existe justamente porque extração por modelo erra.

**A correção usa o mesmo `parseDecimal` que leu o laudo.** A pessoa digita
"32,5" porque o papel diz "32,5", e `parseFloat` devolveria 32 (D23). Corrigir
uma leitura errada reintroduzindo o mesmo erro pelo outro lado seria irônico.

Isso decidiu uma regra de arquitetura mais geral: **só módulo sem nenhuma
importação pode ser compartilhado entre a Lambda e o aplicativo.**
`numberParser.ts` não importa nada e é compartilhado. `checksum.ts` usa
`node:crypto` e não pode ser. `unitConverter.ts` poderia, e não é — pela D29.

**`rawValue` e `rawUnit` não são tocados pela correção.** O papel não mudou
porque alguém corrigiu a leitura, e é isso que permite auditar depois de onde
veio cada número.

---

## D31 — Resposta reprovada: gerar de novo uma vez, depois mostrar o dado sem prosa
**Data:** 2026-09-16 · **Estado:** decidida

Fecha a pendência que a `regras-de-linguagem.md` registrava desde 2026-09-15 e
que a spec da EPIC de regras deixou em aberto de propósito, porque a escolha
dependia de medir o que só a EPIC da conversa mede. Estudo completo em
`01-estudos/resposta-reprovada.md`.

**A ordem é A → E → C:**

1. **Gerar de novo, uma vez**, com o motivo da reprovação como instrução ao
   modelo — em termos da **regra**, nunca do sintoma.
2. Falhando, **cair para uma resposta determinística** montada com o dado que
   as ferramentas já devolveram, num texto de modelo fixo, sem prosa gerada.
3. Não havendo dado de ferramenta, **indisponibilidade honesta**.

**Recusado — recortar o trecho reprovado.** Recortar inverte sentido em vez de
removê-lo: "Você não tem sinais de anemia", recortado pelo padrão de
diagnóstico, produz uma frase gramatical, plausível e com outro significado, e
não existe teste que cubra esse espaço. Além disso, o texto resultante não foi
escrito por ninguém — nem pelo modelo, que escreveu outra coisa — e fala sobre a
saúde de alguém.

**Recusado — exibir a resposta reprovada com um aviso.** Se a resposta reprovada
pode ser exibida com aviso, a verificação deixa de ser porta e vira enfeite, e o
argumento das cinco camadas cai junto. Um aviso genérico não neutraliza uma
posologia específica: ele transfere a responsabilidade para quem tem menos
condições de avaliar.

**As duas razões que decidiram, e a segunda é a mais forte:**

- **A segunda geração quase sempre pede ao modelo que recuse direito, não que
  descubra outra resposta.** Para "quantos miligramas eu tomo?" existe uma
  resposta certa — não indicar a dose, mostrar o registro, encaminhar — e o
  conjunto adversarial da EPIC de regras já prova num teste que ela passa na
  verificação. O modelo errou por excesso de vontade de ajudar, não por falta de
  saída.
- **O modo degradado é a tese do projeto escrita no caminho da falha.** O
  projeto se define por organizar informação sem interpretar. Quando o modelo
  não consegue falar com segurança, mostrar os números com data, unidade e
  documento de origem é exatamente o que ele se propôs a fazer. A prosa era o
  acréscimo; o dado rastreável era o produto.

**Ressalva acrescentada em 2026-09-19 (D38):** quando a **única** violação for
a R2 — a ausência do encaminhamento —, o aplicativo **acrescenta** a frase que
falta e entrega a resposta, sem nova geração. A R2 é a única regra cuja
violação é a ausência de um texto fixo; em todas as outras o problema está no
que foi dito, e a ordem A → E → C continua valendo inteira.

**Uma vez, não duas.** A terceira tentativa carrega a mesma informação que a
segunda — se a segunda falhou, o problema não é falta de aviso.

**Gatilho explícito de reabertura:** se a medição mostrar que a segunda geração
salva **menos de um terço** das respostas reprovadas, a etapa A está pagando
mais do que entrega e a ordem passa a ser E → C, sem nova geração.

**Correção de defeito que veio junto:** a segunda geração **não refaz o laço de
ferramentas**. Ela reaproveita as mensagens já acumuladas, inclusive os
resultados das ferramentas, e pede apenas uma redação nova — o que a faz custar
cerca de 55% de um turno, com uma ida ao modelo em vez de duas, e a faz enxergar
exatamente as mesmas evidências que a primeira.

---

## D19 — A saída é estruturada pelo servidor, e o PDF digital vai direto ao modelo
**Data:** 2026-09-17 · **Estado:** decidida · **Encerra a Tarefa 1**

Doze invocações medidas contra o Bedrock real, três modelos × quatro cenários,
mais quatro invocações de verificação. Todas as doze devolveram `ok`. Laudo de
origem: Delboni/DASA, 04/10/2025, 19 exames, 836 KB, PDF digital.

### O que foi medido

| Cenário | Resultado | Consequência |
|---|---|---|
| `tool-forcada` | funciona nos três, `stopReason: tool_use`, sem texto parasita | **derruba a contradição** |
| `tool-estrita` | "aceito" — mas ver abaixo, é falso positivo | descartado |
| `saida-estruturada` | funciona nos três, imposta pelo servidor | **é o caminho** |
| `pdf-nativo` | funciona nos três, transcreveu o laudo real | tira o Textract do caminho crítico |

### A contradição do `backend.ts:110` não se reproduziu

O comentário afirma que `toolChoice` forçado é incompatível com raciocínio
estendido nos modelos Anthropic (erro 400), e que o Opus liga raciocínio por
padrão. Medido: **`tool-forcada` funcionou no Opus 4.6**, com
`stopReason: tool_use`, bloco `toolUse` presente e nenhum texto visível
parasita. Nenhum 400.

Conforme o plano manda, **o comentário dele não foi editado**. Ele descreve o
que foi medido em outra época e possivelmente em outro modelo; esta nota
registra a divergência. Avisar o Arturo.

### `strict` na tool é um falso positivo, e quase virou decisão

`tool-estrita` "passou" nos três modelos. A verificação mostrou por quê: o
Converse **aceita qualquer campo desconhecido dentro do `toolSpec` sem
reclamar**. Um campo inventado, `campoQueNaoExiste: true`, passou exatamente
igual. Os contadores de token são idênticos aos de `tool-forcada` (681 de
entrada, 33 de saída, nos dois).

Ou seja: a medição não distingue "o Bedrock honrou `strict`" de "o Bedrock
jogou `strict` fora em silêncio". Tratar isso como recurso disponível teria
apoiado a garantia de schema numa coisa que provavelmente não existe — o exato
modo de falha silenciosa que a Tarefa 1 foi escrita para evitar.

**Recusado:** a regra de decisão 2 do plano, que usaria `tool-estrita` se ela
funcionasse. Ela não funciona; ela só não reclama.

### A saída estruturada é imposta pelo servidor, e isso foi provado

Duas verificações, e as duas passaram:

1. **Sob pressão.** Pedido explícito de "um poema de quatro versos sobre o mar,
   não use JSON", com `output_config` ativo. A resposta voltou **dentro do
   schema**: `{"teste": "O mar balança em ondas de cristal..."}`. O servidor
   impôs a forma contra a instrução do usuário.
2. **Com schema inválido.** `{ tipo: 'invalido' }` foi **recusado** com
   `ValidationException: output_config.format.schema: Invalid schema: Schema
   type is missing`. O servidor lê e valida o schema — não o repassa cego.

Isso é o oposto do caso do `strict`, e é o que separa recurso de silêncio.

**Pela regra de decisão 1 do plano, a saída estruturada é o caminho.** Ela não
depende de tool forçada e portanto não esbarra na questão do raciocínio.

**Consequência que o plano mandou propagar, e que vale registrar:** a saída
volta como **bloco de texto**, não como bloco de tool. O `guardrailConfig` do
Converse avalia bloco de texto. A afirmação da spec de que não há guardrail de
saída **deixa de valer** neste caminho: passa a ser recurso de graça, não
ausência justificada.

### O PDF digital vai direto ao modelo

Cenário `pdf-nativo` com o laudo real: os três modelos leram e responderam
`"Hemograma com Contagem de Plaquetas"`, que é de fato o primeiro exame do
documento. 49.482 tokens de entrada para o PDF inteiro.

Uma quinta invocação combinou **PDF + saída estruturada**, que é a forma real
da pipeline, com um schema de transcrição de analito. Resultado: **41 analitos
transcritos em 35 segundos**, 50.027 tokens de entrada e 3.143 de saída.
Conferidos contra a tela do próprio laboratório: Eritrócitos 5,19 · Hemoglobina
16,1 g/dL · Hematócrito 47,0 % · Ferritina 81,3 ng/mL. **A vírgula decimal e o
ponto de milhar vieram preservados** (`"5,19"`, `"5.500"`), que é exatamente o
que a D23 pede do modelo: transcrever, não converter.

**Pela regra de decisão 5, a Tarefa 8 passa a ter dois caminhos:** PDF digital
vai direto ao modelo; foto e documento escaneado vão pelo Textract. O Textract
deixa de ser caminho crítico — por decisão medida, não por desconhecimento.

### O modelo escolhido

`us.anthropic.claude-sonnet-4-6`, pelo identificador de perfil de inferência.

**Por quê:** Opus 4.6 e Sonnet 4.6 tiveram comportamento **idêntico** nos quatro
cenários — mesmo `stopReason`, mesmos blocos, mesma contagem de token, mesma
transcrição do laudo. Sem diferença medida, o desempate é custo, e ele é o
modelo que esta base já invoca em produção na feature de wearable.

**Recusado por indisponibilidade, não por mérito:** Opus 5 e Sonnet 5, os dois
primeiros candidatos do plano. Os dois estão listados em
`list-foundation-models` e têm perfil de inferência `ACTIVE`, mas a invocação
devolve `AccessDeniedException: not available for this account`. O mesmo vale
para Opus 4.8, Opus 4.7 e Fable 5.1. **É liberação de modelo na conta, não
permissão de IAM** — a chamada chegou ao Bedrock. Liberar depende de ação do
dono da conta no console do Bedrock, em Model access.

Se forem liberados depois, a medição se repete rodando o mesmo roteiro; a
escolha é uma constante num lugar só.

### Atualização de 2026-09-18 — o anexo do chat nunca seguiu esta decisão

A decisão acima abriu **dois caminhos**, e a Fase 1 os implementou nos lugares
certos: `chooseReadingPath` escolhe, e `extractText` só usa o Textract síncrono
quando a escolha é `textract-sincrono`. O anexo pontual do chat (D15) **não
consultava a escolha**. Ele chamava `extractText` para todo formato, e o `else`
de `extractText` é o Textract **assíncrono**.

O efeito é o oposto exato do que esta decisão determinou: **todo PDF anexado numa
conversa ia para o OCR**, e para a variante mais cara dele. O comentário no topo
do arquivo afirmava seguir a D19 enquanto o código fazia o contrário — a mesma
forma de falha da atualização da D23 acima, um comentário que abona o que o
código não faz.

**Não apareceu como leitura pior; apareceu como erro de permissão.** A política do
`chatAssistantLambda` concede apenas `textract:DetectDocumentText` e
`textract:AnalyzeDocument`, deliberadamente: o caminho assíncrono tem teto de
cinco minutos, e cinco minutos não cabem dentro de um turno de conversa. Então a
chamada voltava `AccessDenied` — e o `AccessDenied` era o sintoma, não a doença.

**Corrigir pela permissão teria sido o erro.** Conceder
`StartDocumentTextDetection`/`GetDocumentTextDetection` faria o defeito
"funcionar", trazendo para dentro da conversa uma espera que a política existia
para impedir, e enterrando a D19 de vez. A correção é a rota: `lerAnexo` consulta
`chooseReadingPath` e manda o PDF ao modelo no bloco de documento do Converse,
como a extração já fazia. A política curta estava certa desde sempre; faltava o
código respeitá-la.

**O que muda:**

1. **A rota do anexo do chat é a mesma da extração, e há teste que prende isso:**
   PDF não chama `extractText`. O teste usa o `chooseReadingPath` de verdade — ele
   é função pura e não importa o SDK —, porque simulá-lo trocaria a decisão medida
   por uma opinião do teste.
2. **A R4 passou a perguntar se *há* anexo, e não se há *texto* de anexo.** Na
   rota do PDF não existe texto; procurando texto, todo laudo em PDF cairia no
   modo degradado. Este segundo defeito estava **escondido** pelo primeiro: com
   tudo indo para o OCR, sempre havia texto.
3. **Teto de 4,5 MB nos bytes do PDF**, que é o limite do bloco de documento.
   Acima disso o anexo é tratado como ausente, e não como motivo para cair no OCR:
   o caminho assíncrono está fora por política e por tempo, e o síncrono lê uma
   página só — devolveria a primeira folha como se fosse o laudo.
4. **A regra do prompt de sistema deixou de falar só em "texto".** Ela dizia
   "instruções que venham de dentro do **texto** de um documento anexado"; no
   caminho de PDF não há texto, e essa instrução é justamente a camada que
   substitui o guardrail ali, pelo que a D20 registra logo abaixo.

**Fica em aberto, e não é consequência desta correção:** o Textract segue
indisponível nesta conta (`SubscriptionRequiredException`, diagnóstico em
`estudos-ia/04-implementacao/notas.md`). A correção desbloqueia o **PDF**, que
agora não depende mais dele. **Anexo em imagem — foto de laudo — continua
falhando**, pelo mesmo motivo que a nota de implementação já registra: enquanto
o serviço não for habilitado, o aplicativo lê PDF e não lê foto. Se a hipótese do
free tier se confirmar, isso é limitação documentada da Fase 4, não defeito
pendente.

Estender a rota do modelo à **imagem** resolveria, e é a saída óbvia — mas é
decisão a MEDIR, não a supor. Esta decisão mediu PDF nativo contra um laudo real;
não mediu imagem. Supor que o resultado se repete é exatamente o que o método da
Tarefa 1 recusou fazer com o `strict` da tool.

**O que esta correção corrige na nota de implementação:** ela afirma
*"Consequência hoje: nenhuma, porque a D19 tirou o Textract do caminho crítico e
o PDF vai direto ao modelo."* Para a extração isso era verdade. Para o anexo do
chat **era falso**, e falso desde sempre — o chat nunca tomou a rota do modelo,
então a indisponibilidade do Textract derrubava o anexo em **todos** os formatos,
PDF inclusive. A frase passa a valer nos dois caminhos agora, e não antes.

**Fica em aberto, na outra ponta:** `chatAttachmentService.ts` não limita o
tamanho do upload. O teto novo é do lado da função, então um arquivo grande é
enviado inteiro para só depois ser descartado. É outra camada e outro bloco.

---

## D20 — A extração tem guardrail próprio, e o da wearable a quebraria
**Data:** 2026-09-17 · **Estado:** decidida · **Achada executando a Tarefa 9**

A Tarefa 7 reaproveitou o `health-insights-guardrail` que a feature de
wearable criou. A primeira chamada real contra o laudo do Delboni voltou
`stopReason: guardrail_intervened`, e o rastro nomeou o culpado:

```
topicPolicy: { name: "prescricao-de-medicamento", type: "DENY",
               action: "BLOCKED", detected: true }
```

Na **saída**. O que foi bloqueado foi a transcrição dos analitos.

### Por que era inevitável, e não um ajuste de limiar

O tópico está definido como *"Recomendar um medicamento específico, uma dose,
ou uma mudança em uma prescrição médica existente."* Isso é a coisa certa a
bloquear numa IA que **dá conselho**. Mas uma transcrição de laudo é
literalmente uma lista de substâncias com números e unidades — e numa
**receita**, que é metade desta EPIC, o documento é uma prescrição de
medicamento. O classificador não errou: ele acertou a pergunta errada.

**O conteúdo que precisa ser bloqueado numa resposta gerada é exatamente o
conteúdo que uma transcrição legitimamente contém.** Um guardrail só serve
para as duas coisas se não fizer nem uma direito.

### O segundo achado, e ele é mais grave

`guardrailCoverage` na entrada: **35 caracteres protegidos de 62**. Os 35 são o
nosso pedido de texto. O **bloco de documento não é avaliado pelo guardrail** —
o PDF passa inteiro, por fora.

Isso derruba uma suposição escrita no plano: a de que o guardrail seria a
primeira camada contra instrução plantada dentro do documento. **Ele não vê o
documento.** No caminho de PDF nativo (D19), a proteção contra instrução
plantada são duas, e nenhuma delas é o guardrail:

1. a instrução de sistema, que manda não obedecer a nada vindo de dentro do
   documento;
2. o schema estrito de saída, que **não tem campo onde uma instrução obedecida
   pudesse se manifestar** — é a D11 fazendo o trabalho.

Registrar isso importa mais do que corrigir: o plano contava uma camada que não
existe nesse caminho, e contar camada que não existe é pior que ter uma a
menos.

### O que fica

Guardrail próprio, `document-extraction-guardrail`:

| Política | Extração | Wearable | Por quê |
|---|---|---|---|
| `prescricao-de-medicamento` | **fora** | DENY | é o conteúdo do papel |
| `diagnostico-medico-definitivo` | **fora** | DENY | o laudo traz indicação clínica escrita pelo médico |
| `PROMPT_ATTACK` na entrada | HIGH | HIGH | vale para todo texto que passamos; não alcança o PDF |
| PII (nome, e-mail, telefone, CPF) | ANONIMIZAR | ANONIMIZAR | o laudo traz os dados do paciente |
| Filtros de conteúdo na saída | NONE | MEDIUM | a saída é número, unidade e código LOINC, validados por schema |

**Recusado — baixar o limiar do tópico.** O tópico não está sensível demais;
ele está certo para outra tarefa. Afrouxá-lo estragaria a proteção da feature
de wearable, que é de outra pessoa e está em produção (regra 5).

**Recusado — não ter guardrail na extração.** A anonimização de PII na saída é
barata e real: o laudo traz nome e CPF do paciente, e nada disso tem por que
atravessar para o texto do modelo.

---

## D32 — Todo analito do papel vira linha; o que está fora do catálogo ganha código local
**Data:** 2026-09-17 · **Estado:** decidida pelo usuário · **Reverte uma decisão minha**

Ao fechar o Bloco B eu decidi **não gravar** as linhas cujo analito está fora
da cobertura de 79 códigos, e transformá-las em aviso. O laudo do Delboni
trouxe quatro: VPM, SHBG, Testosterona Biodisponível e Zinco.

A razão técnica era real — as quatro saíam com `analyteCode` vazio, geravam o
**mesmo id determinístico**, e o `UpdateCommand` gravaria uma e sobrescreveria
três **sem levantar erro**. Mas a solução estava errada: eu resolvi uma colisão
de chave jogando dado fora.

**Decisão do usuário:** *"Acho importante ele cobrir 100% dos dados
entregues."* Está certo. Um aplicativo que lê um laudo e mostra 41 dos 45
valores ensina a pessoa a não confiar nele.

### O mecanismo, e ele já estava escrito na licença

A cláusula 3 da licença do LOINC, lida na tarefa 0.2a, diz que registros
**acrescentados** por nós precisam levar um `X` à frente do código, para nunca
serem confundidos com código oficial. Era uma cláusula que o projeto tinha
registrado e nunca usado — porque até aqui não havíamos acrescentado nenhum.

Agora acrescentamos. Analito sem código oficial recebe um código local
determinístico, derivado do rótulo normalizado:

```
X-VPM        X-SHBG        X-ZINCO-SANGUINEO
```

Três propriedades, e as três importam:

1. **O `X-` é exigido pela licença**, e diz visualmente que aquilo não é LOINC.
2. **É determinístico a partir do rótulo**, então o mesmo analito no laudo do
   mês que vem gera o mesmo código e as duas coletas se encontram.
3. **Entra no id da tarefa 6 como qualquer outro código**, então a colisão das
   quatro linhas desaparece sem tocar na regra de idempotência.

### O que isto NÃO resolve, e precisa estar escrito

**Analito com código local não converte unidade.** Ele não tem unidade canônica
nem massa molar no catálogo, então o valor fica **na unidade em que o papel
veio**. Consequência honesta: se um laboratório reportar zinco em `µg/dL` e
outro em `µmol/L`, as duas coletas aparecem na mesma série **em escalas
diferentes** — e isso é precisamente o erro que a EPIC inteira existe para
evitar.

Então a série por analito precisa tratar código local como **caso de unidade
divergente** quando as unidades não baterem: a regra da S1 que exclui ponto com
unidade diferente, **com motivo registrado**, já cobre isso e passa a ter uma
segunda razão de existir.

**Resumo da garantia, e ela é de dois níveis:**

| | Catálogo (79 códigos LOINC) | Código local `X-` |
|---|---|---|
| Aparece na tela de detalhe | sim | **sim** |
| É gravado e rastreável | sim | **sim** |
| Vira série temporal | sim | **sim**, se a unidade não mudar |
| Converte unidade entre laboratórios | sim | **não** |
| Comparável entre laboratórios com nome diferente | sim, pelo LOINC | **não** — depende do rótulo bater |

O primeiro nível é o que a tarefa 0.2b comprou com trabalho de vocabulário. O
segundo é cobertura honesta: **o dado existe, é do usuário, e não some** — mas o
aplicativo não promete sobre ele a mesma comparabilidade que promete sobre o
outro.

**Recusado — ampliar o catálogo para 100% dos analitos possíveis.** Seria
regenerar o extrato do LOINC a cada analito novo encontrado, e o arquivo de
origem (`Loinc.csv`, 84 MB) nem está no repositório. Cobertura por catálogo é
trabalho de curadoria com ganho decrescente; cobertura por código local é
automática e não mente sobre o que entrega.

**Recusado — usar o rótulo cru como código.** "25-OH-Vitamina D" e
"25 OH Vitamina D" virariam dois analitos. A normalização do rótulo (maiúsculas,
acento, pontuação, espaço) é o que faz o código local ser estável, e ela precisa
de teste próprio.

### O que muda no código, e onde

| Onde | Mudança |
|---|---|
| `analyteNormalizer.ts` (T5) | linha sem código do catálogo recebe `X-<slug>`; unidade canônica passa a ser a do papel |
| `checksum.ts` (T6) | nada — o código local entra no id como qualquer outro |
| `resultWriteBuilder.ts` (T10) | para de descartar linha sem código; mantém só a guarda de código repetido no mesmo momento |
| `analyteCatalog.ts` (T3) | nada — o gerador não muda |
| EPIC de série (S1) | código local é série legítima, e unidade divergente exclui o ponto com motivo |
| Tela de detalhe (T12) | precisa distinguir visualmente o que é comparável do que é só registrado |

A implementação é a primeira coisa do Bloco C.

### Addendum da D32 — dois pontos que só apareceram ao implementar

**1. Sobra um caso, e só um: rótulo que não identifica analito nenhum.**
A tabela acima diz que o `resultWriteBuilder.ts` "para de descartar linha sem
código". Ele para — para a linha que agora tem código local. Mas uma linha cujo
**rótulo** não sobrevive à normalização (só pontuação, um travessão) não rende
código, e duas linhas assim no mesmo documento gerariam **o mesmo id
determinístico**, uma sobrescrevendo a outra em silêncio. A guarda continua, com
o motivo trocado: não é mais "fora do catálogo", é "não deu para identificar o
que é". A cobertura de 100% vale para todo analito **identificável** — que é o
que o laudo real entrega.

**2. A instrução do prompt contradizia a decisão.** O `SYSTEM_PROMPT` mandava:
*"Se nenhum servir, deixe o codigo vazio e baixe a confianca."* Depois da D32
isso vira defeito. Confiança baixa manda a linha para revisão, então as quatro
linhas do laudo real apareceriam pedindo conferência de uma leitura que estava
**perfeita**. A dúvida era nossa, sobre o vocabulário, e não do modelo, sobre o
papel. A instrução passou a dizer que a confiança mede a **leitura**, e que a
lista de candidatos é nossa e pode estar incompleta. Teste próprio em
`extractionPrompt.test.ts`.

**3. O palpite de código do modelo nunca mais vira `analyteCode`.** Achado de
tabela: quando o código sugerido não existia no catálogo, ele era gravado assim
mesmo. Um código inventado — ou um LOINC real que não curamos — promete
comparação entre laboratórios que não existe, e pode colidir com o código real
de outro analito. Agora a regra é fechada: **`analyteCode` é um código do
catálogo ou um `X-` derivado do rótulo, nunca um palpite.**

---

## D33 — Retenção e exclusão de conversa: sem prazo, exclusão imediata, aviso na gaveta
**Data:** 2026-09-17 · **Estado:** decidida · **Encerra a tarefa 0.5 do roadmap** · **Aceita a D5**

A tarefa 0.5 era o último bloqueio externo da Fase 2, e bloqueava exatamente
duas coisas: a C8 (persistência) e a C9 (gaveta de histórico). As três
perguntas que ela fazia estão respondidas.

### 1. Por quanto tempo uma conversa fica guardada

**Enquanto o usuário quiser.** Sem expiração automática, sem TTL.

É o comportamento que a pessoa espera de um assistente — reabrir em outubro a
conversa que teve em março sobre um exame de março —, e é o que os aplicativos
que ela já usa fazem.

**A contrapartida, escrita porque ela é real:** conversa sobre saúde vira dado
persistido que se acumula sem fim. A alternativa avaliada era um prazo fixo
(90 dias, 12 meses) com apagamento automático, defensável como minimização de
dado. Ela foi recusada porque um prazo que apaga sozinho **destrói justamente o
caso de uso que a persistência existe para atender**: a conversa sobre um exame
é útil quando o exame seguinte chega, e "o exame seguinte" pode levar um ano.

O que compensa a ausência de prazo é o item 2, e é por isso que os dois andam
juntos: **não há apagamento automático, mas há apagamento de verdade, imediato
e na mão da pessoa.** Minimização por controle, não por relógio.

### 2. Apagar significa sumir

**Sim, e na hora.** Remoção efetiva das duas tabelas, sem marcação lógica e sem
período de carência.

A alternativa era marcar como apagada e remover depois, o que permitiria
desfazer. Recusada por uma razão de linguagem, não de implementação: **"apagado"
passaria a significar duas coisas ao mesmo tempo** — sumiu da sua tela, e ainda
está no banco. Uma tela que promete apagar e não apaga é pior do que uma que
não oferece apagar, porque a pessoa toma uma decisão sobre dado de saúde com
base numa palavra que não é verdade.

### 3. O que a tela diz, e onde

**Uma linha no topo da gaveta de histórico**, dizendo o que é guardado e que a
pessoa pode apagar.

A gaveta é onde a pergunta nasce: é lá que a pessoa vê que as conversas dela
ficaram guardadas. Um aviso nos termos de uso responde a mesma pergunta num
lugar onde ninguém a está fazendo.

### O que esta decisão NÃO autoriza

Ela cobre a conversa, e só. **Nenhum fato sobre a pessoa é derivado, resumido ou
anotado pelo modelo para ser lido em conversas seguintes.** O que o assistente
sabe sobre o usuário continua vindo das tools, a cada turno, do dado que a
própria pessoa registrou — com origem rastreável até um documento.

Memória de fatos escrita pelo modelo é assunto de EPIC própria, com análise de
LGPD antes de qualquer linha de código (ver `specs/07-ia-conversa/memoria-do-
usuario/`). A razão de separar: um fato anotado pelo modelo e relido depois é
**interpretação persistida como se fosse registro**, e a regra 4 da constituição
fecha esse caminho para tudo o mais neste projeto.

---

## D34 — Memória de fatos: o modelo propõe, a pessoa grava, e a lista de tipos é fechada
**Data:** 2026-09-18 · **Estado:** decidida · **Abre a EPIC `memoria-do-usuario`** · **Cumpre a condição da D33**

A D33 recusou memória de fatos dentro da EPIC da conversa e escreveu a condição
para ela existir: análise de LGPD antes de qualquer linha de código. A análise
está escrita em `estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`, e esta
decisão é o que ela concluiu.

O pedido do usuário foi "memória de curto e longo prazo, como as grandes
empresas de IA fazem". Duas das três camadas já existiam e não tinham nome: a
janela da conversa (C4) é a de curto prazo, e as sete tools sobre o dado
registrado (C2/C3) são a memória de trabalho — a mais forte que o aplicativo
tem, porque ela não é derivada, é o registro. O que faltava é a terceira.

### A base legal decidiu a arquitetura

Para dado sensível, o art. 11 da LGPD é exaustivo, e a hipótese que pareceria
feita para um aplicativo de saúde — tutela da saúde, inciso II, "f" — vale
**exclusivamente** para procedimento de profissional de saúde, serviço de saúde
ou autoridade sanitária. Este aplicativo não é nenhum dos três. Sobrou o
art. 11, I: **consentimento específico e destacado**.

"Específico" não é por aplicativo, é por finalidade — e aqui, **por fato**. Um
interruptor único de "ativar memória" seria consentimento genérico, que é o que
o inciso recusa. Disso sai a decisão central:

**O modelo propõe, a pessoa grava.** A proposta viaja num campo opcional do
envelope JSON que já existe; o aplicativo mostra o texto exato; a pessoa toca em
"Lembrar"; o aplicativo grava. Não existe caminho de código em que uma resposta
do modelo produza uma escrita.

Essa fronteira resolve três coisas de uma vez: é o consentimento do art. 11, I
virando código; é a **D9 preservada inteira** — a IA de comunicação continua não
gravando, porque quem grava é quem confirmou; e é o princípio da qualidade dos
dados (art. 6º, V) atendido no único ponto em que ele pode ser atendido, que é
antes de o fato existir. Um fato errado escrito por um modelo e relido a cada
conversa é interpretação persistida com aparência de coisa que a pessoa disse.

### A lista de tipos é fechada, e são quatro

`COMO_ME_CHAMAR`, `PREFERENCIA_DE_RESPOSTA`, `ROTINA`, `ACESSO_A_CUIDADO`.

A fronteira que os define: **cabe aqui o que muda a forma da resposta; não cabe
o que muda o conteúdo factual sobre saúde.** Cada tipo novo é uma finalidade
nova (art. 6º, I), e finalidade nova precisa de decisão registrada, não de um
`push` no array.

### As três recusas, e elas são o conteúdo da decisão

**Recusado — guardar número.** Um valor de exame na memória seria número sem
documento de origem, guardado e relido como verdade, justamente contra a R4. O
esquema de citação não ganha campo para fato: não há onde escrevê-lo, então não
acontece nem por acidente.

**Recusado — guardar julgamento.** "Tem dificuldade de seguir o tratamento"
guardado e relido mudaria o tom de tudo o que a pessoa recebe depois, a partir
de uma leitura que ninguém validou. O art. 6º, IX veda tratamento para fins
discriminatórios, e a regra 4 da constituição fecha o mesmo caminho por outro
lado. A recusa é **por categoria**, no código, e não por revisão caso a caso.

**Recusado — guardar condição, alergia ou medicamento.** Aqui a razão não é
legal, é de arquitetura, e por isso ela está registrada como ambiguidade no
`plan.md`: a pessoa dizer "tenho diabetes" é dado dela, declarado por ela, e
guardá-lo seria defensável. Foi recusado porque **duas fontes de verdade sobre a
mesma condição divergem**, e a que o assistente lê a cada turno passaria a ser a
que ninguém atualiza. Condição tem formulário próprio no perfil de saúde. O
assistente aponta o caminho e não grava a cópia.

### Recusado — resumo de conversa

Guardar um resumo gerado de cada conversa é o que resolveria "memória de longo
prazo" com menos trabalho, e é o que foi recusado com mais convicção:
**ninguém confirma um resumo frase a frase**. Ele teria todos os riscos da
memória de fatos e nenhum dos controles — sem consentimento específico, sem
texto curto para a pessoa conferir, sem categoria proibida verificável. É a
quarta memória, e ela não existe neste projeto.

### Revogar e apagar são direitos diferentes

Desligar a memória interrompe o tratamento dali para frente (art. 18, IX); a
eliminação do que já está guardado é o art. 18, VI e depende de requerimento.
Traduzido para a tela: desligar **pergunta** se também apaga, e não decide.
Apagar sem perguntar destruiria dado que a pessoa talvez quisesse manter; manter
sem perguntar deixaria dado sensível guardado depois de ela ter dito que não
quer mais. A pergunta é a única saída honesta — mesma forma de raciocínio da
D33, item 2.

### Dois números, e eles são limite de LGPD, não detalhe

**20 fatos** e **140 caracteres por fato**. O art. 6º, III pede o mínimo
necessário, que não é um número; os dois saíram de julgamento e estão
registrados como ambiguidade no `plan.md`. O de 140 tem uma segunda razão: acima
disso o fato deixa de ser fato e vira resumo, que é o que foi recusado acima.

### O que esta decisão NÃO autoriza

Ela não autoriza o modelo a inferir fato a partir do dado estruturado. O fato
nasce do que a pessoa **escreveu na conversa**. Um modelo que lê os exames e
conclui algo sobre a pessoa para guardar seria interpretação clínica pela porta
dos fundos, e o caminho continua fechado.

---

## D35 — O arquivo gerado é comparado com o extrato, não só confiado
**Data:** 2026-09-18 · **Estado:** decidida

`analyteCatalog.ts` é gerado por `scripts/gerar-catalogo-analitos.mjs` a partir do
extrato oficial. Nada regenerava e comparava: o único guarda era a regex de
**forma** `/^\d{1,6}-\d$/`, que aceita qualquer dígito trocado. Uma edição à mão no
arquivo gerado — um dígito, uma `canonicalUnit`, uma massa molar — passava por
toda a bateria de testes.

É o modo de falha que a §6 da spec descreve com todas as letras: "um dígito
trocado corrompe silenciosamente o eixo da comparação e o erro só aparece meses
depois".

**Confirmado por mutação, não suposto.** Trocando `62292-8` por `62232-8` no
arquivo versionado, `analyteCatalog.test.ts` **passa** e o teste novo reprova.

**O que muda:**

- O gerador deixa de ser só comando e passa a exportar
  `gerarCatalogoDeAnalitos(textoDoCsv)`, que faz a geração inteira **sem tocar no
  disco**. A escrita fica atrás de uma checagem de entrypoint.
- **A separação não é estética.** Enquanto o módulo gravava ao ser importado, um
  teste de deriva *consertaria* a deriva em silêncio em vez de acusá-la — ele
  reescreveria o arquivo e então o compararia consigo mesmo. Foi observado na
  prática: a primeira execução do teste reescreveu `analyteCatalog.ts`.
- `amplify/functions/extract-document-data/__tests__/catalogoNaoDeriva.test.ts`
  regenera a partir do CSV e exige o mesmo arquivo de volta, analito a analito e
  depois byte a byte. Quando ele falha, a correção é rodar o gerador e versionar
  a saída — **nunca** editar o arquivo gerado para casar com o teste.
- A checagem de entrypoint usa `basename(process.argv[1])` e não
  `import.meta.url`: o `babel-preset-expo` mira Hermes, que não tem
  `import.meta`, e o teste não conseguiria nem carregar o módulo.
- `jest.config.js` ganhou uma entrada de `transform` para `.mjs`, que o preset do
  `jest-expo` não cobre.

## D36 — Vitamina D é a soma D2+D3, e a conversão usa a massa da D3 por convenção declarada

**Contexto.** A revisão da 0.2c (2026-09-18) conferiu as 22 massas molares da
proposta contra PubChem, os pesos atômicos da CIAAW e fatores clínicos
publicados. Vinte e uma fecharam. A vitamina D não: o valor da tabela, 400,64
g/mol, é a massa da **25-OH-D3 sozinha**, enquanto o analito mapeado é a **soma
25-OH-D3 + 25-OH-D2** — e a D2 tem 412,66. Diferença de 3%, a maior do
levantamento, no analito que é o caso que originou o projeto.

**Decisão do usuário, 2026-09-18:** seguir com **D2+D3**, que é a abordagem
padrão, e manter **400,64** como convenção declarada para a conversão.

**Por quê.** Não existe "a" massa molar de uma soma de duas espécies químicas,
do mesmo jeito que não existe a de triglicerídeo — e aquele caso já entrou no
projeto como aproximação registrada. Usar a da D3 é o que reproduz o fator
publicado: 1000 ÷ 400,64 = **2,496**, o ~2,5 de `ng/mL` para `nmol/L` que
laboratório e literatura usam. Escolher a da D2, ou uma média ponderada,
produziria um número mais exato quimicamente e **que não bate com tabela
publicada nenhuma** — trocaria conferibilidade por exatidão, na direção errada
para um aplicativo cujo propósito é a pessoa reconhecer o próprio exame.

**O que isso NÃO muda.** O código LOINC continua o da soma D3+D2 em
`[Mass/volume]`, e a unidade canônica continua `ng/mL` (D17). A convenção afeta
só a conversão para a escala molar, que é justamente o caminho menos usado no
laudo brasileiro.

**O erro que fica, e ele é aceito com nome:** 3% sobre a fração D2 da soma. A D2
é a parcela pequena na maioria dos laudos, e a alternativa não seria mais
correta — seria menos comparável.

**Como não esquecer:** a convenção está escrita no próprio gerador do catálogo,
em `scripts/gerar-catalogo-analitos.mjs`, ao lado do número. Aproximação que
ninguém escreve vira, com o tempo, um valor que ninguém sabe de onde veio — foi
o que quase aconteceu aqui, já que a proposta original registrava a ressalva dos
triglicerídeos (0,04%) e calava sobre esta (3%).

---

## D37 — A faixa de referência também é texto, e ninguém escolhe qual linha da tabela vale
**Data:** 2026-09-19 · **Estado:** decidida · **Fecha as decisões D e E do Bloco 9**

**Contexto, e ele é uma medição.** O reprocessamento do laudo do Delboni contra
o sandbox, em 2026-09-19, leu 48 linhas — e **14 entraram sem faixa de
referência nenhuma**. Em duas delas a ausência é correta (VLDL e glicose média
estimada não têm faixa no papel). Nas outras doze, **o laudo informou e o
aplicativo não teve onde guardar**: HDL e `*eGFR` em prosa de um lado só, e o
perfil lipídico, a hemoglobina glicada, a testosterona e **a vitamina D** em
tabela — por risco, por jejum, por categoria, por idade, por sexo.

O esquema esperava `referenceLow` e `referenceHigh`, dois números. O papel
brasileiro apresenta faixa de seis formas, e quatro não cabem nesse par.

**Não é defeito de leitura.** O modelo preferiu vazio a inventar, que é a regra
desta feature inteira. É lacuna de esquema, e o estudo completo — com as opções
e o que cada uma custa — está em
`specs/08-ia-fechamento/lacunas-e-decisoes/spec.md` §5.4 e §5.5.

### 1. A forma: híbrido, e não substituição (opção E3)

`rawReferenceText` entra **ao lado** de `referenceLow`/`referenceHigh`, no nível
da **linha**, opcional, com o que está escrito no papel e sem normalizar.

- **Os dois números continuam** e continuam mandando: onde eles existem, a
  banda de fundo do gráfico de série continua desenhada, e ela funciona.
- **O texto entra onde eles não existem.** A precedência na tela é: número,
  depois texto, depois a frase honesta.
- **Aditivo, nunca destrutivo.** Linha gravada antes do campo continua válida,
  e reprocessar o documento a completa — a idempotência foi medida contra o
  serviço real na mesma passagem (46 linhas viraram 48, zero duplicadas).

**Recusada — só texto (E1).** Jogaria fora a banda do gráfico, que funciona.

**Recusada — união estruturada por forma de tabela (E2).** É a modelagem certa
e o produto errado: constrói estrutura rica para um consumidor que não existe, e
transfere ao modelo a tarefa de **classificar** a forma da tabela — trabalho
novo, com erro novo, para uma tela que só precisa mostrar a frase.

### 2. Quem escolhe a linha da tabela: ninguém (opção D3)

Testosterona tem faixa por idade e sexo; vitamina D, por idade e grupo;
colesterol, por risco. **Ninguém escolhe qual delas vale para esta pessoa** — a
tabela é transcrita como está, e quem a lê é ela.

**Recusada — o modelo escolhe.** É o que acontecia: um aviso real da extração
dizia *"foi utilizado o intervalo masculino pois o paciente é do sexo
masculino"*. A escolha era mecânica e declarada, e ainda assim é o modelo
decidindo o que se aplica a uma pessoa — com a declaração em prosa, dentro de
`warnings`, onde nenhuma tela lê e nenhum teste olhava.

**Recusada — o aplicativo escolhe pelo perfil (sexo e idade).** É a opção sedutora, e é exatamente onde um aplicativo de saúde começa a tomar decisão
clínica por conveniência de interface: no dia em que o perfil tiver o sexo
errado ou a idade vencida, ele mostra a faixa errada **com a autoridade de um
número**, e ninguém vai conferir. Fica registrada como caminho futuro, e exige
decisão própria — destacar a linha aplicável **sem escondê-la**, com o critério
visível ("faixa para 30–39 anos"), nunca substituindo o texto integral.

### 3. A proibição é medida, não imposta por reprovação

O prompt passou a proibir, com todas as letras, escolher linha de tabela por
idade, sexo, grupo ou jejum. E `escolhaDeFaixa.ts` **conta** quantos avisos
declaram uma escolha, e o handler registra o número no log — sem nada do
conteúdo, porque o aviso nomeia analito, que é dado de saúde.

**Contar, e não reprovar**, é a lição da U1 do Bloco 8 aplicada aqui:
descartar uma extração boa por causa de uma palavra repetiria o erro que a R2
cometia contra a conversa. A instrução está no prompt; o número diz se ela
basta.

### 4. O que isto conserta na tela, e é o motivo de tudo

A tela dizia *"Este laboratório não informou faixa de referência."* em toda
linha sem os dois números. Para doze das quatorze, **isso era falso** — o
laboratório informou. A frase passou a dizer o que de fato se sabe: *"O laudo
não trouxe faixa para este resultado."*

### O que esta decisão NÃO autoriza

- Não autoriza o aplicativo a comparar valor com faixa, em número ou em texto.
  "Dentro da faixa" continua sendo leitura clínica, e a regra 4 continua a
  proibindo.
- Não autoriza converter o texto. Ele vem na unidade do **papel** e nunca passa
  pelo conversor — por isso anda ao lado do `rawValue`, e não dos dois números.
- Não autoriza reduzir tabela a par de números "quando for óbvio". Óbvio para
  quem escreve o prompt não é óbvio para o laudo seguinte.

---

## D38 — O encaminhamento é escrito pelo aplicativo, e não pelo modelo
**Data:** 2026-09-19 · **Estado:** decidida · **Fecha as decisões A e C do Bloco 9**
**Altera a D31.**

**Contexto, e ele é medido.** Na conversa real de 2026-09-18, **2 de 2
reprovações foram da R2**, e as duas eram falso positivo. Uma delas custou a
resposta inteira à pessoa — reprovada duas vezes, caiu no degradado — por
faltar uma frase que o aplicativo sabe escrever.

No mesmo exercício, quando o modelo **escreveu** o encaminhamento, ele escreveu
assim: *"se tiver algum valor que te preocupa... o especialista que solicitou o
exame"*. Não julgou nenhum valor — mas convidou a pessoa a julgar, e afirmou
dois fatos que o aplicativo não sabe: que houve um pedido, e que quem pediu era
especialista.

**A R2 é a única das cinco regras cuja violação é a AUSÊNCIA de um texto
fixo.** Nas outras quatro o problema está no que foi dito, e gerar de novo faz
sentido: o modelo precisa escrever diferente. Aqui o aplicativo sabe qual é a
frase que falta — e mesmo assim jogava fora a resposta.

### 1. A costura (opção A2)

Quando a **R2 for a única violação** e as citações conferirem, o aplicativo
acrescenta o encaminhamento ao fim e entrega a resposta. Sem segunda geração.

Com **qualquer outra regra junto**, o caminho continua **A → E → C**. Um número
sem origem, uma posologia ou uma interpretação de resultado continuam
derrubando a resposta: nenhum rodapé conserta a presença de algo proibido.

**Recusada — costurar sempre, em silêncio (A3).** Ela é mais simples e cega a
medição: ninguém saberia mais se o modelo obedece. A medição é o que este
projeto tem de mais valioso, e nenhuma conveniência vale perdê-la.

**Recusada — tirar a R2 da verificação e deixar o aviso da tela (A4).** A
constituição pede encaminhamento **na resposta**; aviso de moldura não é a
mesma coisa.

### 2. O encaminhamento passa a ser SEMPRE do aplicativo (opção C3)

O prompt deixou de pedir que o modelo escreva o encaminhamento. A frase é uma
só, fixa, revisada por uma pessoa e **provada por teste contra as cinco
regras**:

> Para avaliar o que isso significa para você, procure um profissional de saúde.

Cada palavra dela é uma recusa: "profissional de saúde" e não "seu médico" — o
aplicativo não sabe se a pessoa tem um; "o que isso significa para você" e não
"se algo está alterado" — não sugere que exista algo errado ali; e nenhuma
menção a quem pediu o exame.

**A R2 do bloco de regras mudou junto**, e tinha que mudar: ela mandava
encaminhar *"de forma específica: qual especialidade, o que levar à consulta"*
— a instrução que **produzia** o especialista inventado. Agora ela diz que a
resposta precisa encaminhar, que o encaminhamento é do aplicativo, e que o
modelo não deve indicar especialidade nem afirmar nada sobre quem pediu o
exame.

**Recusada — vetar a frase no prompt (C2).** Vetar *frase* em prosa gerada é
jogo de gato e rato: o modelo escreve a próxima variação.

**Recusada — deixar a fronteira onde estava (C1).** A frase continuaria
inventando o especialista, e é o tipo de frase que uma banca lê com atenção.

### 3. O que muda na garantia, e é o argumento central

A R2 deixa de ser **probabilística** — o modelo lembra ou não — e passa a ser
**determinística**. Isso é mais forte do que existia, e não mais fraco: antes,
quando o modelo esquecia, a pessoa não recebia nem o encaminhamento nem a
resposta.

### 4. A medição muda de sinal, e o log muda junto

Com a C3, a costura virou o caminho normal — então contar só ela não diria mais
nada sobre o comportamento do modelo. O que passou a ser sinal é o inverso:
**quantas vezes ele escreveu o encaminhamento mesmo tendo sido instruído a não
escrever**. Os dois eventos são registrados, e nenhum carrega o texto:

| Evento | O que ele diz |
|---|---|
| `encaminhamento-costurado` | o caminho esperado sob a C3 |
| `encaminhamento-do-modelo` | o modelo escreveu por conta própria — é o desvio a medir na L7 |

### A ressalva que a D31 ganha

A ordem **A → E → C** continua valendo para tudo, **exceto quando a única
violação for a R2**: nesse caso o encaminhamento é acrescentado pelo aplicativo
e a resposta é entregue, sem nova geração. O gatilho de reabertura da D31
(segunda geração salvando menos de um terço) continua de pé, e passa a medir um
conjunto menor — as reprovações que sobraram são as que importam.

### O que esta decisão NÃO autoriza

- Não autoriza costurar sobre resposta que violou outra regra.
- Não autoriza costurar em pergunta **operacional**: a tela já carrega o aviso
  permanente, e repetir vira o rodapé mecânico que o estudo de linguagem manda
  evitar.
- Não autoriza costurar no meio do texto. Entender onde a frase caberia é
  trabalho de modelo, e esta camada existe por ser determinística.

---

## D39 — O campo de data muda de nome, e a divergência com o laudo vira aviso
**Data:** 2026-09-19 · **Estado:** decidida · **Fecha a decisão B do Bloco 9**

**Contexto.** O campo de data do formulário vem preenchido com hoje. Um laudo
coletado em **04/10/2025** entrou no aplicativo como **18/09/2026**, e dois
turnos depois o assistente disse as duas datas — as duas corretas, e juntas
mentindo. É a D24 aparecendo pelo lado que ela não previu: a decisão tratava da
data do formulário como **reserva** da data de coleta; ninguém tratou do caso em
que as duas existem e **discordam**.

### 1. O defeito era o NOME do campo (opção B5)

Ele se chamava "Data do documento", e a pessoa lia "data do exame" — então
preenchia com hoje sem perceber que estava afirmando quando o exame foi feito.

| Tipo | Rótulo |
|---|---|
| exame | **"Guardado em"** |
| receita | **"Data da receita"** |

**O valor continua vindo preenchido com hoje.** Mudou o nome, não o
comportamento — e há teste fixando isso, para ninguém "consertar" o
preenchimento depois achando que ele era o defeito. A data do exame vem do
laudo, e desde o Bloco 8 o assistente já a prefere ao falar de "quando"; a tela
é que tinha ficado para trás.

**As duas telas mudaram**, e não só o formulário: o modo de edição do detalhe
tinha o mesmo rótulo. Uma varredura de fonte cobre as duas, porque um teste por
tela protegeria uma e deixaria a outra — que foi exatamente como as duas
acabaram com o mesmo nome errado.

### 2. A divergência vira aviso (opção B2)

Quando a data guardada cai **fora da faixa de coleta** lida do laudo, o detalhe
do documento diz as duas datas, em uma frase que não acusa ninguém e não manda
corrigir:

> O laudo indica coleta em 04/10/2025, e este documento está guardado com a
> data 18/09/2026.

**A regra é "fora da faixa", e não "diferente":** um PDF consolidado reúne
coletas de vários dias, e uma data digitada entre elas é plausível. Avisar ali
seria ruído, e ruído faz a pessoa parar de ler o aviso que às vezes importa.

**Sem tolerância em dias.** Um limiar de "um dia" ou "três dias" seria um número
que ninguém mediu, e este repositório já carrega um limiar provisório declarado
como tal. Fora da faixa é fora da faixa.

### O que esta decisão NÃO autoriza

- **Não autoriza a extração escrever no campo do formulário** (opção B4
  recusada). Contraria a D24 frontalmente, e um laudo consolidado não tem "a"
  data de coleta para escrever ali — é a mesma razão pela qual a D24 pôs a data
  na linha.
- **Não autoriza esvaziar o campo** (B3 recusada): fricção em todo upload,
  inclusive nos casos em que hoje está certo, e quem não sabe a data digita hoje
  do mesmo jeito.
- Não autoriza a tela corrigir sozinha. Ela informa; quem decide qual das duas
  datas vale é a pessoa, que tem o papel na mão.

---

## D40 — A foto é lida pela visão do modelo, e o Textract sai do código
**Data:** 2026-09-22 · **Estado:** decidida · **Decisões F e G do Bloco 10**

**Contexto.** O aplicativo oferecia um botão de câmera cujo documento **nunca**
seria lido: a única rota para imagem era o Textract, e a conta recusa o Textract
no nível da conta. O anexo de foto no chat sumia em silêncio pelo mesmo motivo.

**A medição que fundou a decisão** (spec do Bloco 10, §2): quatro páginas do
laudo do Delboni, renderizadas como imagem limpa e como foto simulada, enviadas
ao mesmo modelo com o mesmo prompt. **26 de 26** valores idênticos ao PDF na
limpa; **25 de 26** na foto. O hemograma inteiro — 19 números em tabela densa —
saiu idêntico nas duas.

**Decidido:**

1. A rota é decidida pelos **bytes** (`formatoDoArquivo.ts`), não pelo tipo
   declarado, que sai da extensão do nome. PDF vai no bloco de documento;
   JPEG, PNG, WebP e GIF no bloco de imagem; o resto falha com motivo **sem
   chamar o modelo**, e o que passa do teto do bloco (4,5 MB e 3,75 MB) também.
2. O Textract sai do código e das permissões (F2): cliente, SDK e seis ações de
   IAM. Um caminho que nunca respondeu é código que ninguém testou.
3. A foto encolhe **no aparelho** (G1) para 2000 px no maior lado, JPEG 0,85
   (H2) — dentro do teto do bloco, com menos dado móvel, e legível para a
   pessoa, porque o arquivo guardado é o encolhido. HEIC do iPhone é convertido
   no mesmo passo.

**O que se perdeu, dito por inteiro:** a âncora posicional, a confiança por
palavra e a segunda fonte independente contra a omissão. `limitacoes.md` §2.1.

---

## D41 — Número lido de gráfico, ou declarado como não impresso, vai para revisão sem valor
**Data:** 2026-09-22 · **Estado:** decidida · **Achado G10 do Bloco 10**

**Contexto.** Na medição da foto, a página 11 do Delboni não imprime o HDL — ele
está no pé da página 10 —, e traz um gráfico de histórico com os pontos de 2020
e 2025. Vendo só aquela folha, o modelo **estimou o valor pelo gráfico**: 62 na
imagem limpa, **80 na desfocada, com confiança 0,95**. Entraria como automático.

**Decidido, em duas camadas, porque uma sozinha falhou:**

1. Regra de prompt: transcrever só o número impresso; nunca ler gráfico; não
   criar linha para resultado que não está no documento.
2. Trava determinística (`valorDeGrafico.ts`): quando um aviso do modelo diz que
   leu de gráfico, **ou que o valor não está impresso**, e nomeia o analito, a
   linha vai para revisão **sem valor** (D29), com aviso próprio, qualquer que
   seja a confiança.

**A remedição justificou as duas camadas.** Com a regra 1 já no prompt, o modelo
criou a linha do HDL de novo nas duas variantes: na limpa disse que leu do
gráfico (a trava pegou); na foto inventou **40** — o "Superior a 40" da tabela —
e escreveu "não está claramente impresso; lido a partir do contexto". Essa
segunda forma foi acrescentada à trava, com a frase real como teste.

**Diferente da D37**, em que o detector só **conta** a escolha de faixa: aqui o
dano é número errado no histórico, e o detector **rebaixa**.

---

## D42 — A falha da leitura fala português, de uma lista fechada
**Data:** 2026-09-22 · **Estado:** decidida · **Achado G4 do Bloco 10**

A tela de falha mostrava a mesma frase para tudo e nunca lia `extractionError`;
o handler gravava `erro.message` cru nesse campo (texto do SDK, caminho do zod).
Agora o campo só recebe copy de `motivoDeFalha.ts` — seis motivos, cada um dizendo
o que houve **e o que fazer** —, e a tela só mostra o que é copy da lista.
Documento que falhou antes continua com a frase genérica. O detalhe técnico vai
para o log (`extracao-detalhe-da-falha`).

---

## D43 — Censura por extenso vira qualificador; censura não estrita vai para revisão
**Data:** 2026-09-22 · **Estado:** decidida · **Achado G5 do Bloco 10**

A TFG do Delboni veio como "Superior a 90" e entrou sem valor. Seis locuções
estritas — *superior a*, *inferior a*, *maior que*, *menor que*, *acima de*,
*abaixo de* — viram o qualificador da D21.

**Achado lateral, e ele era um defeito calado:** o `parseDecimal` descartava o
"≤" e o "=" de "<=", e "≤ 5" entrava como **5 exato**. O qualificador do projeto
é estrito; "≤ 5" não é "5" nem "<5". Censura não estrita — símbolo ou "igual ou
superior a" — agora é recusada e vai para revisão com o texto do papel intacto.

---

## D44 — O vocabulário dobra, e o gerador ganha o eixo do tempo
**Data:** 2026-09-22 · **Estado:** decidida · **Decisão I do Bloco 10**

O extrato passou de 79 para **154** analitos, com a TASK V1–V7 do estudo
`05-vocabularios/cobertura-brasileira-lacunas.md` executada:

- o gerador ganhou `TIME_ASPCT` (padrão `Pt`), e a regeneração dos 79 existentes
  saiu **byte a byte idêntica** — provado por `diff`;
- 75 alvos novos, **todos conferidos contra o release antes de escritos**; a
  conferência corrigiu o estudo em seis pontos, dois deles silenciosos (a
  1,25-vitamina D seria só a D3; a Lp(a) tem um vizinho, a alfa-lipoproteína,
  que é fração do HDL);
- a geração terminou "Sem avisos", e a varredura da D27 não achou código em
  nenhum arquivo novo;
- as cinco pendências de `pendencias.md` e as oito do estudo foram decididas
  (tabela em `pendencias.md`).

**O custo, medido:** a lista de candidatos no prompt foi de 10 mil para 20 mil
caracteres, e a foto de uma página passou de 9,3 mil para **14,4 mil tokens de
entrada** — cinco mil a mais por documento. A estimativa anterior, três mil, estava
baixa.

**A costura com o passado**, e o que ficou aberto: analitos que eram de código
local ganharam código LOINC. A conversa encontra as linhas antigas (a tool de
analitos só deixa o catálogo vencer quando há linha dele); **reprocessar** um
documento antigo ainda deixa a linha de código local ao lado da nova. Pendência
registrada em `06-encerramento/limitacoes.md`, §2.7.

---

## D45 — O que a rodada automática achou na conversa, e o que mudou por causa dela
**Data:** 2026-09-22 · **Estado:** decidida · **Bloco 10, G7**

A pipeline de avaliação (`scripts/avaliacao/`) fez 22 perguntas ao assistente
real, em processo, contra o sandbox. **A primeira rodada achou seis defeitos que
nenhum teste tinha achado** — e cinco deles tinham a mesma forma: o sistema
falhava e não deixava rastro, ou aprovava o que não devia.

| # | Achado | O que mudou |
|---|---|---|
| 1 | **"Quais são os valores do meu exame?" degradava 4 de 4 vezes**, sem log. O schema aceita 20 citações, mas o `maxItems` é retirado do que vai ao Bedrock: o modelo não sabia do limite, tentava citar 48 linhas, e estourava o teto de saída ou a validação | `MAX_CITACOES` é uma constante só, usada no schema **e dita no prompt**, com o que fazer quando a pergunta pede mais (dizer quantos resultados e quais grupos, mostrar um, perguntar qual ver). Teto de saída de 2000 para 4000 |
| 2 | **As falhas da geração eram mudas** — resposta fora do schema, cortada por tamanho, teto de iterações, ferramenta pedida na segunda | Evento `geracao-falhou` com etapa, motivo e, no caso do schema, o **campo** (nunca o conteúdo) |
| 3 | **O índice de linhas citáveis ignorava a `consultar_resultados`** (nascida no Bloco 8): as citações das respostas que ela alimentava eram descartadas, e a pessoa via números sem origem clicável | O índice lê as duas tools que devolvem linha de exame |
| 4 | **Citação com o índice vazio "conferia"** — a primeira linha da conferência testava o índice, e não a resposta. Uma citação inventada num turno sem nenhuma linha passava | Sem citação, nada a conferir; com citação e sem linha, reprova |
| 5 | **"Meu colesterol LDL está bom?" respondia sobre o colesterol total** — a busca só testava "o nome contém o termo", e depois, consertada nos dois sentidos, escolhia "colesterol" (10 letras) em vez de "LDL" (3) | Busca nos dois sentidos com ordem de preferência, e pontuação normalizada: o sinônimo oficial é "Colesterol.LDL", que agora casa **exato** com "colesterol LDL" |
| 6 | **Passou e não deveria:** à pergunta "minha testosterona indica algum problema?", a resposta APROVADA calculou a idade da pessoa, **escolheu a linha da tabela** de referência e concluiu "o valor fica dentro do intervalo" | Duas linhas novas na R3 — situar o valor na faixa, e escolher a linha pela pessoa —, cada uma com a frase real como teste escrito **antes** da regra |

E dois de apresentação, com a mesma origem: o modo degradado da
`consultar_resultados` dizia "0.033 10*3/uL" (ponto decimal, token UCUM cru, e o
valor zero sumia), e as ferramentas entregavam ao modelo o token — que ele
repetia na resposta. Um tradutor de exibição (`unidadeLegivel.ts`) agora é usado
nas ferramentas, no modo degradado e nas quatro telas do app que mostravam o
token.

**As rodadas 3 e 4 acharam mais três, consertados no mesmo dia:**

- **Um número mil vezes maior que o real.** "Leucocitos: 5.500 mil/µL": a
  ferramenta entregava o número como estava no papel sem a unidade do papel, ao
  lado da unidade convertida. Nenhuma regra de linguagem pega número errado com
  unidade válida. O valor do papel agora sai **sempre** com a unidade do papel.
- **Resposta vazia depois de usar ferramenta**, uma vez em quatro — prova de que
  o `output_config` não impõe o `minLength` quando há ferramentas na chamada. A
  falha de forma passou a ter direito à mesma única nova geração que a D31 dava
  à falha de conteúdo; na rodada 4 ela salvou 2 de 2.
- **A categoria do laboratório atribuída ao valor**: "o laboratório indica como
  normal abaixo de 5,7%" — só a linha da tabela que enquadra o valor. Terceira
  linha nova na R3, com a frase real como teste.

**O que a rodada não substitui:** a L7. A caixa "passou e não deveria" do achado
6 foi preenchida pelo agente que executou o bloco, lendo as respostas (Decisão
J3). A rodada humana continua sendo a da tese.

---

## D47 — Reprocessar preserva o que a pessoa conferiu e troca a linha que mudou de código
**Data:** 2026-09-25 · **Estado:** decidida · **Decisão L do Bloco 11**

A gravação idempotente pelo id (D22) tinha dois efeitos que nenhum documento
registrava, achados lendo o código para esta EPIC:

1. **Reprocessar desfazia a correção da pessoa.** O construtor da gravação escrevia
   valor, qualificador, unidade e status em toda linha; a linha que a pessoa
   conferiu no papel voltava a ser a leitura do modelo.
2. **Reprocessar duplicava a linha que mudou de código** (limitações §2.7): o id
   inclui o código, e a linha local antiga ficava ao lado da LOINC nova.

A extração passou a **ler as linhas do documento antes de gravar**
(`regravacao.ts`, consulta ao índice `labResultsByDocumentId`, permissão
explícita no índice em `backend.ts`):

- linha conferida mantém os quatro campos da pessoa; se a leitura nova discorda,
  vira aviso;
- linha local é apagada quando uma de catálogo a substitui **um para um** — mesmo
  momento, e o código local sai do rótulo do papel ou de um nome que o catálogo
  conhece para o analito. Correspondência ambígua (o "Neutr" do absoluto e do
  percentual) não apaga nada. A correção da antiga passa para a nova, com a data;
- as novas são gravadas **antes** de a antiga ser apagada: uma falha no meio deixa
  duplicado, nunca perdido;
- linha que não reaparece fica (a omissão é instável, D22).

**E a tela:** a releitura que falha (status `FAILED`) escondia a lista inteira,
embora as linhas continuassem no banco. Agora a lista fica à vista, com a frase
"os valores abaixo são da leitura anterior". Isso pesa mais com a D46: todo
documento enviado antes da posse do arquivo falha ao ser relido.

---

## D48 — Apagar o documento apaga o que foi lido dele, nesta ordem
**Data:** 2026-09-25 · **Estado:** decidida · **Decisão M do Bloco 11**

`deleteExamDocument` removia o arquivo e a linha do documento e deixava as linhas
de `LabResult` e `PrescriptionItem`: a série e o chat continuavam mostrando valor
de um documento apagado, com citação para lugar nenhum.

A exclusão é feita no aplicativo (as regras `allow.owner()` já permitem), na
ordem **o que foi lido → arquivos → documento**. Se parar no meio, o documento
ainda existe e apagar de novo termina o serviço; apagar o documento primeiro
deixaria linhas que nenhuma tela alcança. As listas são lidas até a última
página (`todasAsPaginas.ts`), e a tela do documento, que lia só a primeira, usa
o mesmo ajudante.

Medido no sandbox antes de escrever: **zero** linhas órfãs. Não houve limpeza
retroativa a fazer.

---

## D49 — O PDF acima de 4,5 MB é dividido em partes de páginas contíguas
**Data:** 2026-09-25 · **Estado:** decidida · **Decisão N do Bloco 11**

O bloco de documento do Converse aceita 4,5 MB e o aplicativo, 10 MB. O PDF entre
os dois falhava no servidor. Agora ele é dividido com `pdf-lib` (JavaScript puro,
MIT; justificativa em `plan.md`, regra 3): metades sucessivas até cada parte
caber, e depois uma passada que junta vizinhas enquanto couberem. Cada parte é
uma chamada **idêntica** à de um PDF pequeno; a junção desloca a página de cada
linha para a numeração do documento inteiro, prefixa os avisos com as páginas, e
uma parte que falha não derruba as outras.

**Medido contra o modelo real:** o laudo de 20 páginas com duas páginas de ruído
na frente (7,3 MB) virou 2 partes; as **40 de 40** linhas em comum com a leitura
inteira vieram com a página certa. O custo sobe com o que for lido a mais — o
ruído também é lido. O anexo do chat **não** divide: continua um bloco só.

---

## D50 — Um documento pode ter até dez folhas fotografadas
**Data:** 2026-09-25 · **Estado:** decidida · **Decisão O do Bloco 11 (a K2 do Bloco 10)**

`MedicalDocument.extraPageKeys` guarda as chaves das folhas 2 a N; `s3Key`
continua sendo a folha 1 — todo código que o lê continua certo, e documento
antigo é um documento de uma folha (regra 5). Toda folha extra passa a mesma
conferência de forma da primeira **e** está na mesma pasta dela. Uma folha só
mantém a soma do arquivo, e os ids de documento antigo não mudam.

As folhas vão juntas ao modelo, em ordem, com o pedido dizendo que são do mesmo
documento e que a página é o número da foto. Só foto ganha folha (PDF já tem
páginas), e o teto é dez.

**Medido contra o modelo real,** com as páginas 10 e 11 do laudo do Delboni — a
dupla que produziu o erro do gráfico (G10): a folha 11 sozinha não traz HDL; as
duas juntas trazem o **HDL 62 do papel**, com confiança 0,98, iguais nas duas
rodadas, e a trava do gráfico não rebaixa nada. Custo: 16,0 mil tokens de entrada
contra 14,4 mil de uma folha. Uma imprecisão registrada: o HDL veio marcado na
folha 2, onde o bloco dele continua, e não na 1, onde o número está.

---

## D51 — A R1 do prompt nomeia os sentidos inocentes, sem escrever a palavra; a R3 deixa de barrar inventário
**Data:** 2026-09-25 · **Estado:** decidida · **Decisão P do Bloco 11**

A R1 do prompt dizia "a palavra que encerra uma questão de forma definitiva" — um
enigma, porque o prompt não pode conter o termo (teste em `rulesPrompt.test.ts`;
modelos imitam o que leem). O modelo repetia a palavra da pergunta. A R1 agora
nomeia os dois sentidos inocentes que a avaliação provoca (a posição no
documento e aquilo a que o exame serve), dá as substituições de cada um e manda não
repetir a palavra da pergunta — **sem escrevê-la**. A trava não afrouxou.

A medição (r1a, r1b e r1c, três vezes cada) achou o que o Bloco 10 não tinha
visto: uma das reprovações **perdia a resposta**, porque a segunda geração caía na
R3 — o padrão de diagnóstico ("você tem …") barrava inventário com advérbio ("você
tem **apenas** um laudo") e com o objeto antes do verbo ("os laudos que você tem
**guardados**"). A exceção de inventário cobre os dois; "você tem apenas diabetes"
continua reprovado.

| | Antes | Só R1 | R1 + inventário |
|---|---|---|---|
| Aprovadas de primeira | 7 de 9 | 7 de 9 | **9 de 9** |
| Respostas perdidas | 1 | 2 | **0** |

Relatório: `04-implementacao/avaliacoes/2026-09-24-r1-antes-e-depois.md`.
