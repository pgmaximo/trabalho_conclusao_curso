# PROMPT — SDD (Spec Driven Development) para alinhamento total do Front-End do SuaSaúde ao Design (Claude Design)

> **Como usar:** cole este documento inteiro como primeira mensagem para o Claude Code, dentro do diretório raiz do repositório do projeto (`trabalho_conclusao_curso`). Ele foi escrito para ser executado em fases, sem pular etapas.
>
> **Este é um projeto em andamento, não um começo do zero.** As Fases 0 e 1 já foram concluídas em sessões anteriores (specs, tokens, inventários já existem em `specs/`) e a Fase 3 já implementou a maior parte dos Blocos. Antes de qualquer outra coisa, siga a **Fase -1** abaixo para recuperar o estado real do projeto — não redescubra nem reescreva o que já existe.

---

## -1. Fase -1 — Retomada de sessão (SEMPRE execute isto primeiro, antes de qualquer código)

Este chat começa sem nenhum histórico da conversa anterior. O estado do projeto não vive na conversa — vive nos arquivos do repositório. Antes de escrever ou alterar qualquer código, ou de fazer qualquer pergunta ao usuário, leia nesta ordem:

1. **`specs/RELATORIO_SDD_SUASAUDE.md`** — o relatório de progresso mais recente. É a fonte de verdade sobre o que já foi concluído, o que está em andamento e o que ainda não foi tocado, com base no código real (não em suposição). Leia-o por inteiro antes de decidir o que fazer.
2. **`specs/design/GAP_ANALYSIS.md`** — status tela a tela (`CRIAR`/`ATUALIZAR`/`MANTER`/`CONCLUÍDO`/`DESCONTINUAR`) e a lista numerada de "Pendências técnicas conhecidas". Trate a seção "Resumo de contagem" e as linhas de status por tela como a referência mais atual — se notar qualquer contradição entre elas (uma tela marcada `CONCLUÍDO` na tabela mas ainda contada como pendente no resumo, ou vice-versa), **corrija o arquivo antes de continuar**, não ignore a inconsistência.
3. **`specs/constitution.md`** — os princípios não-negociáveis (fidelidade ao design, nenhum dado mockado silencioso, stack existente antes de nova, LGPD/responsabilidade de IA, nada quebra o que já funciona, cada tela é rastreável). Toda decisão sua deve continuar respeitando essas regras.
4. **Confirme contra o código, não só contra os documentos.** Os `tasks.md` de cada EPIC (`specs/<bloco>/<tela>/tasks.md`) podem estar desatualizados. Antes de assumir que uma tela está pendente ou concluída, rode `git log --oneline --all | grep "specs/<bloco>"` para ver se já existe um commit `feat(...): implementa ... conforme specs/...` referenciando aquele EPIC, e/ou leia o arquivo de tela real (`src/screens/...`) para confirmar. Trate documentação desatualizada como um bug a corrigir, não como verdade.
5. **Não repita a Fase 0 (descoberta).** `DESIGN_TOKENS.md`, `DESIGN_INVENTORY.md`, `CODE_INVENTORY.md` e `GAP_ANALYSIS.md` já existem e são válidos — apenas atualize-os quando encontrar informação nova ou desatualizada durante o trabalho, nunca os regenere do zero.
6. **Identifique o próximo passo real.** No momento em que este relatório foi gerado, o `Bloco 2 — Perfil de Saúde, Home e Agenda (2a–2e)` era o único Bloco do roadmap original sem nenhuma implementação SDD (specs prontas em `specs/02-perfil-home-agenda/`, mas zero commits/tasks concluídas) — comece por ali, salvo se o `RELATORIO_SDD_SUASAUDE.md` que você acabou de ler indicar um estado diferente (ele pode ter sido atualizado depois deste prompt). Se o Bloco 2 já estiver concluído quando você ler isto, siga para a pendência de maior prioridade listada na seção "Pendências técnicas conhecidas" do `GAP_ANALYSIS.md` que não dependa de uma decisão humana ainda em aberto.
7. **Pendências que exigem decisão sua/do usuário, não devem ser implementadas por iniciativa própria:** confira a seção "Requer decisão sua/do orientador" do `RELATORIO_SDD_SUASAUDE.md` (ex.: integração real de IA no Assistente, persistência de histórico de conversas, obrigatoriedade de campos em Agendamentos). Pergunte antes de implementar essas, mesmo que pareçam óbvias.

**Ao final de cada sessão/Bloco concluído, sempre regenere `specs/RELATORIO_SDD_SUASAUDE.md`** (não apenas anexe — releia o estado real do código e reescreva o resumo) e corrija qualquer contagem/status desatualizado em `GAP_ANALYSIS.md`, exatamente como feito para chegar neste ponto. É assim que a próxima sessão (que também vai começar sem histórico) consegue retomar de onde parou. Trate isso como parte do critério de conclusão de qualquer Bloco, não como um passo opcional de documentação.

---

## 0. Papel e missão

Você é o Claude Code atuando como engenheiro de front-end responsável por um TCC de Ciência da Computação chamado **SuaSaúde – Gerenciamento de Saúde** (Instituto Mauá de Tecnologia, orientador Prof. MSc. Dr. Robson Calvetti). O app é construído em **React Native (Expo)**, com backend em **AWS** (S3 para arquivos, DynamoDB para persistência, Amplify para integração, Cognito para autenticação).

Um artefato de design completo foi produzido no **Claude Design** (Canvas), cobrindo **todas as telas do produto** — inclusive telas que ainda não existem no código. Sua missão é aplicar **Spec Driven Development (SDD)**: antes de escrever qualquer linha de código, você deve **gerar as especificações formais de cada tela (EPICs)**, e só então implementar, garantindo que o front-end atual passe a espelhar 100% do design — estrutura visual, navegação entre telas e sincronização de dados reais (não mocks).

Isso não é um retoque visual pontual: é uma reescrita guiada por especificação de toda a camada de apresentação do app, mantendo a lógica de negócio e os dados reais do banco.

---

## 1. Princípios não-negociáveis (constituição do projeto)

Antes de tocar em qualquer tela, crie o arquivo `specs/constitution.md` documentando as regras abaixo (e outras que você identificar durante a descoberta). Toda decisão posterior deve poder ser rastreada a uma regra desta constituição.

1. **Fidelidade ao design é lei.** Cada tela implementada deve corresponder ao Canvas do Claude Design em estrutura, hierarquia visual, textos, estados (vazio/carregando/erro/sucesso) e comportamento — não apenas "parecido", mas equivalente.
2. **Nenhum dado mockado permanece.** Todo campo, lista, gráfico ou indicador exibido deve estar conectado a uma fonte real: DynamoDB, S3, Cognito ou API própria. Placeholders só são aceitáveis quando documentados explicitamente como pendência técnica (ex.: integração de wearable ainda não disponível).
3. **Stack existente é respeitada antes de expandida.** Descubra o que já está instalado (navegação, gerenciamento de estado, formulários, chamadas AWS) e reaproveite. Só introduza uma nova biblioteca se preencher uma lacuna real e for uma escolha moderna e amplamente adotada no ecossistema React Native/Expo.
4. **LGPD e responsabilidade da IA são requisitos de interface, não só de backend.** Nenhuma tela pode sugerir diagnóstico definitivo do módulo de IA — a linguagem da UI deve deixar claro que a análise é preliminar/informativa. Telas que lidam com dados sensíveis de saúde devem ter copy e fluxos de consentimento coerentes com a LGPD.
5. **Nada quebra o que já funciona.** Autenticação (Cognito), dados já persistidos no DynamoDB e uploads existentes no S3 não podem ser corrompidos por uma refatoração de UI. Se um novo formato de tela exigir mudança de schema, isso é uma decisão explícita e documentada, não um efeito colateral.
6. **Cada tela é uma unidade de entrega rastreável.** Nenhuma tela é "ajustada de leve"; cada tela tem uma spec, um plano técnico, uma lista de tarefas e um critério de aceite — mesmo que a implementação final seja pequena.

---

## 2. Fase 0 — Descoberta e inventário (obrigatória antes de qualquer código)

### 2.1 Importar o projeto completo do Claude Design

Use o MCP do Claude Design para acessar o projeto inteiro — **não se limite ao arquivo já indicado (`Bloco 1 - Base e Autenticacao`)**. O handoff original foi:

```
Use the claude_design MCP (https://api.anthropic.com/v1/design/mcp, auth via /design-login) to import this project:
https://claude.ai/design/p/436ba250-2ad9-4c46-b965-b057fceba7e4?file=SuaSaude+-+Bloco+1+-+Base+e+Autenticacao.dc.html

Focus on these files (the whole project is readable):
- `SuaSaude - Bloco 1 - Base e Autenticacao.dc.html`

Also read these files the selection imports:
- `support.js`
```

O texto "*the whole project is readable*" indica que existem **outros arquivos `.dc.html` no mesmo projeto** (outros "Blocos", prováveis candidatos: Exames, Receitas/Medicamentos, Consultas, Vacinação, Wearables/Dashboard, IA, Perfil/Empresa). Antes de implementar qualquer coisa:

- Liste **todos** os arquivos `.dc.html` disponíveis nesse projeto do Claude Design.
- Leia `support.js` (e qualquer outro arquivo compartilhado importado) para extrair **tokens de design**: paleta de cores, tipografia, espaçamentos, raios de borda, ícones, componentes reutilizáveis (botões, cards, inputs, badges de status).
- **Não reaproveite** as cores usadas no estande físico da EUREKA (`#3FAE6B` / `#DCF5E6`) como se fossem os tokens do app — esses valores foram aproximados para outro artefato (banner impresso). Extraia a paleta real diretamente dos arquivos de design do app.
- Documente tudo em `specs/design/DESIGN_TOKENS.md` (cores, fontes, espaçamentos, componentes-base) e `specs/design/DESIGN_INVENTORY.md` (lista de todos os Blocos e, dentro de cada um, todas as telas/estados encontrados).

### 2.2 Inventariar o código atual

Percorra o repositório e produza `specs/design/CODE_INVENTORY.md` contendo:
- Estrutura de pastas de telas/rotas atual e biblioteca de navegação em uso.
- Lista de telas já implementadas, com o caminho do arquivo.
- Bibliotecas já usadas para estado, formulários, requisições HTTP/AWS, estilos.
- Como a integração com Cognito, DynamoDB e S3 está implementada hoje (serviços, hooks, contexts).

### 2.3 Análise de lacunas (gap analysis)

Cruze os dois inventários em `specs/design/GAP_ANALYSIS.md`, uma linha por tela:

| Bloco | Tela | Existe no código? | Existe no design? | Status | Prioridade |
|---|---|---|---|---|---|

Onde **Status** é um de: `CRIAR` (existe só no design), `ATUALIZAR` (existe nos dois, mas diverge), `MANTER` (já está fiel), `DESCONTINUAR` (existe no código mas não no design — decidir com cautela, nunca apagar fluxo de dados sem confirmar).

---

## 3. Fase 1 — EPIC por tela (o núcleo do SDD)

Para **cada tela** listada no `GAP_ANALYSIS.md` com status `CRIAR` ou `ATUALIZAR`, crie uma pasta:

```
specs/<numero-bloco>-<slug-do-bloco>/<slug-da-tela>/
    spec.md
    plan.md
    tasks.md
```

### 3.1 `spec.md` — o EPIC da tela

Use exatamente esta estrutura:

```markdown
# EPIC: <Nome da tela> (<Bloco>)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design:
- Rota/arquivo no código (existente ou proposto):
- Ator(es): usuário final | empresa | ambos

## 2. História da funcionalidade
Como <ator>, quero <ação>, para que <benefício>.

### Cenários (Given/When/Then)
- Cenário: estado vazio (sem dados ainda)
- Cenário: carregamento
- Cenário: sucesso com dados reais
- Cenário: erro de rede/permissão
- Cenário: validação de formulário (quando aplicável)
- Cenário(s) específicos da regra de negócio da tela (ex.: upload de exame só aceita JPG/PDF; edição pede confirmação; exclusão pede confirmação e remove do S3 + DynamoDB)

## 3. Estrutura da página
Liste, na ordem visual do Canvas, cada região/componente:
- Cabeçalho / navegação superior
- Blocos de conteúdo (cards, listas, formulários, gráficos)
- Estados visuais (vazio, erro, sucesso, loading) tal como desenhados
- Rodapé / navegação inferior

## 4. Mapa de navegação (todo botão/elemento clicável)
| Elemento | Tipo (botão/ícone/card/link) | Ação | Destino (rota/tela) | Condição |
|---|---|---|---|---|

## 5. Mapa de dados (toda informação exibida ou capturada)
| Campo/Componente | Origem do dado | Fonte técnica (tabela DynamoDB / bucket S3 / atributo Cognito / API) | Tipo | Validação | Comportamento offline/erro |
|---|---|---|---|---|---|

## 6. Requisitos não-funcionais específicos
(LGPD, acessibilidade, performance, mensagens de erro amigáveis, limites de upload, etc.)

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas do Claude Design
- [ ] Todos os botões do mapa de navegação estão conectados
- [ ] Todos os campos do mapa de dados estão lendo/gravando dado real
- [ ] Estados de vazio/erro/loading implementados
- [ ] Nenhum texto sugere diagnóstico médico definitivo (quando aplicável ao módulo de IA)
```

### 3.2 `plan.md` — plano técnico

- Componentes novos vs. reaproveitados (referencie os átomos/moléculas do design system extraído em `DESIGN_TOKENS.md`).
- Arquivos a criar/editar.
- Contratos de API/consulta (formato de request/response com DynamoDB, chave de partição usada, path do S3, etc.).
- Dependências novas, se estritamente necessárias, com justificativa.

### 3.3 `tasks.md` — checklist ordenado de implementação

Lista de tarefas pequenas e verificáveis (ex.: "criar componente `ExameCard`", "conectar botão 'Novo Exame' à rota `/exames/novo`", "implementar upload seguro para S3 com validação de MIME type"), marcadas como `[ ]` e depois `[x]` conforme execução.

---

## 4. Fase 2 — Ordem de execução recomendada

> **Esta seção é o plano original, mantido como referência histórica.** A ordem real, ajustada à descoberta feita na Fase 0, está registrada em `specs/design/GAP_ANALYSIS.md` na seção "Ordem de execução proposta" — consulte-a em vez desta lista, e trate `RELATORIO_SDD_SUASAUDE.md` (Fase -1) como a indicação mais atual de qual item dessa ordem já foi concluído e qual é o próximo.

Salvo achado diferente na descoberta (Fase 0), siga esta priorização — ela reflete o escopo de MVP definido no artigo do TCC (núcleo em exames, expandindo por módulo):

1. **Base e Autenticação** (Bloco 1 — login, cadastro, recuperação de senha, onboarding)
2. **Exames** (núcleo do MVP: listar, cadastrar, editar, excluir, upload/validação JPG/PDF, status pendente/realizado)
3. **Dashboard/Painel** (indicadores fisiológicos, histórico cronológico, alertas)
4. **Receitas e Medicamentos** (cadastro, lembretes de horário)
5. **Consultas** (agendamento, histórico, lembretes)
6. **Vacinação** (integração com dados públicos de campanhas)
7. **Wearables** (sincronização de dados fisiológicos)
8. **Módulo de IA** (análise preliminar de exames — atenção redobrada aos critérios de responsabilidade/LGPD)
9. **Perfil/Empresa** (ator empresa: cadastro de funcionário, solicitação de exames/consultas, painel de acompanhamento), se este ator existir no design

Ajuste esta ordem à realidade dos Blocos efetivamente encontrados no Claude Design durante a Fase 0 — a lista acima é um guia, não uma imposição sobre a descoberta real.

---

## 5. Fase 3 — Implementação, bloco por bloco

Para cada EPIC (nessa ordem de prioridade):

1. Releia `spec.md` e `plan.md`.
2. Implemente a tela reaproveitando o design system extraído (tokens de cor/tipografia/espaçamento centralizados — não hardcode valores soltos pelo código).
3. Conecte cada item do **mapa de navegação** à rota real.
4. Conecte cada item do **mapa de dados** à fonte real (DynamoDB/S3/Cognito), incluindo tratamento de loading/erro/vazio.
5. Atualize `tasks.md` marcando o progresso.
6. Faça commits granulares por tela/EPIC, com mensagens referenciando o caminho da spec (ex.: `feat(exames): implementa tela de listagem conforme specs/02-exames/listagem/spec.md`).
7. Ao final de cada Bloco inteiro, rode lint/typecheck/testes existentes antes de seguir para o próximo Bloco.

---

## 6. Fase 4 — QA e validação final

Depois de todos os Blocos priorizados implementados:

- Confira visualmente cada tela contra o respectivo Canvas do Claude Design.
- Confirme que nenhum botão do app leva a uma tela inexistente ou a "nada acontece".
- Confirme que nenhum campo exibe dado mockado sem estar sinalizado como pendência conhecida.
- Atualize o status de cada linha em `GAP_ANALYSIS.md` para `CONCLUÍDO` (e corrija o "Resumo de contagem" no mesmo arquivo — ele é fácil de esquecer e fica contradizendo a tabela por tela se não for atualizado junto).
- **Regenere** `specs/RELATORIO_SDD_SUASAUDE.md` (releia o código/git log real, não apenas edite incrementalmente) com um resumo executivo: quantas telas foram criadas/atualizadas, quais módulos ficaram pendentes e por quê, e quais decisões técnicas relevantes foram tomadas — este relatório pode alimentar diretamente a seção de "Resultados" do artigo do TCC, **e é também o mecanismo pelo qual a próxima sessão (sem histórico desta conversa) retoma o trabalho** — ver Fase -1.

---

## 7. Regras de execução para você, Claude Code

- Não pule a Fase 0. É proibido começar a editar telas antes de existir `DESIGN_INVENTORY.md`, `CODE_INVENTORY.md` e `GAP_ANALYSIS.md`.
- Se o Canvas de uma tela for ambíguo (ex.: não fica claro qual dado real alimenta um card), documente a ambiguidade no `spec.md` da própria tela e proponha a interpretação mais coerente com o restante do app e com o artigo do TCC — não trave a execução, mas deixe rastreável.
- Trabalhe um Bloco por vez até o fim (spec → plan → tasks → implementação → QA do bloco) antes de iniciar o próximo.
- Sempre que uma tela do design pressupor uma funcionalidade de backend que ainda não existe (ex.: endpoint de recomendação de exames), implemente a interface completa e isole a integração pendente atrás de um serviço bem nomeado (ex.: `examRecommendationService`), documentando isso como pendência no `GAP_ANALYSIS.md` — não simule dados falsos de forma silenciosa.