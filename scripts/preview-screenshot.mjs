#!/usr/bin/env node
/**
 * Resumo do arquivo:
 * Abre uma URL do app (normalmente uma tela de dev-preview, ver
 * src/app/dev-preview.tsx) em Chrome headless via playwright-core e salva um
 * screenshot — usado para validar visualmente mudanças de UI sem precisar de
 * emulador Android/iOS nem login real no Cognito. Ver docs/dev-preview.md
 * para o fluxo completo (subir `npm run web` + navegar pelas telas).
 *
 * Uso:
 *   node scripts/preview-screenshot.mjs <url> [caminho-do-arquivo.png]
 *
 * Exemplo:
 *   npm run web &                # sobe o Metro/Expo web em localhost:8081
 *   node scripts/preview-screenshot.mjs \
 *     "http://localhost:8081/dev-preview?screen=vaccination-with-data" \
 *     /tmp/vaccination.png
 *
 * Requer `playwright-core` (devDependency) + Google Chrome instalado no
 * sistema — usa `channel: 'chrome'` para não precisar baixar um binário de
 * navegador próprio.
 */
import { chromium } from 'playwright-core';

const url = process.argv[2];
const outPath = process.argv[3] || 'preview-screenshot.png';
// Viewport de celular (~iPhone 13/14) — o app é mobile-first; testar num
// viewport desktop esconderia bugs de layout que só aparecem em telas estreitas.
const viewport = { width: 390, height: 844 };

if (!url) {
  console.error('Uso: node scripts/preview-screenshot.mjs <url> [saida.png]');
  process.exit(1);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
// O bundle React Native Web hidrata de forma assíncrona — sem esperar, o
// screenshot captura a tela em branco antes do primeiro render real.
await page.waitForTimeout(4000);

// React Native Web NÃO deixa o documento crescer com o conteúdo — a
// ScrollView vira uma <div> com overflow-y próprio, do tamanho do viewport,
// e o conteúdo rola DENTRO dela. Isso faz `page.screenshot({ fullPage: true
// })` cortar silenciosamente tudo abaixo da dobra (sem erro, sem aviso) —
// bug real encontrado usando este próprio script. Solução: medir o maior
// scrollHeight entre os elementos com overflow, redimensionar o viewport
// para caber tudo, e só então tirar o screenshot.
const contentHeight = await page.evaluate(() => {
  let max = document.documentElement.scrollHeight;
  for (const el of document.querySelectorAll('body *')) {
    if (el.scrollHeight > el.clientHeight && el.scrollHeight > max) {
      max = el.scrollHeight;
    }
  }
  return max;
});

if (contentHeight > viewport.height) {
  await page.setViewportSize({ width: viewport.width, height: contentHeight });
  await page.waitForTimeout(300); // deixa o re-layout do RN Web assentar
}

await page.screenshot({ path: outPath, fullPage: true });

console.log('screenshot salvo em:', outPath);
console.log('título da página:', await page.title());
console.log('--- erros de console ---');
console.log(consoleErrors.length ? consoleErrors.join('\n') : '(nenhum)');

await browser.close();

// Convenção de saída: um erro de console real indica UI quebrada mesmo que o
// screenshot pareça normal (ex.: uma seção falhou e simplesmente não
// renderizou) — sempre revisar esta lista antes de aceitar o screenshot como
// prova de que a tela funciona.
if (consoleErrors.length > 0) {
  process.exitCode = 1;
}
