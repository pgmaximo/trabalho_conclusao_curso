/**
 * Resumo do arquivo:
 * Gera as paginas publicas do SuaSaude -- inicio, Politica de Privacidade e
 * Termos de Uso -- a partir de `src/data/termosEPrivacidade.ts`.
 *
 * Elas existem porque o Google so tira o login com Google do modo "Testing"
 * com uma pagina inicial e uma politica de privacidade em enderecos publicos.
 * O texto NAO e copiado: sai dos mesmos dados que o aplicativo mostra, para a
 * pagina publica nunca divergir do termo que a pessoa aceitou.
 *
 * Funcao pura (dados entram, HTML sai), para o teste conferir o conteudo sem
 * rede. Quem grava e publica e `scripts/publicar-site-publico.mjs`.
 */

const TITULO_DOS_TERMOS = 'Termos de Uso';
const TITULO_DA_POLITICA = 'Política de Privacidade';

function escapar(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Texto escapado, com o e-mail de contato virando link. */
function paragrafo(texto, contato) {
  const seguro = escapar(texto);
  return contato ? seguro.split(contato).join(`<a href="mailto:${contato}">${contato}</a>`) : seguro;
}

function renderizarBloco(bloco, contato) {
  if (typeof bloco === 'string') return `<p>${paragrafo(bloco, contato)}</p>`;
  return `<ul>${bloco.map((item) => `<li>${paragrafo(item, contato)}</li>`).join('')}</ul>`;
}

function renderizarSecao(secao, contato) {
  return `<section id="secao-${secao.numero}">
<h2>${secao.numero}. ${escapar(secao.titulo)}</h2>
${secao.blocos.map((b) => renderizarBloco(b, contato)).join('\n')}
</section>`;
}

function faixaDeSecoes(parte) {
  const numeros = parte.secoes.map((s) => s.numero);
  return `${Math.min(...numeros)} a ${Math.max(...numeros)}`;
}

const ESTILO = `
:root{color-scheme:light dark;--fundo:#F7F8F7;--superficie:#FFFFFF;--texto:#141817;--texto-2:#55605C;--borda:#DFE3E1;--primaria:#10794E;--primaria-suave:#E8F5EE}
@media (prefers-color-scheme:dark){:root{--fundo:#0E1413;--superficie:#18201E;--texto:#EDF2F0;--texto-2:#AEBBB6;--borda:#33403C;--primaria:#4FC58C;--primaria-suave:#16332A}}
*{box-sizing:border-box}
body{margin:0;background:var(--fundo);color:var(--texto);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--primaria)}
.topo{border-bottom:1px solid var(--borda);background:var(--superficie)}
.topo div,main,footer div{max-width:720px;margin:0 auto;padding:0 16px}
.topo div{display:flex;flex-wrap:wrap;gap:4px 20px;align-items:center;justify-content:space-between;padding-top:14px;padding-bottom:14px}
.marca{font-weight:700;font-size:18px;text-decoration:none;color:var(--texto)}
nav{display:flex;gap:16px;font-size:15px}
main{padding-top:32px;padding-bottom:48px}
h1{font-size:30px;line-height:1.25;margin:0 0 8px}
h2{font-size:19px;line-height:1.35;margin:32px 0 8px}
.versao,.lead{color:var(--texto-2)}
.lead{font-size:18px;margin-top:0}
.aviso{background:var(--primaria-suave);border-radius:12px;padding:14px 16px;margin:24px 0}
.aviso p{margin:0}
ul{padding-left:22px}
li{margin:4px 0}
footer{border-top:1px solid var(--borda);color:var(--texto-2);font-size:14px}
footer div{padding-top:20px;padding-bottom:32px}
`;

function layout({ titulo, descricao, corpo, contato, versao }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(titulo)}</title>
<meta name="description" content="${escapar(descricao)}">
<link rel="icon" href="favicon.png">
<style>${ESTILO}</style>
</head>
<body>
<header class="topo"><div>
<a class="marca" href="./">SuaSaúde</a>
<nav><a href="privacidade.html">${TITULO_DA_POLITICA}</a><a href="termos.html">${TITULO_DOS_TERMOS}</a></nav>
</div></header>
<main>
${corpo}
</main>
<footer><div>
<p>SuaSaúde · Trabalho de Conclusão de Curso de Ciência da Computação · Centro Universitário do Instituto Mauá de Tecnologia (IMT)</p>
<p>Contato e pedidos sobre seus dados: <a href="mailto:${contato}">${contato}</a> · Termos e Política na versão ${escapar(versao)}</p>
</div></footer>
</body>
</html>
`;
}

function paginaDoDocumento(parte, outra, arquivoDaOutra, { versao, vigencia, contato }) {
  const corpo = `<h1>${escapar(parte.titulo)}</h1>
<p class="versao">Versão ${escapar(versao)} · vigente desde ${escapar(vigencia)}</p>
<div class="aviso"><p>Este documento forma um todo com ${outra.titulo === TITULO_DA_POLITICA ? 'a' : 'os'} <a href="${arquivoDaOutra}">${escapar(outra.titulo)}</a> (seções ${faixaDeSecoes(outra)}). É o mesmo texto que o aplicativo mostra e que a pessoa aceita ao concluir o cadastro.</p></div>
${parte.secoes.map((s) => renderizarSecao(s, contato)).join('\n')}`;
  return layout({
    titulo: `${parte.titulo} · SuaSaúde`,
    descricao: `${parte.titulo} do SuaSaúde, versão ${versao}.`,
    corpo,
    contato,
    versao,
  });
}

function paginaInicial({ versao, contato }) {
  const corpo = `<h1>SuaSaúde</h1>
<p class="lead">Suas informações de saúde organizadas em um só lugar.</p>
<p>O SuaSaúde reúne o que você mesmo fornece: exames, receitas, remédios e lembretes, consultas, a carteira de vacinação, dados exportados do seu smartwatch e o seu Perfil de Saúde. Ele também mostra recomendações públicas de prevenção e campanhas de vacinação, e tem um assistente com inteligência artificial que responde perguntas sobre os seus próprios dados, sempre indicando de onde cada valor veio.</p>
<div class="aviso"><p><strong>O SuaSaúde não é um serviço de saúde.</strong> Ele não faz diagnóstico, não indica tratamento e não substitui consulta com profissional de saúde. Em caso de emergência, ligue 192 (SAMU).</p></div>
<h2>Um protótipo acadêmico</h2>
<p>O SuaSaúde é um Trabalho de Conclusão de Curso de Ciência da Computação no Centro Universitário do Instituto Mauá de Tecnologia (IMT). Ele não é distribuído em lojas de aplicativos e é usado apenas pela equipe, pelo orientador, pela banca avaliadora e por pessoas convidadas para testá-lo. É gratuito, não exibe publicidade e não vende dados.</p>
<h2>Seus dados</h2>
<p>Como tratamos seus dados, inclusive o que recebemos quando você entra com a sua conta Google, está na <a href="privacidade.html">${TITULO_DA_POLITICA}</a>. As regras de uso estão nos <a href="termos.html">${TITULO_DOS_TERMOS}</a>. Para exercer seus direitos de titular, escreva para <a href="mailto:${contato}">${contato}</a>.</p>`;
  return layout({
    titulo: 'SuaSaúde',
    descricao: 'SuaSaúde: aplicativo acadêmico que organiza suas informações de saúde em um só lugar.',
    corpo,
    contato,
    versao,
  });
}

/**
 * @param {{ partes: readonly { titulo: string, secoes: readonly { numero: number, titulo: string, blocos: readonly (string | readonly string[])[] }[] }[],
 *           versao: string, vigencia: string, contato: string }} dados
 * @returns {Record<string, string>} nome do arquivo -> HTML
 */
export function gerarPaginas(dados) {
  const termos = dados.partes.find((p) => p.titulo === TITULO_DOS_TERMOS);
  const politica = dados.partes.find((p) => p.titulo === TITULO_DA_POLITICA);
  // Uma parte renomeada nos dados quebraria os enderecos que o Google guarda.
  // Melhor falhar aqui do que publicar uma pagina vazia.
  if (!termos || !politica) {
    throw new Error(`As partes "${TITULO_DOS_TERMOS}" e "${TITULO_DA_POLITICA}" precisam existir nos dados.`);
  }
  return {
    'index.html': paginaInicial(dados),
    'privacidade.html': paginaDoDocumento(politica, termos, 'termos.html', dados),
    'termos.html': paginaDoDocumento(termos, politica, 'privacidade.html', dados),
  };
}
