/**
 * O contrato entre quem ENVIA o arquivo (o aplicativo) e quem o LE (as funcoes
 * de extracao e de conversa). Achado de seguranca de 2026-09-24, spec em
 * `specs/09-seguranca/posse-do-arquivo/`.
 *
 * As funcoes tem leitura no prefixo inteiro do bucket, e a chave que elas leem
 * e escolhida pelo cliente. Sem esta conferencia, a pessoa A apontava a chave
 * para o laudo de B e a funcao o lia. O metadado e confiavel porque so o dono
 * escreve na propria pasta: o que esta no objeto de B foi escrito por B.
 */
import { METADADO_DO_DONO, conferirDono } from '../metadadoDoDono';

const SUB_A = '74a8f418-c0a1-702e-a611-2728b324d20f';
const SUB_B = '0c4f2e9a-5b1d-4d7e-9f3a-8e6b2a1c9d00';

describe('METADADO_DO_DONO', () => {
  it('e minusculo, so letras, digitos e hifen', () => {
    // O S3 grava a chave de metadado em minusculas. Um nome com maiuscula
    // seria salvo de um jeito e procurado de outro, e TODO documento real
    // falharia -- enquanto todo teste com duble passaria.
    expect(METADADO_DO_DONO).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('conferirDono', () => {
  it('confere quando o metadado e o sub esperado', () => {
    expect(conferirDono({ [METADADO_DO_DONO]: SUB_A }, SUB_A)).toBe('confere');
  });

  it('recusa o arquivo de OUTRA pessoa -- o achado', () => {
    // A pede a leitura; o objeto esta na pasta de B, e quem o gravou foi B.
    expect(conferirDono({ [METADADO_DO_DONO]: SUB_B }, SUB_A)).toBe('outro-dono');
  });

  it('recusa objeto sem o metadado, que e o objeto enviado antes desta EPIC', () => {
    expect(conferirDono({}, SUB_A)).toBe('sem-metadado');
    expect(conferirDono(undefined, SUB_A)).toBe('sem-metadado');
    expect(conferirDono({ [METADADO_DO_DONO]: '' }, SUB_A)).toBe('sem-metadado');
  });

  it('recusa quando nao ha dono esperado, em vez de aceitar qualquer um', () => {
    // O `owner` malformado da linha vira nulo. "Ninguem esperado" nao pode
    // significar "qualquer um serve" -- nem quando o objeto tambem nao tem dono.
    expect(conferirDono({ [METADADO_DO_DONO]: SUB_A }, null)).toBe('sem-dono-esperado');
    expect(conferirDono({ [METADADO_DO_DONO]: '' }, '')).toBe('sem-dono-esperado');
    expect(conferirDono({}, '')).toBe('sem-dono-esperado');
  });

  it('compara exato: nao normaliza caixa nem espaco', () => {
    // O sub e UUID minusculo dos dois lados. Normalizar aqui esconderia um
    // erro de quem escreveu o metadado.
    expect(conferirDono({ [METADADO_DO_DONO]: SUB_A.toUpperCase() }, SUB_A)).toBe('outro-dono');
    expect(conferirDono({ [METADADO_DO_DONO]: ` ${SUB_A}` }, SUB_A)).toBe('outro-dono');
  });
});
