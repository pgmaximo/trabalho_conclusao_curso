# Preview visual de telas (sem emulador, sem login)

Este app não tem emulador Android/iOS nem simulador disponível em todo
ambiente de desenvolvimento (ex.: sandboxes de agente, CI). Para validar uma
mudança de UI visualmente mesmo assim, o app roda no navegador via
`react-native-web` (`npm run web`), e uma rota de desenvolvimento
(`src/app/dev-preview.tsx`) renderiza as telas diretamente com props de
exemplo — a mesma técnica já usada nos testes RTL ("renderizar o componente
de tela com props explícitas, nunca a rota") — em vez de exigir login real no
Cognito e dados reais no Amplify.

Bloqueada em produção por `__DEV__`: em um build de produção a rota renderiza
`null` e não expõe nada.

## Passo a passo

1. Suba o servidor web (mantém watch mode — **não** definir `CI=1`, isso
   desativa o reload/observação de arquivos do Metro):
   ```bash
   npm run web -- --port 8098
   ```
   Espere até `Waiting on http://localhost:8098` aparecer no log.

2. Acesse `http://localhost:8098/dev-preview` no navegador — lista todos os
   previews cadastrados. Ou vá direto: `.../dev-preview?screen=<nome>`.

3. Para tirar um screenshot (útil para revisão por um agente, ou para anexar
   a um PR):
   ```bash
   npm run preview:screenshot -- "http://localhost:8098/dev-preview?screen=vaccination-with-data" /tmp/saida.png
   ```
   Usa Chrome já instalado no sistema via `playwright-core` (`channel:
   'chrome'`) — não baixa nenhum binário de navegador extra. Viewport fixo em
   390×844 (tamanho de celular) porque o app é mobile-first; um viewport
   desktop esconde bugs de layout que só aparecem em tela estreita.

## Adicionar um novo preview

Edite `src/app/dev-preview.tsx` e acrescente uma entrada no objeto
`PREVIEWS`, retornando o componente de tela com props de exemplo — mesmas
props que um teste RTL passaria. Não precisa de contexto extra: a tela já
herda `ThemeProvider`/`UserProvider`/`DocumentProvider` do `_layout.tsx`
raiz, como qualquer outra rota.

## O que este fluxo NÃO valida

- **Comportamento nativo real**: GPS (`expo-location`), notificações
  (`expo-notifications`), câmera/galeria (`expo-image-picker`), e qualquer
  outro módulo nativo não funcionam (ou funcionam de forma diferente) no
  build web. Essas features exigem um dispositivo real ou emulador.
- **Fluxo autenticado real**: o preview pula login/Amplify inteiramente. Para
  validar a integração de verdade com o backend (Cognito + AppSync +
  Lambdas), ainda é preciso `ampx sandbox` + um usuário real + o app rodando
  de fato (`npm run android`/`npm run ios` com um emulador, ou `npm start` +
  Expo Go num aparelho).
- **Diferenças de engine mobile vs. desktop Chrome**: o motor de renderização
  do navegador desktop não é idêntico ao WebView/Hermes do dispositivo —
  isso aproxima o layout, não o garante pixel a pixel.

## Gotchas

- **`CI=1` desativa o watch mode do Metro.** Se usado, é preciso reiniciar o
  servidor manualmente a cada mudança de arquivo — evite para iteração.
- **Arquivos de rota com `_` no início do nome são ignorados pelo Expo
  Router** (`_dev-preview.tsx` nunca vira uma rota real, dá "Unmatched
  Route") — por isso o arquivo se chama `dev-preview.tsx`, sem underscore.
- **Erros de console podem passar despercebidos num screenshot que "parece"
  normal** (ex.: uma seção falhou silenciosamente e não renderizou) —
  `scripts/preview-screenshot.mjs` sempre imprime os erros de console
  capturados e sai com código 1 se houver algum; sempre conferir essa saída,
  não só a imagem.
