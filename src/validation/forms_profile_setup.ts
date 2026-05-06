/**
 * Resumo do arquivo:
 * Define as regras de validacao e o tipo dos dados do formulario de perfil de saude.
 * O schema e usado pelo react-hook-form para validar os campos antes de avancar no fluxo.
 */
import { z } from 'zod';

const requiredText = (message: string) => z.string().trim().min(1, message);

const numericText = (fieldLabel: string) =>
  requiredText(`${fieldLabel} e obrigatorio`).regex(/^\d+([,.]\d+)?$/, `${fieldLabel} deve ser numerico`);

export const profileSetupSchema = z.object({
  fullName: requiredText('Nome completo e obrigatorio').min(3, 'Nome completo deve ter pelo menos 3 caracteres'),
  birthDate: requiredText('Data de nascimento e obrigatoria').regex(
    /^\d{2}\/\d{2}\/\d{4}$/,
    'Data de nascimento deve estar no formato DD/MM/AAAA',
  ),
  sex: requiredText('Sexo biologico e obrigatorio'),
  weight: numericText('Peso'),
  height: numericText('Altura'),
  chronicDiseases: requiredText('Informe doencas cronicas ou escreva Nenhuma'),
  medications: requiredText('Informe medicamentos em uso ou escreva Nenhum'),
  allergies: requiredText('Informe alergias conhecidas ou escreva Nenhuma'),
  isSmoker: z.boolean(),
  doesExercise: z.boolean(),
  drinksAlcohol: z.boolean(),
});

export type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;
