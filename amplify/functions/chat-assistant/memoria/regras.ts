/**
 * Resumo do arquivo:
 * Os limites da memória do usuário (D34), num módulo que NÃO IMPORTA NADA.
 *
 * A ausência de importação é estrutural, e não estilo: este arquivo é lido pela
 * Lambda e pelo aplicativo. O precedente é
 * `extract-document-data/numberParser.ts`, importado por
 * `src/services/extractionService.ts`. Duas cópias divergiriam, e a divergência
 * apareceria do pior jeito possível — um fato aceito pela tela e recusado pela
 * função, ou o contrário.
 *
 * Os dois números daqui são limites de LGPD, e não detalhe de implementação:
 * o art. 6º, III pede o mínimo necessário, e memória é, por natureza, acúmulo.
 */

/**
 * A lista fechada de tipos. A fronteira que os define: **cabe aqui o que muda a
 * forma da resposta; não cabe o que muda o conteúdo factual sobre saúde.**
 *
 * Condição, alergia e medicamento ficam de fora, e a razão é de arquitetura:
 * eles têm formulário próprio no perfil de saúde, e duas fontes de verdade
 * sobre a mesma condição divergem — a que o assistente lê a cada turno passaria
 * a ser a que ninguém atualiza (D34).
 */
export const MEMORY_KINDS = [
  /** Nome ou tratamento preferido: "Me chame de Pedro". */
  'COMO_ME_CHAMAR',
  /** Forma da resposta: "Prefiro respostas curtas". */
  'PREFERENCIA_DE_RESPOSTA',
  /** Contexto de rotina que muda a forma: "Trabalho de madrugada". */
  'ROTINA',
  /** Como a pessoa acessa cuidado: "Me atendo pelo posto do bairro". */
  'ACESSO_A_CUIDADO',
] as const;

export type MemoryKind = (typeof MEMORY_KINDS)[number];

/**
 * Quantos fatos cabem. Mais do que uma pessoa costuma ter a dizer sobre a forma
 * como quer ser atendida, e pouco o bastante para caber numa tela que ela leia
 * inteira — e ler inteira é o direito do art. 18, II.
 *
 * Atingir o teto é PEDIR à pessoa que apague um, nunca descartar o mais antigo
 * em silêncio: descartar em silêncio é decidir por ela qual parte dela deixa de
 * importar.
 */
export const MAX_FATOS = 20;

/**
 * Quanto cabe num fato. Acima disto deixa de ser fato e vira resumo, que é a
 * quarta memória — recusada na D34 porque ninguém confirma um resumo frase a
 * frase.
 */
export const MAX_CARACTERES_FATO = 140;

/**
 * A comparação é EXATA. Um tipo aceito por diferença de maiúscula seria um tipo
 * novo entrando sem decisão, e cada tipo é uma finalidade (art. 6º, I).
 */
export function tipoValido(valor: string): valor is MemoryKind {
  return (MEMORY_KINDS as readonly string[]).includes(valor);
}

/**
 * Tira espaço das pontas e espaço repetido do meio, e NADA MAIS.
 *
 * Não corrige, não capitaliza, não reescreve: o texto gravado é o texto que a
 * pessoa viu na confirmação. Qualquer reescrita aqui faria a tela mostrar uma
 * coisa e o banco guardar outra, que é exatamente o que esvazia o consentimento
 * do art. 11, I.
 */
export function normalizarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ');
}

/** O limite conta o texto já normalizado: espaço duplicado não consome cota. */
export function textoValido(texto: string): boolean {
  const limpo = normalizarTexto(texto);
  return limpo.length > 0 && limpo.length <= MAX_CARACTERES_FATO;
}
