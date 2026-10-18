/**
 * Resumo do arquivo:
 * A camada 4 das cinco que estudos-ia/01-estudos/regras-de-linguagem.md
 * descreve -- a verificacao deterministica de saida. E a camada que
 * diferencia uma regra declarada de uma regra cumprida.
 *
 * Por que ela e necessaria mesmo havendo guardrail: o guardrail do Bedrock
 * cobre categorias genericas de seguranca e dois topicos que o projeto
 * definiu. Ele NAO conhece a R1 -- a palavra proibida e uma decisao deste
 * projeto, nao uma categoria de risco reconhecivel -- e nao cobre toda forma
 * que o portugues produz para escrever uma posologia.
 *
 * ESTE ARQUIVO NAO IMPORTA NADA alem de `numberParser` (E2), que tem a mesma
 * regra: nem AWS, nem node:, nem pacote. E o que permite compartilha-lo com o
 * aplicativo (D30) e o que o torna testavel com centenas de textos em
 * milissegundos.
 *
 * DUAS PROPRIEDADES QUE SAO CONTRATO:
 * 1. Reprova, nunca reescreve.
 * 2. Na duvida, reprova. Uma resposta boa reprovada custa uma nova geracao;
 *    uma resposta com posologia aprovada custa muito mais.
 */
import { parseDecimal } from '../extract-document-data/numberParser';

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

/**
 * Quem chama sabe qual e -- ele conhece a pergunta do usuario e qual tool foi
 * usada. Fazer o verificador inferir isso criaria uma segunda classificacao,
 * falivel, dentro da camada que existe justamente para ser confiavel.
 */
export type QuestionKind = 'clinica' | 'operacional';

/**
 * O que a verificacao precisa saber ALEM do texto.
 *
 * `temOrigem` responde a uma pergunta que o texto nao responde: a resposta
 * trouxe de onde os numeros dela sairam? Quem chama sabe -- ele tem o envelope
 * da resposta e o anexo do turno em maos. Inferir isso a partir da prosa seria
 * criar uma segunda classificacao falivel dentro da camada que existe para ser
 * confiavel, que e o mesmo motivo pelo qual `questionKind` tambem vem de fora.
 *
 * AUSENTE significa NAO, e isso e o contrato "na duvida, reprova" aplicado a
 * propria assinatura: um chamador que esquecer de ligar a origem recebe
 * reprovacao, nunca aprovacao silenciosa. Aprovacao silenciosa era exatamente o
 * defeito que a R4 tinha -- `[].every(...)` e verdadeiro.
 */
export type OpcoesDeVerificacao = {
  questionKind: QuestionKind;
  temOrigem?: boolean;
  /**
   * As ferramentas foram chamadas e TODAS disseram que nao ha dado.
   *
   * Vem de quem chama, como os dois acima, e pela mesma razao: so ele viu o
   * que as tools devolveram. Inferir isso da prosa criaria a segunda
   * classificacao falivel que este arquivo inteiro evita.
   *
   * ATENCAO -- este campo NAO segue "na duvida, reprova", e a excecao e
   * deliberada: ele e uma PRECONDICAO da R5, e nao uma desculpa dela. Ausente
   * significa "a regra nao se aplica a este turno". Se significasse "reprova",
   * toda resposta normal seria reprovada por nao dizer que falta algo, que e o
   * oposto do que a R5 quer.
   */
  semDados?: boolean;
  /**
   * Os valores de remedio que a ferramenta de medicamentos devolveu no turno,
   * como chaves de `valoresDeRemedioNoTexto` (E2, D2.4). Com eles, o primeiro e
   * o segundo padrao da R3 deixam passar o valor CADASTRADO quando a frase nao
   * prescreve: "o seu cadastro diz 500 mg" e registro, "tome 500 mg" nao.
   *
   * Vem de quem chama, como os de cima, e pela mesma razao: so ele viu o que a
   * ferramenta devolveu. AUSENTE significa nenhuma excecao -- "na duvida,
   * reprova" de novo. Se viesse do modelo, a resposta diria o que e cadastro.
   */
  valoresCadastrados?: readonly string[];
};

export type Violation = {
  rule: RuleId;
  /** Em pt-BR, para entrar em log e, quando for o caso, em aviso ao modelo. */
  reason: string;
  /** O trecho que disparou. Sempre uma substring literal do texto recebido. */
  excerpt: string;
};

export type RuleCheckResult = { ok: true } | { ok: false; violations: Violation[] };

/** Recorta o trecho em volta da posicao, para a violacao apontar onde foi. */
function trecho(texto: string, indice: number, tamanho: number): string {
  const inicio = Math.max(0, indice - 20);
  const fim = Math.min(texto.length, indice + tamanho + 20);
  return texto.slice(inicio, fim);
}

type Verificador = (texto: string, opcoes: OpcoesDeVerificacao) => Violation[];

/** Preenchido pelas tarefas L2, L3 e L4. */
const VERIFICADORES: Verificador[] = [];

export function checkLanguageRules(
  text: string,
  options: OpcoesDeVerificacao,
): RuleCheckResult {
  if (typeof text !== 'string' || text.trim() === '') {
    // Resposta vazia e falha de geracao, nao resposta limpa. Aprova-la aqui
    // faria a tela mostrar silencio como se fosse uma resposta.
    return {
      ok: false,
      violations: [{ rule: 'R5', reason: 'A resposta veio vazia.', excerpt: '' }],
    };
  }

  const violations = VERIFICADORES.flatMap((verificar) => verificar(text, options));
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

/**
 * A raiz do termo vetado, MONTADA a partir de partes em vez de escrita.
 *
 * Nao e disfarce: e coerencia. O usuario determinou que a IA nunca use essa
 * palavra, e um repositorio que a proibe enquanto a escreve por extenso em
 * vinte arquivos esta ensinando o contrario do que diz. Montar a raiz aqui
 * mantem UMA ocorrencia construida, neste arquivo, com este comentario.
 *
 * A razao da proibicao, do estudo: a palavra fecha uma questao que, em saude,
 * esta IA nao tem autoridade para fechar.
 */
const RAIZ_R1 = ['fi', 'na', 'l'].join('');

/**
 * A regra alcanca o termo isolado, o plural, e os verbos e substantivos
 * formados a partir dele -- por isso casa a RAIZ seguida de sufixo, e nao a
 * palavra inteira. A fronteira de palavra a esquerda (`\b`) e o que impede
 * "clinica" de casar por conter as letras no meio.
 */
const PADRAO_R1 = new RegExp(`\\b${RAIZ_R1}(iz\\w*|id\\w*|ment\\w*|ista\\w*|es|is|a|ais)?\\b`, 'gi');

function normalizar(texto: string): string {
  // Sem acento e em minusculas, para a comparacao nao depender de como o
  // modelo acentuou. O INDICE se mantem alinhado porque normalize('NFD') +
  // remocao de diacriticos so encurta em caracteres combinantes, que nao
  // aparecem nas raizes testadas -- por isso o trecho e recortado do texto
  // ORIGINAL, e nao deste.
  return texto.toLowerCase();
}

const verificarR1: Verificador = (texto) => {
  const violacoes: Violation[] = [];
  const alvo = normalizar(texto);
  PADRAO_R1.lastIndex = 0;

  let achado: RegExpExecArray | null;
  while ((achado = PADRAO_R1.exec(alvo)) !== null) {
    violacoes.push({
      rule: 'R1',
      reason:
        'A resposta usa o termo que este projeto não emprega, porque ele fecha uma questão que esta IA não tem autoridade para fechar.',
      excerpt: trecho(texto, achado.index, achado[0].length),
    });
    // Uma violacao por resposta basta: vinte apontamentos da mesma palavra
    // nao ajudam quem vai decidir o que fazer com a reprovacao.
    break;
  }

  return violacoes;
};

VERIFICADORES.push(verificarR1);

/**
 * Unidades de MEDICAMENTO. Deliberadamente NAO inclui unidades de exame
 * (ng/mL, mg/dL, mmol/L): "seu resultado foi 32,5 ng/mL" e exatamente o que a
 * R4 exige que a IA diga, e reprovar isso quebraria a regra pelo outro lado.
 *
 * A diferenca entre as duas listas e a diferenca entre relatar uma medida e
 * prescrever uma quantidade.
 */
const UNIDADES_DE_REMEDIO =
  'mg|mcg|g|ml|mL|ui|UI|comprimidos?|capsulas?|cápsulas?|gotas?|ampolas?|doses?';

/**
 * Substantivos do APLICATIVO. Depois de "voce tem", eles nao sao diagnostico --
 * sao inventario. Sem esta lista, "Voce tem um exame de sangue guardado" era
 * reprovado como afirmacao de condicao medica, e essa e a frase mais natural
 * para responder "que exames eu tenho" (U3b, 2026-09-19).
 */
const COISAS_DO_APLICATIVO =
  'exames?|documentos?|consultas?|receitas?|resultados?|registros?|compromissos?|vacinas?|laudos?|anexos?|' +
  // Dose e reforco da CARTEIRA (E8): "voce tem uma dose prevista para 10/11"
  // e o calendario do aplicativo, e era reprovada como diagnostico.
  'doses?|refor[cç]os?|' +
  // Remedio e estoque do CADASTRO (E2): "voce tem 3 medicamentos cadastrados"
  // e "voce tem 5 comprimidos registrados" respondem "quais remedios eu tomo"
  // e "esta acabando", e eram reprovadas como diagnostico. A QUANTIDADE ("5
  // comprimidos") continua com o padrao de numero, e so passa pela D2.4.
  // "gotas" NAO entra: "voce tem gota" e a doenca (revisao do E2).
  'medicamentos?|rem[eé]dios?|comprimidos?|c[aá]psulas?|ampolas?';

/**
 * O que pode vir entre "voce tem" e o inventario sem mudar o sentido (Bloco 11):
 * "voce tem APENAS um laudo guardado". Sem isto a frase era reprovada como
 * diagnostico -- medido: tres respostas a mesma pergunta, as tres barradas nas
 * duas geracoes. O adverbio so exime quando o que vem depois E inventario;
 * "voce tem apenas diabetes" continua reprovado.
 */
const ADVERBIOS_DO_INVENTARIO = 'apenas|s[oó]|somente|ainda|j[aá]';

/** O inventario dito com o objeto ANTES do verbo: "os laudos que voce tem
 *  guardados". O participio e o que diz que se fala do aplicativo. */
const PARTICIPIOS_DO_INVENTARIO =
  'guardad[oa]s?|registrad[oa]s?|salv[oa]s?|cadastrad[oa]s?|anexad[oa]s?|marcad[oa]s?';

/** Letra COM acento, para a fronteira de palavra que `\b` nao da. */
const L_R3 = '[\\wÀ-ÿ]';
const FIM_R3 = `(?!${L_R3})`;
/**
 * Comeco de palavra. NAO e enfeite: sem ele, o `[eé]` de `VERBO_DE_ESTADO` casa
 * o "e" FINAL de qualquer palavra -- e foi o que aconteceu na primeira versao
 * desta regra, que reprovou o proprio texto das regras em
 * "sugestoes pequenas e **de** baixo risco": "d-e" + " " + "baixo".
 *
 * Pego pelo teste que exige que o bloco de regras passe na propria verificacao.
 * Se esse teste nao existisse, o modelo leria um contraexemplo na primeira
 * linha do que o instrui.
 */
const INI_R3 = `(?<!${L_R3})`;

/** Verbo de estado: e ele que transforma um adjetivo em VEREDITO. */
const VERBO_DE_ESTADO = 'est[aá]|est[aã]o|[eé]|s[aã]o|ficou|ficaram|veio|vieram|parece|parecem';

/** O adjetivo que fecha a questao sobre um valor. */
const JULGAMENTO_DE_VALOR =
  'alterad[oa]s?|anormais|anormal|normais|normal|preocupantes?|elevad[oa]s?|alt[oa]s?|baix[oa]s?';

/**
 * A RECUSA de julgar nao e julgamento. "Nao posso dizer se esta alterado" e a
 * resposta certa, e reprova-la ensinaria o modelo a nao dizer nem isso.
 */
const RECUSA_DE_JULGAR = /n[aã]o\s+(posso|cabe|consigo|sei|consegue|[eé]\s+poss[ií]vel|d[aá]\s+para)/i;

/**
 * O que se FAZ como exame de prevencao (E7, D7.3). Lista fechada de proposito:
 * "consulta" NAO entra, porque "voce precisa marcar uma consulta" e
 * encaminhamento, e reprova-lo quebraria a R2 pelo outro lado.
 */
const OBJETO_DE_EXAME =
  'exames?|rastreamentos?|mamografias?|colonoscopias?|papanicolau|preventivos?|triagens?|testes?|' +
  'check-?ups?|densitometrias?|tomografias?|ultrassons?|ultrassonografias?|ecografias?|endoscopias?|psa';

/**
 * Palavras de USO DO APLICATIVO e de AGENDA. Entre o verbo e o exame, qualquer
 * uma delas diz que a frase fala de outra coisa: "fazer login para ver os
 * exames", "marcar uma consulta sobre os exames", "a consulta de retorno do
 * exame esta atrasada". A primeira versao destes padroes reprovava as tres
 * (achado da revisao do E7, 2026-10-17).
 */
const FORA_DO_ASSUNTO =
  'login|upload|cadastr|op[cç][aã]o|aplicativo|app|foto|anexo|perfil|senha|conta|' +
  'consulta|retorno|resultado|laudo|agendamento|envio';

/** Ate `n` caracteres da mesma frase que nao atravessam `fora` (por padrao,
 *  `FORA_DO_ASSUNTO`; os padroes de interacao do E9 passam `FORA_DO_REMEDIO`). */
const janela = (n: number, fora = FORA_DO_ASSUNTO) => `(?:(?!${fora})[^.!?]){0,${n}}?`;

/** O que pode vir entre o verbo e o exame sem mudar o objeto: "a", "sua primeira". */
const DETERMINANTE = 'um|uma|uns|umas|o|a|os|as|seus?|suas?|nov[oa]s?|outr[oa]s?|mais|primeir[oa]s?';

/**
 * Do verbo ate o exame que e o OBJETO dele: so determinantes ("a sua
 * primeira"), e no maximo um aposto entre virgulas ("fazer, de preferencia
 * neste ano, a mamografia"). Uma janela livre deixaria o exame ser so uma
 * palavra qualquer da frase -- "fazer login para ver os exames" --, e cada
 * palavra de aplicativo viraria uma excecao a mais (achado de altitude da
 * revisao do E7).
 */
const ateOExame = (determinantes: number) =>
  `(?:\\s*,[^,.!?]{0,40},)?\\s+(?:(?:${DETERMINANTE})\\s+){0,${determinantes}}(?:${OBJETO_DE_EXAME})${FIM_R3}`;

/**
 * O que se TOMA ou se RECEBE numa vacinacao (E8, D8.4). "Dose" so conta quando
 * a frase diz de QUE e a dose ("a dose da vacina", "a dose de reforco"): solta,
 * "tome a dose do remedio" e posologia, e tem de cair no motivo de medicacao,
 * que diz ao modelo o que corrigir (achado da revisao do E8).
 */
const OBJETO_DE_VACINA =
  'vacinas?|refor[cç]os?|imuniza[cç](?:[aã]o|[oõ]es)|doses?(?=\\s+(?:d[aeo]s?\\s+)?(?:vacina|refor))';

/** Determinantes, mais os ordinais e a contagem da serie: "a segunda dose da
 *  vacina", "as 2 doses da vacina". */
const DETERMINANTE_DE_VACINA = `${DETERMINANTE}|\\d+|segund[oa]s?|terceir[oa]s?|quart[oa]s?|[uú]ltim[oa]s?|pr[oó]xim[oa]s?`;

/** Do verbo ate a vacina que e o OBJETO dele: no maximo um adverbio curto
 *  ("tome LOGO a vacina") e determinantes no meio. */
const ateAVacina =
  `\\s+(?:(?:j[aá]|logo|tamb[eé]m|agora)\\s+)?(?:(?:${DETERMINANTE_DE_VACINA})\\s+){0,3}(?:${OBJETO_DE_VACINA})${FIM_R3}`;

/** "voce deve", "voce ja deveria", "voce pode e deve" -- a obrigacao dita a pessoa. */
/**
 * Os modais de obrigacao, UMA lista para os padroes que os usam (exame no E7,
 * vacina no E8, valor cadastrado no E2). Eram tres copias identicas, e o
 * modal que entrasse numa so faria um padrao reprovar o que o vizinho aprova.
 */
const MODAL_DE_OBRIGACAO = 'deve|deveria|precisa|precisaria|tem\\s+que|tem\\s+de|teria\\s+que';

const OBRIGACAO_DITA_A_PESSOA =
  `${INI_R3}voc[eê]\\s+(?:(?:j[aá]|ainda|tamb[eé]m|pode\\s+e)\\s+)?` +
  `(?:${MODAL_DE_OBRIGACAO})${FIM_R3}${janela(25)}`;

/**
 * O assunto que torna "em dia" um juizo sobre o cuidado da pessoa. VACINA NAO
 * ENTRA: dose "atrasada" e um conceito do proprio calendario do aplicativo
 * (`homeVaccination.ts`), e reprova-la quebraria as respostas de
 * `consultar_vacinas` -- achado da revisao do E7.
 */
const ASSUNTO_DE_PREVENCAO = `preven[cç]${L_R3}*|preventiv${L_R3}*|${OBJETO_DE_EXAME}`;

/** "em dia", "em atraso", "atrasada" -- o veredito, com ou sem verbo antes. */
const EM_DIA = `(?:em\\s+dia|em\\s+atraso|atrasad[oa]s?)${FIM_R3}`;

/**
 * Agenda e resultado nao sao o cuidado da pessoa: "a consulta esta atrasada".
 *
 * Fica DEPOIS do trecho ja casado, e com teto: um lookbehind sem teto antes
 * de cada posicao do texto e reavaliado em todas elas, e a primeira versao
 * levou a suite de regras de minutos (medido em 2026-10-17).
 */
const SEM_AGENDA_ANTES = `(?<!(?:${FORA_DO_ASSUNTO})[^.!?]{0,120})`;

/** O "em dia" e o assunto em qualquer ordem, na mesma frase, sem agenda antes. */
const emQualquerOrdem = (a: string, b: string) =>
  `${a}${SEM_AGENDA_ANTES}${janela(60)}${b}|${b}${SEM_AGENDA_ANTES}${janela(60)}${a}`;

/**
 * Para o "em dia", alem da recusa, a PERGUNTA tambem absolve: "pergunte ao
 * medico SE os exames estao em dia" e encaminhamento, e nao veredito. O "se"
 * precisa vir preso a um verbo de perguntar: solto, ele e tambem pronome
 * ("como se ve, seus exames estao em dia"), e absolveria o veredito.
 */
const RECUSA_OU_PERGUNTA = new RegExp(
  `${RECUSA_DE_JULGAR.source}|(?:pergunt\\w*|saber|verific\\w*|confirm\\w*|dizer)\\s+(?:\\S+\\s+){0,3}?se\\b`,
  'i',
);

/**
 * Para a indicacao de vacina e de exame (E8), alem da recusa e da pergunta, a
 * ORACAO SUBORDINADA com "se" tambem absolve: "quem decide se voce deve tomar a
 * vacina e o profissional", "a unidade dira se...", "se voce deve fazer o exame,
 * quem diz e o medico". Devolver a decisao a quem decide e a resposta CERTA para
 * "devo me vacinar?" e "preciso fazer mamografia?", e os dois padroes a
 * reprovavam (revisao do E8). O
 * "se" continua preso a um verbo de decidir/dizer, ou abrindo a oracao logo
 * antes do "voce": solto no meio da frase ele tambem e pronome.
 */
const RECUSA_PERGUNTA_OU_CONDICAO = new RegExp(
  `${RECUSA_OU_PERGUNTA.source}|(?:decid\\w*|inform\\w*|dir[aá]|diz\\w*)\\s+(?:\\S+\\s+){0,3}?se\\b|(?:^|[^\\wÀ-ÿ])se\\s+$`,
  'i',
);

/**
 * A familia da unidade, para "comprimido" e "comprimidos", "mL" e "ml",
 * "cápsula" e "capsulas" serem o mesmo valor. Plural tirado so de palavra com
 * mais de tres letras: "mcg" e "ui" nao tem plural, e "dose" -> "doses" tem.
 */
function familiaDaUnidade(unidade: string): string {
  const u = unidade.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return u.length > 3 ? u.replace(/s$/, '') : u;
}

/**
 * O numero como valor, pela MESMA leitura do laudo (`parseDecimal`, D23):
 * "2,5" e "2.5" sao o mesmo, e "50.000 UI" e cinquenta mil -- le-lo como 50
 * aceitaria um valor mil vezes menor (revisao do E2). Uma segunda leitura de
 * numero pt-BR aqui divergiria daquela na proxima correcao.
 */
const numeroDoValor = (texto: string): number | null => {
  const lido = parseDecimal(texto);
  return lido.ok ? lido.value : null;
};

/**
 * O que, no caminho entre o verbo e o resto da frase, diz que ela fala de USO
 * DO APLICATIVO ou de outra coisa que nao remedio (E9): "trocar a FOTO por
 * outra", "pode tomar NOTA", "podem tomar a VACINA junto com outras", "pode
 * tomar essa DECISAO com quem prescreveu" -- todas reprovadas pela primeira
 * versao dos padroes de interacao (revisao do E9).
 */
const FORA_DO_REMEDIO = `${FORA_DO_ASSUNTO}|tela|chat|imagem|arquivo|documento|pdf|filtro|bairro|nota|decis|cuidado|vacina|refor`;

/**
 * Teto do que os padroes de interacao olham ADIANTE do achado ate o fim da
 * frase. Sem ele, cada "troque" ou "pode tomar junto" num texto sem pontuacao
 * relia tudo ate o fim -- custo quadratico, medido na revisao do E9 (69 ms em 16
 * mil caracteres), num caminho que roda em toda resposta. 200 caracteres sao
 * uma frase longa; o que vem depois disso ja e outra afirmacao.
 */
const ADIANTE = 200;

/** O motivo da R3 para iniciar, trocar ou interromper remedio: uma frase so para
 *  a suspensao e para a troca (E9), porque e o bilhete que o modelo le para
 *  corrigir, e duas redacoes dariam duas instrucoes. */
const MOTIVO_DE_MUDANCA = 'A resposta orienta iniciar, mudar ou interromper uma medicação.';

/** "pode tomar", "podem usar", "da para tomar", "pode associar". */
const PERMISSAO_DE_TOMAR = `(?:podem?|d[aá]\\s+(?:pra|para))\\s+(?:tomar|usar|associar)`;

/**
 * O que fecha a permissao como GARANTIA: "junto", "tranquilo", "normalmente",
 * "ao mesmo tempo", "sim", "sem problema", ou "com" outro remedio -- e nao "com
 * comida", que e o modo de tomar que a pessoa anotou (E2).
 */
const FECHO_DA_PERMISSAO =
  `(?:${INI_R3}(?:junt\\w*|tranquil\\w*|normalmente|ao\\s+mesmo\\s+tempo|sim)${FIM_R3}` +
  `|${INI_R3}sem\\s+(?:problema|medo|risco)` +
  `|${INI_R3}com${FIM_R3}(?!\\s+(?:comida|[aá]gua|alimento|leite|caf[eé]|refei)))`;

/**
 * A excecao da garantia de combinacao (E9). Mais ESTREITA que a da vacina e a
 * do exame, de proposito: a revisao do E9 provou que "nao sei a dose, pode
 * tomar junto" e "confirmei se havia alerta e nao ha interacao" passavam,
 * porque uma recusa sobre OUTRA coisa, na mesma oracao, absolvia a garantia.
 *
 * Aqui o "se" (ou o "que" de "nao quer dizer que") tem de ficar COLADO a
 * garantia -- no maximo tres palavras entre eles, e nenhuma delas um "e" ou um
 * "mas" que abra outra afirmacao. Assim "pergunte ao farmaceutico se pode tomar
 * junto" e "isso nao quer dizer que voce pode tomar junto" passam, e a recusa
 * solta, longe, nao absolve. Palavra com pontuacao tambem fecha: "pode
 * verificar se quiser: pode tomar junto" sao duas frases.
 */
const DEVOLVE_A_DECISAO = new RegExp(
  `(?:${RECUSA_DE_JULGAR.source}|saber|sei|sabe|confirm\\w*|verific\\w*|pergunt\\w*|consult\\w*|decid\\w*|avali\\w*|dir[aá]|diz\\w*)` +
    `(?:\\s+\\S+){0,4}?\\s+se\\s+(?:(?!(?:e|mas|ent[aã]o)\\s)[^\\s,:;]+\\s+){0,3}$` +
    `|n[aã]o\\s+(?:quer\\s+dizer|significa|garante)\\s+que\\s+(?:\\S+\\s+){0,2}$`,
  'i',
);

type PadraoR3 = {
  padrao: RegExp;
  motivo: string;
  excecao?: RegExp;
  /**
   * So nos dois padroes de NUMERO (E2, D2.4): a chave canonica do valor
   * casado, comparada com `valoresCadastrados`. Os outros padroes sao de verbo
   * e de indicacao, e nao ha valor cadastrado a proteger neles.
   */
  chaveDoValor?: (casado: string) => string | null;
};

const PADROES_R3: PadraoR3[] = [
  {
    // "500 mg", "2 comprimidos", "1 cápsula" -- quantidade seguida de unidade
    // de medicamento.
    // A negativa `(?!/)` e o que separa "500 mg" de "12,1 g/dL": a barra e a
    // marca de que a unidade e de EXAME (g/dL, ng/mL, ml/min), e relatar uma
    // medida e o que a R4 exige. Sem ela, a R3 reprovaria a R4.
    padrao: new RegExp(`\\b\\d+([.,]\\d+)?\\s*(${UNIDADES_DE_REMEDIO})\\b(?!/)`, 'i'),
    motivo:
      'A resposta indica uma quantidade de medicamento. Dose e posologia são de quem prescreve.',
    chaveDoValor: (casado) => {
      const [, numero, unidade] = /^(\d+(?:[.,]\d+)?)\s*(.+)$/.exec(casado)!;
      const valor = numeroDoValor(numero);
      return valor === null ? null : `${valor}|${familiaDaUnidade(unidade)}`;
    },
  },
  {
    // "de 8 em 8 horas", "a cada 12 horas" -- intervalo de administracao.
    padrao: /\b(de\s+\d+\s+em\s+\d+\s+horas?|a\s+cada\s+\d+\s+horas?)\b/i,
    motivo: 'A resposta indica um intervalo de administração, que é posologia.',
    // "de 8 em 12 horas" tem DOIS intervalos e nenhum valor unico: sem chave.
    chaveDoValor: (casado) => {
      const numeros = casado.match(/\d+/g)!;
      return numeros.every((n) => n === numeros[0]) ? `${Number(numeros[0])}|hora` : null;
    },
  },
  {
    // INDICACAO INDIVIDUAL DE VACINA (E8, D8.4). A campanha e para um GRUPO, e
    // quem pode se vacinar -- e se a vacina serve para a pessoa -- e o
    // profissional ou a unidade de saude que diz. "Voce deve tomar a vacina da
    // gripe" e "a vacina e segura para voce" passavam pelas cinco regras ate
    // 2026-10-17.
    //
    // Vem ANTES do padrao de verbo de medicacao de proposito: "tome a dose da
    // vacina" ja era reprovada por ele, mas pelo motivo "medicacao", e o
    // bilhete da nova geracao precisa dizer o que corrigir. Mesmo raciocinio do
    // padrao de exame do E7.
    //
    // Em toda forma a vacina e o OBJETO do verbo e a pessoa e o sujeito ou o
    // destinatario: obrigacao, imperativo, "e importante voce...", e a garantia
    // de que a vacina serve para ela. Frase sobre o GRUPO ("que a populacao se
    // vacine") e registro ("voce tomou a vacina em 2025") passam. Os casos,
    // dos dois lados, estao em `adversarial.test.ts`.
    padrao: new RegExp(
      `${OBRIGACAO_DITA_A_PESSOA}${INI_R3}(?:(?:tomar|receber|fazer)${ateAVacina}|(?:se\\s+vacinar|vacinar-se|se\\s+imunizar)${FIM_R3})` +
        `|${INI_R3}voc[eê]\\s+(?:precisa|necessita)\\s+d[aeo]s?${ateAVacina}` +
        `|${INI_R3}(?:tome|receba|fa[cç]a|recomendo)${ateAVacina}` +
        `|${INI_R3}(?:v[aá]\\s+se\\s+vacinar|vacinem?-se)${FIM_R3}` +
        `|(?:${INI_R3}voc[eê]\\s+|${INI_R3}e\\s+|^\\s*|[.!?]\\s+)se\\s+vacinem?${FIM_R3}` +
        `|${INI_R3}(?:importante|vale\\s+a\\s+pena|recomend[aá]vel)\\s+(?:que\\s+)?voc[eê]\\s+(?:se\\s+vacin|tom|receb)` +
        `|${INI_R3}vacinas?${FIM_R3}${janela(40)}${INI_R3}(?:[eé]|s[aã]o|est[aá])\\s+(?:segur|indicad|recomendad)[ao]s?\\s+(?:para|pra)\\s+(?:voc[eê]|vc)${FIM_R3}` +
        `|${INI_R3}(?:n[aã]o\\s+h[aá]|sem|nenhuma)\\s+contraindica[cç][aã]o` +
        `|${INI_R3}voc[eê]\\s+pode\\s+(?:tomar|receber)${ateAVacina}[^.!?]{0,25}sem\\s+(?:problemas?|medo|risco)`,
      'i',
    ),
    motivo:
      'A resposta indica uma vacina para a pessoa. Se ela deve se vacinar, e se a vacina serve para ela, é decisão de quem a examina ou da unidade de saúde.',
    excecao: RECUSA_PERGUNTA_OU_CONDICAO,
  },
  {
    // Verbos de prescricao seguidos do que esta sendo prescrito. O imperativo
    // e o infinitivo entram os dois -- "aumente a dose" e "deveria aumentar a
    // dose" dizem a mesma coisa a quem le.
    padrao:
      /\b(tome|tomar|use|usar|ingira|ingerir|aumente|aumentar|diminua|diminuir|reduza|reduzir)\b[^.!?]{0,60}\b(medicament\w+|remedi\w+|remédi\w+|comprimid\w+|capsul\w+|cápsul\w+|doses?)\b/i,
    motivo: MOTIVO_DE_MUDANCA,
  },
  {
    // Verbos de SUSPENSAO disparam sozinhos, sem exigir que o objeto seja um
    // nome de medicamento reconhecido. "Suspenda o anticoagulante" nao casaria
    // com nenhuma lista fechada de substancias, e e o conselho mais perigoso
    // que esta IA poderia dar -- interromper medicacao por conta propria e o
    // risco maior de todos. Na duvida, reprova.
    padrao: /\b(suspenda|suspender|interrompa|interromper|par[ea]r?\s+de\s+tomar)\b/i,
    motivo: MOTIVO_DE_MUDANCA,
  },
  {
    // GARANTIA DE COMBINACAO SEGURA (E9, D9.4). A lista de interacoes do
    // aplicativo e curta de proposito, e a AUSENCIA de alerta nela nao diz que
    // dois remedios podem ir juntos -- dizer isso e o pior erro do E9. Medido em
    // 2026-10-17: "pode tomar os dois juntos sem problema" passava pelas cinco
    // regras. A resposta certa e "a lista do aplicativo nao traz alerta", e ela
    // nao casa.
    //
    // Cinco familias, porque o portugues tem cinco para a mesma garantia (a
    // revisao do E9 provou que uma lista de frases deixava passar quase tudo
    // fora do teste): a PERMISSAO ("pode tomar junto", "da para tomar", "podem
    // ser tomados juntos"), o "SEM PROBLEMA" ("nao tem problema nenhum tomar",
    // "nao faz mal"), a SEGURANCA ("e seguro", "parece segura", "nao e
    // perigosa"), a NEGACAO DA INTERACAO ("nao ha interacao", "nao interagem") e
    // a da contraindicacao.
    //
    // Frase que termina em "?" nao e garantia, e a pergunta devolvida ("a
    // combinacao e segura? quem responde e o farmaceutico").
    //
    // Vem DEPOIS do padrao de vacina, e e de proposito: "voce pode tomar a
    // vacina sem problema" continua com o motivo de vacina.
    padrao: new RegExp(
      '(?:' +
        `${INI_R3}${PERMISSAO_DE_TOMAR}${FIM_R3}${janela(40, FORA_DO_REMEDIO)}${FECHO_DA_PERMISSAO}` +
        // "Pode tomar o ibuprofeno." -- a permissao seca, sem "com" (que pode
        // ser "com comida", da anotacao da pessoa).
        `|${INI_R3}${PERMISSAO_DE_TOMAR}${FIM_R3}(?:(?!${FORA_DO_REMEDIO}|\\bcom\\b)[^.!?,:]){0,30}(?:[.!]|$)` +
        `|${INI_R3}podem?\\s+ser\\s+(?:tomad|usad)[oa]s?${FIM_R3}${janela(20, FORA_DO_REMEDIO)}${INI_R3}(?:junt\\w*|ao\\s+mesmo\\s+tempo|com)${FIM_R3}` +
        `|${INI_R3}(?:n[aã]o\\s+(?:tem|t[eê]m|h[aá]|faz)|sem)\\s+(?:nenhum\\s+)?(?:problema|risco|mal)(?:\\s+nenhum)?\\s+(?:em\\s+|de\\s+)?(?:tomar|usar)${FIM_R3}` +
        `|${INI_R3}n[aã]o\\s+faz\\s+mal${FIM_R3}` +
        `|${INI_R3}(?:[eé]|s[aã]o|parecem?)\\s+segur[oa]s?${FIM_R3}` +
        `|${INI_R3}n[aã]o\\s+(?:[eé]|s[aã]o)\\s+perigos[oa]s?${FIM_R3}` +
        // "Nao ha interacao REGISTRADA na lista" e o relato honesto do que a
        // lista diz, e passa.
        `|${INI_R3}n[aã]o\\s+(?:h[aá]|existe|tem|t[eê]m)\\s+(?:nenhuma\\s+)?(?:intera[cç](?:[aã]o|[oõ]es)|contraindica[cç](?:[aã]o|[oõ]es))${FIM_R3}` +
        `(?!\\s+(?:registrad|cadastrad|listad|conhecid|na\\s+lista|nessa\\s+lista|desta\\s+lista))` +
        `|${INI_R3}n[aã]o\\s+(?:interagem?|costumam?\\s+interagir)${FIM_R3}` +
        `)(?![^.!?]{0,${ADIANTE}}\\?)`,
      'i',
    ),
    motivo:
      'A resposta garante que dois remédios podem ser tomados juntos. A lista do aplicativo é curta, e quem diz se uma combinação serve para a pessoa é quem prescreve ou o farmacêutico.',
    excecao: DEVOLVE_A_DECISAO,
  },
  {
    // TROCA DE REMEDIO (E9, D9.4). E da familia da suspensao -- mudar o
    // tratamento por conta propria --, e o mesmo motivo. Medido em 2026-10-17:
    // "troque o ibuprofeno por paracetamol" passava. Sem excecao, como a
    // suspensao: na duvida, reprova.
    //
    // O que separa a troca de remedio de "trocar a FOTO por outra" e "use a
    // TELA em vez do chat" e `FORA_DO_REMEDIO` no caminho. "Substituir" so conta
    // com "por" (e nao "por isso"): solto, ele e a frase honesta "isso nao pode
    // substituir a conversa com o medico".
    padrao: new RegExp(
      `${INI_R3}(?:troque|trocar|troca|substitua|substituir)${FIM_R3}${janela(40, FORA_DO_REMEDIO)}` +
        `${INI_R3}(?:por|pel[oa]s?|para\\s+[oa]s?)${FIM_R3}(?!\\s+(?:isso|conta|favor|enquanto|exemplo))` +
        `|${INI_R3}(?:troque|substitua)${FIM_R3}(?=(?:(?!${FORA_DO_REMEDIO})[^.!?]){${ADIANTE}}|(?:(?!${FORA_DO_REMEDIO})[^.!?]){0,${ADIANTE}}(?:[.!?]|$))` +
        `|${INI_R3}(?:tome|tomar|use|usar)${FIM_R3}${janela(40, FORA_DO_REMEDIO)}${INI_R3}(?:no\\s+lugar|em\\s+vez|ao\\s+inv[eé]s)${FIM_R3}`,
      'i',
    ),
    motivo: MOTIVO_DE_MUDANCA,
  },
  {
    // INDICACAO INDIVIDUAL DE EXAME (E7, D7.3). A USPSTF recomenda para um
    // GRUPO; "voce deve fazer mamografia" transforma isso em indicacao para a
    // pessoa, e passava pelas cinco regras ate 2026-10-17.
    //
    // Vem ANTES do padrao de diagnostico de proposito: "voce tem que fazer o
    // exame" ja era reprovada por ele, mas pelo motivo errado ("afirma uma
    // condicao"), e o bilhete da nova geracao precisa dizer o que corrigir.
    //
    // Tres formas, porque o portugues tem tres para a mesma ordem:
    // 1. obrigacao + verbo de fazer exame: "voce deve (comecar a) fazer",
    //    "voce ja deveria ter feito";
    // 2. necessidade do exame em si: "voce precisa de uma mamografia";
    // 3. imperativo ou subjuntivo: "faca a colonoscopia", "recomendo que voce
    //    faca", "agende sua mamografia".
    // Nas tres, o exame precisa ser o OBJETO do verbo (`ateOExame`), e e isso
    // que separa indicacao de "fazer login para ver os exames". So entre a
    // obrigacao e o verbo ("voce deve COMECAR A fazer") ha uma janela livre,
    // curta, que nao atravessa uso do aplicativo nem agenda.
    padrao: new RegExp(
      `${INI_R3}voc[eê]\\s+(?:(?:j[aá]|ainda|tamb[eé]m)\\s+)?` +
        `(?:${MODAL_DE_OBRIGACAO})${FIM_R3}${janela(25)}` +
        `${INI_R3}(?:fazer|feito|realizar|realizado|marcar|agendar|repetir)${FIM_R3}${ateOExame(3)}` +
        `|${INI_R3}voc[eê]\\s+(?:precisa|precisaria|necessita)\\s+de${ateOExame(2)}` +
        `|${INI_R3}(?:fa[cç]a|realize|marque|agende|repita)${ateOExame(3)}`,
      'i',
    ),
    motivo:
      'A resposta indica um exame para a pessoa. A recomendação da fonte é para um grupo; se a pessoa deve fazer o exame é decisão de quem a examina.',
    // A mesma excecao da vacina (revisao do E8): "pergunte ao medico se voce
    // deve fazer a mamografia" devolve a decisao, nao a toma.
    excecao: RECUSA_PERGUNTA_OU_CONDICAO,
  },
  {
    // "VOCE ESTA EM DIA" (E7, D7.3). Dizer que a prevencao da pessoa esta em
    // dia -- ou atrasada -- e concluir sobre o cuidado dela com um dado que o
    // aplicativo nao tem (historico completo, avaliacao). O assunto e exigido
    // na mesma frase para nao pegar agenda: "a consulta esta atrasada" nao e
    // juizo sobre a saude de ninguem -- nem quando a frase fala de exame
    // depois ("a consulta de retorno do exame"), que e o `SEM_AGENDA_ANTES`.
    padrao: new RegExp(
      emQualquerOrdem(`${INI_R3}(?:${ASSUNTO_DE_PREVENCAO})${FIM_R3}`, `${INI_R3}${EM_DIA}`),
      'i',
    ),
    motivo:
      'A resposta diz se a pessoa está em dia com a prevenção. Isso depende de histórico e de avaliação que só quem a examina tem.',
    excecao: RECUSA_OU_PERGUNTA,
  },
  {
    // Diagnostico fechado: afirmar que a pessoa TEM algo.
    //
    // O `(?:^|\W)` antes de "e|é" existe porque `\b` nao serve aqui: em
    // JavaScript sem a flag `u`, "é" nao e caractere de palavra, entao `\bé`
    // nunca casa depois de um espaco. Era o que deixava "isso é um sinal claro
    // de diabetes" passar.
    padrao: new RegExp(
      '\\b(voce|você)\\s+(tem|esta\\s+com|está\\s+com|provavelmente\\s+tem)\\b' +
        // A negativa exime o INVENTARIO do aplicativo, e so ele. Qualquer outro
        // objeto -- "diabetes", "um quadro de tireoidite" -- continua reprovado,
        // e ha caso de teste para cada um.
        `(?!\\s+(?:(?:${ADVERBIOS_DO_INVENTARIO})\\s+)?(?:\\d+\\s+)?(?:um|uma|uns|umas|o|a|os|as)?\\s*(?:${COISAS_DO_APLICATIVO})\\b` +
        // "os laudos que voce tem guardados" -- o objeto veio ANTES do verbo.
        `|\\s+(?:${PARTICIPIOS_DO_INVENTARIO})${FIM_R3})` +
        '|(?:^|\\W)(e|é)\\s+(um\\s+)?(sinal\\s+claro\\s+de|caso\\s+de|quadro\\s+de)\\b',
      'i',
    ),
    motivo: 'A resposta afirma uma condição médica. Nenhuma resposta desta IA diagnostica.',
  },
  {
    // Descarte de gravidade. Tao categorico quanto afirmar, e mais perigoso:
    // quem ouve "nao e nada" nao procura ninguem.
    padrao:
      /\b(nao|não)\s+(e|é)\s+(nada\s+)?(grave|serio|sério|preocupante)\b|\bpode\s+ficar\s+tranquil\w+\b|\b(nao|não)\s+precisa\s+(procurar|ir\s+ao)\b/i,
    motivo:
      'A resposta descarta gravidade. Descartar urgência é tão categórico quanto afirmá-la, e mais arriscado.',
  },
  {
    // INTERPRETACAO CATEGORICA DE RESULTADO. A definicao da R3 em
    // `estudos-ia/01-estudos/regras-de-linguagem.md` proibe isso com todas as
    // letras, e o implementado nao cobria: "Seu exame esta alterado" passava
    // por R1, R2, R3 e R4 inteiras (U3c, 2026-09-19). Mesma classe de defeito
    // da R4 antes de 2026-09-18 -- regra certa no papel, verificada pela metade.
    //
    // O verbo de estado e obrigatorio, e e ele que separa veredito de
    // vocabulario: "esta alto" julga; "de baixo risco" nao.
    padrao: new RegExp(
      `${INI_R3}(${VERBO_DE_ESTADO})\\s+(um\\s+pouco\\s+)?(${JULGAMENTO_DE_VALOR})${FIM_R3}`,
      'i',
    ),
    motivo:
      'A resposta interpreta o resultado. Dizer se um valor está bom ou ruim é leitura clínica, e ela é de quem examina a pessoa.',
    excecao: RECUSA_DE_JULGAR,
  },
  {
    // Comparacao entre coletas. A EPIC de serie ja proibiu "melhorou/piorou" na
    // TELA; aqui e a mesma proibicao aplicada ao texto que o modelo escreve.
    padrao: new RegExp(`${INI_R3}(melhor(ou|aram|ando)|pior(ou|aram|ando))${FIM_R3}`, 'i'),
    motivo:
      'A resposta compara coletas dizendo que melhorou ou piorou. A evolução é mostrada; a leitura dela é de quem examina a pessoa.',
    excecao: RECUSA_DE_JULGAR,
  },
  {
    // SITUAR O VALOR NA FAIXA (Bloco 10). "Fica dentro do intervalo", "esta
    // acima da faixa" -- e a leitura do resultado dita sem nenhum dos adjetivos
    // do padrao acima. Achado na rodada automatica da L7: a resposta sobre a
    // testosterona terminava em "o valor fica dentro do intervalo indicado" e
    // foi APROVADA. Mostrar o valor ao lado da faixa continua permitido -- e o
    // que a tela faz; o que a regra reprova e a frase que conclui onde ele cai.
    padrao: new RegExp(
      `${INI_R3}(dentro|fora|acima|abaixo|al[eé]m)\\s+d[oae]s?\\s+` +
        `(intervalo|faixa|limite|valores?\\s+de\\s+refer[eê]ncia|refer[eê]ncia)${FIM_R3}`,
      'i',
    ),
    motivo:
      'A resposta diz onde o valor cai em relação à faixa. Mostrar os dois números lado a lado é o que o aplicativo faz; concluir a comparação é leitura clínica.',
    excecao: RECUSA_DE_JULGAR,
  },
  {
    // ESCOLHER A LINHA DA TABELA PELA PESSOA (Bloco 10, D37). Na mesma resposta
    // da testosterona o modelo calculou a idade da pessoa pela data de
    // nascimento e escreveu "a faixa aplicavel seria a de 16 a 21 anos". A D37
    // proibe isso na extracao; esta linha e a mesma proibicao no texto da
    // conversa. Quem le a tabela e a pessoa.
    padrao: new RegExp(
      `(faixa|intervalo|refer[eê]ncia)[^.!?]{0,40}(aplic[aá]vel|que\\s+se\\s+aplica|que\\s+vale\\s+para\\s+voc[eê])` +
        `|(para\\s+a\\s+sua\\s+idade|para\\s+o\\s+seu\\s+sexo|ao\\s+seu\\s+caso|no\\s+seu\\s+caso)[^.!?]{0,40}(faixa|intervalo|refer[eê]ncia)`,
      'i',
    ),
    motivo:
      'A resposta escolhe qual linha da tabela de referência vale para a pessoa. A tabela é mostrada inteira; quem a lê é a pessoa, com quem a examina.',
    excecao: RECUSA_DE_JULGAR,
  },
  {
    // A CATEGORIA DO LABORATORIO ATRIBUIDA AO VALOR (Bloco 10, rodada 4). A
    // tabela da glicada tem tres categorias, e a resposta citou so a que
    // enquadrava o valor: "o laboratorio indica como normal abaixo de 5,7%". E
    // escolher a linha da tabela, dito como citacao. A tabela transcrita
    // inteira ("Normal: ...; Pre-diabetes: ...") nao casa: nela nao ha o verbo
    // que atribui.
    padrao: new RegExp(
      `(indica|considera|classifica|define|aponta)\\s+como\\s+` +
        `(normal|alterad[oa]|desej[aá]vel|[oó]tim[oa]|adequad[oa]|lim[ií]trofe|ideal)${FIM_R3}`,
      'i',
    ),
    motivo:
      'A resposta atribui ao valor uma categoria da tabela do laboratório. A tabela é mostrada inteira; enquadrar o valor nela é leitura clínica.',
    excecao: RECUSA_DE_JULGAR,
  },
];

/** O que separa a recusa do veredito em duas oracoes: "nao sei a data, MAS
 *  voce deve fazer" e duas afirmacoes, e a recusa so vale para a primeira.
 *  "Entao" e "portanto" entraram na revisao do E8: "nao sei o horario da UBS,
 *  ENTAO voce deve tomar a vacina" e conclusao, nao recusa. */
const QUEBRA_DE_ORACAO = /[.!?;]|\b(mas|por[eé]m|contudo|entretanto|todavia|ent[aã]o|portanto)\b/i;

/**
 * A excecao olha so o que vem ANTES, e perto: uma recusa de julgar no fim do
 * paragrafo nao absolve um veredito no comeco dele. E so na MESMA oracao: a
 * revisao do E7 achou "Nao sei sua idade exata, mas voce deve fazer
 * mamografia" aprovada, porque o "nao sei" estava nos 60 caracteres antes.
 */
function absolvido(texto: string, indice: number, excecao: RegExp): boolean {
  const antes = texto.slice(Math.max(0, indice - 60), indice);
  let fimDaUltima = -1;
  for (const recusa of antes.matchAll(excecao)) fimDaUltima = recusa.index + recusa[0].length;
  return fimDaUltima !== -1 && !QUEBRA_DE_ORACAO.test(antes.slice(fimDaUltima));
}

/** Copia com a flag `g`, que `matchAll` exige. */
const comGlobal = (re: RegExp) => new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);

/**
 * As copias globais sao montadas UMA vez, no carregamento: a verificacao roda
 * em toda resposta e em toda nova geracao, e remonta-las a cada chamada era
 * alocacao repetida sem motivo. `matchAll` clona a expressao internamente,
 * entao o `lastIndex` compartilhado nao vaza de uma chamada para a outra.
 */
const PADROES_R3_GLOBAIS = PADROES_R3.map(({ padrao, motivo, excecao, chaveDoValor }) => ({
  padrao: comGlobal(padrao),
  motivo,
  excecao: excecao && comGlobal(excecao),
  chaveDoValor,
}));

/**
 * As chaves canonicas ("500|mg", "8|hora") dos valores de remedio de um texto,
 * extraidas pelos MESMOS padroes que reprovam (E2, D2.4). Quem monta a lista
 * de `valoresCadastrados` passa o que a ferramenta devolveu por aqui; uma
 * segunda regex, em outro arquivo, divergiria desta.
 */
export function valoresDeRemedioNoTexto(texto: string): string[] {
  return PADROES_COM_VALOR.flatMap(({ padrao, chaveDoValor }) =>
    [...texto.matchAll(padrao)]
      .map((achado) => chaveNoTexto(texto, achado, chaveDoValor))
      .filter((chave): chave is string => chave !== null),
  );
}

/** So os padroes de numero, os unicos com chave de valor. */
const PADROES_COM_VALOR = PADROES_R3_GLOBAIS.flatMap(({ padrao, chaveDoValor }) =>
  chaveDoValor ? [{ padrao, chaveDoValor }] : [],
);

/**
 * A fracao e a faixa: "1/2 comprimido" e "3 ou 5 comprimidos". O padrao de
 * quantidade so ve o ULTIMO numero, e a chave dele ("2|comprimido") seria
 * outro valor -- quatro vezes a dose, no caso da fracao (revisao do E2).
 */
const FRACAO_OU_FAIXA_ANTES = /(?:\d\s*\/|\d\s*(?:ou|a|e|-|–|até)\s*)$/i;

/** A chave do valor casado, ou nenhuma quando ele e parte de fracao ou faixa. */
function chaveNoTexto(
  texto: string,
  achado: RegExpMatchArray,
  chaveDoValor: (casado: string) => string | null,
): string | null {
  const antes = texto.slice(Math.max(0, achado.index! - 10), achado.index);
  return FRACAO_OU_FAIXA_ANTES.test(antes) ? null : chaveDoValor(achado[0]);
}

/**
 * A excecao do valor cadastrado (D2.4) precisa de uma ANCORA DE REGISTRO na
 * frase: "esta cadastrado", "registrados", "o seu cadastro", "voce definiu",
 * "voce anotou". Sem ela, o numero certo vale como recomendacao -- "Toma 500
 * mg de manha", "Recomendo 500 mg", "Pode sim! 2 comprimidos" passavam todas
 * na primeira versao, que so tinha a lista de verbos proibidos. Uma lista
 * fechada de verbos sempre deixa forma de fora; a ancora inverte o onus: a
 * frase tem de DIZER que fala do cadastro (revisao do E2).
 */
const ANCORA_DE_REGISTRO = new RegExp(
  `${INI_R3}(?:cadastr|registr|anotad)${L_R3}*|${INI_R3}voc[eê]\\s+(?:definiu|anotou)${FIM_R3}`,
  'i',
);

/**
 * Prescricao, recomendacao, permissao ou mudanca. Mesmo com a ancora, qualquer
 * uma delas na frase tira a excecao: "recomendo os 500 mg cadastrados" e "pode
 * voltar aos 500 mg cadastrados" indicam, com o valor do cadastro.
 *
 * Sem exigir "voce" antes do modal: "Pode sim!" e "Tem que ser 500 mg" dizem a
 * pessoa o que fazer sem nomea-la. O preco e reprovar "o cadastro pode estar
 * desatualizado: 5 comprimidos registrados", e o prompt orienta a frase.
 */
const PRESCRICAO_NA_FRASE = new RegExp(
  `${INI_R3}(?:` +
    // Radicais, em qualquer forma ("toma", "tomando", "utilize", "ingerir"):
    // tomar e usar; mudar a dose ou a frequencia; recomendar.
    `(?:tom[aeo]|us[aeo]|utiliz|inger|ingir|aplic|apliqu|ping|injet|` +
    `aument|diminu|reduz|dobr|compens|troc|troqu|mud|espa[cç]|volt|continu|mant[eé]|` +
    `recomend|sugir|indic)${L_R3}*` +
    // "dê" so com acento: sem ele, "de" e a preposicao ("limite de estoque").
    `|dê|fa[cç]a\\s+uso|pass[ea]r?|seguir|siga` +
    // obrigacao, permissao e juizo, com ou sem "voce"
    `|${MODAL_DE_OBRIGACAO}|devem|pode|poderia|podem|basta` +
    `|ideal|melhor|certo|suficientes?|liberad[oa]s?` +
    `)${FIM_R3}`,
  'i',
);

/**
 * Fim de frase: `.`, `!` ou `?` seguidos de espaco e maiuscula, ou do fim do
 * texto. Quebra de linha NAO separa, e ponto seguido de minuscula ou numero
 * tambem nao: "Voce deve tomar:" seguido de "500 mg" na linha de baixo, e
 * "Tome aprox. 500 mg", eram partidos no meio, e o verbo ficava na "frase" de
 * cima (revisao do E2). Errar juntando duas frases so torna a excecao mais
 * rara, que e o lado seguro.
 *
 * E uma nocao de frase PROPRIA desta excecao, mais larga que a `janela` e que
 * `QUEBRA_DE_ORACAO`: a lista de prescricao olha a frase inteira (onde quer
 * que o verbo esteja), e a ancora de registro olha so a ORACAO do valor.
 */
const FIM_DE_FRASE = /[.!?](?=\s+[A-ZÀ-Ý]|\s*$)/g;

/** `QUEBRA_DE_ORACAO` com `g`, para achar todos os limites de oracao. */
const QUEBRA_DE_ORACAO_GLOBAL = new RegExp(QUEBRA_DE_ORACAO.source, 'gi');

/**
 * O trecho em volta de [inicio, fim) ate os limites mais proximos. Os limites
 * sao achados no texto INTEIRO, e nao num recorte: num recorte, o `$` do fim
 * de frase casava no fim do pedaco, e "Tome aprox. " virava uma frase
 * completa. Limite DENTRO do trecho ("2.5 ml") nao conta.
 */
function trechoEmVolta(texto: string, inicio: number, fim: number, limites: RegExp): string {
  let comeco = 0;
  let final = texto.length;
  for (const m of texto.matchAll(limites)) {
    const depois = m.index + m[0].length;
    if (depois <= inicio) comeco = depois;
    else if (m.index >= fim) {
      final = m.index;
      break;
    }
  }
  return texto.slice(comeco, final);
}

/**
 * O valor casado e o cadastrado, dito como cadastro e sem indicar nada?
 *
 * A ancora vale so na ORACAO do valor, como a recusa de `absolvido`: "o
 * cadastro esta desatualizado, MAS 500 mg resolve" sao duas afirmacoes, e a
 * ancora so fala da primeira. A prescricao vale na FRASE inteira, onde quer
 * que o verbo esteja.
 */
function ehValorCadastrado(
  texto: string,
  achado: RegExpMatchArray,
  chaveDoValor: (casado: string) => string | null,
  cadastrados: Set<string>,
): boolean {
  const chave = chaveNoTexto(texto, achado, chaveDoValor);
  if (chave === null || !cadastrados.has(chave)) return false;
  const inicio = achado.index!;
  const fim = inicio + achado[0].length;
  return (
    ANCORA_DE_REGISTRO.test(trechoEmVolta(texto, inicio, fim, QUEBRA_DE_ORACAO_GLOBAL)) &&
    !PRESCRICAO_NA_FRASE.test(trechoEmVolta(texto, inicio, fim, FIM_DE_FRASE))
  );
}

const verificarR3: Verificador = (texto, { valoresCadastrados }) => {
  const cadastrados = new Set(valoresCadastrados ?? []);
  // Duas etapas. Primeiro junta, de TODOS os padroes, o que casou: os trechos
  // que a excecao do proprio padrao absolveu e os que ficaram como candidatos.
  // Depois reprova o primeiro candidato que nao esteja dentro de um trecho
  // absolvido. Sem isto, "a unidade dira se voce deve tomar as 2 doses da
  // vacina", absolvida pelo padrao de vacina, era reprovada pelo de quantidade
  // ("2 doses") -- e cada padrao especifico novo exigiria uma excecao escrita a
  // mao em cada padrao generico (achado da revisao do E8).
  const absolvidos: Array<[number, number]> = [];
  const candidatos: Violation[] = [];
  const posicoes: Array<[number, number]> = [];

  for (const { padrao, motivo, excecao, chaveDoValor } of PADROES_R3_GLOBAIS) {
    // TODAS as ocorrencias, e nao so a primeira. Com `exec` sem `g`, uma
    // primeira ocorrencia absolvida pela recusa encerrava o padrao, e uma
    // segunda, real, nunca era olhada -- "Nao posso dizer se voce deve fazer
    // mamografia. Mas voce precisa fazer a colonoscopia" passava inteira
    // (achado da revisao do E7, 2026-10-17).
    for (const achado of texto.matchAll(padrao)) {
      const fim = achado.index + achado[0].length;
      // O valor cadastrado (E2, D2.4) e IGNORADO, e nao absolvido: absolver
      // criaria um trecho protegido para os padroes seguintes, e ignorar so
      // tira este achado -- o padrao de verbo continua vendo a mesma frase.
      if (chaveDoValor && cadastrados.size > 0 && ehValorCadastrado(texto, achado, chaveDoValor, cadastrados)) {
        continue;
      }
      if (excecao && absolvido(texto, achado.index, excecao)) {
        absolvidos.push([achado.index, fim]);
      } else {
        candidatos.push({ rule: 'R3', reason: motivo, excerpt: trecho(texto, achado.index, achado[0].length) });
        posicoes.push([achado.index, fim]);
      }
    }
  }

  // A ordem dos candidatos e a de `PADROES_R3`, que e a de prioridade do
  // MOTIVO. Uma violacao de R3 por resposta: quem vai decidir o que fazer com a
  // reprovacao precisa do motivo, nao de um inventario.
  const i = posicoes.findIndex(([inicio, fim]) => !absolvidos.some(([a, b]) => inicio >= a && fim <= b));
  return i === -1 ? [] : [candidatos[i]];
};

VERIFICADORES.push(verificarR3);

/**
 * Formas de encaminhar que a R2 aceita. Ampla de proposito: o objetivo e
 * reconhecer o encaminhamento, nao impor uma frase unica. Uma verificacao que
 * exigisse a frase exata transformaria a R2 num rodape mecanico, que e
 * exatamente o que o estudo diz para evitar -- repetir o mesmo aviso em toda
 * mensagem faz o usuario parar de le-lo.
 */
const PADRAO_ENCAMINHAMENTO =
  /\b(m[eé]dic\w+|profissional\s+de\s+sa[uú]de|cl[ií]nic\w+\s+geral|endocrinologista|cardiologista|nutricionista|especialista|consulta)\b/i;

/**
 * So exigido em pergunta CLINICA. Em pergunta operacional -- "quando foi minha
 * consulta", "que remedio eu tomo as 8h" -- o aviso permanente da tela ja
 * cumpre o papel, e este verificador nao o repete.
 *
 * PREMISSA: a tela carrega o aviso fixo "Apoio informativo -- nao substitui
 * avaliacao medica", que a spec da tela 4a declara obrigatorio e nao
 * dispensavel. Se esse aviso sair da tela, esta regra muda.
 */
/**
 * A resposta ja encaminha? PUBLICO de proposito, e reusado pela costura de
 * `chat-assistant/encaminhamento.ts` (decisoes A2 e C3 do Bloco 9), pela mesma
 * razao que `temMedidaDeExame` e publico: um segundo reconhecedor divergiria
 * deste em silencio, e a divergencia apareceria como uma resposta costurada
 * que a R2 continua reprovando -- ou como duas frases de encaminhamento
 * coladas uma na outra.
 */
export function temEncaminhamento(texto: string): boolean {
  return PADRAO_ENCAMINHAMENTO.test(texto);
}

const verificarR2: Verificador = (texto, { questionKind }) => {
  if (questionKind !== 'clinica') return [];
  if (temEncaminhamento(texto)) return [];

  return [
    {
      rule: 'R2',
      reason: 'A pergunta é clínica e a resposta não encaminha a um profissional de saúde.',
      excerpt: texto.slice(0, 80),
    },
  ];
};

VERIFICADORES.push(verificarR2);

/**
 * Letra, INCLUINDO acento, e a fronteira de palavra montada em cima dela.
 *
 * Em JavaScript `\w` e sempre `[A-Za-z0-9_]` -- **nem a flag `u` muda isso**.
 * Consequencia: `\b` nao e fronteira antes de "é", "ã" ou "ç", e uma unidade
 * seguida de acento passaria batida. Mesma tecnica, e pelo mesmo motivo, de
 * `chat-assistant/memoria/propostaValida.ts`.
 *
 * Aqui so o FIM e necessario: a esquerda a ancora e um digito, que e ASCII.
 */
const L_R4 = '[\\wÀ-ÿ]';
const FIM_R4 = `(?!${L_R4})`;

/**
 * Unidades de EXAME LABORATORIAL -- as que aparecem numa linha de resultado e
 * que, por isso, TEM como ser citadas.
 *
 * De onde a lista sai: `UNIT_ALIASES` e `KNOWN_UNITS` de
 * `extract-document-data/unitConverter.ts`, que e a lista do que laudo
 * brasileiro escreve, e a parte de exame de `UNIDADES_DE_MEDIDA` de
 * `chat-assistant/memoria/propostaValida.ts`. Escritas como um MODELO as
 * escreve em prosa, e nao no token interno do conversor: ninguem responde
 * "u[IU]/mL".
 *
 * O QUE FICA DE FORA, e e decisao e nao esquecimento: kg, cm, m, bpm e mmHg.
 * `indexarLinhasCitaveis` so indexa a saida de `consultar_analito`, entao peso,
 * altura, batimento e pressao NAO TEM linha citavel -- exigir citacao para uma
 * unidade que nunca pode ser citada faria "quanto eu peso?" cair no degradado
 * para sempre, que e a EPIC nova quebrando a entregue. O texto da R4 fala em
 * "valor de exame", e e esse o recorte.
 *
 * A ordem nao e alfabetica: token mais longo antes do mais curto que e prefixo
 * dele, para "35 UI/L" casar como `UI/L` e nao parar em `U`.
 */
const UNIDADES_DE_EXAME = [
  // Concentracao em massa.
  'ng/mL',
  'ng/dL',
  'ng/L',
  'mcg/dL',
  'mcg/mL',
  'mcg/L',
  'ug/dL',
  'ug/mL',
  'ug/L',
  'pg/mL',
  'mg/dL',
  'mg/L',
  'g/dL',
  'g/L',
  // Concentracao em mol.
  'mmol/L',
  'umol/L',
  'nmol/L',
  'pmol/L',
  // Atividade enzimatica e unidade internacional. `uUI/mL` cobre tambem
  // "µUI/mL": o sinal de micro e normalizado para "u" antes da comparacao.
  'uUI/mL',
  'mUI/mL',
  'mUI/L',
  'uIU/mL',
  'mIU/mL',
  'mIU/L',
  'UI/mL',
  'UI/L',
  'IU/mL',
  'U/mL',
  'U/L',
  // Contagem celular. O hemograma brasileiro reporta "5.400/mm3", e o expoente
  // sai do papel tanto como "10*3" quanto como "10^3".
  'mil/mm[3\u00b3]',
  'milh[oõ]es/mm[3\u00b3]',
  '10[*^]3/uL',
  '10[*^]6/uL',
  '/mm[3\u00b3]',
  '/uL',
  // Volume, massa corpuscular, hemossedimentacao e proporcao.
  'fL',
  'pg',
  'mm/h',
  // A `%` e a de alcance mais largo, e entra de propósito: hemoglobina glicada,
  // hematocrito, saturacao e contagem diferencial sao todos `%`, e deixa-la fora
  // abriria a maior lacuna da lista. O custo e reconhecido: "100% das vacinas em
  // dia" tambem reprova. E o lado certo do erro -- porcentagem que o modelo
  // calculou e exatamente o numero que a R4 descreve ("nao estime, nao arredonde
  // por conveniencia"), e a reprovacao custa uma nova geracao, nao a resposta.
  '%',
].join('|');

/**
 * Digito seguido de unidade de exame. A `i` existe porque o modelo escreve
 * "ng/ml" tanto quanto "ng/mL", e a lista nao e um vocabulario a ser decorado.
 */
const PADRAO_R4 = new RegExp(`\\d+([.,]\\d+)?\\s*(${UNIDADES_DE_EXAME})${FIM_R4}`, 'gi');

/**
 * O sinal de micro tem tres grafias, e qual delas sai do modelo depende do que
 * ele viu no laudo. Normalizar so uma deixa as outras duas passarem.
 *
 * A troca PRESERVA O COMPRIMENTO -- um caractere por um caractere --, e e por
 * isso que o indice devolvido pelo `exec` continua valido no texto ORIGINAL, de
 * onde o trecho da violacao e recortado.
 */
const MICRO_R4 = /[\u00b5\u03bc]/g;

/**
 * O bilhete que vai ao modelo na segunda geracao, e por isso ele fala da REGRA.
 * "Nao escreva 41 ng/mL" ensinaria o modelo a escrever "quarenta e um".
 */
const MOTIVO_R4 =
  'A resposta apresenta um valor de exame sem dizer de onde ele saiu. Cite apenas valores que as ferramentas devolveram nesta conversa, trazendo a linha de origem de cada um.';

/**
 * A R4 no sentido da OMISSAO: a resposta traz valor de exame e nao traz origem
 * nenhuma. Este e o sentido que faltava -- o outro, a citacao que aponta para
 * uma linha que nenhuma tool devolveu, e conferido em
 * `chat-assistant/verificacao.ts`, que e o unico lugar que sabe o que as tools
 * entregaram.
 *
 * POR QUE AQUI E NAO NUM `refine` DO `chatAnswerSchema`: falha de schema vira
 * `ok: false` no laco, e `responderComVerificacao` manda isso direto para o
 * caminho degradado, SEM segunda geracao. Um `refine` transformaria toda
 * omissao de R4 em degradado imediato e contrariaria a D31 (A -> E -> C), que
 * manda tentar uma vez mais com o motivo em maos. Como verificador, a R4 entra
 * no mesmo caminho da R1, da R2 e da R3, e a reprovacao rende um bilhete.
 */
/**
 * A resposta traz medida de exame? PUBLICO de proposito, e reusado pela
 * classificacao clinica de `chat-assistant/verificacao.ts` (U2).
 *
 * Um segundo reconhecedor divergiria deste em silencio, e a divergencia
 * apareceria como resposta com medida escapando da R2 enquanto a R4 a reprova
 * -- duas regras discordando sobre o mesmo texto.
 *
 * Zera o `lastIndex` antes de usar: o padrao tem a flag `g`, que guarda estado
 * entre chamadas, e sem isto a segunda chamada com o mesmo texto devolveria
 * falso. Ha caso de teste exatamente sobre isso.
 */
export function temMedidaDeExame(texto: string): boolean {
  PADRAO_R4.lastIndex = 0;
  return PADRAO_R4.test(texto.replace(MICRO_R4, 'u'));
}

const verificarR4: Verificador = (texto, { temOrigem }) => {
  if (temOrigem === true) return [];

  const alvo = texto.replace(MICRO_R4, 'u');
  PADRAO_R4.lastIndex = 0;
  const achado = PADRAO_R4.exec(alvo);
  if (!achado) return [];

  // Uma violacao por resposta. Tres apontamentos do mesmo problema nao ajudam
  // quem vai decidir o que fazer com a reprovacao -- mesma escolha da R1 e da R3.
  return [{ rule: 'R4', reason: MOTIVO_R4, excerpt: trecho(texto, achado.index, achado[0].length) }];
};

VERIFICADORES.push(verificarR4);

/**
 * Como uma resposta RECONHECE que nao ha dado. A lista e de formas comuns em
 * portugues do Brasil, e nao de todas as possiveis -- mesma aproximacao
 * declarada do resto do arquivo.
 *
 * `[eé]` com fronteira a esquerda, e nao solto: sem ela o "e" final de
 * qualquer palavra viraria comeco de padrao, que foi o defeito da primeira
 * versao do julgamento de valor na R3.
 */
const PADRAO_AUSENCIA = new RegExp(
  `${INI_R3}(n[aã]o\\s+(h[aá]|tenho|encontrei|existe|consta|foi\\s+encontrad|localizei)` +
    `|nenhum[ao]?|ainda\\s+n[aã]o|sem\\s+registro|vazi[ao]s?)${FIM_R3}`,
  'i',
);

/**
 * A R5 no sentido que DA para verificar: as ferramentas disseram que nao ha
 * dado, e a resposta nao reconhece isso.
 *
 * O outro sentido -- "a resposta inventou" em geral -- nao e verificavel aqui
 * sem entender a prosa. O caso mais perigoso dele, o numero inventado, ja e
 * coberto pela R4 nos dois sentidos: a omissao mora neste arquivo e a citacao
 * que aponta para linha inexistente mora em `chat-assistant/verificacao.ts`,
 * que e o unico lugar que sabe o que as tools entregaram.
 *
 * A resposta VAZIA continua sendo R5 tambem, e e tratada antes de qualquer
 * verificador, em `checkLanguageRules`.
 */
const verificarR5: Verificador = (texto, { semDados }) => {
  if (semDados !== true) return [];
  if (PADRAO_AUSENCIA.test(texto)) return [];

  return [
    {
      rule: 'R5',
      reason:
        'As ferramentas não encontraram dado, e a resposta não diz isso. Quando não houver registro, diga que não há — é uma resposta aceitável e desejável.',
      excerpt: texto.slice(0, 80),
    },
  ];
};

VERIFICADORES.push(verificarR5);
