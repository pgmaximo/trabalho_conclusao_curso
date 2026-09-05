import { haversineDistanceKm } from '../distance';

describe('haversineDistanceKm', () => {
  it('retorna 0 para o mesmo ponto', () => {
    const point = { latitude: -23.55, longitude: -46.63 };
    expect(haversineDistanceKm(point, point)).toBeCloseTo(0, 5);
  });

  it('calcula a distância aproximada entre São Paulo e Rio de Janeiro (~360km)', () => {
    const saoPaulo = { latitude: -23.5505, longitude: -46.6333 };
    const rioDeJaneiro = { latitude: -22.9068, longitude: -43.1729 };

    const distance = haversineDistanceKm(saoPaulo, rioDeJaneiro);

    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(380);
  });

  it('é simétrica', () => {
    const a = { latitude: -23.5505, longitude: -46.6333 };
    const b = { latitude: -22.9068, longitude: -43.1729 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10);
  });
});
