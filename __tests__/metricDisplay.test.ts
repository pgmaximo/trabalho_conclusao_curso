import { formatarValorDeMetrica, nomeDoModelo } from '@/utils/metricDisplay';

// O painel do smartwatch mostrava "8200.0 passos" e o identificador cru do
// modelo ("us.anthropic.claude-sonnet-4-6")
// (specs/00-fundacao/correcoes-de-usabilidade/spec.md, D4).

describe('formatarValorDeMetrica', () => {
  it.each([
    [8200, 'passos', '8.200 passos'],
    [8199.6, 'passos', '8.200 passos'],
    [402.04, 'min', '402 min'],
    [62.4, 'bpm', '62 bpm'],
    [1234567, 'passos', '1.234.567 passos'],
    [97.6, '%', '98 %'],
    [78, 'pontos', '78 pontos'],
  ])('mostra contagens, duracoes e pontuacoes sem casa decimal (%s %s)', (valor, unidade, texto) => {
    expect(formatarValorDeMetrica(valor, unidade)).toBe(texto);
  });

  it.each([
    [72.44, 'kg', '72,4 kg'],
    [5, 'km', '5,0 km'],
    [36.55, '°C', '36,5 °C'],
    [1250.25, 'km', '1.250,3 km'],
  ])('mostra medidas continuas com uma casa e virgula (%s %s)', (valor, unidade, texto) => {
    expect(formatarValorDeMetrica(valor, unidade)).toBe(texto);
  });

  it('mostra um traco quando nao ha valor', () => {
    expect(formatarValorDeMetrica(null, 'passos')).toBe('—');
    expect(formatarValorDeMetrica(undefined, 'kg')).toBe('—');
    expect(formatarValorDeMetrica(Number.NaN, 'kg')).toBe('—');
  });
});

describe('nomeDoModelo', () => {
  it.each([
    ['us.anthropic.claude-sonnet-4-6', 'Claude Sonnet 4.6'],
    ['anthropic.claude-3-5-sonnet-20241022-v2:0', 'Claude 3.5 Sonnet'],
    ['us.anthropic.claude-haiku-4-5-20251001-v1:0', 'Claude Haiku 4.5'],
    ['claude-opus-4-1', 'Claude Opus 4.1'],
  ])('traduz %s', (id, nome) => {
    expect(nomeDoModelo(id)).toBe(nome);
  });

  it('devolve nulo para o que nao reconhece, em vez de mostrar o identificador cru', () => {
    expect(nomeDoModelo(null)).toBeNull();
    expect(nomeDoModelo('')).toBeNull();
    expect(nomeDoModelo('amazon.nova-pro-v1:0')).toBeNull();
    expect(nomeDoModelo('claude')).toBeNull();
  });
});
