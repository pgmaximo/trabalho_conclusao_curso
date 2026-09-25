/**
 * Resumo do arquivo:
 * Sobe um anexo pontual da conversa para o bucket, sob `chat-attachments/`.
 *
 * A pasta e SEPARADA de `medical-documents/` de proposito, e nao por
 * organizacao: o que esta em `medical-documents/` faz parte do historico da
 * pessoa e tem uma linha em `MedicalDocument` apontando para ele. O que esta
 * aqui nao tem linha nenhuma -- ele existe para uma pergunta, e some do
 * assunto quando a conversa acaba (D15).
 *
 * NADA aqui grava dado clinico. Nem `MedicalDocument`, nem `LabResult`.
 */
import { uploadData } from 'aws-amplify/storage';

import { prepararArquivoParaEnvio } from '@/services/imagemParaEnvio';
import { metadadosDeQuemEnvia } from '@/services/metadadoDeQuemEnvia';

export type AnexoDoChat = {
  /** A chave completa no bucket, que e o que vai para a funcao. */
  key: string;
  /** O nome que a pessoa escolheu, so para a tela mostrar. */
  fileName: string;
};

function extensao(nome: string): string {
  const ponto = nome.lastIndexOf('.');
  return ponto > 0 ? nome.slice(ponto) : '';
}

export async function uploadAnexoDoChat(
  uri: string,
  fileName: string,
  contentType?: string,
): Promise<AnexoDoChat> {
  // A foto encolhe e vira JPEG antes de subir (G2, Bloco 10): o anexo vai ao
  // mesmo bloco de imagem da extracao, com o mesmo teto de 3,75 MB. PDF passa
  // intacto.
  const preparado = await prepararArquivoParaEnvio({ filePath: uri, fileName, fileSize: 0 });
  const virouJpeg = preparado.fileName !== fileName;

  const resposta = await fetch(preparado.filePath);
  const blob = await resposta.blob();

  // Nome unico por envio: dois anexos com o mesmo nome em conversas
  // diferentes nao podem se sobrescrever.
  const nomeNoBucket = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extensao(preparado.fileName)}`;
  const tipo = virouJpeg ? 'image/jpeg' : (contentType ?? blob.type ?? 'application/octet-stream');

  const enviado = await uploadData({
    // `{entity_id}` e substituido pelo identityId de quem esta autenticado --
    // e o que mantem o anexo de cada pessoa na propria pasta.
    path: ({ identityId }) => `chat-attachments/${identityId}/${nomeNoBucket}`,
    data: blob,
    // O `sub` de quem enviou (D46): a funcao do chat so le o anexo cujo
    // metadado bate com o `sub` do token de quem pergunta.
    options: { contentType: tipo, metadata: await metadadosDeQuemEnvia() },
  }).result;

  return { key: enviado.path, fileName };
}
