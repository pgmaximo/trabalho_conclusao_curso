/**
 * O perfil que a propria pessoa preencheu. Ele entra na conversa para que a
 * resposta saiba de quem esta falando -- idade, sexo, condicoes declaradas --
 * sem que o modelo precise perguntar o que o aplicativo ja sabe.
 *
 * O que NAO vem daqui: nada calculado. Nem IMC, nem faixa etaria de risco.
 * Calcular indice sobre peso e altura ja e um passo em direcao a
 * interpretacao, e a regra 4 fecha esse caminho.
 */
import { z } from 'zod';

import type { ChatIdentity } from '../auth';
import { lerDoDono, texto } from './ownerScopedRead';
import type { ChatTool } from './tipos';

export const perfilTool: ChatTool = {
  name: 'consultar_perfil',
  description:
    'Consulta o perfil de saúde que o próprio usuário preencheu: data de nascimento, sexo, peso, altura, condições crônicas, medicações e alergias declaradas. NÃO calcula índices, NÃO grava nada e NÃO traz dados de exames.',
  inputSchema: z.object({}).strict(),
  readOnly: true,
  async run(_input: unknown, identity: ChatIdentity) {
    const linhas = await lerDoDono(process.env.USER_PROFILE_TABLE_NAME, identity);
    const perfil = linhas[0];

    if (!perfil) {
      return {
        disponivel: false,
        explicacao: 'O usuário ainda não preencheu o perfil de saúde no aplicativo.',
      };
    }

    return {
      disponivel: true,
      perfil: {
        nomeCompleto: texto(perfil.fullName),
        dataDeNascimento: texto(perfil.birthDate),
        sexo: texto(perfil.sex),
        pesoKg: typeof perfil.weightKg === 'number' ? perfil.weightKg : null,
        alturaCm: typeof perfil.heightCm === 'number' ? perfil.heightCm : null,
        condicoesCronicas: texto(perfil.chronicConditions),
        medicacoesDeclaradas: texto(perfil.medications),
        alergias: texto(perfil.allergies),
      },
    };
  },
};
