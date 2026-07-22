// https://docs.expo.dev/develop/unit-testing/
module.exports = {
  preset: 'jest-expo',
  // setupFilesAfterEnv (e nao setupFiles) para preservar os setupFiles do jest-expo.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
