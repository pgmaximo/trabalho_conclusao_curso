import { localAnalyteCode } from '../localAnalyteCode';

// A D32 existe porque a decisao anterior -- descartar o analito fora do
// catalogo -- resolvia uma colisao de chave jogando dado fora. O laudo real
// trouxe quatro assim. Estes testes cobrem a propriedade que faz o codigo
// local prestar: ele e ESTAVEL. Se o mesmo analito gerar codigos diferentes em
// duas coletas, a serie temporal nunca se forma e a cobertura vira ilusao.

describe('localAnalyteCode', () => {
  it('leva o prefixo X, que a clausula 3 da licenca do LOINC exige', () => {
    // Registro acrescentado por nos nunca pode ser confundido com codigo
    // oficial -- e o prefixo e o que garante isso a olho nu, na tela.
    expect(localAnalyteCode('VPM')).toBe('X-VPM');
  });

  it('nunca tem a forma de um codigo LOINC, mesmo por acidente', () => {
    // LOINC e digitos-hifen-digito. Um codigo local que casasse
    // com esse padrao faria a linha parecer comparavel entre laboratorios.
    const codigo = localAnalyteCode('12345 6');
    expect(codigo).not.toMatch(/^\d+-\d$/);
    expect(codigo?.startsWith('X-')).toBe(true);
  });

  it('a mesma substancia escrita de dois jeitos gera UM codigo so', () => {
    // Esta e a propriedade inteira: sem ela, a coleta do mes que vem nao
    // encontra a deste mes. A D32 recusou usar o rotulo cru como codigo
    // exatamente por isso.
    expect(localAnalyteCode('25-OH-Vitamina D')).toBe(localAnalyteCode('25 OH  vitamina d'));
  });

  it('tira o acento, que e onde o portugues quebra comparacao de texto', () => {
    expect(localAnalyteCode('Testosterona Biodisponível')).toBe(
      'X-TESTOSTERONA-BIODISPONIVEL',
    );
    expect(localAnalyteCode('Testosterona Biodisponivel')).toBe(
      localAnalyteCode('Testosterona Biodisponível'),
    );
  });

  it('pontuacao e parentese nao criam analito novo', () => {
    expect(localAnalyteCode('VPM (Volume Plaquetário Médio)')).toBe(
      'X-VPM-VOLUME-PLAQUETARIO-MEDIO',
    );
  });

  it('recusa em vez de inventar quando nao sobra nada do rotulo', () => {
    // Rotulo que so tem pontuacao nao identifica analito nenhum. Devolver
    // "X-" aqui seria recriar a colisao que a D32 veio fechar: varias linhas
    // diferentes com o mesmo codigo, uma sobrescrevendo as outras em silencio.
    expect(localAnalyteCode('—')).toBeNull();
    expect(localAnalyteCode('   ')).toBeNull();
  });
});
