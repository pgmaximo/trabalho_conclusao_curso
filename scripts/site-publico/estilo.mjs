/**
 * Resumo do arquivo:
 * O visual das paginas do site da feira: tokens do app, tipografia, o
 * cabecalho e o rodape comuns e a funcao `layout`, que embrulha o corpo de cada
 * pagina. Funcao pura, sem leitura de arquivo.
 *
 * Os tokens vem de `src/constants/themeTokens.json` (verde `#10794E`, a versao
 * escura espelha o app) e a fonte e a IBM Plex Sans do app, hospedada no zip.
 *
 * Forma: containers e botoes tem raio de 16px, marcadores e itens pequenos 10px
 * e so a barra de progresso e redonda. Um acento so (o verde); resposta
 * negativa fica em cinza, nunca em vermelho.
 */

export const TITULO_DA_POLITICA = 'Política de Privacidade';
export const TITULO_DOS_TERMOS = 'Termos de Uso';

export function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const ESTILO_BASE = `
@font-face{font-family:"IBM Plex Sans";font-weight:400;font-style:normal;font-display:swap;src:url(fonts/IBMPlexSans-400.ttf) format("truetype")}
@font-face{font-family:"IBM Plex Sans";font-weight:600;font-style:normal;font-display:swap;src:url(fonts/IBMPlexSans-600.ttf) format("truetype")}
:root{color-scheme:light dark;--fundo:#F7F8F7;--superficie:#FFFFFF;--superficie-2:#EFF1F0;--texto:#141817;--texto-2:#55605C;--borda:#DFE3E1;--borda-forte:#BDC5C1;--primaria:#10794E;--primaria-escura:#0C6341;--primaria-suave:#E8F5EE;--sobre-primaria:#FFFFFF;--foco:#1B63C4;--sombra:rgba(16,121,78,.28);--raio:16px;--raio-pequeno:10px}
@media (prefers-color-scheme:dark){:root{--fundo:#0E1413;--superficie:#18201E;--superficie-2:#222B29;--texto:#EDF2F0;--texto-2:#AEBBB6;--borda:#33403C;--borda-forte:#4A5A55;--primaria:#4FC58C;--primaria-escura:#6FD3A3;--primaria-suave:#16332A;--sobre-primaria:#0E1413;--foco:#8DB8F2;--sombra:rgba(0,0,0,.5)}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--fundo);color:var(--texto);font:17px/1.6 "IBM Plex Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--primaria)}
:focus-visible{outline:3px solid var(--foco);outline-offset:3px;border-radius:4px}
.topo{border-bottom:1px solid var(--borda);background:var(--superficie)}
.topo>div{max-width:1040px;margin:0 auto;padding:8px 16px;min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:8px 20px}
.marca{display:flex;align-items:center;gap:10px;font-weight:600;font-size:20px;letter-spacing:-.01em;color:var(--texto);text-decoration:none}
.marca img{display:block;height:36px;width:auto}
nav{display:flex;gap:6px;font-size:16px}
nav a{color:var(--texto-2);text-decoration:none;padding:10px 8px;border-radius:var(--raio-pequeno)}
nav a:hover{color:var(--texto);background:var(--superficie-2)}
main{max-width:1040px;margin:0 auto;padding:32px 16px 56px}
main.estreito{max-width:720px}
main:not(.estreito) section+section{margin-top:48px}
h1{font-size:clamp(30px,7vw,44px);line-height:1.12;letter-spacing:-.025em;font-weight:600;margin:0 0 14px}
main.estreito h1{font-size:30px;letter-spacing:-.015em;line-height:1.25}
h2{font-size:22px;line-height:1.3;letter-spacing:-.01em;font-weight:600;margin:32px 0 8px}
section>h2:first-child{margin-top:0}
p{margin:0 0 14px;max-width:68ch}
.versao,.lead{color:var(--texto-2)}
.lead{font-size:19px;margin-bottom:22px}
.aviso{background:var(--primaria-suave);border-radius:var(--raio);padding:14px 16px;margin:20px 0;max-width:68ch}
.aviso p{margin:0}
ul,ol{padding-left:22px;max-width:68ch}
li{margin:6px 0}
.botao{display:flex;align-items:center;justify-content:center;gap:8px;min-height:56px;padding:12px 24px;background:var(--primaria);color:var(--sobre-primaria);font-weight:600;font-size:18px;line-height:1.2;text-align:center;text-decoration:none;border:2px solid var(--primaria);border-radius:var(--raio);cursor:pointer;transition:transform .12s ease,background-color .12s ease}
.botao:hover{background:var(--primaria-escura);border-color:var(--primaria-escura)}
.botao:active{transform:translateY(1px) scale(.99)}
.botao-sec{background:transparent;color:var(--primaria)}
.botao-sec:hover{background:var(--primaria-suave);color:var(--primaria)}
.botao[aria-disabled="true"]{opacity:.45;pointer-events:none;cursor:not-allowed}
.acoes{display:grid;gap:12px;max-width:420px;margin:0 0 14px}
.hero{display:grid;gap:28px;align-items:start}
.hero .lead{max-width:44ch}
.hero-texto{padding-top:8px}
.aparelho{position:relative;max-height:380px;overflow:hidden;border:1px solid var(--borda);border-bottom:0;border-radius:var(--raio) var(--raio) 0 0;background:var(--superficie);box-shadow:0 22px 44px -26px var(--sombra);max-width:340px;margin:0 auto;width:100%}
.aparelho img{display:block;width:100%;height:auto}
.passos{counter-reset:passo;list-style:none;padding:0;display:grid;gap:14px}
.passos li{counter-increment:passo;display:grid;grid-template-columns:36px 1fr;gap:14px;align-items:start;margin:0}
.passos li::before{content:counter(passo);display:grid;place-items:center;width:36px;height:36px;border-radius:var(--raio-pequeno);background:var(--primaria-suave);color:var(--primaria);font-weight:600}
footer{border-top:1px solid var(--borda);color:var(--texto-2);font-size:15px}
footer div{max-width:1040px;margin:0 auto;padding:22px 16px 36px}
footer p{margin:0 0 6px}
@media (min-width:860px){
.hero{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:56px;align-items:center}
.hero h1{font-size:clamp(40px,4.6vw,52px)}
.hero-texto{padding-top:0}
.aparelho{max-height:none;border-bottom:1px solid var(--borda);border-radius:var(--raio);max-width:320px;margin:0 0 0 auto}
.acoes{grid-auto-flow:column;grid-auto-columns:max-content;max-width:none}
.botao{white-space:nowrap}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`;

/**
 * @param {{ titulo: string, descricao: string, corpo: string, contato: string,
 *           versao: string, estreito?: boolean, estiloExtra?: string,
 *           scripts?: string[], pesquisa?: { endpoint: string } | undefined,
 *           naoIndexar?: boolean }} pagina
 */
export function layout({ titulo, descricao, corpo, contato, versao, estreito = false, estiloExtra = '', scripts = [], pesquisa, naoIndexar = false }) {
  const metas = [
    `<meta name="description" content="${escapar(descricao)}">`,
    ...(naoIndexar ? ['<meta name="robots" content="noindex">'] : []),
    ...(pesquisa ? [`<meta name="pesquisa-endpoint" content="${escapar(pesquisa.endpoint)}">`] : []),
  ].join('\n');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
${metas}
<link rel="icon" href="favicon.png">
<style>${ESTILO_BASE}${estiloExtra}</style>
</head>
<body>
<header class="topo"><div>
<a class="marca" href="./"><img src="marca.png" alt="" width="32" height="36"><span>SuaSaúde</span></a>
<nav aria-label="Documentos"><a href="privacidade.html">Privacidade</a><a href="termos.html">Termos</a></nav>
</div></header>
<main${estreito ? ' class="estreito"' : ''}>
${corpo}
</main>
<footer><div>
<p>O SuaSaúde é um Trabalho de Conclusão de Curso de Ciência da Computação do Centro Universitário do Instituto Mauá de Tecnologia (IMT).</p>
<p>Contato e pedidos sobre seus dados: <a href="mailto:${contato}">${contato}</a></p>
<p>Termos e Política na versão ${escapar(versao)}.</p>
</div></footer>
${scripts.map((src) => `<script type="module" src="${src}"></script>`).join('\n')}
</body>
</html>
`;
}

/**
 * Estilo so da pesquisa (`opiniao.html`). Uma pergunta por tela, opcoes grandes
 * (56 px ou mais de toque) e um unico movimento: a tela entra deslizando e a
 * barra enche. Quem pediu movimento reduzido nao ve o deslize.
 */
export const ESTILO_PESQUISA = `
.cartao{background:var(--superficie);border:1px solid var(--borda);border-radius:var(--raio);padding:24px 18px}
.cartao h1{margin-top:0}
.progresso{height:8px;border-radius:999px;background:var(--superficie-2);overflow:hidden}
.progresso-barra{height:100%;width:0;background:var(--primaria);border-radius:999px;transition:width .3s ease}
.progresso-texto{margin:8px 0 20px;color:var(--texto-2);font-size:15px}
fieldset{border:0;margin:0;padding:0;min-width:0}
legend{padding:0;margin:0 0 8px;font-size:24px;line-height:1.25;font-weight:600;letter-spacing:-.015em}
legend:focus{outline:none}
.apoio{margin:0 0 16px;color:var(--texto-2)}
.opcao{display:flex;align-items:center;gap:14px;min-height:56px;padding:12px 16px;margin:0 0 10px;border:2px solid var(--borda);border-radius:var(--raio);background:var(--superficie);font-size:18px;line-height:1.35;cursor:pointer}
.opcao:hover{border-color:var(--borda-forte)}
.opcao input{flex:none;width:22px;height:22px;margin:0;accent-color:var(--primaria)}
.opcao.marcada{border-color:var(--primaria);background:var(--primaria-suave)}
.opcao.bloqueada{opacity:.5;cursor:not-allowed}
.opcao:focus-within{outline:3px solid var(--foco);outline-offset:2px}
textarea{display:block;width:100%;min-height:128px;padding:12px 14px;font:inherit;color:var(--texto);background:var(--superficie);border:2px solid var(--borda-forte);border-radius:var(--raio);resize:vertical}
.contador{margin:6px 0 0;text-align:right;color:var(--texto-2);font-size:14px}
.navegacao{display:grid;grid-template-columns:1fr 1.5fr;gap:12px;margin-top:20px}
.navegacao>:only-child{grid-column:1/-1}
#erro{margin-top:16px;padding:14px 16px;border:2px solid var(--borda-forte);border-radius:var(--raio);background:var(--superficie-2)}
#erro p{margin:0 0 12px}
@media (prefers-reduced-motion:no-preference){
@keyframes entra{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
.entra{animation:entra .22s ease-out}
}
`;

/**
 * Estilo so do painel do grupo (`resultados.html`). Barras sem trilha de fundo:
 * so a fatia, com a contagem ao lado. Sempre numero absoluto junto do percentual.
 */
export const ESTILO_RESULTADOS = `
.acoes-painel{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 16px}
.acoes-painel .botao{min-height:48px;padding:8px 10px;font-size:16px}
.totais{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 8px}
.total{background:var(--superficie);border:1px solid var(--borda);border-radius:var(--raio);padding:14px 16px}
.total strong{display:block;font-size:34px;line-height:1.1;font-weight:600;letter-spacing:-.02em}
.total span{color:var(--texto-2);font-size:15px}
.painel-secao{margin-top:36px}
.painel-secao h2{margin:0 0 4px;font-size:20px}
.base{margin:0 0 10px;color:var(--texto-2);font-size:15px}
.linha-barra{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;margin:10px 0}
.linha-barra .numero{font-variant-numeric:tabular-nums;color:var(--texto-2);font-size:15px}
.barra{grid-column:1/-1;height:10px;border-radius:5px;background:var(--primaria)}
.cruzamento{width:100%;border-collapse:collapse;font-size:16px}
.cruzamento th,.cruzamento td{padding:8px 6px;border-bottom:1px solid var(--borda);text-align:left}
.comentario{padding:12px 14px;margin:0 0 10px;background:var(--superficie);border:1px solid var(--borda);border-radius:var(--raio);overflow-wrap:anywhere;white-space:pre-wrap}
#entrada label{display:block;margin:0 0 6px;font-weight:600}
#entrada input{display:block;width:100%;min-height:56px;padding:12px 14px;margin:0 0 14px;font:inherit;color:var(--texto);background:var(--superficie);border:2px solid var(--borda-forte);border-radius:var(--raio)}
#erro-entrada{margin:0 0 14px;padding:12px 14px;border:2px solid var(--borda-forte);border-radius:var(--raio);background:var(--superficie-2)}
@media (min-width:860px){.totais{grid-template-columns:repeat(4,minmax(0,1fr))}.acoes-painel{max-width:520px}}
`;
