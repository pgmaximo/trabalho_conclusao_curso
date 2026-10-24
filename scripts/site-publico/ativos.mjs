/**
 * Resumo do arquivo:
 * Os arquivos que vao no zip do site ao lado das paginas HTML: nome publicado
 * -> caminho de origem a partir da raiz do repositorio. O publicador
 * (`scripts/publicar-site-publico.mjs`) le daqui; o teste do gerador de paginas
 * confere que nenhuma pagina aponta para um arquivo que nao esteja aqui.
 *
 * Os `.mjs` de `infra/site-pesquisa/` sobem como `.js`: o navegador so carrega
 * modulo se o servidor mandar um tipo de JavaScript, e `.js` e o que todo
 * hospedeiro manda. Por isso os imports entre os modulos de cliente usam `.js`.
 */

const PLEX = 'node_modules/@expo-google-fonts/ibm-plex-sans';

/** @type {Record<string, string>} */
export const ATIVOS = {
  'fonts/IBMPlexSans-400.ttf': `${PLEX}/400Regular/IBMPlexSans_400Regular.ttf`,
  'fonts/IBMPlexSans-600.ttf': `${PLEX}/600SemiBold/IBMPlexSans_600SemiBold.ttf`,
  'marca.png': 'assets/site/marca.png',
  'favicon.png': 'assets/favicon.png',
  'telas/inicio.png': 'assets/site/telas/inicio.png',
  'js/comum.js': 'scripts/site-publico/cliente/comum.js',
  'js/baixar.js': 'scripts/site-publico/cliente/baixar.js',
  'js/opiniao.js': 'scripts/site-publico/cliente/opiniao.js',
  'js/pesquisa.js': 'infra/site-pesquisa/pesquisa.mjs',
  'js/fluxo.js': 'infra/site-pesquisa/fluxo.mjs',
  'js/resultados.js': 'scripts/site-publico/cliente/resultados.js',
  'js/agregar.js': 'infra/site-pesquisa/agregar.mjs',
};
