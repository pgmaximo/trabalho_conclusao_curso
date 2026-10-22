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
import { DRUG_ALIASES } from '../drug-interactions-shared/aliases';
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
  /**
   * O turno CRUZOU dominios de saude: usou a comparacao, ou o wearable junto
   * com valor de exame (E10, D10.6). Nele, cada dado vai na sua propria frase
   * ("uma frase, um dominio").
   *
   * Vem de quem chama, como os de cima: so ele sabe que ferramentas o turno
   * usou. AUSENTE significa que a regra nao vale -- como `semDados`, e uma
   * PRECONDICAO, e nao uma desculpa: fora desses turnos, juntar dominios ("2
   * remedios e 1 exame") nao compara nada.
   */
  cruzaDominios?: boolean;
  /**
   * O modelo propos uma acao neste turno (E11): nada foi salvo, e nenhuma
   * frase de cadastro concluido e verdade -- nem na voz passiva ("Consulta
   * marcada!"). Vem de quem chama, como os de cima. AUSENTE significa que a
   * guarda da passiva nao vale: fora desses turnos, "sua consulta esta
   * marcada para sexta" e o dado honesto de `consultar_consultas`.
   */
  comAcaoProposta?: boolean;
  /**
   * O texto do modelo nao pode dizer que o formulario esta pronto (A5): quem
   * diz isso e o aplicativo, com a frase dele, e so quando o cartao sai. Vem de
   * quem chama porque so ele separa a frase do aplicativo da do modelo.
   * AUSENTE significa que a checagem nao vale -- a frase do aplicativo passa
   * por estas regras sozinha, e precisa passar.
   */
  vetarFormulario?: boolean;
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

/** Nomes de tipo e campo que a saida estruturada devolve no lugar do texto. */
const MARCADORES_DO_SCHEMA = new Set(['string', 'texto', 'null', 'undefined']);

/**
 * Resposta que parece texto e nao diz nada (A4 da conferencia no sandbox,
 * 2026-10-20): o marcador do schema ("string"), o do exemplo do prompt
 * ("..."), ou a abertura que anuncia o que nunca veio -- a segunda geracao
 * "consertava" uma reprovacao apagando tudo depois de "Aqui esta o que o
 * aplicativo registrou:". As tres foram aprovadas e mostradas como resposta.
 */
function semConteudo(texto: string): boolean {
  const aparado = texto.trim();
  const nucleo = aparado.replace(/["'“”]/g, '').trim().toLowerCase();
  return !/[\p{L}\p{N}]/u.test(nucleo) || MARCADORES_DO_SCHEMA.has(nucleo) || aparado.endsWith(':');
}

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
  if (semConteudo(text)) {
    return {
      ok: false,
      violations: [
        {
          rule: 'R5',
          reason: 'A resposta veio sem conteúdo, ou anuncia algo que não está nela. Escreva a resposta inteira no campo "texto".',
          excerpt: text.slice(-80),
        },
      ],
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
  // A observacao que a PESSOA escreveu (E5): "voce tem uma anotacao para ele" (A9).
  'anota[cç](?:[aã]o|[oõ]es)|' +
  // Dose e reforco da CARTEIRA (E8): "voce tem uma dose prevista para 10/11"
  // e o calendario do aplicativo, e era reprovada como diagnostico.
  'doses?|refor[cç]os?|' +
  // Remedio e estoque do CADASTRO (E2): "voce tem 3 medicamentos cadastrados"
  // e "voce tem 5 comprimidos registrados" respondem "quais remedios eu tomo"
  // e "esta acabando", e eram reprovadas como diagnostico. A QUANTIDADE ("5
  // comprimidos") continua com o padrao de numero, e so passa pela D2.4.
  // "gotas" NAO entra: "voce tem gota" e a doenca (revisao do E2).
  'medicamentos?|rem[eé]dios?|comprimidos?|c[aá]psulas?|ampolas?|' +
  // Horario das DOSES TOMADAS (E3, D3.4): "voce tem 3 horarios sem marcacao
  // nesta semana" responde "esqueci alguma?", e era reprovada como diagnostico.
  // So com a marcacao junto: "horarios" sozinho eximiria "voce tem horarios
  // irregulares de sono", que e juizo sobre a saude (revisao do E3).
  'hor[aá]rios?\\s+(?:sem\\s+marca[cç][aã]o|marcad[oa]s?)';

/**
 * O que pode vir entre "voce tem" e o inventario sem mudar o sentido (Bloco 11):
 * "voce tem APENAS um laudo guardado". Sem isto a frase era reprovada como
 * diagnostico -- medido: tres respostas a mesma pergunta, as tres barradas nas
 * duas geracoes. O adverbio so exime quando o que vem depois E inventario;
 * "voce tem apenas diabetes" continua reprovado.
 */
const ADVERBIOS_DO_INVENTARIO = 'apenas|s[oó]|somente|ainda|j[aá]';

/** A contagem do inventario: "voce tem 2 receitas" e "voce tem DUAS receitas"
 *  (A9 da conferencia no sandbox: so o algarismo era aceito). */
const CONTAGEM_DO_INVENTARIO = '\\d+|dois|duas|tr[eê]s|quatro|cinco|seis|sete|oito|nove|dez';

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
// "nao tenho como" entrou com a E9 H10 da conferencia no sandbox (DS9): "Nao
// tenho como dizer que e seguro" era reprovado como garantia de seguranca.
const RECUSA_DE_JULGAR = /n[aã]o\s+(posso|cabe|consigo|sei|consegue|tenho\s+como|[eé]\s+poss[ií]vel|d[aá]\s+para)/i;

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
/** A oracao condicional logo antes do achado: "se voce deve...", "se voce nao
 *  tomou, ...". Uma fonte so para as excecoes que a usam (E3). */
const CONDICAO_SE = '(?:^|[^\\wÀ-ÿ])se\\s+$';

const RECUSA_PERGUNTA_OU_CONDICAO = new RegExp(
  `${RECUSA_OU_PERGUNTA.source}|(?:decid\\w*|inform\\w*|dir[aá]|diz\\w*)\\s+(?:\\S+\\s+){0,3}?se\\b|${CONDICAO_SE}`,
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
    `|n[aã]o\\s+(?:quer\\s+dizer|significa|garante)(?:\\s+necessariamente)?\\s+que\\s+(?:\\S+\\s+){0,2}$` +
    // A recusa com "que" logo antes da garantia (E9 H10, DS9): "nao tenho como
    // dizer que e seguro". So colada: "nao sei de nada, e seguro" nao absolve.
    `|(?:${RECUSA_DE_JULGAR.source})\\s+(?:dizer|afirmar|garantir)\\s+que\\s+$`,
  'i',
);

/**
 * O que se toma, ou o horario em que se toma (E3). "Tomada" entra porque "a
 * tomada esquecida" e a mesma dose dita de outro jeito.
 */
const OBJETO_DA_TOMADA =
  'doses?|rem[eé]dios?|medicament\\w*|comprimid\\w*|c[aá]psul\\w*|hor[aá]rios?|tomadas?';

/**
 * A AGENDA e o que nao e dose, numa lista so para os tres padroes de adesao
 * (E3): "voce pode mudar o horario da CONSULTA", "voce perdeu o horario do
 * EXAME", "voce esta atrasado para o RETORNO". A primeira versao tinha tres
 * listas, e elas ja divergiam (/simplify do E3).
 */
const AGENDA_OU_PREVENCAO = 'consulta|retorno|agendamento|agenda|compromisso|lembrete|exame|vacina|refor|preven';

/** Ate onde, adiante, os padroes de adesao procuram a agenda na frase. */
const PERTO = 60;

/**
 * O que, na frase, diz que a mudanca de horario e do APLICATIVO ou da AGENDA, e
 * nao do tratamento: "voce pode mudar o horario da consulta na tela de Agenda",
 * "edite o remedio na tela". A primeira versao reprovava essas, inclusive a que
 * o prompt manda dizer (revisao do E3).
 */
const FORA_DO_HORARIO = `${FORA_DO_REMEDIO}|${AGENDA_OU_PREVENCAO}|edit`;

/** "a dose", "as tomadas" -- o objeto dos verbos de repor, ignorar e "faltou". */
const A_DOSE = `\\s+(?:(?:${DETERMINANTE})\\s+){0,2}(?:doses?|tomadas?)${FIM_R3}`;

/**
 * QUANDO, na frase: o dia ou o horario. E o que faz de "voce esqueceu a
 * losartana NA SEGUNDA" uma afirmacao sobre uma dose -- sem ele, "voce perdeu
 * peso no ultimo mes", do wearable, era lida assim (/simplify do E3).
 */
const QUANDO_DA_DOSE =
  `(?=[^.!?]{0,40}(?:${INI_R3}(?:segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|ontem|hoje|manh[aã]|tarde|noite)${FIM_R3}` +
  `|\\d+\\s*h${FIM_R3}|${INI_R3}d[aeo]s?\\s+\\d))`;

/**
 * A excecao do padrao da dose esquecida: a da vacina e do exame, mais as duas
 * formas de devolver a decisao que o proprio prompt pede -- "SOBRE compensar a
 * dose esquecida, quem orienta e o medico" e "quem ORIENTA SE voce pode pular a
 * dose e o medico" (revisao do E3).
 */
const DEVOLVE_A_DOSE_ESQUECIDA = new RegExp(
  `${RECUSA_PERGUNTA_OU_CONDICAO.source}|orient\\w*\\s+(?:\\S+\\s+){0,3}?se\\b|(?:^|[^\\wÀ-ÿ])(?:sobre|quanto\\s+a)\\s+(?:\\S+\\s+)?$`,
  'i',
);

/** A excecao do "nao tomou": a frase que diz que sem marcacao nao e falta de
 *  dose, e a condicao ("se voce nao tomou, ..."). */
const NAO_AFIRMA_QUE_NAO_TOMOU = new RegExp(`${DEVOLVE_A_DECISAO.source}|${CONDICAO_SE}`, 'i');

/**
 * O verbo de tomar e usar dentro do ENCAMINHAMENTO (A9 da conferencia no
 * sandbox): "o medico orienta sobre como usar cada remedio" e "nao consigo
 * orientar sobre dose ou como tomar um remedio" sao a devolucao que o prompt
 * pede, e eram reprovadas como prescricao. So o "como" depois de orientar:
 * "tome", "use 2 comprimidos" e "voce deve tomar" continuam reprovados.
 */
const ORIENTA_COMO_USAR = /orient\w*\s+(?:\S+\s+){0,3}?como\s+$/i;

/**
 * A excecao do padrao de tomar e usar: o "como" do encaminhamento e a mesma
 * recusa, pergunta, condicao e "sobre" que os outros padroes da R3 aceitam --
 * "nao consigo orientar sobre tomar mais de uma dose" (DS5, segunda rodada).
 * Vale so ANTES do verbo e na mesma oracao: "nao consigo ver seu historico,
 * entao tome 2 comprimidos" continua reprovado.
 */
const DEVOLVE_O_USO = new RegExp(`${ORIENTA_COMO_USAR.source}|${DEVOLVE_A_DOSE_ESQUECIDA.source}`, 'i');

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
    // A DOSE ESQUECIDA E O HORARIO (E3, D3.4). Medido em 2026-10-19: "voce pode
    // compensar a dose esquecida no proximo horario", "nao dobre a dose" e "mude
    // o horario para as 9h" passavam pelas cinco regras. Compensar ou dobrar
    // dose por conta propria e dano direto, e o que fazer com um horario
    // esquecido e de quem prescreve ou do farmaceutico.
    //
    // As formas, pela revisao do E3 (que provou que pegar so o vocabulario do
    // teste deixava passar quase tudo):
    // 1. compensar, dobrar, duplicar -- no imperativo, sozinhos ("Compense
    //    amanha", "Dobre a proxima"); em outra forma, com a dose ou o horario;
    // 2. pular a dose; ignorar ou deixar de lado a dose; esperar o proximo
    //    horario; repor a DOSE ("repor o remedio" e estoque, e passa);
    // 3. tomar "as duas", "a esquecida", "a que voce esqueceu", "a das 8h",
    //    "agora", "em dobro", "mais cedo";
    // 4. mudar o horario -- so no imperativo ou dito como o que a pessoa pode
    //    ou deve fazer, e nunca com tela, agenda, lembrete ou "editar" na frase:
    //    "para mudar o horario, edite o remedio na tela" e "voce alterou o
    //    horario" passam.
    // A excecao devolve a decisao: "pergunte ao medico se pode compensar",
    // "sobre compensar a dose esquecida, quem orienta e o medico".
    //
    // Vem ANTES do padrao de verbo de medicacao, de proposito: "tome as duas
    // doses" ja era reprovada por ele, mas o bilhete da nova geracao precisa
    // dizer o que corrigir.
    padrao: new RegExp(
      `${INI_R3}(?:compense|compensem|dobre|dobrem|duplique|dupliquem|pule|pulem)${FIM_R3}` +
        // "Pular" so no infinitivo (o imperativo ja e o ramo de cima): "voce
        // PULOU o horario" e afirmacao, e fica com o padrao de "nao tomou".
        `|${INI_R3}(?:(?:compens|dobr|duplic)${L_R3}*|pular${FIM_R3})${janela(30, FORA_DO_REMEDIO)}${INI_R3}(?:${OBJETO_DA_TOMADA})${FIM_R3}` +
        `|${INI_R3}(?:ignore|deixe|reponha|reponham|repor)${FIM_R3}${A_DOSE}` +
        `|${INI_R3}espere\\s+(?:o|a)\\s+pr[oó]xim[oa]${FIM_R3}` +
        `|${INI_R3}(?:tome|tomar|tomem)${FIM_R3}(?:` +
        `\\s+(?:(?:${DETERMINANTE})\\s+){0,2}(?:(?:doses?|rem[eé]dios?|comprimidos?)\\s+)?` +
        // "Duas" e a dose dobrada; "tomar os dois JUNTOS" e combinacao de
        // remedios, e fica com o padrao de interacao (E9), que diz o motivo certo.
        `(?:duas${FIM_R3}(?!\\s+(?:juntas?|ao\\s+mesmo\\s+tempo))|esquecid${L_R3}*|perdid${L_R3}*` +
        `|que\\s+(?:voc[eê]\\s+)?(?:esqueceu|faltou|perdeu)${FIM_R3})` +
        `|\\s+(?:a|o)\\s+d[aeo]s?\\s+\\d` +
        `|\\s+(?:agora|j[aá]|assim\\s+que)${FIM_R3}` +
        `|[^.!?]{0,20}?${INI_R3}(?:em\\s+dobro|dobrad[oa]s?|mais\\s+cedo|mais\\s+tarde)${FIM_R3})` +
        `|(?:${INI_R3}(?:mude|mudem|adiante|atrase|altere|antecipe|passe|mova|ajuste|coloque)` +
        `|${INI_R3}(?:pode|poderia|deve|deveria|precisa|tente|melhor)\\s+(?:mudar|adiantar|atrasar|alterar|antecipar|passar|mover|ajustar))${FIM_R3}` +
        `${janela(30, FORA_DO_HORARIO)}${INI_R3}(?:hor[aá]rios?|doses?|rem[eé]dios?|a\\s+tomar|para\\s+(?:as|[àa]s?)\\s+\\d|[àa]s\\s+\\d)` +
        `(?![^.!?]{0,${PERTO}}(?:${FORA_DO_HORARIO}))`,
      'i',
    ),
    motivo:
      'A resposta orienta o que fazer com uma dose esquecida ou com o horário do remédio. Isso é de quem prescreve ou do farmacêutico.',
    excecao: DEVOLVE_A_DOSE_ESQUECIDA,
  },
  {
    // JUIZO SOBRE A ADESAO (E3, D3.4). "Voce esta tomando direitinho", "sua
    // adesao esta boa" e "voce esta em dia com o remedio" passavam. O aplicativo
    // sabe o que foi MARCADO; se o tratamento vai bem e avaliacao de quem
    // acompanha a pessoa -- e o elogio ensina que marcar e o mesmo que tomar.
    //
    // O "em dia" daqui fala da PESSOA ("voce esta em dia"), e nao vale com
    // agenda, exame ou vacina na frase: "voce esta atrasado para a consulta" e
    // agenda, e o "em dia" de exame e vacina tem padrao proprio (E7) ou e o
    // calendario da carteira (E8).
    //
    // O adverbio fica COLADO ao verbo (no maximo duas palavras, sem virgula):
    // "tomando o remedio direitinho" casa; "se nao tiver certeza de que tomou,
    // tudo bem" e "voce marcou como tomado, certo" nao. "Errado" e "certo" nao
    // entram: "se voce tomou o remedio errado, ligue para o CIATox" e
    // orientacao de seguranca (revisao do E3). Entram "indo bem com", "tudo
    // certo com os remedios", "parabens" falando de remedio e "sendo regular".
    padrao: new RegExp(
      `${INI_R3}(?:tomando|tomado|tomou|seguindo)${FIM_R3}(?:\\s+[^\\s,.!?;:]+){0,2}?\\s+` +
        `(?:direit${L_R3}*|certinh${L_R3}*|corretamente|bem)${FIM_R3}` +
        `|${INI_R3}ades[aã]o${FIM_R3}${janela(30, FORA_DO_REMEDIO)}` +
        `${INI_R3}(?:boa|[oó]tima|ruim|regular|baixa|alta|adequada|excelente|perfeita|satisfat[oó]ria)${FIM_R3}` +
        `|${INI_R3}voc[eê]\\s+(?:est[aá]|ficou|anda)\\s+(?:em\\s+dia|em\\s+atraso|atrasad[oa])${FIM_R3}` +
        `(?![^.!?]{0,${PERTO}}(?:${AGENDA_OU_PREVENCAO}))` +
        `|${INI_R3}indo\\s+bem\\s+com${FIM_R3}` +
        `|${INI_R3}tudo\\s+certo\\s+com\\s+(?:(?:${DETERMINANTE})\\s+){0,2}(?:rem[eé]dios?|medica${L_R3}*|tratament${L_R3}*|doses?|hor[aá]rios?)${FIM_R3}` +
        `|${INI_R3}parab[eé]ns${FIM_R3}(?=[^.!?]{0,${PERTO}}(?:rem[eé]di|medica|tratament|dose|hor[aá]rio|marca|tom))` +
        `|${INI_R3}sendo\\s+(?:regular|disciplinad[oa]|pontual)${FIM_R3}`,
      'i',
    ),
    motivo:
      'A resposta julga se a pessoa está tomando o remédio direito. O aplicativo mostra o que foi marcado; avaliar o tratamento é de quem acompanha a pessoa.',
    excecao: RECUSA_OU_PERGUNTA,
  },
  {
    // AFIRMAR QUE A PESSOA NAO TOMOU (E3, D3.4). "Voce esqueceu a dose de
    // segunda" passava. Sem marcacao no aplicativo nao e falta de dose: a pessoa
    // pode ter tomado e nao marcado (PRD 3.2). A excecao e a frase que diz
    // exatamente isso: "nao quer dizer que voce nao tomou o remedio", e a
    // condicao ("se voce nao tomou, ...").
    //
    // "Nao tomou" e "deixou de tomar" bastam sozinhos. "Esqueceu", "pulou" e
    // "perdeu" valem com a dose ou o horario ("esqueceu a dose", "pulou o
    // horario das 8h") ou com um nome qualquer -- o do remedio, que e o que a
    // ferramenta devolve -- quando a frase diz QUANDO ("esqueceu a losartana na
    // segunda"). Com agenda perto, nao valem: "voce perdeu o horario da
    // consulta" passa. "Esqueceu DE marcar" nao e objeto, e passa
    // (revisao e /simplify do E3).
    padrao: new RegExp(
      `${INI_R3}voc[eê]\\s+(?:n[aã]o\\s+tomou|deixou\\s+de\\s+tomar)${FIM_R3}` +
        `|${INI_R3}voc[eê]\\s+(?:esqueceu|pulou|perdeu)(?:\\s+de\\s+tomar)?${FIM_R3}` +
        `(?![^.!?]{0,${PERTO}}(?:${AGENDA_OU_PREVENCAO}))\\s+(?:(?:${DETERMINANTE}|\\d+)\\s+){0,2}` +
        `(?:(?:${OBJETO_DA_TOMADA})${FIM_R3}|(?!de${FIM_R3})${L_R3}+${FIM_R3}${QUANDO_DA_DOSE})` +
        `|${INI_R3}faltou${A_DOSE}`,
      'i',
    ),
    motivo:
      'A resposta afirma que a pessoa não tomou o remédio. Sem marcação no aplicativo não quer dizer que ela não tomou.',
    excecao: NAO_AFIRMA_QUE_NAO_TOMOU,
  },
  {
    // Verbos de prescricao seguidos do que esta sendo prescrito. O imperativo
    // e o infinitivo entram os dois -- "aumente a dose" e "deveria aumentar a
    // dose" dizem a mesma coisa a quem le.
    padrao:
      /\b(tome|tomar|use|usar|ingira|ingerir|aumente|aumentar|diminua|diminuir|reduza|reduzir)\b[^.!?]{0,60}\b(medicament\w+|remedi\w+|remédi\w+|comprimid\w+|capsul\w+|cápsul\w+|doses?)\b/i,
    motivo: MOTIVO_DE_MUDANCA,
    excecao: DEVOLVE_O_USO,
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
        `(?!\\s+(?:(?:${ADVERBIOS_DO_INVENTARIO})\\s+)?(?:(?:${CONTAGEM_DO_INVENTARIO})\\s+)?(?:um|uma|uns|umas|o|a|os|as)?\\s*(?:${COISAS_DO_APLICATIVO})\\b` +
        // "os laudos que voce tem guardados" -- o objeto veio ANTES do verbo.
        `|\\s+(?:${PARTICIPIOS_DO_INVENTARIO})${FIM_R3}` +
        // "os remedios que voce tem em uso" -- o cadastro (E9 H11, DS10.1).
        `|\\s+em\\s+uso${FIM_R3}` +
        // A idade do perfil (E7 #2, DS9): "como voce tem 54 anos, esse grupo
        // inclui...". Com "e" logo depois, nao: "voce tem 54 anos e diabetes".
        `|\\s+\\d{1,3}\\s+anos${FIM_R3}(?!\\s+e\\s))` +
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
    //
    // O "e" SEM acento so e verbo quando o adjetivo fecha a oracao: com palavra
    // depois, e a conjuncao antes de adjetivo atributivo -- "risco aumentado e
    // baixo risco de efeitos adversos", texto da USPSTF (E7 #1, DS10.2).
    //
    // O ESTOQUE do aplicativo nao e resultado: "o estoque registrado de
    // Metformina esta baixo" e o aviso que o proprio app da (E2 #7, DS13.1).
    // "Estoque de ferro" e exame, e continua julgado.
    padrao: new RegExp(
      `(?<!${INI_R3}estoque(?:\\s+(?:registrado|atual|cadastrado))?(?:\\s+d[aoe]s?\\s+(?!ferro|ferritina)${L_R3}+)?\\s+)` +
        `${INI_R3}(?!e\\s+(?:um\\s+pouco\\s+)?(?:${JULGAMENTO_DE_VALOR})\\s+(?!(?:e|mas|por[eé]m|ent[aã]o|portanto)${FIM_R3})${L_R3})` +
        `(${VERBO_DE_ESTADO})\\s+(um\\s+pouco\\s+)?(${JULGAMENTO_DE_VALOR})${FIM_R3}`,
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
  // "aplicada" e o registro da CARTEIRA ("ha 2 doses aplicadas", DS5); "em uso"
  // e o do cadastro de remedios ("que voce tem em uso: Marevan 5mg", DS10.1).
  `${INI_R3}(?:cadastr|registr|anotad|aplicad)${L_R3}*|${INI_R3}voc[eê]\\s+(?:definiu|anotou)${FIM_R3}|${INI_R3}em\\s+uso${FIM_R3}`,
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
/**
 * O que, na frase do valor cadastrado, parece verbo de prescricao e nao e (A9
 * da conferencia no sandbox): o participio que descreve o cadastro ("1 gota,
 * tomada todos os dias") e o aplicativo, como palavra e como sujeito ("no
 * aplicativo", "o aplicativo ja esta sinalizando"). "Aplicativo" casava com o
 * radical de "aplicar", e todo valor dito "no aplicativo" perdia a D2.4.
 * "Deve ser tomada", "aplique" e "eu indico" continuam prescricao.
 */
const NEUTRO_NA_FRASE = new RegExp(
  `(?<!ser\\s)${INI_R3}(?:tomad|aplicad)[oa]s?${FIM_R3}` +
    `|${INI_R3}aplicativos?(?:\\s+(?:j[aá]\\s+)?(?:est[aá]\\s+)?(?:indica|sinaliza|mostra)${L_R3}*)?${FIM_R3}` +
    // "em uso" e o cadastro, nao o verbo usar (DS10.1).
    `|${INI_R3}em\\s+uso${FIM_R3}`,
  'gi',
);

/**
 * O cabecalho da lista em que o valor esta: a ultima linha terminada em ":"
 * antes dele, quando todas as linhas entre os dois tem numero (sao itens).
 * Uma linha sem numero no meio encerra a lista, e o cabecalho deixa de valer.
 * "O que esta cadastrado:" seguido de "Vitamina D 1 gota -- todos os dias" e
 * o formato que o modelo usa (E2 #7, DS13.1); a prescricao continua olhada
 * frase a frase.
 */
function cabecalhoDaLista(texto: string, inicio: number): string {
  const linhas = texto.slice(0, inicio).split('\n');
  linhas.pop(); // a propria linha do valor
  for (let i = linhas.length - 1; i >= 0; i--) {
    const linha = linhas[i].trim();
    if (linha === '') continue;
    if (linha.endsWith(':')) return linha;
    if (!/\d/.test(linha)) return '';
  }
  return '';
}

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
    (ANCORA_DE_REGISTRO.test(trechoEmVolta(texto, inicio, fim, QUEBRA_DE_ORACAO_GLOBAL)) ||
      ANCORA_DE_REGISTRO.test(cabecalhoDaLista(texto, inicio))) &&
    !PRESCRICAO_NA_FRASE.test(trechoEmVolta(texto, inicio, fim, FIM_DE_FRASE).replace(NEUTRO_NA_FRASE, ' '))
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
 * CAUSA ENTRE DADOS DE SAUDE (E10, D10.2) -- um verificador da R3 a parte, e nao
 * mais um item de `PADROES_R3`, porque a pergunta nao cabe numa expressao: a
 * frase liga DOIS dados de saude de dominios diferentes? Sondado em 2026-10-19:
 * "seu sono pode ter causado o colesterol alto" passava, e so "melhorou" e
 * "piorou" eram barrados.
 *
 * Por que dois dominios (achado da revisao do E10): com um assunto so, a
 * primeira versao barrava o alerta de interacao ("esses dois remedios podem
 * causar sangramento", texto curado do E9) e frases operacionais ("a glicose
 * ficou fora da comparacao devido a unidade", "a leitura do exame nao
 * funcionou"). Causa entre dados exige dois lados.
 */
const dominio = (termos: string) => new RegExp(`${INI_R3}(?:${termos})${FIM_R3}`, 'i');

/** Os nomes de remedio do dataset de interacoes (E9), alem das palavras
 *  genericas: "a losartana esta controlando sua pressao" nao diz "remedio". */
const NOMES_DE_REMEDIO = Object.entries(DRUG_ALIASES)
  .flatMap(([nome, apelidos]) => [nome, ...apelidos])
  .join('|');

/**
 * Os dominios de saude, cada um com os seus termos. Sinais do relogio
 * (estresse, batimentos) sao um dominio a parte da medida de exame: "o
 * estresse elevou sua pressao" liga dois dados, e no mesmo dominio passaria.
 */
const TERMOS_DO_REMEDIO = `rem[eé]dios?|medicament${L_R3}*|medica[cç](?:[aã]o|[oõ]es)|tratamentos?|${NOMES_DE_REMEDIO}`;
const TERMOS_DE_SAUDE = [
  `sono|dorm${L_R3}*|noites`,
  `passos|caminh${L_R3}*|and(?:a|am|ar|ou|ando)|exerc[ií]cios?|exercit${L_R3}*|atividade\\s+f[ií]sica|academia|sedentar${L_R3}*`,
  TERMOS_DO_REMEDIO,
  `frequ[eê]ncia\\s+card${L_R3}*|batimentos|estresse`,
  `exames?|resultados?|colesterol|glicose|glicemia|glicada|press[aã]o|triglic${L_R3}*|hemoglobina|vitaminas?|peso|ldl|hdl`,
];
const DOMINIO_DO_REMEDIO = dominio(TERMOS_DO_REMEDIO);
const DOMINIOS_DE_SAUDE: RegExp[] = TERMOS_DE_SAUDE.map(dominio);

/** Verbo de mudanca de um dado: o que "fez subir", "subiu pelo" e "baixou" tem. */
const MUDANCA = `(?:sub[ií]|ca[ií]|aument|diminu|baix|reduz|abaix|elev|melhor|pior)${L_R3}*`;

/** Um dado de saude como OBJETO logo adiante: "elevou SUA PRESSAO". */
const OBJETO_DE_SAUDE = `(?=\\s+(?:o|a|os|as|seus?|suas?)\\s+(?:${TERMOS_DE_SAUDE.join('|')})${FIM_R3})`;

/**
 * O que relaciona um dado ao outro como causa, POR FAMILIA (E10, D10.3 = A1).
 * A primeira guarda era uma lista de expressoes inteiras, e a sonda de
 * 2026-10-19 mediu 44 de 46 frases de causa passando: o portugues diz causa por
 * verbo, substantivo, locucao e conjuncao, e nenhuma lista de frases acompanha.
 * Radicais, e nao frases. Sem o infinitivo "causar": "pode causar sangramento"
 * e o alerta de interacao (E9), que o prompt manda repetir.
 */
const CONECTOR_DE_CAUSA = new RegExp(
  [
    // verbo causativo
    `caus(?:a|as|ou|aram|ad[oa]s?|ando|aria|ariam)`,
    `provoc${L_R3}*`,
    `ger(?:a|am|ou|aram|ad[oa]s?|ando)`,
    `desencade${L_R3}*`,
    `ocasion${L_R3}*`,
    `acarret${L_R3}*`,
    `result(?:a|am|ou|aram|ando)\\s+(?:em|n[oa]s?)`,
    `afet(?:a|am|ou|aram|ando)`,
    `interfer(?:e|em|iu|iram|indo)`,
    `impact(?:a|am|ou|aram|ando)`,
    `prejudic${L_R3}*`,
    `favorec${L_R3}*`,
    `ajud(?:a|am|ou|aram|ando)\\s+(?:a|o|os|as|seus?|suas?)`,
    `contribu(?:i|em|iu|[ií]ram|indo)`,
    `influenci(?:a|am|ou|aram|ando)`,
    `explic(?:a|am|aria|ariam|ou|aram)`,
    `justific(?:a|am|ou|aram)`,
    `(?:fez|faz|fazem|fizeram)(?:\\s+${L_R3}+){1,3}\\s+${MUDANCA}`,
    `deix(?:a|am|ou|aram)(?:\\s+${L_R3}+){1,3}\\s+(?:mais\\s+)?(?:alt|baix|elevad)${L_R3}*`,
    // substantivo de causa
    `motivos?`,
    `consequ[eê]ncias?`,
    `reflexos?`,
    `frutos?`,
    `respons[aá]ve(?:l|is)`,
    `fator(?:es)?`,
    `culpa`,
    `raz[aã]o\\s+d[eoa]s?`,
    // locucao
    `devido\\s+(?:a|ao|à)s?`,
    `em\\s+raz[aã]o\\s+d[eoa]s?`,
    `gra[cç]as\\s+(?:a|ao|à)s?`,
    `por\\s+conta\\s+d[eoa]s?`,
    `em\\s+fun[cç][aã]o\\s+d[eoa]s?`,
    `em\\s+decorr[eê]ncia\\s+d[eoa]s?`,
    `${MUDANCA}\\s+pel[oa]s?`,
    `com\\s+(?:o|a|os|as)\\s+(?:rem[eé]dios?|medicament${L_R3}*|tratamentos?)`,
    `efeito\\s+d[eoa]s?`,
    `como\\s+resultado\\s+d[eoa]s?`,
    // "com mais PASSOS", e nao "o mes com mais dias"
    `com\\s+(?:mais|menos)(?=\\s+(?:${TERMOS_DE_SAUDE.join('|')})${FIM_R3})`,
    // verbo de mudanca com um dado de saude como objeto: "o estresse ELEVOU sua pressao"
    `${MUDANCA}${OBJETO_DE_SAUDE}`,
    // o remedio como SUJEITO de um verbo de mudanca: "o remedio baixou seu
    // colesterol". Aqui, e nao no veredito, porque precisa do segundo dado: "a
    // fluoxetina reduz a agregacao plaquetaria" e o mecanismo do alerta (E9).
    `(?<=(?:rem[eé]dios?|medicament${L_R3}*|tratamentos?|${NOMES_DE_REMEDIO})\\s+)${MUDANCA}`,
    // conjuncao (as ambiguas so na posicao em que sao causais)
    `porque`,
    `pois`,
    `j[aá]\\s+que`,
    `visto\\s+que`,
    `uma\\s+vez\\s+que`,
    `consequentemente`,
    `com\\s+isso`,
    `por\\s+isso`,
    `(?<=,\\s*)ent[aã]o`,
    `(?<=(?:,\\s*|${INI_R3}e\\s+))assim`,
    `(?<=(?:^|[.!?;]\\s*))como`,
    // correlacao dita como explicacao
    `tem\\s+a\\s+ver`,
    `ligad[oa]s?\\s+(?:a|ao|à|com)`,
    `por\\s+tr[aá]s`,
    `se\\s+deve(?:m)?\\s+(?:a|ao|à)s?`,
    `relacionad[oa]s?\\s+(?:a|ao|à|com)`,
    `associad[oa]s?\\s+(?:a|ao|à|com)`,
    `(?:levou|levaram|levado|levar)\\s+(?:a|ao|à)s?`,
  ]
    .map((familia) => `${INI_R3}(?:${familia})${FIM_R3}`)
    .join('|'),
  'gi',
);

/** O veredito sobre tratamento. Basta o remedio na frase: "o remedio esta
 *  funcionando" ja e juizo de eficacia, sem segundo dado. */
const VEREDITO_DE_TRATAMENTO = new RegExp(
  `${INI_R3}(?:funcionou|est[aá]o?\\s+(?:funcionando|fazendo\\s+efeito|dando\\s+resultado|dando\\s+certo)|` +
    `(?:fez|faz|fazem|fizeram)\\s+efeito|(?:d[aá]|deu|deram)\\s+certo|resolv(?:e|eu|eram|endo)|` +
    `control(?:a|am|ou|aram|ando)|normaliz${L_R3}*|est[aá]o?\\s+controlando)${FIM_R3}`,
  'gi',
);

/**
 * A frase que explica a FALTA de dado, ou qual mes a comparacao usou, nao liga
 * um dado ao outro: "o exame ficou de fora porque nao ha dado de sono naquele
 * mes" e a resposta honesta da comparacao. Lista fechada e especifica de proposito: um "nao ha" solto
 * ("nao ha duvida: o sono causou...") nao absolve.
 */
const EXPLICA_O_DADO = new RegExp(
  `n[aã]o\\s+h[aá]\\s+(?:dados?|registros?|informa[cç](?:[aã]o|[oõ]es)|m[eé]dia|exames?|resultados?)|n[aã]o\\s+tem\\s+dados?|` +
    // e a explicacao da janela da comparacao (D10.5): "e o mes com mais dias nas 4 semanas antes do exame"
    `m[eê]s\\s+com\\s+mais\\s+dias|` +
    `n[aã]o\\s+h[aá]\\s+o\\s+que\\s+mostrar|n[aã]o\\s+encontrei|n[aã]o\\s+cobre|n[aã]o\\s+aparece|fic(?:ou|a|aram|am)\\s+de\\s+fora|poucos\\s+dias|sem\\s+dados?|` +
    `n[aã]o\\s+(?:consigo|d[aá]\\s+para|[eé]\\s+poss[ií]vel)\\s+comparar|come[cç]am?\\s+em|precisa\\s+cobrir`,
  'i',
);

/**
 * A recusa de ligar os dados absolve -- mas so a que fala de LIGAR: "nao mostra
 * SE um influenciou o outro" (a frase fixa) e "nao consigo dizer SE". A revisao
 * do E10 achou "seu exame nao mostra a data, e o sono causou o colesterol"
 * aprovada pela primeira versao, que aceitava qualquer "nao mostra" antes.
 */
const NAO_LIGA_OS_DADOS =
  /n[aã]o\s+(?:(?:posso|consigo|sei|d[aá]\s+para|[eé]\s+poss[ií]vel)\s+(?:dizer|saber|afirmar)\s+|mostra\s+|diz\s+|indica\s+|prova\s+|sabe\s+)se\b/gi;

/**
 * "Por isso, MOSTRO o exame e o remedio lado a lado" (revisao do E6): a
 * conjuncao apresenta o que o assistente faz, e nao liga um dado ao outro. A
 * primeira versao reprovava a frase e forcava uma nova geracao. So as
 * conjuncoes de consequencia, so com o verbo LOGO depois, e nunca "mostro
 * QUE": "por isso, mostro que o colesterol subiu" e afirmacao. Os verbos de
 * causa da mesma frase ("causou", "explica") seguem julgados a parte.
 */
const CONJUNCAO_DE_CONSEQUENCIA = /^(?:por\s+isso|com\s+isso|assim|ent[aã]o)$/i;
const ACAO_DO_ASSISTENTE = new RegExp(
  `^,?\\s*(?:(?:aqui|eu)\\s+)?(?:mostr(?:o|ei)|trago|trouxe|list(?:o|ei)|coloco|coloquei|separ(?:o|ei)|apresent(?:o|ei)|` +
    `vou\\s+(?:mostrar|listar|trazer|colocar|separar|apresentar))${FIM_R3}(?!\\s+que${FIM_R3})`,
  'i',
);

/** O conector casado so apresenta o que o assistente mostra? */
const apresentaOQueMostra = (texto: string, m: RegExpMatchArray) =>
  CONJUNCAO_DE_CONSEQUENCIA.test(m[0]) && ACAO_DO_ASSISTENTE.test(texto.slice(m.index! + m[0].length));

const MOTIVO_DA_CAUSA =
  'A resposta liga dois dados de saúde como se um tivesse origem no outro. Mostre os dados lado a lado, cada um com sua data, sem ligar um ao outro: quem avalia é quem examina a pessoa.';

/**
 * Cada conector e julgado pela FRASE em volta dele, com o mesmo limite de frase
 * da excecao do valor cadastrado (`FIM_DE_FRASE`): "7.200 passos" e "aprox."
 * nao partem a frase, e partir separaria os dois dados que ela liga.
 */
const verificarCausaEntreDados: Verificador = (texto) => {
  // Causa precisa de dois dominios na frase; veredito de tratamento, so do remedio.
  const doisDominios = (frase: string) => DOMINIOS_DE_SAUDE.filter((d) => d.test(frase)).length >= 2;
  const temRemedio = (frase: string) => DOMINIO_DO_REMEDIO.test(frase);
  const achados = [
    ...[...texto.matchAll(CONECTOR_DE_CAUSA)].map((m) => ({ m, basta: doisDominios })),
    ...[...texto.matchAll(VEREDITO_DE_TRATAMENTO)].map((m) => ({ m, basta: temRemedio })),
  ];
  for (const { m, basta } of achados) {
    const frase = trechoEmVolta(texto, m.index, m.index + m[0].length, FIM_DE_FRASE);
    // A explicacao de falta de dado vale so na ORACAO do conector: "nao ha dados
    // de passos, MAS o sono causou o colesterol" tem a explicacao e a causa lado a lado.
    const oracao = trechoEmVolta(texto, m.index, m.index + m[0].length, QUEBRA_DE_ORACAO_GLOBAL);
    if (!basta(frase) || EXPLICA_O_DADO.test(oracao) || apresentaOQueMostra(texto, m)) continue;
    if (absolvido(texto, m.index, NAO_LIGA_OS_DADOS)) continue;
    return [{ rule: 'R3', reason: MOTIVO_DA_CAUSA, excerpt: trecho(texto, m.index, m[0].length) }];
  }
  return [];
};

VERIFICADORES.push(verificarCausaEntreDados);

/** As frases do texto, pelo mesmo limite de `FIM_DE_FRASE`: "7.200 passos" e
 *  "aprox." nao partem a frase. */
function frasesDe(texto: string): string[] {
  const frases: string[] = [];
  let inicio = 0;
  for (const m of texto.matchAll(FIM_DE_FRASE)) {
    frases.push(texto.slice(inicio, m.index + 1));
    inicio = m.index + 1;
  }
  frases.push(texto.slice(inicio));
  return frases.map((f) => f.trim()).filter(Boolean);
}

/** As oracoes de uma frase, pelos limites de `QUEBRA_DE_ORACAO`. */
function oracoesDe(frase: string): string[] {
  const oracoes: string[] = [];
  let inicio = 0;
  for (const m of frase.matchAll(QUEBRA_DE_ORACAO_GLOBAL)) {
    oracoes.push(frase.slice(inicio, m.index));
    inicio = m.index + m[0].length;
  }
  oracoes.push(frase.slice(inicio));
  return oracoes;
}

const contaDominios = (trecho: string) => DOMINIOS_DE_SAUDE.filter((d) => d.test(trecho)).length;

const MOTIVO_DE_UMA_FRASE =
  'Esta conversa junta dados de assuntos diferentes. Escreva cada dado de saúde na sua própria frase, com a sua data, sem juntar dois assuntos na mesma frase.';

/**
 * "UMA FRASE, UM DOMINIO" (E10, D10.6). O lexico da causa entre dados pega
 * perto de metade das frases de causa nunca vistas -- cada sonda cega achou uma
 * familia nova ("veio do", "trouxe", "tem relacao com"). Nos turnos que cruzam
 * dominios, a regra deixa de depender de palavra: a frase que fala de dois
 * dominios de saude e reescrita, e causa entre dados precisa dos dois na mesma
 * frase. Separados, sobra o lado a lado.
 *
 * Passam: a explicacao de falta de dado ou do mes usado (`EXPLICA_O_DADO`), a
 * recusa de ligar os dados (`NAO_LIGA_OS_DADOS`) e o encaminhamento. O que esta
 * regra NAO pega, registrado: a anafora em outra frase ("isso explica o
 * colesterol" depois de uma frase so de sono) -- essa fica com o lexico.
 */
const verificarUmaFraseUmDominio: Verificador = (texto, { cruzaDominios }) => {
  if (!cruzaDominios) return [];
  for (const frase of frasesDe(texto)) {
    const dominios = DOMINIOS_DE_SAUDE.filter((d) => d.test(frase)).length;
    if (dominios === 0) continue;
    // `search`, e nao `test`: as duas expressoes tem `g`, e `test` guardaria posicao.
    const explicada = (trecho: string) =>
      EXPLICA_O_DADO.test(trecho) || trecho.search(NAO_LIGA_OS_DADOS) !== -1 || temEncaminhamento(trecho);
    // A explicacao vale por ORACAO, como no conector de causa: "nao ha dados de
    // passos naquele mes, MAS o sono causou o colesterol" nao se absolve inteira.
    if (explicada(frase) && oracoesDe(frase).every((o) => explicada(o) || contaDominios(o) < 2)) continue;
    if (dominios >= 2) return [{ rule: 'R3', reason: MOTIVO_DE_UMA_FRASE, excerpt: frase.slice(0, 80) }];
    // A ANAFORA (sonda cega 3): "voce dormiu 5 h. ISSO EXPLICA o colesterol" --
    // o outro dado esta na frase anterior. No turno que cruza, os dois assuntos
    // ja estao na conversa, e conector de causa junto de um dado aponta para o
    // outro. Fora desses turnos, isto ficaria largo demais.
    if ([...frase.matchAll(CONECTOR_DE_CAUSA)].some((m) => !apresentaOQueMostra(frase, m))) {
      return [{ rule: 'R3', reason: MOTIVO_DA_CAUSA, excerpt: frase.slice(0, 80) }];
    }
  }
  return [];
};

VERIFICADORES.push(verificarUmaFraseUmDominio);

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
  // A resposta que so diz que o dado nao existe, sem medida nenhuma, nao tem o
  // que encaminhar (E6 #2, DS13.2): o aviso fixo da tela cobre o resto.
  if (!temMedidaDeExame(texto) && PADRAO_AUSENCIA.test(texto)) return [];

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
    `|nenhum[ao]?|ainda\\s+n[aã]o|sem\\s+registro|vazi[ao]s?` +
    // "a ultima quinta nao esta disponivel/coberta" (E6 #2, DS13.2)
    `|n[aã]o\\s+est[aá]\\s+(?:dispon[ií]vel|cobert[oa]))${FIM_R3}`,
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

/**
 * A R5 no outro sentido que da para verificar (E11): o assistente dizer que FEZ
 * um cadastro. Ele nao faz -- quem salva e a pessoa, no formulario. Com o
 * cartao que abre o formulario preenchido, "Pronto, agendei sua consulta" faria
 * a pessoa sair achando que esta marcado sem tocar em Salvar. A sondagem de
 * 2026-10-20 mostrou essas frases passando.
 *
 * "Agendei" e "cadastrei" bastam sozinhos: nao tem outro sentido aqui. Os
 * outros verbos ("marquei", "salvei", "criei"...) so barram com o objeto de
 * cadastro perto, porque "marquei como importante" nao e cadastro. Primeira
 * pessoa so: "voce marcou a dose" e dado de `consultar_doses_tomadas`, e
 * "incluí" exige o acento -- "o cadastro inclui o horario" e presente, e
 * honesto (revisao do E11). E o
 * "nao" logo antes absolve: "nao marquei nada" e a frase honesta.
 */
const ACAO_CONCLUIDA = new RegExp(
  `${INI_R3}(?<!n[aã]o\\s)(?:(?:agendei|cadastrei)${FIM_R3}` +
    `|(?:marquei|salvei|registrei|criei|anotei|adicionei|incluí)${FIM_R3}[^.!?]{0,40}?` +
    `${INI_R3}(?:consultas?|retornos?|compromissos?|exames?|cirurgias?|lembretes?|rem[eé]dios?|` +
    `medicamentos?|agenda|alarmes?|hor[aá]rios?)${FIM_R3})`,
  'i',
);

const MOTIVO_ACAO_CONCLUIDA =
  'A resposta diz que o assistente fez um cadastro, e ele não faz. Diga que o formulário está pronto para a pessoa conferir e salvar.';

const verificarAcaoConcluida: Verificador = (texto) => {
  const achado = ACAO_CONCLUIDA.exec(texto);
  if (!achado) return [];
  return [{ rule: 'R5', reason: MOTIVO_ACAO_CONCLUIDA, excerpt: trecho(texto, achado.index, achado[0].length) }];
};

VERIFICADORES.push(verificarAcaoConcluida);

/** Participio de cadastro: "agendada", "marcado", "salvo", "criado"... */
const CADASTRO_NA_PASSIVA = new RegExp(
  `${INI_R3}(?:agendad|marcad|cadastrad|registrad|criad|anotad|adicionad|incluíd)[oa]s?${FIM_R3}` +
    `|${INI_R3}salv[oa]s?${FIM_R3}`,
  'gi',
);

/** A oracao que nega ou condiciona o cadastro e a frase honesta: "nada foi
 *  salvo", "ainda nao esta marcado", "so fica salvo quando voce tocar". */
const PASSIVA_HONESTA = /n[aã]o|nada|nunca|s[oó]\s+fica|quando\s+voc[eê]/i;

/**
 * A passiva nos turnos com acao proposta (revisao do E11): "Consulta
 * marcada!" diz que algo foi feito sem dizer quem fez. So vale com
 * `comAcaoProposta`, porque fora dele a passiva e a forma honesta de falar do
 * que ja esta cadastrado. A negacao ou a condicao na mesma oracao absolve.
 */
const verificarPassivaDeCadastro: Verificador = (texto, { comAcaoProposta }) => {
  if (!comAcaoProposta) return [];
  for (const achado of texto.matchAll(CADASTRO_NA_PASSIVA)) {
    const inicio = achado.index ?? 0;
    const antes = texto.slice(0, inicio);
    const oracao = antes.slice(Math.max(...[...'.,;:!?'].map((s) => antes.lastIndexOf(s))) + 1);
    if (PASSIVA_HONESTA.test(oracao)) continue;
    return [{ rule: 'R5', reason: MOTIVO_ACAO_CONCLUIDA, excerpt: trecho(texto, inicio, achado[0].length) }];
  }
  return [];
};

VERIFICADORES.push(verificarPassivaDeCadastro);

/**
 * O formulario prometido pelo modelo (A5 da conferencia no sandbox,
 * 2026-10-20). Com o cartao saindo ou nao, o texto dizia "Preparei as
 * informacoes abaixo", "Deixei o formulario pre-preenchido", "O formulario ja
 * vai aberto" -- e sem cartao a pessoa procurava um botao que nao existia. So
 * o fato consumado ou anunciado: "e eu preparo o formulario", oferta que
 * depende da proxima fala dela, continua valendo, e "nao preparei" e honesto.
 */
const FORMULARIO_PROMETIDO = new RegExp(
  `${INI_R3}(?<!n[aã]o\\s)(?:preparei|deixei|vou\\s+(?:preparar|deixar|abrir))${FIM_R3}[^.!?]{0,40}?` +
    `${INI_R3}(?:formul[aá]rios?|informa[cç][oõ]es|dados|campos)${FIM_R3}` +
    `|${INI_R3}formul[aá]rio${FIM_R3}[^.!?]{0,20}?${INI_R3}j[aá]\\s+(?:vai|est[aá]|fica|ficou)\\s+(?:abert|preenchid|pront)[oa]`,
  'i',
);
const MOTIVO_FORMULARIO =
  'A resposta diz que o formulário está pronto. Quem diz isso é o aplicativo, quando o botão aparece. Diga só onde a pessoa faz isso no aplicativo.';
const verificarFormularioPrometido: Verificador = (texto, { vetarFormulario }) => {
  if (!vetarFormulario) return [];
  const achado = FORMULARIO_PROMETIDO.exec(texto);
  if (!achado) return [];
  return [{ rule: 'R5', reason: MOTIVO_FORMULARIO, excerpt: trecho(texto, achado.index, achado[0].length) }];
};
VERIFICADORES.push(verificarFormularioPrometido);
