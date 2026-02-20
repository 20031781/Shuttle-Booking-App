import expoConfig from 'eslint-config-expo/flat';

export default [
  ...expoConfig,
  {
    rules: {
      'react/jsx-no-constructed-context-values': 'off'
    }
  }
];
