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
    '\\.css$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
    '^pixi\\.js$': '<rootDir>/src/__tests__/__mocks__/pixiMock.tsx',
    '^@/components/canvas$': '<rootDir>/src/__tests__/__mocks__/canvasMock.tsx',
    '^@/components/canvas/(.*)$': '<rootDir>/src/__tests__/__mocks__/canvasMock.tsx',
    '^d3$': '<rootDir>/src/__tests__/__mocks__/d3Mock.ts',
    '^d3-force$': '<rootDir>/src/__tests__/__mocks__/d3ForceMock.tsx',
    '^lottie-react$': '<rootDir>/src/__tests__/__mocks__/lottieReactMock.tsx',
  },
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
      ],
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@nivo|d3|d3-.*|internmap|delaunator|robust-predicates)/)',
  ],
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
