# EPIC: Início com acesso a todas as funcionalidades

## 1. Identificação

- **Origem:** pedido do dono do projeto (2026-10-09): "a interface ficou
  defasada com as funcionalidades novas, e algumas não estão expostas ao
  usuário, principalmente na tela inicial (ex.: os wearables estão na tela de
  opções)". O foco é facilitar o uso, com um Início limpo e todas as
  funcionalidades fáceis de alcançar, **sem mudar a identidade visual**.
- **Relação com EPICs entregues:** muda decisões de
  `specs/02-perfil-home-agenda/home` (Canvas 2b: grade 2×2, sino no cabeçalho,
  "sem tile extra Wearable"), de `specs/00-fundacao/barra-de-navegacao` (D6,
  grade 2×2) e de `specs/05-dados-wearables/importar-dados` (entrada pelo
  Perfil). Os desvios são deliberados e registrados aqui (constituição §1 e §8).
- **Rotas/arquivos:**
  - `src/screens/HomeScreen.tsx` e `src/app/(app)/dashboard.tsx` — grade do
    Acesso rápido e cabeçalho;
  - `src/services/homeVaccination.ts` (novo, puro) e
    `src/hooks/useHomeVaccination.ts` (era `useVaccinationAlert.ts`) —
    contagem das doses;
  - `src/screens/HealthDashboardScreen.tsx` — ação de importar;
  - `src/screens/ProfileScreen.tsx` e `src/app/(app)/profile.tsx` — sai o card
    de importação.
- **Ator:** usuário autenticado, com atenção a idosos e baixo letramento digital.
- **Fora de escopo:** a barra de navegação, o hub Mais, as rotas e o backend
  não mudam. Nenhuma URL muda.

## 2. História

Como usuário, quero chegar a qualquer funcionalidade do app com um toque a
partir do Início, para não precisar lembrar em qual menu cada uma ficou.

### 2.1 Diagnóstico (confirmado no código em 2026-10-09)

| Funcionalidade | Como se chegava | Problema |
|---|---|---|
| Dados do smartwatch | Mais > Dados do smartwatch | Nada no Início |
| Importar dados do smartwatch | Estado vazio/falha da tela, ou Perfil > Configurações | Com uma análise pronta, o único caminho era o Perfil, onde ninguém procura |
| Carteira de vacinação | Mais > Carteira de vacinação | No Início, só quando havia alerta |
| Perfil | Mais > Perfil | Nada no Início |
| Sino do cabeçalho | — | Botão sem ação: não existe central de notificações |

### Cenários

**C1. Tudo a um toque**
- Dado que estou no Início
- Então o "Acesso rápido" mostra Consultas, Exames, Remédios, Prevenção,
  Vacinação e Smartwatch, cada um com ícone e rótulo
- E cada atalho abre a sua tela com um toque

**C2. Linha de apoio dos atalhos novos**
- Dado que as doses da carteira já carregaram
- Então o atalho Vacinação diz, nesta ordem de prioridade: "2 atrasadas",
  "3 pendentes", "5 aplicadas" ou "Nenhuma dose"
- Dado que a análise do smartwatch já carregou
- Então o atalho Smartwatch diz "Análise pronta" ou "Sem análise"

**C2b. Grade uniforme**
- Dado que estou no Início, em qualquer estado (carregando, com erro, vazio
  ou com dados)
- Então os seis atalhos têm a mesma altura e a mesma anatomia: ícone, rótulo
  e uma linha de apoio, de uma linha só
- E, enquanto o dado carrega, se ele falhou ou quando não há fonte
  (Prevenção), a linha descreve o destino ("Sua agenda", "Orientações"), sem
  afirmar nada sobre os dados da pessoa

**C3. Perfil pelo cabeçalho**
- Dado que estou no Início
- Quando toco no avatar, no canto superior direito
- Então abro o Perfil (`/profile`)

**C4. Importar de novo**
- Dado que já tenho uma análise pronta em "Dados do smartwatch"
- Quando toco em "Importar", no cabeçalho
- Então abro a importação (`/import-health-data`)
- E, com uma análise em andamento, a ação não aparece

## 3. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D1 | "Acesso rápido" passa de 2×2 para **2×3**: entram **Vacinação** e **Smartwatch**, na terceira linha. | As duas só eram alcançáveis pelo hub Mais. O Canvas 2b é anterior a elas (a spec da Home pedia "sem tile extra Wearable" por fidelidade a ele); o desvio é deliberado. Reaproveita `QuickAccessButton` sem alterá-lo: mesma forma, mesmos tons, mesmo alvo de 96dp. A alternativa de 3 colunas só com ícone e rótulo foi descartada: perdia a linha de apoio e encolhia o alvo de toque. |
| D2 | Linhas de apoio dos atalhos novos só afirmam dado real (mesma regra da D7 de `barra-de-navegacao`; o que aparece sem o dado está na D8). Smartwatch diz **"Sem análise"**, e não "nenhum dado importado". | Constituição §2. O Início só enxerga a análise que já ficou **pronta** (`getLatestReadyHealthImport`); com uma importação em andamento, "nenhum dado importado" seria falso. Vacinação conta com a mesma regra da Carteira (`mapToItem`), para as duas telas nunca discordarem. |
| D3 | O **sino** do cabeçalho sai; entra o **avatar**, que abre o Perfil. Sem destino, o avatar não é desenhado. | O sino era um botão sem ação. A central de notificações continua sendo pendência (`GAP_ANALYSIS.md`); quando existir, o sino volta com função. O avatar usa o componente `Avatar` existente (foto > gênero > iniciais) num alvo de 48dp. |
| D4 | A importação dos dados do smartwatch passa a morar na tela **"Dados do smartwatch"** (ação "Importar" no cabeçalho, com análise pronta). O card sai de **Perfil > Configurações**. | Importar não é uma configuração, e a ação precisa estar onde o dado está. Vazio e falha mantêm o próprio botão; com análise em andamento, nada é oferecido. |
| D5 | "Últimos exames" mostra **2** documentos (eram 3). | O Canvas 2b pede "até 2 cards". Compensa a linha a mais da grade, para a tela não crescer; a lista inteira segue em "Ver todos". |
| D6 | Rótulos curtos nos atalhos: **"Vacinação"** e **"Smartwatch"**. | Cabem numa linha em 360dp, como "Remédios" (tela "Medicamentos") e "Prevenção" (hub "Prevenção & Alertas") já fazem. |
| D7 | O aviso de **interação medicamentosa não vai para o Início**. | O dado já chega lá, mas uma interação entre dois remédios prescritos nunca "se resolve": seria um card vermelho permanente e sem como dispensar na primeira tela. Continua em Remédios. Trazer para o Início pede antes um mecanismo de dispensa. |
| D8 | **Grade uniforme.** Todo atalho tem sempre uma linha de apoio, escrita para caber em **uma linha**. Sem dado real (carregando, erro, ou sem fonte, como Prevenção), a linha é uma **descrição neutra do destino**. Cada atalho ganha a seta `chevron-forward` das listas do app. | Pedido do dono do projeto ao ver a grade no aparelho: "alguns têm subtítulo e outros não, e alguns subtítulos não estão alinhados como os outros". As causas eram duas: a linha era opcional (Prevenção nunca tinha; as demais sumiam ao carregar, e a grade pulava), e as frases quebravam em uma ou duas linhas conforme o tamanho. Medido em 360dp, o atalho tem 121dp para o texto (IBM Plex Sans 16px), uns 14 caracteres. A descrição não é dado: não afirma número nem estado, e por isso não fere a constituição §2. A frase antiga de Exames vazio chegava a aparecer cortada ("Nenhum documento …"). Substitui a regra "a linha some" da D7 de `barra-de-navegacao`. |

### 3.1 Textos das linhas de apoio (D8)

| Atalho | Com dado | Sem nada | Sem dado (descrição) |
|---|---|---|---|
| Consultas | "Amanhã, 08:00" | "Nada agendado" | "Sua agenda" |
| Exames | "7 documentos" | "Nada guardado" | "Seu histórico" |
| Remédios | "Faltam 2 hoje" | "Nada pendente" | "Doses de hoje" |
| Prevenção | — | — | "Orientações" |
| Vacinação | "2 atrasadas" / "3 pendentes" / "5 aplicadas" | "Nenhuma dose" | "Sua carteira" |
| Smartwatch | "Análise pronta" | "Sem análise" | "Sono e passos" |

Todas medidas em 360dp; a mais larga tem 8dp de folga. A única que pode
quebrar é Exames a partir de 100 documentos ("128 documentos", 1dp a mais):
nesse caso o texto ocupa duas linhas, sem corte. `numberOfLines={2}` fica como
rede de segurança, também para quem usa fonte ampliada no sistema.

"Faltam 2 hoje", e não "2 doses hoje": o número é o que ainda não foi tomado,
não o total do dia.

## 4. Estrutura

**Início:**

```
Boa tarde, Maria                   (MS)
sexta-feira, 9 de outubro
+--------------------------------------+
| Resumo de hoje                       |
+--------------------------------------+
(alertas, só quando existem)
Acesso rápido
+-----------------+ +-----------------+
| [cal]         > | | [doc]         > |
| Consultas       | | Exames          |
| Amanhã, 08:00   | | 7 documentos    |
+-----------------+ +-----------------+
+-----------------+ +-----------------+
| [kit]         > | | [escudo]      > |
| Remédios        | | Prevenção       |
| Faltam 2 hoje   | | Orientações     |
+-----------------+ +-----------------+
+-----------------+ +-----------------+
| [vacina]      > | | [relógio]     > |
| Vacinação       | | Smartwatch      |
| 1 atrasada      | | Análise pronta  |
+-----------------+ +-----------------+
Últimos exames (2) ...
Próximos compromissos ...
```

Atalhos novos: Vacinação com `medical-outline` e tom `primary` (verde, a
família do alerta de vacinação); Smartwatch com `watch-outline` e tom
`secondary` (azul).

**Dados do smartwatch:** ação "Importar" (`cloud-upload-outline` + rótulo,
48dp de altura, mesma forma do botão "Evolução" de Exames) à direita do título.

## 5. Mapa de navegação

| Elemento | Ação | Destino | Aba acesa no destino |
|---|---|---|---|
| Início > Acesso rápido > Vacinação | `router.push` | `/vaccination` | Mais |
| Início > Acesso rápido > Smartwatch | `router.push` | `/health-data` | Mais |
| Início > avatar | `router.push` | `/profile` | Mais |
| Dados do smartwatch > Importar | `router.push` | `/import-health-data` | — (fora do grupo com abas) |

Os demais atalhos e links do Início não mudam. A aba acesa segue a D2 de
`barra-de-navegacao`: ela diz onde a tela mora, não por onde se entrou.

## 6. Mapa de dados

| Linha de apoio | Fonte | Vira descrição do destino quando |
|---|---|---|
| Vacinação | `listVaccineDosesForUser()`, uma busca só, a mesma do alerta de vacinação (`useHomeVaccination`), contada por `countVaccineDoses` | doses carregando ou com erro |
| Smartwatch | `useHealthDashboardData()` (cache primeiro): se há análise pronta | análise carregando ou com erro |

Nenhuma escrita, nenhuma mudança de schema.

## 7. Critérios de aceite

- [x] Acesso rápido com 6 atalhos em 2×3: Consultas, Exames, Remédios,
      Prevenção, Vacinação, Smartwatch, cada um navegando com um toque.
- [x] Linhas de apoio de Vacinação e Smartwatch com dado real.
- [x] Os seis atalhos sempre com linha de apoio, de uma linha só, e com a
      mesma altura em todos os estados; sem o dado, a linha descreve o destino.
- [x] A contagem de doses do Início usa a mesma regra da Carteira.
- [x] Avatar no cabeçalho abre o Perfil; não há mais sino sem ação.
- [x] "Dados do smartwatch" oferece "Importar" com análise pronta, e não com
      análise em andamento.
- [x] Perfil > Configurações sem o card de importação.
- [x] "Últimos exames" com 2 documentos.
- [x] Nenhuma linha de apoio cortada nem quebrada em 360dp e 390dp, claro e
      escuro (medido e conferido no navegador, pela rota `/dev-preview`).
- [x] Barra de navegação, hub Mais e rotas inalterados
      (`abaAtivaPorRota.test.ts` verde sem mudança).
- [ ] Conferência em aparelho real, com login: dados reais nos atalhos novos
      (sem dispositivo neste ambiente).
