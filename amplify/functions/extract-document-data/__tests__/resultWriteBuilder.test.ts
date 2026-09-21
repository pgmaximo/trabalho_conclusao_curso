import { ANALYTE_CATALOG } from '../analyteCatalog';
import { buildLabResultUpdate, separarLinhasGravaveis } from '../resultWriteBuilder';

// D27: nenhum codigo LOINC digitado a mao, nem como exemplo em teste. Codigo e
// nome oficial saem do catalogo gerado a partir do extrato do LOINC, buscados
// pelo rotulo em portugues -- que e campo nosso e pode ser digitado.
const doCatalogo = (rotulo: string) => {
  const achado = ANALYTE_CATALOG.find((a) => a.projectLabel === rotulo);
  if (!achado) throw new Error(`Analito "${rotulo}" nao esta no catalogo gerado.`);
  return achado;
};

const VITAMINA_D = doCatalogo('Vitamina D (25-OH)');
const GLICOSE = doCatalogo('Glicose');
// Dois analitos distintos com o mesmo rotulo no laudo -- ver o caso de colisao
// mais abaixo.
const NEUTROFILOS_ABSOLUTO = doCatalogo('Neutrofilos (absoluto)');

const linha = {
  id: 'a3f1', // saida de labResultId (tarefa 6), sha256 em hex
  owner: 'sub::username',
  documentId: 'doc-1',
  analyteCode: VITAMINA_D.code,
  analyteLabel: VITAMINA_D.label,
  projectLabel: VITAMINA_D.projectLabel,
  value: 32.5,
  valueQualifier: null,
  unit: 'ng/mL',
  rawValue: '32,5',
  rawUnit: 'ng/mL',
  referenceLow: 30,
  referenceHigh: 100,
  rawReferenceText: null,
  collectedAt: '2026-03-12',
  collectionMoment: null,
  sourcePage: 2,
  confidence: 0.94,
  reviewStatus: 'AUTO' as const,
};

describe('buildLabResultUpdate', () => {
  it('grava a faixa em texto, e reprocessar PREENCHE linha antiga sem duplicar (F1)', () => {
    // A linha gravada antes do campo existir tem `rawReferenceText` vazio. A
    // segunda passagem do mesmo arquivo gera a MESMA chave -- o id e
    // deterministico -- e o UpdateCommand completa o que faltava, em vez de
    // criar uma linha nova ao lado. A idempotencia ja foi medida contra o
    // servico real em 2026-09-19 (46 linhas -> 48, zero duplicadas).
    const tabela = 'Desejavel: menor que 100 mg/dL; Limitrofe: 100 a 129 mg/dL';
    const comTexto = { ...linha, referenceLow: null, referenceHigh: null, rawReferenceText: tabela };

    const antes = buildLabResultUpdate(linha, 'tabela');
    const depois = buildLabResultUpdate(comTexto, 'tabela');

    expect(depois.ExpressionAttributeValues?.[':rawReferenceText']).toBe(tabela);
    expect(depois.Key).toEqual(antes.Key);
  });

  it('faixa em texto ausente APAGA o campo, em vez de deixar texto velho (F1)', () => {
    // Mesma regra do valor (D29): a segunda passagem manda o que leu agora. Um
    // texto de faixa que sobrevivesse a uma releitura que nao o encontrou
    // ficaria na tela parecendo atual.
    const cmd = buildLabResultUpdate({ ...linha, rawReferenceText: null }, 'tabela');
    expect(cmd.UpdateExpression).toMatch(/REMOVE .*#rawReferenceText/);
  });

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

  it('GRAVA a linha de codigo local, em vez de descarta-la (D32)', () => {
    // O laudo real trouxe VPM, SHBG, Testosterona Biodisponivel e Zinco, fora
    // da cobertura de 79 analitos. No fim do Bloco B elas eram descartadas --
    // e isso era resolver uma colisao de chave jogando dado do usuario fora.
    // Agora chegam aqui com codigo local, e codigo local e codigo: passa.
    const zinco = {
      ...linha,
      analyteCode: 'X-ZINCO-SANGUINEO',
      projectLabel: 'Zinco Sanguineo',
    };
    const { gravaveis, avisos } = separarLinhasGravaveis([linha, zinco]);
    expect(gravaveis).toHaveLength(2);
    expect(gravaveis.map((l) => l.analyteCode)).toContain('X-ZINCO-SANGUINEO');
    expect(avisos).toEqual([]);
  });

  it('so fica de fora a linha cujo ROTULO nao identifica analito nenhum', () => {
    // Residuo da D32, e o unico. Sem codigo o id deterministico de duas
    // linhas assim seria O MESMO, e o UpdateCommand gravaria uma
    // sobrescrevendo a outra sem levantar erro. O motivo mudou -- nao e mais
    // "fora do catalogo", e sim "nao deu para identificar o que e".
    const ilegivel = { ...linha, analyteCode: '', rawValue: '85', projectLabel: '—' };
    const { gravaveis, avisos } = separarLinhasGravaveis([linha, ilegivel]);
    expect(gravaveis).toHaveLength(1);
    expect(gravaveis[0].analyteCode).toBe(VITAMINA_D.code);
    // O aviso precisa dizer o que estava escrito, senao a pessoa nao tem como
    // saber o que o papel tem a mais do que a tela mostra.
    expect(avisos.join(' ')).toContain('85');
    expect(avisos.join(' ')).not.toContain('catálogo');
  });

  it('manda para revisao as duas linhas quando o mesmo codigo repete no mesmo momento', () => {
    // O modelo rotulou "Neutrofilos" tanto para 3.515 /uL quanto para 63,9 %.
    // Sao dois analitos com codigos LOINC distintos; se ele mapear os dois
    // para um codigo so, o id colide. Nenhuma das duas pode ser gravada como
    // certa, porque nao da para saber qual venceu.
    const a = { ...linha, analyteCode: NEUTROFILOS_ABSOLUTO.code, rawValue: '3.515', rawUnit: '/uL' };
    const b = { ...linha, analyteCode: NEUTROFILOS_ABSOLUTO.code, rawValue: '63,9', rawUnit: '%' };
    const { gravaveis, avisos } = separarLinhasGravaveis([a, b]);
    expect(gravaveis.every((l) => l.reviewStatus === 'PENDENTE_DE_REVISAO')).toBe(true);
    expect(avisos.join(' ')).toContain(NEUTROFILOS_ABSOLUTO.code);
  });

  it('nao confunde colisao com curva glicemica, que e o caso legitimo (D22)', () => {
    const jejum = { ...linha, analyteCode: GLICOSE.code, collectionMoment: 'jejum' };
    const em120 = { ...linha, analyteCode: GLICOSE.code, collectionMoment: '120 minutos' };
    const { gravaveis, avisos } = separarLinhasGravaveis([jejum, em120]);
    expect(gravaveis).toHaveLength(2);
    expect(gravaveis.every((l) => l.reviewStatus === 'AUTO')).toBe(true);
    expect(avisos).toEqual([]);
  });
});
