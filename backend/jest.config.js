module.exports = {
    testEnvironment: 'node',
    verbose: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    collectCoverageFrom: [
      'services/**/*.js',
      'routes/**/*.js',
      '!**/node_modules/**'
    ],
    testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
    testPathIgnorePatterns: ['/node_modules/'],
    setupFilesAfterEnv: ['./tests/setup.js'],
    testTimeout: 10000,
    moduleFileExtensions: ['js', 'json'],
    restoreMocks: true
  };
  