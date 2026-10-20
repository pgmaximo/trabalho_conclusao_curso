const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// `@aws-amplify/data-schema@1.25.x` publica o campo "react-native" dos
// subpacotes `runtime` e `internals` apontando para `../src/**`, mas a pasta
// `src/` nao vai no tarball. O Metro prefere esse campo e quebra com
// "package specifies a `main` module field that could not be resolved".
// Redireciona esses dois subpacotes para o build CJS em `dist/`.
const dataSchemaDir = path.dirname(require.resolve('@aws-amplify/data-schema/package.json'));
const dataSchemaSubpaths = {
  '@aws-amplify/data-schema/runtime': path.join(dataSchemaDir, 'dist/cjs/runtime/index.js'),
  '@aws-amplify/data-schema/internals': path.join(dataSchemaDir, 'dist/cjs/internals/index.js'),
};
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const filePath = dataSchemaSubpaths[moduleName];
  if (filePath) return { type: 'sourceFile', filePath };
  return (upstreamResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
