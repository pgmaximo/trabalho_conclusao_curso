/**
 * O defeito que estes testes travam foi encontrado em 2026-09-18, contra o
 * ambiente de verdade, com um laudo real na tela -- e nao por teste.
 *
 * A Lambda montava a chave do S3 a partir do `owner`, assim:
 *
 *     const identityId = owner.split('::')[0];
 *
 * A variavel se chamava `identityId` e NAO guardava um identityId. O `owner` do
 * Amplify Data e `<sub do pool de USUARIOS>::<username>`; a pasta do S3 e
 * nomeada pelo `identityId` do pool de IDENTIDADES, que e outro identificador,
 * emitido por outro servico, e com outra forma -- ele comeca com a regiao.
 *
 * Os dois sao UUID e os dois pertencem a mesma pessoa, e foi so por isso que o
 * defeito passou por revisao: a linha LE como se estivesse certa.
 *
 * Medido no ambiente, e e o par que estes testes usam:
 *   o arquivo esta em  medical-documents/us-east-1:5648ad4c-.../exams/<nome>
 *   a Lambda procurava  medical-documents/74a8f418-c0a1-.../exams/<nome>
 *
 * Consequencia: `NoSuchKey`, quatro vezes (tres do reenvio automatico, uma do
 * "Tentar de novo"), e a tela dizendo "nao conseguimos ler o conteudo deste
 * documento" -- uma mensagem sobre o CONTEUDO para um arquivo que nunca foi
 * aberto.
 */
import { MAXIMO_DE_FOLHAS, chaveDoDocumento, chavesDasFolhas } from '../documentKey';

/** Pool de IDENTIDADES: e o que nomeia a pasta. Repare no prefixo de regiao. */
const IDENTITY_ID = 'us-east-1:5648ad4c-7d8f-c7c3-0980-fe0fc91139f5';
/** Pool de USUARIOS: e o que o `owner` carrega. Nao nomeia pasta nenhuma. */
const SUB = '74a8f418-c0a1-702e-a611-2728b324d20f';

const OWNER = `${SUB}::${SUB}`;
const NOME = 'exams/cbe7cbc1-a7f9-4e86-b687-10b486744bd6-1789750584876.pdf';
const CHAVE_REAL = `medical-documents/${IDENTITY_ID}/${NOME}`;

describe('chaveDoDocumento', () => {
  it('devolve a chave que o upload gravou, sem remontar nada', () => {
    expect(chaveDoDocumento({ owner: OWNER, s3FileName: NOME, s3Key: CHAVE_REAL })).toBe(
      CHAVE_REAL,
    );
  });

  it('nao monta chave a partir do owner: o sub do pool de usuarios nao e o identityId', () => {
    // Sem `s3Key` nao ha como saber a pasta, e ADIVINHAR e o proprio defeito.
    // Nulo aqui vira uma falha com motivo, em vez de um NoSuchKey confuso.
    expect(chaveDoDocumento({ owner: OWNER, s3FileName: NOME })).toBeNull();
  });

  it('trata s3Key vazia ou nula como ausente', () => {
    expect(chaveDoDocumento({ owner: OWNER, s3FileName: NOME, s3Key: null })).toBeNull();
    expect(chaveDoDocumento({ owner: OWNER, s3FileName: NOME, s3Key: '   ' })).toBeNull();
  });

  it('nunca devolve uma chave fora da pasta de documentos', () => {
    // A chave vem do banco, e o banco e escrito pelo cliente. Uma chave
    // apontando para outro prefixo -- ou subindo de pasta -- leria arquivo que
    // esta funcao nao tem por que abrir. Mesma conferencia de FORMA que o
    // `chaveDeAnexoValida` do chat faz.
    expect(
      chaveDoDocumento({ owner: OWNER, s3FileName: NOME, s3Key: 'chat-attachments/x/y.pdf' }),
    ).toBeNull();
    expect(
      chaveDoDocumento({
        owner: OWNER,
        s3FileName: NOME,
        s3Key: `medical-documents/${IDENTITY_ID}/../../outro/x.pdf`,
      }),
    ).toBeNull();
  });
});

/**
 * Bloco 11 -- o laudo de varias folhas (E6, Decisao O1). A folha 1 continua
 * sendo `s3Key`; as outras vem em `extraPageKeys`. Cada folha extra passa a
 * MESMA conferencia de forma da primeira, e tem de estar na MESMA pasta dela:
 * uma folha apontando para outra pasta leria arquivo de outro lugar.
 */
describe('chavesDasFolhas', () => {
  const folha = (n: number) => `medical-documents/${IDENTITY_ID}/exams/folha-${n}.jpg`;
  const base = { owner: OWNER, s3FileName: NOME, s3Key: folha(1) };

  it('documento sem folhas extras e a folha 1 so -- como todo documento antigo', () => {
    expect(chavesDasFolhas(base)).toEqual([folha(1)]);
    expect(chavesDasFolhas({ ...base, extraPageKeys: null })).toEqual([folha(1)]);
    expect(chavesDasFolhas({ ...base, extraPageKeys: [] })).toEqual([folha(1)]);
  });

  it('as folhas extras vem depois da primeira, na ordem gravada', () => {
    expect(chavesDasFolhas({ ...base, extraPageKeys: [folha(2), folha(3)] })).toEqual([
      folha(1),
      folha(2),
      folha(3),
    ]);
  });

  it('entrada vazia ou nula na lista e ignorada', () => {
    expect(chavesDasFolhas({ ...base, extraPageKeys: [folha(2), null, '  '] })).toEqual([
      folha(1),
      folha(2),
    ]);
  });

  it('folha de OUTRA pasta invalida o documento inteiro', () => {
    const deOutraPessoa = `medical-documents/us-east-1:outra-identidade/exams/x.jpg`;
    expect(chavesDasFolhas({ ...base, extraPageKeys: [folha(2), deOutraPessoa] })).toBeNull();
  });

  it('folha com ".." ou fora do prefixo invalida o documento inteiro', () => {
    expect(
      chavesDasFolhas({ ...base, extraPageKeys: [`medical-documents/${IDENTITY_ID}/exams/../../x.jpg`] }),
    ).toBeNull();
    expect(chavesDasFolhas({ ...base, extraPageKeys: ['chat-attachments/x/y.jpg'] })).toBeNull();
    // Mesma pasta, e ainda assim ".." -- so a conferencia de forma pega.
    expect(
      chavesDasFolhas({ ...base, extraPageKeys: [`medical-documents/${IDENTITY_ID}/exams/..`] }),
    ).toBeNull();
  });

  it(`mais de ${MAXIMO_DE_FOLHAS} folhas invalida o documento`, () => {
    const extras = Array.from({ length: MAXIMO_DE_FOLHAS }, (_, i) => folha(i + 2));
    expect(chavesDasFolhas({ ...base, extraPageKeys: extras.slice(0, MAXIMO_DE_FOLHAS - 1) })).toHaveLength(
      MAXIMO_DE_FOLHAS,
    );
    expect(chavesDasFolhas({ ...base, extraPageKeys: extras })).toBeNull();
  });

  it('sem a folha 1, nao ha documento -- como hoje', () => {
    expect(chavesDasFolhas({ owner: OWNER, s3FileName: NOME, extraPageKeys: [folha(2)] })).toBeNull();
  });
});
