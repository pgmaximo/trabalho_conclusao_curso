/**
 * Termos de Uso e Política de Privacidade: o texto, a tela de consulta e a
 * gravação do aceite (LGPD, art. 8º, § 2º -- o ônus da prova do consentimento
 * é do controlador).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

const mockList = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockBackendGuarda = jest.fn();

jest.mock('aws-amplify/data', () => ({
  generateClient: jest.fn(() => ({
    models: {
      UserProfile: {
        list: (...args: unknown[]) => mockList(...args),
        create: (...args: unknown[]) => mockCreate(...args),
        update: (...args: unknown[]) => mockUpdate(...args),
      },
    },
  })),
}));

// Mesmo problema de ESM documentado em login-screen.test.tsx.
jest.mock('aws-amplify/auth', () => ({
  getCurrentUser: jest.fn(async () => ({ userId: 'dono-1' })),
}));

jest.mock('@/services/aceiteDosTermosNoBackend', () => ({
  backendGuardaOAceiteDosTermos: () => mockBackendGuarda(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

import { NENHUM_ACEITE_MARCADO } from '@/components/profileSetup/TermsConsent';
import {
  ACEITES_DO_CADASTRO,
  RESUMO_DOS_TERMOS,
  TERMOS_E_PRIVACIDADE,
  VERSAO_DOS_TERMOS,
} from '@/data/termosEPrivacidade';
import { MORE_MENU_ITEMS } from '@/constants/navigation';
import { TermsScreen } from '@/screens/TermsScreen';
import { saveUserProfile } from '@/services/profileSetupRepository';
import type { ProfileSetupFormValues } from '@/validation/forms_profile_setup';

const PERFIL: ProfileSetupFormValues = {
  fullName: 'Maria Silva',
  birthDate: '06/05/2000',
  biologicalSex: '',
  pregnancyStatus: 'unknown',
  heightCm: '',
  weightKg: '',
  chronicConditions: '',
  medications: '',
  allergies: '',
  tobaccoUse: 'unknown',
  alcoholUse: 'unknown',
  physicalActivity: 'unknown',
  sexuallyActive: 'unknown',
};

const ACEITE = { versao: VERSAO_DOS_TERMOS, aceitoEm: '2026-10-18T12:00:00.000Z' };

function todoOTexto(): string[] {
  return [
    ...TERMOS_E_PRIVACIDADE.flatMap((parte) =>
      parte.secoes.flatMap((secao) => [secao.titulo, ...secao.blocos.flat()]),
    ),
    ...ACEITES_DO_CADASTRO.map((aceite) => aceite.texto),
    ...RESUMO_DOS_TERMOS,
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue({ data: [] });
  mockCreate.mockResolvedValue({ data: { id: 'perfil-1' }, errors: undefined });
  mockUpdate.mockResolvedValue({ data: { id: 'perfil-1' }, errors: undefined });
});

describe('o texto dos termos', () => {
  it('as secoes sao numeradas de 1 em diante, sem buraco nem repeticao', () => {
    const numeros = TERMOS_E_PRIVACIDADE.flatMap((parte) => parte.secoes.map((s) => s.numero));
    expect(numeros).toEqual(numeros.map((_, indice) => indice + 1));
  });

  it('toda "secao N" citada no texto existe -- renumerar nao deixa referencia quebrada', () => {
    const existentes = new Set(
      TERMOS_E_PRIVACIDADE.flatMap((parte) => parte.secoes.map((s) => s.numero)),
    );
    const citadas = todoOTexto().flatMap((texto) =>
      [...texto.matchAll(/seç(?:ão|ões) (\d+)(?: a (\d+))?/g)].flatMap((m) =>
        m[2] ? [Number(m[1]), Number(m[2])] : [Number(m[1])],
      ),
    );

    expect(citadas.length).toBeGreaterThan(0);
    for (const numero of citadas) {
      expect(existentes.has(numero)).toBe(true);
    }
  });

  it('dado de saude e transferencia internacional tem, cada um, sua propria caixa (arts. 11, I, e 33, VIII)', () => {
    expect(ACEITES_DO_CADASTRO.map((aceite) => aceite.id)).toEqual([
      'termos',
      'dadosDeSaude',
      'transferenciaInternacional',
    ]);
  });

  it('nenhuma caixa nasce marcada', () => {
    expect(Object.values(NENHUM_ACEITE_MARCADO).every((marcado) => marcado === false)).toBe(true);
  });

  it('o hub Mais leva aos termos', () => {
    expect(MORE_MENU_ITEMS).toContainEqual(expect.objectContaining({ href: '/terms' }));
  });
});

describe('a tela de consulta', () => {
  it('mostra as duas partes, a versao e cada secao', () => {
    render(<TermsScreen onBack={jest.fn()} />);

    expect(screen.getByText('Termos e privacidade')).toBeTruthy();
    expect(screen.getByText('Termos de Uso')).toBeTruthy();
    expect(screen.getByText('Política de Privacidade')).toBeTruthy();
    expect(screen.getByText(new RegExp(`Versão ${VERSAO_DOS_TERMOS.replace('.', '\\.')}`))).toBeTruthy();
    for (const parte of TERMOS_E_PRIVACIDADE) {
      for (const secao of parte.secoes) {
        expect(screen.getByText(`${secao.numero}. ${secao.titulo}`)).toBeTruthy();
      }
    }
  });
});

describe('a gravacao do aceite', () => {
  it('vai no mesmo pedido do perfil quando o backend publicado tem os campos', async () => {
    mockBackendGuarda.mockReturnValue(true);

    await saveUserProfile(PERFIL, { aceiteDosTermos: ACEITE });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Maria Silva',
        termsVersion: VERSAO_DOS_TERMOS,
        termsAcceptedAt: '2026-10-18T12:00:00.000Z',
      }),
    );
  });

  it('antes do deploy dos campos, o perfil e salvo sem eles -- o cadastro nao trava', async () => {
    mockBackendGuarda.mockReturnValue(false);
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await saveUserProfile(PERFIL, { aceiteDosTermos: ACEITE });

    const enviado = mockCreate.mock.calls[0][0];
    expect(enviado).toEqual(expect.objectContaining({ fullName: 'Maria Silva' }));
    expect(enviado).not.toHaveProperty('termsVersion');
    expect(enviado).not.toHaveProperty('termsAcceptedAt');
    // A ausencia e dita, e nao engolida.
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining('[termos]'));
    aviso.mockRestore();
  });

  it('a edicao do perfil nao toca no aceite ja gravado', async () => {
    mockBackendGuarda.mockReturnValue(true);
    mockList.mockResolvedValue({ data: [{ id: 'perfil-1' }] });

    await saveUserProfile(PERFIL, { emptyClinicalFields: 'clear' });

    const enviado = mockUpdate.mock.calls[0][0];
    expect(enviado).not.toHaveProperty('termsVersion');
    expect(enviado).not.toHaveProperty('termsAcceptedAt');
  });
});
