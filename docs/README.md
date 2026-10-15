# docs/

Material de apoio e de trabalho para IA/desenvolvimento. Esta pasta é local
(agora versionada no git, mas não é documentação formal de produto — isso
vive em `specs/`, que fica na raiz do projeto por ser referenciada por
caminho literal em dezenas de comentários no código-fonte).

- `aws-amplify.md` — notas sobre a configuração do backend Amplify.
- `CONEXOES.md` — mapeamento de integrações/conexões do projeto.
- `DADOS_MOCKADOS.md` — inventário de dados mockados (o que ainda não está
  ligado ao backend real).
- `prompts/` — prompts de trabalho usados em sessões de IA.
- `superpowers/plans/` — planos gerados pelo skill `superpowers` durante
  sessões de desenvolvimento.
- `graphify-out/` — saída gerada pelo skill `graphify` (grafo de
  conhecimento do código). Artefato regenerável, permanece no
  `.gitignore` (ver `graphify-out/` em `.gitignore`).

## O que NÃO está aqui (e por quê)

- `CLAUDE.md` e `AGENTS.md` ficam na raiz do repositório porque o Claude
  Code (e outras ferramentas que seguem a convenção `AGENTS.md`) só
  carrega essas instruções automaticamente quando estão no root do
  projeto — movê-las quebraria esse carregamento.
- `specs/` fica na raiz porque é documentação de projeto versionada
  (spec-driven development), citada por caminho literal em comentários
  de código-fonte (`src/**`). Mover para dentro de `docs/` exigiria
  reescrever essas referências.
