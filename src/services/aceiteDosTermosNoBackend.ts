/**
 * Resumo do arquivo:
 * Diz se o backend PUBLICADO já tem onde guardar o aceite dos termos.
 *
 * Os campos `termsVersion` e `termsAcceptedAt` do `UserProfile` nasceram junto
 * com o termo de uso (src/data/termosEPrivacidade.ts). Até alguém publicar o
 * backend com eles, o AppSync recusa a criação do perfil inteira se o pedido
 * os mencionar ("field not defined for input object type") -- e a pessoa
 * ficaria presa no fim do cadastro por causa de um campo que ela nem vê.
 *
 * O `amplify_outputs.json` lista os campos de cada modelo publicado
 * (`model_introspection`), e é regerado a cada deploy. Ler dali é saber o que o
 * backend aceita, sem adivinhar e sem engolir erro: antes do deploy o aceite
 * não é gravado (e isso é dito no console e em
 * docs/lgpd/conformidade-e-pendencias.md, P2); depois, é gravado sempre, e uma
 * falha ao gravar derruba a conclusão do cadastro, como deve.
 *
 * Arquivo próprio pelo mesmo motivo do `chatAssistantEndpoint.ts`: o teste
 * substitui esta resposta sem montar um `amplify_outputs.json` falso.
 */
import outputs from '../../amplify_outputs.json';

type Introspeccao = {
  data?: { model_introspection?: { models?: Record<string, { fields?: Record<string, unknown> }> } };
};

export function backendGuardaOAceiteDosTermos(): boolean {
  const campos = (outputs as Introspeccao).data?.model_introspection?.models?.UserProfile?.fields;
  return Boolean(campos && 'termsVersion' in campos && 'termsAcceptedAt' in campos);
}
