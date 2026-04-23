import { z } from 'zod';

const EMAIL_MESSAGE = 'Informe um e-mail valido.';
const REQUIRED_MESSAGE = 'Este campo e obrigatorio.';

export const loginSchema = z.object({
  email: z.email(EMAIL_MESSAGE),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});

export const registerSchema = loginSchema.extend({
  confirmPassword: z.string().min(8, 'Confirme a senha com pelo menos 8 caracteres.'),
}).refine((values) => values.password === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'As senhas precisam ser iguais.',
});

export const profileSetupSchema = z.object({
  fullName: z.string().min(3, 'Informe o nome completo.'),
  birthDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Use o formato DD/MM/AAAA.'),
  sex: z.string().min(3, REQUIRED_MESSAGE),
  weight: z.string()
    .min(1, 'Informe um peso valido.')
    .regex(/^\d+([.,]\d+)?$/, 'Informe um peso valido.'),
  height: z.string()
    .min(1, 'Informe uma altura valida.')
    .regex(/^\d+([.,]\d+)?$/, 'Informe uma altura valida.'),
  chronicDiseases: z.string().min(1, 'Informe "Nenhuma" se nao houver doencas cronicas.'),
  medications: z.string().min(1, 'Informe "Nenhum" se nao usar medicamentos.'),
  allergies: z.string().min(1, 'Informe "Nenhuma" se nao houver alergias conhecidas.'),
  isSmoker: z.boolean(),
  doesExercise: z.boolean(),
  drinksAlcohol: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;
