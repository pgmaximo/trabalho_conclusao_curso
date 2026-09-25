# Proposta: Assistente de IA visível na barra de navegação

> **Status: decidida em 2026-09-25 — Opção 1, implementada.** O dono do projeto
> escolheu a Opção 1 e pediu, junto, as três correções de formatação da §6 e
> que o Início desse acesso de 1 toque a Exames, Remédios e Consultas. A
> especificação do que foi feito está em `spec.md` (decisões D1 a D7),
> `plan.md` e `tasks.md`, nesta pasta. O texto abaixo é o registro da análise
> que levou à escolha e não foi reescrito depois dela.

## 1. Identificação

- **Pedido de origem:** "mudar a formatação e a ordem da barra de navegação.
  Hoje o chat de IA está muito escondido (fica dentro de Mais). Melhorar a
  visibilidade e deixar o app mais amigável."
- **Relação com EPICs existentes:** `specs/00-fundacao/navegacao` (barra de 5
  abas + hub Mais, Canvas 1a). Esta proposta **muda** decisões daquela EPIC, e
  por isso registra o desvio do Canvas como decisão explícita (constituição §1 e
  §8), em vez de fazê-lo por efeito colateral.
- **Arquivos centrais:** `src/constants/navigation.ts` (`APP_TABS`,
  `MORE_MENU_ITEMS`, `ROUTE_TAB_MAP`), `src/components/BottomTabBar.tsx`,
  `src/components/AppShell.tsx`, `src/screens/MoreScreen.tsx`,
  `src/screens/HomeScreen.tsx`.
- **Leitura de design (skill design-taste-frontend, §0.B):** app nativo de saúde
  para público com baixo letramento digital e idosos, em pt-BR, com linguagem
  de confiança e acessibilidade em primeiro lugar, apoiada nos tokens próprios
  do app (`themeTokens.json`) e nos padrões de plataforma (Apple HIG / Material
  3). Mostradores: VARIANCE 3, MOTION 2, DENSITY 5 (linha "trust-first /
  accessibility-critical"). A skill declara app nativo fora do escopo dela
  (§13); dela vieram só a leitura do brief, os mostradores, a trava de uma
  família de ícones (Ionicons, já adotada) e a checagem de contraste e de rótulo.

## 2. Diagnóstico do estado atual

### 2.1 Como se chega ao Assistente hoje

| Caminho | Toques a partir de qualquer aba | Observação |
|---|---|---|
| Barra > Mais > "Assistente de IA" | 2 | 2º item de uma lista de 5, atrás de um rótulo genérico ("Mais") |
| Início > Acesso rápido > "Análise IA" | 1 (só a partir do Início, e rolando) | Rótulo diferente do nome da tela ("Análise IA" x "Assistente de IA") |
| Detalhe do exame / série do analito | nenhum | Justamente onde a pergunta nasce, não há entrada |

A rota `/ai` (`src/app/(app)/ai.tsx`) já diz no comentário que o "caminho
normal" é "abrir o chat pela barra de navegação", o que hoje não é verdade.

### 2.2 Estado visual da barra (`BottomTabBar.tsx`)

- 5 itens: Início (`home`), Consultas (`calendar`), Exames (`document-text`),
  Remédios (`medkit`), Mais (`ellipsis-horizontal`). Ícone cheio quando ativo,
  `-outline` quando inativo; ativo ganha cápsula `primarySoft` + rótulo
  semibold na cor primária. **O estado ativo não depende só de cor** (forma da
  cápsula, ícone cheio e peso do texto), o que já está certo.
- **Rótulo em 10px** (`text-[10px]`). O Canvas 1a descartou a barra de 7 abas
  justamente por forçar rótulos de 11px, abaixo do piso de legibilidade; o
  token `FONTS.rotulo` do app é 14px e diz "SOMENTE labels de aba". A barra
  atual está abaixo do piso que o próprio design usou para decidir.
- **Ícone inativo em `iconMuted` `#9E9E9E`** sobre `surface` `#FFFFFF`:
  contraste de cerca de 2,7:1, abaixo dos 3:1 exigidos para componentes de
  interface (WCAG 2.1, 1.4.11). O Canvas especifica `#55605C` (`textSecondary`)
  para ícone e rótulo inativos.
- Papel de acessibilidade `button` com `selected`. Leitores de tela anunciariam
  melhor como `tab` dentro de `tablist` ("aba, 3 de 5").

### 2.3 Correção já aplicada nesta mesma branch

A aba acesa em telas que não são abas (`/document-detail` acendia "Início" em
vez de "Exames") foi corrigida com um mapa explícito rota > aba,
`ROUTE_TAB_MAP`, travado por `__tests__/abaAtivaPorRota.test.ts`: criar uma
tela em `src/app/(app)/` sem declarar a aba dela reprova o teste. Qualquer opção
abaixo só precisa atualizar esse mapa.

## 3. Fundamentos usados na comparação

- **Apple HIG, Tab bars:** use de 3 a 5 abas no iPhone; cada aba com rótulo de
  texto; a aba "More" torna mais difícil alcançar e **notar** o que está
  escondido nela; a barra de abas serve para **navegar**, não para executar
  ações.
- **Material 3, Navigation bar:** 3 a 5 destinos, cada um com ícone e rótulo;
  não truncar nem quebrar o rótulo.
- **NN/g, navegação escondida:** menus com rótulo vago ("Menu", "Mais") têm
  baixo "cheiro de informação"; as pessoas os ignoram e esquecem o que há
  dentro. Navegação visível supera a escondida em descoberta.
- **Lei de Hick:** o tempo de decisão cresce com o número de opções. Manter 5
  itens não aumenta o custo de escolha; trocar um item por outro, sim, muda o
  que se aprende.
- **Lei de Fitts e zona do polegar (Hoober, 2013):** 49% seguram o celular com
  uma mão; o terço inferior é a zona fácil. A barra inteira está nela, e o
  centro é o ponto mais alcançável pelas duas mãos. Alvo maior e mais central
  = toque mais rápido e com menos erro.
- **Usuários idosos (NN/g; revisão sistemática JMIR mHealth 2023):** rótulos
  sempre visíveis, alvos grandes (mínimo 44pt iOS / 48dp Android; o app usa
  48dp, `DESIGN_TOKENS.md` §3), consistência entre elementos parecidos, e
  desconfiança do que "não parece clicável" ou muda de forma.
- **Constituição §4:** o assistente é apoio informativo, nunca diagnóstico. Dar
  destaque ao assistente não pode apagar o aviso permanente da tela de chat
  (coberto por `chatComOrigem.test.tsx`).

## 4. Exemplos de mercado

| App | Onde está o assistente / a ação principal | O que aprendemos |
|---|---|---|
| WHOOP (Coach, IA) | Item próprio na barra inferior **e** botão flutuante nas outras telas | Assistente como destino de primeiro nível é padrão aceito em saúde |
| Oura (Advisor, IA) | Botão "+" na aba Today e cards contextuais no Início | Entrada contextual funciona, mas depende de estar na tela certa |
| Amazon One Medical (Health AI) | Assistente integrado ao app, ligado ao histórico e à marcação de consulta | Valor do assistente vem do contexto do paciente (exames, remédios) |
| Microsoft Copilot Health | Aba separada dentro do Copilot, com prontuário e wearables | Separação clara entre "conversa de saúde" e o resto |
| Apple Saúde | 3 abas (Resumo, Compartilhar, Buscar), sem IA na barra | Barra curta e estável; profundidade fica dentro das abas |
| Samsung Health | 4 abas (Início, Juntos, Fitness, Minha página) | Menos abas, rótulos sempre visíveis |
| mySugr | Botão "+" de registro (canto inferior no Android, topo no iOS) | Ação principal separada da navegação, não misturada com ela |
| Nav Dasa | Navegação por abas (ex.: aba Exames com laboratoriais e imagem) | Referência brasileira de exames; sem assistente na barra |
| Apps brasileiros de pagamento (ex.: botão central "Pagar"/Pix) | Botão central elevado na barra | Público brasileiro conhece o padrão, mas ele sinaliza **ação**, não destino |

Não foi possível confirmar por fonte pública a barra atual do Meu SUS Digital
nem do app Fleury; ficaram fora da tabela em vez de entrarem por suposição.

## 5. As três opções

Legenda dos mocks: `(( ))` = cápsula da aba ativa; `[ ]` = ícone; `( O )` =
botão elevado. Nomes de ícone são Ionicons (variante `-outline` quando inativo,
como hoje).

### Opção 1: Assistente vira aba, no centro (RECOMENDADA)

**Ordem:** Início (`home`) · Exames (`document-text`) · **Assistente**
(`chatbubble-ellipses`) · Remédios (`medkit`) · Mais (`ellipsis-horizontal`).

**Vai para Mais:** Consultas (`calendar`), como **primeiro** item do hub. O hub
fica: Consultas, Prevenção & Alertas, Carteira de vacinação, Dados do
smartwatch, Perfil. O Assistente sai do hub.

```
+----------------------------------------+
|  [ ]    [ ]   (( [ ] ))   [ ]     [ ]  |
| Início Exames Assistente Remédios Mais |
+----------------------------------------+
         ativo: Assistente (em /ai)
```

**Prós**
- 1 toque para o assistente, de qualquer tela, no ponto mais alcançável da
  zona do polegar (centro).
- Continua com 5 itens: nenhum custo extra de decisão (Hick) e respeita o teto
  de 5 do Canvas 1a, da HIG e do Material 3.
- Todos os itens têm a mesma forma e o mesmo comportamento: é a opção mais
  previsível para idosos. Nada muda de formato, nada "flutua".
- Exames e Assistente lado a lado formam um par mental ("vejo o exame >
  pergunto sobre ele"), coerente com a EPIC `conversa-sobre-o-exame`.
- Semântica correta: o chat é um **destino** (tem histórico, memória, conversa
  retomada), então pertence a uma aba, como a HIG pede.
- Menor esforço: é quase só configuração, porque `AppShell` e `BottomTabBar`
  já iteram `APP_TABS` genericamente.

**Contras**
- Consultas sai da barra. Mitigação: o Início já mostra "Próximos
  compromissos" com link para a agenda e o atalho "Agenda" no Acesso rápido, e
  o item fica em primeiro lugar no Mais. Consultas é de uso mensal; Remédios é
  de uso diário (doses e lembretes), por isso é Consultas, e não Remédios, que
  sai.
- Desvio documentado do Canvas 1a (que tinha Consultas na barra).
- O rótulo "Assistente" (10 letras) é o mais longo da barra: precisa ser medido
  em tela de 360dp (cada item fica com cerca de 72dp). Se truncar, o plano B é
  "Perguntar", nunca abreviar ("Assist.").

**Acessibilidade**
- Alvo de toque: o item inteiro (flex-1 x altura da barra) já passa de 48dp; manter.
- Rótulo sempre visível em todos os itens, inclusive inativos.
- Estado ativo por forma + peso + ícone cheio, não só por cor (já é assim).
- Junto com a mudança, corrigir a formatação da barra (vale para qualquer opção,
  ver §6).

**Esforço:** pequeno, cerca de 0,5 a 1 dia com testes.

**Arquivos que mudam**
- `src/constants/navigation.ts`: `APP_TABS` (nova ordem, nova aba
  `{ id: 'assistant', icon: 'chatbubble-ellipses', label: 'Assistente', href: '/ai' }`,
  sai `agenda`), `MORE_MENU_ITEMS` (sai `ai`, entra Consultas no topo com
  `href: '/appointments'`), `ROUTE_TAB_MAP` (`ai` e `assistant-memory` >
  `'assistant'`; `appointments` > `'more'`) e o cabeçalho do arquivo.
- `src/components/BottomTabBar.tsx`: formatação da §6.
- `src/screens/HomeScreen.tsx`: o atalho "Análise IA" do Acesso rápido vira
  redundante; trocar por outro destino (sugestão: "Vacinação", que hoje só se
  alcança pelo Mais) ou, no mínimo, renomear para "Assistente" (um rótulo por
  intenção).
- Comentários que listam as abas: `src/app/(app)/_layout.tsx`,
  `src/app/(app)/more.tsx`, `src/screens/MoreScreen.tsx`.
- Testes: `__tests__/abaAtivaPorRota.test.ts` (abas esperadas),
  `__tests__/bottom-tab-bar.test.tsx` (rótulos e, se mudar, o papel `tab`).
- Specs: nova EPIC em `specs/00-fundacao/barra-de-navegacao/` (spec, plan,
  tasks) e nota de reconciliação em `specs/00-fundacao/navegacao/spec.md`.

### Opção 2: Botão central elevado para o Assistente

**Ordem:** Início (`home`) · Exames (`document-text`) · **( Assistente )**
(`chatbubble-ellipses`, círculo de 56dp elevado acima da barra, fundo
`primary`, ícone `onPrimary`, rótulo embaixo) · Remédios (`medkit`) · Mais
(`ellipsis-horizontal`).

**Vai para Mais:** Consultas, igual à Opção 1. Com 5 posições e o teto de 5 do
Canvas, não há como manter Consultas **e** ganhar o botão central; uma barra de
6 itens recairia nos rótulos de 11px que o Canvas descartou.

```
                  _____
+--------------- ( [ ] ) ---------------+
|  [ ]    [ ]     `---'     [ ]    [ ]  |
| Início Exames Assistente Remédios Mais|
+---------------------------------------+
```

**Prós**
- Máxima saliência visual: o assistente vira o "herói" da barra, o que
  combina com a IA ser o diferencial do TCC.
- Alvo maior (56dp, o tamanho de "ação primária" dos tokens) e central: o
  melhor caso da lei de Fitts.
- Padrão conhecido do público brasileiro (botões centrais de apps de
  pagamento).

**Contras**
- O botão elevado é lido como **ação** ("criar", "pagar", "+"), e a HIG diz que
  a barra é para navegar. O chat é um destino; o formato promete outra coisa.
- Quebra a consistência: um item com forma, cor e tamanho diferentes, e um
  estado ativo que precisa ser desenhado à parte (o círculo já é "cheio"
  sempre; como mostrar que se está em `/ai`?).
- O círculo invade a área de conteúdo em cerca de 16 a 20dp: todas as telas do
  grupo `(app)` precisam de folga inferior extra, e ele disputa espaço com o
  FAB único de Exames (Canvas 3a), com o toast que o Canvas põe "acima da barra
  de abas" e com o campo de digitação do próprio chat.
- Destaque máximo para a IA num app de saúde puxa contra a constituição §4
  (apoio informativo): a hierarquia visual passa a dizer "comece pela IA".
- Mesmo desvio do Canvas 1a da Opção 1, com mais invenção visual (sombra,
  elevação) sem referência no Canvas.

**Acessibilidade**
- Precisa de rótulo visível sob o círculo (não só ícone) e
  `accessibilityLabel="Assistente"`; papel `tab`, não `button`, para não
  anunciar como ação.
- Sombra tingida e borda para o círculo não depender de sombra, que some no
  modo escuro.
- Estado ativo precisa de um segundo sinal além de cor (ex.: anel ao redor do
  círculo), para não ser só cor.

**Esforço:** médio, cerca de 1,5 a 2 dias (componente especial dentro da barra,
folga inferior nas telas, estados claro/escuro, testes visuais em 360dp e
390dp).

**Arquivos que mudam:** os da Opção 1, mais: `BottomTabBar.tsx` (renderização
especial do item central, novo campo tipo `destaque: true` no item),
`AppShell.tsx` (folga inferior do `<Slot/>`), `src/screens/ExamsScreen.tsx`
(posição do FAB), `src/screens/ChatBotScreen.tsx` (folga do campo de
digitação), `src/constants/themeTokens.json` / `tailwind.config.js` se a sombra
virar token.

### Opção 3: Manter as 5 abas e espalhar entradas contextuais

**Ordem (sem mudança):** Início (`home`) · Consultas (`calendar`) · Exames
(`document-text`) · Remédios (`medkit`) · Mais (`ellipsis-horizontal`).

**Muda no Mais:** "Assistente de IA" sobe para o **primeiro** item, com
destaque. Nada sai da barra.

**Entradas novas para o assistente:**
1. **Início:** card no topo "Pergunte ao assistente sobre seus exames", no
   lugar do atalho "Análise IA".
2. **Detalhe do exame (`/document-detail`)** e **série do analito
   (`/analyte-series`):** botão "Perguntar sobre este exame", que abre `/ai`
   com o documento como contexto.
3. **Não** usar FAB global: Exames já tem o "FAB único" do Canvas 3a, e dois
   botões flutuantes na mesma tela confundem.

```
+----------------------------------------+
|  [ ]    [ ]      [ ]     [ ]  (( [ ] ))|
| Início Consultas Exames Remédios  Mais |
+----------------------------------------+
  no detalhe do exame:
  +------------------------------------+
  |  [ ]  Perguntar sobre este exame   |
  +------------------------------------+
```

**Prós**
- Fiel ao Canvas 1a (nenhuma aba muda), e nada que o usuário já aprendeu some.
- Leva o assistente ao momento de maior intenção: quem está olhando o exame é
  quem tem a pergunta. Casa com o ator da EPIC `conversa-sobre-o-exame` ("a
  pessoa que acabou de guardar um exame e quer saber o que tem nele").
- Conversa começa com contexto, o que tende a gerar respostas melhores.

**Contras**
- Não atende ao pedido literal (mudar a barra): pela barra, o assistente
  continua a 2 toques e atrás de "Mais", o rótulo de baixo "cheiro de
  informação".
- A descoberta depende de estar na tela certa; quem quer uma pergunta geral
  ("posso tomar este remédio em jejum?") continua sem atalho de 1 toque.
- Mais esforço: `/ai` hoje só aceita `conversationId`; abrir com um documento
  como contexto pede um parâmetro novo, mudança em `useChatBot` e cuidado com a
  verificação de linguagem (R1 a R5) e com a posse do arquivo
  (`specs/09-seguranca`).

**Acessibilidade**
- Botão contextual com 48dp de altura, texto 17px (Corpo forte), ícone mais
  rótulo, nunca só ícone.
- Card do Início com rótulo explícito e `accessibilityRole="button"`.

**Esforço:** médio a alto, cerca de 2 a 3 dias (a parte de contexto no chat é
a mais cara e toca o backend `chat-assistant`).

**Arquivos que mudam:** `src/constants/navigation.ts` (ordem do
`MORE_MENU_ITEMS`), `src/screens/MoreScreen.tsx` (destaque do primeiro item),
`src/screens/HomeScreen.tsx`, `src/screens/DocumentDetailScreen.tsx`,
`src/screens/AnalyteSeriesScreen.tsx`, `src/app/(app)/ai.tsx` (novo parâmetro),
`src/screens/ChatBotScreen.tsx`, `src/hooks/useChatBot.ts`, possivelmente
`amplify/functions/chat-assistant/`, e testes de cada tela.

## 6. Formatação da barra (vale para qualquer opção)

Independente da ordem, a barra atual tem três desvios do próprio design
(Canvas e `DESIGN_TOKENS.md`) que prejudicam justamente o público idoso:

| Hoje | Proposta | Motivo |
|---|---|---|
| Rótulo 10px | 12px mínimo (13px se couber em 360dp), semibold, sem o espaçamento de letras do token | Piso do Canvas (rejeitou 11px); 14px do token não cabe em 5 itens com "Consultas"/"Assistente" |
| Ícone e rótulo inativos `#9E9E9E` | `textSecondary` `#55605C` (claro) e o par escuro correspondente | Contraste de 2,7:1 para cerca de 6,5:1; Canvas pede `#55605C` |
| Papel `button` | `tab` em cada item, `tablist` no contêiner | Leitor de tela anuncia "aba, 3 de 5, selecionada" |

A altura, a cápsula de estado ativo e o ícone cheio/contorno ficam como estão.
Nenhuma animação nova (MOTION 2): a troca de aba já é imediata, e movimento
extra não comunica nada aqui.

## 7. Recomendação

**Opção 1, com a formatação da §6 na mesma entrega.**

Por quê, neste app:

1. **Atende ao pedido com o menor desvio possível.** O assistente passa de 2
   toques atrás de um rótulo vago para 1 toque no centro da barra, e a barra
   continua com 5 itens iguais.
2. **Consistência é acessibilidade para idosos.** Todos os itens têm a mesma
   forma e o mesmo comportamento; nada flutua, nada muda de formato, nada
   parece "criar" quando na verdade "abre". A Opção 2 ganha saliência às custas
   exatamente disso.
3. **Semântica certa.** O chat tem histórico, memória e conversas retomadas: é
   um lugar, não uma ação. Lugar é aba (HIG).
4. **Custo compatível com o momento do TCC.** A barra já é dirigida por
   configuração (`APP_TABS`, `ROUTE_TAB_MAP`), então a Opção 1 é quase só
   dados e testes; a Opção 3 toca o backend e as regras de linguagem.
5. **A perda é pequena e mitigada.** Consultas é de uso mensal e segue a 1
   toque no Início ("Próximos compromissos", "Agenda") e em primeiro lugar no
   Mais.

**Evolução sugerida, fora desta entrega:** a entrada contextual "Perguntar
sobre este exame" da Opção 3 é a melhor ideia daquela opção e combina com a
Opção 1. Ela merece EPIC própria, porque mexe no contexto do chat e na
verificação de linguagem (constituição §4).

**Risco a medir antes de fechar a decisão:** o rótulo "Assistente" em tela de
360dp com 12 a 13px. Se truncar, usar "Perguntar".

## 8. Critérios de aceite (se a Opção 1 for escolhida)

- [ ] `APP_TABS` tem exatamente, nesta ordem: Início, Exames, Assistente,
      Remédios, Mais.
- [ ] Tocar em "Assistente" leva a `/ai` e acende "Assistente"; em
      `/assistant-memory` a aba acesa também é "Assistente".
- [ ] "Consultas" é o primeiro item do hub Mais e, em `/appointments`, a aba
      acesa é "Mais".
- [ ] `ROUTE_TAB_MAP` cobre todas as telas de `src/app/(app)/`
      (`abaAtivaPorRota.test.ts` verde).
- [ ] Nenhuma URL muda (`/ai`, `/appointments` e as demais continuam iguais).
- [ ] Rótulos da barra com 12px ou mais, sem truncar em 360dp e 390dp.
- [ ] Ícone e rótulo inativos com contraste de 3:1 ou mais nos modos claro e
      escuro.
- [ ] Itens com papel `tab` e estado `selected`.
- [ ] O aviso permanente do chat continua na tela (`chatComOrigem.test.tsx`
      verde).

## 9. Fontes

- Apple, Human Interface Guidelines, Tab bars:
  https://developer.apple.com/design/human-interface-guidelines/tab-bars
- Material Design 3, Navigation bar, guidelines:
  https://m3.material.io/components/navigation-bar/guidelines
- NN/g, Beyond the Hamburger (navegação escondida no celular):
  https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/
- NN/g, Usability for Older Adults:
  https://www.nngroup.com/articles/usability-for-senior-citizens/
- JMIR mHealth and uHealth (2023), Design Guidelines of Mobile Apps for Older
  Adults: https://mhealth.jmir.org/2023/1/e43186
- Smashing Magazine, The Thumb Zone (Hoober, 2013):
  https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/
- WHOOP, How to Use the AI-Powered WHOOP Coach:
  https://support.whoop.com/s/article/How-to-Use-the-AI-Powered-WHOOP-Coach?language=en_US
- Oura, Oura Advisor (Member Care):
  https://support.ouraring.com/hc/en-us/articles/39512345699219-Oura-Advisor
- Amazon, One Medical Health AI assistant:
  https://www.aboutamazon.com/news/retail/one-medical-ai-health-assistant
- Microsoft AI, Introducing Copilot Health:
  https://microsoft.ai/news/introducing-copilot-health/
- Apple Saúde (abas Resumo, Compartilhar, Buscar):
  https://appleinsider.com/articles/25/05/30/inside-apple-health---how-your-iphone-keeps-track-of-your-vitals
- Samsung Health (abas):
  https://www.androidauthority.com/samsung-health-3037491/
- mySugr, manual do Logbook (botão de registro):
  https://assets.mysugr.com/app_logbook/ios/3.88.0/manual/eu/en/user_manual_tab_bar.pdf
- Nav Dasa, central de ajuda:
  https://ajuda.nav.com.br/s/article/Como-eu-posso-acessar-meus-resultados-de-exames-na-plataforma-NAV
- WCAG 2.1, critério 1.4.11 (contraste de componentes não textuais):
  https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html
