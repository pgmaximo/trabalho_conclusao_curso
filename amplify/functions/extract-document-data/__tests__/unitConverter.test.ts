import { convertConcentration, normalizeUnitToken } from '../unitConverter';

describe('convertConcentration', () => {
  it('converte mg/dL para mmol/L usando 10 / massa molar', () => {
    // Glicose, massa molar 180,16 -> fator 0,0555
    const result = convertConcentration(95, 'mg/dL', 'mmol/L', 180.16);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(5.273, 3);
  });

  it('converte ng/mL para nmol/L usando 1000 / massa molar', () => {
    // Vitamina D, massa molar 400,64 -> fator 2,496
    const result = convertConcentration(32, 'ng/mL', 'nmol/L', 400.64);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeCloseTo(79.87, 2);
  });

  it('trata ng/mL e ug/L como identicos, sem massa molar', () => {
    const result = convertConcentration(120, 'ng/mL', 'ug/L', null);
    expect(result).toEqual({ ok: true, value: 120 });
  });

  it('recusa converter sem massa molar quando a conversao e molar', () => {
    const result = convertConcentration(95, 'mg/dL', 'mmol/L', null);
    expect(result).toEqual({ ok: false, reason: 'sem-massa-molar' });
  });

  it('recusa unidade que nao conhece, em vez de chutar', () => {
    const result = convertConcentration(1, 'quilogramas por legua', 'mmol/L', 180.16);
    expect(result).toEqual({ ok: false, reason: 'unidade-desconhecida' });
  });

  it('entende as tres grafias do sinal de micro que o OCR devolve', () => {
    // U+00B5 MICRO SIGN, U+03BC GREEK SMALL LETTER MU e o "u" do ASCII. Qual
    // deles sai do Textract depende da fonte embutida no PDF, e um laudo pode
    // trazer mais de um na mesma pagina.
    expect(normalizeUnitToken('µg/dL')).toBe('ug/dL');
    expect(normalizeUnitToken('μg/dL')).toBe('ug/dL');
    expect(normalizeUnitToken('ug/dL')).toBe('ug/dL');
  });

  it('entende o que o laudo brasileiro escreve de fato, que nunca e UCUM', () => {
    expect(normalizeUnitToken('mcg/dL')).toBe('ug/dL');
    expect(normalizeUnitToken(' mg / dL ')).toBe('mg/dL');
    expect(normalizeUnitToken('µUI/mL')).toBe('u[IU]/mL');
    expect(normalizeUnitToken('UI/L')).toBe('U/L');
    expect(normalizeUnitToken(null)).toBe('');
  });

  it('converte contagem por mm3 em contagem por microlitro, que e a mesma coisa', () => {
    // Hemograma brasileiro reporta "5.400/mm3"; a unidade canonica do LOINC
    // para leucocitos e 10*3/uL. 1 mm3 = 1 uL exatamente, e o que muda e so a
    // potencia de mil -- se essa conversao nao existir, todo hemograma vai
    // para revisao por "unidade desconhecida".
    const result = convertConcentration(5400, '/mm3', '10*3/uL', null);
    expect(result).toEqual({ ok: true, value: 5.4 });
  });

  it('ida e volta devolve o valor de partida', () => {
    const ida = convertConcentration(95, 'mg/dL', 'mmol/L', 180.16);
    expect(ida.ok).toBe(true);
    if (!ida.ok) return;
    const volta = convertConcentration(ida.value, 'mmol/L', 'mg/dL', 180.16);
    expect(volta.ok).toBe(true);
    if (volta.ok) expect(volta.value).toBeCloseTo(95, 6);
  });
  it('entende a potencia com acento circunflexo, que e como o laudo real escreve', () => {
    // Achado da Tarefa 1 contra o laudo do Delboni de 04/10/2025: eritrocitos
    // vem como "10^6/uL" e leucocitos como "10^3/uL". O UCUM escreve "10*6/uL".
    // Sem este alias a PRIMEIRA linha de todo hemograma vai para revisao por
    // "unidade desconhecida" -- exatamente o modo de falha da D28, achado
    // agora contra papel de verdade.
    expect(normalizeUnitToken('10^6/µL')).toBe('10*6/uL');
    expect(normalizeUnitToken('10^3/uL')).toBe('10*3/uL');
    expect(normalizeUnitToken('10*6/µL')).toBe('10*6/uL');
  });

  it('converte eritrocitos do laudo real sem mandar para revisao', () => {
    const result = convertConcentration(5.19, '10^6/µL', '10*6/uL', null);
    expect(result).toEqual({ ok: true, value: 5.19 });
  });
});
