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
          '_adobePartners',
          '_adobepartners',
          '_satellite',
          '__searchPayload',
          '__searchUrlTimer',
          '__lastSearchKey',
          '__urlHooked',
          '__entrySearchChecked',
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
      files: [
        'src/scripts/setPartnerDataOnEvent.ts',
        'src/scripts/customDataCollectionOnBeforeEventSend.ts',
        'src/scripts/customDataCollectionOnFilterClickCallback.ts',
      ],
      rules: {
        'no-param-reassign': ['error', { props: false }],
        'no-console': 'off',
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
    {
      files: ['src/scripts/**/*.ts'],
      rules: {
        'import/prefer-default-export': 'off',
      },
    },
    {
      files: [
        'src/scripts/searchVariableSetter.ts',
        'src/scripts/searchTrackerDynamic.ts',
        'src/scripts/searchUrlMonitor.ts',
        'src/scripts/searchConditionEntry.ts',
        'src/scripts/searchTrackerEntry.ts',
      ],
      rules: {
        'no-restricted-globals': 'off',
        'no-restricted-syntax': 'off',
        'func-names': 'off',
        'no-use-before-define': ['error', { functions: false, classes: true }],
        'prefer-destructuring': 'off',
      },
    },
    {
      // SnapLogic scripts use ES5 syntax for JDK 7/8 Rhino/Nashorn compatibility
      // Globals: input, output, error, log (from ScriptHook), plus Java/Nashorn builtins
      files: ['misc/snaplogic/**/*.js'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 5,
        sourceType: 'script',
      },
      env: {
        browser: false,
        es6: false,
      },
      globals: {
        // SnapLogic ScriptHook globals
        input: 'readonly',
        output: 'readonly',
        error: 'readonly',
        log: 'readonly',
        // Nashorn/Rhino globals
        load: 'readonly',
        importPackage: 'readonly',
        importClass: 'readonly',
        com: 'readonly',
        java: 'readonly',
        ArrayList: 'readonly',
        LinkedHashMap: 'readonly',
      },
      rules: {
        // Disable ES6+ rules (ES5 required for JDK 7/8)
        'no-var': 'off',
        'vars-on-top': 'off',
        'no-plusplus': 'off',
        'no-restricted-syntax': 'off',
        'prefer-template': 'off',
        'prefer-arrow-callback': 'off',
        'func-names': 'off',
        'object-shorthand': 'off',
        'prefer-destructuring': 'off',
        'prefer-exponentiation-operator': 'off',
        'no-restricted-properties': 'off',
        // Disable other rules not applicable to SnapLogic scripts
        'no-param-reassign': 'off',
        'no-console': 'off',
        'no-use-before-define': 'off',
        'consistent-return': 'off',
        'no-continue': 'off',
        'no-empty': 'off',
        // Disable TypeScript rules
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        // Disable import rules
        'import/no-unresolved': 'off',
        'import/extensions': 'off',
        // Disable prettier (different formatting for ES5)
        'prettier/prettier': 'off',
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
};
