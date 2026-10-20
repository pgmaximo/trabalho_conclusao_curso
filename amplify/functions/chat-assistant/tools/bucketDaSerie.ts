/**
 * Resumo do arquivo:
 * O unico ponto do chat que fala com o S3 para ler a serie do wearable (E6).
 * Ele so sabe baixar texto com teto de tamanho; QUAL chave pode ser lida e
 * decidido pela porta do dono (`lerSerieDaImportacao`, em
 * `ownerScopedRead.ts`), a unica que importa este modulo (ha teste de varredura
 * para isso).
 *
 * O SDK e carregado DENTRO da funcao, com `require`, e nao no topo: o
 * `@aws-sdk/client-s3` quebra no jest do projeto (ESM, plan.md do E6, secao 6),
 * e um import no topo derrubaria toda suite que carrega a lista de ferramentas.
 * `require`, e nao `import()`: o jest do projeto nao executa import dinamico
 * (achado da revisao do E6), e o esbuild do Amplify empacota os dois do mesmo
 * jeito.
 */
type ModuloS3 = typeof import('@aws-sdk/client-s3');

let s3: { modulo: ModuloS3; cliente: InstanceType<ModuloS3['S3Client']> } | null = null;

function clienteS3() {
  if (!s3) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga sob demanda, ver o cabecalho
    const modulo = require('@aws-sdk/client-s3') as ModuloS3;
    s3 = { modulo, cliente: new modulo.S3Client({ maxAttempts: 3 }) };
  }
  return s3;
}

/**
 * O objeto como texto, ou `null` quando ele nao existe, esta vazio ou passa do
 * teto. O teto e conferido pelo tamanho que o S3 declara, ANTES de ler o corpo:
 * um arquivo enorme nao chega a ocupar a memoria do conteiner. Sem tamanho
 * declarado, falha FECHADO (revisao do E6): ler "para ver" e justamente o que o
 * teto existe para evitar. Outro erro do S3 propaga -- quem decide o que fazer
 * com ele e a porta.
 */
export async function baixarTextoDoBucket(bucket: string, key: string, tetoBytes: number): Promise<string | null> {
  const { modulo, cliente } = clienteS3();
  let resposta;
  try {
    resposta = await cliente.send(new modulo.GetObjectCommand({ Bucket: bucket, Key: key }));
  } catch (erro) {
    if ((erro as { name?: string })?.name === 'NoSuchKey') return null;
    throw erro;
  }
  const corpo = resposta.Body;
  if (!corpo) return null;
  if (typeof resposta.ContentLength !== 'number' || resposta.ContentLength > tetoBytes) {
    (corpo as { destroy?: () => void }).destroy?.();
    return null;
  }
  return corpo.transformToString();
}
