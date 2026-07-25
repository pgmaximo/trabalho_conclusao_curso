// Mock do AsyncStorage nos testes: o modulo nativo nao existe no ambiente Jest.
// userSessionService (e telas que o importam, ex.: ConfirmScreen) dependem dele.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
