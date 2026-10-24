/**
 * Resumo do arquivo:
 * Gera as paginas publicas do SuaSaude: inicio, Politica de Privacidade e
 * Termos de Uso (a partir de `src/data/termosEPrivacidade.ts`) e, com um APK
 * nos dados, `baixar.html`, a pagina do QR code de download. Com `pesquisa`
 * nos dados gera tambem `opiniao.html` (a pesquisa de opiniao da feira) e
 * `resultados.html` (o painel do grupo).
 *
 * Os documentos existem porque o Google so tira o login com Google do modo
 * "Testing" com uma pagina inicial e uma politica de privacidade em enderecos
 * publicos. O texto NAO e copiado: sai dos mesmos dados que o aplicativo
 * mostra, para a pagina publica nunca divergir do termo que a pessoa aceitou.
 *
 * Funcao pura (dados entram, HTML sai), para o teste conferir o conteudo sem
 * rede. O visual mora em `estilo.mjs`. Quem grava e publica, junto com os
 * arquivos de `ativos.mjs`, e `scripts/publicar-site-publico.mjs`.
 */
import { ESTILO_PESQUISA, ESTILO_RESULTADOS, TITULO_DA_POLITICA, TITULO_DOS_TERMOS, escapar, layout } from './estilo.mjs';

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
    estreito: true,
  });
}

function paginaInicial({ versao, contato, apk }) {
  const corpo = `<h1>SuaSaúde</h1>
<p class="lead">Suas informações de saúde organizadas em um só lugar.</p>
${apk ? '<div class="acoes"><a class="botao" href="baixar.html">Baixar o app para Android</a></div>\n' : ''}<p>O SuaSaúde reúne o que você mesmo fornece: exames, receitas, remédios e lembretes, consultas, a carteira de vacinação, dados exportados do seu smartwatch e o seu Perfil de Saúde. Ele também mostra recomendações públicas de prevenção e campanhas de vacinação, e tem um assistente com inteligência artificial que responde perguntas sobre os seus próprios dados, sempre indicando de onde cada valor veio.</p>
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
    estreito: true,
  });
}

/**
 * A pagina do QR code de download. O endereco dela e o que vai impresso, entao
 * nunca muda: um APK novo troca so o link do botao (ver `APK` em
 * `scripts/publicar-site-publico.mjs`). A pessoa chega aqui depois de o grupo
 * apresentar o app, entao o hero nao explica o app: leva ao download e, se
 * houver pesquisa, a opiniao. Os passos existem porque, fora da Play Store, o
 * Android pede permissao para o navegador instalar e o Play Protect avisa sobre
 * o desenvolvedor, e e nesse passo que a pessoa desiste.
 */
function paginaDeDownload({ versao, contato, apk, pesquisa }) {
  const corpo = `<section class="hero">
<div class="hero-texto">
<h1>Seus exames, remédios e vacinas num só lugar.</h1>
<p class="lead">${
    pesquisa
      ? 'Aplicativo grátis para Android. Baixe agora e, se quiser, conte o que achou em 1 minuto.'
      : 'Aplicativo grátis para Android. Baixe agora e instale em poucos passos.'
  }</p>
<div class="acoes">
<a class="botao" data-baixar="inicio" href="${escapar(apk.url)}">Baixar o app</a>
${pesquisa ? '<a class="botao botao-sec" href="opiniao.html">Dar minha opinião (1 minuto)</a>\n' : ''}</div>
<p class="versao">Arquivo de ${escapar(apk.tamanhoEmMb)} MB. Se puder, use Wi-Fi.</p>
<div class="aviso aviso-iphone" hidden><p><strong>O app só funciona em Android.</strong> No iPhone não dá para instalar.${pesquisa ? ' Você ainda pode dar a sua opinião.' : ''}</p></div>
</div>
<div class="aparelho"><img src="telas/inicio.png" width="390" height="844" alt="Tela inicial do aplicativo SuaSaúde, com exemplos de compromissos e remédios do dia"></div>
</section>
<section>
<h2>Como instalar</h2>
<div class="aviso"><p><strong>Só para Android.</strong> O SuaSaúde não pode ser instalado no iPhone.</p></div>
<ol class="passos">
<li><span>Toque em <strong>Baixar o app</strong> e espere o download terminar.</span></li>
<li><span>Abra o arquivo baixado. Se o celular pedir, permita que o navegador instale aplicativos e volte para a instalação.</span></li>
<li><span>Se aparecer um aviso do Google Play Protect, toque em <strong>Mais detalhes</strong> e depois em <strong>Instalar mesmo assim</strong>. O aviso aparece porque o aplicativo não vem da Play Store. Os nomes dos botões podem variar um pouco de um celular para outro.</span></li>
<li><span>Abra o SuaSaúde e crie a sua conta.</span></li>
</ol>
</section>
<section>
<h2>Antes de usar</h2>
<p>O SuaSaúde é um protótipo acadêmico e <strong>não substitui consulta com profissional de saúde</strong>. Ao criar a conta, você aceita os <a href="termos.html">${TITULO_DOS_TERMOS}</a> e a <a href="privacidade.html">${TITULO_DA_POLITICA}</a>, que explicam como os seus dados são tratados.</p>
</section>`;
  return layout({
    titulo: 'Baixe o SuaSaúde',
    descricao: 'Baixe o SuaSaúde para Android: o arquivo de instalação e como instalar.',
    corpo,
    contato,
    versao,
    scripts: ['js/baixar.js'],
    pesquisa,
  });
}

/**
 * A pesquisa de opiniao. O HTML so traz a abertura, o cartao onde o script
 * desenha uma pergunta por vez e a tela final; as perguntas vem de
 * `js/pesquisa.js`, o mesmo modulo que a Lambda usa para validar. A pessoa chega
 * aqui depois de o grupo apresentar o app, entao a abertura nao o explica.
 */
function paginaDaPesquisa({ versao, contato, apk, pesquisa }) {
  const corpo = `<section id="abertura" class="cartao">
<h1>Sua opinião sobre o SuaSaúde</h1>
<p class="lead">Você acabou de conhecer o SuaSaúde. Conte o que achou. Leva 1 minuto e não pedimos nome nem e-mail.</p>
<div class="acoes"><button class="botao" type="button" id="comecar">Começar</button></div>
<p class="versao">Pesquisa anônima: não guardamos o seu IP nem usamos cookies. As respostas servem só para o trabalho do grupo.</p>
</section>
<section id="pesquisa" class="cartao" hidden>
<div class="progresso" role="progressbar" aria-label="Progresso da pesquisa" aria-valuemin="0" aria-valuemax="11" aria-valuenow="0"><div class="progresso-barra" id="barra"></div></div>
<p class="progresso-texto" id="progresso-texto" aria-live="polite"></p>
<div id="pergunta"></div>
<div id="erro" role="alert" hidden><p>Não foi possível salvar as suas respostas. Confira a internet e tente de novo. O que você já respondeu continua aqui.</p><button class="botao botao-sec" type="button" id="tentar-de-novo">Tentar de novo</button></div>
</section>
<section id="fim" class="cartao" hidden>
<h2 id="titulo-do-fim" tabindex="-1">Obrigado pela sua opinião!</h2>
<p>As suas respostas ajudam o grupo a decidir os próximos passos do SuaSaúde.</p>
${
  apk
    ? `<div class="acoes"><a class="botao" data-baixar="fim" href="${escapar(apk.url)}">Baixar o app</a></div>
<p class="versao">Só funciona em Android. Arquivo de ${escapar(apk.tamanhoEmMb)} MB. <a href="baixar.html">Ver como instalar</a></p>
<div class="aviso aviso-iphone" hidden><p><strong>O app só funciona em Android.</strong> No iPhone não dá para instalar.</p></div>`
    : ''
}
</section>`;
  return layout({
    titulo: 'Sua opinião sobre o SuaSaúde',
    descricao: 'Pesquisa de opinião anônima sobre o SuaSaúde, em 1 minuto.',
    corpo,
    contato,
    versao,
    estreito: true,
    estiloExtra: ESTILO_PESQUISA,
    scripts: ['js/opiniao.js'],
    pesquisa,
  });
}

/**
 * O painel do grupo. Fica fora do menu, fora dos buscadores e protegido por uma
 * senha simples: os dados sao anonimos, a senha so impede que a pagina fique
 * aberta a qualquer pessoa. O HTML so traz a entrada e o painel vazio; o script
 * busca os dados na Lambda e desenha tudo (sem nunca montar HTML com texto de
 * visitante).
 */
function paginaDosResultados({ versao, contato, pesquisa }) {
  const corpo = `<h1>Resultados da pesquisa</h1>
<section id="entrada" class="cartao">
<p class="lead">Só o grupo vê esta página. Digite a senha para ver as respostas.</p>
<form id="formulario-entrada">
<label for="chave">Senha do grupo</label>
<input id="chave" type="password" autocomplete="off" autocapitalize="off" spellcheck="false">
<p id="erro-entrada" role="alert" hidden></p>
<button class="botao" type="submit" id="entrar">Entrar</button>
</form>
</section>
<section id="painel" hidden>
<div class="acoes-painel">
<button class="botao botao-sec" type="button" id="atualizar">Atualizar</button>
<button class="botao botao-sec" type="button" id="baixar-csv">Baixar CSV</button>
<button class="botao botao-sec" type="button" id="sair">Sair</button>
</div>
<div class="aviso"><p>São poucas respostas: leia como indicação, não como prova. Quem vem à feira costuma ser gentil, então Gostei e Usaria tendem a vir mais altos.</p></div>
<div id="conteudo"></div>
</section>`;
  return layout({
    titulo: 'Resultados da pesquisa',
    descricao: 'Painel do grupo com as respostas da pesquisa.',
    corpo,
    contato,
    versao,
    estreito: true,
    estiloExtra: ESTILO_RESULTADOS,
    scripts: ['js/resultados.js'],
    pesquisa,
    naoIndexar: true,
  });
}

/**
 * @param {{ partes: readonly { titulo: string, secoes: readonly { numero: number, titulo: string, blocos: readonly (string | readonly string[])[] }[] }[],
 *           versao: string, vigencia: string, contato: string,
 *           apk?: { url: string, tamanhoEmMb: number },
 *           pesquisa?: { endpoint: string } }} dados
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
    ...(dados.apk && { 'baixar.html': paginaDeDownload(dados) }),
    ...(dados.pesquisa && {
      'opiniao.html': paginaDaPesquisa(dados),
      'resultados.html': paginaDosResultados(dados),
    }),
  };
}
