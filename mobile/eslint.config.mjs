import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: path.join(__dirname, 'node_modules', 'eslint-config-expo')
});

export default [
  ...compat.extends('expo'),
  {
    rules: {
      'react/jsx-no-constructed-context-values': 'off'
    }
  }
];
