# EPIC: Barra de navegação com o Assistente de IA + Início como porta de entrada

## 1. Identificação

- **Origem:** pedido do dono do projeto ("o chat de IA está muito escondido,
  dentro de Mais") e a escolha da **Opção 1** de `proposta.md`, nesta mesma
  pasta, com dois acréscimos pedidos na escolha:
  1. corrigir os três problemas de formatação que a auditoria da barra achou
     (rótulo pequeno, contraste do inativo, papel de acessibilidade);
  2. "deixar Exames, Remédios e Consultas muito bem integrados com a tela de
     início", para que as três telas também se abram pelo Início.
- **Relação com EPICs entregues:** muda decisões de `specs/00-fundacao/navegacao`
  (ordem das abas do Canvas 1a) e de `specs/02-perfil-home-agenda/home`
  (composição do "Acesso rápido" do Canvas 2b). Os desvios são deliberados e
  registrados aqui (constituição §1 e §8).
- **Rotas/arquivos:**
  - `src/constants/navigation.ts` — `APP_TABS`, `MORE_MENU_ITEMS`, `ROUTE_TAB_MAP`;
  - `src/components/BottomTabBar.tsx` — formatação e acessibilidade;
  - `src/components/QuickAccessButton.tsx` — atalho do Início, redesenhado;
  - `src/screens/HomeScreen.tsx` e `src/app/(app)/dashboard.tsx` — Acesso rápido.
- **Ator:** usuário autenticado, com atenção a idosos e baixo letramento digital.

## 2. História

Como usuário, quero chegar ao Assistente de IA com um toque, de qualquer tela,
e continuar abrindo Consultas, Exames e Remédios direto do Início, para usar o
assistente sem procurá-lo e sem perder o caminho curto para a minha agenda.

### Cenários

**C1. Assistente na barra**
- Dado que estou em qualquer tela do grupo `(app)`
- Quando toco em "Assistente", no centro da barra
- Então abro o chat (`/ai`) e a aba "Assistente" fica ativa

**C2. Memória do assistente mantém a aba**
- Dado que abri "O que o assistente lembra" a partir do chat (`/assistant-memory`)
- Então a aba ativa continua sendo "Assistente"

**C3. Consultas no hub Mais**
- Dado que toco em "Mais"
- Então "Consultas" é o primeiro item da lista e leva a `/appointments`
- E, na agenda, a aba ativa é "Mais"

**C4. Início como porta de entrada**
- Dado que estou no Início
- Então, logo abaixo do "Resumo de hoje", vejo o "Acesso rápido" com
  Consultas, Exames, Remédios e Prevenção, cada um com ícone e rótulo
- E cada atalho abre a sua tela com um toque
- E, quando o Início já tem o dado, o atalho mostra uma linha de apoio:
  - Consultas: "Próximo: Amanhã, 08:00" ou "Nada agendado";
  - Exames: "3 documentos guardados" ou "Nenhum documento guardado";
  - Remédios: "2 doses a tomar hoje" ou "Nenhuma dose a tomar hoje"
- E, enquanto o dado carrega ou se ele falhou, a linha simplesmente não aparece

**C5. Leitor de tela**
- Dado que uso TalkBack/VoiceOver na barra
- Então cada item é anunciado como aba, com a ativa como selecionada

## 3. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | Ordem: Início · Exames · **Assistente** · Remédios · Mais. Consultas vai para o topo do hub Mais. | Opção 1 da proposta. Consultas é de uso mensal e segue a 1 toque pelo Início; Remédios é de uso diário. Exames e Assistente lado a lado ("vejo o exame > pergunto sobre ele"); o centro é o ponto mais alcançável pelo polegar. |
| D2 | Em `/appointments` a aba acesa é **"Mais"** (não "Início"). | A agenda é um destino do hub Mais, como Prevenção e Vacinação — que também têm atalho no Início e acendem "Mais". A aba acesa diz "onde este lugar mora", não "por onde entrei"; a barra não tem memória de origem e a regra precisa ser uma só para todas as telas do hub. |
| D3 | Rótulo **"Assistente"**, mantido. | Medido com as métricas do IBM Plex Sans SemiBold (a face 600 do app, lida do TTF): cada vaga tem (360 − 8) / 5 = 70,4dp em tela de 360dp. "Assistente" = 63,6dp em 13px (cabe) e 68,5dp em 14px (sem folga). O plano B "Perguntar" (60,3dp em 13px) não foi necessário. |
| D4 | Rótulos da barra em **13px** (eram 10px). | 10px está abaixo do piso de 11px com que o Canvas 1a descartou a barra de 7 abas. 14px (token `rotulo`) não cabe com folga em 360dp; 13px é o maior que cabe. |
| D5 | Ícone inativo em **`textSecondary`** (era `iconMuted`); papel **`tab`** nos itens e **`tablist`** no contêiner. | Contraste sobre `surface`: claro 6,53:1 (`#55605C`), escuro 8,37:1 (`#AEBBB6`); o `iconMuted` dava 2,68:1 no claro, abaixo dos 3:1 da WCAG 1.4.11. O Canvas pede `#55605C`. O rótulo inativo já usava `textSecondary`. |
| D6 | "Acesso rápido" do Início sobe para logo depois do Resumo (e dos alertas), em grade 2×2: **Consultas, Exames, Remédios, Prevenção**, com linha de apoio de dado real. "Análise IA" sai. | Pedido do usuário. Reaproveita o Acesso rápido existente em vez de duplicar atalhos. "Agenda" passa a se chamar "Consultas" (um nome por destino, igual à barra antiga e ao hub). "Análise IA" ficou redundante com a aba. Prevenção fica: continua sendo atalho do Canvas 2b e não tem outra entrada no Início. |
| D7 | Linhas de apoio só com dado que o Início **já carrega**; somem durante carregamento ou erro. | Constituição §2 (nada inventado). Os remédios chegam como `null` enquanto carregam: mostrar "Nenhuma dose" nessa hora afirmaria algo sem saber. Prevenção fica sem linha: não há fonte real ainda (spec da Home, §5). |

## 4. Estrutura

**Barra (5 itens, mesmo componente):**

```
+----------------------------------------+
|  [ ]    [ ]   (( [ ] ))   [ ]     [ ]  |
| Início Exames Assistente Remédios Mais |
+----------------------------------------+
```

Ícones (Ionicons, `-outline` quando inativo): `home`, `document-text`,
`chatbubble-ellipses`, `medkit`, `ellipsis-horizontal`.

**Hub Mais, em ordem:** Consultas (`calendar`), Prevenção & Alertas, Carteira
de vacinação, Dados do smartwatch, Perfil.

**Início:**

```
Bom dia, ...                        [sino]
+--------------------------------------+
| Resumo de hoje                       |
+--------------------------------------+
Acesso rápido
+-----------------+ +-----------------+
| [cal]           | | [doc]           |
| Consultas       | | Exames          |
| Próximo: Amanhã,| | 3 documentos    |
| 08:00           | | guardados       |
+-----------------+ +-----------------+
+-----------------+ +-----------------+
| [kit]           | | [escudo]        |
| Remédios        | | Prevenção       |
| 2 doses a tomar | |                 |
| hoje            | |                 |
+-----------------+ +-----------------+
Últimos exames ...
Próximos compromissos ...
```

Cada atalho: card inteiro tocável, mínimo 96dp de altura, borda `border`, fundo
`surface`, raio 14 (`rounded-field`); tile de ícone 44×44 com o par de cor do
Canvas 2b (Consultas azul `secondarySoft`/`secondary`, Exames e Remédios verde
`primarySoft`/`primaryDark`, Prevenção âmbar `warningSoft`/`warning`); rótulo
17px semibold; linha de apoio 16px `textSecondary` (piso "Apoio"), até 2 linhas.
O nome lido pelo leitor de tela inclui a linha de apoio.

## 5. Mapa de navegação

| Elemento | Ação | Destino | Aba acesa no destino |
|---|---|---|---|
| Aba Início | `router.replace` | `/dashboard` | Início |
| Aba Exames | `router.replace` | `/exams` | Exames |
| Aba Assistente | `router.replace` | `/ai` | Assistente |
| Aba Remédios | `router.replace` | `/medicines` | Remédios |
| Aba Mais | `router.replace` | `/more` | Mais |
| Mais > Consultas | `router.push` | `/appointments` | Mais |
| Início > Acesso rápido > Consultas | `router.push` | `/appointments` | Mais |
| Início > Acesso rápido > Exames | `router.push` | `/exams` | Exames |
| Início > Acesso rápido > Remédios | `router.push` | `/medicines` | Remédios |
| Início > Acesso rápido > Prevenção | `router.push` | `/prevention` | Mais |

Nenhuma URL muda.

## 6. Mapa de dados

| Linha de apoio | Fonte (já carregada em `dashboard.tsx`) | Some quando |
|---|---|---|
| Consultas | `selectUpcomingAppointments(...)[0]` (`useAppointmentsData`) | agenda carregando ou com erro |
| Exames | `documents.length` (`useExamsData`) | exames carregando ou com erro |
| Remédios | `pendingCount` (`useMedicinesData`, doses de hoje com status `pending`) | remédios carregando ou com erro |

## 7. Critérios de aceite

- [x] `APP_TABS`: Início, Exames, Assistente, Remédios, Mais, nesta ordem.
- [x] Aba Assistente: `id: 'assistant'`, `href: '/ai'`, ícone `chatbubble-ellipses`.
- [x] `MORE_MENU_ITEMS` começa com Consultas (`/appointments`) e não tem `/ai`.
- [x] `ROUTE_TAB_MAP`: `ai` e `assistant-memory` > `assistant`; `appointments` > `more`.
- [x] Rótulos da barra em 13px; "Assistente" cabe em 360dp (D3).
- [x] Ícone e rótulo inativos com contraste de 4,5:1 ou mais nos dois temas.
- [x] Itens com papel `tab` e `selected`; contêiner `tablist`.
- [x] Acesso rápido logo depois do Resumo, com Consultas, Exames, Remédios e Prevenção, cada um navegando com um toque.
- [x] Linhas de apoio com dado real, ausentes durante carregamento ou erro.
- [x] Sem "Análise IA" no Início.
- [ ] Conferência visual em aparelho de 360dp e de 390dp, claro e escuro (sem dispositivo neste ambiente).
