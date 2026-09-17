import { ANALYTE_CATALOG, candidatesForPrompt, findAnalyteByCode } from '../analyteCatalog';

describe('analyteCatalog', () => {
  it('nao tem codigo repetido', () => {
    const codes = ANALYTE_CATALOG.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('exige massa molar de todo analito que converte para unidade molar', () => {
    const faltando = ANALYTE_CATALOG.filter((a) => a.convertsToMolar && a.molarMass === null);
    expect(faltando.map((a) => a.label)).toEqual([]);
  });

  it('marca hemoglobina como sem conversao molar (D18)', () => {
    // 718-7 = "Hemoglobin [Mass/volume] in Blood", g/dL. Buscado por codigo, e
    // nao por texto dentro de `label`: `label` carrega o nome OFICIAL do LOINC,
    // que e em ingles (clausula 10.3), entao procurar "hemoglobina" ali nao
    // acha nada -- e procurar "hemoglobin" acharia tambem a CHCM, que tem o
    // mesmo COMPONENT e a mesma unidade. O rotulo em portugues vive em
    // `projectLabel`.
    const hb = findAnalyteByCode('718-7');
    expect(hb).toBeDefined();
    expect(hb?.canonicalUnit).toBe('g/dL');
    expect(hb?.convertsToMolar).toBe(false);
    expect(hb?.molarMass).toBeNull();
  });

  it('usa unidade convencional brasileira como canonica (D17)', () => {
    const glicose = findAnalyteByCode('2345-7'); // Glucose [Mass/volume] in Serum or Plasma
    expect(glicose?.canonicalUnit).toBe('mg/dL');
  });

  it('todo codigo tem a forma de codigo LOINC, e nenhum foi inventado', () => {
    for (const a of ANALYTE_CATALOG) expect(a.code).toMatch(/^\d{1,6}-\d$/);
  });

  it('carrega nome oficial do LOINC, exigencia da clausula 10.3 da licenca', () => {
    for (const a of ANALYTE_CATALOG) expect(a.label.trim().length).toBeGreaterThan(0);
  });

  it('preserva a unidade de exemplo do LOINC ao lado da nossa canonica', () => {
    const vitD = findAnalyteByCode('62292-8'); // 25-OH-D3+D2 [Mass/volume], ng/mL
    expect(vitD?.canonicalUnit).toBe('ng/mL');
    expect(vitD?.loincExampleUnit).toBe('ng/mL');
  });

  it('leva o nome em portugues ao modelo, porque o laudo brasileiro e em portugues', () => {
    // O laudo escreve "Glicose", nao "Glucose [Mass/volume] in Serum or
    // Plasma". Mandar so o nome oficial do LOINC obrigaria o modelo a traduzir
    // de cabeca justamente na etapa em que errar custa mais caro -- e seria
    // desperdicar a variante pt-BR que a D26 descobriu.
    const glicose = candidatesForPrompt().find((c) => c.code === '2345-7');
    expect(glicose?.projectLabel).toBe('Glicose');
    expect(glicose?.synonyms.length).toBeGreaterThan(0);
  });

  it('nao expoe massa molar na lista enviada ao modelo', () => {
    // Massa molar e insumo do conversor, nao do mapeamento. Mandar ao modelo
    // um numero que ele nao precisa e convidar a usa-lo para "conferir" a
    // conversao, que e trabalho nosso e deterministico.
    const primeiro = candidatesForPrompt()[0];
    expect(Object.keys(primeiro).sort()).toEqual([
      'canonicalUnit',
      'code',
      'label',
      'projectLabel',
      'synonyms',
    ]);
  });

  it('devolve null para codigo que nao existe, sem lancar', () => {
    expect(findAnalyteByCode('nao-existe')).toBeNull();
  });
});
