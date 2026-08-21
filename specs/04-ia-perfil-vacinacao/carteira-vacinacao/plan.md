# PLAN: Carteira de Vacinação (Bloco 4)

## 1. Diagnóstico — estado atual vs. design

Não existe nenhum código relacionado a vacinação hoje: `grep -ril "vacina|vaccin" src` retorna vazio. Nenhuma rota, tela, hook, mock ou model. A tela 4e do Canvas ("Carteira de vacinação") é 100% nova (`CRIAR`), com três blocos de conteúdo: banner de campanha (institucional), "Próximas recomendadas" (vacinas ainda não aplicadas, com urgência Pendente/Atrasada) e "Histórico de doses" (vacinas já aplicadas, com data e local).

## 2. Decisão de schema — model dedicado vs. reaproveitar `MedicalDocument` (constituição, regra 5)

**Contexto:** `GAP_ANALYSIS.md` pendência #3 registra explicitamente a ambiguidade: "Pode reaproveitar `MedicalDocument` (tipo vacina) ou exigir schema novo — decisão a documentar." Esta seção resolve essa ambiguidade.

### Opção A — models dedicados `Vaccine`/`VaccineDose`

```typescript
import { a } from '@aws-amplify/backend';

export const vaccinationSchema = {
  VaccineDose: a
    .model({
      name: a.string().required(),               // "Influenza (gripe)", "Dupla adulto (dT)", "Hepatite B"
      doseNumber: a.integer(),                     // opcional — "3ª dose"; ausente = vacina sem numeração (ex. campanha anual)
      appliedDate: a.date(),                        // NULLABLE — nulo = ainda não aplicada ("Próximas recomendadas")
      location: a.string(),                         // só preenchido quando appliedDate existe — "UBS Jardim América"
      dueDate: a.date(),                            // data/janela recomendada (quando appliedDate é nulo) — base do cálculo Pendente/Atrasada
      recommendedIntervalYears: a.integer(),         // reforços recorrentes (ex. dT = 10) — usado para gerar a próxima recomendação após uma dose aplicada
      isCampaign: a.boolean().default(false),        // true = vinculada a uma campanha sazonal (ex. gripe), usado para compor a descrição "Dose anual · campanha até {data}"
      notes: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
};
```

Registro aditivo em `amplify/data/resource.ts`, mesmo padrão de `medicalDocumentsSchema`/`appointmentsSchema`/`medicinesSchema`.

**Vantagens:**
- `appliedDate` nullable modela diretamente o conceito central da tela: uma "dose" pode existir como recomendação futura (sem arquivo, sem data de aplicação, só uma expectativa) ou como registro histórico (com data e local). Isso é o que `MedicalDocument` não representa — seu único análogo de "não realizado" seria um documento que não existe, o que não é uma linha de dado, é ausência de dado.
- `dueDate`/`recommendedIntervalYears` dão uma base real para calcular "Pendente" vs. "Atrasada" sem heurística de texto — diferente da Opção A do `plan.md` de Prevenção (3e), que aceitou heurística textual como trade-off aceitável ali; aqui a estrutura de dados explícita é barata (campos primitivos, sem custo de complexidade adicional) e evita o mesmo risco de falso "Em dia"/"Pendente" por descasamento de nome de arquivo.
- Um item "Próximas recomendadas" pode ser gerado automaticamente após uma dose aplicada com `recommendedIntervalYears` definido (ex.: aplicar dT hoje ⇒ sistema já sabe a próxima é em +10 anos), sem exigir que o usuário cadastre manualmente cada ocorrência futura.
- Não há upload de arquivo/S3 envolvido — vacinação não é um documento anexado (comprovante em papel/carteirinha física), é um evento estruturado (nome + data + local + dose). Forçar isso em `MedicalDocument` (que exige `s3FileName: a.string().required()`) tornaria o campo de arquivo obrigatório sem sentido para o caso "pendente, ainda não aplicada".

**Desvantagens:**
- Introduz uma tabela nova (mais uma decisão de schema, mais uma migração), quando o app já tem `MedicalDocument` cobrindo "coisas de saúde do usuário com data".
- Duplica parcialmente o conceito de "documento de saúde com data" que já existe.

### Opção B — reaproveitar `MedicalDocument` com `documentType` estendido

Estender `documentType: a.enum(['exam', 'prescription'])` para `a.enum(['exam', 'prescription', 'vaccine'])`, usando os campos já existentes (`documentName`, `documentDate`, `expirationDate`) para modelar cada dose.

**Vantagens:**
- Zero tabelas novas — reaproveita 100% do model e do padrão de acesso já implementado (regra 3 da constituição, "stack existente é respeitada antes de expandida").
- Menor superfície de código (um hook a menos para manter, um schema a menos para registrar).

**Desvantagens (motivo da rejeição):**
- `s3FileName: a.string().required()` é **obrigatório** no schema atual de `MedicalDocument` — todo documento exige um arquivo anexado no S3. O caso central desta tela ("Próximas recomendadas" — uma vacina que o usuário **ainda não tomou**, sem nenhum arquivo) não tem o que anexar. Contornar isso exigiria tornar `s3FileName` opcional no model existente, o que é uma mudança de schema em uma tabela **já usada em produção pelas telas 3a/3b/3c** (regra 5 da constituição: "Cognito, dados já persistidos no DynamoDB e uploads existentes no S3 não podem ser corrompidos por refatoração de UI"). Um campo obrigatório virando opcional é tecnicamente não-destrutivo no DynamoDB, mas é uma mudança de contrato que afeta toda tela que já depende de `MedicalDocument.s3FileName` sempre existir — risco desnecessário para uma tela nova, isolada.
- Não há campo natural para "data recomendada mas não aplicada" (`dueDate`) nem para "intervalo de reforço" (`recommendedIntervalYears`) — `documentDate`/`expirationDate` descrevem quando um documento foi emitido/expira, não quando uma próxima dose é devida. Adicionar esses campos ao `MedicalDocument` poluiria o schema com campos que só fazem sentido para `documentType === 'vaccine'`, tornando o model menos coeso (campos nulos para 2 de 3 tipos de documento).
- `doseNumber`/`location` (UBS/clínica) também não têm equivalente — `documentName` é texto livre único, forçaria concatenar "Hepatite B · 3ª dose" como string sem estrutura, perdendo a possibilidade de ordenar/filtrar por dose ou gerar a próxima recomendação automaticamente.

### Decisão: **Opção A — models dedicados**

Justificativa central em uma linha: **o caso "Próximas recomendadas" (vacina pendente/atrasada, sem arquivo, sem data de aplicação) não tem representação natural em `MedicalDocument`, cujo `s3FileName` obrigatório assume que todo registro é um documento anexado** — forçar esse encaixe exigiria tornar um campo obrigatório de uma tabela em produção opcional (risco de regra 5) só para acomodar uma tela nova, quando um model dedicado, pequeno e aditivo resolve isso sem tocar em nada existente.

## 3. Estrutura do model — histórico + recomendação no mesmo model

Ambos "Próximas recomendadas" e "Histórico de doses" usam o **mesmo** model `VaccineDose`, diferenciados apenas por `appliedDate` ser nulo ou não — evita um segundo model separado "recomendação" vs. "aplicação", pois é o **mesmo conceito** (uma dose de uma vacina) em dois estados possíveis do seu ciclo de vida, não duas entidades diferentes. Isso segue o mesmo raciocínio de simplicidade adotado em `medicamentos/plan.md` §3 (preferir um campo/estado a uma segunda tabela quando o volume/complexidade não justifica normalização adicional).

**Cálculo de status (nunca persistido como campo, sempre derivado):**
```
appliedDate != null            → "Aplicada"
appliedDate == null AND hoje <= dueDate (ou dentro da janela de campanha) → "Pendente"
appliedDate == null AND hoje > dueDate → "Atrasada"
```
Segue o mesmo princípio de segurança adotado em `prevencao/plan.md` §2.2: nunca inferir "Aplicada" por engano — só quando `appliedDate` está genuinamente preenchido.

**Geração de próxima recomendação após dose aplicada com `recommendedIntervalYears`:** ao marcar uma dose como aplicada (ou ao cadastrar uma já aplicada com esse campo preenchido), o client pode opcionalmente criar automaticamente um novo registro `VaccineDose` com `appliedDate: null`, `dueDate: appliedDate + recommendedIntervalYears anos`, mesmo `name`. Documentado aqui como comportamento proposto; a decisão de automatizar isso (vs. deixar 100% manual) fica para a fase de implementação/tasks, não é um requisito bloqueante da spec.

## 4. Fonte de dados do banner de campanha — decisão de conteúdo (não é dado do usuário)

O banner "Campanha de vacinação contra a gripe até 30/09 nas unidades de saúde." é **conteúdo institucional/aviso de saúde pública**, não um dado pessoal do usuário — mesma natureza discutida (e adiada) em `prevencao/plan.md` §2.5.

**Duas fontes possíveis avaliadas:**
- **(a) Config estática/hardcoded no app** (`src/config/vaccinationCampaigns.ts`): lista de campanhas com `{ id, title, message, activeFrom, activeUntil }`, mantida manualmente pelo time. Zero dependência externa, zero custo de integração, mas fica desatualizada sem manutenção contínua (a data "30/09" do Canvas é um exemplo fixo que precisaria ser atualizada a cada ano/campanha real).
- **(b) Integração com API pública de dados de vacinação** (ex. API do PNI/Ministério da Saúde, se existir e for acessível): dado sempre atual, mas é uma integração externa nova (regra 3 da constituição exige justificativa para nova dependência), com risco de disponibilidade/formato de dado fora do controle do projeto, e escopo claramente maior que uma tela isolada de TCC.

**Decisão para esta fase: (a) config estática/admin-configurada.** Justificativa: é aditiva, não introduz dependência externa nova, é suficiente para a fidelidade visual do Canvas (regra 1) e para o escopo de protótipo do TCC. A integração com fonte pública de dados (opção b) fica **explicitamente registrada como pendência técnica não resolvida nesta EPIC** — deve ser adicionada a `GAP_ANALYSIS.md` como um item de pendência própria (ex. "Integração de calendário/campanhas públicas de vacinação"), consistente com a regra 2 da constituição ("Placeholders só são aceitáveis quando documentados explicitamente como pendência técnica").

O banner é renderizado condicionalmente: se não houver nenhuma campanha com `activeFrom <= hoje <= activeUntil` na config, o banner simplesmente não aparece (nunca um banner fixo/genérico sem uma campanha real configurada) — mesmo princípio de "nunca mostrar dado que pareça real sem ser" aplicado a conteúdo institucional.

## 5. Reconciliação com `specs/03-exames-receitas/prevencao/plan.md` §2.5

A EPIC de Prevenção (3e) documentou a decisão de **ocultar completamente** seu próprio banner de campanha de vacinação até esta EPIC (4e) definir o schema — opção (a) daquele plano, já escolhida como recomendação. Esta EPIC confirma e fecha essa dependência:

- **Schema de referência para 3e reutilizar:** o mesmo `VaccineDose` (Opção A, §2 acima) — 3e pode consultar `client.models.VaccineDose.list()` filtrando por `appliedDate == null` para saber se deve mostrar seu próprio banner condicional (ex. "Você tem vacinas pendentes" ou similar), e/ou consultar a mesma config estática de campanhas (§4) para exibir o mesmo aviso institucional.
- **Config de campanha compartilhada:** `src/config/vaccinationCampaigns.ts` (criado por esta EPIC) deve ser importado por 3e também, evitando duas fontes divergentes do mesmo aviso (a preocupação central levantada em `prevencao/plan.md` §2.5 — "não introduzir uma segunda fonte de 'dado de vacinação' que precisaria ser reconciliada com 4e depois").
- **Tarefa de follow-up:** registrada em `tasks.md` §"Follow-up cross-EPIC" — não é implementada aqui (fora do escopo de arquivos desta EPIC, que não deve tocar em `src/screens/PreventionScreen.tsx`), mas deve ser criada como tarefa rastreável para quando a Prevenção for revisitada.

## 6. Fluxo de cadastro manual (CTA do estado vazio / "+ Adicionar vacina")

O Canvas 4e não desenha nenhum formulário de cadastro (tela somente leitura com dados de exemplo). Como não há integração de calendário vacinal público nesta fase (§4), o usuário precisa de um jeito de **registrar manualmente** uma dose (aplicada ou uma recomendação futura) para a tela deixar de estar vazia — do contrário a regra 2 da constituição ("nenhum dado mockado permanece") fica satisfeita tecnicamente, mas a tela nunca tem conteúdo real para nenhum usuário novo.

**Proposta:** bottom sheet simples ("Adicionar vacina" — nome, dose aplicada? sim/não, se sim: data + local; se não: data recomendada opcional), reaproveitando o padrão de bottom sheet já documentado em `DESIGN_TOKENS.md` §4 (visto em 3a "Adicionar documento"). Não é uma tela cheia dedicada — o volume de campos é pequeno o suficiente para um sheet. Este fluxo **não está desenhado no Canvas** — é uma extensão necessária e documentada (regra 8, "ambiguidade é documentada, não travada"), a validar em revisão de design antes da implementação.

## 7. Escopo da mudança

**Dentro de escopo:**
- `amplify/data/schemas/vaccination.ts` — **criar** (novo arquivo), model `VaccineDose` conforme §2–§3.
- `amplify/data/resource.ts` — registrar `vaccinationSchema`, aditivo.
- `src/config/vaccinationCampaigns.ts` — **criar**, config estática de campanhas (§4).
- `src/types/models.ts` — adicionar tipos de apresentação para `VaccineDose` (ou reaproveitar o tipo gerado do Amplify diretamente).
- `src/hooks/useVaccinationData.ts` — **criar**, busca `client.models.VaccineDose.list()`, deriva "Próximas recomendadas" (status Pendente/Atrasada) e "Histórico de doses" (ordenado por `appliedDate` desc), resolve a campanha ativa via `vaccinationCampaigns.ts`.
- `src/screens/VaccinationScreen.tsx` — **criar**, estrutura conforme `spec.md` §3.
- `src/app/(app)/vaccination.tsx` — **criar**, rota fina.
- `src/constants/navigation.ts` — adicionar `vaccination` a `MORE_MENU_ITEMS` e `/vaccination` a `MORE_ROUTE_PREFIXES` (reconciliação com `specs/00-fundacao/navegacao/plan.md` §7, que hoje recomenda adiar essa entrada até 4e existir — esta EPIC é a confirmação de que 4e existe).
- Bottom sheet de cadastro manual (§6) — componente novo, escopo mínimo (nome, aplicada sim/não, data, local).

**Fora de escopo desta EPIC:**
- Alterar `src/screens/PreventionScreen.tsx`/`prevencao` para de fato consumir o schema e reexibir seu banner — apenas destrava e documenta a tarefa (§5), não implementa lá.
- Qualquer integração com API pública de dados de vacinação (PNI ou similar) — registrada como pendência técnica a adicionar em `GAP_ANALYSIS.md`, não implementada aqui.
- Geração automática de próxima recomendação após dose aplicada (mencionada em §3) — proposta, mas a decisão final de automatizar fica para `tasks.md`/implementação, não é bloqueante desta spec.
- Notificações/lembretes de vacina próxima do prazo — mesma pendência #14 já registrada em `GAP_ANALYSIS.md` ("Sistema de notificações inexistente"), não resolvida aqui.

## 8. Riscos / decisões a documentar
- **`dueDate` sem fonte de calendário vacinal oficial:** como não há integração com fonte pública (§4), `dueDate` de itens "Próximas recomendadas" depende inteiramente do cadastro manual do usuário (ou da geração automática após uma dose aplicada com `recommendedIntervalYears`) — não há um catálogo pré-populado de "vacinas que todo adulto deveria tomar". Isso é uma limitação de escopo de TCC, documentada aqui e a citar em `GAP_ANALYSIS.md`.
- **Dois models novos (`VaccineDose` isolado) vs. reaproveitar `MedicalDocument`:** decisão tomada em §2 com trade-off explícito — aceito o custo de uma tabela nova em troca de representar corretamente o estado "pendente sem arquivo", que `MedicalDocument` não modela sem alterar um campo obrigatório de uma tabela em produção.
- **Banner institucional pode ficar desatualizado** (config estática, §4) — risco aceito nesta fase, mitigado por renderização condicional (nunca mostra uma campanha fora da janela `activeFrom`/`activeUntil`) em vez de texto sempre fixo.
- **Fluxo de cadastro manual não está no Canvas** (§6) — é uma extensão necessária e documentada (regra 8), não uma tela definida pelo design; validar formato exato (bottom sheet vs. tela dedicada) em revisão de design antes da implementação.
