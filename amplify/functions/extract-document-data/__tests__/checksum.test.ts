import { ANALYTE_CATALOG } from '../analyteCatalog';
import { fileChecksum, labResultId } from '../checksum';

// D27: nenhum codigo LOINC digitado a mao, nem como exemplo em teste. O que o
// teste escolhe e o analito -- pelo rotulo em portugues -- e o codigo vem do
// catalogo gerado a partir do extrato oficial. Aqui isso importa duas vezes:
// o codigo entra na COMPOSICAO do id deterministico, entao um digito trocado
// nao quebraria nenhuma asercao deste arquivo (todas comparam ids entre si) e
// passaria batido.
const codigoDe = (rotulo: string): string => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado.code;
};

const VITAMINA_D = codigoDe('Vitamina D (25-OH)');
const GLICOSE = codigoDe('Glicose');

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
    expect(labResultId('doc-1', 'abc', VITAMINA_D, null)).toBe(
      labResultId('doc-1', 'abc', VITAMINA_D, null),
    );
  });

  it('o mesmo analito em documentos diferentes gera ids diferentes', () => {
    expect(labResultId('doc-1', 'abc', VITAMINA_D, null)).not.toBe(
      labResultId('doc-2', 'abc', VITAMINA_D, null),
    );
  });

  it('reprocessar o mesmo arquivo nao gera id novo', () => {
    const primeira = labResultId(
      'doc-1',
      fileChecksum(new TextEncoder().encode('pdf')),
      VITAMINA_D,
      null,
    );
    const segunda = labResultId(
      'doc-1',
      fileChecksum(new TextEncoder().encode('pdf')),
      VITAMINA_D,
      null,
    );
    expect(primeira).toBe(segunda);
  });

  it('curva glicemica: o mesmo analito em momentos diferentes NAO colide', () => {
    // Sem esta garantia, UpdateCommand sobrescreve sem levantar erro e restam
    // uma linha das tres. Perda silenciosa (D22).
    const jejum = labResultId('doc-1', 'abc', GLICOSE, 'jejum');
    const em60 = labResultId('doc-1', 'abc', GLICOSE, '60 minutos');
    const em120 = labResultId('doc-1', 'abc', GLICOSE, '120 minutos');
    expect(new Set([jejum, em60, em120]).size).toBe(3);
  });

  it('momento vazio e momento ausente sao o mesmo id -- laudo com um valor so', () => {
    expect(labResultId('doc-1', 'abc', VITAMINA_D, null)).toBe(
      labResultId('doc-1', 'abc', VITAMINA_D, ''),
    );
  });
});
