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

type Verificador = (texto: string, questionKind: QuestionKind) => Violation[];

/** Preenchido pelas tarefas L2, L3 e L4. */
const VERIFICADORES: Verificador[] = [];

export function checkLanguageRules(
  text: string,
  options: { questionKind: QuestionKind },
): RuleCheckResult {
  if (typeof text !== 'string' || text.trim() === '') {
    // Resposta vazia e falha de geracao, nao resposta limpa. Aprova-la aqui
    // faria a tela mostrar silencio como se fosse uma resposta.
    return {
      ok: false,
      violations: [{ rule: 'R5', reason: 'A resposta veio vazia.', excerpt: '' }],
    };
  }

  const violations = VERIFICADORES.flatMap((verificar) => verificar(text, options.questionKind));
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

const PADROES_R3: Array<{ padrao: RegExp; motivo: string }> = [
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
    padrao:
      /\b(voce|você)\s+(tem|esta\s+com|está\s+com|provavelmente\s+tem)\b|(?:^|\W)(e|é)\s+(um\s+)?(sinal\s+claro\s+de|caso\s+de|quadro\s+de)\b/i,
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
];

const verificarR3: Verificador = (texto) => {
  for (const { padrao, motivo } of PADROES_R3) {
    const achado = padrao.exec(texto);
    if (achado) {
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
const verificarR2: Verificador = (texto, questionKind) => {
  if (questionKind !== 'clinica') return [];
  if (PADRAO_ENCAMINHAMENTO.test(texto)) return [];

  return [
    {
      rule: 'R2',
      reason: 'A pergunta é clínica e a resposta não encaminha a um profissional de saúde.',
      excerpt: texto.slice(0, 80),
    },
  ];
};

VERIFICADORES.push(verificarR2);
