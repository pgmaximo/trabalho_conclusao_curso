/**
 * Resumo do arquivo:
 * A conferencia "tudo continua funcionando" do script de implantacao da
 * pesquisa (scripts/pesquisa/conferencias.mjs). Antes e depois de criar a stack
 * nova, o script fotografa o estado das stacks `amplify-*` (o backend do app em
 * producao e o sandbox) e esta funcao diz se alguma mudou. Se mudou, a
 * implantacao falha em voz alta em vez de seguir como se nada tivesse
 * acontecido.
 */
import { diferencasDasStacks } from '../scripts/pesquisa/conferencias.mjs';

const ANTES = {
  'amplify-d1wsv2b9ntb67b-main-branch-892cc32d5d': 'UPDATE_COMPLETE',
  'amplify-tcc-artur-sandbox-16e78b8e8b': 'CREATE_COMPLETE',
};

describe('diferencasDasStacks', () => {
  it('nao acusa nada quando as stacks sao as mesmas, na ordem que for', () => {
    expect(diferencasDasStacks(ANTES, { ...ANTES })).toEqual([]);
    expect(diferencasDasStacks(ANTES, Object.fromEntries(Object.entries(ANTES).reverse()))).toEqual([]);
  });

  it('acusa uma stack cujo estado mudou', () => {
    const depois = { ...ANTES, 'amplify-tcc-artur-sandbox-16e78b8e8b': 'UPDATE_IN_PROGRESS' };
    expect(diferencasDasStacks(ANTES, depois)).toEqual([
      'amplify-tcc-artur-sandbox-16e78b8e8b: CREATE_COMPLETE passou a UPDATE_IN_PROGRESS',
    ]);
  });

  it('acusa uma stack que sumiu e uma que apareceu', () => {
    const depois = { 'amplify-d1wsv2b9ntb67b-main-branch-892cc32d5d': 'UPDATE_COMPLETE', 'amplify-nova': 'CREATE_COMPLETE' };
    expect(diferencasDasStacks(ANTES, depois).sort()).toEqual([
      'amplify-nova: apareceu (CREATE_COMPLETE)',
      'amplify-tcc-artur-sandbox-16e78b8e8b: sumiu (estava CREATE_COMPLETE)',
    ]);
  });
});
