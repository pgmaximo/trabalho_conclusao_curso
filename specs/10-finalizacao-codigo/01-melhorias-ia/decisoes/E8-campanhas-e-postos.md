# Decisões do E8 — Campanhas e postos de vacinação no chat

Épico: [E8 no PRD](../prd.md) · Ordem de entrega: 2º · Três decisões: D8.1, D8.2 e D8.3

## O que o código faz hoje (verificado)

- **Campanhas:** `getVaccinationCampaigns(uf, codigoMunicipio)` consulta o PNI e guarda o resultado em `VaccinationCampaignCache`, **chave `uf`** (ou `NACIONAL`), com `payload` e `expiresAt` (epoch em segundos). A contagem de doses é amostral e o resultado traz `dataAsOf` e um aviso de amostragem.
- **Postos:** `getVaccinationSites(codigoMunicipio, latitude, longitude)` consulta o CNES e guarda em `VaccinationSiteCache`, **chave `codigoMunicipio`** (código IBGE), TTL de cerca de 7 dias. A distância (`distanciaKm`) só existe com a coordenada do aparelho.
- Os dois caches são **globais** (sem dono). A leitura é por chave, sem Scan. O cache só é preenchido quando alguém abre a tela de vacinação, então pode estar vazio.
- O **perfil do usuário não guarda UF nem município.** Quem resolve isso é `locationService` no aparelho: GPS, geocodificação reversa e busca do código IBGE em API pública do Ministério da Saúde. O usuário também pode escolher a cidade manualmente na tela.
- O chat hoje só lê tabelas filtrando por dono (`lerDoDono`) e não conhece essas duas tabelas.

---

## D8.1 — Como o chat descobre o município do usuário

**O que decidir:** para `consultar_postos`, de onde vem o `codigoMunicipio`.

### Opção A — O app envia o município no corpo de cada turno *(recomendada)*

O app já resolve `codigoMunicipio` para a tela de vacinação. Passa a mandar esse valor como campo **opcional** do pedido ao chat (7 dígitos, validado). Só é enviado se o usuário já tiver concedido localização ou escolhido a cidade.

**Benefícios**
- Usa um dado que o app já tem. Nenhuma tabela de municípios nova.
- Funciona na hora, sem o usuário digitar nada.
- Sem município, a ferramenta diz isso e orienta, sem chutar.

**Malefícios**
- Muda o contrato do pedido ao chat (um campo novo). É aditivo e opcional, mas toca o cliente e a função.
- O valor vem do cliente. Como serve só de **chave de leitura de dado público** e não afeta nenhum dado do usuário, o risco é baixo; a função valida o formato.
- Envia a cidade do usuário ao backend a cada turno (localização aproximada, não coordenada). Precisa de coerência com a copy de LGPD da tela.

### Opção B — O usuário diz a cidade na conversa e a ferramenta resolve o código

**Benefícios**
- Nenhuma mudança no contrato nem envio automático de localização; privacidade mais forte.

**Malefícios**
- O app **não tem** tabela de municípios (só `estadosBrasileiros.ts`, com UFs). Seria preciso embutir uma (cerca de 5.500 itens) ou chamar a API do Ministério da Saúde de dentro do chat, o que é fonte externa nova no chat.
- Nomes ambíguos e com acento ("São Domingos" existe em vários estados) geram erro ou perguntas extras.
- Mais atrito para o usuário.

### Opção C — Postos ficam só na tela; o chat orienta a abrir a tela de vacinação

**Benefícios**
- Zero risco novo; já funciona com localização e distância.

**Malefícios**
- Não entrega "onde me vacinar" no chat. As campanhas (D8.2) continuariam possíveis sem localização.

### Recomendação: **Opção A**

**Motivo:** é a única que dá resposta na hora, sem tabela nova e sem fonte externa nova. O custo é um campo opcional no pedido, e o dado enviado só aponta para informação pública. A opção B parece mais privada, mas empurra uma tabela grande para dentro do app ou uma chamada externa para dentro do chat.

**Decisão:** **Opção A** (produto, 2026-10-17). Complemento verificado no código antes da decisão: o app já guarda **UF e código do município** juntos no aparelho (`loadCachedLocation`, em `src/services/locationService.ts`, AsyncStorage). O app envia os dois, ambos opcionais; a UF também serve de chave para `consultar_campanhas`, então as campanhas saem da região certa sem o usuário dizer o estado.

---

## D8.2 — O que o chat faz quando o cache de campanhas ou de postos está vazio

**O que decidir:** o cache pode estar vazio (ninguém abriu a tela daquela UF ou município nos últimos dias).

### Opção A — Só ler o cache; vazio vira "sem dado" e orienta a abrir a tela de vacinação *(recomendada)*

**Benefícios**
- Chat sem chamada externa: resposta rápida e previsível, sem estourar o limite de iterações.
- Sem fonte externa nova no chat; a tela continua sendo quem busca e alimenta o cache.

**Malefícios**
- Resposta menos útil quando o cache está frio ("abra a tela de vacinação para atualizar").
- A utilidade do chat depende de alguém ter aberto a tela antes (o próprio usuário, na maioria dos casos, já que o app é de uso individual).

### Opção B — Cache vazio faz o chat invocar a Lambda de campanhas ou de postos

**Benefícios**
- Resposta completa sempre.

**Malefícios**
- Chamadas externas (PNI e CNES) dentro do turno, com teto de 30 s da outra função, somadas ao laço do chat.
- Mesmos problemas da opção B do E7: função chamando função, identidade em evento de resolver, dependência entre stacks.
- A Lambda grava no cache; o chat passaria a causar escrita indireta, contra o princípio de que o chat só lê.

### Recomendação: **Opção A**

**Motivo:** mantém o chat somente leitura e rápido. O custo (resposta menos completa com cache frio) é pequeno e honesto, e pode ser reavaliado depois de medir com que frequência o cache está vazio.

**Decisão:** **Opção A** (produto, 2026-10-17).

---

## D8.3 — Como o chat lê uma tabela que não tem dono

**O que decidir:** `lerDoDono` é a **única porta de leitura** do chat e filtra por dono, de propósito. Os caches de vacinação são públicos e não têm dono, então não cabem nela.

### Opção A — Uma segunda função de leitura, separada, só para dado público por chave *(recomendada)*

Ex.: `lerPublicoPorChave(tabela, chave)`, em `ownerScopedRead.ts`, com `GetItem`, uma lista fechada de tabelas permitidas e comentário explicando a exceção. `lerDoDono` não muda.

**Benefícios**
- A garantia "uma ferramenta nunca monta consulta com dono vindo da entrada" continua valendo para tudo que é dado pessoal.
- A exceção fica explícita, pequena e testável (um teste afirma que só as duas tabelas públicas passam por ela).

**Malefícios**
- Cria uma segunda porta de leitura; quem adicionar ferramenta no futuro precisa saber qual usar. Mitigação: lista fechada de tabelas e teste.

### Opção B — Relaxar `lerDoDono` com um parâmetro "sem filtro de dono"

**Benefícios**
- Uma porta só.

**Malefícios**
- Enfraquece a garantia central de privacidade: um parâmetro errado vira vazamento de dado de outro usuário. É exatamente o tipo de erro que a porta única existe para impedir.

### Recomendação: **Opção A**

**Motivo:** o projeto escolheu a porta única justamente para que erro de dono seja impossível. Uma exceção separada, com lista fechada, preserva isso.

**Decisão:** **Opção A** (produto, 2026-10-17).

---

## Decisões que nasceram na especificação (2026-10-17)

Duas questões apareceram ao ler o código para escrever a `spec.md` do épico (`../E8-campanhas-e-postos/spec.md`, seção 2) e foram levadas ao produto no portão da spec.

### P1 — De onde vem a lista de campanhas no chat

**Achado:** a lista de campanhas ativas não vem do PNI. Ela é um calendário curado em código (`get-vaccination-campaigns/campaignCalendar.ts`, `getCampanhasAtivas`), nacional e igual para todas as UFs. O PNI e o `VaccinationCampaignCache` só acrescentam uma contagem amostral de doses (`dosesNoPeriodo`), que conta todas as vacinas da amostra e não deve ir ao chat.

- **Opção A — usar o calendário direto (recomendada):** mesma função da tela, sem I/O, nunca "cache vazio"; o cache de campanhas não entra no chat.
- **Opção B — ler o cache, como o PRD dizia:** com cache frio, o chat diria "não sei" sobre algo que o app sabe sem rede.

**Decisão:** **Opção A** (produto, 2026-10-17). Efeito: D8.2 e D8.3 passam a valer só para os postos; a lista fechada da porta pública tem uma tabela (o cache de postos).

### D8.4 — Reforço da verificação contra indicação individual de vacina

**Achado (sonda com `checkLanguageRules`):** numa resposta operacional passam hoje "Você deve tomar a vacina da gripe", "Você precisa se vacinar", "Tome a vacina", "Recomendo que você se vacine" e "A vacina é segura para você". O reforço da D7.3 cobre exame, não vacina.

- **Opção A — reforçar a R3 (recomendada):** padrão novo de indicação individual de vacina, com testes de que respostas normais continuam passando.
- **Opção B — só no prompt:** teste confere o texto do prompt; lacuna registrada.

**Decisão:** **Opção A** (produto, 2026-10-17).

---

## Efeito no PRD de cada escolha

| Escolha | Efeito |
|---|---|
| D8.1 = A | 8.2 ganha uma sub-tarefa de cliente: enviar `codigoMunicipio` opcional. O contrato do pedido (`types.ts`, `chatSchema.ts`) muda de forma aditiva. |
| D8.1 = B | 8.2 passa a depender de uma tabela de municípios ou de fonte externa nova; esforço sobe. |
| D8.1 = C | Fica só 8.1 (campanhas); 8.2 sai do escopo e vira um parágrafo no prompt. |
| D8.2 = B | Cada ferramenta ganha chamada à Lambda, com os riscos acima; exige revisão de segurança. |
| D8.3 = A | Acrescenta uma sub-tarefa em 8.1: `lerPublicoPorChave` com teste de lista fechada. |
