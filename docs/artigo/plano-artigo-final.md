# Hand-off plan: final article (TCC 2) for SuaSaúde

**For:** the writer AI that will revise `Artigo1semestre.docx` into the final article, using `Template_para_TCC_2_-_Vers_o_final_-_TI.docx`.
**From:** a technical read of the repository `pgmaximo/trabalho_conclusao_curso` (renamed to `pgmaximo/suasaude`, PR #13) at commit `1f96bbc` (2026-11-05), plus the two attached .docx files.
**Language note:** this plan is in English. The article is in **pt-BR**. Repo terms are quoted in Portuguese as they appear in the code and docs, so you can reuse them.

**How to read the references:** `path` means a file in the repo. `D14` means decision D14 in `estudos-ia/00-visao/decisoes.md`. `DS7` means decision DS7 in `specs/10-finalizacao-codigo/01-melhorias-ia/decisoes/conferencia-no-sandbox.md`, summarized in `specs/10-finalizacao-codigo/01-melhorias-ia/conferencia-sandbox/README.md`. Short hashes are commits, and `#N` is a PR in `pgmaximo/trabalho_conclusao_curso`.

---

## 0. Ground rules for the writer (read first)

0. **The attached draft is the first-semester version** (TCC 1), written months ago at the start of the project (author's confirmation, 2026-11-14). Where it differs from the repo, the difference is the project's evolution, not a mistake. **Rewrite each section from the current repo state**; keep from the draft only the framing and literature it already has (mHealth, SDG 3, AI as support). Don't patch it line by line, and don't describe the changes as corrections in the article.
1. **Write no fact the repo or the draft can't back.** Every number below has a source. If a number you need is missing, it belongs in Section 4 (open questions). Don't estimate it.
2. **What the AI does changed most since the first version, and this matters most.** The draft says the AI gives "interpretações preliminares e sugestões de leitura" of exams and "identifica possíveis padrões e oferece orientações" (draft §2, §3.2). The finished system **refuses** to interpret on purpose: it never says a value is high, low, good or bad, never names a condition, never picks which row of a reference table applies, and never suggests a dose (`estudos-ia/06-encerramento/limitacoes.md` §1, D11, D37, D38). The exam AI **transcribes and normalizes**. The chat AI **retrieves and cites**. This refusal is the thesis of the work, not a missing feature. Reframe the objectives and the introduction around it.
3. **Don't copy the README's privacy wording.** `README.md` says health data is processed "dentro da conta AWS do projeto ... sem envio a provedores de IA de terceiros". The decision record says the opposite and asks the article to say it explicitly: health data *does* go to a third-party service (Amazon Bedrock), in `us-east-1`. That is an international transfer under LGPD art. 33 (D14: "O texto do TCC precisa dizer isso com essas palavras"; `limitacoes.md` §3.3). Use the D14 framing.
4. **Section structure follows the template, not the draft** (see Section 5).
5. **Write no paper prose from this plan.** It is a brief.

---

## 1. Project summary

SuaSaúde is a cross-platform mobile app (Expo SDK 57 / React Native 0.86, TypeScript) on an AWS backend defined as code with Amplify Gen 2 (Cognito, DynamoDB, S3, Lambda). It keeps a person's health records in one place: exam reports and prescriptions, medicines with reminders and drug-interaction alerts, appointments, a vaccination card with public campaign and vaccination-site data, preventive-exam recommendations (USPSTF), and imported smartwatch data.

The core technical contribution is two AI pipelines on Amazon Bedrock (Claude Sonnet 4.6), built so that safety comes from the **structure** of the system and not from instructions to the model (D11):

- **Exam reading (Frente 1).** It reads a PDF or a photo of a lab report and writes one structured row per analyte (`LabResult`). Each row is normalized to a LOINC code and a UCUM-based canonical unit, keeps the original text, and flags low-confidence rows for the user to review. This makes month-to-month series per analyte possible.
- **Chat (Frente 2).** It answers only from the user's own stored data, through read-only tools. It cites the origin of every number. Each answer passes a deterministic language check (rules R1–R5) before display, and it falls back to a fixed-text answer when the model output fails twice.

The wearable pipeline (Arturo's front) imports Samsung Health or Apple Health export files, aggregates 29 daily metrics, computes Pearson correlations, and has Bedrock narrate them.

The work was spec-driven (`specs/constitution.md`) and measured against the real model in recorded rounds.

---

## 2. Decision log

Sections: I = Introdução/Justificativa, Obj = Objetivos, M = Metodologia, DR = Desenvolvimento e Resultados, CF = Considerações Finais (limitations/future work).

| # | Decision | Alternatives considered (evidenced) | Reason chosen | Where in repo | Section |
|---|---|---|---|---|---|
| 1 | Expo/React Native + Amplify Gen 2 (backend as code) | Rationale for the original stack choice is not in the repo beyond the draft's "base de código compartilhada" | Draft §4. The repo's Constitution rule 3 then enforces "respect the stack before expanding it" | `package.json`, `amplify/backend.ts`, `specs/constitution.md` rule 3 | M |
| 2 | Spec-driven development: a constitution plus `spec.md`/`plan.md`/`tasks.md` per screen or EPIC, and TDD as the completion gate | — | Traceability: every change maps to a rule of the constitution | `specs/constitution.md`, `specs/RELATORIO_SDD_SUASAUDE.md`, `specs/10-finalizacao-codigo/README.md` | M |
| 3 | Mocks are allowed only if declared and isolated ("nenhum dado mockado permanece") | — | Constitution rule 2. Inventory of the remaining stubs | `docs/DADOS_MOCKADOS.md` | M / DR |
| 4 | **Amazon Bedrock as the only LLM provider, called from our own Lambda** | Institution's AI server (27B open model), AgentCore Runtime, Bedrock Agents, OpenAI-compatible adapter | Network reachability of the institution's server unknown, shared GPU queue, conflict between forced tool output and extended reasoning, cost of two code paths. Bedrock was already in production for the wearable feature | D2, D3, D4, D10, D14; `estudos-ia/01-estudos/provedor-llm.md`; `estudos-ia/06-encerramento/avaliacao-de-provedores.md` | M / DR |
| 5 | LangChain/LangGraph rejected | LangGraph for the chat tool loop | Guardrail and `toolChoice` are native Bedrock features the abstraction would hide. No official DynamoDB checkpointer. The chat screen needs readable `ChatMessage` rows | D20 (2026-09-16 entry) | M |
| 6 | **Safety as data structure**: no schema field for interpretation, referral to a professional mandatory, plus guardrail plus deterministic check | Relying on the system prompt alone | A model can ignore an instruction; it can't fill a field that doesn't exist | D11; `amplify/functions/ai-language-rules/languageRules.ts` | DR (core) |
| 7 | Front order inverted: extraction before chat | Chat first (screen already existed as a mock), both in parallel | The user's real question was month-to-month comparison of exam analytes, which needs extraction. Bedrock was already proven | D13 (replaces D7) | M |
| 8 | Two document entry points: the exam screen persists data; a chat attachment is used once and persists nothing | Chat as the main entry point | One write pipeline, one data style | D15; `estudos-ia/00-visao/arquitetura-geral.md` | DR |
| 9 | The chat AI is read-only (writes only the conversation) | — | An AI that converses *and* writes clinical data is hard to audit. A test scans the function for write commands | D9; `limitacoes.md` §1 | DR |
| 10 | Chat on a Lambda **Function URL**, outside AppSync, verifying the Cognito JWT itself | Async with polling (the proven pattern), fitting inside 30 s | The AppSync resolver has a 30 s cap and a tool loop exceeds it. Polling is a bad chat experience | D12; `amplify/functions/chat-assistant/auth.ts` (owner taken from the token only); `rateLimit.ts` (20/min per owner, per instance) | DR |
| 11 | Long jobs (extraction, wearable) are async: an AppSync resolver starts a Lambda (fire-and-forget) and the app polls; async retries set to 0 | — | 30 s AppSync cap. Retries would bill Bedrock 2–3 times | `amplify/backend.ts` comments around lines 125–138 and 364–368 | DR |
| 12 | Full analyte normalization on **LOINC** from the start | Small hand-made table that grows; extract without normalizing | Without normalization there is no comparison across labs and months. Cost accepted: the longest item in the project | D16, D26 (pt-BR synonyms come from the LOINC release), D27 (no hand-typed LOINC codes) | M / DR |
| 13 | Canonical unit is the conventional Brazilian unit (mg/dL), not SI | SI units (what LOINC suggests) | The number on screen must match the paper the user holds | D17; D18 (hemoglobin is never converted to molar: a ×4 ambiguity) | DR |
| 14 | LOINC and UCUM licenses handled differently in the repo | — | LOINC allows subset extracts; UCUM forbids subsets and derived works | D25; `estudos-ia/05-vocabularios/licencas.md` | M |
| 15 | Decimal comma, censored values (`<0,01`), and missing values as `null` (never 0) | `parseFloat` | `parseFloat('32,5')` returns 32 silently. A stored zero is a fake measurement | D21, D23, D29, D43; `parseDecimal` | DR |
| 16 | Every analyte on the paper becomes a row; analytes outside the catalog get a local code | Drop the out-of-catalog rows (the AI agent's own first choice) | User decision: "cobrir 100% dos dados entregues" | D32 | DR |
| 17 | Reference ranges kept as text; nobody picks the applicable row | The model picks a row by age or sex | Picking a row is interpreting. Measured: rows with no range went from 14 to 2 out of 48 | D37; `estudos-ia/04-implementacao/notas.md` (reprocessing on 2026-09-20) | DR |
| 18 | Server-imposed structured output; digital PDFs go straight to the model | Forced tool, "strict" tool (found to be a false positive) | 12 measured invocations (3 models × 4 scenarios) | D19 | M / DR |
| 19 | **Textract dropped; photos read by the model's own vision** | Textract OCR | The AWS account refuses Textract at account level (free plan, `SubscriptionRequiredException`). Vision measured at 26/26 values on clean images and 25/26 on simulated photos | D40; `estudos-ia/01-estudos/textract-por-que-nao-temos-acesso.md`; `amplify/backend.ts` ~line 370 | DR (**pivot**) |
| 20 | Values read from a chart are sent to review with no value | Trust the prompt rule | The prompt rule alone failed 2 of 2 times: HDL read as 80 instead of 62, with confidence 0.95 | D41; `valorDeGrafico.ts` | DR |
| 21 | Separate guardrail for extraction (PROMPT_ATTACK only, plus a PII filter for name and CPF) | Reuse the wearable guardrail | The wearable guardrail blocked the transcription of a prescription. The guardrail does **not** see the document block, which was measured | D20 (2026-09-17 entry); `amplify/backend.ts` ~lines 376–450 | DR / CF |
| 22 | Failed answer: regenerate once, then a deterministic answer with no generated prose | Show the failure; loop until it passes | — | D31; `estudos-ia/01-estudos/resposta-reprovada.md`; `degradedAnswer.ts` | DR |
| 23 | Referral sentence written by the app, not the model | The model writes the referral | 2 of 2 rejections in the first real conversation were R2 false positives; the model's own referral asserted facts it didn't know | D38; `encaminhamento.ts` | DR |
| 24 | Chat history kept in DynamoDB with no expiry and real, immediate deletion | Only on the device | The AI needs history on the server. Retention handled under LGPD | D5, D33 | DR (LGPD) |
| 25 | Fact memory: the model proposes, the person confirms, 4 closed types | Conversation summaries (rejected) | LGPD purpose principle (art. 6, I) shaped the architecture | D34; `estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`; types `COMO_ME_CHAMAR`, `PREFERENCIA_DE_RESPOSTA`, `ROTINA`, `ACESSO_A_CUIDADO` | DR (LGPD) |
| 26 | The function checks file ownership in S3 before reading (security fix) | Shape-only key checks relying on bucket policy | User A could make the function read user B's report. The bucket policy protects user credentials, not the function role | D46; `specs/09-seguranca/posse-do-arquivo/` | DR (security) |
| 27 | Reprocessing keeps the user's corrections; deleting a document cascades to its extracted rows | — | Found while reading code: corrections were being undone, and deleted documents left values in the series and the chat | D47, D48 | DR |
| 28 | Large PDFs split into page ranges (`pdf-lib`); up to 10 photo pages per document | Reject PDFs over 4.5 MB | Bedrock's document block limit. 40/40 rows landed on the right page | D49, D50 | DR |
| 29 | **Wearables via exported file, not live HealthKit/Health Connect** | Native libraries | Explicit decision not to install native libraries; no consumer existed at the time | `specs/04-ia-perfil-vacinacao/perfil/plan.md:21`; `specs/05-dados-wearables/importar-dados/plan.md:7`; `docs/DADOS_MOCKADOS.md` item 4 | M / DR / CF (**pivot**) |
| 30 | Apple Health `export.zip` (~250 MB XML, ~670k samples) read as a stream | CSV/JSON only | Apple imports were failing silently | commit `7aa038e` | DR |
| 31 | Wearable analysis back to forced tool output | Structured output (`output_config`, adopted for Sonnet 5.5) | In production one call took 265 s and the Lambda timed out at 300 s | commit `0919a4f` (Arturo), reverting `fc7ca24` | DR |
| 32 | Model kept at Sonnet 4.6. Opus 4.6 measured for the chat and rejected | Sonnet 5.5 (no account access), Opus 4.6 | Opus 4.6: 64/70 vs 67/70, median latency 10.8 s vs 9.2 s, lower quota (5 req/min vs 10) | DS12, DS17; `amplify/backend.ts:159,730` | DR |
| 33 | **Drug interactions from a hand-curated, referenced dataset of 19 pairs in 6 pharmacological classes (14 active ingredients)**, offline and deterministic; the same source for the medicines screen and the chat | RxNav/NLM interaction API, DrugBank, openFDA | RxNav's free interaction API was discontinued; DrugBank is paid; openFDA exposes only free-text English label sections, not structured pairs. So a short, offline list of well-established combinations, each checked against a published reference | `amplify/functions/drug-interactions-shared/pairs.ts` (header comment records the reason), `aliases.ts`, `normalizeDrugName.ts`; `docs/interacoes-medicamentosas.md`; `specs/10-finalizacao-codigo/01-melhorias-ia/decisoes/E9-interacoes-medicamentosas.md` (D9.1: one source for app and chat); commits `1a2baf5` (Arturo, 2026-10-07), `c905349` | DR (**required subsection 4.3**) |
| 34 | Vaccination: PNI open data (sample of doses applied) plus a hand-curated campaign calendar; CNES for sites; GPS for state and municipality | Asking the user for their state | No public endpoint returns the campaign calendar. CNES needs the IBGE municipality code | `docs/DADOS_MOCKADOS.md` item 7; `specs/04-ia-perfil-vacinacao/campanhas-vacinacao/plan.md` | DR |
| 35 | Prevention recommendations from the **USPSTF** API (US Preventive Services Task Force), filtered by age, sex and BMI computed on the server; only those filter parameters leave the Lambda, no identifying data | Brazilian government guidance (Ministério da Saúde) | **Author, 2026-11-14:** the Brazilian government has no structured database of screening recommendations, only a long PDF document. USPSTF offers the same kind of content as a queryable API with graded recommendations (A–I). This rationale isn't written in the repo yet: cite the author's statement in the article, and give the exact Brazilian PDF as the reference that was considered (Q6) | `amplify/functions/get-prevention-recommendations/`, `uspstf-shared/`, `src/constants/uspstfGrades.ts`; `specs/03-exames-receitas/prevencao/spec.md:94` (LGPD note); ported from branch `feat/exame_sugest` (`specs/RELATORIO_SDD_SUASAUDE.md` §2, Bloco 3e) | M / DR / CF |
| 36 | App not opened to the public (2026-09-24) | Store release | Scopes out LGPD art. 33 operation, AWS free-plan expiry, and cost at scale | `limitacoes.md` §3.3–3.5; `docs/lgpd/conformidade-e-pendencias.md` (usage context) | CF |
| 37 | Terms of Use and Privacy Policy v1.0 (20 sections) with 3 mandatory checkboxes and stored proof of acceptance; separate consent for international transfer (§15) | — | LGPD | `src/data/termosEPrivacidade.ts`; `TermsConsent.tsx`; `UserProfile.termsVersion/termsAcceptedAt`; commit `dffccec` | DR (LGPD) |
| 38 | "Exportar meus dados" removed; portability handled through the privacy channel | In-app export | Owner's request | `docs/DADOS_MOCKADOS.md` item 5; commit `7499ccb` | DR / CF |
| 39 | Production protected from deletion; Google login only in production | — | Amplify defaults destroy the user pool and tables along with the stack | `amplify/backend.ts:41-55`; `amplify/auth/resource.ts`; commit `64867dc` | DR |
| 40 | Fair survey: a separate CloudFormation stack, anonymous answers, 11 questions | — | Must not touch the app backend; asks "is the product viable and who is the customer" | `infra/site-pesquisa/`; `docs/superpowers/specs/2026-10-24-site-feira-pesquisa-design.md` | M / DR (**if results are available**) |

---

## 3. Section-by-section brief

Page budget (12 pages total, including cover and references, at template font and spacing). The writer must check it against the real template layout:

| Part | Budget |
|---|---|
| Cover block (template header fields) + Resumo + Abstract | ~1.25 p |
| 1. Introdução (+ referencial teórico, trabalhos relacionados) + 1.1 Justificativa | ~2.0 p |
| 2. Objetivos | ~0.6 p |
| 3. Metodologia | ~1.4 p |
| 4. Desenvolvimento e Resultados | ~4.5 p (including 3 figures and up to 4 tables, one of them the required drug-interaction table) |
| 5. Considerações Finais | ~1.0 p |
| Referências | ~1.25 p |

### Cover block (template header)

- Change `CATEGORIA: Em andamento` to `Concluído` (the template says so).
- Course: "Ciência da Computação" (draft).
- Title: the draft uses "SuaSaúde - Gerenciamento de Saúde". Consider a subtitle that names the contribution (e.g., AI-assisted exam reading with structural safety). **Ask the author** (Q1).
- Advisor format: the template says "Prof. Dr. ou Ms. Nome Completo". The draft has "Prof. MSc. Dr. Robson Calvetti", which mixes the two. **Ask** (Q2).
- Authors: keep the five names from the draft.

### Resumo / Abstract / Palavras-chave

- **Argue:** the problem (health information scattered across paper, photos and apps), the solution (an integrated app plus two AI pipelines whose safety is built into the structure), the method (incremental spec-driven development with TDD, measured against the real model), and the key numbers (below). One paragraph each in pt-BR and English. Up to 5 keywords separated by periods.
- **Evidence for the numbers** (pick 2–3):
  - extraction rows with no reference range fell from 14 to 2 out of 48 (`notas.md`, 2026-09-20)
  - photo reading matched 25 of 26 values (D40)
  - the chat passed 67 of 70 scripted cases in the final sandbox round (`conferencia-sandbox/README.md`)
  - there are 259 test files (my count with `find`, see Q9)
- **Already drafted:** nothing. The draft says "elaborado apenas para a entrega no FINAL".
- **Suggested keywords:** saúde móvel. inteligência artificial. extração de dados. LOINC. LGPD. (writer's choice; keep 5 or fewer)

### 1. Introdução (with theoretical framework and related work)

- **Argue:**
  - the mHealth context and chronic disease, which the draft already covers well;
  - AI as support and not as a substitute (the draft already cites NEGASH 2025 and NAĞIYEVA 2026);
  - **new:** the specific technical gap the repo addresses. Brazilian lab reports arrive as free-text PDFs or photos in Portuguese. They carry no standard codes and use non-UCUM units (`mcg/dL`, `µUI/mL`, `/mm³`, D28). They print reference ranges in six shapes (D37). Together these make month-to-month comparison impossible without normalization. This is the gap that motivates Frente 1 (D13: the user's real question was comparing analytes like vitamin D, calcium and hemoglobin over months).
  - **new:** the risk of LLM output on health data, which motivates "safety as structure" (D11).
- **Template requirement:** the Introduction must include the theoretical framework, **related works and the gaps**. The draft has no related-works paragraph and no comparison with existing apps. The repo has **nothing** on competing apps. Possible academic sources are the PDFs in `Material TCC/Referencias/` that the draft never cites: "Can Mobile Phone Apps Influence People's Health Behavior", "Design Features for Improving Mobile Health Intervention User Engagement", "User Engagement in Mobile Health Applications". Their bibliographic data has to be read from the PDFs; filenames only are known. **Don't invent a comparison with commercial apps** (Q3).
- **Keep from the draft:** paragraphs on mHealth, UI/UX (ANDERSON 2016), wearables (SHALUHIYAH 2025; SPREADBURY 2022), and AI acceptance (NEGASH 2025). **Condense** them: the draft's Introduction plus Justificativa run about 2.5 pages and repeat each other.
- **Rewrite:** draft line 45 ("IA para análise de exames realizados, oferecendo interpretações preliminares e sugestões de leitura"). Replace it with transcription, normalization, series and cited retrieval, with interpretation explicitly refused (see §0.2).
- **Figures:** none.
- **Gaps:** there are no citations yet for LOINC, UCUM, LLM hallucination/safety, or LGPD (Lei 13.709/2018). Add primary references: the LOINC and UCUM sites/licenses already in `estudos-ia/05-vocabularios/`, and the LGPD law text. Don't add LLM-safety literature the authors haven't read (Q4).

### 1.1 Justificativa

- **Argue:** social relevance (draft: CHIB, YE, CAMERINI) and **SDG 3** (template requirement, already in the draft with ASI 2018 and MUKHTAR). Template: "Descreva, se for o caso, se o trabalho está relacionado a alguma entidade, departamento ou grupo de pesquisa da Mauá". The repo mentions the **EUREKA** fair stand (`specs/constitution.md` rule 7) and a fair survey site with a QR code. Whether this ties to a Mauá group or entity is unknown (Q5).
- **Fix in the draft:**
  - "(MUKHTAR et al., 2018)" in the text, but the reference is 2025 (draft line 61 vs line 174)
  - "(ASI, 2018)" has two authors in the reference (ASI; WILLIAMS), so cite it as "ASI; WILLIAMS, 2018"
  - CHIB: the reference says both "(2015)" and "Março 2014"
- **Condense** to about 0.7 page.

### 2. Objetivos

- **2.1 Objetivo geral:** keep the "integrated management" scope. Replace "uso de IA para apoio à análise preliminar" with wording that matches what was built: structured, normalized reading of reports, and conversation grounded in the user's own records, with interpretation and diagnosis refused by design.
- **2.2 Objetivos específicos:** the template requires each objective to be revisited in section 4 with whether it was met. Mapping of the draft's 10 objectives (draft lines 75–93) to repo evidence:

| Draft objective (short) | Status in repo | Evidence | Note for writer |
|---|---|---|---|
| Intuitive, responsive, accessible UI | Met (design-system fidelity) | `specs/00-fundacao/`, `specs/RELATORIO_SDD_SUASAUDE.md`, 16px minimum font size (#35 in that report) | **No usability or accessibility test with users exists in the repo.** UI/usability work ("Parte 2") was explicitly not started: `specs/10-finalizacao-codigo/02-ui-usabilidade/README.md`. Say "accessible" only with care |
| Register and organize clinical documents | Met | `MedicalDocument` schema, `AddExamScreen.tsx`, `examService.ts` | — |
| Recommend exams from public, trusted databases | Met **with a US source (USPSTF)** | `get-prevention-recommendations/`, `src/constants/uspstfGrades.ts` | Explain why: Brazil has no structured database for this, only a PDF document (decision 35). State the limitation in section 5: US recommendations don't always match Brazilian public-health guidance |
| AI preliminary analysis of exams | **Reframe**: built as extraction plus series plus cited chat; *analysis* in the sense of interpretation is refused | §0.2; D11; `limitacoes.md` §1 | Rewrite the objective |
| Medicines and appointments with reminders | Met (local notifications; push function exists) | `medicineReminderService.ts`, `send-medicine-reminders/`, `appointmentNotifications.ts` | Reminders are local per device (no server reconciliation): `RELATORIO_SDD` Bloco 3 |
| Obtain wearable data (heart rate, sleep, activity) | Met **via file import** (Samsung Health CSV/JSON/ZIP, Apple Health export.zip), not a live device connection | `analyze-health-import/`, `metricCatalog.ts` (29 metrics) | Draft says "integração com dispositivos vestíveis"; clarify that it is a file import (decision 29) |
| Visual dashboard of wearable and user data | Met for wearables (`HealthDashboardScreen.tsx`); per-analyte chart (`AnalyteSeriesChart.tsx`) | `specs/05-dados-wearables/insights-saude/spec.md` | — |
| Contextual analysis correlating physiological, manual and clinical data | **Partially**: Pearson correlations *among wearable metrics* (with lag, `statistics.ts:67,126`); cross-domain comparison in the chat (E10) is shown side by side **without interpretation** | `specs/10-finalizacao-codigo/01-melhorias-ia/estudos/E10.2-comparacao-entre-dominios.md` | Don't claim the system correlates exams with sleep |
| Vaccines taken/planned + campaign alerts from Brazilian public health system | Met with caveats: PNI open data (sampled counts), campaign windows curated by hand, CNES sites by GPS | `get-vaccination-campaigns/`, `get-vaccination-sites/`, `docs/DADOS_MOCKADOS.md` item 7 | Say "sampled" and "curated" |
| Security, privacy, LGPD compliance | Met for a restricted prototype; explicit open items | `docs/lgpd/conformidade-e-pendencias.md`, D33, D34, D46, D48, terms v1.0 | Say "conformidade buscada" plus open items, never "conforme" without qualifiers (the LGPD doc says it is not a legal opinion) |

- **Repo work with no objective in the draft** (consider adding 1–2 objectives or folding them in): the conversational assistant itself (12 epics E1–E12, including proposed actions the user confirms (E11) and user-confirmed memory (D34)); drug-interaction alerts; LOINC/UCUM normalization.

### 3. Metodologia

- **Argue:**
  1. **Approach:** applied, incremental development. Keep the draft's "mista" framing only if the survey results are used (Q7). Otherwise the quantitative part is the measured rounds against the real model.
  2. **Process:**
     - the MVP and models from semester 1 (empathy maps, AS-IS/TO-BE, BMC, use-case/class/object diagrams in `Material TCC/Diagramas/`; keep this short);
     - then **spec-driven development**: a constitution with 9 rules (`specs/constitution.md`) and `spec.md`/`plan.md`/`tasks.md` per screen or EPIC under `specs/`;
     - studies, then decisions, then spec, then code for the AI (`estudos-ia/README.md`, "Fluxo");
     - TDD with `npm run validate` (typecheck app and backend, lint, Jest) as the completion gate (`specs/10-finalizacao-codigo/README.md`; `package.json` scripts).
  3. **AI evaluation method:**
     - an automated question bank (`scripts/avaliacao/bancoDePerguntas.ts`, 22 questions in categories: own exam, end to end, generic, operational, diagnosis bait, dose bait, missing exam, cross-domain, R1 false positive);
     - sandbox scripts per epic (`specs/10-finalizacao-codigo/01-melhorias-ia/conferencia-sandbox/roteiro/`, 70 cases, seeded test accounts, synthetic wearable data);
     - mutation checks on safety tests (D35, `notas.md` "A verificação por mutação");
     - **who labeled:** the agent that ran the round, not a human ("Decisão J3"). This must be disclosed.
  4. **Technologies and why** (template asks for justification): Expo/RN (shared codebase, from the draft); Amplify Gen 2 (backend as code, one deploy path, decision 4 criterion 3); Bedrock plus Guardrails as code (decision 4); LOINC/UCUM (decision 12); `pdf-lib` (justified under constitution rule 3, D49); Zod for schema validation; NativeWind.
  5. **Environments:** a shared dev sandbox, per-developer sandboxes, and production (Amplify app). APK built with EAS (`eas.json`, commits `98018ae`, `03ac735`). Details in `docs/aws-amplify.md`.
- **Rewrite in the draft:**
  - "DynamoDB (banco de dados relacional)" (draft line 115) is **wrong**: DynamoDB is a NoSQL key-value/document database.
  - "Amplify (integração do código em JavaScript ao ambiente AWS)" understates it: Amplify Gen 2 is TypeScript backend-as-code generating CloudFormation.
  - The draft never mentions **Lambda, Bedrock, Guardrails, LOINC, UCUM**.
- **Figures:** none (save the space for section 4).
- **Gaps:**
  - The bibliographic search (Google Scholar, from the draft) is fine as is.
  - **AI coding assistants were used in development.** Most commits since September carry a "Co-Authored-By: Claude" trailer, and `specs/10-finalizacao-codigo/PROMPT-PADRAO.md` is the prompt given to the agent. Whether and how to declare this in the methodology is an authorship decision (Q8). Don't leave it out silently, and don't write it in without the authors' decision.

### 4. Desenvolvimento e Resultados (the largest section)

Suggested subsections. The template asks for architecture, functional and non-functional requirements, integrations, tests and validation, the status of each objective, comparison with existing solutions, and additional contributions.

**4.1 Arquitetura**
- **Show:** app, then Cognito, AppSync/DynamoDB and S3; S3 to the extraction and wearable Lambdas (async, started via AppSync resolvers); app to the chat Lambda via Function URL with its own JWT check; all three AI Lambdas to Bedrock plus Guardrails; public-data Lambdas (USPSTF, PNI, CNES) with DynamoDB cache tables.
- **Evidence:** `README.md` mermaid diagram (a good base); `amplify/backend.ts`; `amplify/data/schemas/*.ts` (11 schema files); `estudos-ia/00-visao/arquitetura-geral.md` (diagram of the three AIs and who writes or reads what).
- **Figure 1 (required):** architecture diagram built from the README mermaid. Add the AppSync 30 s async pattern vs the Function URL, and mark the chat's read-only arrow.
- The semester-1 diagrams (`Material TCC/Diagramas/Classes.png`, `DiagramaCasosDeUso.png`) **predate** `LabResult`, `ChatMessage`, `HealthImport`, memory and so on. Don't reuse them as the final architecture unless the authors update them (Q10).

**4.2 Módulos do aplicativo** (brief, one table)
- Screens: `src/screens/` (28 screens); routes: `src/app/`; specs per block in `specs/01-…` to `specs/05-…`.
- Table: module | what it does | data source. Rows: exams and prescriptions, medicines plus interactions (19 pairs, detailed in 4.3), appointments, vaccination (PNI/CNES), prevention (USPSTF), wearables, profile plus terms.
- **Prevention (USPSTF), one short paragraph:** recommendations filtered by the profile's age, sex and BMI, shown by grade A–I (`specs/03-exames-receitas/prevencao/spec.md`). Explain the choice: the Brazilian government has no structured database of screening recommendations, only a long PDF, while USPSTF provides a queryable API with graded recommendations (decision 35). Cite both the USPSTF and the Brazilian PDF (Q6). Only the filter parameters are sent to the API, no identifying data (`prevencao/spec.md:94`).

**4.3 Alerta de interações medicamentosas (required: cite and explain every pair)**
- **What it does:** when the user registers a medicine, the app checks it against the medicines already in use and shows an alert with severity (`danger` or `warning`), the risk and the pharmacological mechanism in plain pt-BR (`DrugInteractionSheet.tsx`, `findInteractions.ts`). Since E9 the chat answers interaction questions from **the same dataset** (D9.1: one source in `amplify/functions/drug-interactions-shared/`; `src/data/drugInteractions/` only re-exports it).
- **How names are matched:** the typed name is normalized (lower case, no accents, dose and parentheses removed: "Losartana 50mg (genérico)" → `losartana`; `normalizeDrugName.ts`) and resolved through a table of Brazilian brand names and PT/EN variants for **14 active ingredients** (e.g., Marevan/Coumadin → warfarina; Aradois/Cozaar → losartana; Alivium/Advil → ibuprofeno), checked against the **ANVISA Bulário Eletrônico** (`aliases.ts`; `docs/interacoes-medicamentosas.md`). A name the table doesn't know is **ignored silently**, so the app never raises a false alert. The consequence is that "no alert" can mean "medicine not recognized" (E9 decisions doc, "O que o código faz hoje"). Say this in the article.
- **Why it was built by hand, without a drug database** (all from the header comment of `pairs.ts` and the E9 decisions doc):
  1. the free drug-interaction API of RxNav (US National Library of Medicine) was discontinued;
  2. DrugBank, the usual structured alternative, is paid;
  3. openFDA only exposes drug-label sections as free text in English, not structured pairs, and it would need parsing and translation before it could be shown to a Brazilian user.
  So the team chose a short, offline, deterministic list of combinations that are well established in the literature, each checked against a published reference. It runs without a network call and gives the same answer every time. Unlike the LOINC catalog, which comes from a licensed external vocabulary through a generator script, this dataset is small and authored by the team, so it is a hand-written TypeScript module.
  - The writer should **verify and cite** the RxNav discontinuation with the NLM notice, and cite DrugBank's licensing page and openFDA's drug-label documentation, if space allows (Q16). The repo states these facts without links.
- **Table C (required): the dataset grouped by mechanism.** 19 pairs, 6 classes. The user remembered "about 15"; the code has 19 (`pairs.ts`, 12 `danger`, 7 `warning`). Use 19. Mechanisms and references from `docs/interacoes-medicamentosas.md`:

| Class / mechanism | Pairs (severity) | Risk shown to the user | Reference |
|---|---|---|---|
| Anticoagulant + NSAID, aspirin, macrolide or SSRI (warfarin interactions) | warfarina + ibuprofeno (danger); warfarina + diclofenaco (danger); warfarina + aas (danger); warfarina + claritromicina (danger, CYP3A4 inhibition raises warfarin levels); warfarina + fluoxetina (warning) | Bleeding | HOLBROOK et al., *Archives of Internal Medicine*, v. 165, n. 10, p. 1095–1106, 2005; KENT, *Thrombosis and Haemostasis*, v. 120, n. 7, p. 1001–1003, 2020 (the two NSAID pairs) |
| Aspirin + NSAID (ibuprofen blocks aspirin's binding site on COX-1, reducing its antiplatelet/cardioprotective effect) | aas + ibuprofeno (warning); aas + diclofenaco (warning) | Bleeding, gastric irritation, reduced cardioprotection | CATELLA-LAWSON et al., *New England Journal of Medicine*, v. 345, n. 25, p. 1809–1817, 2001 |
| Serotonergic combinations (SSRI + SSRI, SSRI + tramadol) | fluoxetina + sertralina (danger); fluoxetina + tramadol (danger); sertralina + tramadol (danger) | Serotonin syndrome; seizures with tramadol | BOYER; SHANNON, *New England Journal of Medicine*, v. 352, n. 11, p. 1112–1120, 2005 |
| ACE inhibitor or ARB + potassium-sparing diuretic | enalapril + espironolactona (danger); losartana + espironolactona (danger); captopril + espironolactona (danger) | Severe hyperkalemia, arrhythmia | JUURLINK et al., *New England Journal of Medicine*, v. 351, n. 6, p. 543–551, 2004 |
| Statin + macrolide (CYP3A4 inhibition raises statin levels) | sinvastatina + claritromicina (danger); sinvastatina + eritromicina (danger) | Rhabdomyolysis | FALLAH et al., *Australasian Medical Journal*, 2013; MHRA, *Drug Safety Update*, "Simvastatin: updated advice on drug interactions" |
| ACE inhibitor or ARB + NSAID (less renal prostaglandin synthesis) | enalapril + ibuprofeno; losartana + ibuprofeno; captopril + ibuprofeno; diclofenaco + enalapril (all warning) | Weaker blood-pressure control, worse kidney function | LAPI et al., *BMJ*, v. 346, e8525, 2013 |

- **Limitations to state:** the list is deliberately small and non-exhaustive; it covers only well-known combinations. It doesn't replace a doctor or pharmacist. Beyond the academic scope it would need review by a pharmacist and, ideally, replacement with a validated clinical database (DrugBank and Micromedex are named in `docs/interacoes-medicamentosas.md`). Unrecognized names produce no alert. This goes in section 5 too.
- **Evidence of testing:** `amplify/functions/drug-interactions-shared/__tests__/`, `src/data/drugInteractions/pairs.test.ts`, `normalizeDrugName.test.ts`, `src/services/drugInteractionService.test.ts`; in the chat, E9 passed 9/9 in the sandbox, including the case where the model forgets a name it cited (DS8) (`conferencia-sandbox/README.md`).
- **Space:** Table C is about 0.5 page. It is required by the author, so take the space from section 1 or from screenshots.

**4.4 IA de leitura de exames** (core contribution #1)
- **Show:**
  - the pipeline: upload to S3; `start-document-extraction` checks the owner (D46) and marks PROCESSING; async `extract-document-data` sends the PDF or photos to the Bedrock Converse API (structured output, own guardrail); `parseDecimal`, unit translation, LOINC candidate list (154 analytes, D44); confidence threshold 0.85 (`analyteNormalizer.ts:61`, provisional); rows go to review as needed; the user can **Confirmar/Corrigir** (D30); per-analyte series (`AnalyteSeriesScreen.tsx`).
  - Structural safety: no interpretation field; chart values sent to review (D41); censored values excluded from comparisons (D21); `null` never 0 (D29); hemoglobin never converted to molar (D18); idempotent row IDs including the collection moment (D22); reprocessing keeps corrections (D47); deletion cascades (D48).
- **Results to tabulate (Table A)**, all from the single real report (Delboni/DASA, 19 exams, 836 KB, PDF):

| Measurement | Value | Source |
|---|---|---|
| Rows read, first measurement | 45 (40 automatic, 5 pending); ~56.5k input / ~4.4k output tokens; 20–35 s | `notas.md` "O custo de um documento" |
| After the reference-as-text change | 48 rows, 0 duplicates on the 3rd pass; rows with no range 14 → 2 (acceptance criterion: under 3); 62,893 / 5,340 tokens; 111.5 s | `notas.md` 2026-09-20; D37 |
| Coverage stability, same call at temperature 0 | 47, 47, 42, 47 rows; **no wrong number**, unstable omission | `limitacoes.md` §2.1 |
| Photo vs PDF (4 pages) | 26/26 identical on clean render; 25/26 on simulated photo; full blood count (19 values) identical | D40 |
| Chart-reading failure | HDL read from a chart as 80 (real 62), confidence 0.95; fixed structurally | D41 |
| Large PDF (20 pages, 7.3 MB) | split into 2 parts; 40/40 shared rows on the correct page; ~78k tokens | D49; `limitacoes.md` §3.5 |
| Two photographed pages | HDL taken from the printed number (62, confidence 0.98); ~16k tokens | D50 |
| Model choice | 12 invocations (3 models × 4 scenarios), all `ok`; Opus 4.6 and Sonnet 4.6 identical, tie broken by cost | D19; `amplify/backend.ts` ~line 469 |

- **Figure 2 (recommended):** the extraction pipeline as a flow, with the deterministic locks drawn as separate boxes.
- **Screenshot candidates** (only if they fit): exam detail with extracted results (`DocumentDetailScreen.tsx`, `ExtractedResultsSection.tsx`), analyte series chart. `scripts/preview-screenshot.mjs` exists. The repo has one print used on the download site (commit `c71f84b`, `scripts/site-publico/`). Ask the authors for final screenshots (Q11).
- **Gap:** every measurement comes from **one issuer** (Delboni/DASA). Multi-issuer accuracy (U12/T14) was never measured (`limitacoes.md` §2.2, §2.5). Say so here or in section 5.

**4.5 Assistente conversacional** (core contribution #2)
- **Show:**
  - read-only tools: `amplify/functions/chat-assistant/tools/` covers exams, results, analytes, prescriptions, medicines, doses taken, appointments, vaccines, prevention, campaigns, sites, interactions, wearable and daily series, panorama, comparison;
  - the tool loop (`conversationLoop.ts`) and citations checked against the rows returned (`citacoes.ts`);
  - deterministic verification R1–R5 (`ai-language-rules/languageRules.ts`; rationale in `estudos-ia/01-estudos/regras-de-linguagem.md`). R1 is a vetoed word, never written in the repo. R2 is the referral. R3 covers small suggestions and no diagnosis or dose. R4 is "no number without an origin". R5 is "say what you don't know";
  - one regeneration, then a degraded deterministic answer (D31); the referral sentence added by the app (D38);
  - proposed actions the user confirms (E11); memory with 4 closed types (D34); a 40 s cutoff with an overload notice (DS15.3).
- **Results to tabulate (Table B):**

| Round | Result | Source |
|---|---|---|
| First real conversation (5 turns, 2026-09-18) | 2 rejections, both R2 false positives; 5/5 citations correct; 5.0–16.5 s per turn | `notas.md` "Primeira conversa real"; `estudos-ia/01-estudos/conversa-real-2026-09-18.md` |
| Automated round 4 (22 questions, 2026-09-22) | 14 approved first time (64%), 6 on second generation (27%), 2 degraded (9%), 0 unavailable; both diagnosis-bait questions degraded (safe failure); both dose-bait questions refused correctly | `estudos-ia/04-implementacao/avaliacoes/2026-09-22-rodada-4.md` |
| R1 false-positive fix (9 turns) | first-time approvals 7/9 → 9/9; unavailable 1 → 0 | `avaliacoes/2026-09-24-r1-antes-e-depois.md`; D51 |
| Rodada 1 found 6 defects no unit test had found (out of ~1,300 tests at the time) | — | D45 |
| Final sandbox round E1–E12 (70 cases, 2026-10-22, Sonnet 4.6) | 67 approved (4 on 2nd generation), 1 degraded, 2 unavailable | `conferencia-sandbox/README.md` |
| Opus 4.6 for comparison | 64/70; median latency 10.8 s vs 9.2 s; throttling (5 req/min) | DS17 |

- **Figure 3 (recommended):** the answer path: question, read-only tools, generation, R1–R5 check, regenerate once, degraded fixed-text fallback, with the referral added by the app.
- **Gaps that must be stated:**
  - the human evaluation (L7) was never done; labels were assigned by the agent (J3; `limitacoes.md` §3.1);
  - DS16 was deployed without re-measurement;
  - sandbox wearable data is synthetic (74 days);
  - three device-only behaviors were checked only in tests.

**4.6 Dados de wearables** (Arturo's front)
- **Show:**
  - file import: Samsung Health CSV/JSON/ZIP; Apple Health export.zip read as a stream (`appleHealthReader.ts`, `7aa038e`);
  - defensive parsing (`fileSniffer.ts`, `columnMapper.ts`, `sanity.ts`), daily aggregation (`dailyAggregator.ts`), 29 metrics (`metricCatalog.ts`);
  - statistics: mean, median, percentile, standard deviation, rolling mean over available points with no gap filling, and Pearson correlation with lag (`statistics.ts`);
  - Bedrock narration with a forced tool and Zod schema (`insightSchema.ts`); the dashboard shows the statistical evidence (`r`, `n`) next to the AI text (`insights-saude/spec.md` §2);
  - consent screen naming Bedrock and `us-east-1` (`importar-dados/spec.md` §6); multiple imports (`HealthImportsScreen.tsx`).
- **Evidence of evaluation:**
  - test fixtures for every Samsung file type (`amplify/functions/analyze-health-import/__tests__/fixtures/`);
  - 222 tests when the feature merged (D13);
  - a real 2018–2026 export (~90 months) exposed UI issues (`insights-saude/spec.md`, 2026-10-18 reconciliation);
  - the production timeout of 265 s led to the revert in `0919a4f`.
- **Gap:** no accuracy measurement of the narration; correlations exist only among wearable metrics. The person who owns this front can give more detail (Q12).

**4.7 Segurança e LGPD**
- **Show:**
  - Cognito auth (email/code; Google only in production);
  - `allow.owner()` on models;
  - the chat's own JWT check, with the owner taken only from the token (`auth.ts`), and a per-owner rate limit (`rateLimit.ts`);
  - the file-ownership fix (D46: describe the vulnerability and the fix; it is a good, concrete result);
  - guardrails as versioned infrastructure as code;
  - PII filter (name/CPF) on extraction input;
  - zeroed async retries;
  - production deletion protection (`backend.ts:41-55`).
  - LGPD: terms v1.0 with 20 sections, 3 unchecked consent boxes, stored version and timestamp, a separate art. 33 consent; chat retention and real deletion (D33); memory with confirmation and a closed purpose list (D34); cascade deletion (D48); privacy channel and procedures (`docs/lgpd/conformidade-e-pendencias.md` §4).
- **Gaps:**
  - data goes to the US (art. 33). It is disclosed and consented, but `sa-east-1` was never measured (P11);
  - the guardrail doesn't see document blocks (D20);
  - the fair survey with humans may require CEP/CONEP review (P18; Q7);
  - there is no legal review.

**4.8 Qualidade e testes**
- **Evidence:**
  - 259 `*.test.ts(x)` files (counted with `find`, excluding node_modules);
  - test counts at different dates, which must not be mixed: 76 tests (2026-08-23, `RELATORIO_SDD` §7); 1,530 tests / 133 suites (PR #10, 2026-09-25); 3,998 tests / 231 suites, rising to 4,075 (October 2026, `conferencia-sandbox/README.md`);
  - from 2026-10-21 the full `validate` was **no longer run** at the user's request; commit `5a05522` says "testes verdes depois do merge com a main";
  - the author should run `npm run validate` once and report the final number (Q9).
- **Also:** mutation testing on safety rules; a guard against hand-typed LOINC codes (D27, D35).

**4.9 Status de cada objetivo**
- Reuse the mapping table in §2.2 above, condensed to met / partially met / reframed.

**4.10 Comparação com soluções existentes e contribuições**
- The template asks for this, and **the repo has no comparison data** (Q3).
- What *can* be claimed as a contribution, with evidence:
  1. a documented method for structural safety in health LLM features (D11, `limitacoes.md` §1, where each refusal names the layer that guarantees it);
  2. an LOINC/UCUM normalization of Brazilian lab reports with pt-BR synonyms taken from the LOINC release (D26), with licensing handled (D25);
  3. a recorded evaluation of providers and architectures, including the refusals (`avaliacao-de-provedores.md`);
  4. measured failure modes that became structural fixes (D41, D45).
- **Fair survey results:** if the authors provide them, add a small table (11 questions, anonymous). The design spec says "Não é uma pesquisa estatisticamente válida ... O TCC deve dizer isso" (`2026-10-24-site-feira-pesquisa-design.md` §2). **The data isn't in the repo** (Q7).

### 5. Considerações Finais

- **Argue:** a summary of what was delivered against the objectives; the contributions (from 4.10); limitations; future work.
- **Limitations** (pick the strongest; all from `estudos-ia/06-encerramento/limitacoes.md` unless noted):
  - one lab issuer measured; photos measured only in simulation (§2.2, §2.5);
  - unstable omission and no second independent source after Textract was dropped (§2.1);
  - provisional 0.85 confidence threshold (§2.4);
  - no human evaluation of the chat (§3.1);
  - single provider (§3.6);
  - Bedrock latency episodes of 16–80 s and a quota of 10 req/min (`conferencia-sandbox/README.md`, limitations 2 and 7);
  - Sonnet 5.x not available on the account (DS12);
  - wearables by file only;
  - USPSTF is a US source, chosen because Brazil has no structured database for screening recommendations (decision 35);
  - the drug-interaction dataset is small (19 pairs, 14 active ingredients) and hand-curated; unrecognized names produce no alert (4.3);
  - PNI counts are sampled;
  - no usability testing;
  - data transfer to the US.
- **Future work** (evidenced):
  - UI/usability "Parte 2" (`specs/10-finalizacao-codigo/02-ui-usabilidade/README.md`);
  - multi-issuer and real-photo calibration (T14/U12);
  - human L7 evaluation;
  - Bedrock in `sa-east-1`;
  - native HealthKit/Health Connect;
  - Google Calendar sync and a notification center (`docs/DADOS_MOCKADOS.md` items 6 and 8);
  - streaming chat responses (D6, reopened by D12);
  - public release, which would bring cost at scale and store/Anvisa questions (`docs/lgpd/conformidade-e-pendencias.md` §2);
  - replacing the interaction list with a validated clinical database and pharmacist review (`docs/interacoes-medicamentosas.md`);
  - a Brazilian prevention source, if the government publishes the guidance as structured data.
- **Already drafted:** the draft's "Considerações Parciais" and its list of pending items, now **mostly done**:
  - AI integration: done;
  - wearables: done;
  - LGPD terms: done (`dffccec`);
  - exam recommendation: done via USPSTF.
  - Rewrite the section entirely.
- **Remove:** "Glossário" (draft §7). It isn't in the template and costs about 0.5 page. Define terms inline the first time they appear.

### Referências

- Format every entry in ABNT NBR 6023. The draft's entries lack the journal title, volume, issue and pages, and "Acesso em" (e.g., ANDERSON 2016 → PLOS ONE, v. 11, n. 5; the README already names the journals).
- Fix the year mismatches (MUKHTAR, CHIB) and the ASI author count.
- **Add only works actually cited**:
  - LOINC (Regenstrief Institute) and UCUM;
  - LGPD (BRASIL, Lei nº 13.709/2018);
  - the USPSTF API, **and** the Brazilian Ministério da Saúde PDF that was considered and set aside (Q6);
  - the Ministério da Saúde PNI open data and CNES;
  - the AWS Bedrock documentation already listed in `provedor-llm.md` "Fontes";
  - **required:** the drug-interaction references behind Table C (full data in `docs/interacoes-medicamentosas.md`): HOLBROOK et al. 2005; KENT 2020; CATELLA-LAWSON et al. 2001; BOYER; SHANNON 2005; JUURLINK et al. 2004; FALLAH et al. 2013; MHRA *Drug Safety Update* (simvastatin); LAPI et al. 2013; ANVISA *Bulário Eletrônico* (brand names). Plus the sources for why no database was used (NLM notice on RxNav, DrugBank licensing, openFDA documentation), once verified (Q16). That is about 10 entries, so budget ~0.4 page of references for this alone.
- The repo URL: the draft says "Link para o github do projeto" with no URL. The repo is now `github.com/pgmaximo/suasaude` (PR #13; the old URL redirects).

---

## 4. Open questions for the human author

The writer must not answer these alone.

1. **Title and subtitle:** keep "SuaSaúde - Gerenciamento de Saúde" or add a subtitle naming the AI contribution?
2. **Advisor's title** as it should appear in the template ("Prof. Dr." or "Prof. Ms.").
3. **Related works / comparison with existing solutions:** which apps or papers should be compared (e.g., Meu SUS Digital, Apple Health, lab apps)? The repo has nothing on this, and the template requires it. Can the 3 uncited PDFs in `Material TCC/Referencias/` be used?
4. **LLM-safety literature:** do the authors have references for hallucination and safety in medical LLMs, or should the argument rest only on the project's own measurements?
5. **Mauá link:** is the work tied to any Mauá entity, group or department? Is the "EUREKA" fair a Mauá event to mention?
6. **USPSTF (rationale answered 2026-11-14: Brazil has no structured database, only a large PDF):** what is the exact Brazilian PDF (title, year, issuing body) so the writer can cite it as the alternative considered? The writer must not guess the document.
7. **Fair survey:** were answers collected, and how many? Can the anonymized results (`npm run pesquisa:exportar`) go into the article? Was the survey covered by ethics review (P18 in the LGPD doc)? Also, the decision "app not opened to the public" (2026-09-24) sits next to the APK download via QR code at the fair (commit `89a7f26`). How should the article describe who used the app?
8. **AI-assisted development:** should the methodology declare that coding agents (Claude) were used? How (as a tool, with the spec-driven prompts as method)? What does the course allow?
9. **Final test count:** run `npm run validate` once and report suites and tests, since the full suite hasn't run since 2026-10-21.
10. **Diagrams:** will the class and use-case diagrams be updated to the final schema, or should the writer use only the new architecture figure?
11. **Screenshots:** which 1–2 app screenshots should go in, and who produces them?
12. **Wearable front:** any measurements of the wearable analysis (real exports processed, time, failures) beyond what's in the commits? Was the narration ever checked for errors?
13. **Real health data:** can the article name the laboratory (Delboni/DASA) and quote values from the real report used in tests (e.g., vitamin D 27.92 ng/mL in `rodada-4.md`)? Whose data is it, and is there consent?
14. **Team contributions:** the README lists the main front only for Pedro and Arturo. Should the article state roles for all five authors?
15. **Model naming:** confirm the article should say "Claude Sonnet 4.6 via Amazon Bedrock" (what actually runs, `backend.ts:159,730`), and mention the 5.5 target only as unavailable, if at all.
16. **Sources for "no drug database":** the repo states that RxNav's free interaction API was discontinued, DrugBank is paid, and openFDA offers only free text in English, but gives no links. Can the author supply the pages consulted, or should the writer find and verify the NLM, DrugBank and openFDA pages before citing them?

---

## 5. Constraints checklist

Enforce these from the first draft.

- [ ] **12 pages total, including the cover block and references.** Use the budget in §3. The draft is already ~10 pages without results, so cut aggressively.
- [ ] **Template structure, in this order:** header block (Course, TÍTULO, CATEGORIA: **Concluído**, ÁREA, SUBÁREA, INSTITUIÇÃO, AUTOR(ES), ORIENTADOR(ES)); **Resumo** (unnumbered, one paragraph: objective, method, results); Palavras-chave (up to 5, separated by periods); **Abstract**; Keywords; **1. Introdução** (includes the theoretical framework, related works and gaps) with **1.1 Justificativa** (SDG link required; Mauá link if any); **2. Objetivos** (2.1 Geral with an action verb; 2.2 Específicos); **3. Metodologia** (approach and technologies with justification); **4. Desenvolvimento e Resultados** (architecture, functional and non-functional requirements, integrations, tests and validation, **status of each specific objective**, comparison with existing solutions, contributions, with tables and figures); **5. Considerações Finais** (contributions, limitations, future work); **Referências**.
- [ ] **Draft numbering is wrong for the template:** the draft has "1. Resumo, 2. Introdução, 3 Objetivos, … 7. Glossário, 8. Referências". Renumber the sections and remove the Glossário.
- [ ] **ABNT:** in-text citations as (AUTHOR, year) or "Author (year)"; NBR 6023 references with all elements and "Acesso em"; "Liste somente as obras citadas". Figures and tables captioned with a source line ("Fonte: os autores" or the repo).
- [ ] **pt-BR** throughout; English only in the Abstract and Keywords.
- [ ] **Condense:** Introdução plus Justificativa from ~2.5 to ~2 pages (remove repeated mHealth/wearable/AI paragraphs); drop draft §5 "Resultados Preliminares" and §6 "Considerações Parciais" entirely (superseded).
- [ ] **Points where the current system differs from the first-semester draft** (write the current state, without calling them corrections): DynamoDB is NoSQL, not relational; the AI doesn't interpret (§0.2); privacy wording follows D14, not the README; wearables come from file import, not a live connection; vaccination data is sampled and curated; prevention uses USPSTF, with the reason (decision 35); tests are labeled by an agent, not humans. Citation fixes still needed: MUKHTAR, CHIB, ASI.
- [ ] **Drug interactions (author requirement):** subsection 4.3 with Table C (all 19 pairs grouped in 6 classes, with severity, risk and reference), the reason no database was used (RxNav discontinued, DrugBank paid, openFDA free text in English), and every reference listed in Referências. The count is **19**, not ~15.
- [ ] **No unsupported numbers:** every percentage or count must come from the tables in §3 (4.3, 4.4, 4.5, 4.8), with its date and conditions (one issuer, sandbox, synthetic wearable data).
- [ ] **Never write the R1 vetoed word.** The repo deliberately never writes it in full (`regras-de-linguagem.md` R1). Refer to it as "um termo vetado pelo projeto".
- [ ] **Figures:** at most 3 (architecture, extraction pipeline, answer-verification path), plus up to 4 tables (objective status, drug interactions (required), extraction results, chat results). Screenshots only if space remains.
