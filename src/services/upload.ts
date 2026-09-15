/**
 * Resumo do arquivo:
 * Upload de um arquivo local para o S3 via Amplify Storage — extraído de
 * `examService.ts` (era `uploadFileToS3`, privada) para ser reaproveitado
 * também por `healthImportService.ts`. Branch web (fetch do blob URI) vs.
 * nativo (`File.bytes()`), depois `uploadData` com a forma de função
 * (`{ identityId }`) — obrigatória porque `{owner}` NÃO é substituído pelo
 * Amplify Storage, só `{entity_id}` é (ver amplify/storage/resource.ts).
 */

import { uploadData } from 'aws-amplify/storage';
import { File } from 'expo-file-system';
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
    let data: Blob | Uint8Array;

    if (Platform.OS === 'web') {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      data = await response.blob();
    } else {
      // `File.bytes()` le os bytes crus direto do disco (`Uint8Array`), sem
      // passar por base64: uma string base64 em JS/Hermes ocupa o DOBRO do
      // espaco (UTF-16, 2 bytes por caractere), entao um arquivo de ~75 MB
      // vira uma string de ~200 MB so para depois ser decodificada de volta
      // em Blob — foi exatamente essa alocacao unica que estourou o heap do
      // Android (OutOfMemoryError) ao importar um export .zip de wearable.
      data = await new File(filePath).bytes();
    }

    const result = await uploadData({
      path: buildPath,
      data,
    }).result;

    console.log(`Arquivo enviado para S3: ${result.path}`);
    return result.path;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer upload do arquivo';
    throw new Error(`Falha no upload para S3: ${message}`);
  }
}
