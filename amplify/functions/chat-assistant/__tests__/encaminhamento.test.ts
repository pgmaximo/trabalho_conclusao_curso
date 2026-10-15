/**
 * Decisoes A2 e C3 do Bloco 9 -- o encaminhamento deixa de ser prosa do modelo
 * e passa a ser texto do aplicativo.
 *
 * A R2 e a UNICA das cinco regras cuja violacao e a AUSENCIA de um texto fixo.
 * Nas outras quatro o problema esta no que foi dito, e gerar de novo faz
 * sentido: o modelo precisa escrever diferente. Aqui o aplicativo sabe qual e
 * o texto que falta -- e ate 2026-09-19 ele jogava fora a resposta inteira por
 * causa dele. Foram 2 de 2 reprovacoes medidas em producao.
 *
 * A C3 vai um passo alem da A2: o encaminhamento passa a ser SEMPRE do
 * aplicativo. Enquanto ele fosse prosa gerada, carregava o que prosa gerada
 * carrega -- variacao, empatia mal calibrada, e fatos inventados sobre quem
 * pediu o exame ("o especialista que solicitou o exame", turno 1 da conversa
 * real, sobre um pedido que o aplicativo nao sabe que existiu).
 */
import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { TEXTO_DE_ENCAMINHAMENTO, costurar } from '../encaminhamento';

describe('o texto fixo do encaminhamento', () => {
  it('passa nas CINCO regras de linguagem', () => {
    // O mesmo molde do teste que exige que o bloco de regras passe na propria
    // verificacao: um texto que o aplicativo cola em toda resposta clinica nao
    // pode ser reprovavel. Se ele fosse, a costura transformaria resposta boa
    // em resposta ruim -- o oposto do que esta decisao existe para fazer.
    const resultado = checkLanguageRules(TEXTO_DE_ENCAMINHAMENTO, {
      questionKind: 'clinica',
      temOrigem: true,
    });
    expect(resultado.ok).toBe(true);
  });

  it('satisfaz a propria R2: ele E um encaminhamento', () => {
    // Se o texto costurado nao contasse como encaminhamento, a resposta
    // costurada seria reprovada na proxima verificacao -- e a costura seria
    // um enfeite caro.
    const comTexto = checkLanguageRules(`Sua glicose foi registrada. ${TEXTO_DE_ENCAMINHAMENTO}`, {
      questionKind: 'clinica',
      temOrigem: true,
    });
    expect(comTexto.ok).toBe(true);
  });

  it('NAO afirma nada sobre quem pediu o exame', () => {
    // "o especialista que solicitou o exame" afirmava dois fatos que o
    // aplicativo nao sabe: que houve um pedido, e que quem pediu era
    // especialista.
    expect(TEXTO_DE_ENCAMINHAMENTO).not.toMatch(/solicit|pediu|especialista|seu m[eé]dic/i);
  });

  it('NAO convida a pessoa a julgar o proprio resultado', () => {
    // "se tiver algum valor que te preocupa" nao julga, mas convida a julgar,
    // e sugere que existem valores preocupantes ali. E a fronteira da regra 4,
    // e esta decisao a fecha do lado seguro.
    expect(TEXTO_DE_ENCAMINHAMENTO).not.toMatch(/preocup|alterad|normal|se tiver algum/i);
  });
});

describe('costurar', () => {
  it('acrescenta o encaminhamento no FIM da resposta, preservando o texto', () => {
    const r = costurar('Sua glicose foi 86 mg/dL em 04/10/2025.');

    expect(r.costurado).toBe(true);
    expect(r.texto).toBe(`Sua glicose foi 86 mg/dL em 04/10/2025. ${TEXTO_DE_ENCAMINHAMENTO}`);
  });

  it('NAO duplica quando a resposta ja encaminha', () => {
    // O modelo ainda pode escrever o encaminhamento por conta propria. Costurar
    // por cima produziria duas frases dizendo a mesma coisa, que e o rodape
    // mecanico que o estudo de linguagem manda evitar.
    const original = 'Leve este exame a um profissional de saúde.';
    const r = costurar(original);

    expect(r.costurado).toBe(false);
    expect(r.texto).toBe(original);
  });

  it('nao deixa espaco dobrado quando o texto ja termina em espaco', () => {
    expect(costurar('Sua glicose foi registrada.  ').texto).toBe(
      `Sua glicose foi registrada. ${TEXTO_DE_ENCAMINHAMENTO}`,
    );
  });

  it('texto vazio recebe so o encaminhamento, sem espaco na frente', () => {
    expect(costurar('').texto).toBe(TEXTO_DE_ENCAMINHAMENTO);
  });
});
