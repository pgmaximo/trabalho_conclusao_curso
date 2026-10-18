# Termos de Uso, LGPD e IA: o que o app cumpre e o que falta

Estado em 2026-10-18. Acompanha a versão 1.0 dos Termos de Uso e da Política de
Privacidade (`src/data/termosEPrivacidade.ts`).

> **Isto não é parecer jurídico.** É o levantamento técnico de uma equipe de
> TCC, com as normas conferidas nas fontes listadas no fim. Vale a leitura do
> orientador antes de pessoas de fora da equipe usarem o app.

## Contexto de uso: o que esta análise pressupõe

O SuaSaúde é um **protótipo de TCC**. Ele **não** será publicado em lojas de
aplicativos nem aberto ao público (decisão de 2026-09-24,
`estudos-ia/06-encerramento/limitacoes.md`). Quem o usa é um grupo restrito: a
equipe, o orientador, a banca e pessoas convidadas para testes.

Isso muda a análise em duas direções:

- **Saem** as normas que dependem de colocar um produto no mercado: registro na
  Anvisa, regras das lojas, guarda de registros do Marco Civil para provedor
  comercial, deveres do ECA Digital para produto acessado por menores.
- **Ficam** a LGPD, porque quem testa o app pode cadastrar dado de saúde real e
  isso continua sendo dado pessoal sensível, e a regra 4 da constituição do
  projeto (`specs/constitution.md`). **Entra** a ética em pesquisa com seres
  humanos, se os testes com outras pessoas fizerem parte da metodologia do TCC
  (P18).

---

## 1. Onde está cada peça

| Peça | Onde |
|---|---|
| Texto integral (20 seções, versão, vigência) | `src/data/termosEPrivacidade.ts` |
| Aceite obrigatório no cadastro (3 caixas, nenhuma pré-marcada) | `src/components/profileSetup/TermsConsent.tsx`, na etapa "Revisão" de `src/screens/OnboardingScreen.tsx` |
| Bloqueio do "Concluir perfil" até as 3 caixas | `Footer` de `OnboardingScreen.tsx` (`blockedReason`) |
| Prova do aceite (versão e hora) | `UserProfile.termsVersion` e `UserProfile.termsAcceptedAt` (`amplify/data/schemas/user.ts`), gravados por `saveUserProfile` |
| Consulta posterior | Mais > Termos e privacidade; Perfil > Configurações; links do login e do cadastro; link no cartão de aceite. Rota pública `/terms` |
| Canal do titular | `suasaudetcc2026@gmail.com` (`CANAL_DE_PRIVACIDADE`), atendido pela equipe com os procedimentos da seção 4 |
| Testes | `__tests__/termosEPrivacidade.test.tsx`, `__tests__/onboarding-screen.test.tsx` |

**Por que o aceite fica no fim do Perfil de Saúde, e não na tela de cadastro.**
É por ali que **toda** conta nova passa: `resolvePostAuthRoute` manda para
`/profile-setup` qualquer conta sem perfil, venha ela do e-mail ou do Google, e
o "Continuar com Google" da tela de login cria conta sem passar pela tela de
cadastro. É também o último momento antes de algum dado de saúde sair do
aparelho, porque o formulário só é enviado no "Concluir perfil". A tela de
cadastro ganhou um aviso com link, para a pessoa poder ler o termo antes de
informar qualquer dado (art. 9º).

**Por que três caixas.** O art. 11, I, pede consentimento "específico e
destacado" para dado de saúde. O art. 33, VIII, pede, para a transferência
internacional, consentimento que distinga "claramente esta de outras
finalidades". Uma caixa única seria a autorização genérica que o art. 8º, § 4º,
declara nula.

---

## 2. Normas levantadas, e quais valem para este TCC

| Norma | Vale aqui? | O que exige e como o app atende |
|---|---|---|
| **LGPD** (Lei 13.709/2018) | **Sim** | Dado de saúde só com consentimento específico e destacado (art. 11, I). A tutela da saúde (art. 11, II, "f") não serve, porque o app não é profissional, serviço de saúde nem autoridade sanitária (`estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`). Informação clara (art. 9º), prova do consentimento (art. 8º, § 2º), direitos do art. 18 em 15 dias (art. 19, II), revisão de decisão automatizada (art. 20), nada de vantagem econômica com dado de saúde (art. 11, § 4º), segurança e incidentes (arts. 46 e 48). O termo cobre tudo isso; o que falta está na seção 3 |
| **LGPD, art. 4º, II, "b"** (exceção para fins acadêmicos) | **Não contar com ela** | A exceção é parcial (os arts. 7º e 11 continuam valendo) e foi pensada para a liberdade acadêmica, não para um app que guarda dado de saúde de quem o testa. A ANPD tem um guia sobre o tema (2023). Como o termo já cumpre a lei inteira, depender da exceção só tiraria proteção sem ganhar nada |
| **Res. CD/ANPD nº 2/2022** (pequeno porte) | Em parte | Pessoas naturais podem ser agentes de pequeno porte. "Alto risco" exige um critério geral (larga escala, ou afetar significativamente direitos) e um específico (dado sensível, tecnologia emergente). Com um grupo restrito não há larga escala. O canal com o titular, obrigatório para quem não indica encarregado (art. 11), é o e-mail da equipe |
| **Res. CD/ANPD nº 15/2024** (incidentes) | **Sim** | Comunicar ANPD e titulares em 3 dias úteis quando houver risco ou dano relevante; registro por 5 anos. Procedimento na seção 4.3 |
| **Res. CD/ANPD nº 18/2024** (encarregado) | Atendida pelo canal | A equipe responde pelo e-mail e faz o papel de encarregado (seção 10 do termo) |
| **Res. CD/ANPD nº 19/2024** (transferência internacional) | **Sim** | Os dados ficam na AWS nos EUA. Base: consentimento específico, em caixa própria (art. 33, VIII). A seção 15 do termo traz as informações de transparência do art. 17, § 2º, do regulamento |
| **Res. CNS nº 466/2012 e nº 510/2016** (ética em pesquisa) | **Depende da metodologia** | TCC que envolva seres humanos e seja, metodologicamente, pesquisa precisa de protocolo no sistema CEP/CONEP. A dispensa de atividades de ensino não alcança TCC. Ver P18 |
| **Marco Civil da Internet** (Lei 12.965/2014) | Art. 7º sim; art. 15 não | Informação clara, consentimento destacado e exclusão a pedido (art. 7º): cobertos pelo termo. Guarda de registros por 6 meses (art. 15) vale para provedor que é pessoa jurídica com fins econômicos, o que o TCC não é |
| **CDC** (Lei 8.078/1990) | Provavelmente não | Sem fornecimento no mercado, é duvidoso haver relação de consumo. O termo mantém a cláusula de que nada afasta direitos do consumidor, e não exclui responsabilidade (seção 7) |
| **PL 2338/2023** (Marco Legal da IA) | Não está em vigor | Aprovado no Senado em 10/12/2024; na Câmara, aguardando parecer em comissão especial, com votação adiada para depois das eleições de out/2026. O app já antecipa o que o texto pede para IA em saúde: transparência, revisão humana de cada valor, nenhuma decisão automatizada com efeito sobre direitos |
| **Anvisa, RDC 657/2022** (software como dispositivo médico) | Fora de escopo | A regularização vale para produto fabricado ou comercializado; um protótipo que não é distribuído não chega lá. O termo mantém que o app não é dispositivo médico e não serve para diagnóstico ou tratamento |
| **Res. CFM nº 2.454/2026** (IA na medicina) | Não se aplica | Dirigida a médicos. É coerente com as recusas de projeto da IA (`limitacoes.md`, §1): diagnóstico e decisão terapêutica são do médico |
| **ECA Digital** (Lei 15.211/2025) | Fora de escopo | Vale para produto direcionado a menores ou de acesso provável por eles. O app é usado por convite, por adultos, e o termo exige 18 anos |
| **Regras das lojas** (exclusão de conta no app, declarações de dados de saúde) | Fora de escopo | Não há publicação em loja |

---

## 3. Pendências reavaliadas

A numeração é a da primeira versão desta lista, para não quebrar referências
no código (`P2` em `aceiteDosTermosNoBackend.ts`).

### 3.1 Resolvidas

- **P1. Canal de privacidade e encarregado.** E-mail `suasaudetcc2026@gmail.com`; a
  equipe responde e faz o papel de encarregado. Controladora: a equipe (seção 10
  do termo).
- **P4 e P5. Exclusão de conta e cópia dos dados.** Para um grupo restrito, o
  pedido pelo e-mail resolve, e o termo promete exatamente isso (seções 16 e
  18). A execução está escrita na seção 4. Fazer isso pelo app só seria
  necessário com público aberto ou loja. Por isso a linha "Exportar meus dados
  · Em breve" saiu do Perfil em 2026-10-18, junto com o stub
  `dataExportService.ts`: ela anunciava uma função que o TCC não vai ter.
- **P11. Base da transferência internacional.** O consentimento em caixa própria
  basta para quem testa por convite. Cláusulas-padrão com a AWS ou mover o
  backend para `sa-east-1` só fariam sentido com público aberto.
- **P17. Procedimento de incidente.** Seção 4.3.
- **P2. Backend publicado com os campos do aceite.** Publicado em 2026-10-18 no
  backend compartilhado (`amplify-tcc-artur-sandbox-16e78b8e8b`), com o
  `amplify_outputs.json` regerado. O `CreateUserProfileInput` do AppSync aceita
  `termsVersion` e `termsAcceptedAt`, e o cadastro grava a prova do aceite
  (LGPD, art. 8º, § 2º). Num ambiente cujo `amplify_outputs.json` ainda não tenha
  os campos, `src/services/aceiteDosTermosNoBackend.ts` continua evitando que o
  cadastro trave, com o aviso `[termos]` no console.

### 3.2 Fazer antes de pessoas de fora da equipe usarem o app

**P18. Ética em pesquisa, se houver testes com outras pessoas (nova).**
- **Norma:** Res. CNS nº 466/2012 e nº 510/2016; Ofício Circular CONEP nº 17/2022.
- **Quando importa:** se a metodologia do TCC incluir pessoas de fora da equipe usando o app, ou cedendo laudos, cujos resultados entram no artigo. O roteiro de avaliação já prevê isso: a L7 ("vinte perguntas reais, pela pessoa") e a U12 (laudos de emissores diferentes). TCC que é pesquisa com seres humanos precisa de protocolo no CEP, e a dispensa das atividades de ensino não alcança TCC.
- **O que fazer:** confirmar com o orientador e com as regras do IMT se os testes precisam passar pelo CEP. Se precisarem, o voluntário assina um TCLE (Termo de Consentimento Livre e Esclarecido), que é outro documento: ele trata da participação na pesquisa, e o termo do app trata do uso do app. Se os testes usarem só membros da equipe e dados fictícios, a questão provavelmente desaparece.
- **Redução de risco que vale de qualquer jeito:** pedir aos testadores que usem dados fictícios ou laudos anonimizados. O termo já sugere isso (seção 1).

### 3.3 Melhorias de baixa prioridade

Não impedem o uso no TCC. Vale fazer as que forem baratas, e algumas rendem
argumento para o artigo.

| # | O quê | Por que agora é baixa |
|---|---|---|
| P3 | Novo aceite para contas antigas e para versão nova do termo | As contas anteriores a esta mudança são da equipe. Basta concluir o perfil de novo numa conta nova. Só passa a importar se o termo mudar com testadores já cadastrados |
| P6 | Anexos do chat ficam no S3 depois de apagar a conversa (`apagarConversa` não remove `chat-attachments/`) | O termo não promete essa exclusão; ela sai na exclusão da conta (seção 4.1) |
| P7 | Apagar um remédio deixa os `MedicineDoseLog` dele | Idem |
| P8 | O cadastro não barra menores de 18 | Uso por convite, de adultos. Uma validação de idade no `profileSetupSchema` resolveria em poucas linhas |
| P9 | Sair da conta não limpa todas as cópias locais (vacinação, importações, localização, lembretes de prevenção e vacina) | Só importa se o mesmo celular for usado com mais de uma conta, **o que pode acontecer numa demonstração para a banca**. Correção: remover toda chave `@SuaSaude:*`, exceto o tema, no `logoutUser` |
| P10 | A nota do login ("Ao entrar você aceita...") é aceite implícito | É copy do Canvas 1b e não vale como consentimento; quem aceitou, aceitou nas caixas. Trocar por "Leia os Termos..." quando o design permitir |
| P12 | Logs do CloudWatch sem prazo de retenção | Os logs levam metadado, não conteúdo. Uma retenção de 90 dias no `backend.ts` resolve |
| P13 | Registro das operações (art. 37) e RIPD (art. 38) | Não é exigido para o TCC, mas a seção 11 do termo e a análise da memória do assistente já são meio caminho, e um RIPD curto renderia uma seção do artigo |
| P16 | A hora do aceite vem do aparelho, e o dono pode reescrever os campos | Suficiente para o TCC; o `updatedAt` do servidor corrobora |

### 3.4 Fora de escopo enquanto não houver distribuição pública

| # | O quê | Volta a valer se... |
|---|---|---|
| P14 | Enquadramento na Anvisa (RDC 657/2022) | o app for distribuído ou comercializado |
| P15 | Lembrete discreto na tela bloqueada; push pelo servidor (hoje desligado) | o push pelo servidor for ligado: antes disso, atualizar as seções 14 e 15, porque o serviço de push da Expo (EUA) vira operador |
| — | Exclusão de conta dentro do app, declarações de dados de saúde | o app for para uma loja |
| — | Guarda de registros por 6 meses (Marco Civil, art. 15) | houver uma pessoa jurídica explorando o app com fins econômicos |
| — | Verificação de idade do ECA Digital | o app passar a ser de acesso provável por menores |

---

## 4. Procedimentos para os pedidos que chegam pelo e-mail

O termo promete resposta em até 15 dias (seções 10, 16 e 18). Para cada
pedido, anote a data de chegada e a data de conclusão: é o registro que
demonstra o cumprimento (LGPD, art. 6º, X).

Antes de qualquer ação, **confirme que quem pede é o titular**: o pedido deve
vir do e-mail da própria conta.

### 4.1 Excluir a conta

1. **Achar o `sub`.** No Cognito, procure o usuário pelo e-mail e anote o `sub`.
   Quem testa pelo APK está na **produção**: o User Pool é o do
   `amplify_outputs.production.json`, e as tabelas e o bucket do passo 2 e 3 são
   os da stack `amplify-<appId>-main-branch-…`. O `amplify_outputs.json` aponta
   para o sandbox de desenvolvimento. Na produção, as tabelas e o User Pool têm
   proteção contra exclusão da *tabela* ou do *pool*, não dos itens: apagar os
   itens e o usuário funciona normalmente.
2. **DynamoDB.** Em cada tabela abaixo, apague os itens cujo campo `owner`
   começa com `<sub>::`:
   `UserProfile`, `MedicalDocument`, `LabResult`, `PrescriptionItem`,
   `Appointment`, `Medicine`, `MedicineDoseLog`, `MedicinePushDevice`,
   `MedicineNotificationDelivery`, `VaccineDose`, `HealthImport`,
   `ChatConversation`, `ChatMessage`, `AssistantMemoryFact`,
   `AssistantMemorySetting`.
   (`VaccinationCampaignCache` e `VaccinationSiteCache` são cache de dados
   públicos, sem dono.)
3. **S3.** Os arquivos ficam em pastas pelo `identityId`, que não é o `sub`.
   Descubra o `identityId` por uma chave já gravada (`UserProfile.photoKey`,
   `HealthImport.fileKeys` ou `MedicalDocument.extraPageKeys`, todas no formato
   `<pasta>/<identityId>/...`) **antes** de apagar as linhas do passo 2. Sem
   nenhuma chave gravada, procure objetos com o metadado `sub-de-quem-enviou`
   igual ao `sub`. Apague as pastas `medical-documents/<identityId>/`,
   `avatars/<identityId>/`, `health-imports/<identityId>/` e
   `chat-attachments/<identityId>/`.
4. **Cognito.** Por último, apague o usuário do User Pool e, se possível, a
   identidade correspondente no Identity Pool.
5. **Responder** ao titular confirmando a exclusão.

Se o pedido for a revogação do consentimento (seção 19 do termo), pergunte
antes se a pessoa também quer a eliminação e se quer uma cópia: revogar e
eliminar são coisas diferentes (art. 8º, § 5º, e art. 18, VI).

### 4.2 Enviar uma cópia dos dados

Exporte como JSON os itens dos mesmos passos 1 e 2 e baixe os arquivos das
pastas do passo 3. Dado de saúde não deve seguir anexado em e-mail aberto:
compartilhe por link de acesso restrito ao e-mail do titular ou em arquivo
compactado com senha, mandando a senha por outro meio.

### 4.3 Incidente de segurança

1. **Conter:** corrigir a falha, trocar credenciais expostas, revogar acessos.
2. **Avaliar:** quais dados e quantas pessoas. Envolvendo dado de saúde, presuma
   risco relevante.
3. **Comunicar em até 3 dias úteis** (Res. CD/ANPD nº 15/2024): à ANPD, pelo
   formulário de comunicação de incidente no gov.br/anpd, e a cada titular
   afetado, por e-mail. A mensagem diz o que aconteceu, quais dados, os riscos,
   o que foi feito e o contato da equipe.
4. **Registrar** o incidente, mesmo que não tenha sido comunicado, e guardar o
   registro por 5 anos.

---

## 5. Vigilância: o que muda o termo se mudar no código

| Se isto mudar | Atualize antes |
|---|---|
| Modelo do Bedrock (`BEDROCK_BASE_MODEL_ID` em `amplify/backend.ts`) | Seção 13. A AWS documenta que alguns modelos (hoje, Claude Fable 5 e 5.1) exigem retenção de até 30 dias e revisão humana pela AWS |
| Perfil de inferência (prefixo `us.`) ou região | Seção 15 (regiões de destino) |
| Novo serviço de terceiro (push, analytics, crash report, login social) | Seções 11, 14 e 15 |
| Novo dado coletado ou nova finalidade | Seções 11 e 12, e suba `VERSAO_DOS_TERMOS` |
| Exclusão de conta, exportação ou limpeza no logout feitas no app | Seções 16 e 18: passam a dizer "no app" em vez de "pelo canal" |
| Abertura ao público ou publicação em loja | Esta análise inteira: a seção 3.4 volta a valer |

## 6. Como mudar o termo

1. Edite `src/data/termosEPrivacidade.ts`. O teste reprova numeração com buraco
   e referência a uma "seção N" que não existe.
2. Mudança relevante (finalidade, dados, compartilhamento, transferência): suba
   `VERSAO_DOS_TERMOS` e a `VIGENCIA_DOS_TERMOS`. Com testadores já
   cadastrados, faça antes o P3.

---

## Fontes

- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD, tratamento de dados para fins acadêmicos (comentário ao guia de 2023): https://www.migalhas.com.br/depeso/389557/anpd-sobre-tratamento-de-dados-pessoais-para-fins-academicos
- Res. CD/ANPD nº 2/2022: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
- Res. CD/ANPD nº 19/2024: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024
- Res. CD/ANPD nº 15/2024 (incidentes), resumo: https://www.mattosfilho.com.br/unico/regulamento-incidente-seguranca/
- Res. CD/ANPD nº 18/2024 (encarregado), DOU de 17/07/2024: https://sintse.tse.jus.br/documentos/2024/Jul/17/diario-oficial-da-uniao-secao-1/autoridade-nacional-de-protecao-de-dados-resolucao-no-18-de-16-de-julho-de-2024-aprova-o-regulamento
- Res. CNS nº 510/2016 e TCC: https://www.ufrgs.br/cep/?p=982, https://ueg.br/cep/conteudo/11385_dvidas_frequentes e Ofício Circular CONEP nº 17/2022: https://fcfrp.usp.br/wp-content/uploads/sites/528/2024/12/Oficio-Circular-17-2022.pdf
- PL 2338/2023, situação: https://monitor.lcfconsulting.com.br/proposicoes/pl-2338-2023/ e https://bairogonzalez.com/en/in-the-world/ia/pl-2338-brazil-ai-legal-framework-2026/
- RDC 657/2022: https://www.mattosfilho.com.br/unico/anvisa-softwares-dispositivos/
- Res. CFM nº 2.454/2026: https://cesconbarrieu.com.br/resolucao-cfm-no-2-454-2026-regulamenta-o-uso-de-inteligencia-artificial-na-medicina/
- ECA Digital: https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026
- Amazon Bedrock: https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html, https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html, https://docs.aws.amazon.com/bedrock/latest/userguide/abuse-detection.html, https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html, https://aws.amazon.com/bedrock/security-compliance/
- AWS e LGPD: https://aws.amazon.com/compliance/brazil-data-privacy/
