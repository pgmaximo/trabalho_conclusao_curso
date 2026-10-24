/**
 * Resumo do arquivo:
 * A lista de perguntas da pesquisa de opiniao da feira e a validacao do que
 * chega do navegador. E um modulo unico de proposito: o gerador de paginas
 * (`scripts/site-publico/paginas.mjs`) monta o formulario a partir dele e a
 * Lambda (`index.mjs`) valida as respostas contra ele, entao as duas nunca
 * divergem. Por isso ele nao importa nada, nem do Node: vai junto no zip da
 * Lambda e e lido pelo navegador.
 *
 * O texto e o que a pessoa ve; o codigo e o que se grava. Mudar um codigo
 * depois de haver respostas exige subir `VERSAO_DO_FORMULARIO`.
 *
 * Spec: docs/superpowers/specs/2026-10-24-site-feira-pesquisa-design.md (5.1).
 * Nao ha tela de reacao por funcionalidade: o grupo apresenta o app antes de
 * o visitante abrir o QR code.
 */

export const VERSAO_DO_FORMULARIO = '1';

export const ESCALA_IMPRESSAO = [
  { codigo: 'nao_gostei', texto: 'Não gostei' },
  { codigo: 'gostei_pouco', texto: 'Gostei pouco' },
  { codigo: 'nao_sei', texto: 'Não sei' },
  { codigo: 'gostei', texto: 'Gostei' },
  { codigo: 'gostei_muito', texto: 'Gostei muito' },
];

export const ESCALA_USO = [
  { codigo: 'nao_usaria', texto: 'Não usaria' },
  { codigo: 'usaria_pouco', texto: 'Usaria pouco' },
  { codigo: 'nao_sei', texto: 'Não sei' },
  { codigo: 'usaria', texto: 'Usaria' },
  { codigo: 'usaria_muito', texto: 'Usaria muito' },
];

// So o nome: o grupo explica cada funcionalidade antes, entao a pesquisa nao
// mostra frase nem print.
export const FUNCIONALIDADES = [
  { id: 'exames', nome: 'Exames e receitas' },
  { id: 'assistente', nome: 'Assistente com IA' },
  { id: 'remedios', nome: 'Lembretes de remédio' },
  { id: 'vacinas', nome: 'Carteira de vacinação' },
  { id: 'prevencao', nome: 'Prevenção' },
  { id: 'agenda', nome: 'Agenda de consultas' },
  { id: 'smartwatch', nome: 'Dados do smartwatch' },
];

const TAMANHO_DO_COMENTARIO = 280;

export const PERGUNTAS = [
  {
    id: 'impressao',
    bloco: 'A',
    tipo: 'unica',
    titulo: 'O que você achou do SuaSaúde?',
    opcoes: ESCALA_IMPRESSAO,
  },
  {
    id: 'usaria',
    bloco: 'A',
    tipo: 'unica',
    titulo: 'Você usaria o SuaSaúde?',
    opcoes: ESCALA_USO,
  },
  {
    id: 'frequencia',
    bloco: 'A',
    tipo: 'unica',
    titulo: 'Com que frequência você usaria o app?',
    opcoes: [
      { codigo: 'todo_dia', texto: 'Todo dia' },
      { codigo: 'semana', texto: 'Algumas vezes por semana' },
      { codigo: 'mes', texto: 'Algumas vezes por mês' },
      { codigo: 'so_quando_precisa', texto: 'Só quando precisar (exame, consulta)' },
      { codigo: 'nunca', texto: 'Não usaria' },
    ],
  },
  {
    id: 'chamaram_atencao',
    bloco: 'A',
    tipo: 'multipla',
    titulo: 'Quais funcionalidades mais chamaram a sua atenção?',
    apoio: 'Escolha até 3.',
    opcoes: [
      ...FUNCIONALIDADES.map((f) => ({ codigo: f.id, texto: f.nome })),
      { codigo: 'nenhuma', texto: 'Nenhuma delas' },
    ],
    exclusivas: ['nenhuma'],
    max: 3,
  },
  {
    id: 'guarda_hoje',
    bloco: 'B',
    tipo: 'multipla',
    titulo: 'Hoje, onde você guarda seus exames e receitas?',
    apoio: 'Marque quantas quiser.',
    opcoes: [
      { codigo: 'papel', texto: 'Papel, numa pasta ou gaveta' },
      { codigo: 'fotos', texto: 'Fotos no celular' },
      { codigo: 'mensagens', texto: 'WhatsApp ou e-mail' },
      { codigo: 'outro_app', texto: 'Em outro aplicativo' },
      { codigo: 'nao_guardo', texto: 'Não guardo' },
    ],
    exclusivas: ['nao_guardo'],
  },
  {
    id: 'barreiras',
    bloco: 'B',
    tipo: 'multipla',
    titulo: 'O que faria você desistir de usar?',
    apoio: 'Marque quantas quiser.',
    opcoes: [
      { codigo: 'privacidade', texto: 'Preocupação com a privacidade dos meus dados' },
      { codigo: 'trabalho_cadastrar', texto: 'Dá trabalho cadastrar tudo' },
      { codigo: 'desconfio_ia', texto: 'Não confio em inteligência artificial' },
      { codigo: 'so_iphone', texto: 'Só tenho iPhone' },
      { codigo: 'nao_vejo_necessidade', texto: 'Não vejo necessidade' },
      { codigo: 'outro', texto: 'Outro motivo' },
      { codigo: 'nenhuma', texto: 'Nenhum, eu usaria' },
    ],
    exclusivas: ['nenhuma'],
  },
  {
    id: 'modelo',
    bloco: 'B',
    tipo: 'unica',
    titulo: 'Se o app precisasse se sustentar no futuro, o que você acharia mais aceitável?',
    apoio: 'O grupo ainda não decidiu como o app se sustentaria. Sua resposta ajuda a pensar.',
    opcoes: [
      { codigo: 'gratis', texto: 'Continuar totalmente grátis' },
      { codigo: 'gratis_com_extras', texto: 'Grátis, com alguns recursos extras pagos' },
      { codigo: 'assinatura_pequena', texto: 'Uma assinatura mensal pequena' },
      {
        codigo: 'outra_pessoa_paga',
        texto: 'Ser pago por outra pessoa, como plano de saúde, clínica ou empresa',
      },
      { codigo: 'nao_sei', texto: 'Não sei' },
    ],
  },
  {
    id: 'idade',
    bloco: 'C',
    tipo: 'unica',
    titulo: 'Qual a sua idade?',
    opcoes: [
      { codigo: 'menos_18', texto: 'Menos de 18 anos' },
      { codigo: '18_24', texto: '18 a 24' },
      { codigo: '25_34', texto: '25 a 34' },
      { codigo: '35_44', texto: '35 a 44' },
      { codigo: '45_59', texto: '45 a 59' },
      { codigo: '60_mais', texto: '60 anos ou mais' },
    ],
  },
  {
    id: 'celular',
    bloco: 'C',
    tipo: 'unica',
    titulo: 'Qual o seu celular?',
    opcoes: [
      { codigo: 'android', texto: 'Android' },
      { codigo: 'iphone', texto: 'iPhone' },
      { codigo: 'outro', texto: 'Outro' },
    ],
  },
  {
    id: 'remedio_em_casa',
    bloco: 'C',
    tipo: 'unica',
    titulo: 'Quem toma remédio todo dia na sua casa?',
    opcoes: [
      { codigo: 'eu', texto: 'Eu' },
      { codigo: 'outra_pessoa', texto: 'Outra pessoa da família' },
      { codigo: 'eu_e_outra', texto: 'Eu e outra pessoa da família' },
      { codigo: 'ninguem', texto: 'Ninguém' },
    ],
  },
  {
    id: 'comentario',
    bloco: 'C',
    tipo: 'texto',
    titulo: 'O que faltou ou o que você mudaria?',
    apoio: 'Opcional.',
    max: TAMANHO_DO_COMENTARIO,
  },
];

const POR_ID = new Map(PERGUNTAS.map((p) => [p.id, p]));
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ehObjeto = (valor) => typeof valor === 'object' && valor !== null && !Array.isArray(valor);
const recusa = (erro) => ({ ok: false, erro });

/** Devolve a mensagem do problema, ou `null` se a resposta serve para a pergunta. */
function problemaDaResposta(pergunta, valor) {
  const codigos = (pergunta.opcoes ?? []).map((o) => o.codigo);

  if (pergunta.tipo === 'texto') {
    if (typeof valor !== 'string') return 'precisa ser texto';
    return valor.length > pergunta.max ? `passa de ${pergunta.max} caracteres` : null;
  }

  if (pergunta.tipo === 'unica') {
    if (typeof valor !== 'string') return 'precisa ser uma única escolha';
    return codigos.includes(valor) ? null : 'opção desconhecida';
  }

  if (!Array.isArray(valor)) return 'precisa ser uma lista';
  if (valor.some((item) => typeof item !== 'string' || !codigos.includes(item))) return 'opção desconhecida';
  if (new Set(valor).size !== valor.length) return 'opção repetida';
  if (valor.length > (pergunta.max ?? codigos.length)) return `mais de ${pergunta.max} opções`;
  if (valor.length > 1 && valor.some((item) => (pergunta.exclusivas ?? []).includes(item))) {
    return 'opção exclusiva marcada junto com outras';
  }
  return null;
}

/**
 * Confere um envio do navegador. Nunca lanca excecao, seja qual for a entrada.
 * So devolve campos conhecidos: o resto do corpo (`acao`, o campo isca `site`,
 * qualquer extra) e descartado aqui.
 * @returns {{ ok: true, valor: { id: string, etapa: number, concluido: boolean, respostas: Record<string, string | string[]> } } | { ok: false, erro: string }}
 */
export function validarEnvio(corpo) {
  if (!ehObjeto(corpo)) return recusa('O envio precisa ser um objeto.');
  const { id, etapa, concluido, respostas } = corpo;

  if (typeof id !== 'string' || !UUID_V4.test(id)) return recusa('id inválido');
  if (!Number.isInteger(etapa) || etapa < 0 || etapa > PERGUNTAS.length) return recusa('etapa inválida');
  if (typeof concluido !== 'boolean') return recusa('concluido precisa ser verdadeiro ou falso');
  if (!ehObjeto(respostas)) return recusa('respostas precisa ser um objeto');

  const limpas = {};
  for (const [chave, valor] of Object.entries(respostas)) {
    const pergunta = POR_ID.get(chave);
    if (!pergunta) return recusa(`pergunta desconhecida: ${chave}`);
    const problema = problemaDaResposta(pergunta, valor);
    if (problema) return recusa(`${chave}: ${problema}`);
    limpas[chave] = valor;
  }

  return { ok: true, valor: { id, etapa, concluido, respostas: limpas } };
}
