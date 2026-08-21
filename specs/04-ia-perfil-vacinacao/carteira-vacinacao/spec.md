# EPIC: Carteira de Vacinação (Bloco 4)

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: tela **4e** ("Carteira de vacinação") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 190–227). Sem `sc-if`/estados dinâmicos no markup — apenas dados de exemplo estáticos (banner de campanha + 2 cards "Próximas recomendadas" + 3 cards "Histórico de doses"), então os 4 estados padrão (`DESIGN_TOKENS.md` §4) e as variações de urgência abaixo são inferidos, não copiados literalmente do Canvas.
- Rota/arquivo no código (a criar): `src/app/(app)/vaccination.tsx` (rota `/vaccination`) → renderiza `src/screens/VaccinationScreen.tsx`, alimentado por um novo `src/hooks/useVaccinationData.ts`. Rota já antecipada (mas não implementada) em `specs/00-fundacao/navegacao/plan.md` §2/§7 como item do hub "Mais" — ver §4 abaixo para reconciliação.
- Ator(es): usuário final (paciente), consultando seu próprio histórico de vacinação e vacinas pendentes/atrasadas.
- **Prioridade: P2** (`GAP_ANALYSIS.md`, Bloco 4, linha 56), status `CRIAR` — nenhuma tela/rota de vacinação existe hoje no código (confirmado: `grep -ril "vacina|vaccin" src` não retornou nenhum arquivo).
- **Esta é a EPIC de decisão de schema** (constituição, regra 5: "Mudança de schema é decisão explícita e documentada, nunca efeito colateral"; regra 6: cada tela `CRIAR`/`ATUALIZAR` ganha `spec.md`+`plan.md`+`tasks.md` própria). É também a EPIC que **destrava** a pendência já registrada em `specs/03-exames-receitas/prevencao/plan.md` §2.5: o banner de campanha de vacinação da tela 3e ("Prevenção") fica oculto até esta EPIC definir seu schema — ver `plan.md` §5 para a reconciliação formal.

## 2. História da funcionalidade
Como usuário final, quero ver um resumo das vacinas que preciso tomar (com destaque claro para as atrasadas), meu histórico de doses já aplicadas (com data e local), e um aviso sobre campanhas de vacinação em andamento, para manter minha carteira de vacinação em dia e saber onde/quando fui vacinado no passado.

### Cenários (Given/When/Then)

- **Estado vazio (nenhuma vacina registrada):**
  Given o usuário autenticado não possui nenhum registro `VaccineDose` salvo (nem pendente nem aplicada)
  When a tela `/vaccination` termina de carregar (`useVaccinationData` retorna listas "próximas recomendadas" e "histórico" vazias, `isLoading: false`, `errorMessage: null`)
  Then a tela exibe o estado vazio do padrão de 4 estados (`DESIGN_TOKENS.md` §4: ícone 56×56 em tile `#E8F5EE`/`#C7E8D6`, mensagem "Você ainda não tem vacinas registradas." + CTA primário "Adicionar vacina") em vez das seções "Próximas recomendadas"/"Histórico de doses"; o banner de campanha (se houver uma campanha ativa configurada) continua visível mesmo nesse estado, pois é conteúdo institucional independente do histórico do usuário (ver `plan.md` §4).

- **Carregando:**
  Given a tela `/vaccination` é aberta
  When `useVaccinationData` está buscando os dados e `status === 'loading'`
  Then a tela mostra o padrão de skeleton (`ScreenSkeleton`, já implementado em outras telas) equivalente ao "Carregando seus dados..." documentado em `DESIGN_TOKENS.md` §4.

- **Erro:**
  Given a busca de dados de vacinação falha (rede indisponível, erro do Amplify)
  When o hook captura o erro e define `status === 'error'`
  Then a tela exibe o callout de erro padrão (`DESIGN_TOKENS.md` §4: card vermelho, ícone "!", mensagem, botão outline "Tentar novamente"), reaproveitando o componente `EmptyState tone="error"` + `onRetry` já usado em `MedicinesScreen`/`ExamsScreen`.

- **Dose pendente vs. atrasada (diferença de urgência visual):**
  Given existem itens em "Próximas recomendadas" derivados do calendário vacinal do usuário
  When um item ainda não venceu seu prazo/janela recomendada (ex.: campanha anual em andamento, ainda dentro do período)
  Then o card exibe o badge neutro-amber "Pendente" (ícone-círculo "!" `#8A5300` sobre fundo `#8A5300`, pill `background:#FFF3DF`, texto `600 15px #8A5300`) — igual ao card "Influenza (gripe)" do Canvas (linha 201).
  Given um item já passou do prazo/intervalo recomendado (ex.: reforço decenal vencido)
  When a seção "Próximas recomendadas" renderiza esse item
  Then o card exibe o badge de maior urgência "Atrasada" (ícone-círculo "!" `#B3261E`, pill `background:#FDECEA`, texto `600 15px #B3261E`) — igual ao card "Dupla adulto (dT)" do Canvas (linha 205); a diferença visual entre os dois badges (âmbar vs. vermelho) é a única sinalização de gravidade — nunca a mesma cor para os dois estados, conforme regra de "nunca cor sozinha, sempre badge com ícone + texto" (`DESIGN_TOKENS.md` §4 "Status badges/pills").

- **Histórico com múltiplas doses:**
  Given o usuário tem 3+ registros de `VaccineDose` com `appliedDate` preenchido
  When a seção "Histórico de doses" renderiza
  Then cada item aparece como card com nome da vacina + número da dose (quando aplicável, ex. "Hepatite B · 3ª dose"), badge verde "Aplicada" (ícone-círculo "✓" `#10794E`, pill `background:#E8F5EE`, texto `600 15px #0C6341`), e linha de apoio "Aplicada em {data} · {local}" (`400 16px #55605C`) — ordenados do mais recente para o mais antigo, reproduzindo exatamente o padrão dos 3 cards do Canvas (linhas 211–222: Hepatite B, Influenza, Febre amarela).

## 3. Estrutura da página
Ordem visual observada no markup (4e), de cima para baixo, dentro do "phone frame" 390×844:

1. Status bar mock (hora "9:41" + ícone de sinal) — decorativo, não implementar.
2. Cabeçalho: botão "‹" voltar (48×48, radius 14, borda `#DFE3E1`, fundo branco) + título "Carteira de vacinação" (`600 20px #141817`).
3. Banner de campanha de vacinação: fundo `#E8F5EE`, borda `#C7E8D6`, radius 16px, padding 14px, ícone de seringa/cruz em tile verde `#10794E` 24×24 + texto "Campanha de vacinação contra a gripe até 30/09 nas unidades de saúde." (`400 16px #0C6341`) — conteúdo institucional, não dado do usuário (ver `plan.md` §4 para a decisão de fonte).
4. Seção "Próximas recomendadas" (`600 20px` título, margem inferior 10px): lista vertical (`gap:10px`) de cards (`#fff`, borda `#EFF1F0`, radius 14, padding 14) cada um com: nome da vacina (`600 17px #141817`) + descrição curta abaixo ("Dose anual · campanha até 30/09" / "Reforço a cada 10 anos", `400 16px #55605C`), e à direita um badge (pill 999px) "Pendente" (âmbar) ou "Atrasada" (vermelho) conforme cenário de urgência acima.
5. Seção "Histórico de doses" (`600 20px` título): lista vertical (`gap:10px`) de cards, cada um com: nome + dose ("Hepatite B · 3ª dose") + "Aplicada em {data} · {local}" abaixo, e badge verde "Aplicada" à direita.
6. Home-indicator bar decorativa (não é bottom nav — Canvas não desenha a tab bar nesta tela, consistente com ela ser acessada via "Mais", uma tela de segundo nível).

Fora do escopo visual desta tela (4e), mas relevante para o schema: nenhum formulário de adição/edição de dose é desenhado no Canvas para este Bloco — ver `plan.md` §6 para a proposta de CTA/fluxo de cadastro manual (necessário para o estado vazio e para popular dados reais, já que não há integração de fonte pública de calendário vacinal nesta fase).

## 4. Mapa de navegação

| Elemento | Tipo | Ação | Destino | Condição |
|---|---|---|---|---|
| Botão "‹" (cabeçalho) | Botão | Volta | Tela anterior (`router.back()`) — chegada esperada via hub "Mais" (`/more`), não via bottom tab direta | Sempre visível |
| Card "Próximas recomendadas" | Item de lista | Nenhuma navegação desenhada no Canvas (tela somente leitura) | — | Fora de escopo desta EPIC — ver `plan.md` §6 para proposta de fluxo de registro manual (CTA separado, não o card em si) |
| Card "Histórico de doses" | Item de lista | Nenhuma navegação desenhada no Canvas (tela somente leitura) | — | Idem acima |
| CTA do estado vazio ("+ Adicionar vacina") | Botão | Navega/abre fluxo de cadastro manual | A definir em `plan.md` §6 (proposta: bottom sheet ou tela dedicada, fora do escopo visual do Canvas 4e) | Visível só quando não há nenhum `VaccineDose` cadastrado |
| Botão "Tentar novamente" (estado de erro) | Botão outline | Reexecuta busca | Permanece na tela | Visível só em `status === 'error'` |
| Menu "Mais" → item "Carteira de vacinação" | Item de lista (`MoreScreen`) | `router.push('/vaccination')` | `/vaccination` | Ponto de entrada principal; reconcilia com `specs/00-fundacao/navegacao/plan.md` §7, que hoje recomenda a Opção (b) — não incluir o item em `MORE_MENU_ITEMS` até 4e existir. Esta EPIC destrava essa tarefa de follow-up: uma vez implementada, `vaccination` deve ser adicionado a `MORE_MENU_ITEMS` (ícone sugerido: seringa/`medical`) e a `MORE_ROUTE_PREFIXES` (`getActiveTabId` retorna `'more'` para `/vaccination`, já antecipado na tabela da fundação). |

## 5. Mapa de dados

**Situação atual:** nenhuma fonte de dados existe — nem mock, nem model Amplify (confirmado via grep: nenhum arquivo em `src` referencia "vacina"/"vaccin"). Este é o gap central desta EPIC (regra 2 e 5 da constituição).

**Decisão proposta (detalhada em `plan.md` §2–§3):** criar models dedicados `Vaccine` (catálogo/prescrição recorrente) e `VaccineDose` (evento — aplicada ou pendente), registrados em `amplify/data/resource.ts` no mesmo padrão de `medicalDocumentsSchema`/`appointmentsSchema`/`medicinesSchema`.

| Campo exibido no Canvas | Origem do dado (proposta) | Campo do model | Tipo | Observação |
|---|---|---|---|---|
| Nome da vacina ("Influenza (gripe)", "Dupla adulto (dT)", "Hepatite B") | Real (novo schema) | `name` | string, obrigatório | — |
| Descrição curta ("Dose anual · campanha até 30/09", "Reforço a cada 10 anos") | Real (derivado) | Composto a partir de `recommendedIntervalYears`/`isCampaign`/`campaignLabel` — não um campo de texto livre fixo | — | Ver `plan.md` §2 para a decisão de compor esse texto em vez de armazená-lo pronto |
| Status "Pendente" vs. "Atrasada" | Real (derivado) | Calculado a partir de `appliedDate` (nulo) + `dueDate`/janela recomendada vs. data atual | — | Nunca um campo `status` persistido diretamente — evita inconsistência entre o campo e a data real (mesmo princípio de "nunca falso positivo" adotado em `prevencao/plan.md` §2.2) |
| Número da dose ("3ª dose") | Real (novo schema) | `doseNumber` | int, opcional | Nem toda vacina exibe número de dose (ex. campanha anual de gripe não numera) |
| Data de aplicação ("Aplicada em 14/03/2025") | Real (novo schema) | `appliedDate` | date, **nullable** — nulo = ainda não aplicada (item fica em "Próximas recomendadas") | Campo central da decisão de schema — ver `plan.md` §2 |
| Local ("UBS Jardim América", "Clínica Bem Viver") | Real (novo schema) | `location` | string, opcional (só preenchido quando `appliedDate` existe) | — |
| Intervalo de reforço recorrente (ex. dT a cada 10 anos) | Real (novo schema) | `recommendedIntervalYears` | int, opcional | Usado para calcular a próxima data devida após uma dose aplicada, gerando a próxima recomendação automaticamente |
| Badge "Aplicada" | Real (derivado) | `appliedDate` não nulo ⇒ sempre "Aplicada" | — | — |
| Banner de campanha de vacinação | **Ambíguo — precisa de decisão de fonte de conteúdo** | Não é um campo do model `Vaccine`/`VaccineDose` (não é dado do usuário) | — | Ver `plan.md` §4: proposta de config estática/admin (`src/config/vaccinationCampaigns.ts`) como primeira fase, com nota explícita de que integração com fonte pública de dados (ex. API do Ministério da Saúde/PNI) é uma pendência maior, fora do escopo desta EPIC — reforça a pendência já citada em `GAP_ANALYSIS.md` (dados públicos de campanha) |

Nenhum campo desta tela pode permanecer mockado após esta EPIC (regra 2). O único conteúdo que **não** vem do dado do usuário — o banner de campanha — é tratado explicitamente como conteúdo institucional/estático (não dado mockado disfarçado de real), documentado em `plan.md` §4, consistente com a regra 2 ("placeholders só são aceitáveis quando documentados explicitamente como pendência técnica").

## 6. Requisitos não-funcionais específicos
- **Paleta de urgência (Pendente vs. Atrasada):** usar exatamente os tokens semânticos de aviso (`#8A5300`/`#FFF3DF`/`#F0D6A4`) para "Pendente" e de erro (`#B3261E`/`#FDECEA`/`#F3C9C5`) para "Atrasada", conforme `DESIGN_TOKENS.md` §1 — nunca usar a mesma cor para os dois estados, pois a distinção de urgência é o requisito central desta tela.
- **Badge sempre ícone + texto + pill:** nunca cor isolada, conforme regra explícita do Canvas 1a e `DESIGN_TOKENS.md` §4 "Status badges/pills" (regra reforçada aqui porque a diferenciação Pendente/Atrasada é crítica para a usabilidade — um usuário com baixa visão de cor não pode depender só da cor).
- **LGPD:** dados de vacinação são dados de saúde sensíveis (LGPD) — os novos models `Vaccine`/`VaccineDose` devem usar `allow.owner()` (mesmo padrão de `MedicalDocument`/`Appointment`/`Medicine`), garantindo que cada usuário só acesse seus próprios registros; nenhuma mudança de fluxo de consentimento é necessária além do onboarding já existente.
- **Conteúdo institucional vs. dado do usuário:** o banner de campanha deve ser visualmente e logicamente distinto do histórico pessoal — não pode ser confundido com um registro do usuário nem contar como "vacina aplicada"/"pendente" nas listas.
- **Nenhuma quebra de dados existentes:** como não existe hoje nenhum dado real de vacinação persistido, a criação do schema é puramente aditiva — não há risco de migração/corrupção de dados existentes (regra 5), mas `amplify/data/resource.ts` deve ser editado com cuidado para não afetar os models já registrados.
- **Coordenação com 3e (Prevenção):** esta EPIC deve deixar claro (aqui e em `plan.md` §5) que sua entrega desbloqueia a tarefa de follow-up documentada em `specs/03-exames-receitas/prevencao/plan.md` §2.5 (banner de vacinação da tela de Prevenção, hoje oculto).

## 7. Critérios de aceite
- [ ] Estrutura visual bate com o Canvas 4e: cabeçalho com botão voltar + título, banner de campanha, seção "Próximas recomendadas" com badges Pendente/Atrasada corretamente diferenciados, seção "Histórico de doses" com badges "Aplicada" + data + local.
- [ ] Decisão de schema (Opção A ou B, `plan.md` §2) implementada: models criados em `amplify/data/schemas/` e registrados em `amplify/data/resource.ts`, com `allow.owner()`.
- [ ] `src/hooks/useVaccinationData.ts` (novo) lê dados reais (sem nenhum mock), calcula "Pendente" vs. "Atrasada" a partir de datas reais (nunca hardcoded).
- [ ] Estado vazio de página inteira quando não há nenhum registro de vacinação, com CTA de cadastro manual.
- [ ] Estado de carregamento (skeleton) e erro (callout + retry) conformes a `DESIGN_TOKENS.md` §4.
- [ ] Diferenciação visual clara entre "Pendente" (âmbar) e "Atrasada" (vermelho), nunca a mesma cor.
- [ ] Histórico de múltiplas doses ordenado do mais recente para o mais antigo, exibindo nome + número de dose (quando houver) + data + local.
- [ ] Banner de campanha implementado como conteúdo institucional/estático (não dado mockado disfarçado), com a fonte documentada em `plan.md` §4.
- [ ] Rota `/vaccination` criada e reconciliada com `specs/00-fundacao/navegacao/plan.md` (adicionada a `MORE_MENU_ITEMS`/`MORE_ROUTE_PREFIXES`).
- [ ] Tarefa de follow-up para desbloquear o banner de vacinação da tela 3e (Prevenção) documentada/criada, consumindo o mesmo schema.
- [ ] Nenhum dado mockado remanescente nesta tela (regra 2 da constituição), exceto o banner institucional explicitamente documentado como tal.
