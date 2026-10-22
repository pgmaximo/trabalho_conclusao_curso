/**
 * O `local` do pedido (E8, D8.1 = A): a UF e o codigo do municipio que o
 * aplicativo ja guarda no aparelho. Ele so serve de CHAVE de leitura de dado
 * publico, e por isso o contrato e tolerante: o que nao valida vira ausente,
 * e o turno segue. Recusar a pergunta inteira por causa de um campo opcional
 * faria uma pergunta sobre exame falhar porque o aparelho guardou lixo.
 */
import { UFS, lerLocal } from '../localDoPedido';

describe('lerLocal', () => {
  it.each([
    [{ uf: 'SP', codigoMunicipio: '355030' }, { uf: 'SP', codigoMunicipio: '355030' }],
    [{ uf: 'PA', codigoMunicipio: '1501402' }, { uf: 'PA', codigoMunicipio: '1501402' }],
    [{ uf: 'SP' }, { uf: 'SP', codigoMunicipio: null }],
    [{ codigoMunicipio: '355030' }, { uf: null, codigoMunicipio: '355030' }],
    [{ uf: 'XX', codigoMunicipio: '355030' }, { uf: null, codigoMunicipio: '355030' }],
    [{ uf: 'sp', codigoMunicipio: '35503A' }, null],
    [{ uf: 'SPP', codigoMunicipio: '12345' }, null],
    [{ uf: 'SP', codigoMunicipio: '12345678' }, { uf: 'SP', codigoMunicipio: null }],
    [{ uf: 35, codigoMunicipio: 355030 }, null],
  ])('lerLocal(%j) = %j', (bruto, esperado) => {
    expect(lerLocal(bruto)).toEqual(esperado);
  });

  it.each([undefined, null, 'SP', [], 42])('valor que nao e objeto vira null: %j', (bruto) => {
    expect(lerLocal(bruto)).toBeNull();
  });

  it('campo extra nao atravessa -- o local e lido por nome', () => {
    expect(
      lerLocal({ uf: 'SP', codigoMunicipio: '355030', owner: 'vitima', latitude: -23 }),
    ).toEqual({ uf: 'SP', codigoMunicipio: '355030' });
  });

  it('UFS tem as 27 siglas', () => {
    expect(new Set(UFS).size).toBe(27);
  });
});
