/**
 * Entry point customizado.
 *
 * Por que existe: com `main: "expo-router/entry"` direto, o Expo Router
 * resolve e importa (parte de) a árvore de rotas em `src/app` antes do corpo
 * de `src/app/_layout.tsx` terminar de rodar — e alguns desses arquivos
 * chamam serviços do Amplify (`generateClient`, `getCurrentUser`, etc.) no
 * escopo do módulo. Resultado observado nos logs do device: vários warnings
 * "Amplify has not been configured" logo na abertura do app, antes de
 * `Amplify.configure()` (chamado dentro de `_layout.tsx`) rodar.
 *
 * Import aqui, antes de `expo-router/entry`, garante que a configuração do
 * Amplify é a primeiríssima coisa a rodar no bundle, independente da ordem
 * de resolução de rotas do Expo Router.
 */
import './src/services/amplify/configureAmplify';
import 'expo-router/entry';
