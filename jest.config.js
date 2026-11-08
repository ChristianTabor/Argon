module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'main.js',
    'lib/**/*.js',
    'preload.js',
    'src/js/**/*.js',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      statements: 11,
      branches: 12,
      functions: 12,
      lines: 12,
    },
  },
};
