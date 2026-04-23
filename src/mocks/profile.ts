import type { UserProfileSnapshot } from '@/types/models';

export const USER_PROFILE_SNAPSHOT: UserProfileSnapshot = {
  name: 'Pedro Gabriel Máximo',
  email: 'pedrograximo@gmail.com',
  initials: 'PM',
  completionPercentage: 45,
  healthData: [
    { label: 'Tipo sanguíneo', value: 'O+' },
    { label: 'Peso', value: '78 kg' },
    { label: 'Altura', value: '1,78 m' },
    { label: 'IMC', value: '24.6' },
  ],
  allergiesAndConditions: ['Hipertensão', 'Alergia à Dipirona'],
  settings: [
    { icon: '🔔', title: 'Notificações e lembretes' },
    { icon: '🔒', title: 'Privacidade e LGPD' },
    { icon: '📱', title: 'Dispositivos conectados' },
    { icon: '👨‍⚕️', title: 'Profissionais de saúde' },
    { icon: '📤', title: 'Exportar meus dados' },
    { icon: '🌐', title: 'Idioma e acessibilidade' },
    { icon: 'ℹ️', title: 'Sobre a SuaSaúde' },
  ],
};
