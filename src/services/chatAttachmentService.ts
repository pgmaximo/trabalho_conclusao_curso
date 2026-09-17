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
  const resposta = await fetch(uri);
  const blob = await resposta.blob();

  // Nome unico por envio: dois anexos com o mesmo nome em conversas
  // diferentes nao podem se sobrescrever.
  const nomeNoBucket = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extensao(fileName)}`;

  const enviado = await uploadData({
    // `{entity_id}` e substituido pelo identityId de quem esta autenticado --
    // e o que mantem o anexo de cada pessoa na propria pasta.
    path: ({ identityId }) => `chat-attachments/${identityId}/${nomeNoBucket}`,
    data: blob,
    options: { contentType: contentType ?? blob.type ?? 'application/octet-stream' },
  }).result;

  return { key: enviado.path, fileName };
}
