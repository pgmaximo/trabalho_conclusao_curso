/**
 * Releitura de receita (risco 1 do E4): a leitura nova SUBSTITUI os itens da
 * anterior, em vez de se somar a eles.
 *
 * O defeito: o id do item inclui o nome e a dose como o modelo os leu. Uma
 * releitura que le "Losartana 50" onde antes leu "Losartana 50 mg", ou que nao
 * acha mais um remedio, deixava a linha velha no banco -- e o chat a listava
 * como se estivesse na receita.
 *
 * O que estes testes garantem: sai o que a leitura nova nao gravou, menos o
 * que a pessoa conferiu; e o handler grava os novos ANTES de apagar os velhos
 * (uma falha no meio deixa um item a mais, nunca um item sumido), so quando a
 * leitura deu certo, com permissao de consulta no indice dos itens.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { itensDaReceitaParaApagar } from '../regravacaoDaReceita';

describe('itensDaReceitaParaApagar (risco 1 do E4)', () => {
  const DONO = 's-1::u-1';
  const completa = { owner: DONO, leituraCompleta: true };
  const item = (id: string, reviewStatus = 'AUTO', owner = DONO) => ({ id, reviewStatus, owner });

  it('apaga o que a leitura nova nao gravou', () => {
    const existentes = [item('velho-1'), item('mantido'), item('velho-2', 'PENDENTE_DE_REVISAO')];
    expect(itensDaReceitaParaApagar(existentes, new Set(['mantido', 'novo']), completa)).toEqual(['velho-1', 'velho-2']);
  });

  it('o que a pessoa conferiu nao sai, mesmo que a leitura nova nao o tenha achado', () => {
    // Mesmo principio da regravacao dos resultados (Bloco 11): a leitura da
    // maquina nao desfaz o que uma pessoa disse que esta certo.
    expect(itensDaReceitaParaApagar([item('conferido', 'CONFIRMADO_PELO_USUARIO')], new Set(['novo']), completa)).toEqual([]);
  });

  it('primeira leitura: nada a apagar', () => {
    expect(itensDaReceitaParaApagar([], new Set(['novo']), completa)).toEqual([]);
  });

  it('PDF lido pela metade: nada sai, porque o que faltou pode estar nas paginas que falharam (revisao)', () => {
    expect(
      itensDaReceitaParaApagar([item('pagina-2')], new Set(['pagina-1']), { owner: DONO, leituraCompleta: false }),
    ).toEqual([]);
  });

  it('leitura nova sem item de receita: nada sai (como no NO_RESULTS)', () => {
    expect(itensDaReceitaParaApagar([item('velho')], new Set(), completa)).toEqual([]);
  });

  it('so apaga item do dono do documento (revisao)', () => {
    // O indice e por documentId, e qualquer pessoa pode gravar um item com o
    // documentId de outra. A limpeza nunca toca linha de outro dono.
    expect(itensDaReceitaParaApagar([item('alheio', 'AUTO', 'outro::outro'), item('sem-dono', 'AUTO', '')], new Set(['novo']), completa)).toEqual([]);
  });
});

describe('o handler substitui os itens da receita na releitura (risco 1 do E4)', () => {
  const handler = readFileSync(join(__dirname, '..', 'handler.ts'), 'utf8');
  const backend = readFileSync(join(__dirname, '..', '..', '..', 'backend.ts'), 'utf8');

  it('grava os novos ANTES de apagar os velhos, e antes de marcar a leitura como concluida', () => {
    const gravar = handler.indexOf('await putPrescriptionItems(');
    const apagar = handler.search(/await apagarLinhas\(\s*ddb,\s*prescriptionTable,/);
    const concluir = handler.indexOf('await markSucceeded(');
    expect(gravar).toBeGreaterThan(-1);
    expect(apagar).toBeGreaterThan(gravar);
    expect(concluir).toBeGreaterThan(apagar);
  });

  it('a limpeza recebe o dono do documento e se a leitura foi completa (todas as partes do PDF)', () => {
    expect(handler).toMatch(/itensDaReceitaParaApagar\(existentes, [^)]*\{ owner, leituraCompleta: partesQueFalharam === 0 \}\)/);
    expect(handler).toMatch(/partesQueFalharam = leituras\.filter\(\(l\) => !l\.saida\.ok\)\.length/);
  });

  it('a lista dos itens existentes sai do indice por documento da tabela de itens', () => {
    expect(handler).toMatch(/listarItensDaReceita\(ddb, prescriptionTable, documentId\)/);
    const repositorio = readFileSync(join(__dirname, '..', 'resultRepository.ts'), 'utf8');
    expect(repositorio).toContain("'prescriptionItemsByDocumentId'");
    const outputs = readFileSync(join(__dirname, '..', '..', '..', '..', 'amplify_outputs.json'), 'utf8');
    expect(outputs).toContain('prescriptionItemsByDocumentId');
  });

  it('a extracao pode consultar os indices da tabela de itens', () => {
    expect(backend).toMatch(
      /extractDocumentDataLambda\.addToRolePolicy\(\s*new iam\.PolicyStatement\(\{\s*actions: \['dynamodb:Query'\],\s*resources: \[`\$\{prescriptionItemTable\.tableArn\}\/index\/\*`\],/,
    );
  });
});
