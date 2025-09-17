// import js from '@eslint/js'; // Uncomment if using js.configs.recommended
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      '*.config.js',
      '*.config.ts',
      'vite.config.ts',
      'vite.*.config.ts',
      'coverage/**',
      '.vitest/**',
      'cypress/**'
    ]
  },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        Date: 'readonly',
        Promise: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      // JavaScript/General
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
      'no-unused-vars': 'off', // Using TypeScript's version instead
      'no-undef': 'off', // TypeScript handles this
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'warn',
      'no-duplicate-imports': 'error',

      // TypeScript
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        disallowTypeAnnotations: true,
        fixStyle: 'inline-type-imports'
      }],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase']
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase']
        },
        {
          selector: 'enum',
          format: ['PascalCase']
        },
        {
          selector: 'class',
          format: ['PascalCase']
        }
      ],

      // React
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/jsx-uses-react': 'off',
      'react/jsx-boolean-value': ['error', 'never'],
      'react/self-closing-comp': 'error',
      'react/jsx-curly-brace-presence': ['error', {
        props: 'never',
        children: 'never'
      }],
      'react/jsx-pascal-case': 'error',
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-unused-state': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react/no-danger': 'warn',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // React Refresh (for HMR)
      'react-refresh/only-export-components': ['warn', {
        allowConstantExport: true
      }],
    }
  },
  {
    // Test file specific rules
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off'
    }
  },
  {
    // Dashboard specific rules
    files: ['dashboard/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@extension/*'],
            message: 'Dashboard should not import from extension'
          }
        ]
      }]
    }
  },
  {
    // Extension specific rules
    files: ['extension/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@dashboard/*'],
            message: 'Extension should not import from dashboard'
          }
        ]
      }]
    }
  }
];