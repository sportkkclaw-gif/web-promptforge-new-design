const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    fetchExternal: false,
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  roots: ['<rootDir>/tests'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.ts',
    '<rootDir>/tests/unit/**/*.test.tsx',
    '<rootDir>/tests/api/**/*.test.ts',
    '<rootDir>/tests/e2e/smoke.test.ts',
    '<rootDir>/tests/e2e/browser-happy-paths.test.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: ['app/api/**/*.ts', 'lib/**/*.ts'],
};

module.exports = createJestConfig(customJestConfig);
