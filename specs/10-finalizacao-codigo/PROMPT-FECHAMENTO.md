# PROMPT DE FECHAMENTO — SDD 10 e merge na main

> **Como usar:** em uma conversa nova (`/clear`), mande `@specs/10-finalizacao-codigo/PROMPT-FECHAMENTO.md`.
> Ele substitui o `PROMPT-PADRAO.md` para esta conversa: não é um épico novo, é o fechamento da fase.

---

## Objetivo

Fechar a SDD 10 **hoje**, levar tudo para a `main` e fazer os testes e a validação finais **na `main`**. A apresentação do TCC é **amanhã**. Só o teste necessário: nada de rodada de conferência nova no sandbox.

## Estado de partida (confira, não confie)

- Parte 1 (E1 a E12): código concluído. Conferência no sandbox: 67/70 na rodada completa no Sonnet 4.6; A1 a A13 corrigidos no código. Leia `01-melhorias-ia/conferencia-sandbox/README.md` (Achados e Pendências).
- Parte 2 (UI): nunca começou, sem PRD. **Fica fora**, como trabalho futuro.
- A `main` é ancestral da branch (merge sem conflito). A branch está 9 commits à frente do `origin`.

## Corte de escopo (decidido)

- **Não medir mais nada no sandbox.** As pendências 1 a 6 da conferência viram "Limitações conhecidas" no README da conferência, uma linha cada. A DS16 (A13) fica registrada como "corrigida no código; conferida no backend da `main`" se o teste da IA abaixo passar, ou "sem conferência" se eu decidir não fazer.
- **Teste com a IA: eu faço, se for necessário.** Você decide se é necessário e me diz por quê em duas linhas. Se for, me dê uma lista curta (no máximo 6 perguntas) para eu fazer pelo app, na `main`, com o que conferir em cada resposta. As da DS16 entram: "quais exames preventivos eu devo fazer?" (não pode degradar por "você tem N recomendações") e "o que o app mostra na parte de prevenção?" (não pode ser barrada pelo guardrail).
- **Achado novo:** registre como `DS18` em `decisoes/conferencia-no-sandbox.md` e pare para eu decidir. Só corrigir se quebrar a demonstração.

## Passos

1. **Conferir o estado**: `git status`, commits à frente da `main`, árvore limpa. Relatar em poucas linhas.
2. **Documentação reflete o feito**, sem reescrever história:
   - `conferencia-sandbox/README.md`: seção "Limitações conhecidas" (pendências 1 a 6 e a cota de 10/min).
   - `01-melhorias-ia/README.md`: estado final de cada épico.
   - `10-finalizacao-codigo/README.md`: Parte 1 encerrada, Parte 2 como trabalho futuro.
   - `AGENTS.md`: só se algo nele ficou falso.
3. **Commit** dos docs: me mostre a mensagem antes; commit só depois do meu ok.
4. **Merge**: proponha `git switch main && git merge --no-ff sdd-10-finalizacao-codigo` e espere o ok. Push: só se eu pedir.
5. **Backend da `main`** (me pergunte antes de qualquer coisa): o `amplify_outputs.json` commitado aponta para o backend da `main` (pool `us-east-1_CFEpevMNE`), não para o sandbox. Sem implantar o código novo nele, o app de amanhã roda o chat **antigo**. Descubra como esse backend é implantado (Amplify Hosting com build da branch, que dispara no push? deploy manual?) e me traga o caminho, com o que pode quebrar (schema novo do Data, segredo `USPSTF_API_KEY`, versão do guardrail, acesso ao Sonnet 4.6). Não implante sem o meu ok. Node 20 (`nvm use 20.20.1`).
6. **Validação final na `main`**: `npm run validate` completo, resultado colado. Falhou: diagnosticar e me mostrar antes de corrigir.
7. **Teste da IA** (se necessário): eu faço pela lista do corte de escopo, depois do deploy do backend. Você só registra o resultado que eu te passar.

## Entrega final (relatório)

- Commit e merge: hashes, feitos ou aguardando.
- Backend da `main`: como é implantado, implantado ou aguardando.
- `validate` na `main`: suítes e testes, verde ou não.
- Teste da IA: necessário ou não, e por quê; resultado, se feito.
- Lista de 5 minutos para eu conferir no celular (abrir formulário pelo cartão do E11, GPS na Vacinação do E8, marcar dose do E3).
- **O que estava errado no plano ao executá-lo** (eu leio esta parte).
- Limitações conhecidas, uma linha cada, prontas para o slide de trabalho futuro.

## Regras que continuam valendo

pt-BR em texto, comentário e teste. Nada de credencial, `.env*`, `.aws/` ou `.amplify/` no repositório. TDD com falha confirmada se tiver que corrigir código. Reporte fielmente: nada vira "ok" sem a saída do comando.
