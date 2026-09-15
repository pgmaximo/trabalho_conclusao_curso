/**
 * Resumo do arquivo:
 * Upload de um arquivo local para o S3 via Amplify Storage — extraído de
 * `examService.ts` (era `uploadFileToS3`, privada) para ser reaproveitado
 * também por `healthImportService.ts`. Mesma lógica, sem alterações de
 * comportamento: branch web (fetch do blob URI) vs. nativo (leitura em
 * base64), depois `uploadData` com a forma de função (`{ identityId }`) —
 * obrigatória porque `{owner}` NÃO é substituído pelo Amplify Storage, só
 * `{entity_id}` é (ver amplify/storage/resource.ts).
 */

import { uploadData } from 'aws-amplify/storage';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Faz upload de um arquivo local (URI do document picker) para o S3.
 * `buildPath` recebe `{ identityId }` resolvido pelo Amplify e monta a
 * chave completa — cada chamador decide o prefixo (`medical-documents/...`,
 * `health-imports/...`).
 */
export async function uploadFileToS3(
  filePath: string,
  buildPath: (args: { identityId?: string }) => string,
): Promise<string> {
  try {
    let blobData: Blob;

    if (Platform.OS === 'web') {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      blobData = await response.blob();
    } else {
      const base64Data = await readAsStringAsync(filePath, {
        encoding: EncodingType.Base64,
      });

      const response = await fetch(`data:application/octet-stream;base64,${base64Data}`);
      blobData = await response.blob();
    }

    const result = await uploadData({
      path: buildPath,
      data: blobData,
    }).result;

    console.log(`Arquivo enviado para S3: ${result.path}`);
    return result.path;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo';
    throw new Error(`Falha no upload para S3: ${message}`);
  }
}
