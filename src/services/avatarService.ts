/**
 * Resumo do arquivo:
 * Upload/leitura da foto de perfil no Amplify Storage (S3), reaproveitando o
 * mesmo padrao ja usado para documentos medicos em `examService.ts`
 * (`uploadData`/`getUrl` de `aws-amplify/storage`) — regra 3 da constituicao.
 */
import { getUrl, uploadData } from 'aws-amplify/storage';
import { Platform } from 'react-native';

const AVATAR_FILE_NAME = 'profile.jpg';

/**
 * Envia a foto de perfil para o Storage e retorna a key persistida em
 * `UserProfile.photoKey`. A key e fixa por usuario (sempre sobrescreve a
 * mesma foto) — nao ha historico de fotos antigas.
 */
export async function uploadAvatarPhoto(localUri: string): Promise<string> {
  let blobData: Blob;

  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    if (!response.ok) {
      throw new Error(`Falha ao ler a imagem selecionada: ${response.statusText}`);
    }
    blobData = await response.blob();
  } else {
    const response = await fetch(localUri);
    blobData = await response.blob();
  }

  try {
    // `{owner}` NÃO é um token substituído pelo Amplify Storage (só `{entity_id}`
    // é) — usar a forma de função com `identityId` isola a foto por usuário (ver
    // amplify/storage/resource.ts, regra `avatars/{entity_id}/*`). Diferente da
    // versão anterior (que persistia um template `{owner}` nunca resolvido, e por
    // isso todo mundo sobrescrevia o mesmo arquivo), agora persistimos a key já
    // resolvida (`result.path`), igual ao padrão de `examService.ts`.
    const result = await uploadData({
      path: ({ identityId }) => `avatars/${identityId}/${AVATAR_FILE_NAME}`,
      data: blobData,
      options: { contentType: 'image/jpeg' },
    }).result;

    return result.path;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao fazer upload da foto';
    throw new Error(`Falha no upload da foto de perfil: ${message}`);
  }
}

/**
 * Resolve a URL assinada (temporaria) de exibicao a partir da key persistida.
 * Nunca persistir o retorno desta funcao — apenas a key (`photoKey`) e
 * estavel; a URL expira.
 */
export async function getAvatarDisplayUrl(photoKey: string): Promise<string> {
  const result = await getUrl({ path: photoKey });
  return result.url.toString();
}
