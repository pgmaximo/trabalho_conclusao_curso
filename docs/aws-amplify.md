# AWS Amplify Gen 2 no desenvolvimento

Este projeto usa AWS Amplify Gen 2 para conectar o app Expo/React Native a recursos de backend na AWS. Na pratica, o Amplify fica dividido em duas partes:

- `amplify/`: backend-as-code, ou seja, a definicao dos recursos AWS em TypeScript.
- `src/services/`: codigo de runtime do app, ou seja, servicos que usam Cognito, AppSync/Amplify Data e outros SDKs durante a execucao do aplicativo.

A pasta `amplify/` fica na raiz de proposito. Ela nao deve ser movida para `src/services/`, porque ela nao e codigo de tela nem servico de runtime; ela descreve infraestrutura.

## Como este projeto usa o Amplify

Os arquivos principais sao:

- `amplify/backend.ts`: junta os recursos do backend em uma unica definicao.
- `amplify/auth/resource.ts`: define autenticacao com Cognito.
- `amplify/data/resource.ts`: define o schema do Amplify Data usado pelo app.
- `amplify_outputs.json`: configuracao gerada para o app saber qual backend deve acessar.
- `src/services/amplify/configureAmplify.ts`: carrega `amplify_outputs.json` e chama `Amplify.configure(outputs)`.
- `src/services/profileSetupRepository.ts`: exemplo de servico de runtime que usa Amplify Data para salvar o perfil inicial.

O fluxo e:

1. O backend e descrito em TypeScript dentro de `amplify/`.
2. A CLI do Amplify provisiona ou consulta esses recursos na AWS.
3. A CLI gera `amplify_outputs.json` com as informacoes publicas de conexao.
4. O app importa esse JSON no bootstrap global.
5. As telas e servicos do app usam `aws-amplify` para autenticar usuarios e acessar dados.

## Como usar o projeto no dia a dia

Para rodar o app usando o backend compartilhado de desenvolvimento:

```bash
npm install
npm start
```

Para validar antes de entregar mudancas:

```bash
npm run validate
```

Esse comando executa:

```bash
npm run typecheck
npm run typecheck:backend
npm run lint
npm run test:ci
```

Se voce so vai mexer no frontend ou consumir o backend dev compartilhado, normalmente nao precisa rodar sandbox nem criar backend proprio. O arquivo `amplify_outputs.json` versionado ja aponta o app para o ambiente de desenvolvimento definido para o time.

## O que e o amplify_outputs.json

`amplify_outputs.json` e o arquivo de configuracao do cliente no Amplify Gen 2. Ele informa ao app coisas como:

- regiao AWS;
- dados publicos do Cognito;
- endpoint do Amplify Data/AppSync;
- metadados necessarios para o client do Amplify se conectar ao backend correto.

Ele e usado aqui em `src/services/amplify/configureAmplify.ts`:

```ts
import { Amplify } from 'aws-amplify';
import outputs from '../../../amplify_outputs.json';

Amplify.configure(outputs);
```

Esse arquivo nao e uma credencial secreta. Ele nao deve conter senha, token AWS, access key ou secret key. Ele contem configuracoes publicas de cliente, por isso neste projeto ele e versionado para que todos usem o mesmo backend de desenvolvimento.

Mesmo assim, ele e especifico de ambiente. O output de desenvolvimento nao deve ser tratado como configuracao final de producao.

## Quando editar o amplify_outputs.json

Nao edite `amplify_outputs.json` manualmente.

Ele deve ser gerado pela CLI do Amplify. Se o backend mudar, gere novamente o arquivo com a CLI em vez de tentar ajustar valores na mao. Edicao manual pode deixar o app apontando para recursos errados ou quebrar o formato esperado pelo SDK.

## O que a AWS CLI faz

A AWS CLI e uma ferramenta geral da AWS. Ela nao cria o `amplify_outputs.json` diretamente para este projeto.

O papel dela e configurar o acesso local a uma conta AWS, por exemplo com:

```bash
aws configure
```

Esse comando grava credenciais e perfis locais no computador do desenvolvedor. Normalmente esses dados ficam fora do projeto, em arquivos da maquina, como a pasta `.aws/`.

Importante:

- credenciais AWS nunca devem ir para o Git;
- `.aws/` nao deve ser versionada;
- `.env` e `.env*.local` nao devem ser versionados;
- access keys, secret keys, tokens e senhas nunca devem aparecer no codigo.

Em resumo: a AWS CLI prepara sua maquina para autenticar na AWS; quem entende o backend Amplify Gen 2 e gera outputs para o app e a CLI do Amplify.

## O que a CLI do Amplify faz

No Amplify Gen 2, a CLI usada no projeto e o `ampx`, fornecido pelas dependencias `@aws-amplify/backend` e `@aws-amplify/backend-cli`.

Ela consegue:

- ler os arquivos TypeScript dentro de `amplify/`;
- provisionar um sandbox pessoal na AWS;
- atualizar recursos do backend;
- consultar um backend ja existente;
- gerar `amplify_outputs.json` para o frontend consumir.

O script do projeto para abrir um sandbox e:

```bash
npm run amplify:sandbox
```

Esse script executa:

```bash
ampx sandbox
```

Quando o sandbox sobe, a CLI cria ou atualiza recursos na AWS e gera o `amplify_outputs.json` na raiz do projeto.

## Como o JSON do Amplify e gerado

Existem dois caminhos principais.

### 1. Gerar pelo sandbox

Use quando voce quer um backend pessoal para desenvolver ou testar mudancas de backend:

```bash
npm run amplify:sandbox
```

ou diretamente:

```bash
npx ampx sandbox
```

Esse comando usa suas credenciais AWS locais, le `amplify/`, provisiona os recursos em uma sandbox cloud e escreve `amplify_outputs.json` com os dados desse ambiente.

### 2. Gerar a partir de um backend existente

Use quando voce quer gerar o arquivo para uma branch ou app Amplify ja existente:

```bash
npx ampx generate outputs --app-id <amplify-app-id> --branch <branch>
```

Tambem e possivel gerar a partir de uma stack CloudFormation especifica:

```bash
npx ampx generate outputs --stack <cloudformation-stack-name>
```

Esses comandos sao uteis para recriar o `amplify_outputs.json` sem subir uma sandbox nova.

## Como pensar em desenvolvimento, homologacao e producao

Neste momento, o projeto padroniza apenas o desenvolvimento colaborativo:

- `amplify_outputs.json` versionado aponta para o backend dev compartilhado.
- `amplify/` documenta e valida o backend-as-code.
- `src/services/` consome o backend em runtime.

Antes de release, producao deve ter outro ambiente e outro output. O ideal e definir um fluxo separado para producao, por exemplo por branch, pipeline de build ou configuracao de deploy.

## O que nao vai para o Git

Continuam fora do Git:

- `.amplify/`;
- `.aws/`;
- `.env`;
- `.env*.local`;
- `node_modules/`;
- `dist/`;
- caches locais;
- credenciais, tokens, senhas e secrets reais.

## Referencias oficiais

- Amplify Gen 2 sobre `amplify_outputs.json`: https://docs.amplify.aws/react-native/reference/amplify_outputs/
- Comandos da CLI `ampx generate outputs`: https://docs.amplify.aws/vue/reference/cli-commands/#npx-ampx-generate-outputs
- Quickstart Amplify Gen 2: https://docs.amplify.aws/javascript/start/quickstart/
- Guia Expo sobre variaveis de ambiente: https://docs.expo.dev/guides/environment-variables/
