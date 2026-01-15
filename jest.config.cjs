/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less)
: '<rootDir>/__mocks__/styleMock.js',
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  transform: {
    '^.+\\.tsx?
: [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
};

