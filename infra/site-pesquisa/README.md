# Pesquisa de opinião da feira

Guarda as respostas da pesquisa que o visitante responde depois de escanear o QR code (`opiniao.html`) e conta os cliques em "Baixar o app". Spec: `docs/superpowers/specs/2026-10-24-site-feira-pesquisa-design.md`.

## O que existe aqui

| arquivo | papel |
|---|---|
| `pesquisa.mjs` | As 11 perguntas e a validação. A página e a Lambda leem o mesmo módulo. |
| `index.mjs` | A Lambda: `salvar`, `clique` e `listar` (só com a senha do grupo). |
| `repositorio.mjs` | O acesso ao DynamoDB. |
| `template.json` | A stack CloudFormation `suasaude-pesquisa`: tabela `suasaude-feira-respostas`, Lambda e Function URL. |

## Separada do backend do app, de propósito

A stack não usa Cognito, não toca em `amplify/` e não altera nenhuma stack `amplify-*`. Uma única stack serve à produção e ao sandbox. O implantador confere isso antes e depois e falha se algo mudou.

## Implantar

```bash
PESQUISA_SENHA='<senha do painel>' npm run pesquisa:implantar
npm run site:publicar
```

- A senha nunca entra em arquivo do repositório. Ela passa por um arquivo temporário (apagado no fim) e vira o parâmetro `NoEcho` da stack.
- A primeira linha cria a stack e sobe o código. Rodar de novo atualiza a stack e **sempre** sobe o código de novo (uma atualização da stack devolveria o marcador que o template traz no lugar do código).
- O `site:publicar` lê o endereço da Function URL da saída da stack.

## Sobre a senha do painel

É uma proteção simples. Os dados são anônimos (sem nome, e-mail nem IP), e a senha existe só para a página `resultados.html` não ficar aberta a qualquer pessoa. Não é segurança forte.

## Apagar

A tabela tem `DeletionPolicy: Retain`: apagar a stack **não** apaga as respostas. Para apagá-las também, remova a tabela `suasaude-feira-respostas` à mão no console do DynamoDB.
