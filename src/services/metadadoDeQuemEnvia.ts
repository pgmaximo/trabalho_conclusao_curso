/**
 * Resumo do arquivo:
 * O metadado de objeto que todo arquivo enviado ao bucket leva: o `sub` de quem
 * enviou (D46). As funcoes de extracao e de conversa so leem o arquivo cujo
 * metadado bate com o dono -- sem isto, elas recusam todo envio novo.
 *
 * Por que `getCurrentUser()` e nao o `getUserId()` de `userSessionService`: o
 * `getUserId` le primeiro um cache do AsyncStorage, e um cache de outra sessao
 * gravaria o `sub` errado -- o documento da PROPRIA pessoa falharia. O
 * `getCurrentUser()` le o token corrente, e o `userId` dele e o `sub`, o mesmo
 * que o `owner` da linha carrega antes do `::`.
 *
 * Modulo separado de `upload.ts` porque o anexo do chat nao passa pelo
 * `uploadFileToS3`, e importar `upload.ts` so por isto traria o
 * `expo-file-system` para o servico do chat.
 */
import { getCurrentUser } from 'aws-amplify/auth';

import { METADADO_DO_DONO } from '../../amplify/storage/metadadoDoDono';

export async function metadadosDeQuemEnvia(): Promise<Record<string, string>> {
  const { userId } = await getCurrentUser();
  return { [METADADO_DO_DONO]: userId };
}
