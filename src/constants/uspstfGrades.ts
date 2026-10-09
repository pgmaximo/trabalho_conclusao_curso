import type { UspstfGrade } from '@/types/models';

/**
 * O que cada grau da USPSTF quer dizer, em poucas palavras.
 *
 * "Grau A", sozinho, não diz nada a quem não conhece a classificação. Estes
 * nomes acompanham o grau onde ele aparece sem a recomendação ao lado — hoje,
 * os lembretes de prevenção do Perfil
 * (specs/00-fundacao/consistencia-e-textos/spec.md, D8).
 *
 * São texto próprio do app, como o `GRADE_EXPLAINER_PT` do `RecommendationCard`,
 * e dizem o mesmo que ele, mais curto: cada um cabe em uma linha do Perfil em
 * 360dp (até uns 24 caracteres).
 */
export const GRADE_NAME_PT: Record<UspstfGrade, string> = {
  A: 'Muito recomendados',
  B: 'Recomendados',
  C: 'Depende de cada caso',
  D: 'Não recomendados',
  I: 'Sem evidência suficiente',
};
