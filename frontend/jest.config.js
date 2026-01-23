/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: ['browser', 'node'],
  },
  setupFiles: ['<rootDir>/src/__tests__/jest-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  collectCoverageFrom: [
    'src/components/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/lib/**/*.{ts,tsx}',
    'src/providers/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};

module.exports = config;
