/**
 * Resumo do arquivo:
 * A porta pela qual uma proposta de fato precisa passar antes de chegar à tela.
 * É aqui que a análise de LGPD (`estudos-ia/01-estudos/memoria-do-usuario-e-lgpd.md`)
 * vira código, e é o arquivo mais importante da EPIC da memória.
 *
 * O QUE ELE FAZ, em uma frase: reprova o que não pode ser guardado, por
 * CATEGORIA, antes de a pessoa ver a proposta. Reprovar por categoria e não por
 * revisão caso a caso é a diferença entre uma garantia e uma intenção.
 *
 * REPROVAR A PROPOSTA NUNCA REPROVA A RESPOSTA. São dois caminhos separados de
 * propósito: uma resposta correta perdida porque o modelo propôs um fato ruim
 * seria a EPIC nova quebrando a entregue (regra 5 da constituição).
 *
 * A RECUSA É SILENCIOSA. A pessoa não pediu proposta nenhuma, então a ausência
 * dela não é erro que mereça mensagem. O `motivo` existe para log, e não traz o
 * texto recusado: devolvê-lo ensinaria a contornar o padrão — mesma razão do
 * `MOTIVO_CITACAO` em `verificacao.ts`.
 *
 * APROXIMAÇÃO DECLARADA: os padrões abaixo reconhecem as formas comuns em
 * português do Brasil, e não todas as formas possíveis. Eles são a última das
 * camadas, não a única — antes deles estão a lista fechada de tipos, o teto de
 * tamanho e a confirmação da pessoa, que é quem lê o texto antes de ele existir.
 */
import { checkLanguageRules } from '../../ai-language-rules/languageRules';

import { normalizarTexto, textoValido, tipoValido } from './regras';

export type PropostaBruta = { texto: string; tipo: string };

export type ResultadoDaProposta = { ok: true } | { ok: false; motivo: string };

/**
 * Unidades de EXAME e de MEDIDA DO CORPO. Esta lista é o oposto da
 * `UNIDADES_DE_REMEDIO` das regras de linguagem, e as duas existem por razões
 * opostas: lá, relatar uma medida é o que a R4 exige e não pode ser reprovado;
 * aqui, guardar uma medida é justamente o que a análise de LGPD proibiu.
 */
const UNIDADES_DE_MEDIDA =
  'ng/mL|mg/dL|g/dL|mmol/L|µmol/L|umol/L|mUI/L|µUI/mL|uUI/mL|UI/L|mg/L|%|kg|quilos?|g|cm|m|bpm|mmHg|mm/h';

/**
 * Letra, INCLUINDO acento.
 *
 * Em JavaScript, `\w` é sempre `[A-Za-z0-9_]` — **nem a flag `u` muda isso**.
 * Consequências, e as duas morderam este arquivo antes de ele ficar pronto:
 * `hipertens\w+` não atravessa o "ã" de "hipertensão", e `voc[eê]\b` não casa
 * em "você" porque `\b` depois de "ê" não é fronteira. Toda fronteira de
 * palavra daqui é montada com `L`, `INI` e `FIM`, e nunca com `\b` ou `\w`.
 */
const L = '[\\wÀ-ÿ]';
/** Começo de palavra, respeitando acento. */
const INI = `(?<!${L})`;
/** Fim de palavra, respeitando acento. */
const FIM = `(?!${L})`;

/** Monta o padrão com a flag `i`, para o texto da pessoa não precisar de caixa. */
function padrao(fonte: string): RegExp {
  return new RegExp(fonte, 'i');
}

const CONDICOES =
  `diabet${L}*|hipertens${L}*|press[aã]o\\s+alta|colesterol|triglicer${L}*|anemia|asma|` +
  `c[aâ]ncer|tumor|depress${L}*|ansiedade|transtorno${L}*|tireoid${L}*|hipotireoid${L}*|` +
  `hipertireoid${L}*|artrit${L}*|artros${L}*|enxaqueca|epileps${L}*|hepatit${L}*|` +
  `obesidad${L}*|al[eé]rgic${L}*|alergia${L}*|doen[cç]${L}*|condi[cç][aã]o|s[ií]ndrome|` +
  `problema\\s+de\\s+sa[uú]de`;

const PADROES: Array<{ padrao: RegExp; motivo: string }> = [
  {
    // Número seguido de unidade de medida. "22 ng/mL", "78 kg", "1,70 m".
    padrao: padrao(`\\d+([.,]\\d+)?\\s*(${UNIDADES_DE_MEDIDA})(?![a-zA-Z])`),
    motivo: 'medida',
  },
  {
    // Pressão por extenso: "12 por 8". Não tem unidade escrita, e é a forma
    // como quase todo mundo diz.
    padrao: padrao(`${INI}\\d{1,3}\\s*(por|x)\\s*\\d{1,2}${FIM}`),
    motivo: 'medida',
  },
  {
    // Condição declarada em primeira pessoa. O fato de memória é escrito do
    // ponto de vista da pessoa, então "você tem" (que a R3 já pega) não
    // aparece aqui -- o que aparece é "tenho", "sou", "fui diagnosticado".
    //
    // O `[\s\S]{0,40}` entre o verbo e o nome cobre "tenho uma doença", "sou
    // portador de", "convivo com asma desde criança".
    padrao: padrao(
      `${INI}(tenho|tive|sou|era|fui\\s+diagnosticad${L}*|sofro\\s+de|convivo\\s+com|portador${L}*)${FIM}` +
        `[\\s\\S]{0,40}${INI}(${CONDICOES})${FIM}`,
    ),
    motivo: 'condicao',
  },
  {
    // "Sou hipertenso", "sou diabético" -- adjetivo sem substantivo, que a
    // regra acima não alcança porque ali o nome vem depois do verbo.
    padrao: padrao(
      `${INI}(sou|era)\\s+(um\\s+|uma\\s+)?(hipertens${L}*|diab[eé]tic${L}*|an[eê]mic${L}*|` +
        `asm[aá]tic${L}*|card[ií]ac${L}*|obes${L}*|al[eé]rgic${L}*)${FIM}`,
    ),
    motivo: 'condicao',
  },
  {
    // Medicamento por categoria. O nome comercial de um remédio não cabe em
    // lista fechada, mas a categoria cabe -- e "tomo um remédio para dormir" é
    // tão registro quanto "tomo losartana".
    padrao: padrao(
      `${INI}(rem[eé]di${L}*|medicament${L}*|medica[cç][aã]o|comprimid${L}*|c[aá]psul${L}*|insulina|` +
        `antibi[oó]tic${L}*|anticoagulant${L}*|antidepressiv${L}*|anti-?inflamat[oó]ri${L}*|` +
        `ansiol[ií]tic${L}*|corticoid${L}*|quimioterapia)${FIM}`,
    ),
    motivo: 'medicamento',
  },
  {
    // Prognóstico e risco. Guardar um risco é guardar um cálculo que esta IA
    // não tem autoridade para fazer, e que ninguém conferiu.
    padrao: padrao(
      `${INI}(risco\\s+(alt${L}*|baix${L}*|aument${L}*|de)|progn[oó]stic${L}*|` +
        `tend[eê]ncia\\s+(a|de|é|e)${FIM}|chance\\s+de\\s+(ter|desenvolver)|` +
        `vou\\s+(ter|desenvolver)|propens${L}*)`,
    ),
    motivo: 'prognostico',
  },
  {
    // Julgamento sobre a pessoa. Art. 6º, IX -- um julgamento guardado e relido
    // a cada conversa mudaria o tom de tudo o que ela recebe depois.
    padrao: padrao(
      `${INI}(dificuldade\\s+de\\s+seguir|baixa\\s+ades[aã]o|` +
        `n[aã]o\\s+(costuma|adere|segue|consegue\\s+seguir)|neglig${L}*|descuidad${L}*|` +
        `desmotivad${L}*|resistente\\s+a|desorganizad${L}*)${FIM}` +
        `|${INI}(é|e)\\s+(muito\\s+)?(ansios${L}*|nervos${L}*|resistente|desmotivad${L}*|` +
        `pregui[cç]os${L}*)${FIM}` +
        `|${INI}parece\\s+${L}+`,
    ),
    motivo: 'julgamento',
  },
  {
    // Instrução ao modelo disfarçada de fato. Este é o único texto desta EPIC
    // que volta para DENTRO do prompt em conversas futuras, então ele é
    // superfície de injeção e precisa ser tratado como tal -- um fato
    // confirmado uma vez seria obedecido sempre.
    padrao: padrao(
      `${INI}(ignor[ae]${L}*|desconsider[ae]${L}*|esque[cç]a)${FIM}[\\s\\S]{0,40}` +
        `${INI}(regra${L}*|instru[cç][oõ]${L}*|anterior${L}*|sistema|prompt)${FIM}` +
        `|${INI}voc[eê]${FIM}\\s+(pode|deve|é|e)\\s+` +
        `|${INI}a\\s+partir\\s+de\\s+agora${FIM}` +
        `|${INI}n[aã]o\\s+siga${FIM}`,
    ),
    motivo: 'instrucao',
  },
];

/**
 * A ordem importa pouco para o resultado e muito para o log: para na primeira
 * reprovação, e o motivo diz qual categoria pegou.
 */
export function validarProposta(proposta: PropostaBruta): ResultadoDaProposta {
  if (!tipoValido(proposta.tipo)) return { ok: false, motivo: 'tipo fora da lista fechada' };
  if (!textoValido(proposta.texto)) return { ok: false, motivo: 'texto vazio ou acima do teto' };

  const texto = normalizarTexto(proposta.texto);

  for (const { padrao, motivo } of PADROES) {
    if (padrao.test(texto)) return { ok: false, motivo: `categoria proibida: ${motivo}` };
  }

  // A classificação é OPERACIONAL, e não clínica. Um fato de cinco palavras não
  // é uma resposta sobre saúde; exigir dele o encaminhamento da R2 reprovaria
  // "Prefiro respostas curtas" por não mandar a pessoa ao médico, que é
  // exatamente o rodapé mecânico que a R2 manda evitar.
  //
  // `temOrigem` fica AUSENTE, e a ausência é estrutural e não esquecimento: o
  // `memoryProposalSchema` não tem campo de citação, então um fato nunca tem de
  // onde declarar origem. Ausente significa "sem origem", que é o que um fato é.
  //
  // O efeito é que a R4 também pega medida aqui, e isso é ganho: o padrão
  // `medida` acima conhece as unidades de `UNIDADES_DE_MEDIDA`, e a R4 conhece as
  // do conversor de unidades — "meu TGO deu 28 U/L" escapava da primeira lista e
  // passa a ser reprovado pela segunda. Guardar medida é o que a análise de LGPD
  // proibiu, e agora as duas listas somam em vez de cada uma cobrir metade.
  const regras = checkLanguageRules(texto, { questionKind: 'operacional' });
  if (!regras.ok) return { ok: false, motivo: `regra de linguagem: ${regras.violations[0].rule}` };

  return { ok: true };
}
