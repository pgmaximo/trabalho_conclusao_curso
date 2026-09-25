/**
 * Resumo do arquivo:
 * A UNICA porta pela qual as funcoes abrem um arquivo do bucket: le, confere que
 * o objeto e do dono esperado, e so entao entrega os bytes (D46).
 *
 * Por que existe (achado de 2026-09-24): a chave que as funcoes leem e escolhida
 * pelo cliente, e o papel delas alcanca o prefixo inteiro. A conferencia de
 * FORMA (`chaveDoDocumento`, `chaveDeAnexoValida`) deixa passar a chave do laudo
 * de outra pessoa, que tem a forma certa. O que fecha a POSSE e o metadado que
 * o aplicativo grava no envio -- ver `amplify/storage/metadadoDoDono.ts`, que
 * explica por que ele e confiavel.
 *
 * Usada pela extracao (o dono vem do `owner` da linha) e pelo anexo do chat (o
 * dono vem do token). Mora fora dos handlers para ser testada: o `handler.ts`
 * da extracao nao tem suite.
 */
import { conferirDono, type ConferenciaDoDono } from '../../storage/metadadoDoDono';

import { readDocument } from './s3Reader';

export type RecusaDoDono = Exclude<ConferenciaDoDono, 'confere'>;

export type ArquivoDoDono = { ok: true; bytes: Uint8Array } | { ok: false; motivo: RecusaDoDono };

/**
 * Erro de leitura do S3 PROPAGA: engolir aqui transformaria uma chave
 * inexistente em "arquivo de outra pessoa", e a copy pediria o reenvio de um
 * arquivo que talvez nem exista. Cada chamador ja trata o erro do seu jeito.
 */
export async function lerArquivoDoDono(
  bucket: string,
  key: string,
  subEsperado: string | null,
): Promise<ArquivoDoDono> {
  // Sem dono esperado nao ha o que conferir, e nao ha por que abrir o objeto.
  if (!subEsperado) return { ok: false, motivo: 'sem-dono-esperado' };

  const { bytes, metadados } = await readDocument(bucket, key);
  const conferencia = conferirDono(metadados, subEsperado);
  if (conferencia !== 'confere') return { ok: false, motivo: conferencia };

  return { ok: true, bytes };
}
