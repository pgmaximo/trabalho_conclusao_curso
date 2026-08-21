# Constituição do projeto — SDD SuaSaúde

Todas as decisões de spec, plano e implementação neste projeto devem ser rastreáveis a uma das regras abaixo.

## 1. Fidelidade ao design é lei
Cada tela implementada deve corresponder ao Canvas do Claude Design (`specs/design/raw/*.dc.html`) em estrutura, hierarquia visual, textos, estados (vazio/carregando/erro/sucesso) e comportamento — equivalente, não apenas "parecido".

## 2. Nenhum dado mockado permanece
Todo campo, lista, gráfico ou indicador exibido deve estar conectado a uma fonte real: DynamoDB, S3, Cognito ou API própria. Placeholders só são aceitáveis quando documentados explicitamente como pendência técnica em `GAP_ANALYSIS.md` (ex.: integração de wearable, recomendação de exames via IA).

## 3. Stack existente é respeitada antes de expandida
Reaproveitar o que já está instalado (Expo Router, NativeWind/Tailwind, Amplify Gen 2, contexts existentes). Só introduzir nova biblioteca se preencher uma lacuna real e for escolha moderna e amplamente adotada no ecossistema React Native/Expo — com justificativa documentada em `plan.md`.

## 4. LGPD e responsabilidade da IA são requisitos de interface
Nenhuma tela do Assistente de IA (Bloco 4a) pode sugerir diagnóstico definitivo — copy deve deixar claro que a análise é preliminar/informativa (o próprio design já reforça isso com o aviso "Apoio informativo — não substitui avaliação médica."). Telas com dados sensíveis de saúde devem ter copy e fluxos de consentimento coerentes com a LGPD.

## 5. Nada quebra o que já funciona
Cognito, dados já persistidos no DynamoDB e uploads existentes no S3 não podem ser corrompidos por refatoração de UI. Mudança de schema é decisão explícita e documentada, nunca efeito colateral.

## 6. Cada tela é uma unidade de entrega rastreável
Toda tela `CRIAR`/`ATUALIZAR` em `GAP_ANALYSIS.md` ganha `spec.md` + `plan.md` + `tasks.md` própria, mesmo que a implementação final seja pequena.

## 7. Paleta real vs. paleta de artefatos externos
Os tokens de cor deste app vêm exclusivamente dos arquivos em `specs/design/raw/`. Verde `#10794E` (primária) e azul `#1B63C4` (secundária) são os tokens reais confirmados no Canvas. Cores usadas em outros artefatos do TCC (ex.: banner/estande da EUREKA, `#3FAE6B` / `#DCF5E6`) NÃO são tokens do app e não devem ser reaproveitadas aqui.

## 8. Ambiguidade é documentada, não travada
Quando o Canvas for ambíguo sobre qual dado real alimenta um elemento, a spec.md da tela registra a ambiguidade e propõe a interpretação mais coerente com o restante do app e com o artigo do TCC — sem bloquear a execução.

## 9. Escopo real do design (achado na Fase 0)
O projeto de Claude Design contém, num único arquivo exportado (`SuaSaude - Bloco 1 - Base e Autenticacao.dc.html`), as 4 Blocos completas do produto: Bloco 1 (Sistema de design + Autenticação), Bloco 2 (Perfil de Saúde, Home e Agenda), Bloco 3 (Exames & Receitas, Medicamentos, Prevenção), Bloco 4 (Assistente de IA, Perfil, Carteira de vacinação) — 25 telas ao todo. Não há Blocos adicionais (Wearables e Perfil/Empresa citados no prompt original não existem como Blocos separados no Canvas atual; tratar como não descobertos até confirmação em nova sincronização).
