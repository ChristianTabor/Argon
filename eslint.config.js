const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['dist/**', 'dist-smoke/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['main.js', 'preload.js', 'lib/**/*.js', 'scripts/**/*.js', 'test/**/*.js', 'jest.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  {
    files: ['src/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        Visualizer: 'writable',
        ThemeManager: 'writable',
      },
    },
  },
  {
    files: [
      'test/renderer-behavior.test.js',
      'test/theme-manager.test.js',
      'test/visualizer.test.js',
      'test/helpers/canvas.js',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    rules: {
      // The current sources catch errors they do not read, and the browser
      // scripts declare Visualizer and ThemeManager which are also globals.
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
      'no-redeclare': 'off',
    },
  },
];
