# Site da feira: visual novo e pesquisa de opinião

Data: 2026-10-24. Estado: rascunho para aprovação do Pedro.

## 1. Intenção

O QR code impresso para a feira leva a `baixar.html`, a página de download do APK. Hoje ela só entrega o arquivo. O grupo quer duas coisas a mais:

1. Que o site tenha a cara do app SuaSaúde (hoje é uma página genérica em system-ui).
2. Que o visitante possa responder uma pesquisa curta, para o grupo entender **se o produto é viável e quem é o cliente**.

A pergunta de fundo do TCC é: existe uma pessoa que usaria o SuaSaúde de forma recorrente, e quem é ela? A pesquisa existe para responder isso com dados, e não por impressão. O visitante típico é leigo, está em pé numa feira, com o celular na mão, e tem poucos minutos.

## 2. Objetivos, não objetivos e anti-objetivos

**Objetivos**
- O visitante consegue baixar o app em um toque, sem passar pela pesquisa.
- O visitante consegue responder a pesquisa em cerca de 1 minuto, só tocando.
- O grupo consegue ver as respostas depois, sem login na AWS e sem ferramenta técnica.
- Todas as páginas do site passam a ter a identidade visual do app.

**Não objetivos**
- Não é uma pesquisa estatisticamente válida. Com dezenas de respostas os números são indicativos. O TCC deve dizer isso.
- Não é analytics de tráfego (sem Google Analytics, sem cookies, sem rastreio de visitas).
- Não muda o app, o backend do app nem o texto dos Termos e da Política.
- Não abre o app ao público (decisão de 2026-09-24).

**Anti-objetivos (seria falha mesmo que "funcione")**
- Pedir nome, e-mail, telefone ou qualquer dado que identifique a pessoa.
- Obrigar a responder a pesquisa para baixar, ou baixar para responder.
- Montar telas falsas do app com blocos de HTML em vez de prints reais.
- Quebrar os endereços `privacidade.html` e `termos.html` (cadastrados no Google).
- Pergunta de preço com valor em reais, que ancora uma decisão que o grupo ainda não tomou.

## 3. Decisões já tomadas pelo Pedro

- Fazer a pesquisa e melhorar o site, nessa ordem de trabalho: brainstorm, plano, só então código.
- Perguntas respondidas com escala do tipo "Não muito, Pouco, Não sei, Usaria, Usaria muito", mais idade, opinião geral, uso recorrente e funcionalidades que chamaram atenção.
- Os dados ficam na AWS e o grupo os visita depois, de forma simples.
- O download fica **nos dois lugares**: na tela inicial e no fim da pesquisa.
- Pergunta sobre pagamento: o modelo de lucro ainda não existe, então a pergunta não pode falar em valores (ver 5.1, pergunta `modelo`). Anúncios e venda de dados **não aparecem** para o visitante em lugar nenhum da pesquisa (confirmado em 2026-10-24).
- **Sem telas de reação por funcionalidade** (2026-10-24): o grupo apresenta o app pessoalmente e o visitante só abre o QR code depois. A pesquisa tem 11 telas e não mostra as funcionalidades. Os prints do app se resumem a um print no hero de `baixar.html`, coletado pelo Claude (seção 6.4).
- A senha do painel `resultados.html` foi definida pelo Pedro. Ela **nunca** entra em arquivo versionado, em teste nem neste documento: chega à stack só como parâmetro `NoEcho` na hora da implantação, lida da variável de ambiente `PESQUISA_SENHA`.
- Permissão de deploy na AWS dada em 2026-10-24, com a ressalva de que nada do que já funciona pode quebrar. Escopo exato na seção 7.

## 4. Restrições

- O site é HTML estático gerado por `scripts/site-publico/paginas.mjs` e publicado por `npm run site:publicar` (zip manual no Amplify Hosting, app `suasaude-site`, `d3fx6eabnu0fdd`, branch `main`, `us-east-1`). Não há build. Não introduzir React, Next, Tailwind nem bundler.
- Endereço público: `https://main.d3fx6eabnu0fdd.amplifyapp.com`.
- Nomes de arquivo que não mudam: `index.html`, `baixar.html`, `privacidade.html`, `termos.html`.
- O texto de Termos e Política vem de `src/data/termosEPrivacidade.ts` e não é alterado (mudar o texto muda `VERSAO_DOS_TERMOS`, e o app pede novo aceite).
- A página não pode afirmar o que o texto publicado nega: o site diz que o app é gratuito, sem publicidade e que não vende dados. A pesquisa não oferece "anúncios" nem "venda de dados" como opção de modelo.
- Regras do projeto (CLAUDE.md e memória): TDD com falha confirmada, uma EPIC por vez, mensagem de commit mostrada antes de commitar, nada de push, nada de deploy na AWS sem pedir antes. O `npm run validate` roda só quando o Pedro autorizar.
- Strings da interface e comentários em português do Brasil.

## 5. A pesquisa

### 5.1 Perguntas

Todas com lista fechada de valores (o texto é o que a pessoa vê, o código é o que se grava). Uma pergunta por tela, avanço automático ao tocar nas de escolha única. As de múltipla escolha e a de texto têm botão "Continuar".

**Contexto:** o visitante só abre o QR code depois que o grupo apresentou o app pessoalmente. Por isso a pesquisa **não apresenta nem mostra** as funcionalidades: só pergunta. Uma tela de abertura diz "Você acabou de conhecer o SuaSaúde. Conte o que achou. Leva 1 minuto e não pedimos nome nem e-mail." e não é pergunta.

**Bloco A: o que a pessoa achou (4 telas)**

| id | pergunta | tipo | valores |
|---|---|---|---|
| `impressao` | "O que você achou do SuaSaúde?" | única | `nao_gostei`, `gostei_pouco`, `nao_sei`, `gostei`, `gostei_muito` (Não gostei / Gostei pouco / Não sei / Gostei / Gostei muito) |
| `usaria` | "Você usaria o SuaSaúde?" | única | `nao_usaria`, `usaria_pouco`, `nao_sei`, `usaria`, `usaria_muito` (Não usaria / Usaria pouco / Não sei / Usaria / Usaria muito) |
| `frequencia` | "Com que frequência você usaria o app?" | única | `todo_dia`, `semana`, `mes`, `so_quando_precisa`, `nunca` (Todo dia / Algumas vezes por semana / Algumas vezes por mês / Só quando precisar (exame, consulta) / Não usaria) |
| `chamaram_atencao` | "Quais funcionalidades mais chamaram a sua atenção? Escolha até 3." | múltipla, máximo 3 | `exames`, `assistente`, `remedios`, `vacinas`, `prevencao`, `agenda`, `smartwatch`, `nenhuma` (nomes na tabela abaixo; "Nenhuma delas" é exclusiva) |

(Chamada minha: os rótulos originais do Pedro para `usaria` eram "Não muito, Pouco, Não sei, Usaria, Usaria Muito". "Não muito" e "Pouco" se sobrepõem. Se o Pedro preferir os originais, troca-se só o texto, os códigos ficam.)

Os nomes das funcionalidades (só texto, sem print e sem frase, porque o grupo já explicou cada uma):

| id | nome mostrado | o que é de fato no app |
|---|---|---|
| `exames` | Exames e receitas | Guarda foto ou PDF do exame e da receita e lê os resultados automaticamente. |
| `assistente` | Assistente com IA | Responde perguntas sobre os dados da própria pessoa. Não diagnostica e não indica dose. |
| `remedios` | Lembretes de remédio | Avisa a hora de tomar, registra as doses e alerta interações entre remédios. |
| `vacinas` | Carteira de vacinação | Guarda as vacinas e mostra campanhas e postos. |
| `prevencao` | Prevenção | Recomendações públicas de exames e check-ups por idade e sexo. |
| `agenda` | Agenda de consultas | Compromissos de saúde num só lugar. |
| `smartwatch` | Dados do smartwatch | Importa dados exportados do relógio ou do app de saúde do celular. |

(Chamada minha: sem a reação por funcionalidade, "até 3 que chamaram atenção" dá mais informação do que escolher uma só. O limite de 3 força a pessoa a priorizar.)

**Bloco B: contexto e barreiras (3 telas)**

| id | pergunta | tipo | valores |
|---|---|---|---|
| `guarda_hoje` | "Hoje, onde você guarda seus exames e receitas?" | múltipla | `papel`, `fotos`, `mensagens` (WhatsApp ou e-mail), `outro_app`, `nao_guardo` (exclusiva) |
| `barreiras` | "O que faria você desistir de usar?" | múltipla | `privacidade`, `trabalho_cadastrar`, `desconfio_ia`, `so_iphone`, `nao_vejo_necessidade`, `outro`, `nenhuma` (exclusiva) |
| `modelo` | "Se o app precisasse se sustentar no futuro, o que você acharia mais aceitável?" | única | `gratis`, `gratis_com_extras`, `assinatura_pequena`, `outra_pessoa_paga`, `nao_sei` (Continuar totalmente grátis / Grátis, com alguns recursos extras pagos / Uma assinatura mensal pequena / Ser pago por outra pessoa, como plano de saúde, clínica ou empresa / Não sei) |

`modelo` é uma pergunta de hipótese, sem preço, e a tela deve dizer que ainda não há decisão ("O grupo ainda não decidiu como o app se sustentaria. Sua resposta ajuda a pensar."). Ela não contradiz o texto publicado, porque não oferece anúncio nem venda de dados.

**Bloco C: sobre a pessoa (4 telas)**

| id | pergunta | tipo | valores |
|---|---|---|---|
| `idade` | "Qual a sua idade?" | única | `menos_18`, `18_24`, `25_34`, `35_44`, `45_59`, `60_mais` |
| `celular` | "Qual o seu celular?" | única | `android`, `iphone`, `outro` |
| `remedio_em_casa` | "Quem toma remédio todo dia na sua casa?" | única | `eu`, `outra_pessoa`, `eu_e_outra`, `ninguem` |
| `comentario` | "O que faltou ou o que você mudaria?" | texto, opcional, até 280 caracteres | livre |

Total: 4 + 3 + 4 = 11 telas. `remedio_em_casa` existe para detectar o cliente cuidador (filho adulto que cuida dos remédios dos pais) separado do cliente usuário.

### 5.2 Como o grupo lê o resultado (para o construtor desenhar `resultados.html`)

Responde as cinco dúvidas da intenção: quem é o cliente (`idade`, `celular`, `remedio_em_casa`), qual a dor (`guarda_hoje`), qual funcionalidade chama atenção (`chamaram_atencao`), recorrência (`frequencia`), o que impede (`barreiras`, `modelo`).

Viés a registrar: visitante de feira é gentil e acabou de ver a apresentação, então "Gostei" e "Usaria" tendem a vir inflados. `frequencia`, `barreiras` e `chamaram_atencao` (limitada a 3) resistem melhor. Sem reação por funcionalidade, não se sabe se a pessoa usaria cada uma: sabe-se só quais chamaram atenção. Mostrar sempre contagem absoluta ao lado de qualquer percentual, sem casas decimais.

O critério do que conta como "viável" (por exemplo, "metade responde Usaria ou Usaria muito") **ainda não foi escolhido pelo grupo**. Deve ser definido antes de olhar os dados. O construtor não inventa esse critério na tela de resultados.

### 5.3 Privacidade da pesquisa

- Anônima: nenhum campo de identificação, nenhum IP gravado, nenhum cookie.
- A Lambda não registra o evento da requisição nos logs.
- O id da resposta é sorteado no navegador (UUID) e guardado só em `sessionStorage` para continuar a mesma resposta.
- A própria página `opiniao.html` mostra um aviso curto: pesquisa anônima, sem nome nem e-mail, serve só para o trabalho do grupo. A Política não é alterada (ver restrições).
- "Menos de 18" é uma opção de resposta, sem tratamento especial (nenhum dado identificável é coletado).

## 6. O site

### 6.1 Páginas

| arquivo | papel | muda |
|---|---|---|
| `baixar.html` | porta de entrada do QR | visual novo, hero com print, dois botões |
| `opiniao.html` | a pesquisa | nova |
| `resultados.html` | painel do grupo | nova, fora do menu, `noindex`, pede a senha do grupo |
| `index.html` | página inicial | visual novo, mesmo conteúdo |
| `privacidade.html`, `termos.html` | documentos | só o visual do cabeçalho, rodapé e tipografia; texto intocado |

### 6.2 Fluxo e download

- `baixar.html`: botão principal "Baixar o app" (APK), botão secundário "Dar minha opinião (1 minuto)".
- Fim da pesquisa: tela de agradecimento com o mesmo botão "Baixar o app" e as instruções de instalação (permitir instalação, aviso do Play Protect) logo abaixo.
- O link do APK continua em um só lugar, a constante `APK` de `scripts/publicar-site-publico.mjs`.
- Quem respondeu `celular = iphone` vê, no botão de download, o aviso "O app só funciona em Android" e o botão de baixar fica desabilitado, mas a pesquisa segue normal. Quem chega direto em `baixar.html` e a página detecta iPhone pelo navegador vê o mesmo aviso (chamada minha, é só um aviso e não bloqueia: se a detecção falhar, a pessoa ainda baixa).
- Cada clique em "Baixar o app" é registrado com a origem: `inicio` ou `fim`.

### 6.3 Direção visual

Leitura do pedido: página de convite e pesquisa para leigos, confiável, mobile primeiro, com a linguagem do app. Dials: DESIGN_VARIANCE 5, MOTION_INTENSITY 4, VISUAL_DENSITY 3.

- **Cores** (as do app, de `src/constants/themeTokens.json`): primária `#10794E`, primária suave `#E8F5EE`, fundo `#F7F8F7`, texto `#141817`, texto secundário `#55605C`, superfície `#FFFFFF`; versão escura espelhando os tokens `dark` do app, seguindo `prefers-color-scheme`. Um acento só (o verde). As respostas negativas ficam em cinza, sem vermelho.
- **Tipografia:** IBM Plex Sans, a fonte do app, hospedada junto no zip (nada de `<link>` externo). Corpo de 17 a 18 px, botões de resposta com 56 px ou mais de altura, linhas com menos de 70 caracteres. O público inclui pessoas com mais de 50 anos.
- **O elemento memorável:** a resposta de um toque, grande e sem esforço, e o print real do app no hero. O resto fica quieto.
- **Pesquisa:** uma tela por vez, barra de progresso ("3 de 11", é uma sequência de verdade), botão "voltar" que mantém as respostas. A tela desliza ao avançar, e a barra enche. Esse é o único movimento. Respeita `prefers-reduced-motion`.
- **Estados:** erro de envio inline com "Tentar de novo" (as respostas já dadas ficam na tela e a próxima tentativa reenvia), carregando, e agradecimento. O app funciona sem o envio funcionar: se a rede falhar, o visitante pode continuar e baixar o app.
- **Evitar:** eyebrows em caixa-alta acima de títulos (no máximo um em todo o site), grade de três cards iguais, travessão nos textos novos, ponto médio como separador, bolinhas decorativas, texto de "rolar para baixo".
- **Hero de `baixar.html`:** título de no máximo duas linhas ("Seus exames, remédios e vacinas num só lugar."), subtexto de no máximo 20 palavras, os dois botões visíveis sem rolar a tela, um print real do app embaixo no celular e ao lado no desktop. Como o visitante chega depois da apresentação do grupo, o hero não precisa explicar o app em detalhe.
- **Acessibilidade:** foco de teclado visível, contraste AA em ambos os temas, rótulos acima dos campos, botões de resposta com `role` de rádio ou checkbox corretos.

### 6.4 Print do app

Um só print, no hero de `baixar.html`, em `assets/site/telas/inicio.png`. O construtor tenta capturá-lo do preview web do app (`docs/dev-preview.md`, preview `home-with-data`) com dados de exemplo fictícios. Se não ficar bom o bastante, **o Pedro fornece um print do celular**. Nunca se desenha tela falsa.

## 7. Onde os dados ficam (AWS)

**Decisão (chamada minha, justificada):** stack CloudFormation separada do backend do app, em `infra/site-pesquisa/`. Motivos: o script de publicação já separa o site do backend de propósito, o sandbox é pessoal (o endereço mudaria), e a produção tem proteção contra exclusão de tabela e exige decisão para mudar o schema.

- **Tabela DynamoDB** `suasaude-feira-respostas`, cobrança sob demanda, chave de partição `id` (string). Sem TTL.
- **Lambda** (Node 20, ES module) com **Function URL** pública (`AuthType NONE`), CORS só para `https://main.d3fx6eabnu0fdd.amplifyapp.com`, concorrência reservada baixa (5) para limitar custo e abuso.
- **Escopo do deploy autorizado** (conferido em leitura na conta `370586504317`, região `us-east-1`): cria **uma** stack nova, `suasaude-pesquisa`, e republica o site no Amplify Hosting (`suasaude-site`, `d3fx6eabnu0fdd`). As duas bases que o Pedro citou **não são tocadas**: produção é o backend do app `d1wsv2b9ntb67b`, branch `main` (user pool `us-east-1_7NZ46CF7S`), e homologação é o sandbox (user pool `us-east-1_CFEpevMNE`). O site e a pesquisa não usam Cognito, então uma única stack serve aos dois ambientes. Não se roda `ampx`, não se muda `amplify/` e não se mexe em nenhuma stack `amplify-*`.
- **"Tudo continua funcionando":** antes e depois da implantação, o construtor lista as stacks `amplify-*` com seus estados e confere que são idênticos, e confere que os dois user pools continuam respondendo a `describe-user-pool`. O resultado entra no relatório de fim de bloco.
- **Papel IAM** mínimo: `PutItem`/`UpdateItem` na tabela para gravar, `Scan` só na rota de leitura.
- **Rotas** (corpo JSON):
  - `salvar`: grava ou atualiza a resposta de um `id`, aceita só campos e valores da lista da seção 5.1, `comentario` até 280 caracteres, corpo até alguns KB. Campo isca `site` (honeypot): se vier preenchido, responde 200 e não grava.
  - `clique`: grava um item `tipo = clique` com `origem` em `{inicio, fim}`.
  - `listar`: exige o cabeçalho com a senha do grupo (comparação em tempo constante) e devolve tudo, para `resultados.html`.
- **Formato do item de resposta:** `id`, `tipo = resposta`, `versaoDoFormulario`, `criadoEm`, `atualizadoEm`, `etapa` (última tela alcançada), `concluido` (booleano), `respostas` (mapa id da pergunta para valor ou lista). Gravar a cada tela, para que quem desiste no meio deixe dado parcial.
- **Senha do grupo:** parâmetro `NoEcho` da stack, variável de ambiente da Lambda. É proteção simples (os dados são anônimos), não segurança forte. Dizer isso no README da pasta.
- **Código da Lambda e as perguntas:** a lista de perguntas e valores é um módulo único (`infra/site-pesquisa/pesquisa.mjs`, a ser criado) usado pelo gerador de páginas **e** pela validação da Lambda, para as duas nunca divergirem. O limite de 4 KB do código embutido do CloudFormation não serve, então o script de implantação cria a stack e depois sobe o zip do código (o script de publicação já tem um criador de zip sem dependência que pode ser reutilizado).
- **Endereço da Function URL:** só existe depois da implantação. As páginas leem esse endereço de um valor de configuração em `scripts/publicar-site-publico.mjs` (chamada minha). Até o Pedro aprovar a implantação, a configuração fica com um valor de marcação, e a pesquisa mostra o erro de envio da seção 6.3 em vez de falhar em silêncio.
- **Comandos novos** (nomes são sugestão): `npm run pesquisa:implantar` (cria ou atualiza a stack e o código) e `npm run pesquisa:exportar` (CSV local, alternativa ao painel).

## 8. Como se constrói (por EPIC, parando ao fim de cada uma)

1. **Dados e validação:** `pesquisa.mjs` (perguntas, valores, textos) e função pura de validação. Testes primeiro, falha confirmada.
2. **Gerador de páginas:** visual novo, `baixar.html`, `opiniao.html` (HTML e JS embutido), `resultados.html`. Testes sobre o HTML gerado no estilo de `__tests__/sitePublico.test.ts`.
3. **Lambda e stack:** handler testado com eventos simulados e DynamoDB falso. Implantação **só depois de o Pedro pedir**.
4. **Publicação e conferência:** `npm run site:publicar` atualizado para os arquivos novos, conferência no navegador em celular e desktop, tema claro e escuro, iPhone e Android, estados de erro.

Cada EPIC termina com o relatório de fim de bloco no formato que o Pedro espera, inclusive "o que encontrei de errado no plano". O `validate` completo só roda quando ele autorizar.

## 9. Em aberto

- **Critério de viabilidade** (seção 5.2): escolha do grupo, antes de ver dados. Não bloqueia a construção: o painel mostra as contagens e, depois que o grupo fechar o critério, ganha um quadro de conferência (última tarefa do plano).
- **Rótulos da escala** (seção 5.1): Pedro confirma os novos ou volta aos originais.
- Resolvidos em 2026-10-24: prints (reduzidos a um print no hero, Claude coleta), senha do painel (via `PESQUISA_SENHA`, fora do repositório) e permissão de deploy (escopo na seção 7).
