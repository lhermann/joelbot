module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    'ecmaVersion': 2020,
  },
  extends: [
    'eslint:recommended',
    'google',
  ],
  rules: {
    'no-restricted-globals': ['error', 'name', 'length'],
    'prefer-arrow-callback': 'error',
    'quotes': ['warn', 'single'],
    'semi': ['warn', 'never'],
    'indent': ['warn', 2, { 'SwitchCase': 1 }],
    'no-console': process.env.NODE_ENV === 'production' ? ['error', { allow: ['info', 'warn', 'error', 'debug'] }] : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'comma-dangle': ['warn', 'always-multiline'],
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-unused-expressions': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-only-tests/no-only-tests': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'space-before-function-paren': ['warn', 'always'],
    'object-curly-spacing': ['warn', 'always'],
    'max-len': 'off',
    'new-cap': 'off',
  },
  overrides: [
    {
      files: ['**/*.spec.*'],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
}
