#!/usr/bin/env node
/**
 * Resumo do arquivo:
 * Hook do EAS Build (`eas-build-pre-install` no package.json). Num APK para
 * testadores ou para a banca, troca o `amplify_outputs.json` -- que aponta para
 * o sandbox compartilhado de desenvolvimento -- pelo da producao, gerado pelo
 * `npm run deploy:prod`.
 *
 * A troca acontece so na maquina do build. O arquivo versionado continua sendo
 * o do sandbox, e `npm start` continua usando o sandbox.
 *
 * Quem decide o ambiente:
 *   - AMPLIFY_ENV, quando definido ('production' ou 'sandbox');
 *   - senao, o perfil do EAS: `preview` (APK) e `production` usam producao, e
 *     `development` continua no sandbox. EAS_BUILD_PROFILE e definido pelo
 *     proprio EAS durante o build.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PERFIS_DE_PRODUCAO = ['preview', 'production'];

const ambiente =
  process.env.AMPLIFY_ENV ??
  (PERFIS_DE_PRODUCAO.includes(process.env.EAS_BUILD_PROFILE ?? '') ? 'production' : 'sandbox');

if (ambiente !== 'production') {
  console.log('[outputs] Mantendo amplify_outputs.json (sandbox de desenvolvimento).');
  process.exit(0);
}

const producao = fileURLToPath(new URL('../amplify_outputs.production.json', import.meta.url));
const destino = fileURLToPath(new URL('../amplify_outputs.json', import.meta.url));

// Faltar o arquivo e erro, e nao motivo para seguir com o do sandbox: um APK de
// producao falando com o sandbox de alguem seria pior que um build que falha.
if (!existsSync(producao)) {
  console.error('[outputs] amplify_outputs.production.json nao existe. Rode `npm run deploy:prod` antes.');
  process.exit(1);
}

copyFileSync(producao, destino);
console.log('[outputs] Usando amplify_outputs.production.json (producao).');
