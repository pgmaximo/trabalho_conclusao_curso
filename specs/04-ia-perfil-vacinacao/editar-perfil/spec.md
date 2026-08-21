# EPIC: Editar Perfil — Scroll Único

## 1. Identificação
- Bloco/arquivo de origem no Claude Design: Tela 4c ("Editar perfil — scroll único") em `specs/design/raw/SuaSaude - Bloco 1 - Base e Autenticacao.dc.html` (linhas 128-188).
- Rota/arquivo no código (existente): `src/app/edit-profile.tsx` (rota `/edit-profile`) → `src/screens/EditProfileScreen.tsx` (`EditProfileScreen`).
- Ator(es): usuário final já cadastrado, com `UserProfile` existente, que quer ajustar dados pessoais/de saúde já preenchidos no onboarding (Tela 2a) — chegada única a partir de 4b ("Editar perfil").

## 2. História da funcionalidade
Como uma pessoa que já completou meu perfil de saúde no onboarding, quero editar meus dados pessoais e hábitos em uma única tela de rolagem (sem voltar ao wizard de 4 etapas), incluindo trocar minha foto de perfil, para manter minhas informações atualizadas com o mínimo de fricção possível.

### Cenários (Given/When/Then)
- **Editar e salvar com sucesso:** Dado que o usuário abre "Editar perfil" a partir de 4b com dados já preenchidos, quando ele altera um ou mais campos (ex.: peso) e toca em "Salvar alterações", então o `UserProfile` é atualizado via Amplify (`update`, não `create`, pois o registro já existe) e o app volta para 4b exibindo os novos valores.
- **Campo obrigatório vazio:** Dado que o usuário apaga o campo "Nome completo" ou "Data de nascimento" e toca em "Salvar alterações", quando a validação roda, então uma mensagem de erro inline aparece sob o campo (ex.: "Informe seu nome completo.") e o salvamento é bloqueado — sem chamada ao Amplify.
- **Sexo = Feminino mostra pergunta de gravidez:** Dado que o usuário seleciona o chip "Feminino" em "Sexo biológico", quando a seleção é aplicada, então a pergunta condicional "Está grávida atualmente?" (chips Sim/Não) aparece imediatamente abaixo; ao trocar para "Masculino" ou "Outro", a pergunta desaparece e a resposta de gravidez é limpa (não permanece órfã no estado).
- **Tentar trocar foto (pendência):** Dado que o usuário toca em "Alterar foto" abaixo do avatar, quando não existe hoje nenhuma integração de upload de imagem de perfil no código (ver `plan.md` §2 — `photoUrl` é um campo reservado, nunca escrito), então a ação deve exibir um estado explícito de "em breve"/desabilitado — nunca fingir sucesso ou silenciosamente não fazer nada — até a Fase 3 implementar o upload real via S3 (regra 2 da constituição).

## 3. Estrutura da página
- **Cabeçalho fixo**: botão "‹" voltar (48×48px, borda 1.5px `#DFE3E1`, radius 14) + título "Editar perfil" (600 20px).
- **Corpo rolável** (`padding: 8px 20px 0`):
  - **Bloco de avatar**: avatar circular 80×80px (bg `#E8F5EE`, borda 2px `#C7E8D6`, iniciais 600 26px `#0C6341`) centralizado, com link "Alterar foto" (600 16px, `#1B63C4`) abaixo.
  - **Campo "Nome completo"** (input 52px, radius 14, borda 1.5px `#DFE3E1`).
  - **Campo "Data de nascimento"** (mesmo estilo de input).
  - **"Sexo biológico"** — 3 chips na mesma linha (Masculino / Feminino / Outro, 52px altura, radius 14, borda 1.5px, selecionado = borda+bg verde `#10794E`/`#E8F5EE`, texto `#0C6341`).
  - **Pergunta condicional "Está grávida atualmente?"** (`sc-if` em `showPregnant`) — 2 chips Sim/Não, 48px altura, radius 12, mesmo padrão de cor selecionado/não selecionado, exibida só quando sexo = Feminino.
  - **Linha "Altura (cm)" / "Peso (kg)"** — 2 campos lado a lado (`flex:1` cada), inputs 52px, placeholders numéricos diretos (centímetros/kg inteiros, sem conversão).
  - **Card "Hábitos"** (bg `#fff`, borda 1px `#EFF1F0`, radius 16, padding 16): 4 blocos pergunta + 3 chips cada (Sim / Não / "Não informar", o 3º chip `flex:1.3`, mais largo), nesta ordem e com estes rótulos exatos: "Tabagismo", "Atividade sexual", "Atividade física", "Consumo de álcool" — rótulos nominais curtos, **diferentes** da forma interrogativa usada na Tela 2a (ver `plan.md` §1, nota de divergência intencional entre as duas telas).
- **Rodapé fixo**: botão "Salvar alterações" (`flex` full-width, 56px, bg `#10794E`, radius 14, texto branco 600 17px).
- **Barra home-indicator** decorativa (130×5px, `#C3C9C6`) no rodapé do frame.

## 4. Mapa de navegação
| Origem | Destino | Trigger |
|---|---|---|
| `/profile` (4b) | `/edit-profile` (4c) | Botão "Editar perfil" em 4b |
| `/edit-profile` (4c) | `/profile` (4b) | Botão "‹" voltar no cabeçalho (sem salvar) |
| `/edit-profile` (4c) | `/profile` (4b) | "Salvar alterações" com sucesso — `router.back()` após `refreshUser()` |
| `/edit-profile` (4c) | (permanece na tela) | Campo obrigatório vazio (erro de validação inline) — sem chamada ao Amplify |
| `/edit-profile` (4c) | (permanece na tela) | Falha ao salvar (rede/autenticação) — `Alert.alert` de erro, sem navegação |
| `/edit-profile` (4c) | (permanece na tela, sem navegação de tela) | Toque em "Alterar foto" — hoje sem destino real (ver §2 pendência); Fase 3 deve abrir seletor de imagem nativo (câmera/galeria), não navegar para outra rota |

## 5. Mapa de dados
| Campo do Canvas 4c | Campo no formulário atual (`EditProfileFormState`) | Campo real no `UserProfile` (`amplify/data/schemas/user.ts`) | Observação |
|---|---|---|---|
| Avatar + "Alterar foto" | `photoUrl` (prop de leitura, vindo de `UserContext`) | **Não existe coluna no schema; `photoUrl` é lido de `user.photoUrl` mas nunca escrito** | **PENDÊNCIA NOVA (regra 2):** não há nenhum fluxo de upload de imagem de perfil no código — `photoUrl` está marcado no próprio `UserContext.tsx` como "reservado para upload futuro, não implementado" (linha 27-28). O app já usa S3 via `aws-amplify/storage` (`uploadData`/`getUrl`/`remove`) em `examService.ts` para documentos — o mesmo padrão pode ser reaproveitado para avatares, mas isso é uma capacidade nova (bucket/path de avatar, redimensionamento, permissão de leitura pública/owner), não apenas uma mudança de UI. Ver `plan.md` §2. |
| Nome completo (`wizName`) | `fullName` | `fullName: a.string().required()` | Mapeamento direto, sem pendência. |
| Data de nascimento (`wizBirth`) | `birthDate` (DD/MM/AAAA) | `birthDate: a.date().required()` | Convertido para `YYYY-MM-DD` em `edit-profile.tsx` (`awsDateToBrazilian`/inverso). Sem pendência. |
| Sexo biológico — Masculino/Feminino/**Outro** | `biologicalSex` (`'female'\|'male'\|'prefer_not_to_say'`) | `sex: a.enum(['Masculino', 'Feminino'])` | **MESMA PENDÊNCIA já registrada para a Tela 2a** (`specs/02-perfil-home-agenda/wizard-perfil-saude/spec.md` §5, `plan.md` §2): o schema só aceita 2 valores; a UI atual rotula a 3ª opção "Prefiro não informar" (Canvas 4c usa "Outro", igual ao Canvas 2a) e o valor é descartado silenciosamente ao salvar. **Não redecidir aqui** — a resolução (estender `sex` para `a.enum(['Masculino', 'Feminino', 'Outro'])`) deve ser a mesma e aplicada de forma consistente às duas telas na mesma Fase 3 (ver `plan.md` §2 deste EPIC). |
| Está grávida atualmente? (`showPregnant`, Sim/Não) | `pregnancyStatus` (`'yes'\|'no'\|'unknown'`) | `pregnancy: a.boolean()` | Mapeamento direto quando sexo = feminino e resposta ≠ "unknown". Sem pendência de schema. |
| Altura (cm) (`wizHeight`, placeholder direto em cm) | `heightCm` (hoje string em metros com vírgula, ex. "1,72") | `heightCm: a.integer()` | **Divergência de UX igual à identificada na Tela 2a**: o Canvas pede centímetros inteiros diretamente; a implementação atual usa metros decimais com conversão (`heightCmToMeters`/inverso). Mesma correção proposta na Tela 2a (`plan.md` §4 item 3) deve ser aplicada aqui, para as duas telas ficarem consistentes entre si e com o Canvas. |
| Peso (kg) (`wizWeight`) | `weightKg` (string) | `weightKg: a.float()` | Mapeamento direto, sem pendência. |
| Tabagismo (`smokeY/N/P`) | `tobaccoUse` (`'yes'\|'no'\|'unknown'`) | `isSmoker: a.boolean()` | Mapeamento direto quando ≠ "unknown"; "Não informar" → campo omitido (não `false`). Sem pendência. |
| Atividade sexual | `sexuallyActive` | `sexuallyActive: a.boolean()` | Mesma lógica acima. Sem pendência. |
| Atividade física | `physicalActivity` | `physicalActivity: a.boolean()` | Mesma lógica acima. Sem pendência. |
| Consumo de álcool | `alcoholUse` | `alcoholConsumption: a.boolean()` | Mesma lógica acima. Sem pendência. |
| — (Canvas 4c não tem campos de histórico clínico) | `formStateToProfileValues()` hoje envia `chronicConditions/medications/allergies` como string vazia `''` | **Não existe no schema hoje** | **RISCO DE REGRESSÃO SILENCIOSA (regra 2), a confirmar em `plan.md` §2:** a Tela 4c não coleta esses 3 campos (não estão no Canvas), mas o `edit-profile.tsx` atual já monta um payload com esses campos vazios via `formStateToProfileValues()`. Se/quando o schema for estendido com `chronicConditions/medications/allergies` (decisão da Tela 2a), salvar pelo formulário 4c **sem tocar nesses campos** não pode sobrescrever com string vazia valores que o usuário já preencheu no onboarding — precisa ficar de fora do payload de update, não ser enviado como `''`. |

## 6. Requisitos não-funcionais específicos
- **Fidelidade ao design é lei (regra 1):** rótulos das 4 perguntas de hábitos em 4c são nominais curtos ("Tabagismo", "Atividade sexual", "Atividade física", "Consumo de álcool") — **intencionalmente diferentes** da forma interrogativa completa exigida na Tela 2a ("Você fuma?" etc., ver `specs/02-perfil-home-agenda/wizard-perfil-saude/spec.md` §6). Essa é uma divergência real e documentada do próprio Canvas (2a e 4c usam textos diferentes para o mesmo dado), não um erro a "corrigir" para uniformizar — cada tela deve seguir seu próprio Canvas literalmente.
- **Seletor de sexo biológico** deve ser 3 chips na mesma linha (Masculino/Feminino/Outro, 52px), igual ao padrão da Tela 2a — hoje a implementação usa `PillGroup` com 3 opções em ordem diferente (Feminino/Masculino/Prefiro não informar) e rótulo "Prefiro não informar" em vez de "Outro"; ajustar ordem e rótulo para bater com o Canvas.
- **Nunca cor sozinha:** chips selecionados (sexo, gravidez, hábitos) combinam borda + fundo + texto coloridos — já é o padrão do `PillGroup` existente, manter.
- **Botão "Alterar foto" sem funcionalidade real deve ser honesto sobre isso (regra 2):** enquanto o upload de avatar não existir, o link não pode simular sucesso (trocar a imagem localmente sem persistir) nem falhar silenciosamente — deve indicar visualmente que a função está indisponível/"em breve", ou (Fase 3) abrir o fluxo real de seleção+upload.
- **Preservação de dados não editados (regra 5):** salvar em 4c não pode apagar campos do `UserProfile` que a tela 4c não exibe (histórico clínico, se/quando existir) — ver risco de regressão no mapa de dados acima.
- **Acessibilidade de toque:** chips e botões mantêm o piso de 48-56dp de altura definido em `DESIGN_TOKENS.md` §3 — já respeitado nos tamanhos do Canvas (44-52px, dentro da tolerância aceitável para hábitos e igual ao padrão de campos de 52px usados nas outras telas).
- **Consistência entre 2a e 4c (regra 5, decisão de schema compartilhada):** qualquer mudança de schema (`sex` enum, colunas clínicas) decidida para a Tela 2a deve valer identicamente para 4c — não pode haver duas implementações divergentes do mesmo `UserProfile.sex`/campos. Ver `plan.md` §2.

## 7. Critérios de aceite
- [ ] Editar um ou mais campos e tocar em "Salvar alterações" atualiza (`update`, não `create`) o `UserProfile` real via Amplify e volta para a tela de Perfil (4b) com os novos valores refletidos.
- [ ] Apagar "Nome completo" ou "Data de nascimento" e tentar salvar exibe erro inline sob o campo correspondente e bloqueia o envio ao Amplify.
- [ ] Selecionar "Feminino" em "Sexo biológico" exibe imediatamente a pergunta "Está grávida atualmente?" (Sim/Não); trocar para "Masculino"/"Outro" a esconde e limpa a resposta anteriormente dada.
- [ ] "Sexo biológico" é renderizado como 3 chips na mesma linha, ordem Masculino → Feminino → Outro, rótulo exato "Outro" (não "Prefiro não informar"), com o padrão visual selecionado/não selecionado de `DESIGN_TOKENS.md` §4.
- [ ] "Altura (cm)" e "Peso (kg)" usam rótulos e formato de centímetros/kg inteiros diretos do Canvas, sem conversão de metros decimais.
- [ ] O card "Hábitos" exibe as 4 perguntas com os rótulos nominais curtos exatos do Canvas 4c ("Tabagismo", "Atividade sexual", "Atividade física", "Consumo de álcool"), cada uma com 3 chips (Sim/Não/Não informar, 3º chip mais largo).
- [ ] Tocar em "Alterar foto" não simula sucesso nem falha silenciosamente enquanto o upload de avatar não existir — exibe estado "em breve"/desabilitado explícito (ou implementa o upload real via S3, se a Fase 3 decidir por isso).
- [ ] Salvar pelo formulário 4c nunca sobrescreve com valor vazio um campo do `UserProfile` que a tela 4c não exibe (ex.: histórico clínico, se/quando existir no schema).
- [ ] Nenhum campo preenchido pelo usuário em 4c (incluindo "Outro" em sexo biológico) é descartado silenciosamente no salvamento — mesma decisão de schema da Tela 2a, aplicada de forma consistente.
- [ ] Tela funciona em light e dark mode com os pares de cor definidos em `DESIGN_TOKENS.md` (chips selecionados/não selecionados, card "Hábitos", inputs).
