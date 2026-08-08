import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FlatCompat} from '@eslint/eslintrc';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    resolvePluginsRelativeTo: path.join(__dirname, 'node_modules', 'eslint-config-expo')
});

export default [
    {
        ignores: [
            'node_modules/',
            'android/',
            'ios/',
            '.expo/',
            'dist/',
            'build/',
            'coverage/'
        ]
    },

    ...compat.extends('expo'),

    {
        rules: {
            'react/jsx-no-constructed-context-values': 'off'
        }
    },

    {
        // `import/namespace` non riesce a parsare i pacchetti typescript-eslint
        // (interop ESM/CJS): è un falso positivo solo su questo file di config.
        files: ['eslint.config.mjs'],
        rules: {
            'import/namespace': 'off'
        }
    },

    // Regole type-aware: solo sul codice applicativo incluso nel tsconfig.
    {
        files: ['App.tsx', 'src/**/*.ts', 'src/**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                ecmaFeatures: {jsx: true},
                project: './tsconfig.json',
                tsconfigRootDir: __dirname
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            // Le regole core sono disattivate: le versioni TS sono più precise.
            'no-unused-vars': 'off',
            'no-shadow': 'off',
            'no-use-before-define': 'off',

            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true
                }
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unsafe-function-type': 'error',
            '@typescript-eslint/no-wrapper-object-types': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false}
            ],
            '@typescript-eslint/no-import-type-side-effects': 'error',
            '@typescript-eslint/no-shadow': 'error',
            // `variables: false`: in RN è idiomatico definire `createStyles` sotto
            // il componente, e il riferimento avviene sempre a modulo inizializzato.
            '@typescript-eslint/no-use-before-define': [
                'error',
                {functions: false, classes: true, variables: false}
            ],
            '@typescript-eslint/array-type': ['error', {default: 'array-simple'}],
            '@typescript-eslint/prefer-as-const': 'error',

            // --- Type-aware ---
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/no-floating-promises': ['error', {ignoreVoid: true, ignoreIIFE: true}],
            '@typescript-eslint/no-misused-promises': [
                'error',
                // `attributes`/`properties` false: onPress={async () => ...} è idiomatico in RN.
                {checksVoidReturn: {attributes: false, properties: false}}
            ],
            '@typescript-eslint/no-for-in-array': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/no-unnecessary-condition': 'warn',
            '@typescript-eslint/prefer-nullish-coalescing': 'warn',
            '@typescript-eslint/prefer-optional-chain': 'warn',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/return-await': ['error', 'in-try-catch'],
            '@typescript-eslint/restrict-template-expressions': [
                'warn',
                {allowNumber: true, allowBoolean: true, allowNullish: false, allowAny: false}
            ],

            // --- Igiene JS ---
            eqeqeq: ['error', 'always', {null: 'ignore'}],
            'no-var': 'error',
            'prefer-const': ['error', {destructuring: 'all'}],
            'no-console': ['warn', {allow: ['warn', 'error']}],
            'no-debugger': 'error',
            'no-alert': 'error',
            'no-throw-literal': 'error',
            'no-unneeded-ternary': 'error',
            'no-useless-rename': 'error',
            'no-useless-return': 'error',
            'no-duplicate-imports': 'error',
            'object-shorthand': ['error', 'always'],
            'prefer-template': 'error',
            'prefer-spread': 'error',
            'prefer-rest-params': 'error',
            'dot-notation': 'error',
            radix: 'error'
        }
    },

    // Test e setup: regole rilassate dove il rigore non aiuta.
    {
        files: ['**/*.test.{ts,tsx}', 'vitest.setup.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-unnecessary-condition': 'off',
            // I mock `vi.fn(async () => ...)` sono deliberatamente async senza await
            // per rispettare la firma dell'API che stanno sostituendo.
            '@typescript-eslint/require-await': 'off',
            'no-console': 'off'
        }
    }
];
