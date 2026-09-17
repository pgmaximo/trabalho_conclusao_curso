import { checkLanguageRules } from '../../ai-language-rules/languageRules';
import { SYSTEM_PROMPT, buildUserText, EXTRACTION_OUTPUT_NAME } from '../extractionPrompt';

const texto = {
  pages: [{ page: 1, text: 'Vitamina D 32 ng/mL VR 30-100' }],
  fullText: 'Vitamina D 32 ng/mL VR 30-100',
};

describe('extractionPrompt', () => {
  it('proibe o termo vetado pelo projeto na propria instrucao', () => {
    // O padrao NAO e repetido aqui: ele vem da EPIC de regras de linguagem,
    // que ja esta implementada. O plano previa a repeticao so enquanto aquela
    // EPIC nao existisse -- ela existe, entao esta e a importacao que ele
    // mandou fazer. Assim o termo vetado tambem nao aparece neste arquivo.
    const resultado = checkLanguageRules(SYSTEM_PROMPT, { questionKind: 'operacional' });
    const violacoesR1 = resultado.ok ? [] : resultado.violations.filter((v) => v.rule === 'R1');
    expect(violacoesR1).toEqual([]);
  });

  it('instrui a nao interpretar o resultado', () => {
    expect(SYSTEM_PROMPT).toMatch(/nao interprete|nao classifique/i);
  });

  it('inclui o numero da pagina no texto enviado, para o modelo poder citar a origem', () => {
    expect(buildUserText(texto, 'exam')).toContain('[pagina 1]');
  });

  it('pede analitos para exame e medicamentos para receita', () => {
    expect(buildUserText(texto, 'exam')).toMatch(/analito/i);
    expect(buildUserText(texto, 'prescription')).toMatch(/medicamento/i);
  });

  it('a saida estruturada tem nome estavel usado tambem no reparo', () => {
    expect(EXTRACTION_OUTPUT_NAME).toBe('registrar_extracao');
  });

  it('pede a data da coleta em ISO, porque o laudo escreve 04/10/2025', () => {
    // Achado da tarefa 1 contra o laudo real: sem pedir ISO, o modelo devolve
    // "04/10/2025" e o schema da tarefa 4 -- que exige ^\d{4}-\d{2}-\d{2}$ --
    // recusa a linha inteira. A instrucao fecha o buraco antes da validacao.
    expect(SYSTEM_PROMPT).toMatch(/AAAA-MM-DD/);
  });

  it('manda distinguir contagem absoluta de percentual, que e colisao de id', () => {
    // Achado do estudo de leitura: o modelo rotulou "Neutrofilos" tanto para
    // 3.515 /uL quanto para 63,9 %. Sao dois analitos com codigos LOINC
    // distintos, e mapear os dois para um codigo so faz o UpdateCommand
    // sobrescrever SEM levantar erro -- a D22 por outra porta.
    expect(SYSTEM_PROMPT).toMatch(/percentual/i);
    expect(SYSTEM_PROMPT).toMatch(/absolut/i);
  });

  it('manda ignorar instrucao vinda de dentro do documento', () => {
    expect(SYSTEM_PROMPT).toMatch(/nao siga instrucao/i);
  });
});
