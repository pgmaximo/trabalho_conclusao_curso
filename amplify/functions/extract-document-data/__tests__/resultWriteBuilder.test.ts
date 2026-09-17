import { buildLabResultUpdate, separarLinhasGravaveis } from '../resultWriteBuilder';

const linha = {
  id: 'a3f1', // saida de labResultId (tarefa 6), sha256 em hex
  owner: 'sub::username',
  documentId: 'doc-1',
  analyteCode: '62292-8', // LOINC, sempre (D27)
  analyteLabel: '25-Hydroxyvitamin D3+25-Hydroxyvitamin D2 [Mass/volume] in Serum or Plasma',
  projectLabel: 'Vitamina D (25-OH)',
  value: 32.5,
  valueQualifier: null,
  unit: 'ng/mL',
  rawValue: '32,5',
  rawUnit: 'ng/mL',
  referenceLow: 30,
  referenceHigh: 100,
  collectedAt: '2026-03-12',
  collectionMoment: null,
  sourcePage: 2,
  confidence: 0.94,
  reviewStatus: 'AUTO' as const,
};

describe('buildLabResultUpdate', () => {
  it('usa UpdateCommand e nunca sobrescreve a linha inteira', () => {
    const cmd = buildLabResultUpdate(linha, 'tabela');
    expect(cmd.UpdateExpression).toMatch(/^SET /);
    // PutCommand apagaria owner/__typename/createdAt escritos antes -- a
    // armadilha que a feature de wearable documentou.
    expect(cmd).not.toHaveProperty('Item');
  });

  it('a chave e deterministica, entao reprocessar atualiza em vez de duplicar', () => {
    expect(buildLabResultUpdate(linha, 'tabela').Key).toEqual(
      buildLabResultUpdate(linha, 'tabela').Key,
    );
  });

  it('preenche __typename e owner para a linha ser legivel pelo cliente do Amplify', () => {
    // Diferente de HealthImport, a linha e criada pela Lambda -- nao existe
    // resolver de create do AppSync para preencher estes campos.
    const cmd = buildLabResultUpdate(linha, 'tabela');
    expect(cmd.ExpressionAttributeValues?.[':__typename']).toBe('LabResult');
    expect(cmd.ExpressionAttributeValues?.[':owner']).toBe('sub::username');
  });

  it('createdAt so na primeira gravacao -- reprocessar nao reescreve a data', () => {
    const cmd = buildLabResultUpdate(linha, 'tabela');
    expect(cmd.UpdateExpression).toContain('if_not_exists(#createdAt, :createdAt)');
  });

  it('linha em revisao APAGA o valor em vez de gravar zero', () => {
    // Se uma primeira extracao gravou 32,5 e a segunda nao conseguiu ler,
    // deixar o 32,5 la seria pior que nao ter nada: o numero pareceria atual.
    const cmd = buildLabResultUpdate(
      {
        ...linha,
        value: null,
        referenceLow: null,
        referenceHigh: null,
        reviewStatus: 'PENDENTE_DE_REVISAO',
      },
      'tabela',
    );
    expect(cmd.UpdateExpression).toMatch(/REMOVE .*#value/);
  });

  it('o createdAt entra dentro do SET, e nao gruda no REMOVE', () => {
    // Concatenar no fim da expressao inteira seria bug: quando ha campo nulo a
    // expressao termina em "REMOVE #value", e o createdAt viraria parte do
    // REMOVE -- apagando a data de criacao em vez de preserva-la.
    const cmd = buildLabResultUpdate({ ...linha, value: null }, 'tabela');
    const posSet = cmd.UpdateExpression?.indexOf('if_not_exists') ?? -1;
    const posRemove = cmd.UpdateExpression?.indexOf('REMOVE') ?? -1;
    expect(posSet).toBeGreaterThanOrEqual(0);
    expect(posRemove).toBeGreaterThan(posSet);
  });

  it('nao escreve nenhum campo de interpretacao clinica', () => {
    const nomes = Object.values(buildLabResultUpdate(linha, 'tabela').ExpressionAttributeNames ?? {});
    expect(nomes).toEqual(
      expect.not.arrayContaining(['situacao', 'severidade', 'alterado', 'risco']),
    );
  });
});

describe('separarLinhasGravaveis', () => {
  // Os dois casos abaixo NAO estavam no plano. Os dois foram encontrados
  // rodando a pipeline contra o laudo real do Delboni, e os dois perdem dado
  // EM SILENCIO se ninguem olhar -- que e o modo de falha que a D22 existe
  // para fechar.

  it('tira da gravacao a linha sem codigo, e diz qual era', () => {
    // O laudo real trouxe VPM, SHBG, Testosterona Biodisponivel e Zinco, que
    // nao estao na cobertura de 79 analitos. As quatro sairiam com
    // analyteCode vazio, e as quatro gerariam O MESMO id deterministico --
    // o UpdateCommand gravaria uma e sobrescreveria as outras tres sem
    // levantar erro.
    const semCodigo = { ...linha, analyteCode: '', projectLabel: 'Zinco Sanguineo' };
    const { gravaveis, avisos } = separarLinhasGravaveis([linha, semCodigo]);
    expect(gravaveis).toHaveLength(1);
    expect(gravaveis[0].analyteCode).toBe('62292-8');
    expect(avisos.join(' ')).toContain('Zinco Sanguineo');
  });

  it('manda para revisao as duas linhas quando o mesmo codigo repete no mesmo momento', () => {
    // O modelo rotulou "Neutrofilos" tanto para 3.515 /uL quanto para 63,9 %.
    // Sao dois analitos com codigos LOINC distintos; se ele mapear os dois
    // para um codigo so, o id colide. Nenhuma das duas pode ser gravada como
    // certa, porque nao da para saber qual venceu.
    const a = { ...linha, analyteCode: '26499-4', rawValue: '3.515', rawUnit: '/uL' };
    const b = { ...linha, analyteCode: '26499-4', rawValue: '63,9', rawUnit: '%' };
    const { gravaveis, avisos } = separarLinhasGravaveis([a, b]);
    expect(gravaveis.every((l) => l.reviewStatus === 'PENDENTE_DE_REVISAO')).toBe(true);
    expect(avisos.join(' ')).toMatch(/26499-4/);
  });

  it('nao confunde colisao com curva glicemica, que e o caso legitimo (D22)', () => {
    const jejum = { ...linha, analyteCode: '2345-7', collectionMoment: 'jejum' };
    const em120 = { ...linha, analyteCode: '2345-7', collectionMoment: '120 minutos' };
    const { gravaveis, avisos } = separarLinhasGravaveis([jejum, em120]);
    expect(gravaveis).toHaveLength(2);
    expect(gravaveis.every((l) => l.reviewStatus === 'AUTO')).toBe(true);
    expect(avisos).toEqual([]);
  });
});
