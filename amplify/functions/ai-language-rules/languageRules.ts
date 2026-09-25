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
 * ESTE ARQUIVO NAO IMPORTA NADA. Nem AWS, nem node:, nem pacote. E o que
 * permite compartilha-lo com o aplicativo (D30) e o que o torna testavel com
 * centenas de textos em milissegundos.
 *
 * DUAS PROPRIEDADES QUE SAO CONTRATO:
 * 1. Reprova, nunca reescreve.
 * 2. Na duvida, reprova. Uma resposta boa reprovada custa uma nova geracao;
 *    uma resposta com posologia aprovada custa muito mais.
 */

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
  'exames?|documentos?|consultas?|receitas?|resultados?|registros?|compromissos?|vacinas?|laudos?|anexos?';

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

const PADROES_R3: Array<{ padrao: RegExp; motivo: string; excecao?: RegExp }> = [
  {
    // "500 mg", "2 comprimidos", "1 cápsula" -- quantidade seguida de unidade
    // de medicamento.
    // A negativa `(?!/)` e o que separa "500 mg" de "12,1 g/dL": a barra e a
    // marca de que a unidade e de EXAME (g/dL, ng/mL, ml/min), e relatar uma
    // medida e o que a R4 exige. Sem ela, a R3 reprovaria a R4.
    padrao: new RegExp(`\\b\\d+([.,]\\d+)?\\s*(${UNIDADES_DE_REMEDIO})\\b(?!/)`, 'i'),
    motivo:
      'A resposta indica uma quantidade de medicamento. Dose e posologia são de quem prescreve.',
  },
  {
    // "de 8 em 8 horas", "a cada 12 horas" -- intervalo de administracao.
    padrao: /\b(de\s+\d+\s+em\s+\d+\s+horas?|a\s+cada\s+\d+\s+horas?)\b/i,
    motivo: 'A resposta indica um intervalo de administração, que é posologia.',
  },
  {
    // Verbos de prescricao seguidos do que esta sendo prescrito. O imperativo
    // e o infinitivo entram os dois -- "aumente a dose" e "deveria aumentar a
    // dose" dizem a mesma coisa a quem le.
    padrao:
      /\b(tome|tomar|use|usar|ingira|ingerir|aumente|aumentar|diminua|diminuir|reduza|reduzir)\b[^.!?]{0,60}\b(medicament\w+|remedi\w+|remédi\w+|comprimid\w+|capsul\w+|cápsul\w+|doses?)\b/i,
    motivo: 'A resposta orienta iniciar, mudar ou interromper uma medicação.',
  },
  {
    // Verbos de SUSPENSAO disparam sozinhos, sem exigir que o objeto seja um
    // nome de medicamento reconhecido. "Suspenda o anticoagulante" nao casaria
    // com nenhuma lista fechada de substancias, e e o conselho mais perigoso
    // que esta IA poderia dar -- interromper medicacao por conta propria e o
    // risco maior de todos. Na duvida, reprova.
    padrao: /\b(suspenda|suspender|interrompa|interromper|par[ea]r?\s+de\s+tomar)\b/i,
    motivo: 'A resposta orienta iniciar, mudar ou interromper uma medicação.',
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

const verificarR3: Verificador = (texto) => {
  for (const { padrao, motivo, excecao } of PADROES_R3) {
    const achado = padrao.exec(texto);
    if (achado) {
      // A excecao olha so o que vem ANTES, e perto: uma recusa de julgar no fim
      // do paragrafo nao absolve um veredito no comeco dele.
      if (excecao && excecao.test(texto.slice(Math.max(0, achado.index - 60), achado.index))) {
        continue;
      }
      // Uma violacao de R3 por resposta: quem vai decidir o que fazer com a
      // reprovacao precisa do motivo, nao de um inventario.
      return [{ rule: 'R3', reason: motivo, excerpt: trecho(texto, achado.index, achado[0].length) }];
    }
  }
  return [];
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
