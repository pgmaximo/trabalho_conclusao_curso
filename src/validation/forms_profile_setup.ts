/**
 * Resumo do arquivo:
 * Define o contrato e as regras de validacao do onboarding de perfil de saude.
 * Os campos opcionais usam `unknown` ou string vazia para nao forcar o usuario
 * a informar dados sensiveis antes da integracao real com o backend.
 */
import { z } from 'zod';

export const biologicalSexOptions = ['female', 'male', 'prefer_not_to_say'] as const;
export const biologicalSexFormOptions = ['', ...biologicalSexOptions] as const;
export const optionalAnswerOptions = ['yes', 'no', 'unknown'] as const;

const optionalNumericText = (fieldLabel: string) =>
  z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^\d+([,.]\d+)?$/.test(value), {
      message: `${fieldLabel} deve ser numerico`,
    });

export const profileSetupSchema = z.object({
  fullName: z.string().trim().min(1, 'Nome completo e obrigatorio'),
  birthDate: z
    .string()
    .trim()
    .min(1, 'Data de nascimento e obrigatoria')
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Data de nascimento deve estar no formato DD/MM/AAAA'),
  biologicalSex: z.enum(biologicalSexFormOptions),
  pregnancyStatus: z.enum(optionalAnswerOptions),
  heightCm: optionalNumericText('Altura'),
  weightKg: optionalNumericText('Peso'),
  chronicConditions: z.string().trim(),
  medications: z.string().trim(),
  allergies: z.string().trim(),
  tobaccoUse: z.enum(optionalAnswerOptions),
  alcoholUse: z.enum(optionalAnswerOptions),
  physicalActivity: z.enum(optionalAnswerOptions),
  sexuallyActive: z.enum(optionalAnswerOptions),
});

export type BiologicalSex = (typeof biologicalSexOptions)[number];
export type OptionalAnswer = (typeof optionalAnswerOptions)[number];
export type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;
