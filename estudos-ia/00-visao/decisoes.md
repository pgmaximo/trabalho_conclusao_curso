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
**Data:** 2026-09-15 · **Estado:** proposta, aguarda aceite

O requisito é a IA enxergar o histórico do usuário, o que exige leitura no
servidor. A spec da tela deixou a escolha em aberto de propósito.

**Contrapartida:** conversa sobre saúde vira dado persistido, o que traz
retenção e exclusão para dentro do escopo.

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
