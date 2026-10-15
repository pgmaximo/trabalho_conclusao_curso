describe('Amplify runtime bootstrap', () => {
  it('configures Amplify with the generated development outputs', () => {
    jest.resetModules();

    const configure = jest.fn();
    const setKeyValueStorage = jest.fn();
    const asyncStorage = {
      getItem: jest.fn(),
      removeItem: jest.fn(),
      setItem: jest.fn(),
    };

    jest.doMock('react-native-get-random-values', () => ({}));
    jest.doMock('react-native-url-polyfill/auto', () => ({}));
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: asyncStorage,
    }));
    jest.doMock('aws-amplify', () => ({
      Amplify: {
        configure,
      },
    }));
    jest.doMock('aws-amplify/auth/cognito', () => ({
      cognitoUserPoolsTokenProvider: {
        setKeyValueStorage,
      },
    }));

    const outputs = require('../amplify_outputs.json');

    require('../src/services/amplify/configureAmplify');

    expect(setKeyValueStorage).toHaveBeenCalledWith(asyncStorage);
    expect(configure).toHaveBeenCalledWith(outputs);
  });
});
