module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['**/*.test.ts', '**/*.spec.ts', 'scripts/**/*'],
      },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'no-underscore-dangle': [
      'error',
      {
        allow: [
          '__filename',
          '__dirname',
          '_eventData',
          '_partnerCardCtx',
          '_partnerCardObserver',
          '_partnerCardXdmCache',
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['scripts/**/*'],
      rules: {
        'no-console': 'off',
        'no-await-in-loop': 'off',
        'no-restricted-syntax': 'off',
        'no-plusplus': 'off',
        'prefer-template': 'off',
        'no-shadow': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
    {
      files: ['src/utils/logger.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['src/utils/validation.ts', 'src/utils/dates.ts'],
      rules: {
        'import/prefer-default-export': 'off',
      },
    },
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  ignorePatterns: ['dist/', 'build/', 'node_modules/', '*.min.js'],
};
