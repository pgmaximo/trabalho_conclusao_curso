/**
 * O campo de proposta no envelope da resposta (M4).
 *
 * O ponto central destes testes é o que NÃO pode mudar. A EPIC da memória
 * acrescenta um campo opcional a um envelope que já está em produção, e o
 * caminho antigo — resposta sem proposta nenhuma — precisa continuar válido
 * exatamente como era (regra 5 da constituição).
 */
import { chatAnswerSchema, citationSchema, extrairResposta } from '../chatSchema';
import { toStructuredOutputSchema } from '../../extract-document-data/extractionSchema';
import { SYSTEM_PROMPT } from '../chatPrompt';

const RESPOSTA_SEM_MEMORIA = { texto: 'Sua última coleta foi em março.', citacoes: [] };

describe('o caminho antigo continua valendo', () => {
  it('resposta sem o campo de memória continua válida', () => {
    // Este teste passava antes da EPIC e precisa continuar passando depois.
    // Ele é a prova de que o campo é OPCIONAL de verdade.
    expect(chatAnswerSchema.safeParse(RESPOSTA_SEM_MEMORIA).success).toBe(true);
  });

  it('o envelope continua estrito: campo inventado reprova a resposta inteira', () => {
    const comLixo = { ...RESPOSTA_SEM_MEMORIA, comentario: 'oi' };
    expect(chatAnswerSchema.safeParse(comLixo).success).toBe(false);
  });

  it('`extrairResposta` continua recusando prosa solta', () => {
    expect(extrairResposta('Olá, tudo bem?')).toBeUndefined();
  });
});

describe('o campo novo', () => {
  it('aceita uma proposta com texto e tipo', () => {
    const r = chatAnswerSchema.safeParse({
      ...RESPOSTA_SEM_MEMORIA,
      memoria: { texto: 'Prefiro respostas curtas', tipo: 'PREFERENCIA_DE_RESPOSTA' },
    });
    expect(r.success).toBe(true);
  });

  it('recusa proposta com tipo fora da lista fechada', () => {
    // A lista fechada é do art. 6º, I (finalidade). Ela vale aqui e vale de
    // novo em `validarProposta` -- duas camadas, porque o schema protege do
    // modelo e a validação protege de tudo mais.
    const r = chatAnswerSchema.safeParse({
      ...RESPOSTA_SEM_MEMORIA,
      memoria: { texto: 'Tenho diabetes', tipo: 'CONDICAO' },
    });
    expect(r.success).toBe(false);
  });

  it('recusa proposta sem texto', () => {
    const r = chatAnswerSchema.safeParse({
      ...RESPOSTA_SEM_MEMORIA,
      memoria: { tipo: 'ROTINA' },
    });
    expect(r.success).toBe(false);
  });
});

describe('a citação NÃO ganha lugar para um fato', () => {
  it('a citação continua apontando só para linha de exame', () => {
    // É isto que impede um fato de virar fonte de número, e a garantia não é
    // uma regra escrita em prosa: é a ausência de campo onde escrevê-lo.
    const chaves = Object.keys(citationSchema.shape).sort();
    expect(chaves).toEqual(['collectedAt', 'documentId', 'resultId']);
  });

  it('citação com campo de fato é recusada', () => {
    const r = citationSchema.safeParse({
      resultId: 'r-1',
      documentId: 'd-1',
      collectedAt: '2026-03-01',
      factId: 'f-1',
    });
    expect(r.success).toBe(false);
  });
});

describe('a conversão para a saída estruturada do Bedrock', () => {
  it('não deixa passar palavra-chave que o Bedrock recusa', () => {
    // Erro real do Bloco E: `z.toJSONSchema` ingênuo produzia `maxItems`, e a
    // chamada teria sido recusada na primeira execução real. O conversor da
    // extração é quem tira isso, e o teste fica porque o campo novo é mais uma
    // chance de reintroduzir o problema.
    const json = JSON.stringify(toStructuredOutputSchema(chatAnswerSchema));
    for (const proibida of ['maxItems', 'minItems', 'minimum', 'maximum']) {
      expect(json).not.toContain(proibida);
    }
  });

  it('o campo de memória sobrevive à conversão', () => {
    const json = JSON.stringify(toStructuredOutputSchema(chatAnswerSchema));
    expect(json).toContain('memoria');
  });
});

describe('o prompt de sistema', () => {
  it('diz quando propor', () => {
    expect(SYSTEM_PROMPT).toMatch(/memoria|memória/i);
  });

  it('diz que a proposta sai do que a PESSOA escreveu, não dos dados', () => {
    // A proibição 7 da análise de LGPD: o modelo não olha os exames e conclui
    // algo sobre a pessoa para guardar. Isso seria interpretação clínica pela
    // porta dos fundos.
    expect(SYSTEM_PROMPT).toMatch(/o que a pessoa escreveu|o usuário escreveu|ela mesma disse/i);
  });

  it('diz o que NUNCA propor', () => {
    expect(SYSTEM_PROMPT).toMatch(/nunca proponha|não proponha/i);
  });

  it('continua trazendo as regras de linguagem', () => {
    // Texto novo no prompt não pode empurrar as regras para fora.
    expect(SYSTEM_PROMPT).toMatch(/R1|regra/i);
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(1000);
  });
});
