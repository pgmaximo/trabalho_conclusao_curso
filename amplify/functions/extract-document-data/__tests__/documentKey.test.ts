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
import { chaveDoDocumento, subDoOwner } from '../documentKey';

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
 * D46 (2026-09-24): a funcao confere que o arquivo e do dono da linha, e o dono
 * que ela conhece e o `sub`. A operacao e a mesma linha do defeito acima --
 * a metade antes do `::` --, e desta vez o nome diz o que ela guarda.
 */
describe('subDoOwner', () => {
  it('devolve o sub do pool de usuarios', () => {
    expect(subDoOwner(OWNER)).toBe(SUB);
    expect(subDoOwner(`${SUB}::pedro`)).toBe(SUB);
  });

  it('nunca devolve um identityId -- o par medido do defeito de 2026-09-18', () => {
    expect(subDoOwner(OWNER)).not.toBe(IDENTITY_ID);
    expect(subDoOwner(OWNER)).not.toMatch(/^[a-z]{2}-[a-z]+-\d+:/);
  });

  it('owner malformado nao tem sub: nulo, e nao a string inteira', () => {
    // Nulo vira recusa na conferencia de dono. Devolver o owner inteiro, ou
    // um pedaco vazio, faria a comparacao falhar por um motivo que ninguem
    // leria no log.
    expect(subDoOwner(SUB)).toBeNull();
    expect(subDoOwner(`::${SUB}`)).toBeNull();
    expect(subDoOwner('')).toBeNull();
  });
});
