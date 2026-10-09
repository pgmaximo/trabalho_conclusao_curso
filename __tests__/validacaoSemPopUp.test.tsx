import React from 'react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { confirmSignUp, resetPassword, signUp } from 'aws-amplify/auth';

import { MarkDoseAppliedSheet } from '@/components/MarkDoseAppliedSheet';
import { CALENDARIO_NACIONAL_VACINACAO } from '@/data/calendarioNacionalVacinacao';
import { AddVaccineScreen } from '@/screens/AddVaccineScreen';
import { ConfirmScreen } from '@/screens/ConfirmScreen';
import { EditProfileScreen } from '@/screens/EditProfileScreen';
import { ForgotPasswordScreen } from '@/screens/ForgotPasswordScreen';
import { RegisterScreen } from '@/screens/RegisterScreen';

// Cada formulario avisava de um jeito. Compromisso, documento e medicamento
// desabilitam o botao e dizem o que falta; vacina, cadastro, recuperar senha e
// confirmacao deixavam tocar e abriam um pop-up do sistema; o perfil avisava a
// falha ao salvar tambem por pop-up. Agora e um jeito so, o que ja era o da
// maioria (specs/00-fundacao/consistencia-e-textos/spec.md, D4):
//
//   - o que falta: botao desabilitado, com o motivo escrito embaixo;
//   - valor errado: erro embaixo do campo;
//   - falha ao salvar: erro na propria tela;
//   - nunca um pop-up do sistema.

jest.mock('aws-amplify/auth', () => ({
  confirmResetPassword: jest.fn(),
  confirmSignUp: jest.fn(),
  resendSignUpCode: jest.fn(),
  resetPassword: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
}));
jest.mock('aws-amplify/data', () => ({ generateClient: jest.fn(() => ({})) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');
jest.mock('@/contexts/UserContext', () => ({
  useUserContext: () => ({ user: { birthDate: '1960-01-01' } }),
}));
jest.mock('@/services/vaccinationService', () => ({
  createVaccineDose: jest.fn(),
  registerAppliedDoseWithSeries: jest.fn(),
}));
jest.mock('@/services/vaccineReminderService', () => ({ syncVaccineReminder: jest.fn() }));

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 24, left: 0, right: 0, top: 44 },
};

function naTela(tela: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{tela}</SafeAreaProvider>);
}

// O `Button` do app nao declara papel de botao, entao ele e achado pelo texto.
function botao(titulo: string) {
  return screen.getByText(titulo);
}

function estaDesabilitado(titulo: string): boolean {
  let no = botao(titulo).parent;
  while (no) {
    const estado = no.props.accessibilityState;
    if (estado && estado.disabled !== undefined) {
      return estado.disabled === true;
    }
    no = no.parent;
  }
  return false;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('nenhuma tela abre pop-up do sistema', () => {
  const raiz = join(__dirname, '..', 'src');

  function arquivos(pasta: string): { nome: string; texto: string }[] {
    return readdirSync(join(raiz, pasta), { withFileTypes: true }).flatMap((entrada) => {
      const caminho = join(pasta, entrada.name);
      if (entrada.isDirectory()) return arquivos(caminho);
      if (!/\.tsx?$/.test(entrada.name)) return [];
      return [{ nome: caminho, texto: readFileSync(join(raiz, caminho), 'utf8') }];
    });
  }

  function semComentarios(texto: string): string {
    return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  }

  it('nem `Alert.alert`, nem o `alert()` do navegador', () => {
    const infratores = arquivos('.')
      .filter(({ texto }) => /(?<![.\w])(Alert\.alert|alert)\(/.test(semComentarios(texto)))
      .map(({ nome }) => nome);

    expect(infratores).toEqual([]);
  });
});

describe('Adicionar vacina', () => {
  const PRIMEIRA_VACINA = CALENDARIO_NACIONAL_VACINACAO[0].nome;

  it('diz o que falta embaixo do botao, uma coisa de cada vez', () => {
    naTela(<AddVaccineScreen />);

    expect(estaDesabilitado('Salvar')).toBe(true);
    expect(screen.getByText('Escolha uma vacina da lista.')).toBeTruthy();

    fireEvent.press(screen.getByText(PRIMEIRA_VACINA));

    expect(screen.queryByText('Escolha uma vacina da lista.')).toBeNull();
    expect(screen.getByText('Responda se a vacina já foi aplicada.')).toBeTruthy();

    fireEvent.press(screen.getByText('Não'));

    expect(estaDesabilitado('Salvar')).toBe(false);
    expect(screen.queryByText('Responda se a vacina já foi aplicada.')).toBeNull();
  });
});

describe('Marcar dose como aplicada', () => {
  const DOSE = { id: 'd-1', name: 'Hepatite B', doseNumber: 2, status: 'pending' as const };

  it('mostra na propria folha a falha ao salvar', () => {
    render(
      <MarkDoseAppliedSheet
        dose={DOSE}
        errorMessage="Não foi possível marcar a dose como aplicada."
        isSaving={false}
        onClose={jest.fn()}
        onSubmit={jest.fn()}
        visible
      />,
    );

    expect(screen.getByText('Não foi possível marcar a dose como aplicada.')).toBeTruthy();
  });
});

describe('Cadastro', () => {
  function renderCadastro() {
    return render(
      <RegisterScreen
        onGoogleAuthSuccess={jest.fn()}
        onNavigateToLogin={jest.fn()}
        onRegisterSuccess={jest.fn()}
      />,
    );
  }

  function preencher({ email = 'maria@exemplo.com', senha = 'Senha@123', confirmacao = 'Senha@123' } = {}) {
    fireEvent.changeText(screen.getByLabelText('E-mail'), email);
    fireEvent.changeText(screen.getByLabelText('Senha'), senha);
    fireEvent.changeText(screen.getByLabelText('Confirmar senha'), confirmacao);
  }

  it('o botao diz o que falta, na ordem dos campos', () => {
    renderCadastro();
    expect(screen.getByText('Informe seu e-mail.')).toBeTruthy();

    preencher({ senha: '', confirmacao: '' });
    expect(screen.getByText('Crie uma senha.')).toBeTruthy();

    preencher({ senha: 'curta', confirmacao: '' });
    expect(screen.getByText('A senha ainda não atende a todos os itens da lista.')).toBeTruthy();

    preencher({ confirmacao: '' });
    expect(screen.getByText('Repita a senha para confirmar.')).toBeTruthy();

    preencher({ confirmacao: 'Outra@123' });
    expect(estaDesabilitado('Criar conta')).toBe(true);

    preencher();
    expect(estaDesabilitado('Criar conta')).toBe(false);
  });

  it('mostra na tela o motivo de a conta nao ter sido criada', async () => {
    (signUp as jest.Mock).mockRejectedValueOnce({ name: 'UsernameExistsException' });
    renderCadastro();
    preencher();

    fireEvent.press(botao('Criar conta'));

    expect(await screen.findByText('Este e-mail já está em uso.')).toBeTruthy();
  });

  it('com a conta criada, segue para a confirmacao sem pop-up no caminho', async () => {
    (signUp as jest.Mock).mockResolvedValueOnce({ nextStep: { signUpStep: 'CONFIRM_SIGN_UP' } });
    const onRegisterSuccess = jest.fn();
    render(
      <RegisterScreen
        onGoogleAuthSuccess={jest.fn()}
        onNavigateToLogin={jest.fn()}
        onRegisterSuccess={onRegisterSuccess}
      />,
    );
    preencher();

    fireEvent.press(botao('Criar conta'));

    await waitFor(() => expect(onRegisterSuccess).toHaveBeenCalledWith('maria@exemplo.com', 'Senha@123'));
  });
});

describe('Recuperar senha', () => {
  it('sem e-mail, o botao fica desabilitado e diz por que', () => {
    render(<ForgotPasswordScreen onBackToLogin={jest.fn()} />);

    expect(estaDesabilitado('Enviar código')).toBe(true);
    expect(screen.getByText('Informe seu e-mail.')).toBeTruthy();

    fireEvent.press(botao('Enviar código'));

    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('mostra na tela por que o codigo nao foi enviado', async () => {
    (resetPassword as jest.Mock).mockRejectedValueOnce({ name: 'UserNotFoundException' });
    render(<ForgotPasswordScreen onBackToLogin={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('E-mail'), 'maria@exemplo.com');

    fireEvent.press(botao('Enviar código'));

    expect(await screen.findByText('Usuário não encontrado.')).toBeTruthy();
  });

  it('no segundo passo, diz o que falta para trocar a senha', async () => {
    (resetPassword as jest.Mock).mockResolvedValueOnce({});
    render(<ForgotPasswordScreen onBackToLogin={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText('E-mail'), 'maria@exemplo.com');
    fireEvent.press(botao('Enviar código'));
    await screen.findByText('Crie uma nova senha');

    expect(screen.getByText('Digite o código de 6 dígitos.')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Código de 6 dígitos'), '123456');
    expect(screen.getByText('Crie a nova senha.')).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Nova senha'), 'Senha@123');
    fireEvent.changeText(screen.getByLabelText('Confirmar nova senha'), 'Outra@123');
    expect(screen.getByText('As senhas não são iguais.')).toBeTruthy();
    expect(estaDesabilitado('Alterar senha')).toBe(true);
  });
});

describe('Confirmar conta', () => {
  it('mostra na tela que o codigo nao serviu', async () => {
    (confirmSignUp as jest.Mock).mockRejectedValueOnce({ name: 'CodeMismatchException' });
    render(<ConfirmScreen email="maria@exemplo.com" onConfirmSuccess={jest.fn()} />);
    '654321'.split('').forEach((digito, indice) => {
      fireEvent.changeText(screen.getByLabelText(`Dígito ${indice + 1} de 6`), digito);
    });

    fireEvent.press(screen.getByText('Confirmar'));

    expect(await screen.findByText('Código inválido ou expirado.')).toBeTruthy();
  });
});

describe('Editar perfil', () => {
  it('mostra na tela a falha ao salvar', () => {
    naTela(
      <EditProfileScreen
        initialValues={{
          alcoholUse: 'unknown',
          allergies: '',
          biologicalSex: 'female',
          birthDate: '01/01/1960',
          chronicConditions: '',
          fullName: 'Maria Souza',
          heightCm: '160',
          medications: '',
          physicalActivity: 'unknown',
          pregnancyStatus: 'unknown',
          sexuallyActive: 'unknown',
          tobaccoUse: 'unknown',
          weightKg: '62',
        }}
        isSaving={false}
        onCancel={jest.fn()}
        onSubmit={jest.fn()}
        onUploadPhoto={jest.fn()}
        saveError="Não foi possível salvar suas alterações agora. Verifique sua conexão e tente novamente."
      />,
    );

    expect(screen.getByText(/Não foi possível salvar suas alterações agora/)).toBeTruthy();
  });
});
