import { fileChecksum, labResultId } from '../checksum';

describe('idempotencia', () => {
  it('mesmo conteudo gera a mesma soma', () => {
    const a = new TextEncoder().encode('hemograma');
    const b = new TextEncoder().encode('hemograma');
    expect(fileChecksum(a)).toBe(fileChecksum(b));
  });

  it('conteudo diferente gera soma diferente', () => {
    expect(fileChecksum(new TextEncoder().encode('a'))).not.toBe(
      fileChecksum(new TextEncoder().encode('b')),
    );
  });

  it('o mesmo analito do mesmo arquivo no mesmo documento gera o mesmo id', () => {
    expect(labResultId('doc-1', 'abc', '62292-8', null)).toBe(
      labResultId('doc-1', 'abc', '62292-8', null),
    );
  });

  it('o mesmo analito em documentos diferentes gera ids diferentes', () => {
    expect(labResultId('doc-1', 'abc', '62292-8', null)).not.toBe(
      labResultId('doc-2', 'abc', '62292-8', null),
    );
  });

  it('reprocessar o mesmo arquivo nao gera id novo', () => {
    const primeira = labResultId(
      'doc-1',
      fileChecksum(new TextEncoder().encode('pdf')),
      '62292-8',
      null,
    );
    const segunda = labResultId(
      'doc-1',
      fileChecksum(new TextEncoder().encode('pdf')),
      '62292-8',
      null,
    );
    expect(primeira).toBe(segunda);
  });

  it('curva glicemica: o mesmo analito em momentos diferentes NAO colide', () => {
    // Sem esta garantia, UpdateCommand sobrescreve sem levantar erro e restam
    // uma linha das tres. Perda silenciosa (D22).
    const jejum = labResultId('doc-1', 'abc', '2345-7', 'jejum');
    const em60 = labResultId('doc-1', 'abc', '2345-7', '60 minutos');
    const em120 = labResultId('doc-1', 'abc', '2345-7', '120 minutos');
    expect(new Set([jejum, em60, em120]).size).toBe(3);
  });

  it('momento vazio e momento ausente sao o mesmo id -- laudo com um valor so', () => {
    expect(labResultId('doc-1', 'abc', '62292-8', null)).toBe(
      labResultId('doc-1', 'abc', '62292-8', ''),
    );
  });
});
